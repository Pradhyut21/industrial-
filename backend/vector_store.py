import faiss
import numpy as np
import pickle
import os
import threading

MODEL_NAME = "all-MiniLM-L6-v2"
INDEX_PATH = "backend/data/faiss.index"
META_PATH = "backend/data/faiss_meta.pkl"

_model = None
_model_lock = threading.Lock()          # guards model construction only
_vs_lock = threading.Lock()             # guards FAISS index mutation
_save_timer = None

class OfflineEmbeddingModel:
    """
    Deterministic fallback embedding model for memory-constrained cloud tiers
    (Render 512MB, Vercel Serverless) or air-gapped sandboxes.
    Uses zero PyTorch RAM (~15MB total).
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def encode(self, sentences, normalize_embeddings: bool = True, **kwargs):
        if isinstance(sentences, str):
            sentences = [sentences]
        embeddings = []
        for text in sentences:
            vec = np.zeros(self.dim, dtype="float32")
            if not text:
                embeddings.append(vec)
                continue
            words = text.lower().split()
            for i, word in enumerate(words):
                # Hash word to multiple deterministic bucket indices
                h = hash(word)
                idx = abs(h) % self.dim
                weight = 1.0 / (1.0 + 0.1 * i)
                vec[idx] += weight
                # Character trigrams for typo resilience
                for j in range(len(word) - 2):
                    tri_hash = hash(word[j:j+3])
                    tri_idx = abs(tri_hash) % self.dim
                    vec[tri_idx] += 0.3 * weight
            
            norm = np.linalg.norm(vec)
            if normalize_embeddings and norm > 0:
                vec = vec / norm
            embeddings.append(vec)
        return np.array(embeddings, dtype="float32")

def get_model():
    """
    Thread-safe lazy singleton with low-memory/offline fallback.
    """
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            # If explicit low memory mode or Render free tier
            low_mem = os.environ.get("LOW_MEMORY_MODE", "").lower() in ("1", "true", "yes")
            if low_mem:
                _model = OfflineEmbeddingModel()
                return _model
            try:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer(MODEL_NAME)
            except Exception as e:
                print(f"[VectorStore] Notice: SentenceTransformer unavailable or memory constrained ({e}). Using offline deterministic embedding engine.")
                _model = OfflineEmbeddingModel()
    return _model

class VectorStore:
    def __init__(self, dim: int = 384):
        self.dim = dim
        self.index = faiss.IndexFlatIP(dim)
        self.metadata = []
        self._load()

    def _load(self):
        if os.path.exists(INDEX_PATH) and os.path.exists(META_PATH):
            self.index = faiss.read_index(INDEX_PATH)
            with open(META_PATH, "rb") as f:
                self.metadata = pickle.load(f)

    def save(self):
        with _vs_lock:
            os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
            faiss.write_index(self.index, INDEX_PATH)
            with open(META_PATH, "wb") as f:
                pickle.dump(self.metadata, f)

    def schedule_save(self):
        global _save_timer
        with _vs_lock:
            if _save_timer is not None:
                _save_timer.cancel()
            _save_timer = threading.Timer(2.0, self.save)
            _save_timer.start()

    def add_document(self, doc_id: int, text: str, meta: dict):
        vec = get_model().encode([text], normalize_embeddings=True)
        with _vs_lock:
            self.index.add(np.array(vec, dtype="float32"))
            self.metadata.append({**meta, "id": doc_id})
        self.schedule_save()

    def search(self, query: str, k: int = 5, engineer_filter: str = None):
        if self.index.ntotal == 0:
            return []
        qvec = get_model().encode([query], normalize_embeddings=True)
        scores, idxs = self.index.search(np.array(qvec, dtype="float32"), min(k * 3, self.index.ntotal))
        results = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx == -1:
                continue
            meta = self.metadata[idx]
            if engineer_filter and engineer_filter != "Auto-Route" and meta.get("author") != engineer_filter:
                continue
            results.append({**meta, "score": float(score)})
            if len(results) >= k:
                break
        return results


class PgVectorStore:
    """
    Production vector store backed by pgvector (Postgres).
    Selected automatically when DATABASE_URL is set to a postgres:// URL.
    Shares the exact same public interface as VectorStore so all callers
    are backend-agnostic.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim
        from backend.db_engine import ensure_pgvector_schema
        ensure_pgvector_schema()

    def add_document(self, doc_id: int, text: str, meta: dict):
        vec = get_model().encode([text], normalize_embeddings=True)[0].tolist()
        from backend.db_engine import get_conn
        from sqlalchemy import text as sa_text
        with get_conn() as conn:
            conn.execute(
                sa_text("""
                    INSERT INTO document_embeddings (doc_id, embedding)
                    VALUES (:doc_id, :embedding)
                    ON CONFLICT (doc_id) DO UPDATE SET embedding = EXCLUDED.embedding
                """),
                {"doc_id": doc_id, "embedding": str(vec)},
            )
            conn.commit()

    def search(self, query: str, k: int = 5, engineer_filter: str = None):
        qvec = get_model().encode([query], normalize_embeddings=True)[0].tolist()
        from backend.db_engine import get_conn
        from sqlalchemy import text as sa_text
        with get_conn() as conn:
            rows = conn.execute(
                sa_text("""
                    SELECT d.id, d.title, d.content,
                           d.engineer_author AS author,
                           d.doc_type, d.equipment_tag, d.failure_code,
                           1 - (e.embedding <=> :qvec) AS score
                    FROM document_embeddings e
                    JOIN documents d ON d.id = e.doc_id
                    ORDER BY e.embedding <=> :qvec
                    LIMIT :k
                """),
                {"qvec": str(qvec), "k": k * 3},
            ).fetchall()
        results = []
        for r in rows:
            row_dict = dict(r._mapping)
            if (
                engineer_filter
                and engineer_filter != "Auto-Route"
                and row_dict.get("author") != engineer_filter
            ):
                continue
            results.append(row_dict)
            if len(results) >= k:
                break
        return results


# ── Module-level singleton ──────────────────────────────────────────────────
# Selects the backend based on DATABASE_URL at import time.
# Demo mode (no env var): VectorStore — local FAISS, zero config.
# Prod mode (DATABASE_URL=postgres://...): PgVectorStore — shared pgvector.
from backend.db_engine import USE_POSTGRES
store = PgVectorStore() if USE_POSTGRES else VectorStore()
