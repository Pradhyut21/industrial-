"""
DeadMind Chat Service — Master Knowledge Orchestrator.
Combines RRF hybrid retrieval, multi-expert routing, consensus calculation,
uncertainty evaluation, coreference resolution, and strict evidence attribution.
"""
import json
import re
from typing import Dict, Any, List, Optional, AsyncGenerator
from backend.hybrid_retrieval import reciprocal_rank_fusion
from backend.reranker import rerank_results
from backend.consensus import synthesize_consensus
from backend.uncertainty import compute_uncertainty
from backend.llm import get_groq_response, get_groq_response_stream, APIConfig
from backend.chat.conversation_store import ConversationStore
from backend.chat.memory import ChatMemoryEngine
from backend.chat.expert_router import ExpertRouter
from backend.database import get_db_connection


from backend.metering.meter import usage_meter
from backend.metering.store import UsageStore
from fastapi import HTTPException


def is_conversational_greeting_or_meta(query: str) -> bool:
    """Detects simple greetings, pleasantries, or capability questions that don't need heavy industrial RAG."""
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', query).strip().lower()
    words = clean.split()
    if not words:
        return True
    
    # Single-word greetings / pleasantries
    greetings = {
        "hi", "hii", "hiii", "hello", "hey", "heyy", "howdy", "hola", "namaste", "namaskar",
        "greetings", "yo", "sup", "thanks", "thankyou", "thx", "bye", "goodbye", "help"
    }
    if clean in greetings or (len(words) <= 2 and words[0] in greetings):
        return True
        
    # Multi-word greetings & introductory phrases
    intro_phrases = [
        "good morning", "good afternoon", "good evening", "good day",
        "who are you", "what are you", "what is deadmind", "what can you do",
        "how can you help", "how do you work", "how does this work",
        "tell me about yourself", "what do you do", "help me", "introduce yourself"
    ]
    if any(clean == phrase or clean.startswith(phrase) for phrase in intro_phrases):
        return True
        
    return False


def categorize_source_type(doc: Dict[str, Any]) -> str:
    """Assigns rich source type labels to evidence items."""
    dtype = (doc.get("doc_type") or "").lower()
    title = (doc.get("title") or "").lower()
    
    if "sop" in dtype or "procedure" in title or "standard" in title:
        return "SOP"
    elif "incident" in dtype or "near-miss" in title or "failure" in title:
        return "INCIDENT"
    elif "maintenance" in dtype or "log" in dtype:
        return "MAINTENANCE"
    elif "vault" in dtype or "brief" in dtype or "handoff" in title:
        return "CONTINUITY"
    elif "oisd" in title or "nfpa" in title or "regulatory" in dtype:
        return "REGULATORY"
    elif doc.get("author") or doc.get("engineer_author"):
        return "EMPLOYEE"
    return "ORGANIZATIONAL"


