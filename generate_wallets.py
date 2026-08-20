"""
generate_wallets.py
====================
One-time script: generate two fresh Algorand testnet keypairs for the DeadMind demo.

  PAYMENT_ADDRESS  — the wallet that *receives* micropayments from AI agents
                     (set as ALGORAND_PAYMENT_ADDRESS in .env)

  PAYOUT_WALLET    — the wallet the *platform* pays from when verifiers stamp briefs
                     (set as ALGORAND_PAYOUT_MNEMONIC in .env — NEVER share or commit)

Run:
  python generate_wallets.py

Then:
  1. Fund BOTH addresses at https://bank.testnet.algorand.network/
  2. Paste the output into your .env (only — never anywhere else)
"""
from algosdk import account, mnemonic

def gen():
    private_key, address = account.generate_account()
    return address, mnemonic.from_private_key(private_key)

payment_addr, _payment_mn = gen()   # receives agent payments — address is public, mnemonic not needed here
payout_addr,  payout_mn   = gen()   # platform pays out from this one — mnemonic is private

print("=" * 70)
print("STEP 1: Add these to your .env file (NEVER commit .env)")
print("=" * 70)
print()
print(f"ALGORAND_PAYMENT_ADDRESS={payment_addr}")
print(f"# ↑ Public address — safe to share, put in .env.example")
print()
print(f"ALGORAND_PAYOUT_MNEMONIC={payout_mn}")
print(f"# ↑ PRIVATE — 25-word seed for payout wallet. Never share, never commit.")
print()
print("=" * 70)
print("STEP 2: Fund BOTH of these addresses at the testnet faucet:")
print("  https://bank.testnet.algorand.network/")
print()
print(f"  Payment address (receives agent payments): {payment_addr}")
print(f"  Payout  address (platform pays verifiers): {payout_addr}")
print()
print("(Payout address derived from the mnemonic above — fund it separately)")
print("=" * 70)
print()
print("STEP 3: Confirm balances after funding (wait ~5 seconds after faucet):")
print(f"""
  python -c "
from algosdk.v2client import algod
c = algod.AlgodClient('', 'https://testnet-api.algonode.cloud')
for addr, label in [('{payment_addr}', 'Payment'), ('{payout_addr}', 'Payout')]:
    bal = c.account_info(addr)['amount']
    print(f'{{label}} wallet: {{bal}} microALGO ({{bal/1e6:.4f}} ALGO)')
  "
""")
