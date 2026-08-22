# Section 9 Addendum — x402 Judge-Checklist Gap Fixes (v2, Reviewed)

**Status:** Ready to execute with pre-flight checks. See version verification step below.  
**Changes from v1:** Version pinning warnings added, CORS middleware analysis, person ID
verification step, three-surface risk table, browser wallet flakiness guide.

---

## ⚠️ Pre-Flight: Verify Live Version Numbers Before `npm install`

> [!CAUTION]
> Do NOT trust the version numbers in this document as static pins.
> `@algorandfoundation/algokit-utils ^10.0.0-alpha.42` is an alpha-tagged package —
> this ecosystem is moving fast. The organiser may update their starter kit between
> now and build day.

**Before running `npm install`, Antigravity must:**

1. Fetch the live file:
   ```bash
   curl -s https://raw.githubusercontent.com/marotipatre/X402-Demo/main/package.json
   ```
2. Fetch the server reference:
   ```bash
   curl -s https://raw.githubusercontent.com/marotipatre/x402-Project/refs/heads/main/x402-demo-server/package.json
   ```
3. Use the versions from those live files — not from this document.

If the curl returns a truncated or gzipped body, navigate directly in the browser to:
- `https://github.com/marotipatre/X402-Demo/blob/main/package.json`
- `https://github.com/marotipatre/x402-Project/blob/main/x402-demo-server/package.json`

**Last-known versions (treat as baseline, not gospel):**
```json
"@x402/avm": "^2.12.0",
"@x402/core": "^2.12.0",
"@x402/fetch": "^2.12.0",
"@algorandfoundation/algokit-utils": "^10.0.0-alpha.42"
```

---

## Fix 1 — Add x402 JS client dependencies to `frontend/package.json`

**What a judge sees today:** `cat frontend/package.json | grep x402` → nothing.  
**What they expect:** Package names from the reference demo client in `package.json`.

### Action

