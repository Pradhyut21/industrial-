from backend.llm import generate_expert_answer

def run_check(query):
    print(f"\n--- Query: {query} ---")
    result = generate_expert_answer(query, "Auto-Route")
    for c in result["citations"]:
        print(f"  {c.get('equipment_tag', 'N/A'):12} | {c.get('title', 'N/A')} | Rerank Score: {c.get('rerank_score', 'N/A')}")

if __name__ == "__main__":
    run_check("P-302 cavitation signature")
    run_check("C-104 vibration trips")
    run_check("maintenance history for V-205")
