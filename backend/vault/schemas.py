"""
Pydantic request/response schemas for the Continuity Intelligence Platform.

All schema classes are grouped here so routes.py stays readable
and the FastAPI auto-generated OpenAPI docs have correct field descriptions.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import datetime


# ── Person ────────────────────────────────────────────────────────────────────

class CreatePersonRequest(BaseModel):
    name: str = Field(..., description="Full name of the employee")
    role: str = Field(..., description="Job title / role")
    domain: str = Field(..., description="Knowledge domain, e.g. 'Mechanical / Steam Systems'")
    department: str = Field(..., description="Organisational department")
    exit_date: str = Field(..., description="Departure date in YYYY-MM-DD format")
    exit_reason: str = Field(
        ...,
        description="One of: retirement, resignation, transfer, death",
    )
    status: str = Field("departed", description="'active' or 'departed'")


class PersonResponse(BaseModel):
    id: int
    name: str
    role: str
    domain: str
    department: str
    status: str
    exit_date: Optional[str]
    exit_reason: Optional[str]
    created_at: Optional[str]


# ── Git Ingestion ─────────────────────────────────────────────────────────────

class GitIngestRequest(BaseModel):
    repo_url: str = Field(
        ...,
        description="GitHub repository URL, e.g. https://github.com/org/repo",
    )
    contributor_login: Optional[str] = Field(
        None,
        description="GitHub username of the contributor. If omitted, all commits are ingested.",
    )
    max_commits: int = Field(
        50,
        description="Maximum number of commits to fetch (default 50).",
    )
    sensitivity_level: str = Field(
        "department-restricted",
        description="One of: public, department-restricted, confidential",
    )


class GitIngestResponse(BaseModel):
    status: str
    artifacts_created: int
    note: str


# ── PPTX / Doc Ingestion ──────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    status: str
    artifact_id: int
    artifact_type: str
    plain_language_summary: str
    doc_id: Optional[int] = Field(None, description="RAG document id if indexed")


# ── Continuity Brief ──────────────────────────────────────────────────────────

class GenerateBriefRequest(BaseModel):
    requester_role: Optional[str] = Field(
        "Admin",
        description="Role of the person requesting the brief; controls plain-language adaptation.",
    )


class BriefResponse(BaseModel):
    id: int
    person_id: int
    generated_at: str
    summary_text: str
    unresolved_items: List[str]
    glossary: Dict[str, str]
    verification_status: str
    verified_by: Optional[str]
    verified_at: Optional[str]


class VerifyBriefRequest(BaseModel):
    verifier_name: str = Field(..., description="Name of the peer reviewer / verifier")
    notes: Optional[str] = Field(None, description="Optional corrections or comments")


class VerifyBriefResponse(BaseModel):
    status: str
    verified_by: str
    verified_at: str


# ── Cross-domain Query ────────────────────────────────────────────────────────

class VaultQueryRequest(BaseModel):
    query: str = Field(..., description="Natural-language question about the person's knowledge domain")
    requester_role: str = Field(
        "Admin",
        description=(
            "Role of the person asking. Controls how technical the answer is. "
            "E.g. 'Field Technician' gets step-by-step; 'Finance' gets plain-language impact summary."
        ),
    )


class VaultQueryResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]
    confidence: int
    role_adaptation_note: str


# ── Voice / WhatsApp ──────────────────────────────────────────────────────────

class VoiceInboundPayload(BaseModel):
    """
    Mirrors Twilio's inbound voice webhook POST fields we care about.
    In stub mode, any string is accepted.
    """
    CallSid: Optional[str] = Field(None, description="Twilio call SID")
    From: Optional[str] = Field(None, description="Caller phone number")
    SpeechResult: Optional[str] = Field(
        None,
        description="Transcribed speech from Twilio Gather verb",
    )
    transcript: Optional[str] = Field(
        None,
        description="Pre-transcribed text (used in stub / test mode when SpeechResult is absent)",
    )
    person_id: Optional[int] = Field(
        None, description="If known, the vault person this call relates to"
    )
    language: Optional[str] = Field("en", description="BCP-47 language code of the caller")


class VoiceOutboundRequest(BaseModel):
    person_id: int = Field(..., description="Vault person whose brief will be read out")
    to_phone: str = Field(..., description="E.164 phone number to call, e.g. +919876543210")
    language: Optional[str] = Field("en", description="BCP-47 language code for TTS")


class WhatsAppInboundPayload(BaseModel):
    """
    Mirrors Twilio WhatsApp webhook POST fields we care about.
    """
    From: Optional[str] = Field(None, description="Sender WhatsApp number (whatsapp:+91...)")
    Body: Optional[str] = Field(None, description="Text message body")
    MediaUrl0: Optional[str] = Field(None, description="URL of voice note if sent")
    person_id: Optional[int] = Field(
        None, description="If known, the vault person this message relates to"
    )
    language: Optional[str] = Field("en")


class ChannelResponse(BaseModel):
    status: str
    channel: str
    response_text: str
    session_id: int


# ── Freshness ─────────────────────────────────────────────────────────────────

class FreshnessResponse(BaseModel):
    person_id: int
    person_name: str
    brief_generated_at: Optional[str]
    brief_age_days: Optional[int]
    verification_status: str
    freshness_flag: str  # 'fresh', 'review-due', 'stale'
    artifact_count: int
    last_artifact_ingested_at: Optional[str]
    recommendation: str


# ── Tasks (Task-Level Handoff Explainer) ──────────────────────────────────────

class TaskDependency(BaseModel):
    domain: str = Field(..., description="Knowledge domain or discipline")
    team: str = Field(..., description="Team or person responsible")
    relationship: str = Field(..., description="'blocks' or 'blocked_by'")
    note: Optional[str] = Field(None, description="Context on the dependency")


class CreateTaskRequest(BaseModel):
    project_name: Optional[str] = Field(None, description="Project or initiative name")
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(None, description="Task details and handoff notes")
    status: Optional[str] = Field("in_progress", description="'done', 'in_progress', 'blocked'")
    flowchart_mermaid: Optional[str] = Field(None, description="Mermaid flowchart definition")
    percent_complete: Optional[int] = Field(0, ge=0, le=100, description="Percentage completed (0-100)")
    deadline: Optional[str] = Field(None, description="Deadline in YYYY-MM-DD format")
    dependencies: Optional[List[TaskDependency]] = Field(default_factory=list, description="Cross-domain dependencies")


class TaskResponse(BaseModel):
    id: int
    person_id: int
    project_name: Optional[str]
    title: str
    description: Optional[str]
    status: str
    flowchart_mermaid: Optional[str]
    percent_complete: int
    deadline: Optional[str]
    dependencies: List[Dict[str, Any]]
    created_at: Optional[str]
    urgency_status: Optional[str] = Field("on_track", description="'on_track', 'at_risk', 'overdue'")
    days_remaining: Optional[int] = None


class LearningResource(BaseModel):
    topic: str
    type: str  # 'youtube' or 'web'
    search_query: str
    url: str
    description: str


class TaskExplainRequest(BaseModel):
    requester_role: Optional[str] = Field(
        "Field Technician",
        description="Role of the new owner picking up the task (controls explanation framing)",
    )


class TaskExplainResponse(BaseModel):
    task_id: int
    title: str
    project_name: Optional[str]
    requester_role: str
    status: str
    percent_complete: int
    urgency_status: str
    days_remaining: Optional[int]
    gap_explanation: str
    flowchart_mermaid: Optional[str]
    dependencies: List[Dict[str, Any]]
    learning_resources: List[LearningResource]
    citations: List[Dict[str, Any]]