def fetch_expert_specific_records(expert_name: str, equipment_tag: Optional[str] = None, limit: int = 4) -> List[Dict[str, Any]]:
    """Retrieves grounded document excerpts, maintenance logs, and incident reports authored by a specific expert."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    records = []
    if equipment_tag:
        cursor.execute("""
        SELECT id, title, content, doc_type, equipment_tag, failure_code, upload_date
        FROM documents
        WHERE engineer_author = ? AND (equipment_tag = ? OR equipment_tag = 'GENERAL')
        ORDER BY id DESC LIMIT ?
        """, (expert_name, equipment_tag, limit))
    else:
        cursor.execute("""
        SELECT id, title, content, doc_type, equipment_tag, failure_code, upload_date
        FROM documents
        WHERE engineer_author = ?
        ORDER BY id DESC LIMIT ?
        """, (expert_name, limit))
        
    rows = cursor.fetchall()
    for r in rows:
        d = dict(r)
        d["author"] = expert_name
        d["source_type"] = categorize_source_type(d)
        records.append(d)

    # Check incidents
    cursor.execute("""
    SELECT id, equipment_tag, incident_type, description, reported_on, severity
    FROM incidents
    WHERE reported_by = ?
    ORDER BY id DESC LIMIT ?
    """, (expert_name, limit))
    for r in cursor.fetchall():
        inc = dict(r)
        records.append({
            "id": 1000 + inc["id"],
            "title": f"Incident Report: {inc.get('incident_type', 'Operational')} on {inc.get('equipment_tag', 'Plant Asset')}",
            "content": inc.get("description", ""),
            "author": expert_name,
            "doc_type": "Incident Report",
            "equipment_tag": inc.get("equipment_tag", "GENERAL"),
            "source_type": "INCIDENT"
        })

    conn.close()
    return records


class ChatService:
    @staticmethod
    def process_query(
        query: str,
        conversation_id: Optional[str] = None,
        user_id: str = "default_user",
        role: str = "Field Technician",
        manual_experts: Optional[List[str]] = None,
        analysis_mode: str = "standard"
    ) -> Dict[str, Any]:
        """
        Full knowledge synthesis pipeline.
        Returns complete structured response and persists to conversation store.
        """
        is_greeting = is_conversational_greeting_or_meta(query)

        # 0. Pre-Flight Credit Allowance Evaluation
        if is_greeting:
            base_cost = 5
            allowance_check = usage_meter.evaluate_credit_allowance(
                user_id=user_id,
                required_credits=base_cost,
                resource_url="/api/chat/query"
            )
            if not allowance_check["allowed"]:
                raise HTTPException(status_code=402, detail=allowance_check["x402_challenge"])
        else:
            estimated_cost = usage_meter.calculate_query_cost(
                query=query,
                experts_count=len(manual_experts) if manual_experts and manual_experts != ["auto"] else 2,
                has_consensus=True,
                has_uncertainty=True,
                analysis_mode=analysis_mode
            )
            allowance_check = usage_meter.evaluate_credit_allowance(
                user_id=user_id,
                required_credits=estimated_cost["total_credits"],
                resource_url="/api/chat/query"
            )
            if not allowance_check["allowed"]:
                raise HTTPException(status_code=402, detail=allowance_check["x402_challenge"])

        # 1. Fetch or create conversation
        if conversation_id:
            conv = ConversationStore.get_conversation(conversation_id, user_id=user_id)
            if not conv:
                conv = ConversationStore.create_conversation(user_id=user_id, role=role, initial_query=query)
                conversation_id = conv["id"]
        else:
            conv = ConversationStore.create_conversation(user_id=user_id, role=role, initial_query=query)
            conversation_id = conv["id"]

        history_messages = conv.get("messages", [])

        # If conversational greeting, return clean introductory response without triggering false industrial RAG
        if is_greeting:
            greeting_answer = (
                "Hello! I am **DeadMind**, your Industrial Collective Intelligence & Operational Memory Assistant.\n\n"
                "I synthesize official Standard Operating Procedures (SOPs), maintenance telemetry, and the preserved tacit knowledge of our senior engineering specialists.\n\n"
                "### 💡 What you can ask me:\n"
                "- ⚙️ **Equipment Troubleshooting**: *\"Why is P-302 vibrating during cold startup?\"* or *\"How to resolve B-101 positioner zero-drift?\"*\n"
                "- 📋 **Standard Operating Procedures**: *\"What is the startup sequence for B-101?\"*\n"
                "- 👥 **Multi-Expert Consultation**: *\"Compare Rajan and Vikram's approach to valve positioner calibration.\"*\n"
                "- 🛡️ **Safety & Interlocks**: *\"What are the interlock requirements before fast-transfer on 6.6kV switchgear S-501?\"*\n"
                "- 🏛️ **Continuity Vault**: Query past handover briefs and exit capsules of departed specialists.\n\n"
                "How can I assist your plant operations today?"
            )
            recommended_steps = [
                "1. Ask a question about a specific plant asset (e.g., B-101, P-302, S-501, C-104).",
                "2. Enable Auto-Route or select specific domain specialists (Rajan Sharma, Dr. Alex Mercer, Amit Patel) from the top bar.",
                "3. Open the Enterprise AI Economy Drawer to view credit allowances and reimbursement status."
            ]

            usage_deduction = UsageStore.deduct_credits(
                user_id=user_id,
                credits=5,
                description=f"Query: Greeting / Help",
                service_type="chat",
                conversation_id=conversation_id,
                meta={"tokens": len(query.split()) + len(greeting_answer.split()), "docs": 0, "experts": 0}
            )

            structured_response = {
                "answer": greeting_answer,
                "evidence_summary": {
                    "organizational_count": 0,
                    "employee_record_count": 0,
                    "target_equipment": "General Plant Overview"
                },
                "employee_insights": [],
                "consensus": None,
                "uncertainty": {
                    "risk_score": 0.05,
                    "risk_pct": 5,
                    "evidence_quality": "High",
                    "data_sparsity": "LOW",
                    "knowledge_staleness": "LOW",
                    "disagreement": "LOW",
                    "human_verification_required": False
                },
                "sources": [],
                "recommended_steps": recommended_steps,
                "conversation_id": conversation_id,
                "search_query": query,
                "usage_metrics": {
                    "credits_consumed": 5,
                    "balance_remaining": usage_deduction["balance_remaining"],
                    "itemized_cost": {"Base Chat Session": 5}
                }
            }

            ConversationStore.append_message(conversation_id, "user", query)
            ConversationStore.append_message(conversation_id, "assistant", greeting_answer, structured_data=structured_response)
            return structured_response

        # 2. Resolve Coreferences & Entity Context
        enriched_search_query, memory_meta = ChatMemoryEngine.resolve_coreferences(query, history_messages)

        # 3. Hybrid RRF Retrieval + Cross-Encoder Reranking
        raw_sources = reciprocal_rank_fusion(enriched_search_query, k=5, rrf_k=60)
        reranked_sources = rerank_results(enriched_search_query, raw_sources, relative_gap=4.0)

        # Format grounding citations with source type labels
        citations = []
        for s in reranked_sources:
            citations.append({
                "id": s["id"],
                "title": s["title"],
                "author": s.get("author") or s.get("engineer_author") or "Plant Technical Board",
                "equipment_tag": s.get("equipment_tag") or "GENERAL",
                "failure_code": s.get("failure_code") or "N/A",
                "source_type": categorize_source_type(s),
                "relevance_score": round(s.get("rerank_score", s.get("score", 0.85)), 3),
                "excerpt": s.get("content", "")[:280] + "..." if len(s.get("content", "")) > 280 else s.get("content", "")
            })

        # 4. Expert Routing (Auto vs Manual)
        route_decision = ExpertRouter.route_experts(query, manual_experts=manual_experts)
        selected_experts = route_decision["selected_experts"]
        should_consult = route_decision["should_consult_employees"]
        target_eq = route_decision.get("target_equipment") or memory_meta.get("resolved_equipment")

        # 5. Extract Specific Historical Records for Selected Experts
        employee_insights = []
        expert_names_for_consensus = []

        if should_consult and selected_experts:
            for exp in selected_experts:
                exp_name = exp["name"]
                expert_names_for_consensus.append(exp_name)
                records = fetch_expert_specific_records(exp_name, equipment_tag=target_eq)
                
                # Formulate evidence-attributed summary
                if records:
                    top_record = records[0]
                    content_clean = top_record.get("content", "")
                    # Extract diagnosis or takeaway
                    diag = ""
                    if "DIAGNOSIS:" in content_clean:
                        diag = content_clean.split("DIAGNOSIS:")[1].split("RECOMMENDATION")[0].strip()
                    elif "WORKAROUND:" in content_clean:
                        diag = content_clean.split("WORKAROUND:")[1].split("SOP")[0].strip()
                    else:
                        diag = content_clean[:220].strip()

                    attributed_finding = f"Historical {top_record.get('doc_type', 'maintenance log')} ({top_record.get('title', 'Record')}) documents: {diag}"
                else:
                    attributed_finding = f"Cognitive continuity profile confirms {exp.get('role')} custody with focus on {', '.join(exp.get('domains', [])[:3])}."

                employee_insights.append({
                    "name": exp_name,
                    "role": exp.get("role", "Industrial Specialist"),
                    "domain": exp.get("primary_domain", "Engineering"),
                    "match_reason": exp.get("match_reason", "Historical subject matter expert"),
                    "record_count": exp.get("record_count", len(records)),
                    "knowledge_freshness": exp.get("knowledge_freshness", "Fresh"),
                    "is_peer_verified": exp.get("is_peer_verified", True),
                    "finding": attributed_finding,
                    "records_referenced": [r["title"] for r in records[:2]]
                })

        # 6. Consensus & Dissent Calculation
        consensus_data = None
        if len(expert_names_for_consensus) >= 2:
            consensus_data = synthesize_consensus(enriched_search_query, expert_names_for_consensus)
        elif len(employee_insights) == 1:
            consensus_data = {
                "consensus": f"Single domain authority active: {employee_insights[0]['name']} ({employee_insights[0]['role']}).",
                "dissent": None,
                "agreement": "high",
                "weights": {employee_insights[0]['name']: 1.0}
            }

        # 7. 4-Factor Uncertainty Decomposition
        lead_expert = employee_insights[0]["name"] if employee_insights else None
        uncertainty = compute_uncertainty(enriched_search_query, reranked_sources, engineer_name=lead_expert)
        raw_risk = uncertainty.get("risk_score", 18)
        uncertainty["risk_score"] = (raw_risk / 100.0) if raw_risk > 1 else raw_risk
        uncertainty["risk_pct"] = int(uncertainty["risk_score"] * 100)
        uncertainty["evidence_quality"] = "High" if len(citations) >= 3 else ("Medium" if len(citations) >= 1 else "Low")
        uncertainty["human_verification_required"] = uncertainty["risk_pct"] >= 50 or uncertainty.get("staleness") == "HIGH"

        # 8. Synthesize Structured Natural-Language Answer
        answer_text, recommended_steps = ChatService._synthesize_grounded_answer(
            query=query,
            citations=citations,
            employee_insights=employee_insights,
            consensus_data=consensus_data,
            uncertainty=uncertainty,
            target_equipment=target_eq
        )

        structured_response = {
            "answer": answer_text,
            "evidence_summary": {
                "organizational_count": len([c for c in citations if c["source_type"] != "EMPLOYEE"]),
                "employee_record_count": len(employee_insights),
                "target_equipment": target_eq or "General Plant Asset"
            },
            "employee_insights": employee_insights,
            "consensus": consensus_data,
            "uncertainty": uncertainty,
            "sources": citations,
            "recommended_steps": recommended_steps,
            "conversation_id": conversation_id,
            "search_query": enriched_search_query
        }

        # 9. Continuous Usage Metering & Double-Entry Ledger Recording
        actual_cost = usage_meter.calculate_query_cost(
            query=query,
            experts_count=len(employee_insights),
            has_consensus=bool(consensus_data and consensus_data.get("consensus")),
            has_uncertainty=True,
            analysis_mode=analysis_mode
        )
        usage_deduction = UsageStore.deduct_credits(
            user_id=user_id,
            credits=actual_cost["total_credits"],
            description=f"Query: {query[:35]} ({len(employee_insights)} experts)",
            service_type="chat" if analysis_mode == "standard" else "agent_query",
            conversation_id=conversation_id,
            meta={
                "tokens": len(query.split()) + len(answer_text.split()),
                "docs": len(citations),
                "experts": len(employee_insights),
                "consensus": bool(consensus_data),
                "uncertainty": True
            }
        )
        structured_response["usage_metrics"] = {
            "credits_consumed": actual_cost["total_credits"],
            "balance_remaining": usage_deduction["balance_remaining"],
            "itemized_cost": actual_cost["breakdown"]
        }

        # 10. Persist messages and update long-term conversation summary
        ConversationStore.append_message(conversation_id, "user", query)
        ConversationStore.append_message(conversation_id, "assistant", answer_text, structured_data=structured_response)

        new_summary = ChatMemoryEngine.update_conversation_summary(
            conv.get("summary", ""),
            query,
            answer_text
        )
        active_entities_list = memory_meta.get("active_entities", {}).get("equipment", [])
        if target_eq and target_eq not in active_entities_list:
            active_entities_list.append(target_eq)

        ConversationStore.update_conversation_meta(
            conversation_id,
            summary=new_summary,
            relevant_entities=active_entities_list,
            selected_experts=[e["name"] for e in selected_experts] if selected_experts else ["auto"]
        )

        return structured_response

    @staticmethod
    async def process_query_stream(
        query: str,
        conversation_id: Optional[str] = None,
        user_id: str = "default_user",
        role: str = "Field Technician",
        manual_experts: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """Streams response tokens via SSE and yields the complete structured payload at completion."""
        # Run resolution and retrieval synchronously
        structured = ChatService.process_query(
            query=query,
            conversation_id=conversation_id,
            user_id=user_id,
            role=role,
            manual_experts=manual_experts
        )

        # 1. Stream metadata packages first
        yield f"data: {json.dumps({'type': 'init', 'data': {'conversation_id': structured['conversation_id'], 'sources': structured['sources'], 'employee_insights': structured['employee_insights'], 'consensus': structured['consensus'], 'uncertainty': structured['uncertainty']}})}\n\n"

        # 2. Stream tokens of the synthesized answer
        answer = structured["answer"]
        words = answer.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {json.dumps({'type': 'token', 'data': chunk})}\n\n"

        # 3. Stream completion event with full payload
        yield f"data: {json.dumps({'type': 'done', 'data': structured})}\n\n"

    @staticmethod
    def _synthesize_grounded_answer(
        query: str,
        citations: List[Dict[str, Any]],
        employee_insights: List[Dict[str, Any]],
        consensus_data: Optional[Dict[str, Any]],
        uncertainty: Dict[str, Any],
        target_equipment: Optional[str]
    ) -> tuple[str, List[str]]:
        """
        Synthesizes grounded text strictly distinguishing:
        1. General organizational evidence
        2. Employee-derived historical knowledge
        3. Recommended next diagnostic steps
        """
        # Try calling Groq with rigorous grounding instructions if key configured
        key = APIConfig.get_key()
        if key:
            prompt_context = f"User Question: {query}\n\nTarget Equipment: {target_equipment or 'Plant Operations'}\n\n"
            prompt_context += "Organizational Documents:\n"
            for i, c in enumerate(citations[:4]):
                prompt_context += f"[{i+1}] {c['title']} (Type: {c['source_type']}): {c['excerpt']}\n"
            
            if employee_insights:
                prompt_context += "\nHistorical Employee Records:\n"
                for emp in employee_insights:
                    prompt_context += f"- {emp['name']} ({emp['role']}): {emp['finding']}\n"

            if consensus_data and consensus_data.get("consensus"):
                prompt_context += f"\nConsensus Synthesis: {consensus_data['consensus']}\n"
                if consensus_data.get("dissent"):
                    prompt_context += f"Dissent Note: {consensus_data['dissent']}\n"

            system_prompt = (
                "You are DeadMind, an industrial knowledge continuity assistant. "
                "Synthesize a clear, highly professional engineering response. "
                "CRITICAL RULES:\n"
                "1. Strictly separate General Company Evidence from specific Historical Employee Insights.\n"
                "2. Never fabricate opinions. Attribute employee findings using factual phrasing: 'Rajan's 2024 maintenance record indicates...', 'Amit's instrumentation log notes...'\n"
                "3. Cite sources using bracket numbers [1], [2] corresponding to the provided documents.\n"
                "4. Conclude with 3-4 numbered recommended next investigative steps."
            )
            try:
                llm_out = get_groq_response(prompt_context, system_prompt, timeout=12)
                if llm_out and len(llm_out.strip()) > 50:
                    steps = [
                        f"Inspect physical condition of {target_equipment or 'the unit'} and check local telemetry indicators.",
                        "Verify historical calibration logs and confirm sensor zero-span tolerances.",
                        "Review safety interlocks against OISD-118/NFPA-85 before initiating bypass."
                    ]
                    return llm_out, steps
            except Exception as exc:
                print(f"[ChatService] Groq synthesis fallback triggered: {exc}")

        # Deterministic Grounded Synthesis Fallback
        paragraphs = []
        eq_name = target_equipment or "this equipment"

        # Paragraph 1: General Company Evidence
        if citations:
            top_doc = citations[0]
            paragraphs.append(
                f"Company technical documentation ({top_doc['title']}) associates the observed operating conditions on {eq_name} with specific process thresholds and documented operating limits. "
                f"Plant records confirm that standard operating procedures require rigorous verification of upstream baseline parameters."
            )
        else:
            paragraphs.append(
                f"General plant documentation outlines standard operational procedures for {eq_name}, emphasizing systematic baseline checks before executing maintenance interventions."
            )

        # Paragraph 2: Employee-Derived Insights
        if employee_insights:
            emp_findings = []
            for emp in employee_insights:
                emp_findings.append(f"{emp['name']}'s ({emp['role']}) {emp['finding'].lower() if emp['finding'].startswith('Historical') else 'historical records identify that ' + emp['finding']}")
            paragraphs.append(" ".join(emp_findings))

        # Paragraph 3: Consensus / Dissent Synthesis
        if consensus_data and consensus_data.get("consensus"):
            cons_text = f"Cross-Domain Synthesis: {consensus_data['consensus']}"
            if consensus_data.get("dissent"):
                cons_text += f" Note of Dissent: {consensus_data['dissent']}"
            paragraphs.append(cons_text)

        # Recommended Action Steps
        recommended_steps = [
            f"1. Conduct immediate visual and telemetry inspection of {eq_name}.",
            "2. Validate suction conditions and verify valve positioner mA feedback loop.",
            "3. Confirm baseline vibration accelerometer readings against historical trend lines.",
            "4. Human peer verification recommended before modifying automated safety interlocks."
        ]

        full_answer = "\n\n".join(paragraphs)
        return full_answer, recommended_steps


chat_service = ChatService()
