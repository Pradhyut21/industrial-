"""
Retrieval Benchmark Evaluation Suite

Measures retrieval precision against a gold-standard dataset of industrial queries
(exact matches, paraphrases, colloquialisms, typos, multi-hop, and negative controls).
Compares Keyword (BM25), Semantic Vector (FAISS), and DeadMind Hybrid RRF + Cross-Encoder.

Saves verified output artifacts to:
- backend/evals/results/retrieval_benchmark.json
- backend/evals/results/retrieval_benchmark.csv
- backend/evals/results/eval_report.log

Run:
    python -m backend.evals.eval_retrieval
"""
import os
import sys
import json
import csv
import time
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.retrieval import retrieve_expert_knowledge, retrieve_expert_knowledge_semantic
from backend.hybrid_retrieval import reciprocal_rank_fusion

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

GOLD_SET = [
    # Category 1: Exact equipment-tag matches
    ("What's the failure signature for pump cavitation on P-302?", "P-302", "exact_match"),
    ("Heater B-101 is drifting on temperature", "B-101", "exact_match"),
    ("V-205 valve controller keeps sticking", "V-205", "exact_match"),
    ("C-104 air unit overhaul tightening instructions", "C-104", "exact_match"),
    ("What are the tightening specs for C-104?", "C-104", "exact_match"),
    ("S-501 power panel running hot", "S-501", "exact_match"),
    ("TURBINE-04 controller delay on cold start", "TURBINE-04", "exact_match"),
    ("BOILER-2 gas switch overheating", "BOILER-2", "exact_match"),
    ("V-205 water system zeroing process", "V-205", "exact_match"),
    ("C-104 air unit clicking sound", "C-104", "exact_match"),
    
    # Category 2: Colloquial/field-language paraphrases
    ("water mover intake blockage", "P-302", "paraphrase"),
    ("cold weather controller inaccuracy", "V-205", "paraphrase"),
    ("steam generator wobbling at night", "B-101", "paraphrase"),
    ("power distribution rust on connections", "S-501", "paraphrase"),
    ("steam maker switch cooling vent change", "BOILER-2", "paraphrase"),
    ("spinning machine controller delay", "TURBINE-04", "paraphrase"),
    ("the big water pump keeps hunting", "P-302", "paraphrase"),
    ("the boiler feed is shaking too much", "B-101", "paraphrase"),
    ("air box keeps making that clicking noise", "C-104", "paraphrase"),
    ("main spark panel getting way too hot", "S-501", "paraphrase"),

    # Category 3: Misspelled or informally-written equipment tags
    ("p302 cavitation history", "P-302", "informal_typo"),
    ("b101 temp drift", "B-101", "informal_typo"),
    ("v 205 sticking again", "V-205", "informal_typo"),
    ("c104 overhaul", "C-104", "informal_typo"),
    ("s 501 phase b", "S-501", "informal_typo"),
    ("turbine04 cold start", "TURBINE-04", "informal_typo"),
    ("boiler 2 overheating", "BOILER-2", "informal_typo"),
    ("p-302 pump is loud", "P-302", "informal_typo"),
    ("v-205 zero process", "V-205", "informal_typo"),
    ("c-104 screw tightening", "C-104", "informal_typo"),

    # Category 4: Multi-hop questions requiring cross-document reasoning
    ("what did whoever last handled a cavitation issue on P-302 recommend", "P-302", "multi_hop"),
    ("how does the temperature drift on B-101 affect the downstream process", "B-101", "multi_hop"),
    ("does the sticking V-205 cause the same issue as last year", "V-205", "multi_hop"),
    ("who worked on the C-104 clicking sound recently", "C-104", "multi_hop"),
    ("compare S-501 rust to the previous phase-b hot run", "S-501", "multi_hop"),
    ("how did we fix the BOILER-2 gas switch last time it overheated", "BOILER-2", "multi_hop"),
    ("what are the common causes of TURBINE-04 cold start delays based on logs", "TURBINE-04", "multi_hop"),
    ("did the C-104 overhaul fix the loose screws issue permanently", "C-104", "multi_hop"),
    ("what's the consensus on P-302 intake blockage", "P-302", "multi_hop"),
    ("which engineer documented the V-205 cold weather inaccuracy", "V-205", "multi_hop"),

    # Category 5: Negative/no-match controls
    ("where is the cafeteria menu posted", None, "negative_control"),
    ("how many vacation days do I have left", None, "negative_control"),
    ("who is the CEO of the company", None, "negative_control"),
    ("how to connect to the guest wifi", None, "negative_control"),
    ("what time does the morning shift start", None, "negative_control"),
    ("where do I submit my timesheet", None, "negative_control"),
    ("is there a holiday party this year", None, "negative_control"),
    ("how to reset my email password", None, "negative_control"),
    ("where is the nearest fire extinguisher", None, "negative_control"),
    ("can I park in the visitor lot", None, "negative_control"),
]

