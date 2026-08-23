"""
Continuity Brief Generator.

On demand, produces a structured handoff document for a given person:
  - summary_text: what they were working on, why, what's unfinished
  - unresolved_items: auto-extracted list of open PRs, pending flags, stale docs
  - glossary: domain jargon → plain English, auto-generated
  - role_aware: adapts explanation depth based on the requester's role

All output is grounded in the person's vault_artifacts (retrieved via the
existing RAG pipeline) — not free-floating LLM text. Each claim links back
to a source artifact.
"""
from __future__ import annotations

import datetime
import json
import os
from typing import Optional

from backend.database import get_db_connection
from backend.hybrid_retrieval import reciprocal_rank_fusion
from backend.llm import get_groq_response, APIConfig

# ── Role adaptation ───────────────────────────────────────────────────────────

ROLE_STYLE_MAP = {
    "Field Technician": (
        "Explain technical steps in detail, using numbered procedures. "
        "Use equipment tags and operational terms the technician is familiar with. "
        "Highlight what actions they need to take immediately."
    ),
    "Finance": (
        "Explain in plain business language with no technical jargon. "
        "Focus on: what knowledge is at risk, what work is incomplete, "
        "and what the financial or operational cost of inaction might be. "
        "Do not use equipment tags without explaining what they are."
    ),
    "QHS Manager": (
        "Prioritise safety-relevant open items and compliance gaps. "
        "Flag any undocumented procedures that deviate from official SOPs. "
        "Use regulatory terms (OISD, PESO, Factory Act) where applicable."
    ),
    "Plant Head": (
        "Provide a management-level summary. Highlight organisational risk, "
        "who is now responsible for critical systems, and what decisions need to be made. "
        "Be concise — 3-5 key points."
    ),
    "Reliability Engineer": (
        "Provide a technical deep-dive. Include equipment-level details, "
        "failure patterns, and any workarounds or non-standard procedures the person used. "
        "Cross-reference with known incident history where possible."
    ),
}

DEFAULT_ROLE_STYLE = (
    "Provide a balanced summary suitable for a general organisational audience. "
    "Explain technical terms where used."
)


def _get_role_style(role: str) -> str:
    return ROLE_STYLE_MAP.get(role, DEFAULT_ROLE_STYLE)


# ── Artifact retrieval ────────────────────────────────────────────────────────

def _load_artifacts(person_id: int) -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT artifact_type, source_ref, raw_content, plain_language_summary,
               sensitivity_level, ingested_at
        FROM vault_artifacts
        WHERE person_id = ?
        ORDER BY ingested_at DESC
        """,
        (person_id,),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def _get_person(person_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM persons WHERE id = ?", (person_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ── Brief generation ──────────────────────────────────────────────────────────

def _build_prompt(person: dict, artifacts: list, role: str) -> tuple[str, str]:
    """Returns (system_prompt, user_prompt)."""
    role_style = _get_role_style(role)
    name = person.get("name", "Unknown")
    dept = person.get("department", "Unknown department")
    exit_reason = person.get("exit_reason", "departure")
    exit_date = person.get("exit_date", "Unknown")

    artifact_text = "\n\n".join(
        f"[Artifact {i+1} — {a['artifact_type']} from {a['ingested_at'][:10]}]\n"
        f"Source: {a['source_ref']}\n"
        f"Summary: {a['plain_language_summary']}\n"
        f"Raw excerpt: {(a['raw_content'] or '')[:500]}"
        for i, a in enumerate(artifacts[:10])
    )

    system_prompt = (
        f"You are a knowledge management AI producing a Continuity Brief for {name}, "
        f"who is leaving {dept} due to {exit_reason} on {exit_date}. "
        f"Your audience is a {role}. Audience-specific instructions: {role_style}\n\n"
        "Your response MUST be valid JSON with exactly these keys:\n"
        '  "summary_text": string (300-500 words)\n'
        '  "unresolved_items": array of strings (5-10 items)\n'
        '  "glossary": object mapping domain_term to plain_english_definition (5-10 entries)\n'
        "Every claim in summary_text MUST reference [Artifact N] from the provided context. "
        "Do not invent facts not supported by the artifacts. "
        "If information is absent, write what is unknown rather than guessing."
    )

    user_prompt = (
        f"Generate a Continuity Brief for {name} based on the following captured artifacts:\n\n"
        f"{artifact_text}\n\n"
        "Return ONLY valid JSON — no markdown code fences, no preamble."
    )

    return system_prompt, user_prompt


def _parse_llm_brief(raw: str) -> dict:
    """Parse JSON from LLM response, with fallback."""
    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        cleaned = cleaned.rsplit("```", 1)[0]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Best-effort fallback
        return {
            "summary_text": cleaned[:1000],
            "unresolved_items": ["Brief generation encountered a parse error — manual review required."],
            "glossary": {},
        }


def _build_fallback_brief(person: dict, artifacts: list) -> dict:
    """Template-based brief when no Groq key is present."""
    name = person.get("name", "Unknown")
    summaries = [a["plain_language_summary"] for a in artifacts if a.get("plain_language_summary")]
    summary = " ".join(summaries[:3]) if summaries else "No artifacts ingested yet."

    return {
        "summary_text": (
            f"Continuity Brief for {name} (AI-generated template — Groq API key not configured). "
            f"Captured artifacts: {len(artifacts)}. "
            f"Key knowledge extracted: {summary[:400]}"
        ),
        "unresolved_items": [
            "Review all ingested artifacts for open action items.",
            "Verify which procedures are not yet in official SOPs.",
            "Identify successor for each knowledge domain.",
        ],
        "glossary": {
            "RAG pipeline": "Retrieval-Augmented Generation — AI that answers questions using specific documents rather than general knowledge.",
            "vault artifact": "A piece of captured knowledge (commit, presentation, log) attributed to a specific person.",
        },
    }


# ── DB write ──────────────────────────────────────────────────────────────────

def _upsert_brief(person_id: int, brief_data: dict) -> int:
    """Insert or update the continuity brief for a person. Returns brief id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT id FROM continuity_briefs WHERE person_id = ?", (person_id,))
    existing = cursor.fetchone()

    unresolved_json = json.dumps(brief_data.get("unresolved_items", []))
    glossary_json = json.dumps(brief_data.get("glossary", {}))

    if existing:
        cursor.execute(
            """
            UPDATE continuity_briefs
            SET generated_at = ?, summary_text = ?, unresolved_items = ?, glossary = ?,
                verification_status = 'unverified', verified_by = NULL, verified_at = NULL
            WHERE person_id = ?
            """,
            (
                now,
                brief_data["summary_text"],
                unresolved_json,
                glossary_json,
                person_id,
            ),
        )
        brief_id = existing["id"]
    else:
        cursor.execute(
            """
            INSERT INTO continuity_briefs
                (person_id, generated_at, summary_text, unresolved_items, glossary, verification_status)
            VALUES (?, ?, ?, ?, ?, 'unverified')
            """,
            (
                person_id,
                now,
                brief_data["summary_text"],
                unresolved_json,
                glossary_json,
            ),
        )
        brief_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return brief_id


