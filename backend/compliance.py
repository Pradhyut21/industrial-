"""
Regulatory & Quality Compliance Intelligence.

Maps regulatory_requirements against the existing documents table using the SAME
embedding model already loaded for retrieval (backend/vector_store.get_model()),
plus age-based staleness checks against age_years / upload_date. Produces a
compliance_gaps report that can be regenerated on demand or cached.
"""
import datetime
from backend.database import get_db_connection
from backend.vector_store import get_model
import numpy as np

SIMILARITY_THRESHOLD = 0.25  # cosine sim below this = "no matching evidence found"

def _equipment_matches(req_equipment: str, doc_tag: str) -> bool:
    if req_equipment == "ALL":
        return True
    tags = [t.strip() for t in req_equipment.split(",")]
    return doc_tag in tags

def run_compliance_scan():
    """
    For every regulatory requirement, find the best-matching document as evidence,
    classify the gap type, and persist results to compliance_gaps.
    Returns the list of gap records (also written to DB for audit history).
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM regulatory_requirements")
    requirements = cursor.fetchall()

    cursor.execute("SELECT * FROM documents")
    documents = cursor.fetchall()

    model = get_model()
    doc_texts = [f"{d['title']} {d['content']}" for d in documents]
    doc_vecs = model.encode(doc_texts, normalize_embeddings=True) if doc_texts else np.zeros((0, 384))

    cursor.execute("DELETE FROM compliance_gaps")  # recompute fresh each scan
    results = []
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for req in requirements:
        req_vec = model.encode([req["clause_text"]], normalize_embeddings=True)[0]

        best_doc, best_score = None, -1.0
        for doc, vec in zip(documents, doc_vecs):
            if req["applies_to_doc_type"] != "ALL" and doc["doc_type"] != req["applies_to_doc_type"]:
                continue
            if not _equipment_matches(req["applies_to_equipment"], doc["equipment_tag"]):
                continue
            score = float(np.dot(req_vec, vec))
            if score > best_score:
                best_doc, best_score = doc, score

        if best_doc is None or best_score < SIMILARITY_THRESHOLD:
            gap_type, severity, action = "Missing Evidence", "Critical", \
                f"No document found satisfying {req['clause_id']}. Schedule inspection/audit immediately."
            evidence_id, confidence = None, best_score if best_doc else 0.0
        else:
            age_years = best_doc["age_years"] or 0
            max_age = req["review_frequency_months"] / 12.0
            if age_years > max_age:
                gap_type, severity, action = "Stale Evidence", "Major", \
                    f"Latest evidence ({best_doc['title']}) is {age_years}y old; " \
                    f"{req['clause_id']} requires refresh every {req['review_frequency_months']} months."
            else:
                gap_type, severity, action = "Compliant", "Minor", "No action required."
            evidence_id, confidence = best_doc["id"], best_score

        cursor.execute("""
        INSERT INTO compliance_gaps (
            requirement_id, equipment_tag, gap_type, evidence_doc_id, confidence,
            detected_on, severity, recommended_action
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (req["id"], req["applies_to_equipment"], gap_type, evidence_id,
              round(confidence, 3), now, severity, action))

        results.append({
            "requirement_source": req["source"],
            "clause_id": req["clause_id"],
            "clause_text": req["clause_text"],
            "equipment": req["applies_to_equipment"],
            "gap_type": gap_type,
            "severity": severity,
            "evidence_doc": best_doc["title"] if best_doc else None,
            "confidence": round(confidence, 3),
            "recommended_action": action,
        })

    conn.commit()
    conn.close()
    return results
