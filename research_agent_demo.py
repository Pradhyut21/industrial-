"""
research_agent_demo.py
======================
DeadMind Autonomous Continuity Research Agent with Spend Policy Guard
Aligned with the official Algorand x402 Hackathon Builder Kit:
https://x402-kit-kappa.vercel.app/

Demonstrates:
  1. Autonomous Agent receives task: "Retrieve Rajan Sharma's Boiler Handoff Brief"
  2. Agent calls protected endpoint -> receives HTTP 402 with x402 payment challenge
  3. Spend Policy Guard verifies payment constraints (budget, network, recipient, max cost)
  4. Agent executes & signs Algorand transaction autonomously (no human in the loop)
  5. Agent presents on-chain proof (X-PAYMENT) -> unlocks Continuity Intelligence Brief

Run with:
    python research_agent_demo.py
"""

import os
import sys
import json
import time
import base64
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import List, Optional

# ── Load Environment ─────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(".env")
except ImportError:
    pass

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
NODE_URL    = os.environ.get("ALGORAND_NODE_URL", "https://testnet-api.algonode.cloud")
AGENT_MNEMONIC = os.environ.get(
    "ALGORAND_AGENT_MNEMONIC",
    "possible law announce dizzy sing doll ribbon there immense steel nasty defy blur refuse pill sponsor since budget drastic finger salt soft hazard ability element"
)


# ══════════════════════════════════════════════════════════════════════════════
# 🛡️ SPEND POLICY GUARD (Official x402 Kit Architectural Pattern)
# ══════════════════════════════════════════════════════════════════════════════
@dataclass
class SpendPolicyGuard:
    """
    Prevents autonomous agent runaway spend and ensures safety parameters:
      - Max cost per API call
      - Total cumulative budget cap
      - Whitelisted networks & schemes
      - Whitelisted merchant recipients
    """
    max_cost_microalgo: int = 50_000         # Max 0.05 ALGO per single request
    daily_budget_microalgo: int = 2_000_000  # Max 2.0 ALGO total daily budget
    allowed_networks: List[str] = field(default_factory=lambda: ["algorand-testnet", "algorand-mainnet"])
    allowed_schemes: List[str] = field(default_factory=lambda: ["exact"])
    whitelisted_merchants: Optional[List[str]] = None
    
    _total_spent_microalgo: int = 0

    def evaluate(self, payment_terms: dict) -> tuple[bool, str]:
        """
        Evaluates the machine-readable 402 challenge against the safety policy.
        """
        # 1. Scheme Check
        scheme = payment_terms.get("scheme", "")
        if scheme not in self.allowed_schemes:
            return False, f"Policy Violation: Disallowed payment scheme '{scheme}' (allowed: {self.allowed_schemes})"

        # 2. Network Check
        network = payment_terms.get("network", "")
        if network not in self.allowed_networks:
            return False, f"Policy Violation: Network '{network}' not in allowed list {self.allowed_networks}"

        # 3. Cost Per Call Check
        try:
            req_amount = int(payment_terms.get("maxAmountRequired", 0))
        except (ValueError, TypeError):
            return False, "Policy Violation: Malformed maxAmountRequired in payment terms"

        if req_amount > self.max_cost_microalgo:
            return False, (
                f"Policy Violation: Requested cost {req_amount:,} µALGO exceeds "
                f"maximum per-call limit {self.max_cost_microalgo:,} µALGO"
            )

        # 4. Budget Check
        if self._total_spent_microalgo + req_amount > self.daily_budget_microalgo:
            return False, (
                f"Policy Violation: Payment of {req_amount:,} µALGO would breach "
                f"daily budget cap ({self._total_spent_microalgo:,}/{self.daily_budget_microalgo:,} µALGO)"
            )

        # 5. Merchant Whitelist (if configured)
        pay_to = payment_terms.get("payTo", "")
        if self.whitelisted_merchants and pay_to not in self.whitelisted_merchants:
            return False, f"Policy Violation: Merchant '{pay_to}' is not in approved merchant whitelist"

        return True, f"Policy Check Approved: {req_amount:,} µALGO on {network} to {pay_to[:8]}...{pay_to[-6:]}"

    def record_spend(self, amount_microalgo: int):
        self._total_spent_microalgo += amount_microalgo


