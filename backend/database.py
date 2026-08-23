import sqlite3
import os
from backend.db_engine import USE_POSTGRES, ensure_pgvector_schema

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "deadmind.db")

def get_db_connection():
    if USE_POSTGRES:
        raise NotImplementedError("Postgres wiring is scaffolded in db_engine.py but requires query rewrites from SQLite to use SQLAlchemy.")
        
    conn = sqlite3.connect(DB_PATH, timeout=60.0, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=60000;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if USE_POSTGRES:
        ensure_pgvector_schema()
        return
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Engineers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS engineers (
        name TEXT PRIMARY KEY,
        role TEXT,
        status TEXT, -- 'Active', 'Retired', 'Resigned'
        retirement_date TEXT,
        retirement_year INTEGER,
        avatar TEXT,
        risk_score INTEGER, -- 1-100
        specialties TEXT, -- Comma-separated domains
        
        -- Cognitive Fingerprint (0-100)
        cognitive_systematic INTEGER DEFAULT 50,
        cognitive_intuitive INTEGER DEFAULT 50,
        cognitive_mechanical INTEGER DEFAULT 50,
        cognitive_electrical INTEGER DEFAULT 50,
        cognitive_instrumentation INTEGER DEFAULT 50,
        cognitive_process INTEGER DEFAULT 50
    )
    """)
    
    # 2. Documents (with Half-Life metrics)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        engineer_author TEXT,
        upload_date TEXT,
        doc_type TEXT, -- 'Maintenance Log', 'Inspection Report', 'Voice Note', 'P&ID'
        equipment_tag TEXT, -- e.g., 'B-101', 'P-302'
        failure_code TEXT, -- e.g., 'F-402'
        confidence REAL,
        
        -- Document freshness indicators
        age_years INTEGER DEFAULT 0,
        reference_count INTEGER DEFAULT 0,
        contradiction_count INTEGER DEFAULT 0,
        hardware_generation TEXT DEFAULT 'Gen 1',
        
        FOREIGN KEY (engineer_author) REFERENCES engineers(name)
    )
    """)

    # 3. Voice Notes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS voice_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        engineer TEXT,
        audio_base64 TEXT,
        transcript TEXT,
        timestamp TEXT,
        FOREIGN KEY (engineer) REFERENCES engineers(name)
    )
    """)

    # 4. Equipment Risk Nodes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS equipment_nodes (
        tag TEXT PRIMARY KEY,
        name TEXT,
        process_area TEXT,
        coordinates_x REAL,
        coordinates_y REAL,
        criticality TEXT, -- 'High', 'Medium', 'Low'
        downtime_cost INTEGER DEFAULT 5000000 -- Cost of failure in Rupees (e.g. 50 Lakhs)
    )
    """)

    # 5. Cross-Expert Conflicts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_tag TEXT,
        title TEXT,
        expert_a TEXT,
        expert_b TEXT,
        rec_a TEXT,
        rec_b TEXT,
        outcome_a TEXT,
        outcome_b TEXT,
        ai_recommendation TEXT,
        confidence INTEGER
    )
    """)

    # 6. Temporal Causal Links
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS causal_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_tag TEXT,
        parent_event TEXT,
        child_event TEXT,
        is_prediction INTEGER DEFAULT 0, -- 0 = historic, 1 = predicted future
        description TEXT
    )
    """)

    # 7. Semantic Linguistic Drift History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS semantic_drift (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_tag TEXT,
        year INTEGER,
        phrase TEXT,
        vector_x REAL,
        vector_y REAL,
        severity_index REAL
    )
    """)

    # 8. Counterfactual failure propagation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS counterfactuals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_tag TEXT,
        title TEXT,
        intervention TEXT,
        cost_avoided_crore REAL,
        consequences TEXT -- Semicolon-separated statements
    )
    """)

    # 9. Cross-Document Coreferences
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coreference_map (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        standard_name TEXT,
        alias_name TEXT,
        entity_type TEXT, -- 'Equipment', 'Person', 'Phenomenon'
        confidence INTEGER
    )
    """)

    # 10. Organisational Network Metrics
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS org_network (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        engineer TEXT,
        centrality REAL,
        dependencies TEXT, -- Comma-separated names
        domains_affected INTEGER,
        resilience_drop REAL
    )
    """)

    # 11. Procedural compliance shadow auditing
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sop_compliance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sop_id TEXT,
        step_number INTEGER,
        step_desc TEXT,
        compliance_rate INTEGER, -- Percentage 0-100
        workaround_detected TEXT
    )
    """)

    # 12. Document Feedback
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER,
        query TEXT,
        is_positive INTEGER,
        timestamp TEXT,
        FOREIGN KEY (doc_id) REFERENCES documents(id)
    )
    """)

    # 13. Regulatory Requirements Registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS regulatory_requirements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,           -- 'OISD-STD-118', 'Factory Act 1948 Sec 87', 'PESO Rule 34', 'CPCB Norm', ...
        clause_id TEXT,        -- e.g. 'OISD-118-7.3.2'
        clause_text TEXT,      -- normative requirement text, plain English paraphrase
        applies_to_equipment TEXT,   -- comma-separated equipment tags or 'ALL'
        applies_to_doc_type TEXT,    -- 'SOP', 'Inspection Report', 'Maintenance Log', 'ALL'
        criticality TEXT,       -- 'Statutory', 'Advisory'
        review_frequency_months INTEGER
    )
    """)

    # 14. Compliance Gaps (computed + cached results of the mapper)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS compliance_gaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requirement_id INTEGER,
        equipment_tag TEXT,
        gap_type TEXT,          -- 'Missing Evidence', 'Stale Evidence', 'Contradicted', 'Compliant'
        evidence_doc_id INTEGER,
        confidence REAL,
        detected_on TEXT,
        severity TEXT,          -- 'Critical', 'Major', 'Minor'
        recommended_action TEXT,
        FOREIGN KEY (requirement_id) REFERENCES regulatory_requirements(id),
        FOREIGN KEY (evidence_doc_id) REFERENCES documents(id)
    )
    """)

    # 15. Incidents / Near-Misses (feeds the pattern engine)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_tag TEXT,
        incident_type TEXT,     -- 'Incident', 'Near-Miss', 'Audit Finding', 'Non-Conformance'
        description TEXT,
        reported_by TEXT,
        reported_on TEXT,
        severity TEXT           -- 'High', 'Medium', 'Low'
    )
    """)

    # 16. Detected Failure Patterns (output of clustering incidents/near-misses)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS failure_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_summary TEXT,
        equipment_tags TEXT,     -- comma-separated, all equipment showing the pattern
        member_incident_ids TEXT,-- comma-separated incident ids in this cluster
        confidence REAL,
        first_seen TEXT,
        last_seen TEXT,
        recommended_warning TEXT,
        status TEXT DEFAULT 'Active'  -- 'Active', 'Acknowledged', 'Resolved'
    )
    """)

    # ── CONTINUITY INTELLIGENCE PLATFORM — ADDITIVE MIGRATION ──────────────

    # 17. Persons (departing/departed employees)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT,
        domain TEXT,
        department TEXT,
        status TEXT DEFAULT 'active',  -- 'active', 'departed'
        exit_date TEXT,
        exit_reason TEXT,              -- 'retirement', 'resignation', 'transfer', 'death'
        created_at TEXT
    )
    """)

    # 18. Vault Artifacts (per-person captured knowledge units)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vault_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        artifact_type TEXT NOT NULL,  -- 'git_commit', 'pptx', 'docx', 'email', 'log'
        source_ref TEXT,              -- repo URL, file path, email subject, etc.
        raw_content TEXT,
        plain_language_summary TEXT,
        sensitivity_level TEXT DEFAULT 'public',  -- 'public', 'department-restricted', 'confidential'
        domain TEXT,
        ingested_at TEXT,
        doc_id INTEGER,               -- FK to documents table (after indexing into RAG pipeline)
        FOREIGN KEY (person_id) REFERENCES persons(id),
        FOREIGN KEY (doc_id) REFERENCES documents(id)
    )
    """)

    # 19. Continuity Briefs (AI-generated handoff documents)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS continuity_briefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL UNIQUE,  -- one active brief per person
        generated_at TEXT,
        summary_text TEXT,
        unresolved_items TEXT,   -- JSON array of strings
        glossary TEXT,           -- JSON object: {term: plain_english_definition}
        verification_status TEXT DEFAULT 'unverified',  -- 'unverified', 'verified'
        verified_by TEXT,
        verified_at TEXT,
        verifier_algorand_address TEXT,  -- Section 9.6: wallet address for payout
        FOREIGN KEY (person_id) REFERENCES persons(id)
    )
    """)

    # 20. Call Sessions (voice/WhatsApp interaction log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS call_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER,          -- nullable: call may be a general query, not person-specific
        channel TEXT NOT NULL,      -- 'voice', 'whatsapp'
        language TEXT DEFAULT 'en',
        transcript TEXT,
        response_text TEXT,
        started_at TEXT,
        duration_seconds REAL,
        FOREIGN KEY (person_id) REFERENCES persons(id)
    )
    """)

    # 21. Access Grants (RBAC per vault + sensitivity level)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS access_grants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_vault_id INTEGER NOT NULL,
        granted_to_role TEXT NOT NULL,
        sensitivity_level_allowed TEXT NOT NULL DEFAULT 'public',
        FOREIGN KEY (person_vault_id) REFERENCES persons(id)
    )
    """)

    # 22. Tasks (Task-Level Handoff Explainer)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        project_name TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'in_progress',  -- 'done', 'in_progress', 'blocked'
        flowchart_mermaid TEXT,
        percent_complete INTEGER DEFAULT 0,
        deadline TEXT,
        dependencies TEXT,  -- JSON list of {domain, team, relationship: 'blocks'|'blocked_by', note}
        created_at TEXT,
        FOREIGN KEY (person_id) REFERENCES persons(id)
    )
    """)

    # 23. Saved Chat Sessions (Field Copilot Troubleshooting Records)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        engineer_name TEXT,
        created_at TEXT,
        message_count INTEGER,
        summary TEXT,
        messages_json TEXT,
        tag TEXT
    )
    """)

    # 24. Agent Payments (Section 9.3 — x402 Algorand agent micropayment log)
    # Records every successful x402 machine-agent payment for vault access.
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER,           -- vault being accessed
        resource_url TEXT,           -- e.g. /x402/vault/1/brief
        payment_txn_id TEXT,         -- Algorand transaction ID (mainnet or testnet)
        amount_microalgo INTEGER,    -- amount paid in microALGO
        payer_address TEXT,          -- Algorand wallet address of the agent
        network TEXT DEFAULT 'testnet',
        paid_at TEXT,
        facilitator_response TEXT,   -- raw JSON from GoPlausible facilitator
        FOREIGN KEY (person_id) REFERENCES persons(id)
    )
    """)

    # 25. Verifier Payouts (Section 9.6 — peer reviewer reward on-chain)
    # Records every payout to a brief verifier's Algorand wallet.
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verifier_payouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER,           -- person whose brief was verified
        verifier_name TEXT,
        verifier_wallet_address TEXT,
        txn_id TEXT,                 -- Algorand transaction ID
        amount_microalgo INTEGER,
        network TEXT DEFAULT 'testnet',
        paid_at TEXT,
        FOREIGN KEY (person_id) REFERENCES persons(id)
    )
    """)

    # 26. Conversations (General-Purpose Organizational Memory Chat Threads)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        role TEXT DEFAULT 'Field Technician',
        title TEXT NOT NULL,
        summary TEXT,
        selected_experts TEXT, -- JSON array e.g. ["Rajan Sharma"] or ["auto"]
        relevant_entities TEXT, -- JSON array e.g. ["P-302", "B-101"]
        is_favorite INTEGER DEFAULT 0,
        tag TEXT DEFAULT 'General',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 27. Chat Messages (Multi-turn conversational messages with rich evidence & consensus)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user', 'assistant', 'system'
        content TEXT NOT NULL,
        structured_data_json TEXT, -- Full structured JSON
        timestamp TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
    """)

    # ── USAGE ACCOUNTING & x402 FINANCIAL SETTLEMENT DOMAINS ───────────────────

    # 28. Usage Accounts (Company Allowance & Employee Allocations)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usage_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        company_id TEXT DEFAULT 'INDO-POWER-PLANT-01',
        allocated_credits INTEGER DEFAULT 1000,
        used_credits INTEGER DEFAULT 0,
        balance_credits INTEGER DEFAULT 1000,
        overage_count INTEGER DEFAULT 0,
        total_overage_microusdc INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 29. Usage Allocations (Periodic Allowance Grants from Company Pool)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usage_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        allocated_credits INTEGER NOT NULL,
        source TEXT DEFAULT 'Company Funded Pool',
        granted_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES usage_accounts(id)
    )
    """)

    # 30. Usage Events (Continuous Granular Metering Log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usage_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        conversation_id TEXT,
        service_type TEXT NOT NULL, -- 'chat', 'rag_retrieval', 'expert_consultation', 'consensus_synthesis', 'uncertainty_analysis', 'agent_query'
        query_tokens INTEGER DEFAULT 0,
        retrieval_docs INTEGER DEFAULT 0,
        experts_consulted INTEGER DEFAULT 0,
        consensus_calculated INTEGER DEFAULT 0,
        uncertainty_calculated INTEGER DEFAULT 0,
        credits_consumed INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        execution_time_ms REAL DEFAULT 0,
        timestamp TEXT NOT NULL
    )
    """)

    # 31. Usage Ledger (Double-Entry Balance Audit Log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usage_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        delta_credits INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        entry_type TEXT NOT NULL, -- 'allocation', 'consumption', 'x402_topup', 'adjustment'
        description TEXT NOT NULL,
        reference_id TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES usage_accounts(id)
    )
    """)

    # 32. Payment Requests (x402 Micropayment Challenges)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        resource_url TEXT NOT NULL,
        required_credits INTEGER NOT NULL,
        overage_credits INTEGER NOT NULL,
        price_microusdc INTEGER NOT NULL,
        challenge_nonce TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'settled', 'expired'
        created_at TEXT NOT NULL,
        settled_at TEXT
    )
    """)

    # 33. Payment Transactions (On-chain verified settlements)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_request_id TEXT,
        txn_id TEXT NOT NULL UNIQUE,
        payer_address TEXT NOT NULL,
        amount_microusdc INTEGER NOT NULL,
        network TEXT DEFAULT 'testnet',
        asset_id INTEGER DEFAULT 10458941,
        settled_at TEXT NOT NULL,
        facilitator_response TEXT
    )
    """)

    # 34. x402 Settlements (Platform-wide Settlement Audit Log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS x402_settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        service_tier TEXT NOT NULL,
        credits_added INTEGER NOT NULL,
        amount_microusdc INTEGER NOT NULL,
        amount_usdc_formatted TEXT NOT NULL,
        txn_id TEXT NOT NULL,
        payer_address TEXT NOT NULL,
        lora_explorer_url TEXT NOT NULL,
        settled_at TEXT NOT NULL
    )
    """)

    # 35. Company Pools (Enterprise-level credit pool & allowance governance)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS company_pools (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL UNIQUE,
        company_name TEXT NOT NULL,
        total_pool_credits INTEGER DEFAULT 100000,
        allocated_credits INTEGER DEFAULT 0,
        consumed_credits INTEGER DEFAULT 0,
        available_unallocated_credits INTEGER DEFAULT 100000,
        reconciled_returned_credits INTEGER DEFAULT 0,
        current_period_name TEXT DEFAULT 'August 2026',
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 36. Period Reconciliations (Unused credits return to company pool)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS period_reconciliations (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        period_name TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        total_allocated INTEGER NOT NULL,
        total_consumed INTEGER NOT NULL,
        total_unused_returned INTEGER NOT NULL,
        total_overage_events INTEGER NOT NULL,
        total_x402_settlement_microusdc INTEGER NOT NULL,
        reconciled_by TEXT DEFAULT 'Plant Operations Admin',
        reconciled_at TEXT NOT NULL,
        status TEXT DEFAULT 'CLOSED'
    )
    """)

    # 37. Reimbursement Policies (Corporate governance rules for employee overage repayment)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reimbursement_policies (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL UNIQUE,
        max_reimbursement_per_employee_usdc REAL DEFAULT 100.0,
        max_daily_overage_usdc REAL DEFAULT 20.0,
        max_monthly_overage_usdc REAL DEFAULT 150.0,
        auto_approval_threshold_usdc REAL DEFAULT 5.0,
        require_receipt BOOLEAN DEFAULT 0,
        allowed_services TEXT DEFAULT 'all',
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 38. Reimbursement Requests (Employee-paid x402 overages queued for corporate reimbursement)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reimbursement_requests (
        id TEXT PRIMARY KEY,
        request_number TEXT NOT NULL UNIQUE,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        company_id TEXT NOT NULL,
        payment_transaction_id TEXT NOT NULL,
        txn_id TEXT NOT NULL,
        amount_usdc REAL NOT NULL,
        amount_microusdc INTEGER NOT NULL,
        credits_covered INTEGER NOT NULL,
        service TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING_REIMBURSEMENT', -- 'PENDING_REIMBURSEMENT', 'AUTO_APPROVED', 'APPROVED', 'REJECTED', 'REIMBURSED'
        notes TEXT,
        payer_address TEXT NOT NULL,
        reviewer_id TEXT,
        reviewed_at TEXT,
        reimbursed_at TEXT,
        reimbursement_payout_txn_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 39. Reimbursement Transactions (Corporate payout execution ledger)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reimbursement_transactions (
        id TEXT PRIMARY KEY,
        reimbursement_request_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        payout_method TEXT DEFAULT 'corporate_payroll_credit', -- 'corporate_payroll_credit', 'direct_usdc_payout', 'expense_account'
        payout_amount_usdc REAL NOT NULL,
        payout_reference TEXT,
        processed_by TEXT NOT NULL,
        processed_at TEXT NOT NULL,
        status TEXT DEFAULT 'COMPLETED'
    )
    """)

    # 40. Platform Base Costs (Flow A: Separate Infrastructure & Baseline AI Cost Tracking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS platform_base_costs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        period_name TEXT NOT NULL,
        cloud_infra_cost_usd REAL DEFAULT 420.0,
        database_cost_usd REAL DEFAULT 80.0,
        storage_cost_usd REAL DEFAULT 50.0,
        baseline_ai_cost_usd REAL DEFAULT 300.0,
        total_platform_cost_usd REAL DEFAULT 850.0,
        recorded_at TEXT NOT NULL
    )
    """)

    # Table 42: Troubleshooting Knowledge Base (Section 14)
    # Opt-in, attributed solution entries — never auto-published, always employee-confirmed.
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS troubleshooting_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_name TEXT NOT NULL,
        employee_domain TEXT DEFAULT 'general',
        raw_input TEXT NOT NULL,
        problem_summary TEXT,
        solution_summary TEXT,
        domain TEXT,
        tags TEXT,
        status TEXT DEFAULT 'pending_review',
        reuse_count INTEGER DEFAULT 0,
        submitted_at TEXT,
        published_at TEXT
    )
    """)

    # Additive ALTER TABLE for existing DBs: add columns if they don't exist
    try:
        cursor.execute("ALTER TABLE continuity_briefs ADD COLUMN verifier_algorand_address TEXT")
    except Exception:
        pass  # Column already exists — safe to ignore

    try:
        cursor.execute("ALTER TABLE continuity_briefs ADD COLUMN verification_txn_id TEXT")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE continuity_briefs ADD COLUMN content_hash TEXT")
    except Exception:
        pass

    conn.commit()

    # Auto-seed if engineers table is empty
    cursor.execute("SELECT COUNT(*) FROM engineers")
    count = cursor.fetchone()[0]
    if count == 0:
        auto_seed_db(conn)

    # Auto-seed Continuity Vault demo data if persons table is empty
    cursor.execute("SELECT COUNT(*) FROM persons")
    vault_count = cursor.fetchone()[0]
    if vault_count == 0:
        auto_seed_vault_demo(conn)
    else:
        # If persons exists but tasks table is empty, seed demo tasks for person 1
        cursor.execute("SELECT COUNT(*) FROM tasks")
        task_count = cursor.fetchone()[0]
        if task_count == 0:
            import datetime
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("SELECT id FROM persons LIMIT 1")
            p_row = cursor.fetchone()
            if p_row:
                seed_tasks_for_person(cursor, p_row[0], now_str)
                conn.commit()

    conn.close()

