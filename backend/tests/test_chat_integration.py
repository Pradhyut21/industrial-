"""
Full integration smoke test: ingest -> retrieve -> generate answer.
This is the test that would have caught the content-field regression 
before it ever reached a live demo.
"""
from backend.ingestion import ingest_document
from backend.llm import generate_expert_answer

def test_chat_end_to_end_does_not_crash():
    ingest_document(
        "Pump Maintenance Log",
        "P-302 cavitation observed, suction strainer inspected, impeller pitting found.",
        "Maintenance Log",
        "Test Engineer"
    )
    result = generate_expert_answer("what causes P-302 cavitation?", "Test Engineer")
    assert "answer" in result
    assert isinstance(result["answer"], str) and len(result["answer"]) > 0
    assert "citations" in result
    for citation in result["citations"]:
        assert citation.get("title") is not None  # would have failed silently before

def test_consensus_end_to_end_does_not_crash():
    from backend.consensus import synthesize_consensus
    result = synthesize_consensus("pump cavitation troubleshooting", ["Test Engineer"])
    assert "consensus" in result
