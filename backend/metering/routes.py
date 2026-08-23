"""
DeadMind Usage Metering, Enterprise AI Economy & Reimbursement FastAPI Router.
Exposes company governance, 4-flow economy dashboard, employee usage accounts,
reimbursement lifecycles, service discovery, period-end reconciliation, and demo controls.
"""
import uuid
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from backend.metering.store import UsageStore
from backend.metering.meter import usage_meter
from backend.metering.pricing import pricing_engine
from backend.metering.reimbursement import reimbursement_engine

metering_router = APIRouter(prefix="/api", tags=["Usage Metering & Economy"])


# ── Pydantic Request Models ──────────────────────────────────────────────────
class TopupX402Payload(BaseModel):
    user_id: str = "default_user"
    credits_to_add: int
    amount_microusdc: int
    txn_id: str
    payer_address: str
    service_tier: Optional[str] = "Overage Allowance Top-Up"


class AllocateCreditsPayload(BaseModel):
    company_id: str = "INDO-POWER-PLANT-01"
    user_id: str
    amount: int
    source: Optional[str] = "Company Funded Pool"


class ReconcilePeriodPayload(BaseModel):
    company_id: str = "INDO-POWER-PLANT-01"
    period_name: str = "August 2026"
    reconciled_by: Optional[str] = "Plant Operations Admin"


class SimulateConsumptionPayload(BaseModel):
    user_id: str = "default_user"
    credits_to_consume: int
    description: Optional[str] = "Simulated manual workload"


class UpdatePolicyPayload(BaseModel):
    company_id: str = "INDO-POWER-PLANT-01"
    max_reimbursement_per_employee_usdc: Optional[float] = None
    max_daily_overage_usdc: Optional[float] = None
    max_monthly_overage_usdc: Optional[float] = None
    auto_approval_threshold_usdc: Optional[float] = None
    allowed_services: Optional[str] = None


class ApproveReimbursementPayload(BaseModel):
    reviewer_id: Optional[str] = "Plant Operations Admin"
    notes: Optional[str] = None


class RejectReimbursementPayload(BaseModel):
    reviewer_id: Optional[str] = "Plant Operations Admin"
    notes: Optional[str] = "Rejected: unapproved personal query scope"


class PayoutReimbursementPayload(BaseModel):
    payout_method: Optional[str] = "corporate_payroll_credit"  # 'corporate_payroll_credit', 'direct_usdc_payout', 'expense_account'
    processed_by: Optional[str] = "Corporate Finance"
    reference: Optional[str] = None


# ── 1. Service Discovery Catalog (Section 16) ────────────────────────────────
@metering_router.get("/services")
def get_service_discovery_catalog():
    """
    Returns available DeadMind industrial knowledge services with base costs,
    estimated usage ranges, and x402 payment requirements for autonomous agents and clients.
    """
    return {
        "platform": "DeadMind Industrial Collective-Memory Platform",
        "protocol": "RFC x402 Machine-to-Machine Payment Protocol",
        "settlement_network": "Algorand Testnet (USDC ASA ID 10458941)",
        "internal_usage_unit": "DeadMind Credits (1 Credit = 0.0010 USDC)",
        "services": pricing_engine.get_service_catalog()
    }


# ── 2. Comprehensive 4-Flow Company Economy Dashboard (Sections 13 & 16) ──────
@metering_router.get("/metering/company/{company_id}/dashboard")
def get_company_economy_dashboard(company_id: str = "INDO-POWER-PLANT-01"):
    """
    Unites all 4 enterprise economic flows:
    - Flow A: Base Platform Infrastructure Costs (Cloud, DB, Storage, AI Baseline)
    - Flow B: Employee Usage Allocations, Consumption & Overage Volume
    - Flow C: Company Employee Reimbursements (Pending, Approved, Reimbursed)
    - Flow D: Period Reconciliation & Unused Allowance Returned to Pool
    """
    return UsageStore.get_company_economy_dashboard(company_id)


