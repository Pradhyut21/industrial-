from backend.uncertainty import compute_uncertainty

def test_compute_uncertainty_empty_sources():
    res = compute_uncertainty("some query", [])
    assert res["sparsity"] == "HIGH"
    assert res["staleness"] == "HIGH"
    assert res["disagreement"] == "HIGH"
    assert res["causal"] == "HIGH"
    assert "risk_score" in res
