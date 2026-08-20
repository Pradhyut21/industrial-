# 📐 DeadMind Architecture — Industrial Continuity Platform

## 1. System Overview

DeadMind is an enterprise Industrial Knowledge Intelligence platform designed to bridge the heavy industry retirement cliff. Built on a hybrid RAG (Retrieval-Augmented Generation) core, DeadMind integrates multi-modal document intelligence, NLP entity coreference resolution, domain-grounded cognitive expert modeling, and multilingual telephony.

```mermaid
graph TB
    subgraph UI["Frontend Layer (React 19 + TanStack + Three.js)"]
        UI1[CFO Plant Map & Risk Simulator - /]
        UI2[Field Technician Copilot - /copilot]
        UI3[Plant Head SOP Auditor - /audit]
        UI4[Continuity Vault - /vault]
        UI5[Task Explainer & 3D Recovery Run - /game]
    end

    subgraph API["FastAPI Application Gateway"]
        GW[FastAPI Router & RBAC Middleware]
        SSE[Server-Sent Events Streaming Engine]
    end

    subgraph VaultMod["Continuity Vault Services (v2)"]
        VG[Brief Generator - Groq LLaMA 3.3]
        TE[Task Explainer & Mermaid Synthesizer]
        VP[Twilio Voice & WhatsApp Webhooks]
        TP[Bhashini / Sarvam Indic Translation]
        DI[Multi-Format Ingestion: PPTX / DOCX / XLSX / Git]
    end

    subgraph CoreRAG["Hybrid RAG Core Engine"]
        NLP[spaCy NER & Fuzzy Coreference Resolver]
        BM25[Rank-BM25 Keyword Index]
        FAISS[FAISS Vector Store / PgVector]
        RRF[Reciprocal Rank Fusion - RRF]
        RERANK[ms-marco Cross-Encoder Neural Reranker]
        LLM[Groq LLaMA-3.3-70B Cognitive Engine]
        UNCERT[Uncertainty & Risk Estimator]
    end

    subgraph DataLayer["Storage & Persistence"]
        DB[(SQLite WAL / PostgreSQL + pgvector)]
        CACHE[(Redis Distributed Cache / Memory Cache)]
    end

    UI --> GW
    GW --> VaultMod
    GW --> CoreRAG
    VaultMod --> CoreRAG
    CoreRAG --> DataLayer
    CoreRAG --> SSE
    SSE --> UI
```

---

## 2. Core Data Flow Pipelines

### 2.1 Multi-Modal Ingestion Pipeline
```mermaid
sequenceDiagram
    participant User as Operator / Admin
    participant Ingest as backend/ingestion.py
    participant OCR as OCR / CV Parser
    participant NLP as spaCy + Coreference
    participant DB as SQLite / Postgres
    participant Store as Vector Store & BM25

    User->>Ingest: Upload File / Git Commit / Voice Note
    alt Scanned PDF or Image
        Ingest->>OCR: Tesseract OCR + OpenCV P&ID localization
        OCR-->>Ingest: Extracted Text & Bounding Boxes
    else Office Document
        Ingest->>Ingest: python-pptx / docx / openpyxl parser
    end
    Ingest->>NLP: Extract entities (Equipment tags, failure codes, domains)
    NLP->>NLP: Fuzzy collapse aliases ("Boiler 101" -> "B-101")
    Ingest->>DB: Insert into documents table
    Ingest->>Store: Index dense embedding (all-MiniLM-L6-v2) & BM25 tokens
    Ingest-->>User: Ingestion confirmation with resolved tags
```

---

### 2.2 Hybrid Retrieval Fusion (RRF) & Reranking
Standard keyword search fails on operational paraphrasing (e.g., *"rattling suction noise"* vs *"cavitation signature"*), while pure dense vector search struggles with exact equipment tags (`P-302`, `B-101-V12`). DeadMind combines both via **Reciprocal Rank Fusion (RRF)**:

$$RRF\_Score(d) = \sum_{m \in \{BM25, FAISS\}} \frac{1}{k + Rank_m(d)} \quad (k = 60)$$

Top $N$ candidates from RRF are fed into a **Cross-Encoder Neural Reranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`) which scores full cross-attention between query and passage, providing an **+8% precision gain** over keyword baselines.

---

### 2.3 Role-Aware Knowledge Adaptation
```mermaid
flowchart LR
    Q[Incoming User Query] --> RET[Hybrid Retrieval + Reranking]
    RET --> CTX[Grounded Context Passages]
    CTX --> PROMPT{Requester Role Evaluation}
    
    PROMPT -->|Field Technician| R1[Tactical, step-by-step equipment instructions & safety checks]
    PROMPT -->|Finance / Executive| R2[Plain-English business impact, downtime risk & ₹ Lakhs financial exposure]
    PROMPT -->|Safety / Plant Head| R3[Clause-by-clause SOP compliance & violation flags]
    
    R1 --> OUT[Streaming Response with Verifiable Citations]
    R2 --> OUT
    R3 --> OUT