@metering_router.get("/metering/company/{company_id}/base-costs")
def get_platform_base_costs(company_id: str = "INDO-POWER-PLANT-01"):
    """Retrieves baseline platform costs (Flow A)."""
    return UsageStore.get_platform_base_costs(company_id)


@metering_router.get("/metering/company/{company_id}")
def get_company_governance(company_id: str = "INDO-POWER-PLANT-01"):
    """Returns company credit pool, employee allocations, total consumption, and overages."""
    return UsageStore.get_company_pool(company_id)


@metering_router.post("/metering/company/allocate")
def allocate_credits_to_employee(payload: AllocateCreditsPayload):
    """Allocates credits from company pool to an employee usage account."""
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Allocation amount must be greater than 0")
    try:
        return UsageStore.allocate_employee_credits(
            company_id=payload.company_id,
            user_id=payload.user_id,
            amount=payload.amount,
            source=payload.source or "Company Funded Pool"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── 3. Corporate Employee Reimbursement System (Sections 8, 9, 10, 15) ────────
@metering_router.get("/reimbursements")
def list_reimbursements(
    company_id: str = "INDO-POWER-PLANT-01",
    status: Optional[str] = Query(None, description="Filter by status: PENDING_REIMBURSEMENT, APPROVED, REJECTED, REIMBURSED, AUTO_APPROVED, ALL"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID")
):
    """Lists employee x402 overage reimbursement requests and corporate approval states."""
    requests = reimbursement_engine.list_reimbursements(company_id, status=status, employee_id=employee_id)
    summary = reimbursement_engine.get_company_reimbursement_summary(company_id)
    return {
        "company_id": company_id,
        "summary": summary,
        "requests": requests
    }


@metering_router.get("/reimbursements/policy/{company_id}")
def get_reimbursement_policy(company_id: str = "INDO-POWER-PLANT-01"):
    """Retrieves corporate reimbursement rules and auto-approval thresholds."""
    return reimbursement_engine.get_policy(company_id)


@metering_router.put("/reimbursements/policy/{company_id}")
def update_reimbursement_policy(company_id: str, payload: UpdatePolicyPayload):
    """Updates corporate reimbursement limits and auto-approval parameters."""
    return reimbursement_engine.update_policy(
        company_id=company_id,
        max_reimbursement_per_employee_usdc=payload.max_reimbursement_per_employee_usdc,
        max_daily_overage_usdc=payload.max_daily_overage_usdc,
        max_monthly_overage_usdc=payload.max_monthly_overage_usdc,
        auto_approval_threshold_usdc=payload.auto_approval_threshold_usdc,
        allowed_services=payload.allowed_services
    )


@metering_router.post("/reimbursements/{request_id}/approve")
def approve_reimbursement(request_id: str, payload: ApproveReimbursementPayload):
    """Approves a pending employee overage reimbursement request."""
    try:
        return reimbursement_engine.approve_request(
            request_id=request_id,
            reviewer_id=payload.reviewer_id or "Plant Operations Admin",
            notes=payload.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@metering_router.post("/reimbursements/{request_id}/reject")
def reject_reimbursement(request_id: str, payload: RejectReimbursementPayload):
    """Rejects an employee overage reimbursement request."""
    try:
        return reimbursement_engine.reject_request(
            request_id=request_id,
            reviewer_id=payload.reviewer_id or "Plant Operations Admin",
            notes=payload.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@metering_router.post("/reimbursements/{request_id}/payout")
def payout_reimbursement(request_id: str, payload: PayoutReimbursementPayload):
    """Executes corporate reimbursement payout (e.g. payroll credit) and marks request REIMBURSED."""
    try:
        return reimbursement_engine.payout_request(
            request_id=request_id,
            payout_method=payload.payout_method or "corporate_payroll_credit",
            processed_by=payload.processed_by or "Corporate Finance",
            reference=payload.reference
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── 4. Period-End Unused Credit Reconciliation (Sections 11 & 18) ─────────────
@metering_router.post("/metering/company/reconcile")
def reconcile_period_end(payload: ReconcilePeriodPayload):
    """
    Closes an allocation period, reconciles unconsumed credits across all employees,
    and returns unused credits to the Company Credit Pool.
    """
    return UsageStore.reconcile_period_close(
        company_id=payload.company_id,
        period_name=payload.period_name,
        reconciled_by=payload.reconciled_by or "Plant Operations Admin"
    )


@metering_router.get("/metering/company/{company_id}/reconciliations")
def list_reconciliations(company_id: str = "INDO-POWER-PLANT-01"):
    """Returns audit log of all period reconciliations."""
    return UsageStore.list_period_reconciliations(company_id)


# ── 5. Employee Usage Account Endpoints (Section 17) ─────────────────────────
@metering_router.get("/metering/account/{user_id}")
def get_user_account(user_id: str):
    """Returns employee allocated allowance, used credits, remaining balance, and categorized usage breakdown."""
    return UsageStore.get_account_breakdown(user_id)


@metering_router.get("/metering/account")
def get_default_account():
    """Returns default user account breakdown."""
    return UsageStore.get_account_breakdown("default_user")


# ── 6. Payment Ledger & Idempotent x402 Settlement (Sections 5, 6, 14) ────────
@metering_router.get("/metering/payments")
def get_payment_ledger():
    """Returns immutable on-chain x402 financial settlement audit log with Lora explorer links."""
    return UsageStore.get_payment_ledger()


@metering_router.post("/metering/topup-x402")
def topup_account_via_x402(payload: TopupX402Payload):
    """
    Idempotently settles an x402 micropayment, replenishes the employee's credit pool,
    logs to the financial settlement ledger, and creates a corporate reimbursement request.
    """
    if payload.credits_to_add <= 0:
        raise HTTPException(status_code=400, detail="Credits to add must be greater than 0")
    if not payload.txn_id or not payload.payer_address:
        raise HTTPException(status_code=400, detail="Valid Algorand txn_id and payer_address required")

    result = UsageStore.topup_account_x402(
        user_id=payload.user_id,
        credits_to_add=payload.credits_to_add,
        amount_microusdc=payload.amount_microusdc,
        txn_id=payload.txn_id,
        payer_address=payload.payer_address,
        service_tier=payload.service_tier or "Overage Allowance Top-Up"
    )
    return result


# ── 7. Hackathon Demo Controls (Section 21) ──────────────────────────────────
@metering_router.post("/metering/demo/simulate-depletion")
def simulate_depletion(payload: SimulateConsumptionPayload):
    """Demo control: depletes user allowance to test HTTP 402 and overage flow."""
    acc = UsageStore.get_or_create_account(payload.user_id)
    cur_bal = acc["balance_credits"]
    result = UsageStore.deduct_credits(
        user_id=payload.user_id,
        credits=cur_bal,
        description="Demo simulation: depleted allowance to 0 credits",
        service_type="chat"
    )
    return {
        "status": "depleted",
        "user_id": payload.user_id,
        "credits_depleted": cur_bal,
        "new_balance": 0,
        "note": "DEMO / SIMULATED — Next query will trigger an RFC HTTP 402 challenge for the exact overage."
    }


@metering_router.post("/metering/demo/refill")
def demo_refill(user_id: str = "default_user", credits: int = 500):
    """Demo control: refills credits via simulated x402 settlement and queues reimbursement."""
    fake_txn = f"DEMOSETTLE{uuid.uuid4().hex[:12].upper()}"
    return UsageStore.topup_account_x402(
        user_id=user_id,
        credits_to_add=credits,
        amount_microusdc=credits * 1000,
        txn_id=fake_txn,
        payer_address="ALGORAND7DEMO4AGENT2SETTLEMENT6KEYPAIR",
        service_tier="Demo Allowance Refill"
    )


@metering_router.post("/metering/demo/reset")
def demo_reset():
    """Demo control: resets company pool to 100k credits and restores employee accounts."""
    return UsageStore.reset_demo_economy("INDO-POWER-PLANT-01")