def evaluate_retrieval(k=3):
    results_detail = []
    
    keyword_hits = 0
    semantic_hits = 0
    hybrid_hits = 0
    
    category_stats = {}
    
    t0 = time.time()
    for query, expected_tag, category in GOLD_SET:
        if category not in category_stats:
            category_stats[category] = {"total": 0, "keyword_hits": 0, "semantic_hits": 0, "hybrid_hits": 0}
        category_stats[category]["total"] += 1
        
        # 1. Keyword
        kw_res = retrieve_expert_knowledge(query, limit=k)
        kw_matched = (expected_tag is None and len(kw_res) == 0) or any(r.get("equipment_tag") == expected_tag for r in kw_res)
        if kw_matched:
            keyword_hits += 1
            category_stats[category]["keyword_hits"] += 1
            
        # 2. Semantic
        sem_res = retrieve_expert_knowledge_semantic(query, limit=k)
        sem_matched = (expected_tag is None and len(sem_res) == 0) or any(r.get("equipment_tag") == expected_tag for r in sem_res)
        if sem_matched:
            semantic_hits += 1
            category_stats[category]["semantic_hits"] += 1
            
        # 3. Hybrid RRF + Cross-Encoder
        hyb_res = reciprocal_rank_fusion(query, k=k)
        hyb_matched = (expected_tag is None and len(hyb_res) == 0) or any(r.get("equipment_tag") == expected_tag for r in hyb_res)
        if hyb_matched:
            hybrid_hits += 1
            category_stats[category]["hybrid_hits"] += 1
            
        results_detail.append({
            "query": query,
            "expected_tag": expected_tag or "NONE",
            "category": category,
            "keyword_hit": kw_matched,
            "semantic_hit": sem_matched,
            "hybrid_hit": hyb_matched,
            "top_hybrid_tags": [r.get("equipment_tag") for r in hyb_res[:3]]
        })
        
    duration = time.time() - t0
    total = len(GOLD_SET)
    
    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_queries": total,
        "evaluation_duration_seconds": round(duration, 3),
        "metrics": {
            "keyword_p_at_3": round(keyword_hits / total, 4),
            "semantic_p_at_3": round(semantic_hits / total, 4),
            "hybrid_rrf_reranker_p_at_3": round(hybrid_hits / total, 4),
            "absolute_improvement_over_keyword": round((hybrid_hits - keyword_hits) / total, 4)
        },
        "category_breakdown": category_stats,
        "queries": results_detail
    }
    
    # Write JSON artifact
    json_path = os.path.join(RESULTS_DIR, "retrieval_benchmark.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    # Write CSV artifact
    csv_path = os.path.join(RESULTS_DIR, "retrieval_benchmark.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Query", "Category", "Expected_Tag", "Keyword_Hit", "Semantic_Hit", "Hybrid_Hit", "Top_Hybrid_Tags"])
        for r in results_detail:
            writer.writerow([r["query"], r["category"], r["expected_tag"], r["keyword_hit"], r["semantic_hit"], r["hybrid_hit"], "|".join(filter(None, r["top_hybrid_tags"]))])
            
    # Write Log artifact
    log_path = os.path.join(RESULTS_DIR, "eval_report.log")
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"=== DeadMind Retrieval Benchmark Run ({summary['timestamp']}) ===\n")
        f.write(f"Total Queries: {total} | Duration: {duration:.2f}s\n")
        f.write(f"Keyword Retrieval  P@3: {summary['metrics']['keyword_p_at_3']:.1%}\n")
        f.write(f"Semantic Retrieval P@3: {summary['metrics']['semantic_p_at_3']:.1%}\n")
        f.write(f"Hybrid RRF + Cross-Encoder Reranker P@3: {summary['metrics']['hybrid_rrf_reranker_p_at_3']:.1%}\n")
        improvement = summary['metrics']['absolute_improvement_over_keyword']
        sign = "+" if improvement >= 0 else ""
        f.write(f"Improvement over Keyword: {sign}{improvement:.1%}\n\n")
        f.write("Category Breakdown:\n")
        for cat, st in category_stats.items():
            f.write(f"  - {cat:18}: Keyword={st['keyword_hits']}/{st['total']} | Semantic={st['semantic_hits']}/{st['total']} | Hybrid={st['hybrid_hits']}/{st['total']}\n")

    # Console display (ASCII-safe for Windows console)
    print(f"\n{'='*60}")
    print(f"[BENCHMARK] DeadMind Retrieval Evaluation Benchmark Results")
    print(f"{'='*60}")
    print(f"Total Queries Evaluated: {total}")
    print(f"Keyword Retrieval  P@3: {summary['metrics']['keyword_p_at_3']:.1%}")
    print(f"Semantic Retrieval P@3: {summary['metrics']['semantic_p_at_3']:.1%}")
    print(f"Hybrid RRF + Rerank P@3: {summary['metrics']['hybrid_rrf_reranker_p_at_3']:.1%}")
    improvement = summary['metrics']['absolute_improvement_over_keyword']
    sign = "+" if improvement >= 0 else ""
    print(f"Absolute Gain over Keyword: {sign}{improvement:.1%}")
    print(f"{'='*60}")
    print(f"Saved Artifacts:")
    print(f"  - JSON: {json_path}")
    print(f"  - CSV:  {csv_path}")
    print(f"  - Log:  {log_path}")
    print(f"{'='*60}\n")
    return summary

if __name__ == "__main__":
    evaluate_retrieval(k=3)
