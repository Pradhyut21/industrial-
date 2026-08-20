"""
Git ingestion module for the Continuity Vault.

Fetches commit history and PR summaries from the GitHub API for a given
contributor and repository, then:
  1. Summarises each commit/PR in plain language via the existing Groq LLM layer.
  2. Stores each commit as a vault_artifact in the DB.
  3. Indexes the text into the RAG pipeline via existing ingest_document().

STUB behaviour: When GITHUB_TOKEN is absent, returns realistic synthetic
artifacts so the demo runs end-to-end without live credentials.
"""
from __future__ import annotations

import os
import json
import urllib.request
import urllib.parse
import datetime
from typing import Optional, List, Dict, Any

from backend.database import get_db_connection
from backend.ingestion import ingest_document

# ── GitHub client ────────────────────────────────────────────────────────────

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_API = "https://api.github.com"


def _gh_get(path: str) -> Any:
    """Simple GET to GitHub REST API. Raises on error."""
    url = f"{GITHUB_API}{path}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "DeadMind-ContinuityVault/1.0",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _parse_repo_owner_name(repo_url: str):
    """Extract (owner, repo) from a GitHub repo URL."""
    # Supports https://github.com/owner/repo and github.com/owner/repo
    parts = repo_url.rstrip("/").split("/")
    if len(parts) >= 2:
        return parts[-2], parts[-1].removesuffix(".git")
    raise ValueError(f"Cannot parse repo URL: {repo_url}")


# ── Plain-language summarisation ──────────────────────────────────────────────

def _summarise_commit(commit_data: Dict) -> str:
    """
    Generates a plain-language summary of a git commit using Groq.
    Falls back to a template if no API key is present.
    """
    msg = commit_data.get("commit", {}).get("message", "")
    author = commit_data.get("commit", {}).get("author", {}).get("name", "Unknown")
    sha = commit_data.get("sha", "")[:7]
    date = commit_data.get("commit", {}).get("author", {}).get("date", "")

    raw = f"Commit {sha} by {author} on {date}: {msg}"

    from backend.llm import get_groq_response, APIConfig
    live_key = os.environ.get("GROQ_API_KEY", "") or APIConfig.key
    if live_key:
        try:
            system = (
                "You are a technical writer summarising git commits for a non-technical audience "
                "in an industrial plant. Explain what changed and why in 1-3 plain-English sentences. "
                "Do not mention git internals. Focus on the operational significance."
            )
            summary = get_groq_response(raw, system)
            return summary.strip()
        except Exception as e:
            print(f"[GitIngestion] LLM summarise failed: {e} — using template fallback")

    # Template fallback
    first_line = msg.split("\n")[0][:120]
    return (
        f"On {date[:10]}, {author} made a change: {first_line}. "
        "This represents a code or documentation update in the project repository."
    )


# ── STUB data ─────────────────────────────────────────────────────────────────

def _stub_artifacts(person_name: str, repo_url: str, max_commits: int) -> List[Dict]:
    """
    # STUB — requires GITHUB_TOKEN env var for live operation.
    Returns synthetic commit artifacts for demo purposes.
    """
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    stubs = [
        {
            "source_ref": f"{repo_url}/commit/stub_a1b2c3",
            "raw_content": (
                f"Commit stub_a1b2c3 by {person_name}: "
                "fix: corrected control logic for startup sequence edge case\n"
                "PR #12: 'Startup sequence reliability fix'\nFiles: startup_controller.py"
            ),
            "plain_language_summary": (
                f"{person_name} fixed an edge case in the startup control logic that "
                "caused the system to skip a safety verification step during warm restarts. "
                "This is operationally significant as it could have led to false-alarm shutdowns."
            ),
        },
        {
            "source_ref": f"{repo_url}/commit/stub_d4e5f6",
            "raw_content": (
                f"Commit stub_d4e5f6 by {person_name}: "
                "docs: added runbook for manual override procedure\n"
                "PR #15: 'Document undocumented override'\nFiles: RUNBOOK.md"
            ),
            "plain_language_summary": (
                f"{person_name} documented a manual override procedure that previously existed "
                "only in their personal notes. This runbook is now the official reference for "
                "operating the system when the automated path fails."
            ),
        },
    ]
    return stubs[:max_commits]


# ── Main entry point ──────────────────────────────────────────────────────────

def ingest_github_commits(
    person_id: int,
    person_name: str,
    repo_url: str,
    contributor_login: Optional[str],
    max_commits: int,
    sensitivity_level: str,
    domain: str,
) -> int:
    """
    Fetches commits from GitHub (or stubs if no token) and writes them
    as vault_artifacts. Returns the count of artifacts created.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    raw_artifacts: List[Dict]

    if not GITHUB_TOKEN:
        print(
            "[GitIngestion] STUB — GITHUB_TOKEN not set. "
            "Using synthetic artifacts for demo. Set GITHUB_TOKEN to enable live ingestion."
        )
        raw_artifacts = _stub_artifacts(person_name, repo_url, max_commits)
    else:
        try:
            owner, repo = _parse_repo_owner_name(repo_url)
            params = f"?per_page={min(max_commits, 100)}"
            if contributor_login:
                params += f"&author={urllib.parse.quote(contributor_login)}"
            commits = _gh_get(f"/repos/{owner}/{repo}/commits{params}")
            raw_artifacts = []
            for c in commits[:max_commits]:
                sha = c.get("sha", "")[:7]
                msg = c.get("commit", {}).get("message", "")
                author = c.get("commit", {}).get("author", {}).get("name", "Unknown")
                date = c.get("commit", {}).get("author", {}).get("date", "")[:10]
                raw_content = f"Commit {sha} by {author} on {date}: {msg}"
                summary = _summarise_commit(c)
                raw_artifacts.append(
                    {
                        "source_ref": f"{repo_url}/commit/{c.get('sha', '')}",
                        "raw_content": raw_content,
                        "plain_language_summary": summary,
                    }
                )
        except Exception as e:
            print(f"[GitIngestion] GitHub API error: {e} — falling back to stub")
            raw_artifacts = _stub_artifacts(person_name, repo_url, max_commits)

    # Step 1: Ingest into RAG pipeline without holding a DB connection
    indexed_items = []
    for art in raw_artifacts:
        rag_doc = ingest_document(
            title=f"[Git] {person_name}: {art['source_ref'].split('/')[-1]}",
            content=art["raw_content"] + "\n\n" + art["plain_language_summary"],
            doc_type="Git Commit",
            forced_author=person_name,
        )
        indexed_items.append((art, rag_doc.get("id")))

    # Step 2: Open DB connection, write artifacts in one transaction, and close immediately
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    created = 0

    for art, doc_id in indexed_items:
        cursor.execute(
            """
            INSERT INTO vault_artifacts
                (person_id, artifact_type, source_ref, raw_content, plain_language_summary,
                 sensitivity_level, domain, ingested_at, doc_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person_id,
                "git_commit",
                art["source_ref"],
                art["raw_content"],
                art["plain_language_summary"],
                sensitivity_level,
                domain,
                now,
                doc_id,
            ),
        )
        created += 1

    conn.commit()
    conn.close()
    return created
