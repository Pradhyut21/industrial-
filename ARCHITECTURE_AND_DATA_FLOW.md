# DeadMind v2.0 — Industrial Knowledge Intelligence & Cognitive Continuity Platform
### *Preserving the Engineers, Not Just the Documentation*

---

## Executive Summary

Every year across heavy industry (power generation, petrochemicals, manufacturing, mining), thousands of senior engineers retire. They don't just leave an empty desk — they take **30+ years of unwritten diagnostic intuition, undocumented workarounds, and tacit troubleshooting reflexes** with them.

* **The Problem:** McKinsey reports industrial teams waste **35% of their working day** searching across disconnected legacy silos, while BIS Research ties **22% of unplanned plant outages** directly to missing operational context.
* **The Solution:** **DeadMind** is an industrial cognitive continuity platform that captures, structures, and makes queryable everything a departing engineer knew and built.
* **The Web3 Breakthrough:** Native **x402 Agentic Micropayment Protocol on Algorand**, enabling autonomous AI agents to pay for mission-critical engineering briefs with zero human intervention, and paying human peer auditors on-chain micro-rewards for verifying AI syntheses.

```
+-----------------------------------------------------------------------------------+
|                            END-TO-END SYSTEM FLOW                                 |
+-----------------------------------------------------------------------------------+

 1. INGESTION ENGINE
    ├── Shift Logs, Equipment Overhauls & Scanned P&IDs (OCR)
    ├── Git Commit Ingestion & PR Discussion History
    ├── Technical Documents (.docx, .xlsx, .pptx, .eml, .pdf)
    └── Voice Notes & Audio Transcripts (Whisper)
            │
            ▼
 2. COGNITIVE INTELLIGENCE CORE
    ├── AI Handoff Brief Synthesizer (Glossary, Unresolved Risks, Stamped Audit)
    ├── Role-Aware Semantic RAG (Field Tech Checklist vs. CFO Financial Risk)
    ├── In-Flight Task Explainer (Dynamic Mermaid Flowcharts & Recovery Paths)
    ├── Multi-Expert Consensus & Dissent Engine (Synthesizes 3+ Engineer Twins)
    └── Uncertainty & Causal Risk Engine (Sparsity, Staleness, Conflict, Safety)
            │
            ▼
 3. STAKEHOLDER INTERFACES & CHANNELS
    ├── Web UI (Plant Manager, CFO Risk Map, 3D Recovery Run in Three.js)
    ├── Mobile & Voice Channels (Twilio Inbound Calls, WhatsApp Interactive Bot)
    └── Multilingual Indian Translation (Hindi, Tamil, Kannada, Telugu, Marathi)
            │
            ▼
 4. ALGORAND x402 AGENTIC ECONOMY
    ├── Gated Endpoints: GET /x402/vault/{id}/brief & /explain
    ├── Autonomous Agent Discovery (HTTP 402 Machine-Readable Terms)
    ├── Spend Policy Guard (Per-call limits, Daily budget caps, Whitelists)
    ├── On-Chain Settlement (py-algorand-sdk Native TestNet Settlement)
    └── Section 9.6 Verifier Payout (Treasury rewards peer auditors on-chain)
+-----------------------------------------------------------------------------------+
```

---

## Core System Architecture & Modules