import hashlib


def compute_brief_content_hash(summary_text: str, unresolved_items: list, glossary: dict) -> str:
    """
    Computes a canonical deterministic SHA-256 hash of the brief contents (Section 12.1).
    Used for tamper-evident on-chain anchoring on Algorand.
    """
    payload = {
        "summary_text": summary_text.strip() if summary_text else "",
        "unresolved_items": sorted(unresolved_items) if isinstance(unresolved_items, list) else unresolved_items,
        "glossary": glossary or {},
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# ── Public API ────────────────────────────────────────────────────────────────

def generate_brief(person_id: int, requester_role: str = "Admin") -> dict:
    """
    Generate (or regenerate) a Continuity Brief for person_id.
    Returns the brief as a dict (same shape as BriefResponse schema).
    """
    person = _get_person(person_id)
    if not person:
        raise ValueError(f"Person {person_id} not found")

    artifacts = _load_artifacts(person_id)

    live_key = os.environ.get("GROQ_API_KEY", "") or APIConfig.key
    if live_key and artifacts:
        system_prompt, user_prompt = _build_prompt(person, artifacts, requester_role)
        try:
            raw = get_groq_response(user_prompt, system_prompt, timeout=30)
            brief_data = _parse_llm_brief(raw)
        except Exception as e:
            print(f"[BriefGenerator] Groq call failed: {e} — using template fallback")
            brief_data = _build_fallback_brief(person, artifacts)
    else:
        if not live_key:
            print("[BriefGenerator] No Groq API key — using template fallback")
        brief_data = _build_fallback_brief(person, artifacts)

    brief_id = _upsert_brief(person_id, brief_data)

    # Return full brief object
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM continuity_briefs WHERE id = ?", (brief_id,))
    row = dict(cursor.fetchone())
    conn.close()

    network = os.environ.get("ALGORAND_NETWORK", "testnet").strip()
    txn_id = row.get("verification_txn_id")
    lora_url = f"https://lora.algokit.io/{network}/transaction/{txn_id}" if txn_id else None

    return {
        "id": row["id"],
        "person_id": row["person_id"],
        "generated_at": row["generated_at"],
        "summary_text": row["summary_text"],
        "unresolved_items": json.loads(row["unresolved_items"] or "[]"),
        "glossary": json.loads(row["glossary"] or "{}"),
        "verification_status": row["verification_status"],
        "verified_by": row["verified_by"],
        "verified_at": row["verified_at"],
        "verification_txn_id": txn_id,
        "content_hash": row.get("content_hash"),
        "lora_explorer_url": lora_url,
    }


def get_brief(person_id: int) -> Optional[dict]:
    """Fetch the latest Continuity Brief for a person. Returns None if not yet generated."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM continuity_briefs WHERE person_id = ?", (person_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    row = dict(row)
    network = os.environ.get("ALGORAND_NETWORK", "testnet").strip()
    txn_id = row.get("verification_txn_id")
    lora_url = f"https://lora.algokit.io/{network}/transaction/{txn_id}" if txn_id else None

    return {
        "id": row["id"],
        "person_id": row["person_id"],
        "generated_at": row["generated_at"],
        "summary_text": row["summary_text"],
        "unresolved_items": json.loads(row["unresolved_items"] or "[]"),
        "glossary": json.loads(row["glossary"] or "{}"),
        "verification_status": row["verification_status"],
        "verified_by": row["verified_by"],
        "verified_at": row["verified_at"],
        "verification_txn_id": txn_id,
        "content_hash": row.get("content_hash"),
        "lora_explorer_url": lora_url,
    }
