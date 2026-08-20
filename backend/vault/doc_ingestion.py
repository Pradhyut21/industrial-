"""
Document ingestion module for the Continuity Vault.

Handles: .docx (python-docx), .xlsx (openpyxl), .eml / plain-text email (stdlib),
and generic plain-text logs.

All formats flow through the same ingest_document() RAG pipeline used by the
existing ingestion module, so they are immediately queryable via the Copilot.

Requires:
  python-docx  — for .docx files
  openpyxl     — for .xlsx files
  Both are pure-Python with no system deps. Added to requirements.txt.
"""
from __future__ import annotations

import datetime
import io
import email as email_stdlib
from typing import Optional

from backend.database import get_db_connection
from backend.ingestion import ingest_document

# ── Optional imports with graceful degradation ────────────────────────────────

try:
    import docx as python_docx

    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    print("[DocIngestion] python-docx not installed — .docx support disabled. Run: pip install python-docx")

try:
    import openpyxl

    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False
    print("[DocIngestion] openpyxl not installed — .xlsx support disabled. Run: pip install openpyxl")


# ── Text extractors ───────────────────────────────────────────────────────────

def _extract_docx(file_bytes: bytes) -> str:
    if not DOCX_AVAILABLE:
        return "[STUB] python-docx not installed — .docx text extraction unavailable."
    doc = python_docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _extract_xlsx(file_bytes: bytes) -> str:
    if not XLSX_AVAILABLE:
        return "[STUB] openpyxl not installed — .xlsx text extraction unavailable."
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    rows = []
    for sheet in wb.worksheets:
        rows.append(f"[Sheet: {sheet.title}]")
        for row in sheet.iter_rows(values_only=True):
            cells = [str(c) if c is not None else "" for c in row]
            line = "\t".join(cells).strip()
            if line.replace("\t", "").strip():
                rows.append(line)
    return "\n".join(rows)


def _extract_eml(file_bytes: bytes) -> str:
    msg = email_stdlib.message_from_bytes(file_bytes)
    subject = msg.get("Subject", "(no subject)")
    sender = msg.get("From", "Unknown")
    date = msg.get("Date", "")
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode(msg.get_content_charset() or "utf-8", errors="replace")

    return f"Email from {sender} on {date}\nSubject: {subject}\n\n{body}"


def _extract_text(filename: str, file_bytes: bytes) -> str:
    """Route to the appropriate extractor based on file extension."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"
    if ext == "docx":
        return _extract_docx(file_bytes)
    elif ext == "xlsx":
        return _extract_xlsx(file_bytes)
    elif ext == "eml":
        return _extract_eml(file_bytes)
    else:
        # Plain text / shift log
        return file_bytes.decode("utf-8", errors="replace")


# ── Summarisation ─────────────────────────────────────────────────────────────

def _summarise_doc(filename: str, text: str, author: str, artifact_type: str) -> str:
    import os
    from backend.llm import get_groq_response, APIConfig

    live_key = os.environ.get("GROQ_API_KEY", "") or APIConfig.key
    if live_key and text.strip():
        try:
            system = (
                "You are a knowledge management analyst. Summarise the following document "
                "in 2-4 plain-English sentences for a cross-department reader with no specialist background. "
                "Focus on: what it is, what key information or decisions it contains, and any open action items."
            )
            prompt = f"Document: {filename}\nAuthor: {author}\nType: {artifact_type}\n\nContent:\n{text[:3000]}"
            return get_groq_response(prompt, system).strip()
        except Exception as e:
            print(f"[DocIngestion] LLM summarise failed: {e}")

    # Template fallback
    word_count = len(text.split())
    return (
        f"Document '{filename}' by {author} ({artifact_type}), approximately {word_count} words. "
        "Full content has been indexed for retrieval."
    )


# ── Main entry point ──────────────────────────────────────────────────────────

def ingest_document_file(
    person_id: int,
    person_name: str,
    filename: str,
    file_bytes: bytes,
    sensitivity_level: str,
    domain: str,
) -> dict:
    """
    Extracts text from a document file, indexes it into the RAG pipeline,
    and creates a vault_artifact record.

    Supports: .docx, .xlsx, .eml, and plain-text files.
    Returns a dict describing the created artifact.
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"
    type_map = {
        "docx": "docx",
        "xlsx": "xlsx",
        "eml": "email",
        "txt": "log",
        "log": "log",
        "csv": "log",
    }
    artifact_type = type_map.get(ext, "log")

    raw_content = _extract_text(filename, file_bytes)
    summary = _summarise_doc(filename, raw_content, person_name, artifact_type)

    # Index into RAG pipeline
    rag_doc = ingest_document(
        title=f"[{artifact_type.upper()}] {person_name}: {filename}",
        content=raw_content + "\n\nSummary: " + summary,
        doc_type=artifact_type.upper(),
        forced_author=person_name,
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute(
        """
        INSERT INTO vault_artifacts
            (person_id, artifact_type, source_ref, raw_content, plain_language_summary,
             sensitivity_level, domain, ingested_at, doc_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            person_id,
            artifact_type,
            filename,
            raw_content[:10000],
            summary,
            sensitivity_level,
            domain,
            now,
            rag_doc.get("id"),
        ),
    )
    conn.commit()
    artifact_id = cursor.lastrowid
    conn.close()

    return {
        "artifact_id": artifact_id,
        "artifact_type": artifact_type,
        "plain_language_summary": summary,
        "doc_id": rag_doc.get("id"),
    }
