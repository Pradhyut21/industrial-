import os
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL")  # e.g. postgresql://user:pass@host/db
USE_POSTGRES = bool(DATABASE_URL and DATABASE_URL.startswith("postgres"))

if USE_POSTGRES:
    from sqlalchemy import create_engine, text
    engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)

    @contextmanager
    def get_conn():
        conn = engine.connect()
        try:
            yield conn
        finally:
            conn.close()

    def ensure_pgvector_schema():
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS document_embeddings (
                    doc_id INTEGER PRIMARY KEY REFERENCES documents(id),
                    embedding vector(384)
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_doc_embeddings_hnsw
                ON document_embeddings USING hnsw (embedding vector_cosine_ops)
            """))
else:
    @contextmanager
    def get_conn():
        from backend.database import get_db_connection
        conn = get_db_connection()
        try:
            yield conn
        finally:
            conn.close()
            
    def ensure_pgvector_schema():
        pass
