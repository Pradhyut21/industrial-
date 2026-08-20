from rank_bm25 import BM25Okapi
from backend.database import get_db_connection
from backend.vector_store import store
from backend.retrieval import tokenize

_bm25_index = None
_bm25_docs = []

def build_bm25_index():
    global _bm25_index, _bm25_docs
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, engineer_author, equipment_tag, failure_code FROM documents")
    _bm25_docs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    corpus = [tokenize(d["title"] + " " + d["content"]) for d in _bm25_docs]
    _bm25_index = BM25Okapi(corpus) if corpus else None

def get_feedback_scores():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT doc_id, SUM(CASE WHEN is_positive=1 THEN 1 ELSE -1 END) as net_score
    FROM feedback
    GROUP BY doc_id
    """)
    scores = {row["doc_id"]: row["net_score"] for row in cursor.fetchall()}
    conn.close()
    return scores

def reciprocal_rank_fusion(query: str, k: int = 5, rrf_k: int = 60):
    if _bm25_index is None:
        build_bm25_index()

    bm25_scores = _bm25_index.get_scores(tokenize(query)) if _bm25_index else []
    bm25_ranked = sorted(range(len(bm25_scores)), key=lambda i: -bm25_scores[i])[:20]
    bm25_ids = [_bm25_docs[i]["id"] for i in bm25_ranked]

    vector_results = store.search(query, k=20)
    vector_ids = [r["id"] for r in vector_results]

    # RRF: score = sum(1 / (rrf_k + rank)) across both rankings
    fused_scores = {}
    for rank, doc_id in enumerate(bm25_ids):
        fused_scores[doc_id] = fused_scores.get(doc_id, 0) + 1 / (rrf_k + rank)
    for rank, doc_id in enumerate(vector_ids):
        fused_scores[doc_id] = fused_scores.get(doc_id, 0) + 1 / (rrf_k + rank)

    # Apply feedback boosting
    feedback_scores = get_feedback_scores()
    for doc_id in fused_scores:
        net_feedback = feedback_scores.get(doc_id, 0)
        multiplier = max(0.5, min(2.0, 1.0 + (net_feedback * 0.2)))
        fused_scores[doc_id] *= multiplier

    id_to_meta = {d["id"]: d for d in _bm25_docs}
    id_to_vecmeta = {r["id"]: r for r in vector_results}
    ranked_ids = sorted(fused_scores, key=lambda i: -fused_scores[i])[:max(k * 3, 15)]

    results = []
    for doc_id in ranked_ids:
        sql_meta = id_to_meta.get(doc_id, {})
        vec_meta = id_to_vecmeta.get(doc_id, {})
        # Merge with SQL as the base of truth (always has every column) and let
        # vector metadata only ADD fields (like a fresher score), never silently drop one.
        meta = {**sql_meta, **vec_meta}
        if "content" not in meta or not meta["content"]:
            meta["content"] = sql_meta.get("content", "")
        if "author" not in meta and "engineer_author" in meta:
            meta["author"] = meta["engineer_author"]
        results.append({**meta, "id": doc_id, "fused_score": fused_scores[doc_id], "score": fused_scores[doc_id]})
    
    from backend.reranker import rerank_results
    reranked_results = rerank_results(query, results, relative_gap=4.0)
    
    return reranked_results[:k]
