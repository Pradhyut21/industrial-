"""
DeadMind Enterprise Employee Reimbursement Engine.
Manages employee-paid x402 overage expense reimbursement lifecycles,
configurable corporate approval policies, auto-approval thresholds, and payout ledgers.
"""
import uuid
import datetime
from typing import Dict, Any, List, Optional
from backend.database import get_db_connection


class ReimbursementEngine:
    @staticmethod
    def get_policy(company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """Retrieves active corporate reimbursement policy."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reimbursement_policies WHERE company_id = ?", (company_id,))
        row = cursor.fetchone()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if not row:
            pol_id = f"pol_{uuid.uuid4().hex[:6]}"
            cursor.execute("""
            INSERT INTO reimbursement_policies (
                id, company_id, max_reimbursement_per_employee_usdc, max_daily_overage_usdc,
                max_monthly_overage_usdc, auto_approval_threshold_usdc, require_receipt,
                allowed_services, is_active, created_at, updated_at
            ) VALUES (?, ?, 100.0, 20.0, 150.0, 5.0, 0, 'all', 1, ?, ?)
            """, (pol_id, company_id, now, now))
            conn.commit()
            cursor.execute("SELECT * FROM reimbursement_policies WHERE company_id = ?", (company_id,))
            row = cursor.fetchone()

        policy = dict(row)
        conn.close()
        return policy

    @staticmethod
    def update_policy(
        company_id: str,
        max_reimbursement_per_employee_usdc: Optional[float] = None,
        max_daily_overage_usdc: Optional[float] = None,
        max_monthly_overage_usdc: Optional[float] = None,
        auto_approval_threshold_usdc: Optional[float] = None,
        allowed_services: Optional[str] = None
    ) -> Dict[str, Any]:
        """Updates company reimbursement policy parameters."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        policy = ReimbursementEngine.get_policy(company_id)
        max_emp = max_reimbursement_per_employee_usdc if max_reimbursement_per_employee_usdc is not None else policy["max_reimbursement_per_employee_usdc"]
        max_daily = max_daily_overage_usdc if max_daily_overage_usdc is not None else policy["max_daily_overage_usdc"]
        max_monthly = max_monthly_overage_usdc if max_monthly_overage_usdc is not None else policy["max_monthly_overage_usdc"]
        auto_thresh = auto_approval_threshold_usdc if auto_approval_threshold_usdc is not None else policy["auto_approval_threshold_usdc"]
        srvs = allowed_services if allowed_services is not None else policy["allowed_services"]

        cursor.execute("""
        UPDATE reimbursement_policies
        SET max_reimbursement_per_employee_usdc = ?,
            max_daily_overage_usdc = ?,
            max_monthly_overage_usdc = ?,
            auto_approval_threshold_usdc = ?,
            allowed_services = ?,
            updated_at = ?
        WHERE company_id = ?
        """, (max_emp, max_daily, max_monthly, auto_thresh, srvs, now, company_id))
        conn.commit()
        conn.close()
        return ReimbursementEngine.get_policy(company_id)

    @staticmethod
    def create_request_from_x402(
        user_id: str,
        company_id: str,
        payment_transaction_id: str,
        txn_id: str,
        amount_microusdc: int,
        credits_covered: int,
        service_tier: str,
        payer_address: str
    ) -> Dict[str, Any]:
        """
        Automatically generates an auditable reimbursement record whenever
        an employee pays an x402 overage from their personal wallet.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Fetch human-readable employee name
        cursor.execute("SELECT name FROM engineers WHERE name LIKE ? LIMIT 1", (f"%{user_id}%",))
        eng_row = cursor.fetchone()
        employee_name = eng_row["name"] if eng_row else user_id.replace("_", " ").title()

        amount_usdc = round(amount_microusdc / 1_000_000, 4)
        policy = ReimbursementEngine.get_policy(company_id)

        # 2. Evaluate Policy Auto-Approval
        auto_threshold = policy.get("auto_approval_threshold_usdc", 5.0)
        if amount_usdc <= auto_threshold:
            status = "AUTO_APPROVED"
            notes = f"Auto-approved by policy: amount (${amount_usdc:.4f} USDC) is within the ${auto_threshold:.2f} auto-approval threshold."
            reviewer_id = "System Reimbursement Policy Engine"
            reviewed_at = now
        else:
            status = "PENDING_REIMBURSEMENT"
            notes = f"Pending manager review: amount (${amount_usdc:.4f} USDC) exceeds the ${auto_threshold:.2f} auto-approval limit."
            reviewer_id = None
            reviewed_at = None

        request_id = f"reimb_{uuid.uuid4().hex[:10]}"
        request_number = f"REIMB-2026-{uuid.uuid4().hex[:6].upper()}"

        cursor.execute("""
        INSERT INTO reimbursement_requests (
            id, request_number, employee_id, employee_name, company_id,
            payment_transaction_id, txn_id, amount_usdc, amount_microusdc,
            credits_covered, service, status, notes, payer_address,
            reviewer_id, reviewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request_id, request_number, user_id, employee_name, company_id,
            payment_transaction_id, txn_id, amount_usdc, amount_microusdc,
            credits_covered, service_tier, status, notes, payer_address,
            reviewer_id, reviewed_at, now, now
        ))

        conn.commit()
        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        created_row = dict(cursor.fetchone())
        conn.close()
        return created_row

    @staticmethod
    def list_reimbursements(
        company_id: str = "INDO-POWER-PLANT-01",
        status: Optional[str] = None,
        employee_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lists all reimbursement requests with optional filtering."""
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM reimbursement_requests WHERE company_id = ?"
        params: List[Any] = [company_id]

        if status and status != "ALL":
            query += " AND status = ?"
            params.append(status)

        if employee_id and employee_id != "all":
            query += " AND employee_id = ?"
            params.append(employee_id)

        query += " ORDER BY id DESC"
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def approve_request(
        request_id: str,
        reviewer_id: str = "Plant Operations Admin",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approves a pending reimbursement request."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Reimbursement request '{request_id}' not found")

        curr_notes = row["notes"] or ""
        updated_notes = f"{curr_notes} | Approved by {reviewer_id} on {now}" if not notes else notes

        cursor.execute("""
        UPDATE reimbursement_requests
        SET status = 'APPROVED',
            reviewer_id = ?,
            reviewed_at = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
        """, (reviewer_id, now, updated_notes, now, request_id))
        conn.commit()

        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        res = dict(cursor.fetchone())
        conn.close()
        return res

    @staticmethod
    def reject_request(
        request_id: str,
        reviewer_id: str = "Plant Operations Admin",
        notes: Optional[str] = "Rejected: unapproved personal query scope"
    ) -> Dict[str, Any]:
        """Rejects a reimbursement request."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Reimbursement request '{request_id}' not found")

        cursor.execute("""
        UPDATE reimbursement_requests
        SET status = 'REJECTED',
            reviewer_id = ?,
            reviewed_at = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
        """, (reviewer_id, now, notes, now, request_id))
        conn.commit()

        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        res = dict(cursor.fetchone())
        conn.close()
        return res

    @staticmethod
    def payout_request(
        request_id: str,
        payout_method: str = "corporate_payroll_credit",
        processed_by: str = "Corporate Finance",
        reference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Marks an approved reimbursement as REIMBURSED and records the payout transaction.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Reimbursement request '{request_id}' not found")

        req = dict(row)
        if req["status"] not in ("APPROVED", "AUTO_APPROVED", "PENDING_REIMBURSEMENT"):
            conn.close()
            raise ValueError(f"Cannot payout request with status '{req['status']}'")

        payout_ref = reference or f"PAYOUT-{datetime.datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        tx_id = f"ptxn_{uuid.uuid4().hex[:10]}"

        # Record payout transaction
        cursor.execute("""
        INSERT INTO reimbursement_transactions (
            id, reimbursement_request_id, company_id, employee_id, payout_method,
            payout_amount_usdc, payout_reference, processed_by, processed_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
        """, (
            tx_id, request_id, req["company_id"], req["employee_id"],
            payout_method, req["amount_usdc"], payout_ref, processed_by, now
        ))

        # Update request status to REIMBURSED
        cursor.execute("""
        UPDATE reimbursement_requests
        SET status = 'REIMBURSED',
            reimbursed_at = ?,
            reimbursement_payout_txn_id = ?,
            updated_at = ?
        WHERE id = ?
        """, (now, tx_id, now, request_id))

        conn.commit()
        cursor.execute("SELECT * FROM reimbursement_requests WHERE id = ?", (request_id,))
        res = dict(cursor.fetchone())
        conn.close()
        return {
            "status": "success",
            "request": res,
            "payout_transaction_id": tx_id,
            "payout_reference": payout_ref,
            "amount_usdc": req["amount_usdc"],
            "payout_method": payout_method
        }

    @staticmethod
    def get_company_reimbursement_summary(company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """Calculates aggregate metrics for corporate reimbursements."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
        SELECT status, COUNT(*) as count, SUM(amount_usdc) as sum_amount
        FROM reimbursement_requests
        WHERE company_id = ?
        GROUP BY status
        """, (company_id,))
        rows = cursor.fetchall()
        conn.close()

        summary = {
            "pending_count": 0,
            "pending_amount_usdc": 0.0,
            "approved_count": 0,
            "approved_amount_usdc": 0.0,
            "reimbursed_count": 0,
            "reimbursed_amount_usdc": 0.0,
            "auto_approved_count": 0,
            "auto_approved_amount_usdc": 0.0,
            "rejected_count": 0,
            "rejected_amount_usdc": 0.0,
            "total_requests": 0,
            "total_overage_amount_usdc": 0.0
        }

        for r in rows:
            st = r["status"]
            cnt = r["count"]
            amt = round(r["sum_amount"] or 0.0, 4)
            summary["total_requests"] += cnt
            summary["total_overage_amount_usdc"] += amt

            if st == "PENDING_REIMBURSEMENT":
                summary["pending_count"] = cnt
                summary["pending_amount_usdc"] = amt
            elif st == "APPROVED":
                summary["approved_count"] = cnt
                summary["approved_amount_usdc"] = amt
            elif st == "REIMBURSED":
                summary["reimbursed_count"] = cnt
                summary["reimbursed_amount_usdc"] = amt
            elif st == "AUTO_APPROVED":
                summary["auto_approved_count"] = cnt
                summary["auto_approved_amount_usdc"] = amt
            elif st == "REJECTED":
                summary["rejected_count"] = cnt
                summary["rejected_amount_usdc"] = amt

        summary["total_overage_amount_usdc"] = round(summary["total_overage_amount_usdc"], 4)
        return summary


reimbursement_engine = ReimbursementEngine()
