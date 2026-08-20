"""
WhatsApp provider abstraction for the Continuity Intelligence Platform.

Architecture:
  WhatsAppProvider (ABC)
    ├── TwilioWhatsAppProvider  — Twilio WhatsApp Business sandbox
    └── StubWhatsAppProvider    — logs message; no credentials required

Factory get_whatsapp_provider() selects at import time.

STUB: When TWILIO_ACCOUNT_SID is absent, StubWhatsAppProvider is used.

Message flow (inbound):
  1. WhatsApp user sends a text or voice note to the sandbox number
  2. Twilio webhook POSTs to /whatsapp/inbound
  3. Text extracted (voice note URL transcribed via faster-whisper if MediaUrl present)
  4. Translated to English if not already (via TranslationProvider)
  5. RAG query executed
  6. Response translated back and sent via Twilio Messages API
  7. call_sessions row written

Strictly Q&A/briefing scoped — no autonomous write actions via WhatsApp.
"""
from __future__ import annotations

import os
import json
import urllib.request
import urllib.parse
import base64
import datetime
from abc import ABC, abstractmethod

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.environ.get(
    "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"
)  # Twilio sandbox default


# ── Abstract base ─────────────────────────────────────────────────────────────

class WhatsAppProvider(ABC):
    @abstractmethod
    def send_message(self, to: str, body: str) -> str:
        """Send a WhatsApp message. Returns a message SID or status string."""


# ── Twilio implementation ─────────────────────────────────────────────────────

class TwilioWhatsAppProvider(WhatsAppProvider):
    """
    Sends messages via Twilio WhatsApp Business API (or sandbox).
    Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.
    """

    def send_message(self, to: str, body: str) -> str:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            raise RuntimeError("Twilio credentials not configured")

        # Ensure WhatsApp number format
        wa_to = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/"
            f"{TWILIO_ACCOUNT_SID}/Messages.json"
        )
        credentials = base64.b64encode(
            f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
        ).decode()
        params = urllib.parse.urlencode(
            {
                "From": TWILIO_WHATSAPP_FROM,
                "To": wa_to,
                "Body": body[:1600],  # WhatsApp message cap
            }
        ).encode()
        req = urllib.request.Request(
            url,
            data=params,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            return result.get("sid", "unknown-sid")


# ── Stub implementation ───────────────────────────────────────────────────────

class StubWhatsAppProvider(WhatsAppProvider):
    """
    # STUB — requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN for live operation.
    Logs the message instead of sending it. Demo runs end-to-end without credentials.
    """

    def send_message(self, to: str, body: str) -> str:
        sid = f"stub-wa-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        print(f"[WhatsAppProvider STUB] Would send to {to}: {body[:120]}... (sid={sid})")
        return sid


# ── Factory ───────────────────────────────────────────────────────────────────

def get_whatsapp_provider() -> WhatsAppProvider:
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        print("[WhatsAppProvider] Using TwilioWhatsAppProvider (live credentials detected)")
        return TwilioWhatsAppProvider()
    print(
        "[WhatsAppProvider] STUB — TWILIO_ACCOUNT_SID not set. "
        "Using StubWhatsAppProvider. Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN to enable live messaging."
    )
    return StubWhatsAppProvider()
