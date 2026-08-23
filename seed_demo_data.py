#!/usr/bin/env python3
"""
seed_demo_data.py
=================
Seeds a demo person + continuity brief into deadmind.db so
the x402 endpoint has real data to gate during live verification.

Run with server up OR directly against the DB (uses direct DB write
as fallback if the API is not reachable).

Usage:
    python seed_demo_data.py
    python seed_demo_data.py --api http://localhost:8000   # force API mode
    python seed_demo_data.py --db-only                     # skip API, write direct
"""

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "deadmind.db"

DEMO_PERSON = {
    "name": "Rajan Sharma",
    "role": "Senior Boiler Lead Specialist",
    "domain": "operations",
    "department": "Plant Engineering",
    "status": "departed",
    "exit_date": "2026-08-01",
    "exit_reason": "Retirement after 38 years of service",
}

DEMO_BRIEF_SUMMARY = (
    "Rajan Sharma served as Senior Boiler Lead for 38 years, accumulating deep "
    "operational knowledge of Unit 2 and Unit 3 boiler systems. At the time of "
    "departure he was overseeing a critical superheater bypass curve recalibration "
    "project (60% complete) and had partial documentation of the B-101 differential "
    "pressure anomaly response protocol. His departure leaves three open items that "
    "require immediate successor attention: (1) completing the bypass curve calibration "
    "above 380°C, (2) finalising the handover of Permit 2024-PTW-0047 to the "
    "incoming shift lead, and (3) transferring institutional knowledge of the boiler's "
    "non-standard fuel oil viscosity compensation procedure, which is undocumented."
)

DEMO_UNRESOLVED = [
    "Superheater bypass curve recalibration — 60% complete, calibration above 380°C pending",
    "Permit-to-work 2024-PTW-0047 — transfer to incoming shift lead not yet executed",
    "Fuel oil viscosity compensation procedure — undocumented, exists only in Rajan's knowledge",
    "B-101 boiler differential pressure anomaly SOP — draft, not yet peer-reviewed or signed",
]

DEMO_GLOSSARY = {
    "Superheater bypass curve": (
        "A calibration profile that controls how steam temperature is managed when the main "
        "superheater is bypassed during startup/shutdown. Getting it wrong can cause thermal shock."
    ),
    "PTW (Permit to Work)": (
        "A formal safety authorisation document required before any maintenance on live plant "
        "equipment. Must be signed by both the issuing engineer and the incoming lead."
    ),
    "Differential pressure (dP)": (
        "The pressure difference between two points in a pipe or vessel. Boilers use dP readings "
        "to infer steam drum levels and detect blockages — a key safety indicator."
    ),
    "Fuel oil viscosity compensation": (
        "A manual adjustment to burner fuel flow based on the current fuel oil temperature and "
        "thickness. Incorrect compensation causes incomplete combustion and excess emissions."
    ),
}


