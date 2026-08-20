import pytest
from backend.hybrid_retrieval import reciprocal_rank_fusion
from backend.ingestion import ingest_document

def test_semantic_retrieval_finds_paraphrase():
    ingest_document("Pump Log", "P-302 showing cavitation signature near suction strainer.", "Maintenance Log", "Test Engineer")
    results = reciprocal_rank_fusion("pump making unusual noise near intake")
    assert any(r["equipment_tag"] == "P-302" for r in results)

def test_empty_query_does_not_crash():
    results = reciprocal_rank_fusion("")
    assert isinstance(results, list)