def auto_seed_db(conn):
    cursor = conn.cursor()
    print("[DeadMind] Database is empty. Seeding demo data...")
    
    # 1. Engineers
    engineers = [
        ("Rajan Sharma", "Senior Boiler & Turbine Lead", "Retired", "2026-03-15", 2026, "RS", 92, 
         "Boiler Operations, Steam Turbines, High Pressure Systems", 85, 20, 90, 30, 45, 80),
        ("Amit Patel", "Electrical Maintenance Lead", "Active", "2031-08-10", 2031, "AP", 45, 
         "Switchgears, Transformers, Power Distribution", 40, 85, 25, 92, 50, 40),
        ("Vikram Sen", "Instrumentation & Control Expert", "Active", "2033-05-12", 2033, "VS", 30, 
         "Control Valves, Loop Calibration, PLC Systems", 75, 55, 35, 45, 95, 70),
        ("T. Nair", "Rotating Equipment Specialist", "Active", "2028-04-01", 2028, "TN", 81, 
         "Pumps, Seals, Bearings, Vibration Trend Analysis", 78, 82, 95, 32, 50, 60),
        ("M. Pillai", "Process Veteran", "Active", "2026-09-15", 2026, "MP", 96, 
         "Distillation, Heat Exchange, Startup Procedures", 70, 95, 55, 35, 60, 99),
        ("R. Nayar", "Senior Instrument Systems Engineer", "Active", "2027-06-30", 2027, "RN", 88, 
         "Positioner Calibration, Signal Drift, Field Devices", 92, 45, 70, 40, 98, 75),
        ("S. Kulkarni", "High Pressure Safety Auditor", "Active", "2030-10-15", 2030, "SK", 55, 
         "Safety Valves, Relief Systems, Hazard Analysis", 90, 60, 60, 50, 80, 85),
        ("H. Mehta", "Auxiliary Systems Technician", "Active", "2029-12-31", 2029, "HM", 72, 
         "Compressors, Heat Exchangers, Auxiliary Steam", 65, 70, 85, 60, 55, 60),
        ("A. Joshi", "Automation & PLC Engineer", "Active", "2035-05-20", 2035, "AJ", 25, 
         "SCADA systems, Logic Controller, Network architecture", 95, 80, 40, 85, 90, 80)
    ]
    cursor.executemany("""
    INSERT INTO engineers (
        name, role, status, retirement_date, retirement_year, avatar, risk_score, specialties,
        cognitive_systematic, cognitive_intuitive, cognitive_mechanical, cognitive_electrical,
        cognitive_instrumentation, cognitive_process
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, engineers)

    # 2. Nodes
    nodes = [
        ("TURBINE-04", "Auxiliary Steam Turbine", "Utility Section", 200.0, 120.0, "High", 15000000),
        ("BOILER-2", "High-Pressure Boiler 2", "Utility Section", 500.0, 110.0, "High", 18000000),
        ("P-302", "Boiler Feedwater Pump A", "Feedwater Station", 320.0, 420.0, "High", 8000000),
        ("B-101", "Primary Steam Boiler", "Utility Section", 460.0, 140.0, "High", 12000000),
        ("V-205", "Low-Ambient Control Valve", "Feedwater Station", 650.0, 250.0, "Medium", 5000000),
        ("C-104", "Main Air Compressor", "Instrument Air Section", 180.0, 200.0, "High", 10000000),
        ("S-501", "Main Electrical Switchgear", "Power House", 750.0, 380.0, "High", 12000000),
        ("E-310", "Feed/Effluent HX", "Reaction Section", 560.0, 360.0, "Medium", 1800000),
        ("T-401", "Main Fractionator Column", "Distillation", 820.0, 460.0, "High", 20000000),
        ("D-220", "Reactor Knockout Drum", "Reaction Section", 660.0, 80.0, "Medium", 7800000),
        ("P-304", "Emergency Backup Pump", "Feedwater Station", 380.0, 480.0, "Medium", 6000000),
        ("H-102", "Primary Flue Gas Heater", "Utility Section", 580.0, 180.0, "Low", 4000000),
        ("V-206", "High-Pressure Safety Vessel", "Reaction Section", 700.0, 150.0, "High", 14000000),
        ("TURBINE-02", "Main Generator Turbine", "Power House", 850.0, 280.0, "High", 25000000)
    ]
    cursor.executemany("""
    INSERT INTO equipment_nodes (tag, name, process_area, coordinates_x, coordinates_y, criticality, downtime_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, nodes)

    # 3. Conflicts
    conflicts = [
        ("P-302", "Feedwater Pump P-302 Cavitation Correction", "Rajan Sharma", "Vikram Sen", 
         "Reduce pump suction throttling immediately by 15% and increase flow rate.",
         "Recalibrate the suction pressure gauge and check for air leaks in the seal housing.",
         "Resolved cavitation warning in 4 hours.",
         "Required 12 hours of testing; did not fully resolve sensor drift.",
         "Follow Rajan Sharma's suction throttling sequence first. It addresses the primary hydrodynamic pressure threshold directly, yielding 3x faster stabilization. Calibrate Vikram's sensor seals as a secondary preventive measure.",
         90),
        ("C-104", "Compressor C-104 Valve Chattering", "Amit Patel", "Rajan Sharma",
         "Bypass the electronic solenoid interlock and reset the PLC control cycle.",
         "Perform physical cleaning of the discharge check valve seat and replace mechanical springs.",
         "Bypassed solenoid in 2 hours but chattering recurred 3 days later.",
         "Completed mechanical rebuild in 8 hours. Resolved issue permanently.",
         "Follow Rajan Sharma's mechanical spring replacement guide. Amit's solenoid bypass is a temporary workaround that leads to premature mechanical wear and system recurrence.",
         87)
    ]
    cursor.executemany("""
    INSERT INTO conflicts (
        equipment_tag, title, expert_a, expert_b, rec_a, rec_b, outcome_a, outcome_b, ai_recommendation, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, conflicts)

    # 4. Causal Links
    causal_links = [
        ("B-101", "B-101 Boiler Bearing Wear (Rajan, 2016)", "P-302 Feedwater Cavitation (Vikram, 2018)", 0, 
         "Boiler discharge pressure fluctuations induced severe transient cavitation on the feedwater pump impeller."),
        ("B-101", "P-302 Feedwater Cavitation (Vikram, 2018)", "V-205 Control Valve Positioner Drift (Vikram, 2021)", 0,
         "Micro-vibrations from pump cavitation loosened positioner linkages on V-205 control valve over 3 years."),
        ("B-101", "V-205 Control Valve Positioner Drift (Vikram, 2021)", "C-104 Compressor Interlock Shutdown (PREDICTED, late 2026)", 1,
         "Drift in V-205 feedback loops under freezing ambient temperature causes secondary air line pressure drops, causing C-104 startup trips.")
    ]
    cursor.executemany("""
    INSERT INTO causal_links (equipment_tag, parent_event, child_event, is_prediction, description)
    VALUES (?, ?, ?, ?, ?)
    """, causal_links)

    # 5. Semantic Drift
    semantic_drift = [
        ("C-104", 2016, "Minor vibration noted on startup", 12.0, 15.0, 0.1),
        ("C-104", 2018, "Vibration within acceptable range", 20.0, 22.0, 0.2),
        ("C-104", 2020, "Vibration elevated, monitoring recommended", 42.0, 35.0, 0.5),
        ("C-104", 2022, "Persistent vibration, cause unclear", 65.0, 58.0, 0.7),
        ("C-104", 2024, "CRITICAL: vibration exceeding thresholds", 88.0, 80.0, 0.9),
        
        ("B-101", 2016, "Normal pressure levels observed", 10.0, 10.0, 0.0),
        ("B-101", 2019, "Boiler flue gas temp slightly high", 25.0, 18.0, 0.2),
        ("B-101", 2022, "Transient pressure spikes during night shifts", 48.0, 38.0, 0.4),
        ("B-101", 2025, "Accumulating carbon scaling in secondary superheater tubes", 78.0, 72.0, 0.7)
    ]
    cursor.executemany("""
    INSERT INTO semantic_drift (equipment_tag, year, phrase, vector_x, vector_y, severity_index)
    VALUES (?, ?, ?, ?, ?, ?)
    """, semantic_drift)

    # 6. Counterfactuals
    counterfactuals = [
        ("P-302", "Rajan's 2018 valve calibration on P-302", "Calibrated zero span feedback arm instead of standard loop reset", 2.3, 
         "P-302 cavitation would have progressed to complete rotor impeller seizure;Starved B-101 feedwater loop, triggering dry boiler thermal stress interlock;Forced 340 hours of high-pressure pipeline rebuilds (₹2.3 Cr downtime avoided)"),
        ("S-501", "Amit's 2024 switchgear grease on S-501", "Cleaned oxide layer and applied conductive thermal grease before monsoon", 1.1,
         "Busbar connection overheating would have escalated to switchgear substation fire;Shutdown of plant Utility section due to main switchgear offline;Forced backup diesel generator usage costing 15 Lakhs/day")
    ]
    cursor.executemany("""
    INSERT INTO counterfactuals (equipment_tag, title, intervention, cost_avoided_crore, consequences)
    VALUES (?, ?, ?, ?, ?)
    """, counterfactuals)

    # 7. Coreferences
    coreferences = [
        ("B-101 Primary Steam Boiler", "B-101", "Equipment", 98),
        ("B-101 Primary Steam Boiler", "Boiler 101", "Equipment", 95),
        ("B-101 Primary Steam Boiler", "the main boiler", "Equipment", 88),
        ("Rajan Sharma", "R. Sharma", "Person", 95),
        ("Rajan Sharma", "Rajan S.", "Person", 99),
        ("Feedwater Cavitation", "pump surge", "Phenomenon", 82),
        ("Feedwater Cavitation", "flow instability", "Phenomenon", 85),
        ("R. Nayar", "Nayar", "Person", 99),
        ("R. Nayar", "R. Nayar", "Person", 100),
        ("Senior Instrument Engineer", "R. Nayar", "Person", 90),
        ("BOILER-2", "Boiler 2", "Equipment", 97),
        ("TURBINE-04", "Aux Turbine", "Equipment", 94)
    ]
    cursor.executemany("""
    INSERT INTO coreference_map (standard_name, alias_name, entity_type, confidence)
    VALUES (?, ?, ?, ?)
    """, coreferences)

    # 8. Org Network
    network = [
        ("Vikram Sen", 0.89, "Rajan Sharma, Amit Patel", 3, 0.33),
        ("Rajan Sharma", 0.72, "Vikram Sen", 2, 0.24),
        ("Amit Patel", 0.45, "Vikram Sen", 1, 0.12),
        ("T. Nair", 0.65, "Rajan Sharma", 2, 0.20),
        ("M. Pillai", 0.82, "R. Nayar, Rajan Sharma", 4, 0.38),
        ("R. Nayar", 0.78, "Vikram Sen", 3, 0.30)
    ]
    cursor.executemany("""
    INSERT INTO org_network (engineer, centrality, dependencies, domains_affected, resilience_drop)
    VALUES (?, ?, ?, ?, ?)
    """, network)

    # 9. SOP Compliance
    compliance = [
        ("SOP-2019-047 (Boiler Startup)", 1, "Verify feedwater pump suction valves are open", 100, "None"),
        ("SOP-2019-047 (Boiler Startup)", 2, "Check mechanical positioner feedback arm alignment", 82, "Often verified visually rather than dial gauge calibration"),
        ("SOP-2019-047 (Boiler Startup)", 3, "Calibrate zero pressure baseline offsets", 34, "Skipped on warm startup to save 45 minutes; leads to sensor drift risk"),
        ("SOP-2019-047 (Boiler Startup)", 4, "Run two-engineer sign-off interlock check", 17, "Engineers consistently skip and perform Step 4 before Step 3. Rajan's custom sequence has 100% success rate.")
    ]
    cursor.executemany("""
    INSERT INTO sop_compliance (sop_id, step_number, step_desc, compliance_rate, workaround_detected)
    VALUES (?, ?, ?, ?, ?)
    """, compliance)

    # 13. Regulatory Requirements (representative subset — extend with real OISD/PESO text for production)
    regulatory_requirements = [
        ("OISD-STD-118", "OISD-118-7.3.2",
         "Pressure relief valves on high-pressure boilers shall be tested and re-certified at least once every 12 months.",
         "B-101,BOILER-2", "Inspection Report", "Statutory", 12),
        ("Factory Act 1948", "FACT-87-1",
         "Every hazardous process shall have a documented safe operating procedure reviewed at least every 24 months.",
         "ALL", "SOP", "Statutory", 24),
        ("PESO Rule 34", "PESO-34-2",
         "Static and rotating equipment handling flammable process fluids shall undergo vibration/leak inspection every 6 months.",
         "P-302,P-304,C-104,TURBINE-02,TURBINE-04", "Inspection Report", "Statutory", 6),
        ("CPCB Environmental Norm", "CPCB-ENV-9",
         "Flue gas emission monitoring reports for utility boilers shall be filed at least quarterly.",
         "B-101,BOILER-2", "Inspection Report", "Statutory", 3),
        ("OISD-STD-105", "OISD-105-4.1",
         "Electrical switchgear rooms shall have thermographic inspection records updated at least every 6 months.",
         "S-501", "Inspection Report", "Statutory", 6),
    ]
    cursor.executemany("""
    INSERT INTO regulatory_requirements (
        source, clause_id, clause_text, applies_to_equipment, applies_to_doc_type,
        criticality, review_frequency_months
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, regulatory_requirements)
    
    # 14. Incidents & Near-Misses
    incidents = [
        ("P-302", "Near-Miss", "Operator noticed unusual noise before cavitation alarm triggered; caught early.", "Shift Team B", "2023-02-10", "Medium"),
        ("P-304", "Near-Miss", "Backup pump showed early suction pressure drop similar to P-302's historic pattern.", "Shift Team A", "2024-05-02", "Medium"),
        ("C-104", "Incident", "Compressor valve chattering recurred 3 days after an electrical-only fix, consistent with earlier mechanical root cause.", "Amit Patel", "2019-04-25", "High"),
        ("S-501", "Audit Finding", "Thermography inspection interval exceeded 6 months before switchgear overheating was caught.", "Internal Audit", "2024-02-15", "High"),
        ("V-205", "Non-Conformance", "Positioner cold-weather drift reappeared at a different valve after being 'resolved' at V-205 in 2021.", "Vikram Sen", "2023-12-01", "Medium"),
    ]
    cursor.executemany("""
    INSERT INTO incidents (equipment_tag, incident_type, description, reported_by, reported_on, severity)
    VALUES (?, ?, ?, ?, ?, ?)
    """, incidents)

    # 10. Documents
    import datetime
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    documents = [
        ("Boiler Pressure Fluctuation Investigation - B-101", "EQUIPMENT: B-101 Primary Steam Boiler\nDATE: Aug 2016\nAUTHOR: Rajan Sharma (Senior Boiler & Turbine Lead)\n\nOBSERVATION:\nBoiler pressure fluctuating approximately 0.3 bar at 3am, with feedwater flow remaining stable.\n\nDIAGNOSIS & ACTIONS:\nI checked the feedwater control valve positioner calibration first, not the system setpoints.\nDiscovered feedwater control valve positioner drift at low ambient temperatures during the night shift.\nCalibrated the positioner feedback arm and lubricated the mechanical linkages. Pressure stabilized post-calibration.\n\nRECOMMENDATION:\nAlways perform verification of mechanical positioner alignment before adjusting digital controller loop gains.", "Rajan Sharma", now, "Maintenance Log", "B-101", "None", 0.95, 10, 6, 2, "Gen 1"),
        ("Turbine Blade Vibration Incident Report - B-101", "EQUIPMENT: B-101 Primary Steam Boiler / Steam Turbine Loop\nDATE: Jan 2018\nAUTHOR: Rajan Sharma (Senior Boiler & Turbine Lead)\n\nOBSERVATION:\nDuring startup, minor pressure fluctuations of 0.3 bar were noted, followed by high vibration alerts on the auxiliary steam line.\n\nDIAGNOSIS & RESOLUTION:\nFeedwater flow was reported as stable by shift operators, but valve positioner drift was observed.\nRe-calibrated the valve feedback system which corrected the boiler pressure fluctuations.", "Rajan Sharma", now, "Inspection Report", "B-101", "None", 0.95, 8, 3, 0, "Gen 1"),
        ("Switchgear Busbar Overheating - S-501", "EQUIPMENT: S-501 Main Electrical Switchgear\nDATE: Mar 2024\nAUTHOR: Amit Patel (Electrical Maintenance Lead)\n\nOBSERVATION:\nThermography scan showed a temperature rise of 24 degrees Celsius on Phase-B busbar connection.\n\nDIAGNOSIS & ACTION:\nIsolated the switchgear panel. Cleaned oxide layers off the contact surfaces and applied conductive contact grease.\nTorqued all connection bolts to OEM specs (85 Nm). Temperature returned to normal.", "Amit Patel", now, "Inspection Report", "S-501", "None", 0.95, 2, 1, 0, "Gen 2"),
        ("Feedwater Valve Positioner Calibration - V-205", "EQUIPMENT: V-205 Low-Ambient Control Valve\nDATE: Apr 2025\nAUTHOR: Vikram Sen (Instrumentation & Control Expert)\n\nOBSERVATION:\nPositioner feedback signal mismatched from controller output by 4.2%.\n\nDIAGNOSIS:\nAdjusted the zero and span pots on the positioner. Feedwater loop response improved.\nCross-checked with Rajan's old notes from 2018, which also flagged cold-weather drift issues.", "Vikram Sen", now, "Maintenance Log", "V-205", "None", 0.95, 1, 0, 0, "Gen 2"),
        ("Shift Log 2019-04-22 — C-104 Trip", "EQUIPMENT: C-104 Recycle Compressor\nDATE: 2019-04-22\nAUTHOR: Amit Patel (Electrical Maintenance Lead)\n\nOBSERVATION:\nCompressor C-104 tripped due to elevated transient vibration thresholds.\n\nDIAGNOSIS & ACTIONS:\nVerified electrical feed. Amit Patel checked mechanical casing torque and noted loose anchor bolts. Cross-pattern tightening performed.", "Amit Patel", now, "Maintenance Log", "C-104", "None", 0.95, 7, 5, 0, "Gen 2"),
        ("Overhaul Report 2021 — P-302 Cavitation", "EQUIPMENT: P-302 Reflux Pump A\nDATE: Jun 2021\nAUTHOR: T. Nair (Rotating Equipment Specialist)\n\nOBSERVATION:\nPrior cavitation events in 2020 and 2022 on sister pump P-302B match current signature.\n\nDIAGNOSIS:\nCavitation occurs due to suction strainer restriction. T. Nair checked impeller eye pitting.", "T. Nair", now, "Inspection Report", "P-302", "None", 0.95, 5, 8, 1, "Gen 2"),
        ("Startup Procedure SOP-114 — V-205 Vessel", "EQUIPMENT: V-205 Low-Ambient Control Valve\nDATE: Oct 2022\nAUTHOR: M. Pillai (Process Veteran)\n\nOBSERVATION:\nContradictions found on heat-soak intervals.\n\nDIAGNOSIS:\nM. Pillai noted that heat-soak interval must be verified against the plant standard SOP-114, even if it contradicts the OEM manual.", "M. Pillai", now, "Maintenance Log", "V-205", "None", 0.95, 4, 12, 3, "Gen 1"),
        ("Zero-Span Calibration Standard - TURBINE-04", "EQUIPMENT: TURBINE-04 Auxiliary Steam Turbine\nDATE: Nov 2023\nAUTHOR: R. Nayar (Senior Instrument Systems Engineer)\n\nOBSERVATION:\nTurbine speed governor signal showing minor feedback lag on cold startup.\n\nDIAGNOSIS:\nAdjusted governor feedback loop. Re-zeroed the signal offset at 4mA and 20mA span limit.\nFeedback now perfectly linear.", "R. Nayar", now, "Maintenance Log", "TURBINE-04", "None", 0.95, 2, 14, 0, "Gen 2"),
        ("Boiler-2 Fuel Gas Solenoid Overhaul", "EQUIPMENT: BOILER-2 High-Pressure Boiler 2\nDATE: Dec 2024\nAUTHOR: R. Nayar (Senior Instrument Systems Engineer)\n\nOBSERVATION:\nIntermittent solenoid trips during peak loads.\n\nDIAGNOSIS:\nFound solenoid coil temperature exceeding 85°C. Cleaned dust coating and re-routed instrumentation air duct to supply cooling air. Trips resolved.", "R. Nayar", now, "Inspection Report", "BOILER-2", "None", 0.95, 1, 9, 1, "Gen 2")
    ]
    cursor.executemany("""
    INSERT INTO documents (
        title, content, engineer_author, upload_date, doc_type, equipment_tag, failure_code, confidence,
        age_years, reference_count, contradiction_count, hardware_generation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, documents)
    conn.commit()
    print("[DeadMind] Database seed injection complete.")



def auto_seed_vault_demo(conn):
    """
    Seeds Continuity Intelligence Platform demo data.
    Called only when the persons table is empty (first run after migration).
    Creates demo person (Rajan Sharma), vault artifacts, continuity brief,
    access grants, and a call session log entry.
    """
    import datetime
    import json
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("[DeadMind] Seeding Continuity Vault demo data...")

    # 1. Person: Rajan Sharma (retired)
    cursor.execute("""
    INSERT INTO persons (name, role, domain, department, status, exit_date, exit_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "Rajan Sharma",
        "Senior Boiler and Turbine Lead",
        "Mechanical / Steam Systems",
        "Utility Operations",
        "departed",
        "2026-03-15",
        "retirement",
        now
    ))
    person_id = cursor.lastrowid

    # 2. Vault Artifacts (git commits, presentation, shift log)
    artifacts = [
        (
            person_id, "git_commit",
            "https://github.com/plant-ops/boiler-controls/commit/a1b2c3d",
            (
                "Commit: fix: corrected zero-span calibration sequence for B-101 positioner\n"
                "PR #47: Positioner cold-weather drift fix\n"
                "Files touched: boiler_startup.py, calibration_config.yaml"
            ),
            (
                "Fixed a bug where the positioner calibration sequence skipped the zero-offset "
                "step during warm restarts, causing pressure drift in B-101 during night shifts. "
                "This was the root cause of the 2021 feedwater instability event."
            ),
            "department-restricted", "Mechanical / Steam Systems", now
        ),
        (
            person_id, "git_commit",
            "https://github.com/plant-ops/boiler-controls/commit/e4f5g6h",
            (
                "Commit: docs: SOP deviation log for boiler warm-restart edge case\n"
                "PR #52: Document non-standard startup workaround\n"
                "Files touched: SOP_deviations.md"
            ),
            (
                "Documented the non-standard warm-restart procedure used when standard SOP-2019-047 "
                "Step 3 causes a false alarm. This workaround was known only to the boiler team."
            ),
            "public", "Mechanical / Steam Systems", now
        ),
        (
            person_id, "pptx",
            "Boiler_Operations_Handover_2026.pptx",
            (
                "Slide 1: B-101 Startup Sequence Overview\n"
                "Speaker notes: Always verify positioner arm before digital gain adjust.\n\n"
                "Slide 2: Known Failure Modes - Cold Ambient Conditions\n"
                "Speaker notes: Below 12C, V-205 linkage can seize. Use manual override per SOP deviation log.\n\n"
                "Slide 3: Open Items as of March 2026\n"
                "Speaker notes: TURBINE-04 governor lag issue not fully resolved - T. Nair is tracking.\n"
                "B-101 superheater scaling inspection overdue since Jan 2026."
            ),
            (
                "Key handover slides: B-101 startup sequence, cold-weather V-205 failure modes, "
                "and two open items: TURBINE-04 governor lag (tracked by T. Nair) and overdue "
                "B-101 superheater scaling inspection."
            ),
            "confidential", "Mechanical / Steam Systems", now
        ),
        (
            person_id, "log",
            "shift_notes_rajan_jan_feb_2026.txt",
            (
                "2026-01-14 Night Shift: B-101 showing minor flue gas temp spike. "
                "Added note to inspect secondary superheater tubes next scheduled shutdown.\n"
                "2026-02-03 Day Shift: P-302 suction pressure trending low again. Flagged T. Nair.\n"
                "2026-02-28 Day Shift: Completed handoff prep with M. Pillai on distillation column startup."
            ),
            (
                "Last two months of shift notes. Key flags: B-101 superheater tube inspection pending, "
                "P-302 suction pressure trending low (T. Nair tracking), distillation handoff done with M. Pillai."
            ),
            "department-restricted", "Mechanical / Steam Systems", now
        ),
    ]
    cursor.executemany("""
    INSERT INTO vault_artifacts
        (person_id, artifact_type, source_ref, raw_content, plain_language_summary,
         sensitivity_level, domain, ingested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, artifacts)

    # 3. Continuity Brief (pre-generated for demo)
    unresolved = json.dumps([
        "TURBINE-04 governor feedback lag unresolved -- T. Nair is point of contact.",
        "B-101 secondary superheater tube scaling inspection overdue since January 2026.",
        "P-302 suction pressure trending low -- matches 2021 cavitation precursor pattern; monitor.",
        "V-205 cold-weather linkage workaround in PR #52 not yet merged into official SOP-2019-047.",
        "PR #52 on boiler-controls repo awaiting review from Amit Patel.",
    ])
    glossary = json.dumps({
        "zero-span calibration": (
            "Setting the minimum (zero) and maximum (span) output of an instrument so it reads "
            "accurately across its full range -- like calibrating a scale to read 0 when empty."
        ),
        "positioner drift": (
            "When a valve position sensor gradually reports the wrong position over time, "
            "usually due to temperature changes or mechanical wear."
        ),
        "feedwater cavitation": (
            "Water pressure drops so low inside a pump that vapor bubbles form and then "
            "collapse violently, eroding the pump impeller."
        ),
        "superheater scaling": (
            "Mineral deposit buildup inside boiler tubes reducing heat transfer efficiency "
            "-- similar to limescale in a kettle, but dangerous at boiler scale."
        ),
        "SOP deviation log": (
            "Official record of approved departures from standard operating procedures -- "
            "documents what to do when official steps do not work for an edge case."
        ),
    })
    cursor.execute("""
    INSERT INTO continuity_briefs
        (person_id, generated_at, summary_text, unresolved_items, glossary,
         verification_status, verified_by, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        person_id, now,
        (
            "Rajan Sharma (Senior Boiler and Turbine Lead) retired 2026-03-15 after 28 years. "
            "Primary expert for B-101 primary steam boiler, TURBINE-04, and V-205 control valve. "
            "Core undocumented contribution: cold-weather positioner calibration sequence (git PR #52) "
            "not yet in official SOP. Two critical open items: overdue B-101 superheater inspection "
            "and unresolved TURBINE-04 governor lag. M. Pillai briefed on distillation startup. "
            "T. Nair tracking pump and turbine issues. Main risk: warm-restart workaround for V-205 "
            "exists only in deviation log, not official SOP -- anyone following standard SOP in "
            "cold weather will trigger a false alarm."
        ),
        unresolved, glossary,
        "verified", "S. Kulkarni (Safety Auditor)", now
    ))

    # 4. Access Grants (RBAC)
    grants = [
        (person_id, "Admin", "confidential"),
        (person_id, "Plant Head", "department-restricted"),
        (person_id, "QHS Manager", "department-restricted"),
        (person_id, "Field Technician", "public"),
        (person_id, "Finance", "public"),
        (person_id, "Reliability Engineer", "department-restricted"),
    ]
    cursor.executemany("""
    INSERT INTO access_grants (person_vault_id, granted_to_role, sensitivity_level_allowed)
    VALUES (?, ?, ?)
    """, grants)

    # 5. Demo Call Session log entry
    cursor.execute("""
    INSERT INTO call_sessions
        (person_id, channel, language, transcript, response_text, started_at, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        person_id, "whatsapp", "en",
        "What is the startup procedure for B-101 after a cold night?",
        (
            "Based on Rajan Sharma preserved notes: verify positioner arm alignment before "
            "adjusting digital controller gains. Below 12 degrees C, V-205 linkage can seize "
            "-- use manual override per SOP deviation log PR #52. Never skip Step 3 zero baseline "
            "calibration even on warm restarts. [Source: Boiler Pressure Fluctuation Investigation "
            "B-101, Rajan Sharma, Aug 2016]"
        ),
        now, 47.3
    ))

    # 6. Tasks (Task-Level Handoff Explainer)
    seed_tasks_for_person(cursor, person_id, now)

    # 7. Enterprise Usage & Economy Seed (Company Pool & Employee Allocations)
    seed_company_economy_data(cursor, now)

    conn.commit()
    print("[DeadMind] Continuity Vault demo data seeded successfully.")


def seed_tasks_for_person(cursor, person_id, now_str):
    import json
    tasks_data = [
        (
            person_id,
            "Boiler Control Reliability Phase 2",
            "B-101 Feedwater Positioner Cold-Drift Calibration & SOP Update",
            "Finalize automated zero-span offset algorithm on V-205 positioner controller. Merge PR #52 into master and update SOP-2019-047 with cold-ambient override thresholds.",
            "in_progress",
            "graph TD\n    A[Analyze 2021 Feedwater Instability] -->|Done| B[Draft Algorithm in PR #47]\n    B -->|Done| C[Bench Test V-205 Low-Ambient Valve]\n    C -->|Done| D[Field Test on Night Shifts]\n    D -->|65% Current| E[Incorporate SOP Deviation into SOP-2019-047]\n    E -->|Pending| F[Plant Safety Sign-off & Merge PR #52]\n    F -->|Pending| G[Commission Automatic Zero-Span Calibration]",
            65,
            "2026-08-30",
            json.dumps([
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
            ]),
            now_str
        ),
        (
            person_id,
            "Steam Turbine Operational Integrity",
            "TURBINE-04 Auxiliary Steam Governor Lag Root Cause Investigation",
            "Investigate transient speed governor feedback signal delay during cold starts. Benchmark 4-20mA transducer response against 2023 zero-span baseline. Handoff to T. Nair.",
            "blocked",
            "graph TD\n    A[Log Speed Feedback Lag] -->|Done| B[Calibrate 4-20mA Transducer]\n    B -->|Blocked| C[Dynamic Steam Valve Response Profiling]\n    C -->|Pending| D[Update Governor PID Gain Coefficients]\n    D -->|Pending| E[Final Startup Verification]",
            30,
            "2026-08-22",
            json.dumps([
                {
                    "domain": "Instrumentation / Control Systems",
                    "team": "T. Nair / Rotating Equipment",
                    "relationship": "blocked_by",
                    "note": "Requires secondary pressure transducer replacement during scheduled outage"
                },
                {
                    "domain": "Operations / Shift Leads",
                    "team": "Boiler Night Shift Operations",
                    "relationship": "blocks",
                    "note": "Cold startup runbook cannot be validated until governor PID gains are updated"
                }
            ]),
            now_str
        )
    ]
    cursor.executemany("""
    INSERT INTO tasks (
        person_id, project_name, title, description, status,
        flowchart_mermaid, percent_complete, deadline, dependencies, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, tasks_data)


def seed_company_economy_data(cursor, now_str):
    """Seeds the company credit pool, employee allocations, and baseline usage accounts."""
    company_id = "INDO-POWER-PLANT-01"
    company_name = "DeadMind Demo Corporation"
    
    # 1. Company Pool
    cursor.execute("SELECT id FROM company_pools WHERE company_id = ?", (company_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO company_pools (
            id, company_id, company_name, total_pool_credits, allocated_credits,
            consumed_credits, available_unallocated_credits, reconciled_returned_credits,
            current_period_name, period_start, period_end, created_at, updated_at
        ) VALUES ('comp_01', ?, ?, 100000, 8500, 1870, 91500, 0, 'August 2026', '2026-08-01', '2026-08-31', ?, ?)
        """, (company_id, company_name, now_str, now_str))

    # 2. Seed Employee Usage Accounts
    employee_seeds = [
        ("default_user", "Field Technician", 1000, 145, 855, 0, 0),
        ("rajan", "Senior Boiler & Turbine Lead", 1000, 640, 360, 0, 0),
        ("amit", "Electrical Maintenance Lead", 1000, 920, 80, 0, 0),
        ("vikram", "Instrumentation & Control Specialist", 1500, 310, 1190, 0, 0),
        ("safety_team", "Plant Safety & Compliance Unit", 5000, 1200, 3800, 0, 0),
    ]

    for uid, role_title, alloc, used, bal, ovg_cnt, ovg_micro in employee_seeds:
        cursor.execute("SELECT id FROM usage_accounts WHERE user_id = ?", (uid,))
        if not cursor.fetchone():
            acc_id = f"acc_{uid}"
            cursor.execute("""
            INSERT INTO usage_accounts (
                id, user_id, company_id, allocated_credits, used_credits,
                balance_credits, overage_count, total_overage_microusdc, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (acc_id, uid, company_id, alloc, used, bal, ovg_cnt, ovg_micro, now_str, now_str))

            cursor.execute("""
            INSERT INTO usage_allocations (account_id, period_start, period_end, allocated_credits, source, granted_at)
            VALUES (?, '2026-08-01', '2026-08-31', ?, 'Company Funded Pool', ?)
            """, (acc_id, alloc, now_str))

            cursor.execute("""
            INSERT INTO usage_ledger (account_id, delta_credits, balance_after, entry_type, description, reference_id, timestamp)
            VALUES (?, ?, ?, 'allocation', 'Monthly allowance grant from company pool', ?, ?)
            """, (acc_id, alloc, alloc, acc_id, now_str))


    # 3. Seed Reimbursement Policy (Section 9)
    cursor.execute("SELECT id FROM reimbursement_policies WHERE company_id = ?", (company_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO reimbursement_policies (
            id, company_id, max_reimbursement_per_employee_usdc, max_daily_overage_usdc,
            max_monthly_overage_usdc, auto_approval_threshold_usdc, require_receipt,
            allowed_services, is_active, created_at, updated_at
        ) VALUES ('pol_01', ?, 100.0, 20.0, 150.0, 5.0, 0, 'all', 1, ?, ?)
        """, (company_id, now_str, now_str))

    # 4. Seed Platform Base Infrastructure Costs (Section 1 & 16: Flow A)
    cursor.execute("SELECT id FROM platform_base_costs WHERE company_id = ?", (company_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO platform_base_costs (
            id, company_id, period_name, cloud_infra_cost_usd, database_cost_usd,
            storage_cost_usd, baseline_ai_cost_usd, total_platform_cost_usd, recorded_at
        ) VALUES ('pbc_aug_2026', ?, 'August 2026', 420.0, 80.0, 50.0, 300.0, 850.0, ?)
        """, (company_id, now_str))

    # 5. Seed Initial Sample Reimbursement Requests (Section 8, 14, 15 & 16)
    sample_reimbursements = [
        ("reimb_01", "REIMB-2026-001", "rajan", "Rajan Sharma", "tx_ovg_rajan_01", "TX_ALGO_RAJAN_8821", 2.40, 2400000, 2400, "expert_consensus", "PENDING_REIMBURSEMENT", "Emergency boiler trip consensus overage", "ALGORAND7RAJAN4WALLET2KEYPAIR", None, None, None),
        ("reimb_02", "REIMB-2026-002", "amit", "Amit Patel", "tx_ovg_amit_01", "TX_ALGO_AMIT_4412", 1.80, 1800000, 1800, "deep_risk_audit", "APPROVED", "6.6kV switchgear fast transfer audit overage", "ALGORAND7AMIT4WALLET3KEYPAIR", "Plant Operations Director", now_str, None),
        ("reimb_03", "REIMB-2026-003", "vikram", "Vikram Malhotra", "tx_ovg_vikram_01", "TX_ALGO_VIKRAM_9931", 4.50, 4500000, 4500, "compliance_pack", "REIMBURSED", "OISD-118 regulatory compliance pack overage", "ALGORAND7VIKRAM4WALLET5KEYPAIR", "Plant Operations Director", now_str, now_str),
    ]

    for rid, rnum, uid, uname, ptid, txid, ausdc, amicro, creds, srv, st, nts, paddr, rev, rev_at, rmb_at in sample_reimbursements:
        cursor.execute("SELECT id FROM reimbursement_requests WHERE id = ?", (rid,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO reimbursement_requests (
                id, request_number, employee_id, employee_name, company_id,
                payment_transaction_id, txn_id, amount_usdc, amount_microusdc,
                credits_covered, service, status, notes, payer_address,
                reviewer_id, reviewed_at, reimbursed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rid, rnum, uid, uname, company_id, ptid, txid, ausdc, amicro, creds, srv, st, nts, paddr, rev, rev_at, rmb_at, now_str, now_str))

            if st == "REIMBURSED":
                cursor.execute("""
                INSERT INTO reimbursement_transactions (
                    id, reimbursement_request_id, company_id, employee_id, payout_method,
                    payout_amount_usdc, payout_reference, processed_by, processed_at, status
                ) VALUES (?, ?, ?, ?, 'corporate_payroll_credit', ?, 'PAYROLL-CREDIT-AUG-2026-04', 'Corporate Finance', ?, 'COMPLETED')
                """, (f"ptxn_{rid}", rid, company_id, uid, ausdc, now_str))


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
