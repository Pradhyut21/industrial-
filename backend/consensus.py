import numpy as np
from backend.vector_store import get_model
from backend.llm import generate_expert_answer

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))

def synthesize_consensus(query: str, experts: list[str]) -> dict:
    """
    Query multiple expert personas, weight each by its own retrieval confidence
    (not a fixed table), and detect dissent by measuring semantic distance
    between their answers rather than assuming there's always a minority view.
    """
    results = {}
    for exp in experts:
        ans = generate_expert_answer(query, exp)
        if ans["citations"]:  # only count experts who actually had grounded sources
            results[exp] = ans

    if not results:
        return {
            "consensus": "No expert records found matching this pattern. Recommending OEM escalation.",
            "agreement": "None", "weights": {}, "dissent": ""
        }

    model = get_model()
    embeddings = {exp: model.encode(r["answer"], normalize_embeddings=True)
                  for exp, r in results.items()}

    # Weight = retrieval confidence * number of grounding citations (proxy for evidence depth)
    weights = {exp: r["confidence"] * (1 + 0.1 * len(r["citations"])) for exp, r in results.items()}
    best_exp = max(weights, key=weights.get)

    # Real dissent detection: find the expert whose answer embedding is most
    # dissimilar to the winning answer, above a threshold — not "pick the other one"
    dissent_text = ""
    if len(results) > 1:
        sims = {exp: cosine_sim(embeddings[exp], embeddings[best_exp])
                for exp in results if exp != best_exp}
        most_divergent = min(sims, key=sims.get)
        if sims[most_divergent] < 0.75:  # meaningfully different framing, not just paraphrase
            dissent_text = (f"{most_divergent} diverges from {best_exp}'s framing "
                             f"(semantic similarity {sims[most_divergent]:.0%}) — worth "
                             f"reviewing both before acting.")
        else:
            dissent_text = f"{most_divergent} broadly agrees, with minor stylistic differences."

    normalized_weights = {k: round(v / sum(weights.values()) * 100) for k, v in weights.items()}
    consensus_text = (
        f"Weighted consensus (retrieval confidence × evidence depth) favors "
        f"{best_exp}: {results[best_exp]['answer']}"
    )
    return {
        "consensus": consensus_text,
        "agreement": f"{len(results)} of {len(experts)} experts returned grounded answers.",
        "weights": normalized_weights,
        "dissent": dissent_text
    }
