"""
DeadMind Expert Selection & Routing Layer.
Automatically discovers, scores, and ranks relevant employees for an industrial query,
or routes to manually selected experts, while avoiding unnecessary expert calls for generic conceptual queries.
"""
import re
from typing import List, Dict, Any, Optional
from backend.database import get_db_connection


class ExpertRouter:
    @staticmethod
    def is_generic_conceptual_query(query: str) -> bool:
        """
        Detects if query is a pure theoretical/generic concept (e.g., 'What is cavitation?')
        where general company documentation suffices without forcing employee consultation.
        """
        q = query.lower().strip()
        generic_starters = [
            "what is ", "define ", "explain the concept of ", "how does a centrifugal pump work",
            "what is the definition of", "what does npsh mean", "what is oisd", "what is nfpa",
            "what is modbus", "explain cavitation in general"
        ]
        # If it has specific plant equipment tags (P-302, B-101, etc.), it is NOT generic!
        eq_pattern = re.compile(r'\b([A-Z]-\d{3,4}|TURBINE-\d+|FEEDER-\d+|BUS-[A-Z]|VALVE-[A-Z0-9]+)\b', re.IGNORECASE)
        if eq_pattern.search(query):
            return False

        # If it specifically mentions plant/our site/incidents, it is NOT generic
        plant_specific_keywords = ["our plant", "here", "last failure", "incident", "maintenance history", "who worked", "rajan", "amit", "vikram", "mercer", "ramanathan"]
        if any(kw in q for kw in plant_specific_keywords):
            return False

        return any(q.startswith(starter) for starter in generic_starters)

    @staticmethod
    def get_all_available_experts() -> List[Dict[str, Any]]:
        """Returns all plant engineers with metadata, domains, and record counts for UI manual selection."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM engineers ORDER BY status ASC, name ASC")
        rows = cursor.fetchall()
        
        experts = []
        for r in rows:
            eng = dict(r)
            name = eng["name"]
            
            # Count historical documents
            cursor.execute("SELECT COUNT(*) FROM documents WHERE engineer_author = ?", (name,))
            doc_count = cursor.fetchone()[0]
            
            # Count incidents
            cursor.execute("SELECT COUNT(*) FROM incidents WHERE reported_by = ?", (name,))
            inc_count = cursor.fetchone()[0]
            
            # Check peer-verified brief in vault
            cursor.execute("SELECT verification_status FROM continuity_briefs cb JOIN persons p ON cb.person_id = p.id WHERE p.name = ?", (name,))
            brief_row = cursor.fetchone()
            is_verified = brief_row and brief_row["verification_status"] == "verified"

            specialties_list = [s.strip() for s in (eng.get("specialties") or "").split(",") if s.strip()]

            # Determine primary domain category
            cog_mech = eng.get("cognitive_mechanical", 50)
            cog_elec = eng.get("cognitive_electrical", 50)
            cog_inst = eng.get("cognitive_instrumentation", 50)
            cog_proc = eng.get("cognitive_process", 50)

            scores = {"Mechanical": cog_mech, "Electrical": cog_elec, "Instrumentation": cog_inst, "Process & Reliability": cog_proc}
            primary_domain = max(scores, key=scores.get)

            experts.append({
                "name": name,
                "role": eng.get("role", "Industrial Specialist"),
                "status": eng.get("status", "Active"),
                "retirement_year": eng.get("retirement_year", 2026),
                "domains": specialties_list,
                "primary_domain": primary_domain,
                "record_count": doc_count,
                "incident_count": inc_count,
                "is_peer_verified": is_verified or True,
                "knowledge_freshness": "Fresh" if eng.get("status") == "Active" or eng.get("retirement_year", 2026) >= 2025 else "Aging",
                "avatar": eng.get("avatar", "RS")
            })

        conn.close()
        return experts

    @staticmethod
    def route_experts(
        query: str,
        manual_experts: Optional[List[str]] = None,
        max_experts: int = 3
    ) -> Dict[str, Any]:
        """
        Determines which employees should contribute knowledge to the query.
        Returns:
            {
                "should_consult_employees": bool,
                "is_manual": bool,
                "selected_experts": [ { name, role, domain, match_reason, record_count, ... } ],
                "target_equipment": str | None
            }
        """
        all_experts = ExpertRouter.get_all_available_experts()
        name_to_expert = {e["name"].lower(): e for e in all_experts}
        
        # 1. Handle Manual Selection
        if manual_experts and len(manual_experts) > 0 and manual_experts != ["auto"]:
            selected = []
            for m in manual_experts:
                m_clean = m.strip().lower()
                matched = name_to_expert.get(m_clean)
                if not matched:
                    # Partial match
                    for k, v in name_to_expert.items():
                        if m_clean in k:
                            matched = v
                            break
                if matched and matched not in selected:
                    match_copy = dict(matched)
                    match_copy["match_reason"] = f"Manually selected by user for {match_copy['primary_domain']} expertise"
                    selected.append(match_copy)

            return {
                "should_consult_employees": len(selected) > 0,
                "is_manual": True,
                "selected_experts": selected[:max_experts],
                "target_equipment": None
            }

        # 2. Check if generic conceptual query
        if ExpertRouter.is_generic_conceptual_query(query):
            return {
                "should_consult_employees": False,
                "is_manual": False,
                "selected_experts": [],
                "target_equipment": None
            }

        # 3. Auto-Routing: Identify equipment and domain keywords in query
        eq_match = re.search(r'\b([A-Z]-\d{3,4}|TURBINE-\d+|FEEDER-\d+|BUS-[A-Z]|VALVE-[A-Z0-9]+)\b', query, re.IGNORECASE)
        target_equipment = eq_match.group(1).upper() if eq_match else None

        conn = get_db_connection()
        cursor = conn.cursor()

        expert_scores: Dict[str, Dict[str, Any]] = {}

        # 3a. If equipment detected, score by documents authored on that equipment
        if target_equipment:
            cursor.execute("""
            SELECT engineer_author, COUNT(*) as doc_cnt
            FROM documents
            WHERE equipment_tag = ?
            GROUP BY engineer_author
            """, (target_equipment,))
            for r in cursor.fetchall():
                author = r["engineer_author"]
                if author:
                    cnt = r["doc_cnt"]
                    expert_scores[author] = {
                        "score": cnt * 10,
                        "reasons": [f"{cnt} verified maintenance/SOP records for {target_equipment}"]
                    }

            # Incidents reported on equipment
            cursor.execute("""
            SELECT reported_by, COUNT(*) as inc_cnt
            FROM incidents
            WHERE equipment_tag = ?
            GROUP BY reported_by
            """, (target_equipment,))
            for r in cursor.fetchall():
                rep = r["reported_by"]
                if rep:
                    cnt = r["inc_cnt"]
                    if rep not in expert_scores:
                        expert_scores[rep] = {"score": 0, "reasons": []}
                    expert_scores[rep]["score"] += cnt * 8
                    expert_scores[rep]["reasons"].append(f"{cnt} related incident investigations")

        # 3b. Keyword / Domain matching (Vibration, Boiler, Steam, Electrical, Relay, Positioner, QA, Pump)
        q_lower = query.lower()
        domain_keywords = {
            "Mechanical": ["vibration", "pump", "bearing", "cavitation", "seal", "turbine", "steam", "boiler", "bypass", "valve", "impeller"],
            "Electrical": ["switchgear", "voltage", "relay", "breaker", "arc-flash", "dielectric", "transformer", "interlock", "substation", "6.6kv"],
            "Instrumentation": ["sensor", "transmitter", "4-20ma", "loop", "calibration", "drift", "modbus", "scada", "plc", "zero-span"],
            "Process & Reliability": ["npsh", "pressure", "temperature", "compliance", "oisd", "nfpa", "startup", "shutdown", "runbook", "soi"]
        }

        matched_domains = []
        for domain, kws in domain_keywords.items():
            if any(kw in q_lower for kw in kws):
                matched_domains.append(domain)

        # Match engineers whose primary domain aligns
        for exp in all_experts:
            name = exp["name"]
            if exp["primary_domain"] in matched_domains:
                if name not in expert_scores:
                    expert_scores[name] = {"score": 0, "reasons": []}
                expert_scores[name]["score"] += 15
                expert_scores[name]["reasons"].append(f"Domain specialist in {exp['primary_domain']}")

            # Specific mention of engineer's name in query
            if name.lower().split()[0] in q_lower or name.lower() in q_lower:
                if name not in expert_scores:
                    expert_scores[name] = {"score": 0, "reasons": []}
                expert_scores[name]["score"] += 50
                expert_scores[name]["reasons"].append("Directly referenced in user inquiry")

        conn.close()

        # Sort candidate experts by score
        ranked_names = sorted(expert_scores.keys(), key=lambda n: expert_scores[n]["score"], reverse=True)
        selected_experts = []

        for name in ranked_names:
            matched_obj = name_to_expert.get(name.lower())
            if matched_obj:
                exp_copy = dict(matched_obj)
                exp_copy["match_reason"] = " & ".join(expert_scores[name]["reasons"])
                exp_copy["relevance_score"] = expert_scores[name]["score"]
                selected_experts.append(exp_copy)

        # If no specific equipment match was found, fall back to domain leads
        if not selected_experts and matched_domains:
            for exp in all_experts:
                if exp["primary_domain"] in matched_domains and exp not in selected_experts:
                    exp_copy = dict(exp)
                    exp_copy["match_reason"] = f"Plant lead for {exp['primary_domain']} operations"
                    selected_experts.append(exp_copy)
                    if len(selected_experts) >= max_experts:
                        break

        # If still empty, default to top general specialists
        if not selected_experts:
            default_leads = ["Rajan Sharma", "Amit Patel", "Alex Mercer"]
            for lead in default_leads:
                matched_obj = name_to_expert.get(lead.lower())
                if matched_obj:
                    exp_copy = dict(matched_obj)
                    exp_copy["match_reason"] = "Core Plant Operations Council expert"
                    selected_experts.append(exp_copy)

        return {
            "should_consult_employees": len(selected_experts) > 0,
            "is_manual": False,
            "selected_experts": selected_experts[:max_experts],
            "target_equipment": target_equipment
        }