def seed_via_db() -> int:
    """Write directly to SQLite. Returns person_id."""
    print(f"Seeding directly into {DB_PATH} ...")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Check if demo person already exists
    cur.execute("SELECT id FROM persons WHERE name = ? AND role = ?",
                (DEMO_PERSON["name"], DEMO_PERSON["role"]))
    existing = cur.fetchone()
    if existing:
        person_id = existing[0]
        print(f"Demo person already exists — person_id={person_id}")
    else:
        cur.execute(
            """
            INSERT INTO persons (name, role, domain, department, status, exit_date, exit_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                DEMO_PERSON["name"], DEMO_PERSON["role"], DEMO_PERSON["domain"],
                DEMO_PERSON["department"], DEMO_PERSON["status"],
                DEMO_PERSON["exit_date"], DEMO_PERSON["exit_reason"],
            ),
        )
        person_id = cur.lastrowid
        print(f"Created person — person_id={person_id}")

    # Check for existing brief
    cur.execute("SELECT id FROM continuity_briefs WHERE person_id = ?", (person_id,))
    existing_brief = cur.fetchone()
    if existing_brief:
        brief_id = existing_brief[0]
        print(f"Demo brief already exists — brief_id={brief_id}")
    else:
        cur.execute(
            """
            INSERT INTO continuity_briefs
              (person_id, generated_at, summary_text, unresolved_items, glossary,
               verification_status, verified_by, verified_at, verifier_algorand_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person_id,
                datetime.now(timezone.utc).isoformat(),
                DEMO_BRIEF_SUMMARY,
                json.dumps(DEMO_UNRESOLVED),
                json.dumps(DEMO_GLOSSARY),
                "verified",  # Verified so the higher x402 price tier applies
                "Kavita Rao (Process Safety Lead)",
                (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
                None,  # verifier_algorand_address — to be set via /register-wallet
            ),
        )
        brief_id = cur.lastrowid
        print(f"Created verified brief — brief_id={brief_id}")

    # Seed one task for the game/task explainer
    cur.execute("SELECT id FROM tasks WHERE person_id = ? AND title LIKE '%Superheater%'",
                (person_id,))
    existing_task = cur.fetchone()
    if existing_task:
        task_id = existing_task[0]
        print(f"Demo task already exists — task_id={task_id}")
    else:
        deadline = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")
        flowchart = """flowchart TD
    A[Start: Superheater Bypass Recalibration] --> B[Review Rajan's calibration notes]
    B --> C{Notes complete?}
    C -- Yes --> D[Run cold-start calibration 0-200C]
    C -- No --> E[Reconstruct from DCS trend logs]
    E --> D
    D --> F[Run warm-start calibration 200-380C]
    F --> G{380C threshold passed?}
    G -- Yes --> H[Complete final range 380-420C]
    G -- No --> I[Adjust bypass valve positioner]
    I --> F
    H --> J[Peer review by Kavita Rao]
    J --> K[Seal procedure into DeadMind vault]
    K --> L[Done]
    style H fill:#ffd700,stroke:#b8860b
    style I fill:#ff6b6b,stroke:#c0392b
    style L fill:#6fae6f,stroke:#4a8a4a"""

        dependencies = [
            {"domain": "safety", "team": "Process Safety", "relationship": "blocked_by",
             "note": "PTW-0047 must be formally transferred before hot work can resume"},
            {"domain": "controls", "team": "DCS & SCADA", "relationship": "blocks",
             "note": "Cannot run automated superheater curve validation until this calibration is complete"},
        ]

        cur.execute(
            """
            INSERT INTO tasks
              (person_id, project_name, title, description, status,
               flowchart_mermaid, percent_complete, deadline, dependencies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person_id,
                "Unit 2 Boiler Turnaround Prep",
                "Complete Superheater Bypass Curve Recalibration",
                (
                    "Rajan was 60% through recalibrating the superheater bypass curve for Unit 2. "
                    "The cold and warm stages are done (0-380°C). The critical final range "
                    "(380-420°C) remains. This must be completed before the planned turnaround "
                    "or the unit cannot be safely restarted after maintenance."
                ),
                "in_progress",
                flowchart,
                60,
                deadline,
                json.dumps(dependencies),
            ),
        )
        task_id = cur.lastrowid
        print(f"Created task — task_id={task_id}, deadline={deadline}")

    conn.commit()
    conn.close()

    print(f"\nSeed complete.")
    print(f"  person_id : {person_id}")
    print(f"  brief_id  : {brief_id}")
    print(f"  task_id   : {task_id}")
    print(f"\nX402 endpoint to test:")
    print(f"  curl -i http://localhost:8000/x402/vault/{person_id}/brief")
    print(f"\nAgent demo command:")
    print(f"  python agent_demo.py --person-id {person_id}")
    print(f"\nRecovery Run game (once frontend is running):")
    print(f"  http://localhost:5173/game/{task_id}")

    return person_id


def seed_via_api(base_url: str) -> int:
    """Seed via the live API. Falls back to DB if unreachable."""
    try:
        import httpx
    except ImportError:
        print("httpx not installed — falling back to direct DB seed")
        return seed_via_db()

    try:
        with httpx.Client(timeout=10.0) as client:
            # Create person
            resp = client.post(f"{base_url}/vault/persons", json=DEMO_PERSON)
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"POST /vault/persons returned {resp.status_code}: {resp.text[:200]}")
            person_id = resp.json()["id"]
            print(f"Created person via API — person_id={person_id}")

            # Generate brief
            resp = client.post(f"{base_url}/vault/{person_id}/brief",
                               headers={"X-Role": "Plant Head"})
            if resp.status_code not in (200, 201):
                print(f"Brief generation returned {resp.status_code} — falling back to DB")
                return seed_via_db()
            print(f"Generated brief via API")

        return person_id

    except Exception as exc:
        print(f"API unreachable ({exc}) — falling back to direct DB seed")
        return seed_via_db()


def main():
    parser = argparse.ArgumentParser(description="Seed DeadMind demo data for x402 verification")
    parser.add_argument("--api", default="http://localhost:8000",
                        help="Server base URL for API mode")
    parser.add_argument("--db-only", action="store_true",
                        help="Skip API, write directly to SQLite")
    args = parser.parse_args()

    if args.db_only:
        seed_via_db()
    else:
        seed_via_api(args.api)


if __name__ == "__main__":
    main()
