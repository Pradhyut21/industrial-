"""Step A — Verify both Algorand env vars are populated and derive payout wallet address."""
import os
try:
    from dotenv import load_dotenv
    load_dotenv('.env')
except ImportError:
    pass

pay_addr = os.environ.get('ALGORAND_PAYMENT_ADDRESS', '').strip()
payout_mn = os.environ.get('ALGORAND_PAYOUT_MNEMONIC', '').strip()

print('=== STEP A: ENV VAR AUDIT ===')
print(f'ALGORAND_PAYMENT_ADDRESS  : {"[SET: " + pay_addr[:8] + "..." + pay_addr[-6:] + "]" if pay_addr else "[EMPTY]"}')
print(f'  length={len(pay_addr)}  populated={bool(pay_addr)}')
print()
print(f'ALGORAND_PAYOUT_MNEMONIC  : {"[SET: " + " ".join(payout_mn.split()[:3]) + " ...]" if payout_mn else "[EMPTY]"}')
print(f'  word_count={len(payout_mn.split())}  populated={bool(payout_mn)}')
print()

payout_addr = None
if payout_mn:
    try:
        from algosdk import account, mnemonic as algomnemonic
        pk = algomnemonic.to_private_key(payout_mn)
        payout_addr = account.address_from_private_key(pk)
        print(f'Payout wallet address (from mnemonic): {payout_addr}')
        same = (payout_addr == pay_addr)
        print(f'Payout == Payment address? {same}  (OK for hackathon demo)')
    except Exception as e:
        print(f'ERROR deriving payout address: {e}')
else:
    print('ERROR: ALGORAND_PAYOUT_MNEMONIC is empty — this WILL cause 503 on Step C payout calls')

print()
if pay_addr and payout_mn:
    print('STATUS: PASS — both vars populated. No 503 from missing mnemonic.')
else:
    missing = []
    if not pay_addr:
        missing.append('ALGORAND_PAYMENT_ADDRESS')
    if not payout_mn:
        missing.append('ALGORAND_PAYOUT_MNEMONIC')
    print(f'STATUS: FAIL — missing: {", ".join(missing)}')
