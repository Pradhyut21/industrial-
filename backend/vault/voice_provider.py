"""
Voice provider abstraction for the Continuity Intelligence Platform.

Architecture:
  VoiceProvider (ABC)
    ├── TwilioVoiceProvider  — real Twilio Programmable Voice + TwiML
    └── StubVoiceProvider    — returns canned TwiML; no credentials required

Factory get_voice_provider() selects at import time based on env vars.

STUB: When TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are absent, StubVoiceProvider
      is returned. All voice routes function end-to-end in demo mode.

Inbound flow:
  1. Twilio webhook POST → /voice/inbound
  2. SpeechResult extracted (or stub transcript used)
  3. Translated to English if needed (via TranslationProvider)
  4. RAG query executed
  5. Response translated back to caller language
  6. TwiML <Say> verb returned to Twilio
  7. call_sessions row written

Outbound flow:
  1. POST /voice/outbound with {person_id, to_phone}
  2. Continuity Brief summary fetched
  3. Twilio REST API places call with TwiML URL
  4. In stub: just returns a log entry confirming call would be placed
"""
from __future__ import annotations

import os
import json
import urllib.request
import urllib.parse
import base64
import datetime
from abc import ABC, abstractmethod
from typing import Optional

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "+10000000000")  # demo placeholder


# ── Abstract base ─────────────────────────────────────────────────────────────

class VoiceProvider(ABC):
    @abstractmethod
    def twiml_response(self, speech_text: str) -> str:
        """Return TwiML XML string to read speech_text to the caller."""

    @abstractmethod
    def place_outbound_call(self, to: str, message: str) -> str:
        """Initiate an outbound call. Returns a status/call-SID string."""


# ── Twilio implementation ─────────────────────────────────────────────────────

class TwilioVoiceProvider(VoiceProvider):
    """
    Real Twilio Programmable Voice implementation.
    Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.
    """

    def twiml_response(self, speech_text: str) -> str:
        safe = speech_text.replace("&", "and").replace("<", "").replace(">", "")[:1000]
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            f'<Say voice="alice" language="en-IN">{safe}</Say>'
            "</Response>"
        )

    def place_outbound_call(self, to: str, message: str) -> str:
        """Places a call via Twilio REST API with a TwiML Bin URL or inline TwiML."""
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            raise RuntimeError("Twilio credentials not configured")

        twiml = self.twiml_response(message)
        # Twilio requires a URL for the call TwiML. For demo, we use a public Twilio echo bin.
        # In production: host the TwiML on your server or use Twilio's TwiML Bins.
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json"
        credentials = base64.b64encode(
            f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
        ).decode()
        params = urllib.parse.urlencode(
            {
                "To": to,
                "From": TWILIO_PHONE_NUMBER,
                # Inline TwiML not supported via REST API directly; use a TwiML URL
                "Twiml": twiml,
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

class StubVoiceProvider(VoiceProvider):
    """
    # STUB — requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN for live operation.
    Returns valid TwiML without placing a real call. Demo runs end-to-end.
    """

    def twiml_response(self, speech_text: str) -> str:
        safe = speech_text.replace("&", "and").replace("<", "").replace(">", "")[:1000]
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            f'<Say voice="alice" language="en-IN">{safe}</Say>'
            "<Pause length=\"1\"/>"
            "</Response>"
        )

    def place_outbound_call(self, to: str, message: str) -> str:
        # STUB: log the call intent instead of placing it
        try:
            print(f"[VoiceProvider STUB] Would call {to}: {message[:120]}...")
        except Exception:
            print(f"[VoiceProvider STUB] Would call {to}: [Multilingual speech payload]")
        return f"twilio-call-sid-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"


# ── Factory ───────────────────────────────────────────────────────────────────

def get_voice_provider() -> VoiceProvider:
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        print("[VoiceProvider] Using TwilioVoiceProvider (live credentials detected)")
        return TwilioVoiceProvider()
    print(
        "[VoiceProvider] STUB — TWILIO_ACCOUNT_SID not set. "
        "Using StubVoiceProvider. Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN to enable live calls."
    )
    return StubVoiceProvider()
