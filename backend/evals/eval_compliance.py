"""
Labeled micro-benchmark for compliance gap detection.
Ground truth is hand-labeled against the seeded demo corpus (extend with real
labeled clauses/documents before using this number in a production pitch).
"""
from backend.compliance import run_compliance_scan

# clause_id -> expected gap_type, based on manual review of the seeded documents
GROUND_TRUTH = {
    "OISD-118-7.3.2": "Stale Evidence",   # boiler docs exist but are years old
    "FACT-87-1": "Missing Evidence",      # no SOP review document seeded
    "PESO-34-2": "Compliant",             # P-302 has recent inspection docs
    "CPCB-ENV-9": "Missing Evidence",     # no emissions filing document seeded
    "OISD-105-4.1": "Compliant",          # S-501 has a recent thermography doc
}

def run():
    results = run_compliance_scan()
    by_clause = {r["clause_id"]: r["gap_type"] for r in results}
    correct = sum(1 for clause, expected in GROUND_TRUTH.items()
                  if by_clause.get(clause) == expected)
    total = len(GROUND_TRUTH)
    print(f"Compliance Gap Detection Accuracy: {correct}/{total} ({100*correct/total:.0f}%)")
    for clause, expected in GROUND_TRUTH.items():
        got = by_clause.get(clause, "NOT FOUND")
        flag = "OK" if got == expected else "MISS"
        print(f"  [{flag}] {clause}: expected={expected} got={got}")

if __name__ == "__main__":
    run()
