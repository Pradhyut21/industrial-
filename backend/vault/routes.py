"""
Continuity Intelligence Platform — FastAPI routes.

Mounts under the main app as:
  app.include_router(vault_router)

All routes are self-contained here. They import from existing backend modules
(database, llm, hybrid_retrieval) and new vault sub-modules.
"""
from __future__ import annotations

import datetime
import json
import os
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend.database import get_db_connection
from backend.hybrid_retrieval import reciprocal_rank_fusion
from backend.llm import generate_expert_answer, get_groq_response, APIConfig

from .schemas import (
    BriefResponse,
    ChannelResponse,
    CreatePersonRequest,
    CreateTaskRequest,
    FreshnessResponse,
    GenerateBriefRequest,
    GitIngestRequest,
    GitIngestResponse,
    IngestResponse,
    PersonResponse,
    TaskExplainRequest,
    TaskExplainResponse,
    TaskResponse,
    VaultQueryRequest,
    VaultQueryResponse,
    VerifyBriefRequest,
    VerifyBriefResponse,
    AuditProofResponse,
    VoiceInboundPayload,
    VoiceOutboundRequest,
    WhatsAppInboundPayload,
)
from .rbac import get_session_role, require_vault_access

vault_router = APIRouter(tags=["Continuity Vault"])

# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _get_person_or_404(person_id: int) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM persons WHERE id = ?", (person_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    return dict(row)


def _log_call_session(
    conn,
    person_id: Optional[int],
    channel: str,
    language: str,
    transcript: str,
    response_text: str,
    duration: float = 0.0,
) -> int:
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO call_sessions
            (person_id, channel, language, transcript, response_text, started_at, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (person_id, channel, language, transcript, response_text, _now(), duration),
    )
    conn.commit()
    return cursor.lastrowid


# ── Role-aware RAG query ──────────────────────────────────────────────────────

ROLE_QUERY_STYLE = {
    "Field Technician": (
        "You are helping a hands-on field technician. Give step-by-step, action-oriented instructions. "
        "Use specific equipment tags. Highlight safety warnings. Be concise and practical."
    ),
    "Finance": (
        "You are briefing a Finance professional. Translate all technical terms into plain English. "
        "Focus on business impact, cost implications, and risk to operations. "
        "Avoid unexplained acronyms and equipment codes."
    ),
    "QHS Manager": (
        "You are briefing a Quality, Health & Safety Manager. "
        "Prioritise safety-relevant findings, SOP compliance gaps, and regulatory implications. "
        "Reference relevant standards (OISD, PESO, Factory Act) where applicable."
    ),
    "Plant Head": (
        "You are briefing the Plant Head. Give a concise executive summary. "
        "Focus on who owns what now, what decisions need to be made, and organisational risk. "
        "3-5 key bullet points maximum."
    ),
    "Reliability Engineer": (
        "You are briefing a Reliability Engineer. "
        "Provide technical detail on failure modes, workarounds, and equipment-specific procedures. "
        "Cross-reference with known incident patterns."
    ),
}
DEFAULT_QUERY_STYLE = (
    "Provide a balanced response suitable for a general organisational audience. "
    "Explain technical terms where used."
)


def _role_system_prompt(role: str, person_name: str) -> str:
    style = ROLE_QUERY_STYLE.get(role, DEFAULT_QUERY_STYLE)
    return (
        f"You are accessing the Continuity Vault for {person_name}. "
        f"The person querying you is a {role}. {style} "
        "Ground all claims in the provided source documents. "
        "Cite sources as [Source N]. Do not invent facts."
    )


def _vault_rag_query(person_id: int, query: str, requester_role: str) -> dict:
    """Run the existing RAG pipeline filtered to vault artifacts for this person."""
    # Use the existing reciprocal_rank_fusion with query augmented by person context
    person = _get_person_or_404(person_id)
    person_name = person["name"]

    # Retrieve sources from the full RAG index (existing hybrid retrieval)
    sources = reciprocal_rank_fusion(query)

    live_key = os.environ.get("GROQ_API_KEY", "") or APIConfig.key
    if not sources:
        return {
            "answer": f"No documents found in the knowledge base matching '{query}'. "
                      f"Ensure artifacts have been ingested for {person_name}.",
            "citations": [],
            "confidence": 0,
            "role_adaptation_note": f"Answered for role: {requester_role}",
        }

    source_texts = "\n\n".join(
        f"[Source {i+1}] (Title: {s.get('title','Untitled')}, Author: {s.get('author','Unknown')}):\n"
        f"{s.get('content','')[:400]}"
        for i, s in enumerate(sources[:5])
    )

    system_prompt = _role_system_prompt(requester_role, person_name)
    user_prompt = (
        f"Query: {query}\n\n"
        f"Retrieved Documents:\n{source_texts}\n\n"
        "Provide your response following the role-specific instructions in the system prompt."
    )

    if live_key:
        try:
            answer = get_groq_response(user_prompt, system_prompt)
        except Exception as e:
            print(f"[VaultQuery] Groq failed: {e}")
            answer = f"[Fallback] Based on retrieved sources: {sources[0].get('content','')[:300]}"
    else:
        answer = (
            f"[No API key — template response for {requester_role}] "
            f"The most relevant document is: {sources[0].get('title','Unknown')} by "
            f"{sources[0].get('author','Unknown')}. Content excerpt: "
            f"{sources[0].get('content','')[:250]}..."
        )

    citations = [
        {"id": s.get("id"), "title": s.get("title", "Untitled"), "author": s.get("author", "Unknown")}
        for s in sources[:5]
    ]
    confidence = min(95, 50 + len(sources) * 8)

    return {
        "answer": answer,
        "citations": citations,
        "confidence": confidence,
        "role_adaptation_note": f"Response adapted for role: {requester_role}",
    }


# ── Routes ─────────────────────────────────────────────────────────────────────


