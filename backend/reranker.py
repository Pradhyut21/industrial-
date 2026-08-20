from sentence_transformers import CrossEncoder
import threading

_reranker_model = None
_model_lock = threading.Lock()   # guards model construction only
_lock = threading.Lock()         # existing — guards .predict() calls (kept as-is,
                                  # cross-encoder inference isn't proven thread-safe
                                  # either, so serializing predict() calls stays)

import numpy as np
from rapidfuzz import fuzz

class OfflineCrossEncoder:
    """
    Fallback cross-encoder for sandboxes or air-gapped environments without
    Hugging Face access. Uses fuzzy token alignment scores.
    """
    def __init__(self, *args, **kwargs):
        pass

    def predict(self, pairs):
        scores = []
        for q, c in pairs:
            q_lower = str(q).lower()
            c_lower = str(c).lower()
            ratio = fuzz.partial_ratio(q_lower, c_lower) / 100.0
            # Scale to typical cross-encoder logits (-10 to +10)
            score = (ratio * 12.0) - 4.0
            scores.append(score)
        return np.array(scores, dtype="float32")

def get_reranker():
    """Thread-safe lazy singleton with offline fallback."""
    global _reranker_model
    if _reranker_model is not None:
        return _reranker_model
    with _model_lock:
        if _reranker_model is None:
            try:
                _reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
            except Exception as e:
                print(f"[Reranker] Notice: CrossEncoder download unavailable ({e}). Using offline lexical matcher.")
                _reranker_model = OfflineCrossEncoder()
    return _reranker_model

def rerank_results(query: str, docs: list, relative_gap: float = 4.0) -> list:
    """
    Reranks a list of retrieved documents (dict format) using a Cross-Encoder.
    Instead of a fragile absolute cutoff, drops results that score meaningfully
    worse than THIS query's own best match.
    """
    if not docs:
        return docs

    pairs = [[query, doc.get("content", "")] for doc in docs]

    with _lock:
        scores = get_reranker().predict(pairs)

    for i, doc in enumerate(docs):
        doc["rerank_score"] = float(scores[i])

    reranked_docs = sorted(docs, key=lambda x: x["rerank_score"], reverse=True)

    if not reranked_docs:
        return reranked_docs

    best_score = reranked_docs[0]["rerank_score"]
    return [d for d in reranked_docs if best_score - d["rerank_score"] <= relative_gap]