```
DeadMind/
├── backend/
│   ├── vault/
│   │   ├── x402_middleware.py     # RFC x402 Algorand payment gate & facilitator bridge
│   │   ├── brief_generator.py     # AI Handoff Brief synthesizer (Glossary, Risks, Summary)
│   │   ├── task_explainer.py      # Dynamic Mermaid flowchart & blocker extractor
│   │   ├── git_ingestion.py       # Git commit history & PR context extraction
│   │   ├── doc_ingestion.py       # DOCX, XLSX, EML multi-modal parsers
│   │   ├── pptx_ingestion.py      # Technical slide deck ingestion
│   │   ├── translation_provider.py# Bhashini / Sarvam AI Indian language translation
│   │   ├── voice_provider.py      # Twilio voice telephony integration
│   │   ├── whatsapp_provider.py   # WhatsApp interactive webhook provider
│   │   ├── rbac.py                # Role-Based Access Control matrix
│   │   ├── routes.py              # Vault REST API & x402 endpoint routing
│   │   └── schemas.py             # Pydantic data schemas & contracts
│   ├── database.py                # SQLite WAL / PostgreSQL database models
│   ├── hybrid_retrieval.py        # Reciprocal Rank Fusion (BM25 + FAISS Dense Vectors)
│   ├── consensus.py               # 3-Way Multi-Expert Consensus & Dissent Engine
│   ├── uncertainty.py             # 4-Factor Uncertainty Scoring (Sparsity/Staleness/Disagreement/Causal)
│   ├── transcription.py           # Whisper speech-to-text audio processing
│   ├── llm.py                     # LLaMA-3.3-70B Inference + Deterministic Fallback
│   └── main.py                    # FastAPI application entrypoint
├── frontend/                      # React 18 + TypeScript + TailwindCSS + Three.js
├── research_agent_demo.py         # Autonomous Agent with Spend Policy Guard
├── run_steps_abcde.py             # Automated x402 End-to-End Settlement Verification
└── generate_demo_data.py          # Realistic heavy-industry plant knowledge base
```

---

## Detailed Feature Breakdown & Flow

### 1. Continuity Vault & Multi-Modal Ingestion
When a senior engineer prepares for retirement, DeadMind ingests all facets of their historical footprint:
* **Documents:** Formatted `.docx` procedures, `.xlsx` calibration logs, `.pptx` training decks, `.eml` shift communications.
* **Scanned P&IDs:** Scanned schematics parsed with OCR.
* **Git Commit History:** `POST /vault/{id}/ingest/git` extracts commit histories, commit messages, and PR discussions to reconstruct the engineering timeline.
* **AI Handoff Brief:** Produces an executive summary, a plain-English jargon glossary, and an **Unresolved Risks Checklist** (e.g. `TURBINE-04 governor lag overdue for overhaul`).

### 2. Role-Aware Semantic Querying
A breakthrough RAG capability that shifts cognitive framing depending on the requester's role:
* **Field Technician Query:** *"What is the cold startup procedure for B-101?"*  
  -> Tactical checklist: Valve tag numbers (`B-101-V12`), burner purge timing, safety interlocks.
* **Finance / CFO Query:** *(Same question)*  
  -> Financial risk analysis: Boiler warm-up fuel consumption, thermal fatigue impact, and Rs 40-60 Lakhs downtime risk.

### 3. In-Flight Task Explainer & 3D Recovery Run
* **DAG Flowchart:** Decomposes in-flight tasks into dynamic **Mermaid.js flowcharts** highlighting completed green steps, active yellow blockers, and pending sign-offs.
* **Cross-Domain Dependencies:** Identifies inter-departmental bottlenecks (e.g. *"Blocks DCS Automation upgrade"*).
* **3D Recovery Run:** An interactive Three.js plant simulator where incoming replacement engineers explore physical equipment nodes to recover context clues.

### 4. Multi-Expert Consensus & Dissent Engine
* Queries multiple preserved digital twins simultaneously (e.g., *Rajan Sharma*, *Amit Patel*, *Vikram Sen*).
* Synthesizes points of agreement and **explicitly flags dissenting engineering opinions** so plant managers understand diverging operational strategies.

### 5. Mathematical Uncertainty Scoring
Every AI response is evaluated on 4 quantifiable risk dimensions:
`Risk Score = w1 * Sparsity + w2 * Staleness + w3 * Disagreement + w4 * Causal Risk`
* **Sparsity:** Lack of supporting documentation density.
* **Staleness:** Years elapsed since the last relevant shift entry.
* **Disagreement:** Conflict among historical operator logs.
* **Causal Risk:** Proximity to high-hazard equipment interlocks.

---

## Algorand & x402 Agentic Micropayment Protocol

```
+--------------------------------------------------------------------------------+
|                        CLEAN 3-PARTY WALLET TOPOLOGY                           |
+--------------------------------------------------------------------------------+

 [ Autonomous Agent ] --- Pays 0.01 ALGO ---> [ Platform Payment Gate ]
 (Q7AIBAEJ...ZWGI)                            (AB7CDOEJ...XY4IUY)
                                                        |
                                                        v
 [ Peer Verifier ]   <--- Rewards 0.01 ALGO --- [ Platform Treasury ]
 (Auditor Wallet)                                (NFLTBJK...X7DE)
+--------------------------------------------------------------------------------+
```

