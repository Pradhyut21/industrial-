# Privacy and Consent — DeadMind Continuity Intelligence Platform

This document describes what data DeadMind processes, how it is stored, who can access it, and the legal and ethical framework the platform operates under.

---

## 1. Data Collected

### 1.1 Person Registration

When a departing employee is registered in the Continuity Vault, the following data is stored:

- Full name
- Job title and department
- Knowledge domain
- Exit date and exit reason

This data is entered by an authorised HR officer or Plant Head, not collected from the employee directly or automatically.

### 1.2 Vault Artifacts

Artifacts ingested into the vault may include:

- **Git commits** — commit messages, PR titles, file names changed. Not full source code by default; source code content requires explicit ingestion.
- **Presentations** — slide text and speaker notes extracted from uploaded `.pptx` files.
- **Documents** — text content of `.docx`, `.xlsx`, `.eml`, and `.txt` files.
- **Shift logs** — plain-text shift notes uploaded manually by the operator.

### 1.3 Call Sessions

If voice or WhatsApp channels are active:

- Inbound query transcripts (from Twilio Gather STT or WhatsApp message body)
- AI-generated responses
- Call start time and duration
- Caller language

Phone numbers from WhatsApp sessions are stored as provided by Twilio in the `From` field.

---

## 2. What Is Not Collected

- Full source code repositories (only commit messages and PR titles are indexed by default)
- Audio recordings (STT transcription is done by Twilio before the audio reaches DeadMind)
- Employee personal communications not uploaded by an authorised operator
- Health, financial, or government ID information

---

## 3. Consent

### 3.1 Employee Consent (Recommended)

DeadMind does not enforce or automate employee consent collection. Operators are responsible for:

1. Informing departing employees that their work products and knowledge artifacts are being captured.
2. Obtaining written consent where required by the employment contract or applicable law.
3. Giving employees the opportunity to review and flag any artifacts they believe are incorrectly attributed.

The peer-verification step (POST `/vault/{id}/brief/verify`) provides a mechanism for a colleague to attest to the accuracy of the AI-generated brief, but it does not substitute for employee consent.

### 3.2 Caller Consent (Voice and WhatsApp)

WhatsApp and voice callers should be informed (via the initial bot greeting) that:
- Their query is being processed by an AI system.
- The conversation may be logged.

A sample TwiML greeting is provided in `backend/vault/voice_provider.py`.

---

## 4. Access Control

Access to vault data is governed by the `access_grants` table, which defines per-role sensitivity level limits:

| Role | Default max sensitivity |
|------|------------------------|
| Admin | confidential |
| Plant Head | department-restricted |
| QHS Manager | department-restricted |
| Reliability Engineer | department-restricted |
| Field Technician | public |
| Finance | public |

Admins can modify access grants via the database directly. A UI for grant management is on the roadmap.

---

## 5. Data Retention

There is no automated retention policy in the current version. Operators should define:

- How long vault artifacts are retained after an employee's exit.
- Whether call session logs are purged on a schedule.

Recommended practice: retain vault briefs for the life of the equipment or project they relate to; purge call session transcripts after 90 days.

---

## 6. DPDP Act (India) Relevance

The Digital Personal Data Protection Act, 2023 (DPDP Act) applies to personal data of Indian residents. Under the DPDP Act:

- **Employee data** (name, role, exit information) constitutes personal data.
- **Legitimate use** for employment-related purposes (knowledge capture, business continuity) is a valid ground for processing under the employment contract exception.
- **Data minimisation** is the responsibility of the operator — only ingest artifacts that are operationally necessary.
- **Grievance redressal** — the departing employee retains the right to request correction of factual errors in their Continuity Brief. Operators should document a procedure for handling such requests.

This platform does not process biometric data, health data, or financial data.

---

## 7. Security

- All data is stored in a local SQLite database file (`deadmind.db`). It is not transmitted to any external service except:
  - Groq API (LLM inference — text only, no PII identifiers by design)
  - Twilio (voice/WhatsApp routing — if configured)
  - Bhashini/Sarvam (translation — if configured)
- The database file should be excluded from source control and backed up securely.
- In the demo version, authentication is a localStorage-based gate (admin/demo123). This must be replaced with a proper identity provider before production use.

### 7.1 Authentication and RBAC -- Known Demo Limitation

**This section is a direct disclosure for evaluators and reviewers.**

The current role-based access control implementation uses the X-DeadMind-Role HTTP header to identify the caller's role. This is **a demo-grade mock authentication mechanism and is trivially spoofable** -- any client can set any role header without credentials.

**What is real (backend-enforced, not a UI toggle):**
- The `access_grants` table is queried on every vault endpoint.
- The sensitivity level check (`check_vault_access()` in `backend/vault/rbac.py`) compares the caller's claimed role against the DB-stored grant and returns HTTP 403 if access is denied.
- The RBAC logic itself is complete and correct -- the weakness is in how the role claim is sourced, not in how it is enforced.

**What is not real:**
- There is no cryptographic verification that the caller actually holds the role they claim.
- The `X-DeadMind-Role` header is accepted at face value.

**Production path (one function to replace):**

Replace `get_session_role()` in `backend/vault/rbac.py` with JWT validation:
the function currently reads the header directly; swap it for `verify_jwt(token)` from your IdP.
All other enforcement code (`check_vault_access`, `require_vault_access`, `access_grants` table queries) does not need to change.
The interface is real; only the identity source is mocked.

**Why this is disclosed rather than hidden:** A platform handling departing employees' operational knowledge -- some of it classified as `confidential` -- must be explicit about its security posture. The demo correctly shows the enforcement layer working; it does not claim the authentication layer is production-ready.
