# DeadMind API Reference — Continuity Intelligence Platform

**Base URL:** `http://localhost:8000`

All endpoints accept/return JSON unless noted. Authentication: `X-DeadMind-Role` header (see RBAC notes).

---

## Vault Management

### POST /vault/persons

Register a departing employee and create their Continuity Vault.

**Required role:** Admin, Plant Head, or HR

**Request body:**
```json
{
  "name": "Rajan Sharma",
  "role": "Senior Boiler & Turbine Lead",
  "domain": "Mechanical / Steam Systems",
  "department": "Utility Operations",
  "exit_date": "2026-03-15",
  "exit_reason": "retirement",
  "status": "departed"
}
```

`exit_reason` must be one of: `retirement`, `resignation`, `transfer`, `death`.

**Response:**
```json
{
  "id": 1,
  "name": "Rajan Sharma",
  "role": "Senior Boiler & Turbine Lead",
  "domain": "Mechanical / Steam Systems",
  "department": "Utility Operations",
  "status": "departed",
  "exit_date": "2026-03-15",
  "exit_reason": "retirement",
  "created_at": "2026-08-15 12:00:00"
}
```

Default access grants are created automatically (Admin → confidential, Field Technician → public).

---

### GET /vault/persons

List all registered persons in the Continuity Vault.

**Response:** Array of person objects (same shape as above).

---

## Artifact Ingestion

### POST /vault/{person_id}/ingest/git

Fetch and index GitHub commit history for a person.

**STUB mode:** When `GITHUB_TOKEN` is not set, synthetic artifacts are used. The demo runs fully without credentials.

**Request body:**
```json
{
  "repo_url": "https://github.com/plant-ops/boiler-controls",
  "contributor_login": "rajansharma",
  "max_commits": 50,
  "sensitivity_level": "department-restricted"
}
```

`sensitivity_level`: `public`, `department-restricted`, or `confidential`.
`contributor_login` is optional — if omitted, all commits are ingested.

**Response:**
```json
{
  "status": "success",
  "artifacts_created": 12,
  "note": "STUB mode: synthetic artifacts used (GITHUB_TOKEN not set)."
}
```

---

### POST /vault/{person_id}/ingest/pptx

Upload and parse a PowerPoint presentation (`.pptx`).

**Content-Type:** `multipart/form-data`

**Form fields:**
- `file` — the `.pptx` file
- `sensitivity_level` — `public`, `department-restricted`, or `confidential` (default: `confidential`)

**Response:**
```json
{
  "status": "success",
  "artifact_id": 5,
  "artifact_type": "pptx",
  "plain_language_summary": "Key handover slides covering B-101 startup sequence...",
  "doc_id": 47
}
```

`doc_id` is the ID in the main `documents` table — the presentation is now queryable via the Expert Copilot.

---

### POST /vault/{person_id}/ingest/doc

Upload a `.docx`, `.xlsx`, `.eml`, `.txt`, `.log`, or `.csv` file.

**Content-Type:** `multipart/form-data`

**Form fields:**
- `file` — the document
- `sensitivity_level` — default: `department-restricted`

**Response:** Same shape as `/ingest/pptx`.

---

## Continuity Briefs

### POST /vault/{person_id}/brief

Generate (or regenerate) an AI Continuity Brief for a person.

Runs an LLM pass over all ingested artifacts. The `requester_role` parameter adapts the language and focus of the output. A previous brief is replaced; verification status resets to `unverified`.

**Request body:**
```json
{
  "requester_role": "Plant Head"
}
```

`requester_role` controls the explanation style:
- `Field Technician` — step-by-step, equipment-tag-level detail
- `Finance` — plain English, business impact focus
- `QHS Manager` — safety and compliance priority
- `Plant Head` — concise executive summary
- `Reliability Engineer` — full technical depth

**Response:**
```json
{
  "id": 1,
  "person_id": 1,
  "generated_at": "2026-08-15 12:00:00",
  "summary_text": "Rajan Sharma (Senior Boiler & Turbine Lead) retired 2026-03-15 after 28 years...",
  "unresolved_items": [
    "TURBINE-04 governor feedback lag unresolved — T. Nair is point of contact.",
    "B-101 secondary superheater tube scaling inspection overdue since January 2026."
  ],
  "glossary": {
    "zero-span calibration": "Setting the min and max output of an instrument so it reads accurately...",
    "positioner drift": "When a valve position sensor reports wrong position over time..."
  },
  "verification_status": "unverified",
  "verified_by": null,
  "verified_at": null
}
```

