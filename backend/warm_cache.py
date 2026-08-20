from backend.vector_store import get_model
from backend.reranker import get_reranker

if __name__ == "__main__":
    print("1/3 Downloading embedding model (all-MiniLM-L6-v2)...")
    get_model()
    print("    Done.")

    print("2/3 Downloading cross-encoder reranker (ms-marco-MiniLM-L-6-v2)...")
    get_reranker()
    print("    Done.")

    print("3/3 Downloading Whisper STT model (tiny.en)...")
    try:
        from backend.transcription import get_whisper
        get_whisper()
        print("    Done.")
    except Exception as e:
        print(f"    SKIPPED (faster-whisper not installed or failed: {e})")

    print("\nAll models cached locally. Safe to run the demo offline from here.")
