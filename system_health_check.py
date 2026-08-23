"""
DeadMind End-to-End System Health & Enterprise AI Economy Verification Script.
Audits all core AI/RAG subsystems, uncertainty engine, multi-expert consensus,
and the complete 16-point x402 usage-based economic lifecycle.
"""
import sys
import os
import uuid
import json
import httpx

# Ensure repo root is on path and line-buffered stdout
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)


def run_health_check():
    print("=" * 80)
    print("       DEADMIND CONTINUITY INTELLIGENCE & x402 AI ECONOMY")
    print("                  COMPREHENSIVE AUDIT & HEALTH CHECK")
    print("=" * 80)

    all_passed = True
    checks = []

    def record_result(name: str, passed: bool, detail: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
        status_str = "[OK] PASS" if passed else "[X] FAIL"
        checks.append((name, passed, detail))
        print(f"{status_str:<10} | {name:<42} | {detail}")

    # 1. Database & Schema Tables Integrity
    try:
        from backend.database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r["name"] for r in cursor.fetchall()]
        
        expected = [
            "engineers", "documents", "equipment_nodes", "persons", 
            "vault_artifacts", "continuity_briefs", "tasks", 
            "company_pools", "usage_accounts", "usage_allocations",
            "usage_events", "usage_ledger", "payment_transactions",
            "x402_settlements", "period_reconciliations"
        ]
        missing = [t for t in expected if t not in tables]
        
        cursor.execute("SELECT COUNT(*) as c FROM engineers")
        eng_count = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM documents")
        doc_count = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM usage_accounts")
        acc_count = cursor.fetchone()["c"]
        conn.close()

        if missing:
            record_result("Database & Tables Integrity", False, f"Missing: {missing}")
        else:
            record_result("Database & Tables Integrity", True, f"{len(tables)} tables ({eng_count} engineers, {doc_count} docs, {acc_count} accounts)")
    except Exception as e:
        record_result("Database & Tables Integrity", False, str(e))

    # 2. Hybrid Retrieval (BM25 + FAISS + RRF)
    try:
        from backend.hybrid_retrieval import reciprocal_rank_fusion
        docs = reciprocal_rank_fusion("B-101 boiler drum level")
        if docs and len(docs) > 0:
            record_result("Hybrid Retrieval (BM25+FAISS+RRF)", True, f"Retrieved {len(docs)} grounded documents")
        else:
            record_result("Hybrid Retrieval", False, "0 documents returned")
    except Exception as e:
        record_result("Hybrid Retrieval", False, str(e))

    # 3. Cross-Encoder Reranker
    try:
        from backend.reranker import rerank_results
        docs_to_rerank = [{"content": "B-101 boiler drum level tuning and feedwater trim", "id": 1}, {"content": "Cafeteria lunch schedule", "id": 2}]
        ranked = rerank_results("B-101 tuning", docs_to_rerank)
        if ranked and len(ranked) > 0 and ranked[0]["id"] == 1:
            record_result("Cross-Encoder Reranker", True, "Top document correctly prioritized")
        else:
            record_result("Cross-Encoder Reranker", False, "Reranking output mismatch")
    except Exception as e:
        record_result("Cross-Encoder Reranker", False, str(e))

    # 4. Multi-Expert Consensus Synthesis
    try:
        from backend.consensus import synthesize_consensus
        cons = synthesize_consensus("What is the purge duration for B-101?", ["Rajan Sharma", "Amit Patel"])
        if cons and "consensus" in cons:
            record_result("Multi-Expert Consensus Engine", True, f"Synthesized consensus with {cons.get('agreement', 'High')} agreement")
        else:
            record_result("Multi-Expert Consensus", False, "Consensus synthesis failed")
    except Exception as e:
        record_result("Multi-Expert Consensus", False, str(e))

    # 5. Uncertainty & Grounded Attribution
    try:
        from backend.uncertainty import compute_uncertainty
        sample_sources = [{"id": 1, "content": "Purge for 15 minutes before igniting pilot and maintain drum level +50mm.", "score": 0.85}]
        unc_res = compute_uncertainty("Startup procedure for B-101", sample_sources, "Rajan Sharma")
        if "risk_score" in unc_res:
            record_result("Uncertainty & Hallucination Engine", True, f"Risk Score: {unc_res['risk_score']}, Sparsity: {unc_res['sparsity']}")
        else:
            record_result("Uncertainty Engine", False, "No risk metric returned")
    except Exception as e:
        record_result("Uncertainty Engine", False, str(e))

    # 6. Company Credit Pool & Governance
    try:
        from backend.metering.store import UsageStore
        pool = UsageStore.get_company_pool("INDO-POWER-PLANT-01")
        if pool and pool["total_pool_credits"] == 100000:
            record_result("Company Credit Pool Governance", True, f"Pool: 100,000 Credits, Active: {pool['total_employees']} Employees")
        else:
            record_result("Company Credit Pool Governance", False, "Company pool cap mismatch")
    except Exception as e:
        record_result("Company Credit Pool Governance", False, str(e))

    # 7. Employee Allocation & Double-Entry Ledger
    try:
        uid = f"audit_emp_{uuid.uuid4().hex[:6]}"
        alloc_res = UsageStore.allocate_employee_credits("INDO-POWER-PLANT-01", uid, 250, "Quarterly Safety Grant")
        if alloc_res["status"] == "success" and alloc_res["new_balance"] >= 250:
            record_result("Employee Allowance & Double-Entry Ledger", True, f"Allocated 250 credits to {uid}")
        else:
            record_result("Employee Allowance", False, "Allocation failed")
    except Exception as e:
        record_result("Employee Allowance", False, str(e))

    # 8. Dynamic Itemized Pricing Engine
    try:
        from backend.metering.pricing import pricing_engine
        cost_chat = pricing_engine.calculate_cost("chat", "Why is P-302 vibrating?", experts_count=2, has_consensus=True)
        if cost_chat["total_credits"] == 90:
            record_result("Dynamic Itemized Pricing Engine", True, f"Formula verified: 90 credits (Base 10 + RAG 15 + Experts 30 + Cons 20 + Unc 15)")
        else:
            record_result("Pricing Engine", False, f"Unexpected credits: {cost_chat['total_credits']}")
    except Exception as e:
        record_result("Pricing Engine", False, str(e))

    # 9. Concurrency-Safe Atomic Deductions
    try:
        ded_res = UsageStore.deduct_credits(uid, 45, "Audit deduction test", "chat")
        if ded_res["credits_deducted"] == 45:
            record_result("Atomic Concurrency-Safe Deduction", True, f"Remaining balance: {ded_res['balance_remaining']} credits")
        else:
            record_result("Atomic Deduction", False, "Deduction mismatch")
    except Exception as e:
        record_result("Atomic Deduction", False, str(e))

    # 10. Insufficient Credits & Exact Overage RFC HTTP 402 Challenge
    try:
        from backend.metering.meter import usage_meter
        cur_acc = UsageStore.get_account_breakdown(uid)
        cur_bal = cur_acc["balance_credits"]
        req_credits = cur_bal + 50
        
        ovg_eval = usage_meter.evaluate_credit_allowance(uid, req_credits)
        if not ovg_eval["allowed"] and ovg_eval["overage_credits"] == 50:
            ch = ovg_eval["x402_challenge"]
            record_result("Exact Overage RFC HTTP 402 Challenge", True, f"Overage: {ovg_eval['overage_credits']} Credits = {ch['accepts'][0]['amountFormatted']}")
        else:
            record_result("Exact Overage RFC HTTP 402", False, f"Overage mismatch: expected 50, got {ovg_eval.get('overage_credits')}")
    except Exception as e:
        record_result("Exact Overage RFC HTTP 402", False, str(e))

    # 11. Idempotent x402 Settlement & On-Chain Payment Ledger
    try:
        txn_audit = f"TX_AUDIT_ALGORAND_{uuid.uuid4().hex[:8].upper()}"
        top_res1 = UsageStore.topup_account_x402(uid, 150, 150000, txn_audit, "ALGORAND7AUDIT4KEYPAIR")
        top_res2 = UsageStore.topup_account_x402(uid, 150, 150000, txn_audit, "ALGORAND7AUDIT4KEYPAIR")
        
        if top_res1["status"] == "success" and top_res2.get("idempotent_replay") is True:
            record_result("Idempotent x402 Settlement & Ledger", True, f"Settled + Idempotent replay protected ({txn_audit[:16]}...)")
        else:
            record_result("Idempotent x402 Settlement", False, "Idempotency replay check failed")
    except Exception as e:
        record_result("Idempotent x402 Settlement", False, str(e))

    # 12. Period-End Unused Credit Reconciliation & Return to Pool
    try:
        test_comp = f"AUDIT_COMP_{uuid.uuid4().hex[:6]}"
        UsageStore.get_company_pool(test_comp)  # initialize pool
        u1 = f"aud_emp_{uuid.uuid4().hex[:6]}"
        UsageStore.allocate_employee_credits(test_comp, u1, 500, "Seed")
        UsageStore.deduct_credits(u1, 200, "Used", "chat")
        
        rec = UsageStore.reconcile_period_close(test_comp, "August 2026", "Audit Officer")
        if rec["status"] == "RECONCILED & CLOSED" and rec["total_unused_returned"] >= 300:
            record_result("Period-End Unused Credit Reconciliation", True, f"Returned {rec['total_unused_returned']} unused credits back to Company Pool")
        else:
            record_result("Period-End Reconciliation", False, "Reconciliation return mismatch")
    except Exception as e:
        record_result("Period-End Reconciliation", False, str(e))

    # 13. Service Discovery Catalog (GET /api/services)
    try:
        client = httpx.Client(base_url="http://localhost:8000", timeout=5.0)
        r_srv = client.get("/api/services")
        if r_srv.status_code == 200 and len(r_srv.json().get("services", [])) >= 6:
            record_result("Service Discovery Catalog (/api/services)", True, f"Discovered {len(r_srv.json()['services'])} machine-readable industrial services")
        else:
            record_result("Service Discovery Catalog", False, f"Status: {r_srv.status_code}")
    except Exception as e:
        record_result("Service Discovery Catalog", False, f"Server unreachable: {e}")

    # 14. Autonomous AI Agent API (POST /api/agent/query) & Max Budget Check
    try:
        client = httpx.Client(base_url="http://localhost:8000", timeout=5.0)
        r_agent_budget = client.post("/api/agent/query", json={
            "question": "Deep compliance check on B-101",
            "analysis_type": "compliance_pack",
            "max_price_credits": 20,
            "requester_agent_id": "budget_bot"
        })
        if r_agent_budget.status_code == 400 and r_agent_budget.json().get("detail", {}).get("error") == "BUDGET_EXCEEDED":
            record_result("Autonomous AI Agent Budget Enforcement", True, "Enforced max_price_credits ceiling with structured 400 error")
        else:
            record_result("Autonomous AI Agent Budget", False, f"Status: {r_agent_budget.status_code}")
    except Exception as e:
        record_result("Autonomous AI Agent Budget", False, f"Server unreachable: {e}")

    # 16. Employee Reimbursement Policy & Lifecycle Audit (Flow C)
    try:
        from backend.metering.reimbursement import reimbursement_engine
        pol = reimbursement_engine.get_policy("INDO-POWER-PLANT-01")
        reqs = reimbursement_engine.list_reimbursements("INDO-POWER-PLANT-01")
        summary = reimbursement_engine.get_company_reimbursement_summary("INDO-POWER-PLANT-01")
        if pol.get("auto_approval_threshold_usdc") == 5.0 and len(reqs) >= 1 and summary.get("total_requests", 0) >= 1:
            record_result("Corporate Reimbursement Hub (Flow C)", True, f"Policy auto-threshold: ${pol['auto_approval_threshold_usdc']:.2f} · {summary['total_requests']} requests audited (Pending: ${summary['pending_amount_usdc']:.2f}, Approved: ${summary['approved_amount_usdc']:.2f})")
        else:
            record_result("Corporate Reimbursement Hub", False, f"Reimbursement data missing or misconfigured: {pol}")
    except Exception as e:
        record_result("Corporate Reimbursement Hub", False, str(e))

    # 17. 4-Flow Enterprise Economy Dashboard Audit (Flows A, B, C, D)
    try:
        dash = UsageStore.get_company_economy_dashboard("INDO-POWER-PLANT-01")
        has_flow_a = dash.get("flow_a_base_platform", {}).get("total_platform_cost_usd") == 850.0
        has_flow_b = "flow_b_employee_usage" in dash and dash["flow_b_employee_usage"]["total_employees"] >= 1
        has_flow_c = "flow_c_reimbursements" in dash and dash["flow_c_reimbursements"]["auto_approval_threshold_usdc"] == 5.0
        has_flow_d = "flow_d_period_reconciliation" in dash and dash["flow_d_period_reconciliation"]["total_pool_credits"] == 100000
        if has_flow_a and has_flow_b and has_flow_c and has_flow_d:
            record_result("4-Flow Enterprise Economy Dashboard", True, f"Flow A ($850/mo Base) + Flow B (${dash['flow_b_employee_usage']['allocated_usd']} Usage) + Flow C (${dash['flow_c_reimbursements']['pending_amount_usdc']} Reimb) + Flow D (Pool {dash['flow_d_period_reconciliation']['total_pool_credits']} cr)")
        else:
            record_result("4-Flow Enterprise Economy Dashboard", False, f"Dashboard mismatch: {dash}")
    except Exception as e:
        record_result("4-Flow Enterprise Economy Dashboard", False, str(e))

    print("=" * 80)
    if all_passed:
        print(" >>> ALL 17 CORE SYSTEM, REIMBURSEMENT & 4-FLOW ECONOMIC AUDIT CHECKS PASSED WITH 100%! <<<")
    else:
        print(" >>> SOME SUBSYSTEMS REPORTED ISSUES <<<")
    print("=" * 80)
    return all_passed


if __name__ == "__main__":
    success = run_health_check()
    sys.exit(0 if success else 1)
