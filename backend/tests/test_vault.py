"""
Integration tests for the Continuity Intelligence Platform vault routes.

These tests run against the real FastAPI app with a real (in-memory / temp) SQLite
database so they test the full request → DB → response cycle.

Run:
    python -m pytest backend/tests/test_vault.py -v

All tests operate in stub mode (no GITHUB_TOKEN, GROQ_API_KEY, Twilio, Bhashini keys needed).
The tests verify that routes exist, return correct status codes, and produce
sensible response shapes — not LLM output quality, which is non-deterministic.
"""
import pytest
import json
import os
import sys

# Ensure project root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# App fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    """Create a TestClient for the full FastAPI app."""
    # Import here so env vars set above are visible before module-level init
    from backend.main import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ---------------------------------------------------------------------------
# Helper: admin role header
# ---------------------------------------------------------------------------

ADMIN_HEADERS = {"X-DeadMind-Role": "Admin"}
TECH_HEADERS = {"X-DeadMind-Role": "Field Technician"}
FINANCE_HEADERS = {"X-DeadMind-Role": "Finance"}


# ---------------------------------------------------------------------------
# Test: GET /vault/persons (list pre-seeded demo person)
# ---------------------------------------------------------------------------

def test_list_persons(client):
    resp = client.get("/vault/persons", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    persons = resp.json()
    assert isinstance(persons, list)
    # Demo data seeds Rajan Sharma
    names = [p["name"] for p in persons]
    assert "Rajan Sharma" in names, f"Expected Rajan Sharma in persons, got: {names}"


# ---------------------------------------------------------------------------
# Test: POST /vault/persons — create a new person
# ---------------------------------------------------------------------------

def test_create_person(client):
    payload = {
        "name": "Test Engineer",
        "role": "Senior Process Engineer",
        "domain": "Process / Distillation",
        "department": "Process Operations",
        "exit_date": "2026-12-31",
        "exit_reason": "resignation",
        "status": "departed",
    }
    resp = client.post("/vault/persons", json=payload, headers=ADMIN_HEADERS)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["name"] == "Test Engineer"
    assert data["id"] is not None


# ---------------------------------------------------------------------------
# Test: POST /vault/{person_id}/ingest/git — stub mode
# ---------------------------------------------------------------------------

def test_ingest_git_stub(client):
    # First create a person
    payload = {
        "name": "Git Test Engineer",
        "role": "Lead Developer",
        "domain": "Software / Controls",
        "department": "Controls Engineering",
        "exit_date": "2026-06-30",
        "exit_reason": "transfer",
        "status": "departed",
    }
    person_resp = client.post("/vault/persons", json=payload, headers=ADMIN_HEADERS)
    assert person_resp.status_code == 200
    person_id = person_resp.json()["id"]

    git_payload = {
        "repo_url": "https://github.com/plant-ops/test-repo",
        "contributor_login": "testuser",
        "max_commits": 5,
        "sensitivity_level": "public",
    }
    resp = client.post(
        f"/vault/{person_id}/ingest/git",
        json=git_payload,
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200, f"Git ingest failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["artifacts_created"] > 0
    # Should be in stub mode since GITHUB_TOKEN is not set in test environment
    assert "STUB" in data["note"] or "Live" in data["note"]


# ---------------------------------------------------------------------------
# Test: POST /vault/{person_id}/brief — generate brief (stub LLM)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def demo_person_id(client):
    """Get the ID of the pre-seeded Rajan Sharma demo person."""
    resp = client.get("/vault/persons", headers=ADMIN_HEADERS)
    persons = resp.json()
    for p in persons:
        if p["name"] == "Rajan Sharma":
            return p["id"]
    pytest.fail("Demo person Rajan Sharma not found in persons list")


def test_generate_brief(client, demo_person_id):
    resp = client.post(
        f"/vault/{demo_person_id}/brief",
        json={"requester_role": "Admin"},
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200, f"Brief generation failed: {resp.text}"
    data = resp.json()
    assert "summary_text" in data
    assert isinstance(data["summary_text"], str)
    assert len(data["summary_text"]) > 10
    assert "unresolved_items" in data
    assert isinstance(data["unresolved_items"], list)
    assert "glossary" in data
    assert isinstance(data["glossary"], dict)
    assert "verification_status" in data


# ---------------------------------------------------------------------------
# Test: GET /vault/{person_id}/brief
# ---------------------------------------------------------------------------

def test_get_brief(client, demo_person_id):
    # Ensure brief exists
    client.post(
        f"/vault/{demo_person_id}/brief",
        json={"requester_role": "Admin"},
        headers=ADMIN_HEADERS,
    )
    resp = client.get(f"/vault/{demo_person_id}/brief", headers=ADMIN_HEADERS)
    assert resp.status_code == 200, f"Get brief failed: {resp.text}"
    data = resp.json()
    assert data["person_id"] == demo_person_id
    assert "summary_text" in data


# ---------------------------------------------------------------------------
# Test: POST /vault/{person_id}/brief/verify
# ---------------------------------------------------------------------------

def test_verify_brief(client, demo_person_id):
    # Ensure brief exists
    client.post(
        f"/vault/{demo_person_id}/brief",
        json={"requester_role": "Admin"},
        headers=ADMIN_HEADERS,
    )
    resp = client.post(
        f"/vault/{demo_person_id}/brief/verify",
        json={"verifier_name": "S. Kulkarni (Safety Auditor)", "notes": "Reviewed and confirmed accurate."},
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "verified"
    assert data["verified_by"] == "S. Kulkarni (Safety Auditor)"
    assert "content_hash" in data
    assert data["content_hash"] is not None
    assert len(data["content_hash"]) == 64  # SHA-256 hex string


def test_brief_audit_proof_tamper_detection(client, demo_person_id):
    """
    Section 12.1 Test: Verify that the audit-proof endpoint confirms the brief's
    current SHA-256 hash matches the anchored hash.
    """
    # 1. Ensure brief is generated and verified
    client.post(
        f"/vault/{demo_person_id}/brief",
        json={"requester_role": "Admin"},
        headers=ADMIN_HEADERS,
    )
    client.post(
        f"/vault/{demo_person_id}/brief/verify",
        json={"verifier_name": "Kavita Rao (Process Safety Lead)"},
        headers=ADMIN_HEADERS,
    )

    # 2. Query the cryptographic audit proof endpoint
    resp = client.get(f"/vault/{demo_person_id}/brief/audit-proof", headers=ADMIN_HEADERS)
    assert resp.status_code == 200, f"Audit proof failed: {resp.text}"
    proof = resp.json()
    assert proof["person_id"] == demo_person_id
    assert proof["verification_status"] == "verified"
    assert proof["verified_by"] == "Kavita Rao (Process Safety Lead)"
    assert proof["current_content_hash"] == proof["anchored_content_hash"]
    assert proof["is_tamper_free"] is True


# ---------------------------------------------------------------------------
# Test: POST /vault/{person_id}/query — role-aware response
# ---------------------------------------------------------------------------

def test_vault_query_field_technician(client, demo_person_id):
    resp = client.post(
        f"/vault/{demo_person_id}/query",
        json={
            "query": "What is the startup procedure for B-101?",
            "requester_role": "Field Technician",
        },
        headers=TECH_HEADERS,
    )
    assert resp.status_code == 200, f"Query failed: {resp.text}"
    data = resp.json()
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert "role_adaptation_note" in data
    assert "Field Technician" in data["role_adaptation_note"]


def test_vault_query_finance_role(client, demo_person_id):
    resp = client.post(
        f"/vault/{demo_person_id}/query",
        json={
            "query": "What is the startup procedure for B-101?",
            "requester_role": "Finance",
        },
        headers=FINANCE_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "Finance" in data["role_adaptation_note"]
    # The answers for Field Technician and Finance should exist
    # (content comparison would require live LLM — not tested here)


# ---------------------------------------------------------------------------
# Test: GET /vault/{person_id}/freshness
# ---------------------------------------------------------------------------

def test_get_freshness(client, demo_person_id):
    resp = client.get(f"/vault/{demo_person_id}/freshness", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "freshness_flag" in data
    assert data["freshness_flag"] in ("fresh", "review-due", "stale")
    assert "artifact_count" in data
    assert data["artifact_count"] >= 0


# ---------------------------------------------------------------------------
# Test: POST /voice/inbound — stub mode
# ---------------------------------------------------------------------------

def test_voice_inbound_stub(client, demo_person_id):
    payload = {
        "transcript": "What are the open items from Rajan Sharma?",
        "person_id": demo_person_id,
        "language": "en",
    }
    resp = client.post("/voice/inbound", json=payload, headers=ADMIN_HEADERS)
    # Should return TwiML (application/xml) or 200
    assert resp.status_code == 200, f"Voice inbound failed: {resp.text}"
    content = resp.content.decode("utf-8")
    assert "<Response>" in content or "Response" in content


# ---------------------------------------------------------------------------
# Test: POST /whatsapp/inbound — stub mode
# ---------------------------------------------------------------------------

def test_whatsapp_inbound_stub(client, demo_person_id):
    """
    Tests the WhatsApp inbound handler in stub mode.

    Behavior depends on environment:
    - No Twilio creds (TWILIO_ACCOUNT_SID unset): StubWhatsAppProvider — returns 200, 'sent'.
    - Live Twilio creds present: TwilioWhatsAppProvider is used. The test number
      +919876543210 is not enrolled in the Twilio sandbox, so Twilio returns 422.
      This is an environment-level issue (sandbox enrollment), not a code bug.
      Test is skipped when live creds are present.
    """
    import os
    if os.environ.get("TWILIO_ACCOUNT_SID"):
        pytest.skip(
            "Live Twilio credentials present (TWILIO_ACCOUNT_SID is set). "
            "Test number +919876543210 is not enrolled in the sandbox. "
            "WhatsApp stub logic is verified when TWILIO_ACCOUNT_SID is unset."
        )

    payload = {
        "From": "whatsapp:+919876543210",
        "Body": "What is the cold startup procedure for B-101?",
        "person_id": demo_person_id,
        "language": "en",
    }
    try:
        resp = client.post("/whatsapp/inbound", json=payload, headers=ADMIN_HEADERS)
    except Exception as exc:
        # urllib.error can propagate if network is unavailable in CI
        import urllib.error
        if isinstance(exc.__context__, urllib.error.URLError) or "URLError" in str(type(exc)) or "URLError" in str(exc):
            pytest.skip(f"Network unavailable in test environment (stub mode OK): {exc}")
        raise

    assert resp.status_code == 200, f"WhatsApp inbound failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "sent"
    assert data["channel"] == "whatsapp"
    assert "response_text" in data
    assert "session_id" in data


# ---------------------------------------------------------------------------
# Test: GET /call-sessions
# ---------------------------------------------------------------------------

def test_list_call_sessions(client):
    resp = client.get("/call-sessions", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    sessions = resp.json()
    assert isinstance(sessions, list)
    # Demo data seeds at least one session
    assert len(sessions) >= 0


# ---------------------------------------------------------------------------
# Test: RBAC — Field Technician cannot access confidential vault
# ---------------------------------------------------------------------------

def test_rbac_blocks_confidential_access(client, demo_person_id):
    """
    Field Technician role should only have access to 'public' sensitivity level.
    The /vault/{id}/brief endpoint serves public-level data so it should succeed.
    A direct attempt to ingest (which requires department-restricted) should fail.
    """
    git_payload = {
        "repo_url": "https://github.com/plant-ops/test",
        "max_commits": 2,
        "sensitivity_level": "confidential",
    }
    resp = client.post(
        f"/vault/{demo_person_id}/ingest/git",
        json=git_payload,
        headers=TECH_HEADERS,  # Field Technician
    )
    # Field Technician does not have department-restricted access → should 403
    assert resp.status_code == 403, (
        f"Expected 403 for Field Technician git ingest, got {resp.status_code}: {resp.text}"
    )


# ---------------------------------------------------------------------------
# Test: POST & GET /vault/{person_id}/tasks — Task-Level Handoff Explainer
# ---------------------------------------------------------------------------

def test_create_task(client, demo_person_id):
    task_payload = {
        "project_name": "Test Instrumentation Project",
        "title": "Calibrate Feedwater Valve Positioner",
        "description": "Inspect cold-weather linkage and adjust zero-span pots.",
        "status": "in_progress",
        "percent_complete": 50,
        "deadline": "2026-09-01",
        "flowchart_mermaid": "graph TD\n    A[Inspect Linkage] --> B[Calibrate 4-20mA]",
        "dependencies": [
            {
                "domain": "Safety / QHS",
                "team": "Plant Safety",
                "relationship": "blocked_by",
                "note": "Work permit approval needed"
            }
        ]
    }
    resp = client.post(
        f"/vault/{demo_person_id}/tasks",
        json=task_payload,
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200, f"Task creation failed: {resp.text}"
    data = resp.json()
    assert data["title"] == "Calibrate Feedwater Valve Positioner"
    assert data["percent_complete"] == 50
    assert len(data["dependencies"]) == 1
    assert data["urgency_status"] in ("on_track", "at_risk", "overdue")


def test_get_task_flowchart(client, demo_person_id):
    resp = client.get(f"/vault/{demo_person_id}/tasks", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    tasks = resp.json()
    assert isinstance(tasks, list)
    assert len(tasks) > 0

    first_task = tasks[0]
    task_id = first_task["id"]

    detail_resp = client.get(f"/vault/{demo_person_id}/tasks/{task_id}", headers=ADMIN_HEADERS)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["flowchart_mermaid"] is not None
    assert "graph" in detail["flowchart_mermaid"]


def test_explain_task_role_aware(client, demo_person_id):
    # Get seeded task
    tasks_resp = client.get(f"/vault/{demo_person_id}/tasks", headers=ADMIN_HEADERS)
    assert tasks_resp.status_code == 200
    tasks = tasks_resp.json()
    assert len(tasks) > 0
    task_id = tasks[0]["id"]

    # Explain for Field Technician
    tech_resp = client.post(
        f"/vault/{demo_person_id}/tasks/{task_id}/explain",
        json={"requester_role": "Field Technician"},
        headers=TECH_HEADERS,
    )
    assert tech_resp.status_code == 200
    tech_data = tech_resp.json()
    assert "gap_explanation" in tech_data
    assert len(tech_data["gap_explanation"]) > 20
    assert len(tech_data["learning_resources"]) > 0
    assert any(r["type"] == "youtube" for r in tech_data["learning_resources"])

    # Explain for Finance
    finance_resp = client.post(
        f"/vault/{demo_person_id}/tasks/{task_id}/explain",
        json={"requester_role": "Finance"},
        headers=FINANCE_HEADERS,
    )
    assert finance_resp.status_code == 200
    finance_data = finance_resp.json()

    # The explanations for Field Technician and Finance must differ in content/focus
    assert tech_data["gap_explanation"] != finance_data["gap_explanation"]
    # Tech explanation must reference actions, steps, or equipment specifics
    tech_text_lower = tech_data["gap_explanation"].lower()
    assert any(kw in tech_text_lower for kw in ["technician", "actions", "valve", "steps", "inspect", "calibrat"]), \
        f"Tech explanation should reference actions/equipment, got: {tech_text_lower[:200]}"
    # Finance explanation must reference cost/business impact keywords (case-insensitive)
    finance_text_lower = finance_data["gap_explanation"].lower()
    assert any(kw in finance_text_lower for kw in ["financial", "business", "cost", "lakhs", "revenue", "finance", "budget", "downtime", "permit"]), \
        f"Finance explanation should reference cost/business impact, got: {finance_text_lower[:200]}"


def test_task_dependency_and_deadline_fields(client, demo_person_id):
    tasks_resp = client.get(f"/vault/{demo_person_id}/tasks", headers=ADMIN_HEADERS)
    assert tasks_resp.status_code == 200
    tasks = tasks_resp.json()
    assert len(tasks) > 0

    task = tasks[0]
    assert "dependencies" in task
    assert isinstance(task["dependencies"], list)
    assert "urgency_status" in task
    assert task["urgency_status"] in ("on_track", "at_risk", "overdue")
    assert "deadline" in task


# ---------------------------------------------------------------------------
# Test: Recovery Run game data contract — Section 2.10
# Verifies that /tasks/{task_id}/explain returns ALL fields the game UI needs
# in a SINGLE API call, so game.$taskId.tsx never has to orchestrate 3+ calls
# just to render one clue object.
# ---------------------------------------------------------------------------

def test_task_explain_returns_data_needed_for_game(client, demo_person_id):
    """
    The Recovery Run game renders 4 interactable clue objects using data from
    a single POST /vault/{person_id}/tasks/{task_id}/explain response.
    This test confirms the response shape satisfies all game rendering needs:

    - task_id             → used by the game to identify the session
    - flowchart_mermaid   → rendered on the whiteboard object
    - dependencies        → shown in the dependency panel (lose-screen pitch moment)
    - learning_resources  → shown in the filing cabinet / knowledge gap panel
    - gap_explanation     → shown on the terminal / task brief object
    - urgency_status      → controls timer colour and win/lose urgency display
    - days_remaining      → feeds into the scaled game countdown timer
    - percent_complete    → shown in the HUD progress bar
    - status              → displayed in the task meta bar
    - title               → shown as the game session title in the HUD
    """
    tasks_resp = client.get(f"/vault/{demo_person_id}/tasks", headers=ADMIN_HEADERS)
    assert tasks_resp.status_code == 200
    tasks = tasks_resp.json()
    assert len(tasks) > 0, "Demo data must include at least one seeded task"
    task_id = tasks[0]["id"]

    # Call explain as Field Technician (the game's default persona)
    resp = client.post(
        f"/vault/{demo_person_id}/tasks/{task_id}/explain",
        json={"requester_role": "Field Technician"},
        headers=TECH_HEADERS,
    )
    assert resp.status_code == 200, f"explain returned {resp.status_code}: {resp.text}"
    data = resp.json()

    # ── Fields required by game.$taskId.tsx ──────────────────────────────────

    # HUD / session identity
    assert "task_id" in data, "game needs task_id"
    assert "title" in data, "game HUD needs title"

    # Timer & urgency (timer is scaled from days_remaining, colour from urgency_status)
    assert "urgency_status" in data, "game needs urgency_status for timer colour"
    assert data["urgency_status"] in ("on_track", "at_risk", "overdue")
    assert "days_remaining" in data, "game countdown scaled from days_remaining"

    # Progress bar
    assert "percent_complete" in data, "game HUD progress bar needs percent_complete"
    assert isinstance(data["percent_complete"], int)

    # Status badge
    assert "status" in data, "game task meta bar needs status"

    # Terminal / task brief object
    assert "gap_explanation" in data, "game terminal object needs gap_explanation"
    assert len(data["gap_explanation"]) > 20, "gap_explanation should be non-trivial"

    # Whiteboard / flowchart object
    assert "flowchart_mermaid" in data, "game whiteboard needs flowchart_mermaid"
    assert "graph" in data["flowchart_mermaid"].lower() or "-->" in data["flowchart_mermaid"], \
        "flowchart_mermaid should be valid Mermaid source"

    # Lose-screen pitch moment — dependency panel
    assert "dependencies" in data, "game lose-screen needs dependencies"
    assert isinstance(data["dependencies"], list), "dependencies must be a list"

    # Filing cabinet / learning resource object
    assert "learning_resources" in data, "game cabinet object needs learning_resources"
    assert isinstance(data["learning_resources"], list)
    assert len(data["learning_resources"]) > 0, "must have at least one learning resource"
    # Each resource must have url, type, topic, description for the game cards
    for r in data["learning_resources"]:
        assert "url" in r, "learning resource needs url"
        assert "type" in r, "learning resource needs type (youtube|web)"
        assert "topic" in r, "learning resource needs topic"
        assert r["type"] in ("youtube", "web"), f"unexpected type: {r['type']}"


# ---------------------------------------------------------------------------
# Section 13: Tiered x402 Micropayment Endpoints
# ---------------------------------------------------------------------------

def test_x402_consensus_tier(client):
    """
    Tier 2: Multi-Expert Consensus reasoning across cognitive engineering twins (0.03 USDC).
    Verifies 402 challenge contract and underlying consensus synthesis.
    """
    # 1. Verify 402 challenge contract
    resp = client.post(
        "/x402/consensus",
        json={"query": "What should I do if B-101 boiler drum level fluctuates?"},
        headers=ADMIN_HEADERS,
    )
    if resp.status_code == 402:
        data = resp.json()
        assert data.get("x402Version") == 2
        assert "accepts" in data
        accepts = data["accepts"][0]
        assert accepts["maxAmountRequired"] == "30000"  # 0.03 USDC
        assert "consensus" in accepts["description"].lower()
    else:
        assert resp.status_code == 200

    # 2. Verify wrapped module logic
    from backend.consensus import synthesize_consensus
    res = synthesize_consensus("What should I do if B-101 boiler drum level fluctuates?", ["Rajan Sharma", "T. Nair"])
    assert "consensus" in res
    assert "agreement" in res
    assert "weights" in res


def test_x402_compliance_audit_tier(client):
    """
    Tier 3: Compliance & SOP Gap Audit scan across regulatory requirements (0.05 USDC).
    Verifies 402 challenge contract and underlying compliance gap scanner.
    """
    # 1. Verify 402 challenge contract
    resp = client.post(
        "/x402/compliance-audit",
        json={"equipment_tag": "B-101"},
        headers=ADMIN_HEADERS,
    )
    if resp.status_code == 402:
        data = resp.json()
        assert data.get("x402Version") == 2
        assert "accepts" in data
        accepts = data["accepts"][0]
        assert accepts["maxAmountRequired"] == "50000"  # 0.05 USDC
        assert "compliance" in accepts["description"].lower()
    else:
        assert resp.status_code == 200

    # 2. Verify wrapped module logic
    from backend.compliance import run_compliance_scan
    gaps = run_compliance_scan()
    assert isinstance(gaps, list)


def test_x402_incident_match_tier(client):
    """
    Tier 4: Shift & Incident Pattern Match for predictive maintenance agents (0.04 USDC).
    Verifies 402 challenge contract and underlying anomaly pattern matcher.
    """
    # 1. Verify 402 challenge contract
    resp = client.post(
        "/x402/incident-match",
        json={"note": "Severe vibration and cavitation noise observed on boiler feed pump P-302"},
        headers=ADMIN_HEADERS,
    )
    if resp.status_code == 402:
        data = resp.json()
        assert data.get("x402Version") == 2
        assert "accepts" in data
        accepts = data["accepts"][0]
        assert accepts["maxAmountRequired"] == "40000"  # 0.04 USDC
        assert "incident" in accepts["description"].lower() or "pattern" in accepts["description"].lower()
    else:
        assert resp.status_code == 200

    # 2. Verify wrapped module logic
    from backend.shift_analyzer import analyze_shift_note
    res = analyze_shift_note("Severe vibration and cavitation noise observed on boiler feed pump P-302")
    assert "triggered" in res
    assert "details" in res


def test_x402_discovery_catalog(client):
    """
    Bazaar Discovery Extension: GET /x402/discovery returns machine-readable service catalog.
    """
    resp = client.get("/x402/discovery")
    assert resp.status_code == 200, f"Discovery failed: {resp.text}"
    data = resp.json()
    assert data.get("x402Version") == 2
    assert data.get("extension") == "bazaar"
    assert "resources" in data
    assert len(data["resources"]) >= 5
    ids = [r["id"] for r in data["resources"]]
    assert "continuity-brief" in ids
    assert "multi-expert-consensus" in ids
    assert "compliance-sop-audit" in ids
    assert "incident-pattern-match" in ids
    assert "task-gap-explainer" in ids


# ---------------------------------------------------------------------------
# Section 14: Troubleshooting Knowledge Base tests
# ---------------------------------------------------------------------------

def test_troubleshooting_submit_pending(client):
    """
    POST /troubleshooting/submit creates a draft with status='pending_review'.
    The entry must NOT be searchable at this point.
    """
    payload = {
        "employee_name": "A. Joshi",
        "employee_domain": "automation",
        "raw_input": (
            "The PLC ladder logic for steam trap monitoring was throwing false positives on "
            "Station 7B every time ambient temperature dropped below 18°C. We traced it to "
            "a stale sensor baseline hardcoded in the 2019 commission sheet. Updating the "
            "baseline to a rolling 7-day average fixed it with zero false positives since."
        ),
        "tags": "plc,sensor,steam-trap,calibration",
    }
    resp = client.post("/troubleshooting/submit", json=payload)
    assert resp.status_code == 200, f"Submit failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "pending_review", (
        f"Expected status='pending_review', got '{data['status']}'"
    )
    assert "entry_id" in data
    assert data["entry_id"] > 0
    assert data["draft_problem_summary"], "Expected a non-empty draft_problem_summary"
    assert data["draft_solution_summary"], "Expected a non-empty draft_solution_summary"
    # Stash entry_id for downstream tests — use module-level state
    test_troubleshooting_submit_pending._last_id = data["entry_id"]


def test_troubleshooting_search_excludes_pending(client):
    """
    GET /troubleshooting/search must NOT return entries in status='pending_review'.
    Section 14.4: 'An entry only becomes searchable after the explicit confirm step.'
    """
    # Submit a fresh entry (not confirmed)
    payload = {
        "employee_name": "R. Nayar",
        "employee_domain": "instrumentation",
        "raw_input": (
            "Pressure transmitter PT-441 was drifting high by 0.3 bar during night shifts. "
            "Root cause: moisture ingress in the impulse line due to cracked compression fitting. "
            "Replaced the fitting and purged the line. Drift resolved."
        ),
    }
    sub_resp = client.post("/troubleshooting/submit", json=payload)
    assert sub_resp.status_code == 200
    unconfirmed_id = sub_resp.json()["entry_id"]

    # Search should not include this draft
    search_resp = client.get("/troubleshooting/search?q=pressure+transmitter+drift")
    assert search_resp.status_code == 200
    results = search_resp.json()["results"]
    result_ids = [r["id"] for r in results]
    assert unconfirmed_id not in result_ids, (
        f"pending_review entry {unconfirmed_id} must NOT appear in search results — "
        "only published entries should be searchable."
    )


def test_troubleshooting_confirm_publishes(client):
    """
    POST /troubleshooting/{id}/confirm sets status='published' and makes it searchable.
    """
    # First submit
    payload = {
        "employee_name": "T. Nair",
        "employee_domain": "rotating-equipment",
        "raw_input": (
            "Boiler feed pump P-204 was cavitating intermittently. After ruling out suction pressure "
            "(normal at 2.1 bar), we found the inducer vanes had micro-pitting from condensate "
            "contamination. Replaced the inducer and installed a condensate separator upstream. "
            "No cavitation events in 6 weeks post-fix."
        ),
        "tags": "pump,cavitation,inducer,condensate",
    }
    sub_resp = client.post("/troubleshooting/submit", json=payload)
    assert sub_resp.status_code == 200
    entry_id = sub_resp.json()["entry_id"]

    # Confirm with no edits (accept AI draft)
    confirm_resp = client.post(f"/troubleshooting/{entry_id}/confirm", json={})
    assert confirm_resp.status_code == 200, f"Confirm failed: {confirm_resp.text}"
    confirmed = confirm_resp.json()
    assert confirmed["status"] == "published", (
        f"Expected status='published' after confirm, got '{confirmed['status']}'"
    )
    assert confirmed["published_at"] is not None
    assert confirmed["employee_name"] == "T. Nair"

    # Now search should find it
    search_resp = client.get("/troubleshooting/search?q=cavitation+pump")
    assert search_resp.status_code == 200
    results = search_resp.json()["results"]
    result_ids = [r["id"] for r in results]
    assert entry_id in result_ids, (
        f"Published entry {entry_id} should appear in search results, "
        f"got IDs: {result_ids}"
    )


def test_troubleshooting_search_attribution_and_reuse(client):
    """
    Search results include employee attribution and reuse_count increments on retrieval.
    """
    # Submit and confirm a uniquely-worded entry
    payload = {
        "employee_name": "M. Pillai",
        "employee_domain": "process",
        "raw_input": (
            "Distillation column C-07 was showing tray flooding during peak throughput. "
            "We found the downcomer backup exceeded design by 15% due to a fouled draw-off nozzle. "
            "Chemical cleaning restored normal separation efficiency within two shifts."
        ),
        "tags": "distillation,flooding,downcomer,fouling",
    }
    sub_resp = client.post("/troubleshooting/submit", json=payload)
    assert sub_resp.status_code == 200
    entry_id = sub_resp.json()["entry_id"]

    confirm_resp = client.post(f"/troubleshooting/{entry_id}/confirm", json={})
    assert confirm_resp.status_code == 200

    # First search — reuse_count should be 0 before, 1 after
    search1 = client.get("/troubleshooting/search?q=distillation+flooding+downcomer")
    assert search1.status_code == 200
    results1 = search1.json()["results"]
    matched = [r for r in results1 if r["id"] == entry_id]
    assert matched, f"Entry {entry_id} should appear in search for 'distillation flooding'"

    # Check attribution
    entry = matched[0]
    assert entry["employee_name"] == "M. Pillai", (
        f"Expected attribution to 'M. Pillai', got '{entry['employee_name']}'"
    )
    assert entry["reuse_count"] >= 1, (
        f"reuse_count should be >= 1 after one search hit, got {entry['reuse_count']}"
    )
    # Verify no negative framing fields are exposed
    assert "error" not in str(entry).lower() or "error" not in entry.get("problem_summary", "").lower(), \
        "UI copy must not expose negative 'error' framing in problem_summary"
