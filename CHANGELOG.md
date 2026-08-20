# Changelog

All notable changes to DeadMind are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.1.0] — 2026-08-19

### Added

**Recovery Run — 3D Onboarding Simulation Game (Section 2.10)**
- New route `/game/$taskId` (`frontend/src/routes/game.$taskId.tsx`) — a playable 3D mini-simulation built with `@react-three/fiber` and `@react-three/drei`
- A small 3D room with 4 interactable objects: Terminal (task brief), Whiteboard (Mermaid flowchart), Filing Cabinet (knowledge vault query), and Phone (voice stub)
- Timer sourced from real `tasks.deadline` DB field — not a hardcoded game timer
- All clue content is live API responses via the existing `/vault/{person_id}/tasks/{task_id}/explain` and `/vault/{person_id}/query` endpoints — no new backend routes
- Lose-screen surfaces the actual `dependencies` and `learning_resources` data as "what would have been missed" — the core product pitch moment
- "Play Recovery Run" button added to each task card in `vault.$personId.tsx` (amber colour, distinct from "Explain Handoff")
- New npm packages installed: `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`

**Tests**
- Added `test_task_explain_returns_data_needed_for_game` to `backend/tests/test_vault.py`
  - Verifies that a single `POST /vault/{person_id}/tasks/{task_id}/explain` response includes all fields the game UI renders: `task_id`, `title`, `flowchart_mermaid`, `dependencies`, `learning_resources`, `gap_explanation`, `urgency_status`, `days_remaining`, `percent_complete`, `status`
  - Confirms game.$taskId.tsx never needs to orchestrate 3+ API calls to render one clue

### Removed (from frontend navigation)

- **QHS Manager Regulatory Compliance Dashboard** (`/compliance`) — sidebar entry and nav item removed. Route file now redirects to `/vault`. Backend endpoint `/api/compliance-gaps` retained.
- **Reliability Engineer Lessons Learned Engine** (`/lessons`) — sidebar entry and nav item removed. Route file now redirects to `/vault`. Backend endpoint `/api/lessons-learned` retained.

Both views are superseded by the Continuity Vault's unresolved-items checklist and Task Explainer gap analysis. Backend modules (`compliance.py`, `lessons_engine.py`) and their database tables are preserved unchanged.

---

## [2.0.0] — 2026-08-15

### Added — Continuity Intelligence Platform

**Database (additive migration)**
- Added 6 new tables: `persons`, `vault_artifacts`, `continuity_briefs`, `call_sessions`, `access_grants`, `tasks`
- All tables use `CREATE TABLE IF NOT EXISTS` — existing `deadmind.db` data is unaffected
- Demo seed: Rajan Sharma (retired, 28 years service) with 4 pre-ingested artifacts, Continuity Brief, access grants, and 2 active in-flight tasks

**Backend — Vault subsystem (`backend/vault/`)**
- `task_explainer.py` — Task-level continuity explainer (Mermaid plan parsing, role-aware gap analysis, YouTube/Web learning links, dependency analysis, deadline urgency)
- `git_ingestion.py` — GitHub commit history ingestion (stub mode when no `GITHUB_TOKEN`)
- `pptx_ingestion.py` — PowerPoint slide + speaker notes extraction via `python-pptx`
- `doc_ingestion.py` — `.docx`, `.xlsx`, `.eml`, `.txt` extraction via `python-docx`, `openpyxl`, stdlib
- `brief_generator.py` — AI Continuity Brief generation with role-aware prompt adaptation; Groq or template fallback
- `rbac.py` — RBAC enforcement via `access_grants` table; role read from `X-DeadMind-Role` header
- `voice_provider.py` — Twilio Programmable Voice provider with `StubVoiceProvider` fallback
- `whatsapp_provider.py` — Twilio WhatsApp Business provider with `StubWhatsAppProvider` fallback
- `translation_provider.py` — Bhashini ULCA + Sarvam AI providers with `StubTranslationProvider` fallback
- `routes.py` — 16 FastAPI routes mounted as an `APIRouter` (including 4 task endpoints)
- `schemas.py` — All Pydantic request/response models for the vault & task subsystems

**Backend — Core changes**
- `main.py`: Mounted `vault_router`; updated FastAPI title/description to v2; extended `ALLOWED_UPLOAD_CONTENT_TYPES` with `.pptx`, `.docx`, `.xlsx`, `.eml`, `.txt`, `.csv`
- `database.py`: Added 6 new tables to `init_db()`; added `auto_seed_vault_demo()` seeder

**Backend — Tests**
- `backend/tests/test_vault.py` — 15 integration tests covering vault routes, task explainer, RBAC, and stub mode

**Frontend — New routes & views**
- `/vault` — Continuity Vault list with 3-step handoff wizard
- `/vault/$personId` — Vault detail with In-Flight Tasks (Flowchart, gap analysis, learning resources, dependencies), Brief, Upload, Role-Aware Query, and Call Log tabs
- `/calls` — Full voice/WhatsApp session log

**Frontend — Updates**
- `app-sidebar.tsx`: Added "Continuity Vault" and "Call Log" nav items
- `routeTree.gen.ts`: Manually added 3 new route registrations

**Dependencies added**
- `python-pptx` — `.pptx` parsing
- `python-docx` — `.docx` parsing
- `openpyxl` — `.xlsx` parsing

**Documentation added**
- `API.md` — Human-readable API reference for all 12 new routes
- `ARCHITECTURE.md` — Extended architecture with Vault subsystem diagram and data model
- `DEMO_SCRIPT.md` — Step-by-step demo walkthrough with fallback paths
- `PRIVACY_AND_CONSENT.md` — Data privacy, consent framework, DPDP Act relevance
- `.env.example` — All environment variables with explanations
- `CHANGELOG.md` — This file
- `LICENSE` — MIT License

---

## [1.0.0] — 2026 (prior to this session)

Initial DeadMind release:
- FastAPI backend with SQLite + FAISS hybrid retrieval (BM25 + vector)
- Groq LLM integration (llama-3.3-70b-versatile)
- Expert persona generation with cognitive fingerprinting
- Shift analysis, consensus engine, lessons engine
- Compliance module
- TanStack Router frontend with Plant Map, Expert Copilot, Audit, Compliance, Lessons, Ingest routes
- `faster-whisper` audio transcription
- `spaCy` NLP entity extraction
