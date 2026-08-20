"""
Translation provider abstraction for the Continuity Intelligence Platform.

Enables multi-language support in voice and WhatsApp channels.
Supported languages (live): Hindi (hi), Kannada (kn), Tamil (ta), English (en).

Architecture:
  TranslationProvider (ABC)
    ├── BhashiniProvider   — ULCA/Bhashini API (Indian government AI translation)
    ├── SarvamProvider     — Sarvam AI API (alternative for Indic languages)
    └── StubTranslationProvider — returns original text with [TRANSLATION STUB] prefix

Factory get_translation_provider() selects at import time.

STUB: When neither BHASHINI_API_KEY nor SARVAM_API_KEY is set, the stub is used.
      In stub mode, queries are processed in their original language (English fallback).
"""
from __future__ import annotations

import os
import json
import urllib.request
from abc import ABC, abstractmethod

BHASHINI_API_KEY = os.environ.get("BHASHINI_API_KEY", "")
BHASHINI_USER_ID = os.environ.get("BHASHINI_USER_ID", "")
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")

# BCP-47 → Bhashini language codes
BHASHINI_LANG_MAP = {
    "hi": "hi",     # Hindi
    "kn": "kn",     # Kannada
    "ta": "ta",     # Tamil
    "te": "te",     # Telugu
    "mr": "mr",     # Marathi
    "gu": "gu",     # Gujarati
    "en": "en",     # English
}


# ── Abstract base ─────────────────────────────────────────────────────────────

class TranslationProvider(ABC):
    @abstractmethod
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text from source_lang to target_lang (BCP-47 codes)."""


# ── Bhashini implementation ───────────────────────────────────────────────────

class BhashiniProvider(TranslationProvider):
    """
    Translation via Bhashini ULCA API (https://bhashini.gov.in/).
    Requires: BHASHINI_API_KEY, BHASHINI_USER_ID env vars.

    Uses the /ulca/apis/v0/model/getModelsPipeline + /ulca/apis/v0/pipeline/compute pattern.
    """

    PIPELINE_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text
        if not BHASHINI_API_KEY or not BHASHINI_USER_ID:
            raise RuntimeError("Bhashini credentials not configured")

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": BHASHINI_LANG_MAP.get(source_lang, source_lang),
                            "targetLanguage": BHASHINI_LANG_MAP.get(target_lang, target_lang),
                        },
                        "serviceId": "",  # Bhashini will pick best model
                        "datasetId": "",
                    },
                }
            ],
            "inputData": {"input": [{"source": text}]},
        }
        req = urllib.request.Request(
            self.PIPELINE_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": BHASHINI_API_KEY,
                "userID": BHASHINI_USER_ID,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            # Navigate Bhashini response structure
            outputs = (
                result.get("pipelineResponse", [{}])[0]
                .get("output", [{}])[0]
                .get("target", text)
            )
            return outputs


# ── Sarvam AI implementation ──────────────────────────────────────────────────

class SarvamProvider(TranslationProvider):
    """
    Translation via Sarvam AI API (https://www.sarvam.ai/).
    Requires: SARVAM_API_KEY env var.
    Supports: Hindi, Tamil, Telugu, Kannada, Malayalam, Odia, Bengali, Marathi, Gujarati, Punjabi.
    """

    API_URL = "https://api.sarvam.ai/translate"

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text
        if not SARVAM_API_KEY:
            raise RuntimeError("Sarvam API key not configured")

        payload = {
            "input": text,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "speaker_gender": "Male",
            "mode": "formal",
            "enable_preprocessing": True,
        }
        req = urllib.request.Request(
            self.API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "API-Subscription-Key": SARVAM_API_KEY,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("translated_text", text)


# ── Stub implementation ───────────────────────────────────────────────────────

class StubTranslationProvider(TranslationProvider):
    """
    # STUB — requires BHASHINI_API_KEY or SARVAM_API_KEY for live operation.
    Returns original text unchanged. All queries are processed in English in demo mode.
    """

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang or source_lang == "en" or target_lang == "en":
            return text
        # In stub mode, just return the English text as-is with a note
        print(
            f"[TranslationProvider STUB] Would translate {source_lang}→{target_lang}. "
            "Returning original text. Set BHASHINI_API_KEY or SARVAM_API_KEY to enable."
        )
        return text


# ── Factory ───────────────────────────────────────────────────────────────────

def get_translation_provider() -> TranslationProvider:
    if BHASHINI_API_KEY and BHASHINI_USER_ID:
        print("[TranslationProvider] Using BhashiniProvider (BHASHINI_API_KEY detected)")
        return BhashiniProvider()
    if SARVAM_API_KEY:
        print("[TranslationProvider] Using SarvamProvider (SARVAM_API_KEY detected)")
        return SarvamProvider()
    print(
        "[TranslationProvider] STUB — no translation API key found. "
        "Using StubTranslationProvider. Set BHASHINI_API_KEY+BHASHINI_USER_ID or SARVAM_API_KEY."
    )
    return StubTranslationProvider()