After fetching and confirming live versions (above), add to `dependencies` in
[`frontend/package.json`](file:///d:/DeadMind-main/DeadMind-main/frontend/package.json):

```json
"@x402/avm": "<live-version>",
"@x402/core": "<live-version>",
"@x402/fetch": "<live-version>",
"@algorandfoundation/algokit-utils": "<live-version>"
```

Then:
```bash
cd frontend
npm install
```

> [!NOTE]
> Only the client-side packages are needed in the frontend.
> Server-side packages (`@x402/hono`, `@x402-avm/extensions`) are NOT needed —
> the Python backend handles server-side x402.

---

## Fix 2 — Browser wallet-connect demo flow

**Route:** Create `frontend/src/routes/x402-demo.tsx` at `/x402-demo`.  
**Sidebar label:** "x402 Payment Demo" with a lock icon.

### Component requirements

1. **Wallet connect** — Use `@txnlab/use-wallet-react` + `@txnlab/use-wallet`.
   Add these to `package.json` as well. Support Pera Wallet and Defly.

2. **"Access Vault Brief" button** — disabled until wallet is connected.

3. **On click:**
   - Use `@x402/fetch`'s wrapped `fetch()` to call `GET http://localhost:8000/x402/vault/1/brief`
   - Show loading spinner during 402 → sign → retry cycle
   - The `@x402/fetch` wrapper handles the full AVM sign/retry automatically

4. **Success state:**
   - Show brief summary text
   - Show payment transaction ID
   - Show **"View on Lora ↗"** link (see Fix 3)

5. **Failure state:**
   - Show raw 402 JSON body — judges need to see the machine-readable payment terms
   - Distinguish: wallet rejected vs facilitator timeout vs backend down

6. **Design:** Industrial dark terminal aesthetic matching `frontend/src/styles.css`

### Pre-build check: Confirm person ID 1 exists

> [!IMPORTANT]
> The component calls `/x402/vault/1/brief` with hardcoded `person_id=1`.
> Person 1 = Rajan Sharma, seeded in `backend/database.py` line 624 as the first
> `INSERT INTO persons` (SQLite autoincrement starts at 1 on a fresh DB).
>
> **Before judging day, run this verification:**
> ```bash
> curl http://localhost:8000/vault/persons
> ```
> Confirm the response includes `{"id": 1, "name": "Rajan Sharma", ...}`.
> If the DB has been reset or migrated, person IDs may have shifted.
> If person 1 is not Rajan Sharma, either re-seed with `python generate_demo_data.py`
> or update the hardcoded ID in `x402-demo.tsx` to match.

---

## Fix 3 — CORS verification (do not skip)

> [!WARNING]
> **This is the most likely silent failure point in a live demo.**
> Browser wallet-connect flows fail with zero UI feedback when CORS is wrong —
> the popup closes, nothing happens, and it looks like the wallet rejected the payment.

### Current CORS state (confirmed from `backend/main.py` lines 129–136)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # ← wildcard, accepts localhost:5173
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    # ← NO expose_headers listed — see gap below
)
```

### Middleware order analysis

In Starlette/FastAPI, `add_middleware()` wraps in reverse — **last added is outermost**.
Current order:
- Line 82: x402 middleware added first → runs **innermost**
- Line 130: CORS middleware added last → runs **outermost**

This means CORS headers are applied to all responses including 402 responses.
The browser will see the 402 with `Access-Control-Allow-Origin: *`. ✅

### Gap: `expose_headers` is absent — custom response headers may be invisible to JS

> [!WARNING]
> `allow_headers=["*"]` controls which **request** headers the browser can send.
> It says nothing about which **response** headers JavaScript can *read*.
> By default, browsers only expose a small set of CORS-safelisted response headers
> (`Content-Type`, `Content-Length`, `Cache-Control`, etc.) to JS.
> Any custom response header — such as `X-Payment-Response`, `X-402-*`, or any
> header `@x402/fetch` reads from the 402 or 200 reply — is invisible to JS
> unless explicitly listed in `expose_headers`.

**Current middleware evidence** ([`x402_middleware.py` L229–242](file:///d:/DeadMind-main/DeadMind-main/backend/vault/x402_middleware.py#L229-L242)):
The 402 response only emits `content-type` and `content-length` — both safelisted,
so JavaScript can read them today without `expose_headers`. ✅ for the current build.

**Risk for Fix 2:** If `@x402/fetch` v2.12 reads any custom header from the 402 or
successful 200 reply (e.g. a payment receipt header), that header will be silently
blocked by the browser. The JS client will get `null` from `response.headers.get()`
with no error thrown — it just fails to parse the payment terms or receipt.

**How to catch this:** The DevTools network inspector, not a console fetch test.

### Pre-build verification steps (two checks, not one)

**Check 1 — Status and body (browser console):**
```javascript
fetch('http://localhost:8000/x402/vault/1/brief')
  .then(r => { console.log('Status:', r.status); return r.json(); })
  .then(console.log)
  .catch(console.error)
```
Expected: `Status: 402` with x402 JSON body — not a network error.

**Check 2 — Response headers (DevTools Network tab, mandatory):**
1. Open DevTools → Network tab
2. Make a request to `http://localhost:8000/x402/vault/1/brief`
3. Click the request → Headers → Response Headers
4. Note every non-safelisted header the server returns
5. After installing `@x402/fetch`, check its source or docs for any
   `response.headers.get('X-...')` calls — if any of those header names appear
   in the server response but are NOT `Content-Type` or `Content-Length`,
   add them to `expose_headers` in the CORS middleware:

```python
# backend/main.py — update if needed after header inspection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Payment-Response", "X-402-Payment"],  # add real names here
)
```

---

## Fix 4 — Retarget all explorer links to Lora

**Current state in DEMO_SCRIPT.md Section 9:**
```
https://lora.algokit.io/testnet/transaction/<ALGORAND_TXN_ID>
```