---

### GET /vault/{person_id}/brief

Fetch the latest Continuity Brief. Returns `404` if not yet generated.

**Response:** Same shape as above.

---

### POST /vault/{person_id}/brief/verify

Mark a brief as peer-verified. Records the verifier's name and timestamp.

**Request body:**
```json
{
  "verifier_name": "S. Kulkarni (Safety Auditor)",
  "notes": "Reviewed against shift logs. Confirmed accurate."
}
```

**Response:**
```json
{
  "status": "verified",
  "verified_by": "S. Kulkarni (Safety Auditor)",
  "verified_at": "2026-08-15 14:30:00"
}
```

---

## Role-Aware Query

### POST /vault/{person_id}/query

Query the RAG pipeline for knowledge attributed to this person. The same question yields different answers based on `requester_role`.

**Request body:**
```json
{
  "query": "What is the cold startup procedure for B-101?",
  "requester_role": "Field Technician"
}
```

**Response:**
```json
{
  "answer": "For B-101 cold startup (below 12°C): Step 1: Verify positioner arm alignment before any digital gain adjustment...",
  "citations": [
    {"id": 12, "title": "Boiler Pressure Fluctuation Investigation - B-101", "author": "Rajan Sharma"},
    {"id": 5, "title": "[PPTX] Boiler_Operations_Handover_2026.pptx", "author": "Rajan Sharma"}
  ],
  "confidence": 82,
  "role_adaptation_note": "Response adapted for role: Field Technician"
}
```

The same query with `requester_role: "Finance"` returns a plain-English business impact summary instead of step-by-step procedure.

---

## Freshness / Decay

### GET /vault/{person_id}/freshness

Returns the decay and re-verification status of a vault.

**Response:**
```json
{
  "person_id": 1,
  "person_name": "Rajan Sharma",
  "brief_generated_at": "2026-08-15 12:00:00",
  "brief_age_days": 0,
  "verification_status": "verified",
  "freshness_flag": "fresh",
  "artifact_count": 4,
  "last_artifact_ingested_at": "2026-08-15 12:00:00",
  "recommendation": "Brief is up to date. No action required."
}
```

`freshness_flag`:
- `fresh` — brief is less than 90 days old
- `review-due` — 90–180 days old
- `stale` — over 180 days old or no brief generated

---

---

## Tasks & In-Flight Handoffs

### POST /vault/{person_id}/tasks

Create an in-flight task record with a Mermaid flowchart, dependencies, and deadline.

**Required role:** Admin or Department Lead

**Request body:**
```json
{
  "project_name": "Boiler Control Reliability Phase 2",
  "title": "B-101 Feedwater Positioner Cold-Drift Calibration & SOP Update",
  "description": "Finalize automated zero-span offset algorithm on V-205 positioner controller. Merge PR #52 into master.",
  "status": "in_progress",
  "percent_complete": 65,
  "deadline": "2026-08-30",
  "flowchart_mermaid": "graph TD\n    A[Analyze Instability] --> B[Draft PR #47]\n    B --> C[Field Test]\n    C --> D[Merge PR #52]",
  "dependencies": [
    {
      "domain": "Software / Controls",
      "team": "Automation Engineering",
      "relationship": "blocks",
      "note": "PR #52 merge required before DCS firmware patch deployment"
    },
    {
      "domain": "Safety / QHS",
      "team": "Plant Safety Inspection",
      "relationship": "blocked_by",
      "note": "Awaiting safety auditor sign-off on SOP deviation clause 4.2"
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "person_id": 1,
  "project_name": "Boiler Control Reliability Phase 2",
  "title": "B-101 Feedwater Positioner Cold-Drift Calibration & SOP Update",
  "description": "Finalize automated zero-span offset algorithm...",
  "status": "in_progress",
  "flowchart_mermaid": "graph TD\n...",
  "percent_complete": 65,
  "deadline": "2026-08-30",
  "dependencies": [...],
  "created_at": "2026-08-15 12:00:00",
  "urgency_status": "on_track",
  "days_remaining": 15
}
```

---

### GET /vault/{person_id}/tasks

List all in-flight tasks under a person's vault, with calculated deadline urgency.

**Response:** Array of task objects.

---

### GET /vault/{person_id}/tasks/{task_id}

