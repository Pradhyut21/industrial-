import base64
import tempfile
import os
from faster_whisper import WhisperModel

_whisper_model = None
def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")  # fast, CPU-friendly
    return _whisper_model

def transcribe_audio(audio_base64: str) -> str:
    """Decode base64 audio and transcribe with Whisper — real STT, not a client pass-through."""
    audio_bytes = base64.b64decode(audio_base64.split(",")[-1])  # strip data URL prefix if present
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        segments, _ = get_whisper().transcribe(tmp_path, beam_size=5)
        return " ".join(seg.text.strip() for seg in segments)
    finally:
        os.unlink(tmp_path)
