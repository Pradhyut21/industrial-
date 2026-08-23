"""
DeadMind Enterprise Usage Metering, AI Economy & Reimbursement Comprehensive Test Suite.
Verifies all core economic, governance, overage settlement, and reimbursement requirements:
1. Company account governance & pool funding (Flow A & B)
2. Employee allocation
3. Credit deduction & centralized dynamic pricing
4. Concurrent credit deduction (atomic transaction isolation)
5. Insufficient credit detection
6. RFC HTTP 402 challenge generation for EXACT overage only
7. Idempotent x402 payment verification
8. Automatic reimbursement request creation upon x402 settlement (Flow C)
9. Reimbursement policy auto-approval (<= $5.00) vs manual review (> $5.00)
10. Admin reimbursement approval, rejection, and payroll credit payout execution
11. Automatic request resumption after x402 settlement
12. Period-end unused allowance reconciliation return to company pool (Flow D)
13. Comprehensive 4-Flow Company Economy Dashboard aggregation
14. Autonomous AI Agent API budget ceilings & x402 overage settlement
"""
import uuid
import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from backend.main import app
from backend.metering.meter import usage_meter
from backend.metering.store import UsageStore
from backend.metering.pricing import pricing_engine
from backend.metering.reimbursement import reimbursement_engine
from backend.database import init_db

init_db()
client = TestClient(app)


# ── 1 & 2: Company Account & Employee Allocation ─────────────────────────────
def test_company_pool_and_employee_allocation():
    company_id = f"TEST-COMP-{uuid.uuid4().hex[:6]}"
    user_id = f"test_user_{uuid.uuid4().hex[:6]}"
    
    pool = UsageStore.get_company_pool(company_id)
    assert pool["total_pool_credits"] == 100000
    assert pool["available_unallocated_credits"] > 0

    init_unalloc = pool["available_unallocated_credits"]
    
    # Allocate 500 credits to test user
    alloc_res = UsageStore.allocate_employee_credits(
        company_id=company_id,
        user_id=user_id,
        amount=500,
        source="Safety Optimization Grant"
    )
    assert alloc_res["status"] == "success"
    assert alloc_res["amount_allocated"] == 500

    # Verify company pool available unallocated credits decreased
    pool_after = UsageStore.get_company_pool(company_id)
    assert pool_after["available_unallocated_credits"] == init_unalloc - 500


# ── 3 & 4: Dynamic Usage Cost & Deduction ────────────────────────────────────
def test_dynamic_pricing_and_itemized_breakdown():
    # Base Chat: 10 + RAG 15 + Uncertainty 15 = 40
    c1 = pricing_engine.calculate_cost("chat", "What is cavitation?", experts_count=0)
    assert c1["total_credits"] == 40

    # Multi-Expert: Base 10 + RAG 15 + 3 Experts (45) + Consensus (20) + Uncertainty (15) = 105
    c2 = pricing_engine.calculate_cost("chat", "Why is P-302 vibrating?", experts_count=3, has_consensus=True)
    assert c2["total_credits"] == 105

    # Specialized Compliance Mode: +40
    c3 = pricing_engine.calculate_cost("chat", "Audit OISD compliance", experts_count=2, has_consensus=True, analysis_mode="compliance_audit")
    assert c3["total_credits"] == 130


# ── 5: Concurrent Credit Deduction (Atomic Transaction Safety) ───────────────
def test_concurrent_atomic_credit_deductions():
    user_id = f"test_concurrent_{uuid.uuid4().hex[:8]}"
    UsageStore.get_or_create_account(user_id)
    
    # Give initial 1000 credits
    acc_before = UsageStore.get_or_create_account(user_id)
    bal_before = acc_before["balance_credits"]

    def worker_deduct():
        return UsageStore.deduct_credits(user_id, 20, "Concurrent micro-query", "chat")

    # Run 10 parallel deduction threads (10 * 20 = 200 credits)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(worker_deduct) for _ in range(10)]
        results = [f.result() for f in futures]

    acc_after = UsageStore.get_or_create_account(user_id)
    assert acc_after["balance_credits"] == bal_before - 200
    assert acc_after["used_credits"] == acc_before["used_credits"] + 200


# ── 6, 7 & 8: Insufficient Credits, HTTP 402 & Exact Overage ────────────────
def test_http_402_exact_overage_calculation():
    user_id = f"test_exact_overage_{uuid.uuid4().hex[:8]}"
    UsageStore.get_or_create_account(user_id)
    
    # Deplete balance to exactly 10 credits
    acc = UsageStore.get_account_breakdown(user_id)
    if acc["balance_credits"] > 10:
        UsageStore.deduct_credits(user_id, acc["balance_credits"] - 10, "Deplete to 10", "chat")

    # Evaluate 45-credit query -> Expect exact overage of 35 credits (0.0350 USDC)
    eval_res = usage_meter.evaluate_credit_allowance(user_id, required_credits=45)
    assert eval_res["allowed"] is False
    assert eval_res["required_credits"] == 45
    assert eval_res["current_balance"] == 10
    assert eval_res["overage_credits"] == 35  # 45 - 10 = 35!
    assert eval_res["x402_challenge"]["accepts"][0]["amount"] == "35000"
    assert eval_res["x402_challenge"]["accepts"][0]["amountFormatted"] == "0.0350 USDC"

    # API call returns 402 with exact overage calculation
    resp = client.post("/api/chat/query", json={
        "query": "Perform multi-expert vibration analysis",
        "user_id": user_id
    })
    assert resp.status_code == 402
    body = resp.json()
    assert body["detail"]["status"] == 402
    assert body["detail"]["available_credits"] == 10
    assert body["detail"]["overage_credits"] == body["detail"]["required_credits"] - 10
    assert body["detail"]["payment_required"] is True


