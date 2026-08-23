"""
DeadMind Chat Memory — Multi-Turn Short-Term, Long-Term, and Coreference Resolution Engine.
Preserves conversation context, resolves pronouns and equipment references across turns.
"""
import re
from typing import List, Dict, Any, Optional, Tuple
from backend.database import get_db_connection


class ChatMemoryEngine:
    @staticmethod
    def get_short_term_context(messages: List[Dict[str, Any]], max_turns: int = 6) -> List[Dict[str, str]]:
        """Extracts the last N turns formatted cleanly for LLM input."""
        recent = messages[-max_turns:] if len(messages) > max_turns else messages
        formatted = []
        for m in recent:
            role = m.get("role", "user")
            if role in ("user", "assistant", "system"):
                formatted.append({"role": role, "content": m.get("content", "")})
        return formatted

    @staticmethod
    def extract_entities_from_history(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Scans previous turns to discover actively discussed equipment, engineers, and failure codes."""
        equipment_found = set()
        engineers_found = set()
        failure_codes = set()

        # Known patterns
        eq_pattern = re.compile(r'\b([A-Z]-\d{3,4}|TURBINE-\d+|FEEDER-\d+|BUS-[A-Z]|VALVE-[A-Z0-9]+)\b', re.IGNORECASE)
        fail_pattern = re.compile(r'\b(F-\d{3,4}|INC-\d{3,4}|ERR-\d{3,4})\b', re.IGNORECASE)
        
        # Known engineers from DB
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM engineers")
        all_engineers = [r["name"] for r in cursor.fetchall()]
        
        # Known coreference aliases
        cursor.execute("SELECT standard_name, alias_name FROM coreference_map")
        coref_aliases = cursor.fetchall()
        conn.close()

        for m in messages:
            text = m.get("content", "")
            for match in eq_pattern.findall(text):
                equipment_found.add(match.upper())
            for match in fail_pattern.findall(text):
                failure_codes.add(match.upper())
            for eng in all_engineers:
                if eng.lower() in text.lower():
                    engineers_found.add(eng)
            # Check structured data if present
            sdata = m.get("structured_data", {})
            if isinstance(sdata, dict):
                for emp in sdata.get("employee_insights", []):
                    if emp.get("name"):
                        engineers_found.add(emp["name"])
                for src in sdata.get("sources", []):
                    if src.get("equipment_tag"):
                        equipment_found.add(src["equipment_tag"].upper())

        return {
            "equipment": list(equipment_found),
            "engineers": list(engineers_found),
            "failure_codes": list(failure_codes)
        }

    @staticmethod
    def resolve_coreferences(query: str, conversation_history: List[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
        """
        Resolves pronouns ('he', 'she', 'it', 'the pump', 'the valve', 'that issue')
        by combining historical entities and DB coreference mapping.
        Returns (enriched_query, extracted_context_meta).
        """
        entities = ChatMemoryEngine.extract_entities_from_history(conversation_history)
        q_lower = query.lower()
        enriched_terms = []

        last_equipment = entities["equipment"][-1] if entities["equipment"] else None
        last_engineer = entities["engineers"][-1] if entities["engineers"] else None

        # 1. Pronoun / Indirect equipment reference resolution
        equipment_triggers = ["the pump", "the boiler", "the turbine", "the switchgear", "the valve", "the breaker", "it", "this equipment", "that asset"]
        contains_eq_pronoun = any(re.search(r'\b' + re.escape(t) + r'\b', q_lower) for t in equipment_triggers)

        # Check if explicit equipment tag is already in query
        eq_pattern = re.compile(r'\b([A-Z]-\d{3,4}|TURBINE-\d+|FEEDER-\d+|BUS-[A-Z])\b', re.IGNORECASE)
        has_explicit_eq = bool(eq_pattern.search(query))

        if last_equipment and (contains_eq_pronoun or not has_explicit_eq):
            enriched_terms.append(last_equipment)

        # 2. Person pronoun resolution ("he", "she", "his", "her", "who handled it", "what did he say")
        person_triggers = ["he", "she", "his", "her", "they", "the engineer", "the specialist", "the manager", "who worked on it", "who handled"]
        contains_person_pronoun = any(re.search(r'\b' + re.escape(t) + r'\b', q_lower) for t in person_triggers)

        if last_engineer and contains_person_pronoun:
            enriched_terms.append(last_engineer)

        # 3. Apply DB Coreference Aliases (e.g., 'primary superheater' -> 'B-101')
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT standard_name, alias_name FROM coreference_map")
        coref_rows = cursor.fetchall()
        conn.close()

        resolved_query = query
        for r in coref_rows:
            alias = r["alias_name"].lower()
            if alias in resolved_query.lower():
                resolved_query = re.sub(re.escape(alias), r["standard_name"], resolved_query, flags=re.IGNORECASE)

        # Append resolved context to search query if not already present
        search_query = resolved_query
        for term in enriched_terms:
            if term.lower() not in search_query.lower():
                search_query += f" {term}"

        return search_query, {
            "resolved_equipment": last_equipment,
            "resolved_engineer": last_engineer,
            "active_entities": entities,
            "search_query": search_query
        }

    @staticmethod
    def update_conversation_summary(existing_summary: str, last_query: str, last_answer: str) -> str:
        """
        Creates/updates a compact rolling summary of the conversation.
        """
        summary_lines = []
        if existing_summary and len(existing_summary.strip()) > 0:
            summary_lines.append(existing_summary.strip())

        # Clean short excerpt from latest turn
        q_clean = last_query.strip().rstrip("?.!")
        ans_clean = last_answer.replace("\n", " ").strip()
        if len(ans_clean) > 160:
            ans_clean = ans_clean[:157] + "..."

        summary_lines.append(f"Turn: User asked about '{q_clean}'. Resolution: {ans_clean}")

        # Keep max 4 key lines for brevity
        if len(summary_lines) > 4:
            summary_lines = summary_lines[-4:]

        return " | ".join(summary_lines)
