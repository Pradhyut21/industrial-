from fastapi.testclient import TestClient
from backend.main import app

def test_voice_note_fallback():
    client = TestClient(app)
    # Provide an invalid audio base64 to force the fallback to trigger
    res = client.post("/api/voice-note", json={
        "engineer": "R. Nayar",
        "audio_base64": "data:audio/webm;base64,invalidbase64datahere",
        "transcript": "Fallback transcript works"
    })
    
    assert res.status_code == 200
    assert res.json()["transcript"] == "Fallback transcript works"