### 1. The Machine-to-Machine HTTP 402 Flow
1. **Agent Request:** An external autonomous agent queries `GET /x402/vault/1/brief`.
2. **HTTP 402 Challenge:** The platform responds with machine-readable payment terms:
   ```json
   {
     "x402Version": 1,
     "error": "X402 Payment Required",
     "accepts": [{
       "scheme": "exact",
       "network": "algorand-testnet",
       "maxAmountRequired": "10000",
       "resource": "http://localhost:8000/x402/vault/1/brief",
       "description": "DeadMind Continuity Vault — AI agent access to expert handoff briefs",
       "mimeType": "application/json",
       "payTo": "AB7CDOEJ2CAO5U4MYT4BG7G5ARW65BJPEPHLLI2BQ5HW653UYIM3XY4IUY",
       "requiredDeadlineSeconds": 300,
       "facilitator": "https://x402.goplausible.xyz/facilitate"
     }]
   }
   ```
3. **Spend Policy Guard:** The agent's internal safety guard validates:
   * Is `scheme == "exact"`?
   * Is `network == "algorand-testnet"`?
   * Is `maxAmountRequired <= max_cost_per_call`?
   * Is total spend within the daily budget limit?
4. **On-Chain Settlement:** The agent signs and broadcasts a payment transaction using `py-algorand-sdk`.
5. **Cryptographic Proof (X-PAYMENT):** The agent retries with `X-PAYMENT: <base64-payment-token>` and receives `200 OK` with the full Continuity Brief.

### 2. Section 9.6 — Verifier Payout Treasury
When a human peer engineer audits and verifies an AI brief, the platform calls `POST /api/x402/verifier-payout`:
* The platform treasury (`ALGORAND_PAYOUT_MNEMONIC`) broadcasts a `10,000 microALGO` micro-reward to the verifier's Algorand wallet.
* Returns a permanent transaction ID checkable on Pera Explorer:  
  `https://testnet.explorer.perawallet.app/tx/<TXN_ID>`

---

## Reliability & Fault-Tolerance Engineering

| Potential Failure Mode | DeadMind Architectural Safeguard |
| :--- | :--- |
| **x402 Facilitator Timeout / Down** | Custom ASGI middleware implements strict 10s socket timeout and returns clean `HTTP 503` JSON payload (zero server crashes). |
| **Invalid / Spoofed Payment Token** | Middleware validates cryptographic headers against facilitator; rejects with `402` or `503`. |
| **Offline LLM / API Rate Limit** | Deterministic high-accuracy fallback templates return structured briefs and citations instantly without external API dependencies. |
| **Missing Treasury Keys** | Verifier payout route checks environment variables upfront and returns clean `503` with actionable setup guidance. |

---

## Verification & Test Results

* **Pytest Integration Suite:** **24/24 tests passed (100%)**
  ```text
  backend/tests/test_chat_integration.py ..         [  8%]
  backend/tests/test_retrieval.py ..                [ 16%]
  backend/tests/test_transcription.py .             [ 20%]
  backend/tests/test_uncertainty.py .               [ 25%]
  backend/tests/test_vault.py ..................    [100%]
  ================ 24 passed in 46.79s ================
  ```
* **Interactive Test Scripts:**
  * `python run_steps_abcde.py` — Runs the full 5-stage pre-submission settlement audit.
  * `python research_agent_demo.py` — Executes the Autonomous Research Agent + Spend Policy Guard flow.

---

## Summary Matrix

| Metric | Target | DeadMind v2.0 Actual |
| :--- | :---: | :---: |
| **API Endpoints Tested** | 100% | 100% Passing (`/vault/*`, `/x402/*`, `/api/*`) |
| **x402 Protocol Compliance** | RFC x402 | 100% Machine-Readable 402 JSON |
| **Settlement Layer** | Algorand TestNet | Pure `py-algorand-sdk` Native Settlement |
| **Agent Safety** | Spend Policy Guard | Per-call, Daily Budget, & Network Rules |
| **Dual-Sided Economy** | Inbound + Outbound | Autonomous Agent Payer + Verifier Payout Treasury |
