"""
Concurrent load test against the live FastAPI server.

Standard run (Phases 1-2, respects production rate limits):
    python run.py
    python -m backend.evals.load_test_concurrent

Full AI-path benchmark (Phase 3, raises rate limit for this run ONLY --
do not deploy with AI_RATE_LIMIT set this high; it exists purely to let
the load test measure the pipeline's real concurrent capacity separately
from the deliberate production throttle):
    $env:AI_RATE_LIMIT="1000"; python run.py          # Windows / PowerShell
    AI_RATE_LIMIT=1000 python run.py                  # Linux / macOS
    python -m backend.evals.load_test_concurrent
"""
import asyncio
import statistics
import time

import httpx

BASE_URL = "http://localhost:8000"

QUERIES = [
    "cavitation pattern on P-302",
    "bearing wear B-101 startup sequence",
    "zero-span positioner procedure",
    "SOP compliance for boiler inspection",
    "OISD-118 evidence status",
]


async def worker_fast(client: httpx.AsyncClient, worker_id: int, latencies: list, n: int = 5):
    """Hit the fast /api/engineers endpoint."""
    for _ in range(n):
        t0 = time.time()
        try:
            resp = await client.get("/api/engineers", timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"[fast-worker {worker_id}] failed: {e}")
            continue
        latencies.append(time.time() - t0)


async def worker_chat(client: httpx.AsyncClient, worker_id: int, latencies: list):
    """Hit /api/chat once -- respects production rate limit."""
    q = QUERIES[worker_id % len(QUERIES)]
    t0 = time.time()
    try:
        resp = await client.post(
            "/api/chat",
            json={"query": q, "engineer_name": "Auto-Route"},
            timeout=60,
        )
        resp.raise_for_status()
    except Exception as e:
        print(f"[chat-worker {worker_id}] failed: {e}")
        return
    latencies.append(time.time() - t0)


async def worker_chat_full(client: httpx.AsyncClient, worker_id: int, latencies: list):
    """Hit /api/chat once -- used for the FULL-CONCURRENCY AI-path benchmark.

    Requires AI_RATE_LIMIT to be raised above CONCURRENCY_CHAT_FULL on the
    server, otherwise most requests will 429. This is intentional -- this
    phase measures the AI pipeline's raw concurrent capacity, not the
    production rate-limit policy (that is a separate, deliberate throttle).
    Start the server with: AI_RATE_LIMIT=1000 python run.py
    """
    q = QUERIES[worker_id % len(QUERIES)]
    t0 = time.time()
    try:
        resp = await client.post(
            "/api/chat",
            json={"query": q, "engineer_name": "Auto-Route"},
            timeout=60,
        )
        resp.raise_for_status()
    except Exception as e:
        print(f"[chat-full-worker {worker_id}] failed: {e}")
        return
    latencies.append(time.time() - t0)


def print_table(title: str, concurrency: int, total: int, latencies: list, wall: float):
    if not latencies:
        print(f"\n## {title}\n")
        print("No successful requests recorded.")
        print()
        return
    lat = sorted(latencies)
    n = len(lat)
    p50 = statistics.median(lat)
    p95 = lat[min(int(n * 0.95), n - 1)]
    p99 = lat[min(int(n * 0.99), n - 1)]
    print(f"\n## {title}")
    print()
    print("| Metric | Value |")
    print("|---|---|")
    print(f"| Concurrent users | {concurrency} |")
    print(f"| Total requests | {total} |")
    print(f"| Successful | {n} ({n * 100 // total}%) |")
    print(f"| Wall clock time | {wall:.2f}s |")
    print(f"| Throughput | {n / wall:.1f} req/sec |")
    print(f"| p50 latency | {p50 * 1000:.0f}ms |")
    print(f"| p95 latency | {p95 * 1000:.0f}ms |")
    print(f"| p99 latency | {p99 * 1000:.0f}ms |")
    print()


import json
from datetime import datetime, timezone