**What the organiser said they'll verify with:**
```
https://lora.algokit.io/testnet
```

### Actions

#### 4a — Update DEMO_SCRIPT.md (3 occurrences)

In [`DEMO_SCRIPT.md`](file:///d:/DeadMind-main/DeadMind-main/DEMO_SCRIPT.md) Section 9,
replace:
```
https://lora.algokit.io/testnet/transaction/<ALGORAND_TXN_ID>
```
with:
```
https://lora.algokit.io/testnet/transaction/<ALGORAND_TXN_ID>
```

All 3 occurrences: Step 2 verify line, Step 3 payout note, standalone proof block.

#### 4b — x402-demo.tsx success state

```tsx
const loraUrl = `https://lora.algokit.io/testnet/transaction/${paymentTxnId}`;
// Render as:
<a href={loraUrl} target="_blank" rel="noopener noreferrer">
  View on Lora ↗
</a>
```

#### 4c — backend/vault/routes.py (optional)

Grep for `perawallet` or `explorer` in routes.py and update any hardcoded explorer
URL strings to the Lora format.

---

## Risk Table — Three Payment Surfaces

| Surface | Technology | Proven? | Failure modes | Mitigation |
|---|---|---|---|---|
| **Python curl/agent demo** | `x402-avm==2.0.2` + FastAPI | ✅ Already working | Facilitator down, bad mnemonic | Python fallback always works offline |
| **Python verifier payout** | `py-algorand-sdk` | ✅ Already working | Insufficient ALGO balance | Pre-fund payout wallet; show txn ID in curl output |
| **Browser wallet-connect** | `@x402/fetch` + Pera/Defly | ❌ Not yet built | Extension not installed, wrong network, popup blocked, expose_headers gap, wallet signing rejection | See browser wallet checklist below |
| **Protocol version mismatch** | Frontend v2.12 vs backend v2.0.2 | ❌ Unverified | JS client sends token backend can't parse; looks like wallet failure | Run curl round-trip proof after `npm install` before building UI |

> [!WARNING]
> Budget real testing time for the browser flow specifically.
> The Python backend proof is battle-tested. The browser wallet surface is
> multiple separate failure points (extension, network selection, popup,
> header visibility, protocol version) that are notoriously flaky in live Web3 demos.

---

## Browser Wallet Failure Checklist (Test Each Before Demo Day)

**Before any judging session, run through all of these:**

```
[ ] Pera Wallet browser extension installed in the demo browser
[ ] Extension is on TESTNET (not mainnet — check in extension settings)
[ ] Demo wallet has testnet USDC balance
    → Faucet: https://dispenser.testnet.algorand.network
[ ] Wallet popup is NOT blocked (browser settings → allow popups for localhost)
[ ] CORS check 1: fetch('/x402/vault/1/brief') from browser console → 402 JSON, not network error
[ ] CORS check 2: DevTools Network tab → inspect ALL response headers on that 402 request
    → note any non-safelisted headers; check if @x402/fetch reads any of them;
    → if yes, add them to expose_headers in backend/main.py
[ ] person_id=1 confirmed as Rajan Sharma via GET /vault/persons
[ ] Backend is running: curl http://localhost:8000/api/health → {"status": "healthy"}
[ ] Frontend Vite dev server is on the expected port (5173 by default)
[ ] ALGORAND_PAYMENT_ADDRESS env var is set in .env (otherwise x402 runs in pass-through mode)
[ ] @x402/fetch version matches the live reference repo version
```

---

## Demo Day Fallback Decision Tree

```
Browser wallet broken? → Use the Python curl proof (Section 9 Step 1-2)
                         Judge sees 402 JSON + then 200 + txn ID on Lora

Protocol version mismatch? → Python backend speaks x402Version:1 (x402-avm==2.0.2)
(browser client sends token   If @x402/fetch sends a v2 token format, the backend
backed can't parse)           rejects it as an invalid payment — looks like wallet failure
                              DETECTION: curl round-trip still works; browser flow silently fails
                              FIX: pin @x402/fetch to a version that speaks x402Version:1,
                                   OR upgrade x402-avm in requirements.txt to match
                              DO THIS BEFORE building the browser UI, not after

Python facilitator timeout? → Show the hardcoded fallback 402 body
                               from x402_middleware.py make_402_body()
                               Explain the spec is correct even if testnet is slow

Lora explorer slow? → Fall back to https://lora.algokit.io/testnet/transaction/<ID>
                       Same txn, different UI — both prove settlement
```

> [!IMPORTANT]
> The Python curl proof (DEMO_SCRIPT.md Section 9, Steps 1–2) is your safety net
> for judging. It proves settlement with zero browser dependency.
> Do not discard it or deprioritize it in favour of the browser flow.
> Keep both. Show both if time allows. Fall back to curl if the wallet misbehaves.

---

## Summary Checklist for Antigravity

```
PRE-BUILD (do these first, in this order):
[ ] Fetch live package.json from both reference repos (curl commands in version section)
[ ] Add @x402/* packages to frontend/package.json at live versions
[ ] Run: cd frontend && npm install
[ ] *** PROTOCOL VERSION CHECK: run the Python curl round-trip proof IMMEDIATELY
    after npm install, before writing any browser UI code ***
    curl -i http://localhost:8000/x402/vault/1/brief
    → Confirm 402 with x402Version:1 in body
    → Then run the Python agent_demo.py script and confirm 200 + txn ID
    → If this breaks after npm install: a package installed a conflicting
      native dep or the testnet facilitator changed — resolve before proceeding
[ ] CORS check 1: fetch('/x402/vault/1/brief') from browser console → 402 JSON, not network error
[ ] CORS check 2: DevTools Network tab → inspect response headers on that 402 request
    → identify any non-safelisted headers @x402/fetch reads from responses
    → if any exist, add them to expose_headers in backend/main.py before building the component
[ ] Confirm person 1: GET /vault/persons → Rajan Sharma at id=1
[ ] Install Pera Wallet extension, set to testnet, fund with testnet USDC

BUILD:
[ ] Add @x402/avm, @x402/core, @x402/fetch, @algorandfoundation/algokit-utils
    to frontend/package.json (use LIVE versions, not the ones in this file)
[ ] Add @txnlab/use-wallet-react, @txnlab/use-wallet to frontend/package.json
[ ] Run: cd frontend && npm install
[ ] Create frontend/src/routes/x402-demo.tsx
    - Pera/Defly wallet connect
    - @x402/fetch call to GET /x402/vault/1/brief
    - Loading spinner during 402 → sign → retry
    - Success: brief summary + txn ID + "View on Lora ↗" link
    - Failure: raw 402 JSON displayed
    - Register in sidebar as "x402 Payment Demo"
[ ] DEMO_SCRIPT.md Section 9: replace all 3 Pera explorer URLs → Lora format
[ ] x402-demo.tsx: loraUrl uses lora.algokit.io/testnet/transaction/<txnId>
[ ] (Optional) backend/vault/routes.py: update any hardcoded explorer URLs → Lora

POST-BUILD TESTING:
[ ] Run the browser wallet flow end-to-end at least twice on testnet
[ ] Confirm Lora link opens and shows the correct txn
[ ] Run the Python curl proof separately — confirm it still works
[ ] Run through the full browser wallet failure checklist above
```

---

## What Does NOT Change

- `backend/vault/x402_middleware.py` — leave untouched
- `backend/vault/routes.py` — leave untouched (except optional Lora URL update)
- `requirements.txt` — leave untouched
- DEMO_SCRIPT.md Section 9 Python agent code — keep it, it's your safety net
- All other frontend routes — zero changes
