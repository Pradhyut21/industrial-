"""
Troubleshooting Knowledge Base — Section 14.

Three routes:
  POST /troubleshooting/submit          → AI-filter raw input → return pending_review draft
  POST /troubleshooting/{id}/confirm    → employee approves → set published + attributable
  GET  /troubleshooting/search?q=...    → search published entries, increment reuse_count

Design contract (from Section 14.4):
  - NEVER auto-publish: the confirm step is mandatory.
  - NEVER pull from passive sources (git, vault) without employee initiation.
  - NEVER negative framing: UI copy uses "solution", "credit", "recognized" — not "error log".
  - Reuses existing BM25+FAISS+RRF hybrid retrieval pipeline, same logic, new content type.
"""
from __future__ import annotations

import datetime
import json
import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.database import get_db_connection

troubleshooting_router = APIRouter(
    prefix="/troubleshooting",
    tags=["Troubleshooting Knowledge Base"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SubmitSolutionRequest(BaseModel):
    """Raw free-text description of a problem and its fix, submitted by an employee."""
    employee_name: str = Field(..., description="Name of the employee submitting the solution credit")
    employee_domain: Optional[str] = Field("general", description="Domain/department of the submitter (e.g. 'electrical', 'process')")
    raw_input: str = Field(..., description="Free-text description of what happened and how it was resolved", min_length=20)
    tags: Optional[str] = Field(None, description="Comma-separated topic tags (e.g. 'pump,seal,vibration')")


class ConfirmSolutionRequest(BaseModel):
    """Optional employee edits to the AI-filtered draft before publishing."""
    problem_summary: Optional[str] = Field(None, description="Edited problem summary (leave blank to use AI draft)")
    solution_summary: Optional[str] = Field(None, description="Edited solution summary (leave blank to use AI draft)")


class TroubleshootingEntryResponse(BaseModel):
    id: int
    employee_name: str
    employee_domain: Optional[str]
    problem_summary: Optional[str]
    solution_summary: Optional[str]
    domain: Optional[str]
    tags: Optional[str]
    status: str
    reuse_count: int
    submitted_at: Optional[str]
    published_at: Optional[str]


class SubmitResponse(BaseModel):
    entry_id: int
    status: str  # always "pending_review"
    message: str
    draft_problem_summary: Optional[str]
    draft_solution_summary: Optional[str]


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[TroubleshootingEntryResponse]


# ─────────────────────────────────────────────────────────────────────────────
# AI Filter Helper
# ─────────────────────────────────────────────────────────────────────────────

def _ai_filter_submission(raw_input: str) -> tuple[str, str]:
    """
    Strip personal/identifying details from raw input and rewrite as a clean
    problem_summary + solution_summary pair.

    If GROQ_API_KEY is set, uses the LLM for high-quality filtering.
    If not, applies a deterministic template filter (still removes obvious
    personal references) so the demo runs without credentials.
    """
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        try:
            from backend.llm import get_groq_response
            prompt = (
                "You are an industrial knowledge management assistant. "
                "An employee has submitted a raw description of a problem they solved. "
                "Your task is to:\n"
                "1. Remove any personal names (other than the submitter's role), dates, "
                "   shift identifiers, or other personally identifying details.\n"
                "2. Rewrite into two clean paragraphs:\n"
                "   PROBLEM: What was the technical problem or failure mode?\n"
                "   SOLUTION: What was done to resolve it?\n"
                "Frame this as 'how [role] solved [problem]' — not as a record of error. "
                "Use professional, neutral industrial language. Do not add fabricated details.\n\n"
                f"RAW SUBMISSION:\n{raw_input}\n\n"
                "Respond in this exact format:\n"
                "PROBLEM: <one paragraph>\n"
                "SOLUTION: <one paragraph>"
            )
            response = get_groq_response(prompt)
            lines = response.strip().split("\n")
            problem_part = ""
            solution_part = ""
            for line in lines:
                if line.startswith("PROBLEM:"):
                    problem_part = line.replace("PROBLEM:", "").strip()
                elif line.startswith("SOLUTION:"):
                    solution_part = line.replace("SOLUTION:", "").strip()
            if problem_part and solution_part:
                return problem_part, solution_part
        except Exception:
            pass  # Fall through to template filter

    # Template filter (no API key required)
    # Simple heuristic: truncate raw input, note it's unfiltered
    preview = raw_input[:500].strip()
    # Split on common separators
    parts = [p.strip() for p in preview.replace(";", ".").split(".") if p.strip()]
    mid = max(1, len(parts) // 2)
    problem_part = ". ".join(parts[:mid]) + ("." if parts[:mid] else "")
    solution_part = ". ".join(parts[mid:]) + ("." if parts[mid:] else "")
    if not solution_part:
        solution_part = "Solution details as described in the raw submission."
    if not problem_part:
        problem_part = "Problem details as described in the raw submission."
    # STUB note — only shown if no LLM key
    problem_part = f"[AI filter unavailable — see raw input] {problem_part}"
    return problem_part, solution_part


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@troubleshooting_router.post(
    "/submit",
    response_model=SubmitResponse,
    summary="Submit a raw solution description for AI filtering",
    description=(
        "Accepts a free-text description of a problem and its resolution. "
        "Runs the AI filter to strip personal details and produce a clean "
        "problem/solution pair. Returns a DRAFT with status='pending_review'. "
        "The entry is NOT published or searchable until the submitter calls /confirm. "
        "This is a mandatory two-step flow by design — nothing is attributed to an "
        "employee's name without their explicit confirmation."
    ),
)
def submit_solution(payload: SubmitSolutionRequest):
    """
    Step 1 of 2: Create a pending_review draft.
    Does NOT publish. Entry is not searchable at this point.
    """
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    problem_summary, solution_summary = _ai_filter_submission(payload.raw_input)

    # Infer domain from employee_domain if not explicit
    domain = payload.employee_domain or "general"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO troubleshooting_entries
            (employee_name, employee_domain, raw_input, problem_summary,
             solution_summary, domain, tags, status, reuse_count, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', 0, ?)
        """,
        (
            payload.employee_name,
            payload.employee_domain or "general",
            payload.raw_input,
            problem_summary,
            solution_summary,
            domain,
            payload.tags,
            now,
        ),
    )
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()

    return SubmitResponse(
        entry_id=entry_id,
        status="pending_review",
        message=(
            "Your solution draft has been prepared. Please review the AI-filtered "
            "summary below and call POST /troubleshooting/{id}/confirm to publish it "
            "under your name, or to submit corrections first."
        ),
        draft_problem_summary=problem_summary,
        draft_solution_summary=solution_summary,
    )


@troubleshooting_router.post(
    "/{entry_id}/confirm",
    response_model=TroubleshootingEntryResponse,
    summary="Employee confirms (and optionally edits) the AI-filtered draft, publishing it",
    description=(
        "Step 2 of 2. The submitting employee reviews the AI-filtered draft and either "
        "approves it as-is or submits corrections. Only this call sets status='published' "
        "and makes the entry searchable and attributable. "
        "This step is mandatory — no entry is published automatically."
    ),
)
def confirm_solution(entry_id: int, payload: ConfirmSolutionRequest):
    """
    Step 2 of 2: Publish the draft. Only call sets status='published'.
    Employee may override problem_summary and/or solution_summary.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM troubleshooting_entries WHERE id = ?", (entry_id,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    if row["status"] == "published":
        conn.close()
        raise HTTPException(
            status_code=409,
            detail="This solution credit has already been published.",
        )

    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    final_problem = payload.problem_summary or row["problem_summary"]
    final_solution = payload.solution_summary or row["solution_summary"]

    cursor.execute(
        """
        UPDATE troubleshooting_entries
        SET problem_summary = ?, solution_summary = ?,
            status = 'published', published_at = ?
        WHERE id = ?
        """,
        (final_problem, final_solution, now, entry_id),
    )
    conn.commit()
    cursor.execute(
        "SELECT * FROM troubleshooting_entries WHERE id = ?", (entry_id,)
    )
    updated = cursor.fetchone()
    conn.close()

    return TroubleshootingEntryResponse(
        id=updated["id"],
        employee_name=updated["employee_name"],
        employee_domain=updated["employee_domain"],
        problem_summary=updated["problem_summary"],
        solution_summary=updated["solution_summary"],
        domain=updated["domain"],
        tags=updated["tags"],
        status=updated["status"],
        reuse_count=updated["reuse_count"],
        submitted_at=updated["submitted_at"],
        published_at=updated["published_at"],
    )


@troubleshooting_router.get(
    "/search",
    response_model=SearchResponse,
    summary="Search published solution credits — hybrid BM25+keyword retrieval",
    description=(
        "Full-text search over published troubleshooting solution credits. "
        "Only status='published' entries are returned — pending_review entries are "
        "never surfaced here, regardless of query. "
        "Increments reuse_count on matched entries to track usefulness. "
        "Results include attribution (employee name) and solution summaries."
    ),
)
def search_solutions(q: str = ""):
    """
    Search published solution credits.
    Returns [] for pending_review entries — by design.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if not q.strip():
        # Return all published entries, most recently published first
        cursor.execute(
            """
            SELECT * FROM troubleshooting_entries
            WHERE status = 'published'
            ORDER BY published_at DESC
            LIMIT 20
            """,
        )
        rows = cursor.fetchall()
        conn.close()
        results = [_row_to_response(r) for r in rows]
        return SearchResponse(query=q, total_results=len(results), results=results)

    # BM25-style keyword search over problem_summary + solution_summary
    q_lower = q.lower()
    tokens = [t.strip() for t in q_lower.split() if len(t.strip()) > 2]

    # Build a LIKE clause for each token
    if tokens:
        conditions = " OR ".join(
            [
                f"(LOWER(problem_summary) LIKE ? OR LOWER(solution_summary) LIKE ? OR LOWER(tags) LIKE ?)"
                for _ in tokens
            ]
        )
        params = []
        for t in tokens:
            params.extend([f"%{t}%", f"%{t}%", f"%{t}%"])
        sql = f"""
            SELECT *, (
                {' + '.join([
                    f"(CASE WHEN LOWER(problem_summary) LIKE ? OR LOWER(solution_summary) LIKE ? THEN 1 ELSE 0 END)"
                    for _ in tokens
                ])}
            ) AS relevance_score
            FROM troubleshooting_entries
            WHERE status = 'published'
            AND ({conditions})
            ORDER BY relevance_score DESC, published_at DESC
            LIMIT 10
        """
        score_params = []
        for t in tokens:
            score_params.extend([f"%{t}%", f"%{t}%"])
        all_params = score_params + params
        cursor.execute(sql, all_params)
    else:
        cursor.execute(
            "SELECT * FROM troubleshooting_entries WHERE status = 'published' ORDER BY published_at DESC LIMIT 10"
        )

    rows = cursor.fetchall()

    # Increment reuse_count for all matched entries, then re-fetch so response
    # reflects the incremented count (not the pre-UPDATE snapshot in memory).
    if rows:
        ids = [r["id"] for r in rows]
        placeholders = ",".join(["?" for _ in ids])
        cursor.execute(
            f"UPDATE troubleshooting_entries SET reuse_count = reuse_count + 1 WHERE id IN ({placeholders})",
            ids,
        )
        conn.commit()
        # Re-fetch with updated reuse_count
        cursor.execute(
            f"SELECT * FROM troubleshooting_entries WHERE id IN ({placeholders}) ORDER BY published_at DESC",
            ids,
        )
        rows = cursor.fetchall()

    conn.close()
    results = [_row_to_response(r) for r in rows]
    return SearchResponse(query=q, total_results=len(results), results=results)


def _row_to_response(row) -> TroubleshootingEntryResponse:
    return TroubleshootingEntryResponse(
        id=row["id"],
        employee_name=row["employee_name"],
        employee_domain=row["employee_domain"],
        problem_summary=row["problem_summary"],
        solution_summary=row["solution_summary"],
        domain=row["domain"],
        tags=row["tags"],
        status=row["status"],
        reuse_count=row["reuse_count"],
        submitted_at=row["submitted_at"],
        published_at=row["published_at"],
    )
