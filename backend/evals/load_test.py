import time, random, statistics
import os
import sys

# Ensure backend modules can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.ingestion import ingest_document
from backend.hybrid_retrieval import build_bm25_index, reciprocal_rank_fusion

EQUIP = ["B-101", "P-302", "C-104", "V-205", "F-402"]
TEMPLATES = [
    "Shift log: {tag} showing elevated vibration during startup sequence, "
    "operator flagged possible bearing wear, cross-checked against {tag2} history.",
    "Maintenance note: replaced seal on {tag}, observed minor cavitation pattern "
    "consistent with prior {tag2} failure signature.",
]

def gen_doc(i):
    tag, tag2 = random.sample(EQUIP, 2)
    text = random.choice(TEMPLATES).format(tag=tag, tag2=tag2)
    return f"Synthetic Log {i}", text

def run(n=5000):
    from backend.database import init_db
    init_db()
    
    print(f"Starting sequential ingestion of {n} documents (with FAISS debounce optimization)...")
    t0 = time.time()
    
    for i in range(n):
        title, content = gen_doc(i)
        ingest_document(title, content, forced_author="Synthetic Bench")
        if i % 100 == 0:
            print(f"Ingested {i} documents...")
            
    ingest_time = time.time() - t0

    t1 = time.time()
    build_bm25_index()
    index_time = time.time() - t1

    latencies = []
    for _ in range(50):
        t2 = time.time()
        reciprocal_rank_fusion("P-302 cavitation failure signature", k=5)
        latencies.append(time.time() - t2)

    latencies.sort()
    print(f"| Metric | Value |")
    print(f"|---|---|")
    print(f"| Docs ingested | {n:,} |")
    print(f"| Ingest throughput | {n/ingest_time:.1f} docs/sec |")
    print(f"| BM25 index build @ {n:,} docs | {index_time:.2f}s |")
    print(f"| Query p50 latency | {statistics.median(latencies)*1000:.0f}ms |")
    print(f"| Query p95 latency | {latencies[int(len(latencies)*0.95)]*1000:.0f}ms |")

if __name__ == "__main__":
    run()
