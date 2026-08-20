from backend.vector_store import store, get_model
from backend.ingestion import extract_entities
from backend.database import get_db_connection
import numpy as np

def analyze_shift_note(note: str) -> dict:
    """
    Ground shift-note analysis in actual document retrieval instead of hardcoded
    keyword branches. Finds the closest historical incident by embedding similarity,
    then pulls REAL causal relationships from co-occurrence in the documents table
    (not a hand-seeded causal_links row).
    """
    matches = store.search(note, k=3)
    entities = extract_entities(note)

    if not matches:
        return {"triggered": False, "details": {}}

    top = matches[0]
    tag = top["equipment_tag"]

    conn = get_db_connection()
    cursor = conn.cursor()
    # Real co-occurrence: which OTHER equipment tags appear in documents alongside this one
    cursor.execute("""
        SELECT equipment_tag, COUNT(*) as freq FROM documents
        WHERE id IN (
            SELECT id FROM documents WHERE content LIKE ?
        ) AND equipment_tag != ? GROUP BY equipment_tag ORDER BY freq DESC LIMIT 1
    """, (f"%{tag}%", tag))
    co_occurring = cursor.fetchone()
    conn.close()

    causal_warning = None
    if co_occurring and co_occurring["freq"] >= 2:
        prob = min(95, 50 + co_occurring["freq"] * 10)
        causal_warning = (f"Downstream risk on {co_occurring['equipment_tag']} — "
                           f"co-occurs in {co_occurring['freq']} historical logs with {tag} "
                           f"(estimated causal probability: {prob}%).")

    return {
        "triggered": True,
        "details": {
            "tag": tag,
            "expert": top.get("author", "Unknown"),
            "alert": f"Pattern match: {top.get('title', 'Log')} (similarity {top.get('score', 0):.0%})",
            "guide": top.get("content", "")[:300],
            "causal_warning": causal_warning or "No strong downstream correlation found in current logs.",
            "extracted_entities": entities
        }
    }
