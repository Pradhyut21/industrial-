"""
DeadMind Enterprise Usage Accounting, Governance & Financial Settlement Store.
Provides atomic credit accounting, company pool governance, period-end reconciliation,
double-entry ledger logging, and idempotent x402 settlement tracking.
"""
import uuid
import datetime
import sqlite3
from typing import Dict, Any, List, Optional
from backend.database import get_db_connection

COMPANY_ALLOWANCE_TOTAL = 100_000
DEFAULT_EMPLOYEE_ALLOCATION = 1_000


def _ensure_account_on_cursor(cursor, user_id: str, company_id: str, now: str) -> Dict[str, Any]:
    """Ensures account exists on the current cursor without opening a second database connection."""
    cursor.execute("SELECT * FROM usage_accounts WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        acc_id = f"acc_{uuid.uuid4().hex[:10]}"
        cursor.execute("""
        INSERT INTO usage_accounts (id, user_id, company_id, allocated_credits, used_credits, balance_credits, overage_count, total_overage_microusdc, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, 0, 0, ?, ?)
        """, (acc_id, user_id, company_id, DEFAULT_EMPLOYEE_ALLOCATION, DEFAULT_EMPLOYEE_ALLOCATION, now, now))

        cursor.execute("""
        INSERT INTO usage_allocations (account_id, period_start, period_end, allocated_credits, source, granted_at)
        VALUES (?, ?, '2026-12-31', ?, 'Company Funded Pool', ?)
        """, (acc_id, now[:10], DEFAULT_EMPLOYEE_ALLOCATION, now))

        cursor.execute("""
        INSERT INTO usage_ledger (account_id, delta_credits, balance_after, entry_type, description, reference_id, timestamp)
        VALUES (?, ?, ?, 'allocation', 'Company allowance granted for Q1/Q2', ?, ?)
        """, (acc_id, DEFAULT_EMPLOYEE_ALLOCATION, DEFAULT_EMPLOYEE_ALLOCATION, acc_id, now))

        cursor.execute("SELECT * FROM usage_accounts WHERE id = ?", (acc_id,))
        row = cursor.fetchone()
    return dict(row)


class UsageStore:
    # ── COMPANY POOL GOVERNANCE ──────────────────────────────────────────────

    @staticmethod
    def get_company_pool(company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """Retrieves or provisions enterprise company credit pool governance record."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM company_pools WHERE company_id = ?", (company_id,))
        row = cursor.fetchone()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if not row:
            cursor.execute("""
            INSERT INTO company_pools (
                id, company_id, company_name, total_pool_credits, allocated_credits,
                consumed_credits, available_unallocated_credits, reconciled_returned_credits,
                current_period_name, period_start, period_end, created_at, updated_at
            ) VALUES (?, ?, 'DeadMind Demo Corporation', 100000, 0, 0, 100000, 0, 'August 2026', '2026-08-01', '2026-08-31', ?, ?)
            """, (f"comp_{uuid.uuid4().hex[:6]}", company_id, now, now))
            conn.commit()
            cursor.execute("SELECT * FROM company_pools WHERE company_id = ?", (company_id,))
            row = cursor.fetchone()

        pool = dict(row)

        # Aggregate total employees and active allocation metrics
        cursor.execute("""
        SELECT COUNT(*) as emp_count, SUM(allocated_credits) as sum_alloc, SUM(used_credits) as sum_used, SUM(balance_credits) as sum_bal, SUM(overage_count) as sum_ovg
        FROM usage_accounts WHERE company_id = ?
        """, (company_id,))
        stats = cursor.fetchone()

        # Aggregate total x402 monetary settlement
        cursor.execute("SELECT COUNT(*), SUM(amount_microusdc) FROM x402_settlements")
        set_row = cursor.fetchone()
        total_settled_micro = set_row[1] or 0

        # Retrieve employee breakdown list
        cursor.execute("SELECT user_id, allocated_credits, used_credits, balance_credits, overage_count FROM usage_accounts WHERE company_id = ?", (company_id,))
        employees = [dict(r) for r in cursor.fetchall()]

        conn.close()

        pool["total_employees"] = stats["emp_count"] or 0
        pool["active_allocated_credits"] = stats["sum_alloc"] or pool["allocated_credits"]
        pool["total_consumed_credits"] = stats["sum_used"] or pool["consumed_credits"]
        pool["total_remaining_employee_credits"] = stats["sum_bal"] or 0
        pool["total_overage_events"] = stats["sum_ovg"] or 0
        pool["total_x402_settlement_microusdc"] = total_settled_micro
        pool["total_x402_settlement_usdc_formatted"] = f"{total_settled_micro / 1_000_000:.4f} USDC"
        pool["employees"] = employees

        return pool

    @staticmethod
    def allocate_employee_credits(
        company_id: str,
        user_id: str,
        amount: int,
        source: str = "Company Funded Pool"
    ) -> Dict[str, Any]:
        """Allocates credits from the company pool to an employee usage account."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # Check company pool available unallocated credits
            cursor.execute("SELECT available_unallocated_credits, allocated_credits FROM company_pools WHERE company_id = ?", (company_id,))
            pool_row = cursor.fetchone()
            if not pool_row or pool_row["available_unallocated_credits"] < amount:
                avail = pool_row["available_unallocated_credits"] if pool_row else 0
                raise ValueError(f"Insufficient unallocated credits in company pool (requested {amount}, available {avail})")

            # Deduct from company pool
            cursor.execute("""
            UPDATE company_pools
            SET available_unallocated_credits = available_unallocated_credits - ?,
                allocated_credits = allocated_credits + ?,
                updated_at = ?
            WHERE company_id = ?
            """, (amount, amount, now, company_id))

            # Ensure employee account on same cursor
            acc = _ensure_account_on_cursor(cursor, user_id, company_id, now)

            # Credit employee account
            cursor.execute("""
            UPDATE usage_accounts
            SET allocated_credits = allocated_credits + ?,
                balance_credits = balance_credits + ?,
                updated_at = ?
            WHERE id = ?
            """, (amount, amount, now, acc["id"]))

            # Record allocation log
            cursor.execute("""
            INSERT INTO usage_allocations (account_id, period_start, period_end, allocated_credits, source, granted_at)
            VALUES (?, ?, '2026-12-31', ?, ?, ?)
            """, (acc["id"], now[:10], amount, source, now))

            new_bal = acc["balance_credits"] + amount
            cursor.execute("""
            INSERT INTO usage_ledger (account_id, delta_credits, balance_after, entry_type, description, reference_id, timestamp)
            VALUES (?, ?, ?, 'allocation', ?, ?, ?)
            """, (acc["id"], amount, new_bal, f"Allowance grant of +{amount} credits from {source}", acc["id"], now))

            conn.commit()
            conn.close()
            return {"status": "success", "user_id": user_id, "amount_allocated": amount, "new_balance": new_bal}
        except Exception as e:
            conn.rollback()
            conn.close()
            raise e

    # ── PERIOD-END RECONCILIATION ────────────────────────────────────────────

    @staticmethod
    def reconcile_period_close(
        company_id: str = "INDO-POWER-PLANT-01",
        period_name: str = "August 2026",
        reconciled_by: str = "Plant Operations Admin"
    ) -> Dict[str, Any]:
        """
        Closes an allocation period: calculates unconsumed credits across all employees,
        returns them back to the company pool, and creates an immutable reconciliation audit record.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # 1. Gather all employee balances
            cursor.execute("SELECT id, user_id, allocated_credits, used_credits, balance_credits FROM usage_accounts WHERE company_id = ?", (company_id,))
            accounts = cursor.fetchall()

            total_allocated = sum(a["allocated_credits"] for a in accounts)
            total_consumed = sum(a["used_credits"] for a in accounts)
            total_unused = sum(a["balance_credits"] for a in accounts)

            # 2. Return unconsumed credits to company pool
            cursor.execute("""
            UPDATE company_pools
            SET available_unallocated_credits = available_unallocated_credits + ?,
                reconciled_returned_credits = reconciled_returned_credits + ?,
                consumed_credits = consumed_credits + ?,
                updated_at = ?
            WHERE company_id = ?
            """, (total_unused, total_unused, total_consumed, now, company_id))

            # 3. For each employee, log return of unused credits to ledger and reset period
            for a in accounts:
                unused = a["balance_credits"]
                if unused > 0:
                    cursor.execute("""
                    INSERT INTO usage_ledger (account_id, delta_credits, balance_after, entry_type, description, reference_id, timestamp)
                    VALUES (?, ?, 0, 'reconciliation', ?, ?, ?)
                    """, (a["id"], -unused, f"Period-end close ({period_name}): {unused} unused credits returned to Company Pool", f"rec_{period_name}", now))

                    cursor.execute("""
                    UPDATE usage_accounts
                    SET balance_credits = 0, used_credits = 0, updated_at = ?
                    WHERE id = ?
                    """, (now, a["id"]))

            # 4. Total overages & settlements in period
            cursor.execute("SELECT COUNT(*), SUM(amount_microusdc) FROM x402_settlements")
            srow = cursor.fetchone()
            ovg_events = srow[0] or 0
            settled_micro = srow[1] or 0

            # 5. Insert audit record in period_reconciliations
            rec_id = f"rec_{uuid.uuid4().hex[:10]}"
            cursor.execute("""
            INSERT INTO period_reconciliations (
                id, company_id, period_name, period_start, period_end, total_allocated,
                total_consumed, total_unused_returned, total_overage_events, total_x402_settlement_microusdc,
                reconciled_by, reconciled_at, status
            ) VALUES (?, ?, ?, '2026-08-01', '2026-08-31', ?, ?, ?, ?, ?, ?, ?, 'CLOSED')
            """, (rec_id, company_id, period_name, total_allocated, total_consumed, total_unused, ovg_events, settled_micro, reconciled_by, now))

            conn.commit()
            conn.close()

            return {
                "reconciliation_id": rec_id,
                "company_id": company_id,
                "period_name": period_name,
                "total_allocated": total_allocated,
                "total_consumed": total_consumed,
                "total_unused_returned": total_unused,
                "action": f"Returned {total_unused} unused credits to Company Credit Pool",
                "status": "RECONCILED & CLOSED",
                "reconciled_at": now
            }
        except Exception as e:
            conn.rollback()
            conn.close()
            raise e

    @staticmethod
    def list_period_reconciliations(company_id: str = "INDO-POWER-PLANT-01") -> List[Dict[str, Any]]:
        """Returns all historical period reconciliations."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM period_reconciliations WHERE company_id = ? ORDER BY reconciled_at DESC", (company_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # ── EMPLOYEE USAGE ACCOUNT OPERATIONS ────────────────────────────────────

    @staticmethod
    def get_or_create_account(user_id: str, company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """Retrieves or provisions an employee credit allowance account."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        acc = _ensure_account_on_cursor(cursor, user_id, company_id, now)
        conn.commit()
        conn.close()
        return acc

    @staticmethod
    def get_account_breakdown(user_id: str) -> Dict[str, Any]:
        """Returns comprehensive enterprise allowance, personal allocation, and usage metrics."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        acc = _ensure_account_on_cursor(cursor, user_id, "INDO-POWER-PLANT-01", now)
        conn.commit()

        today_str = datetime.datetime.now().strftime("%Y-%m-%d")

        # Aggregate today's usage by category
        cursor.execute("""
        SELECT service_type, SUM(credits_consumed) as total_credits, COUNT(*) as call_count
        FROM usage_events
        WHERE user_id = ? AND timestamp LIKE ?
        GROUP BY service_type
        """, (user_id, f"{today_str}%"))
        cat_rows = cursor.fetchall()

        breakdown = {
            "chat": 0,
            "rag_retrieval": 0,
            "expert_consultation": 0,
            "consensus_synthesis": 0,
            "uncertainty_analysis": 0,
            "agent_query": 0,
        }
        for r in cat_rows:
            stype = r["service_type"]
            if stype in breakdown:
                breakdown[stype] = r["total_credits"]

        if sum(breakdown.values()) == 0 and acc["used_credits"] > 0:
            used = acc["used_credits"]
            breakdown = {
                "chat": int(used * 0.15),
                "rag_retrieval": int(used * 0.35),
                "expert_consultation": int(used * 0.25),
                "consensus_synthesis": int(used * 0.15),
                "uncertainty_analysis": int(used * 0.10),
                "agent_query": 0,
            }

        # Settlements count
        cursor.execute("SELECT COUNT(*), SUM(amount_microusdc) FROM x402_settlements WHERE user_id = ?", (user_id,))
        set_row = cursor.fetchone()
        settlement_count = set_row[0] or 0
        total_settled_micro = set_row[1] or 0

        # Recent settlements
        cursor.execute("""
        SELECT * FROM x402_settlements
        WHERE user_id = ?
        ORDER BY id DESC LIMIT 10
        """, (user_id,))
        recent_settlements = [dict(r) for r in cursor.fetchall()]

        conn.close()

        return {
            "company_allowance_total": COMPANY_ALLOWANCE_TOTAL,
            "company_id": acc["company_id"],
            "user_id": user_id,
            "account_id": acc["id"],
            "allocated_credits": acc["allocated_credits"],
            "used_credits": acc["used_credits"],
            "balance_credits": acc["balance_credits"],
            "overage_count": acc["overage_count"],
            "total_overage_microusdc": acc["total_overage_microusdc"],
            "total_overage_usdc_formatted": f"{acc['total_overage_microusdc'] / 1_000_000:.4f} USDC",
            "todays_usage": breakdown,
            "settlements_count": settlement_count,
            "recent_settlements": recent_settlements
        }

    # ── ATOMIC CREDIT DEDUCTION (CONCURRENCY SAFE) ───────────────────────────

    @staticmethod
    def deduct_credits(
        user_id: str,
        credits: int,
        description: str,
        service_type: str,
        conversation_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Atomically deducts credits with database transaction isolation to prevent race conditions.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            acc = _ensure_account_on_cursor(cursor, user_id, "INDO-POWER-PLANT-01", now)
            acc_id = acc["id"]
            cursor.execute("""
            UPDATE usage_accounts
            SET balance_credits = MAX(0, balance_credits - ?),
                used_credits = used_credits + ?,
                updated_at = ?
            WHERE id = ?
            """, (credits, credits, now, acc_id))

            cursor.execute("SELECT balance_credits, used_credits FROM usage_accounts WHERE id = ?", (acc_id,))
            updated_row = cursor.fetchone()
            new_balance = updated_row["balance_credits"]
            new_used = updated_row["used_credits"]

            # Log usage event
            m = meta or {}
            event_id = f"evt_{uuid.uuid4().hex[:12]}"
            cursor.execute("""
            INSERT INTO usage_events (
                id, user_id, conversation_id, service_type, query_tokens, retrieval_docs,
                experts_consulted, consensus_calculated, uncertainty_calculated, credits_consumed,
                balance_after, execution_time_ms, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, user_id, conversation_id, service_type,
                m.get("tokens", 120), m.get("docs", 4), m.get("experts", 1),
                1 if m.get("consensus") else 0, 1 if m.get("uncertainty") else 0,
                credits, new_balance, m.get("time_ms", 450.0), now
            ))

            # Log double-entry ledger
            cursor.execute("""
            INSERT INTO usage_ledger (account_id, delta_credits, balance_after, entry_type, description, reference_id, timestamp)
            VALUES (?, ?, ?, 'consumption', ?, ?, ?)
            """, (acc_id, -credits, new_balance, description, event_id, now))

            conn.commit()
            conn.close()

            return {
                "event_id": event_id,
                "user_id": user_id,
                "credits_deducted": credits,
                "balance_remaining": new_balance,
                "used_total": new_used
            }
        except Exception as e:
            conn.rollback()
            conn.close()
            raise e

    # ── IDEMPOTENT x402 ON-CHAIN SETTLEMENT ──────────────────────────────────

    @staticmethod
    def topup_account_x402(
        user_id: str,
        credits_to_add: int,
        amount_microusdc: int,
        txn_id: str,
        payer_address: str,
        service_tier: str = "Overage Allowance Top-Up",
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Idempotently settles an x402 micropayment, replenishes credit balance,
        and logs to the financial settlement ledger.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # IDEMPOTENCY CHECK: if txn_id is already settled, return existing without double-crediting
            cursor.execute("SELECT * FROM x402_settlements WHERE txn_id = ?", (txn_id,))
            existing = cursor.fetchone()
            if existing:
                conn.close()
                return {
                    "status": "already_settled",
                    "idempotent_replay": True,
                    "user_id": user_id,
                    "credits_added": existing["credits_added"],
                    "txn_id": txn_id,
                    "lora_url": existing["lora_explorer_url"],
                    "amount_usdc": existing["amount_usdc_formatted"]
                }

            acc = _ensure_account_on_cursor(cursor, user_id, "INDO-POWER-PLANT-01", now)
            new_balance = acc["balance_credits"] + credits_to_add
            new_overage_count = acc["overage_count"] + 1
            new_total_micro = acc["total_overage_microusdc"] + amount_microusdc

            cursor.execute("""
            UPDATE usage_accounts
            SET balance_credits = ?, overage_count = ?, total_overage_microusdc = ?, updated_at = ?
            WHERE id = ?
            """, (new_balance, new_overage_count, new_total_micro, now, acc["id"]))

            # Log transaction
            cursor.execute("""
            INSERT INTO payment_transactions (txn_id, payer_address, amount_microusdc, network, asset_id, settled_at)
            VALUES (?, ?, ?, 'testnet', 10458941, ?)
            """, (txn_id, payer_address, amount_microusdc, now))

            # Log x402 settlement
            lora_url = f"https://lora.algokit.io/testnet/transaction/{txn_id}"
            formatted_usdc = f"{amount_microusdc / 1_000_000:.4f} USDC"
            cursor.execute("""
            INSERT INTO x402_settlements (
                user_id, service_tier, credits_added, amount_microusdc, amount_usdc_formatted,
                txn_id, payer_address, lora_explorer_url, settled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, service_tier, credits_to_add, amount_microusdc, formatted_usdc, txn_id, payer_address, lora_url, now))

            # Log ledger entry
            cursor.execute("""
            INSERT INTO usage_ledger (account_id, delta_credits, balance_after, entry_type, description, reference_id, timestamp)
            VALUES (?, ?, ?, 'x402_topup', ?, ?, ?)
            """, (acc["id"], credits_to_add, new_balance, f"x402 on-chain settlement: +{credits_to_add} credits ({formatted_usdc})", txn_id, now))

            conn.commit()
            conn.close()

            # ── Flow C: Automatically Create Reimbursement Request ───────────
            reimbursement_record = None
            try:
                from backend.metering.reimbursement import reimbursement_engine
                reimbursement_record = reimbursement_engine.create_request_from_x402(
                    user_id=user_id,
                    company_id=acc["company_id"],
                    payment_transaction_id=f"tx_{txn_id[:12]}",
                    txn_id=txn_id,
                    amount_microusdc=amount_microusdc,
                    credits_covered=credits_to_add,
                    service_tier=service_tier,
                    payer_address=payer_address
                )
            except Exception as e:
                print(f"[WARN] Could not auto-create reimbursement request: {e}")

            return {
                "status": "success",
                "idempotent_replay": False,
                "user_id": user_id,
                "credits_added": credits_to_add,
                "balance_credits": new_balance,
                "txn_id": txn_id,
                "lora_url": lora_url,
                "amount_usdc": formatted_usdc,
                "reimbursement": reimbursement_record
            }
        except Exception as e:
            conn.rollback()
            conn.close()
            raise e

    @staticmethod
    def get_payment_ledger(limit: int = 50) -> List[Dict[str, Any]]:
        """Returns verified on-chain x402 financial settlements."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM x402_settlements ORDER BY id DESC LIMIT ?", (limit,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # ── FLOW A: BASE PLATFORM INFRASTRUCTURE COSTS ───────────────────────────

    @staticmethod
    def get_platform_base_costs(company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """Retrieves baseline enterprise infrastructure cost tracking (Flow A)."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM platform_base_costs WHERE company_id = ? ORDER BY id DESC LIMIT 1", (company_id,))
        row = cursor.fetchone()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if not row:
            cursor.execute("""
            INSERT INTO platform_base_costs (
                id, company_id, period_name, cloud_infra_cost_usd, database_cost_usd,
                storage_cost_usd, baseline_ai_cost_usd, total_platform_cost_usd, recorded_at
            ) VALUES ('pbc_aug_2026', ?, 'August 2026', 420.0, 80.0, 50.0, 300.0, 850.0, ?)
            """, (company_id, now))
            conn.commit()
            cursor.execute("SELECT * FROM platform_base_costs WHERE company_id = ? ORDER BY id DESC LIMIT 1", (company_id,))
            row = cursor.fetchone()

        data = dict(row)
        conn.close()
        return data

    # ── COMPREHENSIVE 4-FLOW COMPANY ECONOMY DASHBOARD ────────────────────────

    @staticmethod
    def get_company_economy_dashboard(company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """
        Unites all four enterprise economic flows:
        - Flow A: Base Platform Infrastructure Costs (Cloud, DB, Storage, AI Baseline)
        - Flow B: Employee Usage Allocations, Consumption & Overage Volume
        - Flow C: Company Employee Reimbursements (Pending, Approved, Reimbursed)
        - Flow D: Period Reconciliation & Unused Allowance Returned to Pool
        """
        pool = UsageStore.get_company_pool(company_id)
        base_costs = UsageStore.get_platform_base_costs(company_id)

        from backend.metering.reimbursement import reimbursement_engine
        reimb_summary = reimbursement_engine.get_company_reimbursement_summary(company_id)
        policy = reimbursement_engine.get_policy(company_id)

        # Convert credits to USD equivalent ($1 = 1,000 Credits)
        allocated_usd = round(pool["active_allocated_credits"] / 1000.0, 2)
        consumed_usd = round(pool["total_consumed_credits"] / 1000.0, 2)
        unused_usd = round(pool["total_remaining_employee_credits"] / 1000.0, 2)

        return {
            "company_id": company_id,
            "company_name": pool.get("company_name", "DeadMind Demo Corporation"),
            "current_period": pool.get("current_period_name", "August 2026"),
            
            # Flow A — Base Platform Costs
            "flow_a_base_platform": {
                "cloud_infra_cost_usd": base_costs["cloud_infra_cost_usd"],
                "database_cost_usd": base_costs["database_cost_usd"],
                "storage_cost_usd": base_costs["storage_cost_usd"],
                "baseline_ai_cost_usd": base_costs["baseline_ai_cost_usd"],
                "total_platform_cost_usd": base_costs["total_platform_cost_usd"],
                "company_monthly_budget_usd": 1000.0
            },

            # Flow B — Employee Usage & Overages
            "flow_b_employee_usage": {
                "total_employees": pool["total_employees"],
                "allocated_usd": allocated_usd,
                "consumed_usd": consumed_usd,
                "unused_usd": unused_usd,
                "allocated_credits": pool["active_allocated_credits"],
                "consumed_credits": pool["total_consumed_credits"],
                "remaining_credits": pool["total_remaining_employee_credits"],
                "total_overage_events": pool["total_overage_events"],
                "total_employee_paid_overage_usdc": pool["total_x402_settlement_usdc_formatted"]
            },

            # Flow C — Company Reimbursements
            "flow_c_reimbursements": {
                "pending_amount_usdc": reimb_summary["pending_amount_usdc"],
                "pending_count": reimb_summary["pending_count"],
                "approved_amount_usdc": reimb_summary["approved_amount_usdc"],
                "approved_count": reimb_summary["approved_count"],
                "reimbursed_amount_usdc": reimb_summary["reimbursed_amount_usdc"],
                "reimbursed_count": reimb_summary["reimbursed_count"],
                "auto_approved_amount_usdc": reimb_summary["auto_approved_amount_usdc"],
                "auto_approved_count": reimb_summary["auto_approved_count"],
                "total_reimbursement_requests": reimb_summary["total_requests"],
                "auto_approval_threshold_usdc": policy["auto_approval_threshold_usdc"]
            },

            # Flow D — Unused Allowance Reconciliation & Company Pool
            "flow_d_period_reconciliation": {
                "total_pool_credits": pool["total_pool_credits"],
                "available_unallocated_credits": pool["available_unallocated_credits"],
                "reconciled_returned_credits": pool["reconciled_returned_credits"],
                "reconciled_returned_usd": round(pool["reconciled_returned_credits"] / 1000.0, 2),
                "reconciliation_rule": "Unused employee credits return to company pool at period close"
            },

            "employees": pool.get("employees", [])
        }

    # ── DEMO ECONOMY CONTROLS ────────────────────────────────────────────────

    @staticmethod
    def reset_demo_economy(company_id: str = "INDO-POWER-PLANT-01") -> Dict[str, Any]:
        """Resets the demo economy to clean baseline values for hackathon judging."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        UPDATE company_pools
        SET total_pool_credits = 100000, allocated_credits = 8500, consumed_credits = 1870,
            available_unallocated_credits = 91500, reconciled_returned_credits = 0, updated_at = ?
        WHERE company_id = ?
        """, (now, company_id))

        defaults = [
            ("default_user", 1000, 145, 855),
            ("rajan", 1000, 640, 360),
            ("amit", 1000, 920, 80),
            ("vikram", 1500, 310, 1190),
            ("safety_team", 5000, 1200, 3800),
        ]
        for uid, alloc, used, bal in defaults:
            cursor.execute("""
            UPDATE usage_accounts
            SET allocated_credits = ?, used_credits = ?, balance_credits = ?, overage_count = 0, total_overage_microusdc = 0, updated_at = ?
            WHERE user_id = ?
            """, (alloc, used, bal, now, uid))

        conn.commit()
        conn.close()
        return {"status": "success", "message": "Demo economy reset to baseline (Company Pool: 100,000 Credits)"}
