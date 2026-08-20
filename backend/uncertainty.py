import numpy as np
from backend.vector_store import get_model

def compute_uncertainty(query: str, sources: list, engineer_name: str = None) -> dict:
    """
    Real uncertainty decomposition using signals already available in the pipeline:
    - sparsity: how few/weak the retrieved sources are (real retrieval scores)
    - staleness: average document age from the half-life model (age_years, contradiction_count)
    - disagreement: semantic variance BETWEEN retrieved sources' content (not query hash)
    - causal: whether retrieved docs mention known downstream co-occurring equipment
    """
    if not sources:
        return {"sparsity": "HIGH", "staleness": "HIGH", "disagreement": "HIGH",
                "causal": "HIGH", "risk_score": 85}

    # Sparsity: real retrieval confidence, not a citation-count proxy
    scores = [s.get("score", 0) for s in sources]
    avg_score = sum(scores) / len(scores) if scores else 0
    sparsity = "LOW" if avg_score > 0.6 else ("MEDIUM" if avg_score > 0.3 else "HIGH")

    # Staleness: pull real age/contradiction data for the retrieved doc IDs
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    ids = tuple(s["id"] for s in sources if s.get("id") is not None)
    staleness = "MEDIUM"
    if ids:
        placeholders = ",".join("?" * len(ids))
        cursor.execute(f"SELECT age_years, contradiction_count FROM documents WHERE id IN ({placeholders})", ids)
        rows = cursor.fetchall()
        if rows:
            avg_age = sum(r["age_years"] for r in rows) / len(rows)
            total_contradictions = sum(r["contradiction_count"] for r in rows)
            staleness = "HIGH" if avg_age > 3 or total_contradictions > 1 else ("LOW" if avg_age < 1 else "MEDIUM")
    conn.close()

    # Disagreement: real embedding variance across retrieved source contents
    model = get_model()
    texts = [s.get("content", "")[:500] for s in sources if s.get("content")]
    disagreement = "LOW"
    if len(texts) >= 2:
        vecs = model.encode(texts, normalize_embeddings=True)
        sims = []
        for i in range(len(vecs)):
            for j in range(i + 1, len(vecs)):
                sims.append(float(np.dot(vecs[i], vecs[j])))
        avg_sim = sum(sims) / len(sims) if sims else 1.0
        disagreement = "HIGH" if avg_sim < 0.5 else ("MEDIUM" if avg_sim < 0.75 else "LOW")

    # Causal: reuse the real co-occurrence logic already built for shift_analyzer
    from backend.shift_analyzer import analyze_shift_note
    causal_result = analyze_shift_note(query)
    causal = "MEDIUM" if causal_result.get("details", {}).get("causal_warning", "").startswith("Downstream") else "LOW"

    risk_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    total_risk = sum(risk_map[v] for v in [sparsity, staleness, disagreement, causal])
    risk_score = int(min(95, 10 + total_risk * 12))

    return {"sparsity": sparsity, "staleness": staleness, "disagreement": disagreement,
            "causal": causal, "risk_score": risk_score}
