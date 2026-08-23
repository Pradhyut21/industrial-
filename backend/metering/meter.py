"""
DeadMind Usage Metering Engine.
Measures computation, retrieval, expert twin invocation, and uncertainty analysis;
performs real-time credit checks, exact overage calculation, and RFC-compliant x402 challenge generation.
"""
import uuid
import datetime
from typing import Dict, Any, Optional
from backend.metering.store import UsageStore
from backend.metering.pricing import pricing_engine, USDC_PER_CREDIT_MICRO
from backend.vault.x402_middleware import PAYMENT_ADDRESS, FACILITATOR_URL, NETWORK


class UsageMeter:
    @staticmethod
    def calculate_query_cost(
        query: str,
        experts_count: int = 0,
        has_consensus: bool = False,
        has_uncertainty: bool = True,
        analysis_mode: str = "standard",
        token_count: int = 0
    ) -> Dict[str, Any]:
        """Calculates dynamic itemized cost in DeadMind Credits via centralized pricing engine."""
        return pricing_engine.calculate_cost(
            service_type="chat" if analysis_mode == "standard" else "agent_query",
            query=query,
            experts_count=experts_count,
            has_consensus=has_consensus,
            has_uncertainty=has_uncertainty,
            analysis_mode=analysis_mode,
            token_count=token_count
        )

    @staticmethod
    def evaluate_credit_allowance(
        user_id: str,
        required_credits: int,
        resource_url: str = "/api/chat/query"
    ) -> Dict[str, Any]:
        """
        Checks user account balance against required credits.
        If sufficient -> returns allowed = True.
        If exhausted -> returns allowed = False with exact overage and RFC x402 challenge terms.
        """
        acc = UsageStore.get_or_create_account(user_id)
        current_balance = acc["balance_credits"]

        if current_balance >= required_credits:
            return {
                "allowed": True,
                "current_balance": current_balance,
                "required_credits": required_credits,
                "overage_credits": 0,
                "x402_challenge": None
            }

        # Exact overage requirement: only charge for what exceeds the current balance!
        overage_credits = required_credits - current_balance
        price_microusdc = overage_credits * USDC_PER_CREDIT_MICRO
        price_usdc_formatted = f"{price_microusdc / 1_000_000:.4f} USDC"
        challenge_nonce = f"ovg_{uuid.uuid4().hex[:12]}"

        x402_terms = {
            "x402Version": 2,
            "status": 402,
            "error": "X402 Payment Required",
            "reason": "DEADMIND_CREDITS_EXHAUSTED",
            "message": f"Company credit allowance exhausted. Overage of {overage_credits} DeadMind Credits required to proceed.",
            "required_credits": required_credits,
            "available_credits": current_balance,
            "overage_credits": overage_credits,
            "payment_required": True,
            "usage_status": {
                "user_id": user_id,
                "allocated_credits": acc["allocated_credits"],
                "used_credits": acc["used_credits"],
                "balance_credits": current_balance,
                "required_credits": required_credits,
                "overage_credits": overage_credits
            },
            "accepts": [
                {
                    "scheme": "exact",
                    "network": f"algorand-{NETWORK}" if not NETWORK.startswith("algorand-") else NETWORK,
                    "asset": "USDC",
                    "assetId": 10458941,
                    "amount": str(price_microusdc),
                    "amountFormatted": price_usdc_formatted,
                    "payTo": PAYMENT_ADDRESS or "AB7CDOEJ2CAO5U4MYT4BG7G5ARW65BJPEPHLLI2BQ5HW653UYIM3XY4IUY",
                    "facilitator": FACILITATOR_URL,
                    "requiredHeader": "X-Payment",
                    "headerFormat": "base64(signed_algorand_transaction_bytes)",
                    "note": f"DeadMind Overage Settlement: {overage_credits} credits ({challenge_nonce})"
                }
            ],
            "catalogEntry": {
                "capability": "usage_overage_settlement",
                "description": f"Pay-per-use overage settlement for {overage_credits} DeadMind intelligence credits",
                "priceUSDC": price_usdc_formatted,
                "settlement": "Algorand ASA USDC Atomic Transfer"
            },
            "challenge_nonce": challenge_nonce
        }

        return {
            "allowed": False,
            "current_balance": current_balance,
            "required_credits": required_credits,
            "overage_credits": overage_credits,
            "x402_challenge": x402_terms
        }


usage_meter = UsageMeter()