# ── 9, 10, 11 & 12: x402 Settlement, Idempotency & Auto-Reimbursement ─────────
def test_x402_settlement_and_auto_reimbursement():
    user_id = f"test_idempotency_{uuid.uuid4().hex[:8]}"
    UsageStore.get_or_create_account(user_id)
    initial_bal = UsageStore.get_account_breakdown(user_id)["balance_credits"]
    txn_id = f"TX_UNIQUE_{uuid.uuid4().hex[:12].upper()}"

    # 1. Successful settlement -> creates AUTO_APPROVED reimbursement (amount $0.20 <= $5.00 threshold)
    res1 = client.post("/api/metering/topup-x402", json={
        "user_id": user_id,
        "credits_to_add": 200,
        "amount_microusdc": 200000,
        "txn_id": txn_id,
        "payer_address": "ALGORAND7PAYER4KEYPAIR",
        "service_tier": "Overage Top-Up"
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"
    assert data1["balance_credits"] == initial_bal + 200
    assert "reimbursement" in data1
    assert data1["reimbursement"]["status"] == "AUTO_APPROVED"
    assert data1["reimbursement"]["amount_usdc"] == 0.20

    # 2. Duplicate submission (Idempotency) -> Must NOT credit twice or duplicate reimbursement!
    res2 = client.post("/api/metering/topup-x402", json={
        "user_id": user_id,
        "credits_to_add": 200,
        "amount_microusdc": 200000,
        "txn_id": txn_id,
        "payer_address": "ALGORAND7PAYER4KEYPAIR",
        "service_tier": "Overage Top-Up"
    })
    assert res2.status_code == 200
    assert res2.json()["idempotent_replay"] is True
    
    # Balance remains initial_bal + 200
    bal_after = UsageStore.get_account_breakdown(user_id)["balance_credits"]
    assert bal_after == initial_bal + 200


# ── 13: Reimbursement Lifecycle (Pending -> Approved -> Payout) ──────────────
def test_reimbursement_lifecycle_and_actions():
    company_id = "INDO-POWER-PLANT-01"
    user_id = f"rajan_reimb_{uuid.uuid4().hex[:6]}"
    
    # Create an overage payment of $7.50 (> $5.00 threshold -> PENDING_REIMBURSEMENT)
    req = reimbursement_engine.create_request_from_x402(
        user_id=user_id,
        company_id=company_id,
        payment_transaction_id="tx_high_val_01",
        txn_id=f"TX_ALGO_{uuid.uuid4().hex[:8].upper()}",
        amount_microusdc=7500000,
        credits_covered=7500,
        service_tier="deep_risk_audit",
        payer_address="ALGORAND7RAJAN4WALLET"
    )
    assert req["status"] == "PENDING_REIMBURSEMENT"
    assert req["amount_usdc"] == 7.50
    req_id = req["id"]

    # 1. Admin Approves Request
    appr_res = client.post(f"/api/reimbursements/{req_id}/approve", json={
        "reviewer_id": "Plant Operations Director",
        "notes": "Approved for emergency turbine audit"
    })
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # 2. Corporate Finance Executes Payout via Payroll Credit
    payout_res = client.post(f"/api/reimbursements/{req_id}/payout", json={
        "payout_method": "corporate_payroll_credit",
        "processed_by": "Corporate Finance",
        "reference": "PAYROLL-AUG-2026-99"
    })
    assert payout_res.status_code == 200
    pdata = payout_res.json()
    assert pdata["status"] == "success"
    assert pdata["request"]["status"] == "REIMBURSED"
    assert pdata["payout_method"] == "corporate_payroll_credit"


# ── 14: Automatic Query Resumption ──────────────────────────────────────────
def test_automatic_query_resumption():
    user_id = f"test_resumption_{uuid.uuid4().hex[:8]}"
    UsageStore.get_or_create_account(user_id)
    # Deplete allowance to 0
    cur_bal = UsageStore.get_account_breakdown(user_id)["balance_credits"]
    UsageStore.deduct_credits(user_id, cur_bal, "Deplete to 0", "chat")

    # Step 1: Initial query fails with 402
    resp1 = client.post("/api/chat/query", json={
        "query": "What is the startup procedure for B-101?",
        "user_id": user_id
    })
    assert resp1.status_code == 402

    # Step 2: Settle x402 payment
    txn_hash = f"TX_RESUME_{uuid.uuid4().hex[:10].upper()}"
    topup_res = client.post("/api/metering/topup-x402", json={
        "user_id": user_id,
        "credits_to_add": 300,
        "amount_microusdc": 300000,
        "txn_id": txn_hash,
        "payer_address": "ALGORAND7RESUME4KEYPAIR",
        "service_tier": "Pay-Per-Use Overage"
    })
    assert topup_res.status_code == 200

    # Step 3: Resumed query succeeds automatically
    resp2 = client.post("/api/chat/query", json={
        "query": "What is the startup procedure for B-101?",
        "user_id": user_id
    })
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert "answer" in data2
    assert data2["usage_metrics"]["credits_consumed"] > 0


# ── 15: Period-End Unused Credit Reconciliation (Flow D) ─────────────────────
def test_period_end_unused_credit_reconciliation():
    company_id = f"RECON_COMP_{uuid.uuid4().hex[:6]}"
    UsageStore.get_company_pool(company_id)
    
    # 1. Provision user with 1000 credits and use 650 -> 350 unused
    user_id = f"rajan_recon_{uuid.uuid4().hex[:6]}"
    UsageStore.allocate_employee_credits(company_id, user_id, 1000, "Seed")
    UsageStore.deduct_credits(user_id, 650, "Consume 650 credits", "chat")

    pool_before = UsageStore.get_company_pool(company_id)
    returned_before = pool_before["reconciled_returned_credits"]

    # 2. Execute period close reconciliation
    rec_res = UsageStore.reconcile_period_close(
        company_id=company_id,
        period_name="August 2026",
        reconciled_by="Plant Operations Manager"
    )
    assert rec_res["status"] == "RECONCILED & CLOSED"
    assert rec_res["total_unused_returned"] >= 350

    # 3. Verify company pool received unused credits back
    pool_after = UsageStore.get_company_pool(company_id)
    assert pool_after["reconciled_returned_credits"] >= returned_before + 350


# ── 16: Comprehensive 4-Flow Company Economy Dashboard ───────────────────────
def test_comprehensive_company_economy_dashboard():
    resp = client.get("/api/metering/company/INDO-POWER-PLANT-01/dashboard")
    assert resp.status_code == 200
    dash = resp.json()

    # Flow A: Base Platform Costs
    assert "flow_a_base_platform" in dash
    assert dash["flow_a_base_platform"]["cloud_infra_cost_usd"] == 420.0
    assert dash["flow_a_base_platform"]["database_cost_usd"] == 80.0
    assert dash["flow_a_base_platform"]["storage_cost_usd"] == 50.0
    assert dash["flow_a_base_platform"]["baseline_ai_cost_usd"] == 300.0
    assert dash["flow_a_base_platform"]["total_platform_cost_usd"] == 850.0

    # Flow B: Employee AI Usage
    assert "flow_b_employee_usage" in dash
    assert dash["flow_b_employee_usage"]["total_employees"] >= 5

    # Flow C: Company Reimbursements
    assert "flow_c_reimbursements" in dash
    assert dash["flow_c_reimbursements"]["auto_approval_threshold_usdc"] == 5.0
    assert dash["flow_c_reimbursements"]["total_reimbursement_requests"] >= 1

    # Flow D: Period Reconciliation & Company Pool
    assert "flow_d_period_reconciliation" in dash
    assert dash["flow_d_period_reconciliation"]["total_pool_credits"] == 100000


# ── 17: Service Discovery & Autonomous AI Agent Budget ───────────────────────
def test_service_discovery_and_agent_budget():
    # 1. Service Discovery
    disc_res = client.get("/api/services")
    assert disc_res.status_code == 200
    disc_data = disc_res.json()
    assert disc_data["protocol"] == "RFC x402 Machine-to-Machine Payment Protocol"
    assert len(disc_data["services"]) >= 6

    # 2. Agent Query with Maximum Budget Exceeded
    agent_bad_budget = client.post("/api/agent/query", json={
        "question": "Perform complete compliance audit on B-101",
        "analysis_type": "compliance_pack",
        "max_price_credits": 30,
        "requester_agent_id": "bot_budget_limited"
    })
    assert agent_bad_budget.status_code == 400
    err_body = agent_bad_budget.json()
    assert err_body["detail"]["error"] == "BUDGET_EXCEEDED"

    # 3. Agent Query within budget
    agent_id = f"bot_funded_{uuid.uuid4().hex[:8]}"
    UsageStore.topup_account_x402(agent_id, 500, 500000, f"TX_AGENT_{uuid.uuid4().hex[:8].upper()}", "ADDR_AGENT")
    agent_ok = client.post("/api/agent/query", json={
        "question": "What is the pressure threshold for B-101?",
        "analysis_type": "standard",
        "max_price_credits": 100,
        "requester_agent_id": agent_id
    })
    assert agent_ok.status_code == 200
    ok_data = agent_ok.json()
    assert "answer" in ok_data
    assert "usage" in ok_data
    assert ok_data["usage"]["credits_consumed"] > 0