Fetch details for a single task including Mermaid flowchart and cross-domain dependencies.

**Response:** Single task object.

---

### POST /vault/{person_id}/tasks/{task_id}/explain

Generate a role-aware explanation, Mermaid flowchart, curated learning resources, and dependency impact for a successor picking up the task.

**Request body:**
```json
{
  "requester_role": "Field Technician"
}
```

**Response:**
```json
{
  "task_id": 1,
  "title": "B-101 Feedwater Positioner Cold-Drift Calibration & SOP Update",
  "project_name": "Boiler Control Reliability Phase 2",
  "requester_role": "Field Technician",
  "status": "in_progress",
  "percent_complete": 65,
  "urgency_status": "on_track",
  "days_remaining": 15,
  "gap_explanation": "### Field Technician Operational Handoff: ...",
  "flowchart_mermaid": "graph TD\n...",
  "dependencies": [...],
  "learning_resources": [
    {
      "topic": "Zero-Span Positioner Calibration",
      "type": "youtube",
      "search_query": "Zero-Span Positioner Calibration industrial engineering tutorial",
      "url": "https://www.youtube.com/results?search_query=Zero-Span+Positioner+Calibration+industrial+engineering+tutorial",
      "description": "Watch visual video walkthrough: Step-by-step video guide for calibrating industrial valve positioners"
    }
  ],
  "citations": [...]
}
```

## Voice Channel

### POST /voice/inbound

Twilio inbound voice webhook. Extracts transcribed speech, queries the RAG pipeline, and returns TwiML.

**STUB mode:** Pass `transcript` in the body; no Twilio credentials required.

**Request body (JSON — for direct testing):**
```json
{
  "SpeechResult": "What are the open items from Rajan Sharma?",
  "person_id": 1,
  "language": "en"
}
```

Or in stub/test mode:
```json
{
  "transcript": "What is the cold startup procedure for B-101?",
  "person_id": 1,
  "language": "en"
}
```

**Response:** TwiML (`application/xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">For B-101 cold startup: verify positioner arm alignment...</Say>
</Response>
```

---

### POST /voice/outbound

Initiate an outbound call that reads the Continuity Brief summary.

**STUB mode:** Logs intent and returns stub SID when Twilio credentials are absent.

**Request body:**
```json
{
  "person_id": 1,
  "to_phone": "+919876543210",
  "language": "en"
}
```

**Response:**
```json
{
  "status": "initiated",
  "call_sid": "stub-sid-20260815120000",
  "session_id": 3,
  "note": "STUB — no real call placed (Twilio credentials not configured)"
}
```

---

## WhatsApp Channel

### POST /whatsapp/inbound

Twilio WhatsApp Business sandbox inbound webhook.

**STUB mode:** Works without Twilio credentials — pass `Body` in the request body.

**Request body:**
```json
{
  "From": "whatsapp:+919876543210",
  "Body": "What is the cold startup procedure for B-101?",
  "person_id": 1,
  "language": "en"
}
```

**Response:**
```json
{
  "status": "sent",
  "channel": "whatsapp",
  "response_text": "Based on Rajan Sharma preserved notes: verify positioner arm alignment...",
  "session_id": 4
}
```

---

## Call Sessions Log

### GET /call-sessions

Returns the full call and WhatsApp session log (last 100 entries, newest first).

**Response:** Array of session objects:
```json
[
  {
    "id": 1,
    "person_id": 1,
    "person_name": "Rajan Sharma",
    "channel": "whatsapp",
    "language": "en",
    "transcript": "What is the startup procedure for B-101 after a cold night?",
    "response_text": "Based on Rajan Sharma preserved notes: ...",
    "started_at": "2026-08-15 12:00:00",
    "duration_seconds": 47.3
  }
]
```

---

## RBAC Notes

All routes read the `X-DeadMind-Role` header to determine the caller's role.
If the header is absent, the role defaults to `Admin` (permissive demo default).

**Role → maximum sensitivity level allowed (default grants):**

| Role | Allowed sensitivity |
|------|-------------------|
| Admin | confidential |
| Plant Head | department-restricted |
| QHS Manager | department-restricted |
| Reliability Engineer | department-restricted |
| Field Technician | public |
| Finance | public |

Attempting to access above your allowed level returns `403 Forbidden`.

> **Note:** The `X-DeadMind-Role` header is a mock authentication mechanism for demo purposes.
> In production, replace with JWT validation from your identity provider.
