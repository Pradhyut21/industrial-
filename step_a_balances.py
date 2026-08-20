"""Check balances of both Algorand testnet wallets."""
import os
try:
    from dotenv import load_dotenv
    load_dotenv('.env')
except ImportError:
    pass

from algosdk.v2client import algod
from algosdk import account, mnemonic as algomnemonic

node_url = os.environ.get('ALGORAND_NODE_URL', 'https://testnet-api.algonode.cloud')
pay_addr = os.environ.get('ALGORAND_PAYMENT_ADDRESS', '').strip()
payout_mn = os.environ.get('ALGORAND_PAYOUT_MNEMONIC', '').strip()
pk = algomnemonic.to_private_key(payout_mn)
payout_addr = account.address_from_private_key(pk)

client = algod.AlgodClient('', node_url)

print('=== STEP A: WALLET BALANCES ===')
for label, addr in [('Payment (receives agent payments)', pay_addr), ('Payout  (pays verifiers)          ', payout_addr)]:
    try:
        info = client.account_info(addr)
        bal = info['amount']
        status = info.get('status', 'unknown')
        print(f'{label}')
        print(f'  Address : {addr}')
        print(f'  Balance : {bal} microALGO  ({bal/1e6:.6f} ALGO)')
        print(f'  Status  : {status}')
        funded = bal >= 1_000_000  # at least 1 ALGO
        print(f'  Funded  : {"YES (>=1 ALGO)" if funded else "NO — fund at https://bank.testnet.algorand.network/"}')
        print()
    except Exception as e:
        print(f'{label}')
        print(f'  Address : {addr}')
        print(f'  ERROR   : {e}')
        print()