```

---

### 2.4 Multilingual Telephony Pipeline (Twilio + Indic Translation)
```mermaid
sequenceDiagram
    participant Phone as Technician (Phone / WhatsApp)
    participant Twilio as Twilio Gateway
    participant Webhook as /voice/inbound or /whatsapp/inbound
    participant Trans as Bhashini / Sarvam AI
    participant RAG as DeadMind Hybrid RAG
    participant LLM as LLaMA-3.3-70B

    Phone->>Twilio: Inbound call or WhatsApp message in Hindi/Kannada/Tamil
    Twilio->>Webhook: Webhook payload with SpeechResult / Text Body
    Webhook->>Trans: Translate Indic speech transcript to English
    Trans-->>Webhook: English query text
    Webhook->>RAG: Retrieve grounded plant documentation
    RAG-->>LLM: Synthesize role-tailored expert twin answer
    LLM-->>Webhook: Grounded answer in English
    Webhook->>Trans: Translate response back to caller's language
    Trans-->>Webhook: Localized Indic text / audio speech
    Webhook-->>Twilio: Return TwiML Voice Response or WhatsApp reply
    Twilio-->>Phone: Clear, localized voice/text troubleshooting instructions
```

---

## 3. Database Schema (Entity-Relationship Blueprint)

```
┌────────────────────────────────────────────────────────────────────────┐
│                              DATA SCHEMAS                              │
├──────────────────────────────┬─────────────────────────────────────────┤
│ 1. engineers                 │ 5. continuity_briefs                    │
│    - name (PK)               │    - id (PK)                            │
│    - role, status            │    - person_id (FK -> persons)          │
│    - retirement_year         │    - summary_text                       │
│    - risk_score              │    - unresolved_items (JSON)            │
│    - cognitive_fingerprint   │    - glossary (JSON)                    │
│                              │    - verification_status, verified_by   │
├──────────────────────────────┼─────────────────────────────────────────┤
│ 2. documents                 │ 6. tasks (In-Flight Task Explainer)     │
│    - id (PK)                 │    - id (PK)                            │
│    - title, content          │    - person_id (FK -> persons)          │
│    - engineer_author         │    - title, project_name                │
│    - equipment_tag           │    - status (done/in_progress/blocked)  │
│    - doc_type, upload_date   │    - flowchart_mermaid                  │
│    - freshness_decay_rate    │    - percent_complete, deadline         │
├──────────────────────────────┼─────────────────────────────────────────┤
│ 3. persons (Continuity Vault)│ 7. call_sessions (Telephony Log)        │
│    - id (PK)                 │    - id (PK), person_id                 │
│    - name, role, domain      │    - channel (voice/whatsapp)           │
│    - status (active/departed)│    - language, transcript               │
│    - exit_date, exit_reason  │    - response_text, duration_seconds    │
├──────────────────────────────┼─────────────────────────────────────────┤
│ 4. vault_artifacts           │ 8. access_grants (RBAC Enforcement)     │
│    - id (PK), person_id (FK) │    - id (PK)                            │
│    - artifact_type, raw_data │    - person_vault_id (FK -> persons)    │
│    - sensitivity_level       │    - granted_to_role                    │
│    - doc_id (FK -> documents)│    - sensitivity_level_allowed          │
└──────────────────────────────┴─────────────────────────────────────────┘
```

---

## 4. Dual-Mode Deployment Architecture

DeadMind is built with a **production-ready dual-mode switch**:

```
                         ┌────────────────────────────────────┐
                         │       Dual-Mode Environment        │
                         └─────────────────┬──────────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  ▼                                                 ▼
        ┌───────────────────┐                             ┌───────────────────┐
        │     DEMO MODE     │                             │  PRODUCTION MODE  │
        │ (Default, Zero-Env│                             │(Enterprise Cluster│
        ├───────────────────┤                             ├───────────────────┤
        │ • SQLite (WAL)    │                             │ • Postgres+pgvector
        │ • In-memory FAISS │                             │ • Shared pgvector 
        │ • In-memory Cache │                             │ • Redis Cluster   │
        │ • Sync Ingestion  │                             │ • Celery Workers  │
        │ • Single process  │                             │ • Nginx LB Replicas
        └───────────────────┘                             └───────────────────┘
```

### Activating Production Mode
Set the standard connection strings in your environment or via Docker Compose:
```bash
export DATABASE_URL=postgresql://deadmind:deadmind@localhost:5432/deadmind
export REDIS_URL=redis://localhost:6379/0
export CELERY_BROKER_URL=redis://localhost:6379/1
python run.py
```
*The database layer (`backend/db_engine.py`) and vector store (`backend/vector_store.py`) automatically route queries to the enterprise cluster without any code modifications.*