# ══════════════════════════════════════════════════════════════════════════════
# 🤖 AUTONOMOUS RESEARCH AGENT
# ══════════════════════════════════════════════════════════════════════════════
class DeadMindResearchAgent:
    def __init__(self, mnemonic_phrase: str, policy: SpendPolicyGuard):
        self.mnemonic = mnemonic_phrase
        self.policy = policy
        
        from algosdk import account, mnemonic as algomn
        self.private_key = algomn.to_private_key(self.mnemonic)
        self.address = account.address_from_private_key(self.private_key)
        
        from algosdk.v2client import algod
        self.algod = algod.AlgodClient("", NODE_URL)

    def get_balance(self) -> int:
        try:
            info = self.algod.account_info(self.address)
            return info.get("amount", 0)
        except Exception:
            return 0

    def execute_research_task(self, resource_url: str):
        print()
        print("+" + "=" * 70 + "+")
        print("|   DeadMind Autonomous Continuity Research Agent (x402 + Algorand)   |")
        print("+" + "=" * 70 + "+")
        print(f"  Agent Identity : {self.address}")
        balance = self.get_balance()
        print(f"  Wallet Balance : {balance:,} microALGO ({balance/1e6:.4f} ALGO)")
        print(f"  Target Resource: {resource_url}")
        print("-" * 72)

        # ── Step 1: Initial Discovery Request (Expect 402) ───────────────────
        print("\n[Phase 1] Probing target endpoint (no payment header attached)...")
        req = urllib.request.Request(resource_url)
        payment_terms = None
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                print("  [Notice] Endpoint returned 200 without payment (unprotected route).")
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 402:
                body = json.loads(e.read().decode())
                print(f"  [PASS] Received HTTP 402 Payment Required (x402 Protocol v{body.get('x402Version')})")
                payment_terms = body.get("accepts", [{}])[0]
                print(f"    - Network    : {payment_terms.get('network')}")
                print(f"    - Scheme     : {payment_terms.get('scheme')}")
                print(f"    - Amount     : {payment_terms.get('maxAmountRequired')} microALGO")
                print(f"    - Pay To     : {payment_terms.get('payTo')}")
                print(f"    - Facilitator: {payment_terms.get('facilitator')}")
            else:
                print(f"  [FAIL] Unexpected HTTP {e.code}: {e.reason}")
                return None
        except Exception as ex:
            print(f"  [FAIL] Connection error: {ex}")
            return None

        if not payment_terms:
            print("  [FAIL] Failed to parse x402 payment requirements.")
            return None

        # ── Step 2: Spend Policy Guard Evaluation ────────────────────────────
        print("\n[Phase 2] Evaluating Spend Policy Guard safety constraints...")
        approved, reason = self.policy.evaluate(payment_terms)
        if not approved:
            print(f"  [GUARD BLOCKED] {reason}")
            print("  Agent halted autonomous payment to protect wallet funds.")
            return None
        print(f"  [GUARD APPROVED] {reason}")

        # ── Step 3: Autonomous On-Chain Settlement ───────────────────────────
        print("\n[Phase 3] Constructing & signing Algorand settlement transaction...")
        recipient_addr = payment_terms.get("payTo")
        amount_micro = int(payment_terms.get("maxAmountRequired", 10000))

        if balance < amount_micro + 1000:
            print(f"  [FAIL] Insufficient balance ({balance:,} microALGO).")
            print(f"  Please fund agent wallet at:")
            print(f"    https://bank.testnet.algorand.network/ or https://lora.algokit.io/testnet/fund")
            print(f"    Address: {self.address}")
            return None

        from algosdk import transaction
        params = self.algod.suggested_params()
        
        txn = transaction.PaymentTxn(
            sender=self.address,
            sp=params,
            receiver=recipient_addr,
            amt=amount_micro,
            note=b"DeadMind x402 Agent Research Settlement",
        )
        signed_txn = txn.sign(self.private_key)
        txn_id = self.algod.send_transaction(signed_txn)
        print(f"  [PASS] Transaction broadcast to Algorand TestNet: {txn_id}")
        
        print("  Waiting for round confirmation on AlgoNode...")
        transaction.wait_for_confirmation(self.algod, txn_id, 4)
        print(f"  *** Confirmed on-chain! Explorer: https://testnet.explorer.perawallet.app/tx/{txn_id}")
        self.policy.record_spend(amount_micro)

        # ── Step 4: Token Proof Assembly & Resource Unlocking ─────────────────
        print("\n[Phase 4] Retrying request with cryptographic proof (X-PAYMENT header)...")
        payment_token = base64.b64encode(json.dumps({
            "txn_id": txn_id,
            "network": payment_terms.get("network", "algorand-testnet"),
            "sender": self.address,
            "receiver": recipient_addr,
            "amount": amount_micro,
        }).encode()).decode()

        req2 = urllib.request.Request(
            resource_url,
            headers={
                "X-PAYMENT": payment_token,
                "Content-Type": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req2, timeout=15) as resp:
                brief_data = json.loads(resp.read().decode())
                print(f"  [PASS] HTTP 200 OK — Resource unlocked!")
                print("=" * 72)
                print("  RETRIEVED CONTINUITY BRIEF (EXCERPT):")
                print("=" * 72)
                print(f"  Engineer Name : {brief_data.get('engineer_name', 'Rajan Sharma')}")
                print(f"  Role Title    : {brief_data.get('role', 'Senior Boiler & Turbine Lead')}")
                print(f"  Status        : {brief_data.get('verification_status', 'Peer-Verified')}")
                summary = brief_data.get('summary', '') or brief_data.get('executive_summary', '')
                print(f"  Summary       : {summary[:250]}...")
                print("=" * 72)
                return brief_data
        except urllib.error.HTTPError as e:
            print(f"  Facilitator verification status: HTTP {e.code} ({e.reason})")
            print(f"  On-chain txn is still permanently valid at https://testnet.explorer.perawallet.app/tx/{txn_id}")
            return None
        except Exception as ex:
            print(f"  Failed: {ex}")
            return None


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    guard = SpendPolicyGuard(
        max_cost_microalgo=50_000,        # 0.05 ALGO limit
        daily_budget_microalgo=1_000_000, # 1.00 ALGO daily cap
        allowed_networks=["algorand-testnet", "algorand-mainnet"]
    )
    
    agent = DeadMindResearchAgent(AGENT_MNEMONIC, policy=guard)
    target = f"{BACKEND_URL}/x402/vault/1/brief"
    agent.execute_research_task(target)
