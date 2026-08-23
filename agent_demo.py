#!/usr/bin/env python3
"""
agent_demo.py
=============
Primary demo artifact for the DeadMind x402 Algorand submission.

Run this script for judges to demonstrate the machine-to-machine x402 payment
flow. It is the CORRECT pattern for this submission — not the browser wallet UI.

This script:
  1. Calls GET /x402/vault/{person_id}/brief with no payment
  2. Receives HTTP 402 — logs the payment terms (price, network, receiving address)
  3. Signs an Algorand USDC payment with the agent's own wallet
  4. Retries the request with the X-PAYMENT header
  5. Receives HTTP 200 — displays the brief content
  6. Shows the payment log (GET /x402/payments/log) so judges see the settled
     verifier payout accrue in real time

Zero human interaction between steps 1 and 6.

Usage:
  python agent_demo.py --person-id 1 --base-url http://localhost:8000

For a dry-run (shows the 402 flow without real payment):
  python agent_demo.py --person-id 1 --dry-run

Environment variables (same as onboarding_agent.py):
  AGENT_ALGORAND_MNEMONIC, AGENT_ALGORAND_ADDRESS, ALGORAND_NETWORK, etc.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ.get("DEADMIND_BASE_URL", "http://localhost:8000").rstrip("/")
AGENT_MNEMONIC = os.environ.get("AGENT_ALGORAND_MNEMONIC", "").strip()


def _banner(msg: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}\n")


def demo_x402_flow(person_id: int, base_url: str, dry_run: bool) -> None:
    try:
        import httpx
    except ImportError:
        print("ERROR: httpx not installed. Run: pip install httpx")
        sys.exit(1)

    url = f"{base_url}/x402/vault/{person_id}/brief"

    _banner(f"DeadMind x402 Demo — Person ID: {person_id}")
    print(f"Target endpoint: {url}")
    print(f"Mode: {'DRY-RUN (no real payment)' if dry_run else 'LIVE (real Algorand payment)'}\n")

    # ── Step 1: Unauthenticated request ───────────────────────────────────
    print("STEP 1 — Calling endpoint with no payment header...")
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url)

    print(f"  Response status: {resp.status_code}")

    if resp.status_code == 200:
        print("  (Server in pass-through mode — no payment required)")
        print(f"  Brief preview: {str(resp.json())[:200]}")
        _show_payment_log(base_url)
        return

    if resp.status_code != 402:
        print(f"  Unexpected status: {resp.status_code}")
        print(f"  Body: {resp.text[:300]}")
        return

    # ── Step 2: Parse 402 payment terms ───────────────────────────────────
    payment_terms = resp.json()
    accepts = payment_terms.get("accepts", [{}])[0]
    amount_micro = accepts.get("maxAmountRequired", "?")
    pay_to = accepts.get("payTo", "?")
    network = accepts.get("network", "?")
    facilitator = accepts.get("facilitator", "?")

    print("\nSTEP 2 — HTTP 402 received. Payment terms:")
    print(f"  Amount:      {amount_micro} microUSDC  ({int(amount_micro)/1_000_000:.4f} USDC)")
    print(f"  Pay to:      {pay_to}")
    print(f"  Network:     {network}")
    print(f"  Facilitator: {facilitator}")
    print(f"\n  Full 402 body:")
    print(f"  {json.dumps(payment_terms, indent=2)[:600]}")

    if dry_run:
        print("\n[DRY-RUN] Would now sign Algorand USDC transaction and retry.")
        print("          Set AGENT_ALGORAND_MNEMONIC to enable real payment.")
        return

    if not AGENT_MNEMONIC:
        print("\nERROR: AGENT_ALGORAND_MNEMONIC not set. Run with --dry-run or set the env var.")
        sys.exit(1)

    # ── Step 3: Sign payment ───────────────────────────────────────────────
    print("\nSTEP 3 — Signing Algorand USDC payment...")
    from backend.vault.onboarding_agent import _build_payment_token
    token = _build_payment_token(payment_terms)
    if not token:
        print("ERROR: Could not build payment token. Check algosdk installation and mnemonic.")
        sys.exit(1)
    print(f"  Payment token (first 60 chars): {token[:60]}...")

    # ── Step 4: Retry with X-PAYMENT ─────────────────────────────────────
    print("\nSTEP 4 — Retrying request with X-PAYMENT header...")
    time.sleep(1)  # Brief pause for clarity in live demos
    with httpx.Client(timeout=30.0) as client:
        paid_resp = client.get(url, headers={"X-PAYMENT": token})

    print(f"  Response status: {paid_resp.status_code}")

    if paid_resp.status_code == 200:
        brief = paid_resp.json()
        print("\n  [OK] HTTP 200 -- Algorand payment accepted. Brief content:")
        print(f"  {json.dumps(brief, indent=2)[:800]}")

        # Read the txid written by the server-side middleware
        txid_log = Path(__file__).parent / "backend" / "vault" / "x402_txids.log"
        if txid_log.exists():
            last_line = txid_log.read_text(encoding="utf-8").strip().splitlines()[-1]
            # Parse: "2026-...Z  txid=XXXX  lora=https://..."
            parts = dict(p.split("=", 1) for p in last_line.split("  ") if "=" in p)
            txid = parts.get("txid", "")
            lora = parts.get("lora", "")
            print(f"\n  Transaction ID: {txid}")
            print(f"  Lora explorer:  {lora}")
        else:
            print("\n  (txid log not found — check server stdout for '[x402-direct] Transaction SUBMITTED')")

    else:
        print(f"\n  [FAIL] Payment rejected: {paid_resp.status_code}")
        print(f"  {paid_resp.text[:300]}")
        return

    # ── Step 5: Show payment log ───────────────────────────────────────────
    print()
    _show_payment_log(base_url)

    _banner("Demo complete — machine-to-machine x402 flow verified")
    print("No human interaction occurred between step 1 and step 5.")
    print("The agent autonomously: called the endpoint, received the 402,")
    print("signed an Algorand transaction, retried, and consumed the response.")


def _show_payment_log(base_url: str) -> None:
    try:
        import httpx
        _banner("Payment Log (GET /x402/payments/log)")
        with httpx.Client(timeout=10.0) as client:
            log_resp = client.get(f"{base_url}/x402/payments/log")
        if log_resp.status_code == 200:
            data = log_resp.json()
            payments = data.get("agent_payments", [])
            payouts = data.get("verifier_payouts", [])
            print(f"  Agent payments logged: {len(payments)}")
            for p in payments[-3:]:
                print(f"    • {p.get('settled_at', '?')} — {p.get('amount', '?')} microUSDC "
                      f"from {p.get('payer_address', '?')[:16]}...")
            print(f"\n  Verifier payouts accrued: {len(payouts)}")
            for v in payouts[-3:]:
                print(f"    • {v.get('verifier_person_id', '?')} — {v.get('amount', '?')} USDC "
                      f"[{v.get('status', '?')}]")
        else:
            print(f"  Payment log returned {log_resp.status_code}")
    except Exception as exc:
        print(f"  Could not fetch payment log: {exc}")


def main():
    parser = argparse.ArgumentParser(
        description="DeadMind x402 machine-to-machine demo script",
    )
    parser.add_argument("--person-id", type=int, default=1,
                        help="Person ID whose brief to retrieve (default: 1)")
    parser.add_argument("--base-url", default=BASE_URL,
                        help=f"DeadMind server base URL (default: {BASE_URL})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show the 402 flow without sending a real payment")
    args = parser.parse_args()

    demo_x402_flow(args.person_id, args.base_url.rstrip("/"), args.dry_run)


if __name__ == "__main__":
    main()