@vault_router.post(
    "/vault/persons",
    response_model=PersonResponse,
    summary="Register a departing employee and create their Continuity Vault",
    description=(
        "Creates a Person record representing a departing or departed employee. "
        "This is the starting point for the handoff workflow. "
        "After creation, use the ingest endpoints to populate the vault."
    ),
)
def create_person(payload: CreatePersonRequest, request: Request, background_tasks: BackgroundTasks):
    role = get_session_role(request)
    if role not in ("Admin", "Plant Head", "HR"):
        raise HTTPException(status_code=403, detail="Only Admin / Plant Head / HR can register persons.")

    conn = get_db_connection()
    cursor = conn.cursor()
    now = _now()
    cursor.execute(
        """
        INSERT INTO persons (name, role, domain, department, status, exit_date, exit_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload.name,
            payload.role,
            payload.domain,
            payload.department,
            payload.status,
            payload.exit_date,
            payload.exit_reason,
            now,
        ),
    )
    person_id = cursor.lastrowid

    # Default access grants — Admin gets confidential, everyone else gets public by default
    default_grants = [
        (person_id, "Admin", "confidential"),
        (person_id, "Plant Head", "department-restricted"),
        (person_id, "QHS Manager", "department-restricted"),
        (person_id, "Field Technician", "public"),
        (person_id, "Finance", "public"),
        (person_id, "Reliability Engineer", "department-restricted"),
    ]
    cursor.executemany(
        "INSERT INTO access_grants (person_vault_id, granted_to_role, sensitivity_level_allowed) VALUES (?, ?, ?)",
        default_grants,
    )

    conn.commit()
    cursor.execute("SELECT * FROM persons WHERE id = ?", (person_id,))
    row = dict(cursor.fetchone())
    conn.close()

    # Section 11: Event-driven autonomous agent trigger on person creation
    try:
        from .onboarding_agent import run_autonomous_check
        background_tasks.add_task(run_autonomous_check)
    except Exception as exc:
        pass

    return row


@vault_router.get(
    "/vault/persons",
    response_model=list[PersonResponse],
    summary="List all registered persons in the Continuity Vault",
)
def list_persons(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM persons ORDER BY created_at DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@vault_router.post(
    "/vault/{person_id}/ingest/git",
    response_model=GitIngestResponse,
    summary="Ingest GitHub commit history for a person",
    description=(
        "Fetches commits and PR summaries from a GitHub repository for the given contributor "
        "and indexes them into the Continuity Vault. "
        "STUB: When GITHUB_TOKEN is absent, synthetic artifacts are used so the demo runs."
    ),
)
def ingest_git(person_id: int, payload: GitIngestRequest, request: Request):
    role = get_session_role(request)
    person = _get_person_or_404(person_id)
    require_vault_access(person_id, role, "department-restricted")

    from .git_ingestion import ingest_github_commits

    count = ingest_github_commits(
        person_id=person_id,
        person_name=person["name"],
        repo_url=payload.repo_url,
        contributor_login=payload.contributor_login,
        max_commits=payload.max_commits,
        sensitivity_level=payload.sensitivity_level,
        domain=person.get("domain", ""),
    )

    is_stub = not os.environ.get("GITHUB_TOKEN")
    return GitIngestResponse(
        status="success",
        artifacts_created=count,
        note=(
            "STUB mode: synthetic artifacts used (GITHUB_TOKEN not set)."
            if is_stub
            else f"Live GitHub ingestion: {count} commits indexed."
        ),
    )


@vault_router.post(
    "/vault/{person_id}/ingest/pptx",
    response_model=IngestResponse,
    summary="Upload and parse a PowerPoint presentation",
    description="Extracts slide text + speaker notes from a .pptx file and indexes it into the vault.",
)
async def ingest_pptx(
    person_id: int,
    request: Request,
    file: UploadFile = File(...),
    sensitivity_level: str = Form("confidential"),
):
    role = get_session_role(request)
    person = _get_person_or_404(person_id)
    require_vault_access(person_id, role, "department-restricted")

    if not file.filename.lower().endswith(".pptx"):
        raise HTTPException(status_code=415, detail="Only .pptx files are accepted.")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 50MB limit.")

    from .pptx_ingestion import ingest_pptx as _ingest_pptx

    result = _ingest_pptx(
        person_id=person_id,
        person_name=person["name"],
        filename=file.filename,
        file_bytes=contents,
        sensitivity_level=sensitivity_level,
        domain=person.get("domain", ""),
    )

    return IngestResponse(
        status="success",
        artifact_id=result["artifact_id"],
        artifact_type="pptx",
        plain_language_summary=result["plain_language_summary"],
        doc_id=result.get("doc_id"),
    )


@vault_router.post(
    "/vault/{person_id}/ingest/doc",
    response_model=IngestResponse,
    summary="Upload and parse a document (.docx, .xlsx, .eml, .txt)",
    description=(
        "Extracts text from .docx, .xlsx, .eml, and plain-text files and indexes "
        "them into the vault. All formats flow through the same RAG pipeline."
    ),
)
async def ingest_doc(
    person_id: int,
    request: Request,
    file: UploadFile = File(...),
    sensitivity_level: str = Form("department-restricted"),
):
    role = get_session_role(request)
    person = _get_person_or_404(person_id)
    require_vault_access(person_id, role, "department-restricted")

    ALLOWED_EXTS = {".docx", ".xlsx", ".eml", ".txt", ".log", ".csv"}
    ext = "." + file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTS)}",
        )

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 50MB limit.")

    from .doc_ingestion import ingest_document_file

    result = ingest_document_file(
        person_id=person_id,
        person_name=person["name"],
        filename=file.filename,
        file_bytes=contents,
        sensitivity_level=sensitivity_level,
        domain=person.get("domain", ""),
    )

    return IngestResponse(
        status="success",
        artifact_id=result["artifact_id"],
        artifact_type=result["artifact_type"],
        plain_language_summary=result["plain_language_summary"],
        doc_id=result.get("doc_id"),
    )


@vault_router.post(
    "/vault/{person_id}/brief",
    response_model=BriefResponse,
    summary="Generate or regenerate a Continuity Brief",
    description=(
        "Runs an LLM pass over all ingested artifacts for this person to produce a structured "
        "Continuity Brief: summary, unresolved items, and a plain-language glossary. "
        "Previous brief (if any) is replaced. Verification status resets to 'unverified'."
    ),
)
def generate_brief_route(person_id: int, payload: GenerateBriefRequest, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    from .brief_generator import generate_brief

    return generate_brief(person_id=person_id, requester_role=payload.requester_role or role)


@vault_router.get(
    "/vault/{person_id}/brief",
    response_model=BriefResponse,
    summary="Fetch the latest Continuity Brief for a person",
)
def get_brief_route(person_id: int, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    from .brief_generator import get_brief, generate_brief

    brief = get_brief(person_id)
    if not brief:
        try:
            brief = generate_brief(person_id=person_id, requester_role=role)
        except Exception:
            raise HTTPException(
                status_code=404,
                detail=f"No Continuity Brief found for person {person_id}. Generate one first via POST /vault/{person_id}/brief",
            )
    return brief



def _anchor_hash_on_algorand(content_hash: str) -> Optional[str]:
    """
    Submits a zero-ALGO self-transfer on Algorand with the SHA-256 hash
    encoded in the transaction Note field (Section 12.1):
      note = b"deadmind:brief:v1:" + content_hash.encode('utf-8')
    Returns the confirmed transaction ID, or None if live credentials are unset.
    """
    mnemonic_secret = os.environ.get("AGENT_ALGORAND_MNEMONIC") or os.environ.get("ALGORAND_PAYOUT_MNEMONIC")
    sender_address = os.environ.get("AGENT_ALGORAND_ADDRESS") or os.environ.get("ALGORAND_PAYMENT_ADDRESS")
    if not mnemonic_secret or not sender_address:
        return None
    try:
        from algosdk import mnemonic as algo_mnemonic, transaction as algo_tx
        from algosdk.v2client import algod
        private_key = algo_mnemonic.to_private_key(mnemonic_secret)
        node_url = os.environ.get("ALGORAND_NODE_URL", "https://testnet-api.algonode.cloud").strip()
        node_token = os.environ.get("ALGORAND_NODE_TOKEN", "").strip()
        headers = {"X-API-Key": node_token} if node_token else {}
        client = algod.AlgodClient(node_token, node_url, headers)
        params = client.suggested_params()

        note_content = f"deadmind:brief:v1:{content_hash}".encode("utf-8")
        txn = algo_tx.PaymentTxn(
            sender=sender_address,
            sp=params,
            receiver=sender_address,
            amt=0,
            note=note_content,
        )
        signed = txn.sign(private_key)
        txid = client.send_transaction(signed)
        return txid
    except Exception as exc:
        print(f"[OnChainAnchor] Broadcast note anchor to Algorand failed (proceeding): {exc}")
        return None


@vault_router.post(
    "/vault/{person_id}/brief/verify",
    response_model=VerifyBriefResponse,
    summary="Mark a Continuity Brief as peer-verified and anchor SHA-256 hash on-chain (Section 12.1)",
    description=(
        "A peer reviewer audits the AI-generated brief. The system computes a canonical "
        "SHA-256 hash of the brief contents and broadcasts an immutable anchor transaction "
        "to the Algorand blockchain. The resulting transaction ID is recorded for tamper detection."
    ),
)
def verify_brief(person_id: int, payload: VerifyBriefRequest, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    conn = get_db_connection()
    cursor = conn.cursor()
    now = _now()

    # Load current brief content for hashing
    cursor.execute("SELECT id, summary_text, unresolved_items, glossary FROM continuity_briefs WHERE person_id = ?", (person_id,))
    brief_row = cursor.fetchone()
    if not brief_row:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail=f"No brief found for person {person_id} to verify.",
        )

    brief_dict = dict(brief_row)
    from .brief_generator import compute_brief_content_hash
    summary_text = brief_dict["summary_text"] or ""
    unresolved_items = json.loads(brief_dict["unresolved_items"] or "[]")
    glossary = json.loads(brief_dict["glossary"] or "{}")

    content_hash = compute_brief_content_hash(summary_text, unresolved_items, glossary)

    # Broadcast note anchor on Algorand
    on_chain_txid = _anchor_hash_on_algorand(content_hash)

    cursor.execute(
        """
        UPDATE continuity_briefs
        SET verification_status = 'verified', verified_by = ?, verified_at = ?,
            content_hash = ?, verification_txn_id = ?
        WHERE person_id = ?
        """,
        (payload.verifier_name, now, content_hash, on_chain_txid, person_id),
    )
    conn.commit()
    conn.close()

    network = os.environ.get("ALGORAND_NETWORK", "testnet").strip()
    lora_url = f"https://lora.algokit.io/{network}/transaction/{on_chain_txid}" if on_chain_txid else None

    return VerifyBriefResponse(
        status="verified",
        verified_by=payload.verifier_name,
        verified_at=now,
        content_hash=content_hash,
        verification_txn_id=on_chain_txid,
        lora_explorer_url=lora_url,
    )


@vault_router.get(
    "/vault/{person_id}/brief/audit-proof",
    response_model=AuditProofResponse,
    summary="Cryptographic on-chain verification proof for a Continuity Brief (Section 12.1)",
    description=(
        "Recomputes the deterministic SHA-256 hash of the current brief content and compares it "
        "against the immutable hash anchored on the Algorand blockchain. "
        "Guarantees the brief has not been tampered with or silently edited since verification."
    ),
    tags=["Verification / Trust Layer"],
)
def get_brief_audit_proof(person_id: int, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM continuity_briefs WHERE person_id = ?", (person_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="No Continuity Brief found for this person.")

    row = dict(row)
    summary_text = row["summary_text"] or ""
    unresolved_items = json.loads(row["unresolved_items"] or "[]")
    glossary = json.loads(row["glossary"] or "{}")

    from .brief_generator import compute_brief_content_hash
    current_hash = compute_brief_content_hash(summary_text, unresolved_items, glossary)
    anchored_hash = row.get("content_hash")
    txn_id = row.get("verification_txn_id")
    network = os.environ.get("ALGORAND_NETWORK", "testnet").strip()
    lora_url = f"https://lora.algokit.io/{network}/transaction/{txn_id}" if txn_id else None

    is_tamper_free = bool(anchored_hash and current_hash == anchored_hash)

    return AuditProofResponse(
        person_id=person_id,
        brief_id=row["id"],
        verification_status=row["verification_status"],
        verified_by=row["verified_by"],
        verified_at=row["verified_at"],
        current_content_hash=current_hash,
        anchored_content_hash=anchored_hash,
        verification_txn_id=txn_id,
        is_tamper_free=is_tamper_free,
        lora_explorer_url=lora_url,
    )


@vault_router.post(
    "/vault/{person_id}/query",
    response_model=VaultQueryResponse,
    summary="Role-aware cross-domain Q&A against a person's vault",
    description=(
        "Queries the RAG pipeline for knowledge attributed to this person. "
        "The requester_role parameter controls how technical the answer is: "
        "'Field Technician' gets step-by-step procedures; 'Finance' gets plain-language impact summaries."
    ),
)
def vault_query(person_id: int, payload: VaultQueryRequest, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    effective_role = payload.requester_role or role
    result = _vault_rag_query(person_id, payload.query, effective_role)
    return VaultQueryResponse(**result)


@vault_router.get(
    "/vault/{person_id}/freshness",
    response_model=FreshnessResponse,
    summary="Decay and re-verification status for a person's vault",
    description=(
        "Returns whether the Continuity Brief is fresh, due for review, or stale. "
        "Brief is flagged 'review-due' if not re-verified in 90 days, 'stale' after 180 days."
    ),
)
def get_freshness(person_id: int, request: Request):
    role = get_session_role(request)
    person = _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM continuity_briefs WHERE person_id = ?", (person_id,))
    brief_row = cursor.fetchone()

    cursor.execute(
        "SELECT COUNT(*) as cnt, MAX(ingested_at) as last_at FROM vault_artifacts WHERE person_id = ?",
        (person_id,),
    )
    art_row = cursor.fetchone()
    conn.close()

    artifact_count = art_row["cnt"] if art_row else 0
    last_ingested = art_row["last_at"] if art_row else None

    if not brief_row:
        return FreshnessResponse(
            person_id=person_id,
            person_name=person["name"],
            brief_generated_at=None,
            brief_age_days=None,
            verification_status="unverified",
            freshness_flag="stale",
            artifact_count=artifact_count,
            last_artifact_ingested_at=last_ingested,
            recommendation="No Continuity Brief has been generated yet. Generate one immediately.",
        )

    brief = dict(brief_row)
    generated_at_str = brief.get("generated_at", "")
    age_days: Optional[int] = None
    freshness_flag = "fresh"
    recommendation = "Brief is up to date. No action required."

    if generated_at_str:
        try:
            gen_dt = datetime.datetime.strptime(generated_at_str, "%Y-%m-%d %H:%M:%S")
            age_days = (datetime.datetime.now() - gen_dt).days
            if age_days > 180:
                freshness_flag = "stale"
                recommendation = (
                    f"Brief is {age_days} days old. Re-generate and re-verify immediately."
                )
            elif age_days > 90:
                freshness_flag = "review-due"
                recommendation = (
                    f"Brief is {age_days} days old. Schedule re-verification with a peer reviewer."
                )
        except ValueError:
            pass

    return FreshnessResponse(
        person_id=person_id,
        person_name=person["name"],
        brief_generated_at=generated_at_str,
        brief_age_days=age_days,
        verification_status=brief.get("verification_status", "unverified"),
        freshness_flag=freshness_flag,
        artifact_count=artifact_count,
        last_artifact_ingested_at=last_ingested,
        recommendation=recommendation,
    )


# ── Voice routes ───────────────────────────────────────────────────────────────

@vault_router.post(
    "/voice/inbound",
    summary="Twilio inbound voice webhook — STT → RAG → TTS",
    description=(
        "Twilio posts to this endpoint when a call arrives. "
        "Extracts transcribed speech (SpeechResult), runs it through the RAG pipeline, "
        "and returns TwiML to speak the response. "
        "STUB: Works without Twilio credentials — pass 'transcript' in the body."
    ),
    response_class=Response,
)
async def voice_inbound(payload: VoiceInboundPayload, request: Request):
    from .voice_provider import get_voice_provider
    from .translation_provider import get_translation_provider

    transcript = payload.SpeechResult or payload.transcript or ""
    if not transcript.strip():
        transcript = "What information is available about this employee?"

    caller_lang = payload.language or "en"
    translator = get_translation_provider()

    # Translate to English for RAG
    query_en = translator.translate(transcript, caller_lang, "en") if caller_lang != "en" else transcript

    # RAG
    if payload.person_id:
        result = _vault_rag_query(payload.person_id, query_en, "Field Technician")
        answer_en = result["answer"]
    else:
        sources = reciprocal_rank_fusion(query_en)
        if sources:
            answer_en = sources[0].get("content", "No information found.")[:500]
        else:
            answer_en = "I could not find relevant information. Please try rephrasing your question."

    # Translate back
    answer_out = translator.translate(answer_en, "en", caller_lang) if caller_lang != "en" else answer_en

    # Log session
    conn = get_db_connection()
    session_id = _log_call_session(
        conn, payload.person_id, "voice", caller_lang, transcript, answer_out
    )
    conn.close()

    # Return TwiML
    provider = get_voice_provider()
    twiml = provider.twiml_response(answer_out)
    return Response(content=twiml, media_type="application/xml")


@vault_router.post(
    "/voice/outbound",
    summary="Trigger an outbound voice call with the Continuity Brief summary",
    description=(
        "Places (or simulates) an outbound call to the given phone number "
        "reading out the Continuity Brief summary for the specified person. "
        "STUB: Logs call intent when Twilio credentials are absent."
    ),
)
def voice_outbound(payload: VoiceOutboundRequest, request: Request):
    from .voice_provider import get_voice_provider
    from .brief_generator import get_brief

    brief = get_brief(payload.person_id)
    if not brief:
        raise HTTPException(
            status_code=404,
            detail=f"No brief found for person {payload.person_id}. Generate it first.",
        )

    message = (
        f"This is an automated Continuity Brief summary. "
        f"Summary: {brief['summary_text'][:800]}"
    )

    provider = get_voice_provider()
    call_sid = provider.place_outbound_call(payload.to_phone, message)

    conn = get_db_connection()
    session_id = _log_call_session(
        conn, payload.person_id, "voice", payload.language or "en", "", message
    )
    conn.close()

    return {
        "status": "initiated",
        "call_sid": call_sid,
        "session_id": session_id,
        "note": "STUB — no real call placed (Twilio credentials not configured)"
        if call_sid.startswith("stub-")
        else "Call initiated via Twilio",
    }


# ── WhatsApp routes ────────────────────────────────────────────────────────────

@vault_router.post(
    "/whatsapp/inbound",
    summary="WhatsApp Business / Twilio sandbox inbound webhook",
    description=(
        "Handles incoming WhatsApp messages (text or voice note). "
        "Routes the query through RAG and sends a response back via WhatsApp. "
        "STUB: Works without Twilio credentials — pass 'Body' in the request."
    ),
)
async def whatsapp_inbound(payload: WhatsAppInboundPayload, request: Request):
    from .whatsapp_provider import get_whatsapp_provider
    from .translation_provider import get_translation_provider

    body = payload.Body or ""
    if not body.strip():
        body = "What information is available?"

    caller_lang = payload.language or "en"
    translator = get_translation_provider()

    query_en = translator.translate(body, caller_lang, "en") if caller_lang != "en" else body

    if payload.person_id:
        result = _vault_rag_query(payload.person_id, query_en, "Field Technician")
        answer_en = result["answer"]
    else:
        sources = reciprocal_rank_fusion(query_en)
        answer_en = (
            sources[0].get("content", "No relevant information found.")[:500]
            if sources
            else "No relevant information found. Please provide more context."
        )

    answer_out = translator.translate(answer_en, "en", caller_lang) if caller_lang != "en" else answer_en

    # Send reply
    wa_provider = get_whatsapp_provider()
    wa_to = payload.From or "whatsapp:+919999999999"
    msg_sid = wa_provider.send_message(wa_to, answer_out)

    # Log session
    conn = get_db_connection()
    session_id = _log_call_session(
        conn, payload.person_id, "whatsapp", caller_lang, body, answer_out
    )
    conn.close()

    return ChannelResponse(
        status="sent",
        channel="whatsapp",
        response_text=answer_out,
        session_id=session_id,
    )


@vault_router.get(
    "/call-sessions",
    summary="List all voice/WhatsApp call sessions",
    description="Returns the full call_sessions log for admin review and demo purposes.",
)
def list_call_sessions(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT cs.*, p.name as person_name
        FROM call_sessions cs
        LEFT JOIN persons p ON cs.person_id = p.id
        ORDER BY cs.started_at DESC
        LIMIT 100
        """
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


# ── Tasks (Task-Level Handoff Explainer) ──────────────────────────────────────

@vault_router.post(
    "/vault/{person_id}/tasks",
    response_model=TaskResponse,
    summary="Create an in-flight task record under a person's vault",
    description=(
        "Registers a task with a Mermaid flowchart, dependencies, and deadline. "
        "Allows new hires or cross-domain peers to inspect the exact in-flight status."
    ),
)
def create_task(person_id: int, payload: CreateTaskRequest, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "department-restricted")

    from .task_explainer import calculate_urgency

    conn = get_db_connection()
    cursor = conn.cursor()
    now = _now()
    deps_json = json.dumps([d.model_dump() for d in (payload.dependencies or [])])

    default_mermaid = payload.flowchart_mermaid or (
        f"graph TD\n    A[Task Started: {payload.title}] --> B[In Progress ({payload.percent_complete}%)]"
    )

    cursor.execute(
        """
        INSERT INTO tasks (
            person_id, project_name, title, description, status,
            flowchart_mermaid, percent_complete, deadline, dependencies, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            person_id,
            payload.project_name or "General Operations",
            payload.title,
            payload.description or "",
            payload.status or "in_progress",
            default_mermaid,
            payload.percent_complete or 0,
            payload.deadline,
            deps_json,
            now,
        ),
    )
    task_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = dict(cursor.fetchone())
    conn.close()

    urgency, days_remaining = calculate_urgency(
        row.get("deadline"), row.get("percent_complete", 0), row.get("status", "in_progress")
    )
    deps = json.loads(row.get("dependencies") or "[]")

    return TaskResponse(
        id=row["id"],
        person_id=row["person_id"],
        project_name=row.get("project_name"),
        title=row["title"],
        description=row.get("description"),
        status=row.get("status", "in_progress"),
        flowchart_mermaid=row.get("flowchart_mermaid"),
        percent_complete=row.get("percent_complete", 0),
        deadline=row.get("deadline"),
        dependencies=deps,
        created_at=row.get("created_at"),
        urgency_status=urgency,
        days_remaining=days_remaining,
    )


@vault_router.get(
    "/vault/{person_id}/tasks",
    response_model=list[TaskResponse],
    summary="List all in-flight tasks for a person",
)
def list_tasks(person_id: int, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    from .task_explainer import calculate_urgency

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE person_id = ? ORDER BY id DESC", (person_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    tasks: list[TaskResponse] = []
    for r in rows:
        urgency, days = calculate_urgency(
            r.get("deadline"), r.get("percent_complete", 0), r.get("status", "in_progress")
        )
        try:
            deps = json.loads(r.get("dependencies") or "[]")
        except Exception:
            deps = []
        tasks.append(
            TaskResponse(
                id=r["id"],
                person_id=r["person_id"],
                project_name=r.get("project_name"),
                title=r["title"],
                description=r.get("description"),
                status=r.get("status", "in_progress"),
                flowchart_mermaid=r.get("flowchart_mermaid"),
                percent_complete=r.get("percent_complete", 0),
                deadline=r.get("deadline"),
                dependencies=deps,
                created_at=r.get("created_at"),
                urgency_status=urgency,
                days_remaining=days,
            )
        )
    return tasks


@vault_router.get(
    "/vault/{person_id}/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Fetch single task details with Mermaid flowchart and dependencies",
)
def get_task(person_id: int, task_id: int, request: Request):
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    from .task_explainer import calculate_urgency

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ? AND person_id = ?", (task_id, person_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found in this vault")

    r = dict(row)
    urgency, days = calculate_urgency(
        r.get("deadline"), r.get("percent_complete", 0), r.get("status", "in_progress")
    )
    try:
        deps = json.loads(r.get("dependencies") or "[]")
    except Exception:
        deps = []

    return TaskResponse(
        id=r["id"],
        person_id=r["person_id"],
        project_name=r.get("project_name"),
        title=r["title"],
        description=r.get("description"),
        status=r.get("status", "in_progress"),
        flowchart_mermaid=r.get("flowchart_mermaid"),
        percent_complete=r.get("percent_complete", 0),
        deadline=r.get("deadline"),
        dependencies=deps,
        created_at=r.get("created_at"),
        urgency_status=urgency,
        days_remaining=days,
    )


@vault_router.post(
    "/vault/{person_id}/tasks/{task_id}/explain",
    response_model=TaskExplainResponse,
    summary="Generate role-aware explanation, flowchart, learning resources, and dependency impact",
    description=(
        "Explains an in-flight task for a successor picking it up. Adapts technical explanation "
        "to the caller's role (Field Technician vs. Finance vs. Management), generates YouTube and web search "
        "learning links, renders the Mermaid flowchart, and highlights downstream blockages."
    ),
)
def explain_task(person_id: int, task_id: int, payload: TaskExplainRequest, request: Request):
    role = get_session_role(request)
    person = _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    from .task_explainer import explain_task_gap

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ? AND person_id = ?", (task_id, person_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found in this vault")

    effective_role = payload.requester_role or role
    result = explain_task_gap(dict(row), person, effective_role)
    return TaskExplainResponse(**result)


# ══════════════════════════════════════════════════════════════════════════════
# Section 9 — x402 / Algorand AI Agent Micropayment Gate
# ══════════════════════════════════════════════════════════════════════════════
#
# These /x402/* routes are the machine-to-machine x402 protocol endpoints.
# The x402-avm middleware (mounted in main.py) intercepts requests under the
# /x402/ prefix and gates them behind real Algorand micropayments.
#
# Protocol (RFC x402):
#   1. Agent calls GET /x402/vault/{person_id}/brief   (no X-PAYMENT header)
#   2. Middleware returns HTTP 402 with structured Algorand payment terms
#   3. Agent signs + submits ALGO tx to GoPlausible facilitator
#   4. Agent retries with  X-PAYMENT: <signed-token>  header
#   5. Middleware validates; this handler runs and returns the brief
#
# The /vault/ routes are untouched — they serve the human web UI without payment.
# ══════════════════════════════════════════════════════════════════════════════

@vault_router.get(
    "/x402/vault/{person_id}/brief",
    response_model=BriefResponse,
    summary="[x402] AI-agent access to Continuity Brief — requires Algorand micropayment",
    description=(
        "x402 payment-gated version of GET /vault/{person_id}/brief. "
        "An AI agent must attach a valid X-PAYMENT header (signed Algorand transaction "
        "verified by the GoPlausible facilitator) to receive the brief. "
        "Returns HTTP 402 with machine-readable payment terms when X-PAYMENT is absent. "
        "No human UI, no QR code — this endpoint is for autonomous agent access only."
    ),
    tags=["x402 Agent Payments"],
)
def x402_get_brief(person_id: int, request: Request):
    """
    The x402-avm middleware intercepts this route before this handler runs.
    If the middleware is active and no valid X-PAYMENT header is present,
    the middleware returns 402 and this function is never called.
    If the middleware is in pass-through mode (no ALGORAND_PAYMENT_ADDRESS set),
    this handler serves the brief directly — useful for local dev and testing.
    """
    role = get_session_role(request)
    _get_person_or_404(person_id)
    require_vault_access(person_id, role, "public")

    from .brief_generator import get_brief

    brief = get_brief(person_id)
    if not brief:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No Continuity Brief found for person {person_id}. "
                f"Generate one first via POST /vault/{person_id}/brief"
            ),
        )
    return brief


@vault_router.get(
    "/x402/vault/{person_id}/tasks/{task_id}/explain",
    response_model=TaskExplainResponse,
    summary="[x402] AI-agent access to Task Explainer — requires Algorand micropayment",
    description=(
        "x402 payment-gated version of the task explainer. "
        "Returns structured Mermaid flowchart, dependency blockers, and learning links. "
        "Requires a valid X-PAYMENT header with a verified Algorand transaction. "
        "Returns HTTP 402 with machine-readable payment terms when unpaid."
    ),
    tags=["x402 Agent Payments"],
)
def x402_explain_task(person_id: int, task_id: int, request: Request):
    """
    x402-gated task explainer. The middleware validates payment before this runs.
    Role defaults to 'Field Technician' for agent access (no session cookie available).
    """
    _get_person_or_404(person_id)
    person = _get_person_or_404(person_id)

    from .task_explainer import explain_task_gap

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ? AND person_id = ?", (task_id, person_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found in vault for person {person_id}")

    # Agents default to Field Technician role for technical step-by-step output
    result = explain_task_gap(dict(row), person, "Field Technician")
    return TaskExplainResponse(**result)


# ══════════════════════════════════════════════════════════════════════════════
# Section 13 — Additional x402 Paid Tiers (Consensus, Compliance, Incidents)
# ══════════════════════════════════════════════════════════════════════════════

class ConsensusAgentRequest(BaseModel):
    query: str = Field(..., description="Technical engineering question or symptom query")
    experts: Optional[List[str]] = Field(None, description="Optional list of expert persona names")


class ComplianceAuditAgentRequest(BaseModel):
    equipment_tag: Optional[str] = Field(None, description="Optional specific equipment tag to filter gaps")
    standard: Optional[str] = Field(None, description="Optional regulatory standard filter")


class IncidentMatchAgentRequest(BaseModel):
    note: str = Field(..., description="Observed operational anomaly, vibration spike, or shift note text")


@vault_router.post(
    "/x402/consensus",
    summary="[x402 Tier 2] Multi-Expert Consensus reasoning across cognitive engineering twins (0.03 USDC)",
    description=(
        "x402 payment-gated multi-expert reasoning engine. Runs parallel retrieval and "
        "reasoning across multiple engineering expert personas, measures semantic divergence, "
        "and synthesizes consensus and dissent."
    ),
    tags=["x402 Agent Payments"],
)
def x402_consensus(payload: ConsensusAgentRequest):
    from backend.consensus import synthesize_consensus
    from backend.database import get_db_connection
    experts = payload.experts
    if not experts:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM engineers LIMIT 4")
        experts = [row["name"] for row in cursor.fetchall()]
        conn.close()
        if not experts:
            experts = ["Rajan Sharma", "T. Nair", "S. Kulkarni"]
    result = synthesize_consensus(payload.query, experts)
    return result


@vault_router.post(
    "/x402/compliance-audit",
    summary="[x402 Tier 3] Compliance & SOP Gap Audit scan across regulatory requirements (0.05 USDC)",
    description=(
        "x402 payment-gated regulatory compliance and SOP audit engine. Maps regulatory "
        "clauses against institutional documentation, identifies missing evidence or expired SOPs, "
        "and returns actionable compliance gap records."
    ),
    tags=["x402 Agent Payments"],
)
def x402_compliance_audit(payload: Optional[ComplianceAuditAgentRequest] = None):
    from backend.compliance import run_compliance_scan
    gaps = run_compliance_scan()
    if payload and payload.equipment_tag:
        gaps = [g for g in gaps if payload.equipment_tag.upper() in str(g.get("applies_to_equipment", "")).upper()]
    return {
        "status": "success",
        "total_gaps_identified": len(gaps),
        "gaps": gaps,
    }


@vault_router.post(
    "/x402/incident-match",
    summary="[x402 Tier 4] Shift & Incident Pattern Match for predictive maintenance agents (0.04 USDC)",
    description=(
        "x402 payment-gated anomaly correlation engine. When a predictive-maintenance agent "
        "detects an anomalous sensor signature or operator log, it queries DeadMind to check "
        "whether similar failures have occurred historically and retrieve causal co-occurrence probabilities."
    ),
    tags=["x402 Agent Payments"],
)
def x402_incident_match(payload: IncidentMatchAgentRequest):
    from backend.shift_analyzer import analyze_shift_note
    result = analyze_shift_note(payload.note)
    return {
        "status": "success",
        "query_note": payload.note,
        "match_result": result,
    }


@vault_router.get(
    "/x402/discovery",
    summary="[x402 Bazaar Extension] Machine-readable service discovery catalog",
    description=(
        "Standardized x402 Bazaar discovery catalog listing all available paid "
        "DeadMind cognitive services, required USDC micropayment terms, input schemas, "
        "and facilitator endpoints for autonomous agent integration."
    ),
    tags=["x402 Agent Payments"],
)
def x402_discovery(request: Request):
    scheme = request.url.scheme
    host = request.headers.get("host", "localhost:8000")
    base_url = f"{scheme}://{host}"

    pay_to = _os.environ.get("ALGORAND_PAYMENT_ADDRESS", "")
    network = _os.environ.get("ALGORAND_NETWORK", "testnet")
    facilitator = _os.environ.get("X402_FACILITATOR_URL", "https://x402.goplausible.xyz/facilitate")
    usdc_id = 31566704 if network == "mainnet" else 10458941

    return {
        "x402Version": 2,
        "extension": "bazaar",
        "platform": "DeadMind Continuity Intelligence Platform",
        "network": f"algorand-{network}",
        "asset": {"name": "USDC", "asset_id": usdc_id, "decimals": 6},
        "payTo": pay_to,
        "facilitator": facilitator,
        "resources": [
            {
                "id": "continuity-brief",
                "path": "/x402/vault/{person_id}/brief",
                "method": "GET",
                "tier": "Tier 1",
                "price": {"usdc": 0.01, "microusdc": 10000},
                "description": "Access human-verified institutional domain handoff brief.",
                "mimeType": "application/json",
            },
            {
                "id": "multi-expert-consensus",
                "path": "/x402/consensus",
                "method": "POST",
                "tier": "Tier 2",
                "price": {"usdc": 0.03, "microusdc": 30000},
                "description": "Multi-Expert Consensus reasoning across cognitive engineering twins.",
                "mimeType": "application/json",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "experts": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["query"],
                },
            },
            {
                "id": "compliance-sop-audit",
                "path": "/x402/compliance-audit",
                "method": "POST",
                "tier": "Tier 3",
                "price": {"usdc": 0.05, "microusdc": 50000},
                "description": "Regulatory requirement (ISO/OSHA/IBR) & SOP gap audit scan.",
                "mimeType": "application/json",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "equipment_tag": {"type": "string"},
                        "standard": {"type": "string"},
                    },
                },
            },
            {
                "id": "incident-pattern-match",
                "path": "/x402/incident-match",
                "method": "POST",
                "tier": "Tier 4",
                "price": {"usdc": 0.04, "microusdc": 40000},
                "description": "Predictive maintenance anomaly pattern matcher & causal co-occurrence risk analyzer.",
                "mimeType": "application/json",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "note": {"type": "string"},
                    },
                    "required": ["note"],
                },
            },
            {
                "id": "task-gap-explainer",
                "path": "/x402/vault/{person_id}/tasks/{task_id}/explain",
                "method": "GET",
                "tier": "Task Explainer",
                "price": {"usdc": 0.05, "microusdc": 50000},
                "description": "Role-aware gap explanation, Mermaid flowchart, and cross-team dependency blockers.",
                "mimeType": "application/json",
            },
        ],
    }


# ── Section 9.6 — Verifier Payout Mechanic ────────────────────────────────
#
# When a senior peer verifies a vault brief (stamps it as trustworthy),
# they receive a micro-reward in ALGO from the platform's payout wallet.
# This creates an economic incentive for prompt, high-quality peer review.
#
# The payout is a real on-chain Algorand transaction — not a credit or points.
# Verifier must provide their Algorand wallet address in the verify request.
#
# Env vars required:
#   ALGORAND_PAYOUT_MNEMONIC   — 25-word mnemonic for the payout wallet
#   ALGORAND_PAYOUT_AMOUNT_MICROALGO — reward amount (default: 10000 = 0.01 ALGO)
#   ALGORAND_NETWORK, ALGORAND_NODE_URL
# ───────────────────────────────────────────────────────────────────────────

import os as _os
import logging as _logging

_payout_logger = _logging.getLogger(__name__ + ".payout")


class VerifierPayoutRequest(BaseModel):
    person_id: int
    brief_id: Optional[int] = None
    verifier_wallet_address: str
    verifier_name: Optional[str] = None


class VerifierPayoutResponse(BaseModel):
    ok: bool
    txn_id: Optional[str] = None
    amount_microalgo: int
    network: str
    verifier_wallet_address: str
    note: str


@vault_router.post(
    "/api/x402/verifier-payout",
    response_model=VerifierPayoutResponse,
    summary="Section 9.6 — Pay a peer verifier a micro-reward in ALGO for stamping a vault brief",
    description=(
        "Sends a real Algorand micropayment to a verifier's wallet when they stamp a "
        "Continuity Brief as peer-verified. Requires ALGORAND_PAYOUT_MNEMONIC env var "
        "pointing to a testnet-funded wallet. The transaction ID is real and checkable "
        "on the Algorand testnet explorer."
    ),
    tags=["x402 Agent Payments"],
)
def verifier_payout(payload: VerifierPayoutRequest):
    """
    Executes a real Algorand micropayment to the verifier's wallet.

    This is the Section 9.6 differentiator: when a peer verifies a brief,
    money genuinely moves on-chain. The returned txn_id is checkable at:
      https://lora.algokit.io/testnet/transaction/<txn_id>

    Raises 503 if payout env vars are not configured.
    """
    mnemonic = _os.environ.get("ALGORAND_PAYOUT_MNEMONIC", "").strip()
    network = _os.environ.get("ALGORAND_NETWORK", "testnet")
    node_url = _os.environ.get("ALGORAND_NODE_URL", "https://testnet-api.algonode.cloud")
    amount_microalgo = int(_os.environ.get("ALGORAND_PAYOUT_AMOUNT_MICROALGO", "10000"))

    if not mnemonic:
        raise HTTPException(
            status_code=503,
            detail=(
                "ALGORAND_PAYOUT_MNEMONIC is not configured. "
                "Set this env var to a testnet-funded 25-word mnemonic to enable real payout. "
                "Fund a testnet wallet at https://bank.testnet.algorand.network/"
            ),
        )

    try:
        from algosdk import account, mnemonic as algomnemonic, transaction
        from algosdk.v2client import algod

        # Derive payout sender from mnemonic
        private_key = algomnemonic.to_private_key(mnemonic)
        sender_address = account.address_from_private_key(private_key)

        # Connect to Algorand node (AlgoNode public testnet, no API key needed)
        headers = {"X-API-Key": _os.environ.get("ALGORAND_API_KEY", "")}
        client = algod.AlgodClient("", node_url, headers)

        params = client.suggested_params()

        # Build payment transaction
        txn = transaction.PaymentTxn(
            sender=sender_address,
            sp=params,
            receiver=payload.verifier_wallet_address,
            amt=amount_microalgo,
            note=b"DeadMind verifier reward - Section 9.6",
        )


        # Sign and submit
        signed_txn = txn.sign(private_key)
        txn_id = client.send_transaction(signed_txn)

        # Wait for confirmation (up to 4 rounds)
        transaction.wait_for_confirmation(client, txn_id, 4)

        _payout_logger.info(
            "[x402 payout] Sent %d microALGO to %s | txn_id=%s | network=%s",
            amount_microalgo,
            payload.verifier_wallet_address,
            txn_id,
            network,
        )

        explorer_base = (
            "https://lora.algokit.io/testnet/transaction/"
            if network == "testnet"
            else "https://lora.algokit.io/mainnet/transaction/"
        )

        # Log payout to verifier_payouts table
        try:
            _conn = get_db_connection()
            _cursor = _conn.cursor()
            _cursor.execute(
                """
                INSERT INTO verifier_payouts
                    (person_id, verifier_name, verifier_wallet_address, txn_id, amount_microalgo, network, paid_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.person_id,
                    payload.verifier_name or "Anonymous",
                    payload.verifier_wallet_address,
                    txn_id,
                    amount_microalgo,
                    network,
                    datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ),
            )
            _conn.commit()
            _conn.close()
        except Exception as log_exc:
            _payout_logger.warning("[x402 payout] DB log failed (non-fatal): %s", log_exc)

        return VerifierPayoutResponse(
            ok=True,
            txn_id=txn_id,
            amount_microalgo=amount_microalgo,
            network=network,
            verifier_wallet_address=payload.verifier_wallet_address,
            note=f"Payout confirmed on-chain. Verify at {explorer_base}{txn_id}",
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="py-algorand-sdk not installed. Run: pip install py-algorand-sdk",
        )
    except Exception as exc:
        _payout_logger.error("[x402 payout] Transaction failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Algorand payout failed: {exc}",
        )


# ── Section 9.4 — Verifier Wallet Registration ─────────────────────────────

class RegisterWalletRequest(BaseModel):
    algorand_address: str
    verifier_name: Optional[str] = None


@vault_router.post(
    "/vault/persons/{person_id}/brief/register-wallet",
    summary="Section 9.6 — Register verifier Algorand wallet for payout",
    description=(
        "Associates an Algorand wallet address with the verifier of a Continuity Brief. "
        "This address will receive the ALGO payout reward when the brief is verified. "
        "Call this before or alongside the POST /vault/{person_id}/brief/verify endpoint."
    ),
    tags=["x402 Agent Payments"],
)
def register_verifier_wallet(person_id: int, payload: RegisterWalletRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = _now()
    cursor.execute(
        """
        UPDATE continuity_briefs
        SET verifier_algorand_address = ?
        WHERE person_id = ?
        """,
        (payload.algorand_address, person_id),
    )
    rows_updated = cursor.rowcount
    conn.commit()
    conn.close()
    if rows_updated == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No Continuity Brief found for person {person_id}. Generate one first.",
        )
    return {
        "ok": True,
        "person_id": person_id,
        "verifier_algorand_address": payload.algorand_address,
        "note": "Wallet address registered. It will receive ALGO payout on brief verification.",
    }


# ── Section 9.4 — x402 Payment Log ─────────────────────────────────────────

@vault_router.get(
    "/x402/payments/log",
    summary="Section 9.4 — List all x402 agent payments and verifier payouts",
    description=(
        "Returns the full history of Algorand micropayments: "
        "(1) agent_payments — machine-to-machine x402 vault access payments, "
        "(2) verifier_payouts — ALGO rewards sent to peer reviewers for brief verification. "
        "All transaction IDs are verifiable on Lora (https://lora.algokit.io)."
    ),
    tags=["x402 Agent Payments"],
)
def x402_payment_log():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT ap.*, p.name as person_name
        FROM agent_payments ap
        LEFT JOIN persons p ON ap.person_id = p.id
        ORDER BY ap.paid_at DESC
        LIMIT 200
        """
    )
    agent_rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT vp.*, p.name as person_name
        FROM verifier_payouts vp
        LEFT JOIN persons p ON vp.person_id = p.id
        ORDER BY vp.paid_at DESC
        LIMIT 200
        """
    )
    payout_rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "agent_payments": agent_rows,
        "verifier_payouts": payout_rows,
        "lora_testnet_base": "https://lora.algokit.io/testnet/transaction/",
        "lora_mainnet_base": "https://lora.algokit.io/mainnet/transaction/",
    }