def save_load_test_artifacts(results: dict):
    results_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
    os.makedirs(results_dir, exist_ok=True)
    json_path = os.path.join(results_dir, "load_test_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"[Artifact Saved] {json_path}")

def format_metrics(title: str, concurrency: int, total: int, latencies: list, wall: float):
    if not latencies:
        return {"title": title, "concurrency": concurrency, "total_requests": total, "successful": 0}
    lat = sorted(latencies)
    n = len(lat)
    p50 = statistics.median(lat)
    p95 = lat[min(int(n * 0.95), n - 1)]
    p99 = lat[min(int(n * 0.99), n - 1)]
    return {
        "title": title,
        "concurrency": concurrency,
        "total_requests": total,
        "successful_requests": n,
        "success_rate_percent": round(n * 100 / total, 1),
        "wall_clock_seconds": round(wall, 3),
        "throughput_req_per_sec": round(n / wall, 2) if wall > 0 else 0,
        "p50_latency_ms": round(p50 * 1000, 1),
        "p95_latency_ms": round(p95 * 1000, 1),
        "p99_latency_ms": round(p99 * 1000, 1)
    }

async def run():
    all_results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phases": {}
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # --- Phase 1: fast endpoint, 50 concurrent workers, 5 requests each ---
        CONCURRENCY_FAST = 50
        REPS = 5
        lat_fast: list = []
        t0 = time.time()
        await asyncio.gather(*[
            worker_fast(client, w, lat_fast, REPS) for w in range(CONCURRENCY_FAST)
        ])
        wall_fast = time.time() - t0
        p1_metrics = format_metrics(
            "Phase 1 -- Concurrent DB/Retrieval Load",
            CONCURRENCY_FAST, CONCURRENCY_FAST * REPS, lat_fast, wall_fast,
        )
        all_results["phases"]["phase_1_fast"] = p1_metrics
        print_table(
            "Phase 1 -- Concurrent DB/Retrieval Load (50 users x 5 requests)",
            CONCURRENCY_FAST, CONCURRENCY_FAST * REPS, lat_fast, wall_fast,
        )

        # --- Phase 2: AI pipeline, 10 workers x 1 request (respects rate limit) ---
        CONCURRENCY_CHAT = 10
        lat_chat: list = []
        t0 = time.time()
        await asyncio.gather(*[
            worker_chat(client, w, lat_chat) for w in range(CONCURRENCY_CHAT)
        ])
        wall_chat = time.time() - t0
        p2_metrics = format_metrics(
            "Phase 2 -- Concurrent AI Pipeline (Rate Limited)",
            CONCURRENCY_CHAT, CONCURRENCY_CHAT, lat_chat, wall_chat,
        )
        all_results["phases"]["phase_2_chat_limited"] = p2_metrics
        print_table(
            "Phase 2 -- Concurrent AI Pipeline (10 simultaneous chat requests, production rate limit active)",
            CONCURRENCY_CHAT, CONCURRENCY_CHAT, lat_chat, wall_chat,
        )

        # --- Phase 3: AI pipeline at FULL concurrency (requires rate-limit override) ---
        CONCURRENCY_CHAT_FULL = 50
        lat_chat_full: list = []
        t0 = time.time()
        await asyncio.gather(*[
            worker_chat_full(client, w, lat_chat_full) for w in range(CONCURRENCY_CHAT_FULL)
        ])
        wall_chat_full = time.time() - t0
        p3_metrics = format_metrics(
            "Phase 3 -- AI Pipeline Full Concurrency",
            CONCURRENCY_CHAT_FULL, CONCURRENCY_CHAT_FULL, lat_chat_full, wall_chat_full,
        )
        all_results["phases"]["phase_3_chat_full"] = p3_metrics
        print_table(
            "Phase 3 -- AI Pipeline at Full Concurrency (50 simultaneous chat requests, "
            "rate limit raised for benchmark only)",
            CONCURRENCY_CHAT_FULL, CONCURRENCY_CHAT_FULL, lat_chat_full, wall_chat_full,
        )
        
        save_load_test_artifacts(all_results)

if __name__ == "__main__":
    asyncio.run(run())
