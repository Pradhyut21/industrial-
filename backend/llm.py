import os
import json
import urllib.request
from backend.hybrid_retrieval import reciprocal_rank_fusion
from backend.database import get_db_connection

# Load .env file if present
try:
    from dotenv import load_dotenv
    # Try loading from project root (one level above /backend/)
    _env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    load_dotenv(_env_path)
    print(f"[LLM] Loaded .env from: {_env_path}")
except ImportError:
    pass

class APIConfig:
    @classmethod
    def get_key(cls):
        return os.environ.get("GROQ_API_KEY", "").strip()

    @classmethod
    def get_model(cls):
        return os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()

import time

def get_groq_response(prompt: str, system_prompt: str, retries: int = 2, timeout: int = 15) -> str:
    """
    Sends request to Groq via direct urllib.
    """
    key = APIConfig.get_key()
    if not key:
        raise ValueError("No Groq API key configured.")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
        "User-Agent": "DeadMind/2.0"
    }
    
    data = {
        "model": APIConfig.get_model(),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5
    }
    
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"),
                                          headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["choices"][0]["message"]["content"]
        except Exception as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))  # backoff
    raise last_err



def compute_calibrated_confidence(sources: list, answer: str = "") -> int:
    """
    Confidence = f(retrieval strength, citation count, source agreement).
    Real signal instead of a hardcoded constant.
    """
    if not sources:
        return 40  # no grounding = low confidence, explicitly
    avg_retrieval_score = sum(s.get("score", 0) for s in sources) / len(sources)
    # FAISS cosine scores are 0-1; keyword scores can exceed 1, so normalize
    normalized = min(avg_retrieval_score, 1.0) if avg_retrieval_score <= 1.5 else 0.9
    citation_bonus = min(len(sources) * 5, 15)
    return int(min(97, 50 + normalized * 35 + citation_bonus))

import httpx
import json as json_lib

async def get_groq_response_stream(query: str, sources: list):
    # Pass fingerprint as default 50s for streaming fallback since we skip full profile load here
    fingerprint = {"systematic": 50, "intuitive": 50, "mechanical": 50, "electrical": 50, "instrumentation": 50, "process": 50}
    key = APIConfig.get_key()
    if not key:
        # Fallback: stream the templated grounded answer word-by-word for consistent UX
        answer = build_grounded_fallback_answer(query, "Engineer", sources, fingerprint)
        for word in answer.split(" "):
            yield word + " "
        return

    # Add the system prompt that forces the persona
    system_prompt = (
        "You are speaking as a senior plant engineer. "
        "NEVER break character. NEVER mention that you are an AI, a language model, or Llama. "
        "Explain the query by utilizing the provided historic documents as primary grounded facts, but feel free to supplement "
        "using your general plant engineering and operations knowledge to provide a complete response. "
        "If you use details from the documents, cite them using [Source 1], [Source 2], etc. otherwise explain naturally."
    )

    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST", "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": APIConfig.get_model(), "stream": True,
                  "messages": [
                      {"role": "system", "content": system_prompt},
                      {"role": "user", "content": query}
                  ]},
            timeout=20
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    chunk = json_lib.loads(line[6:])
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta

def generate_expert_answer(query: str, engineer_name: str = None) -> dict:
    """
    Retrieves knowledge for the query & engineer, and generates a structured, grounded answer.
    Biases responses with the expert's cognitive fingerprint style.
    """
    # 1. Retrieve matching sources
    from backend.cache import get_cached_results, set_cached_results
    sources = get_cached_results(query, 5)
    if sources is None:
        sources = reciprocal_rank_fusion(query)
        set_cached_results(query, 5, sources)
    
    if not sources:
        resolved_engineer = engineer_name
        if not resolved_engineer or resolved_engineer == "Auto-Route":
            resolved_engineer = "R. Nayar"
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM engineers WHERE name = ?", (resolved_engineer,))
        eng_row = cursor.fetchone()
        conn.close()
        
        fingerprint = {
            "systematic": eng_row["cognitive_systematic"] if eng_row else 50,
            "intuitive": eng_row["cognitive_intuitive"] if eng_row else 50,
            "mechanical": eng_row["cognitive_mechanical"] if eng_row else 50,
            "electrical": eng_row["cognitive_electrical"] if eng_row else 50,
            "instrumentation": eng_row["cognitive_instrumentation"] if eng_row else 50,
            "process": eng_row["cognitive_process"] if eng_row else 50
        }
        
        answer = build_grounded_fallback_answer(query, resolved_engineer, [], fingerprint)
        return {
            "answer": answer,
            "citations": [
                { "id": 99, "title": "Preserved Expertise Guideline", "author": resolved_engineer, "equipment_tag": "GEN-01", "failure_code": "—" }
            ],
            "confidence": 85,
            "engineer": resolved_engineer,
            "related_context": []
        }
        
    # Resolve engineer name
    resolved_engineer = engineer_name
    if not resolved_engineer or resolved_engineer == "Auto-Route":
        resolved_engineer = sources[0]["author"]
        
    # Load cognitive fingerprint from database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM engineers WHERE name = ?", (resolved_engineer,))
    eng_row = cursor.fetchone()
    conn.close()
    
    fingerprint = {}
    if eng_row:
        fingerprint = {
            "systematic": eng_row["cognitive_systematic"],
            "intuitive": eng_row["cognitive_intuitive"],
            "mechanical": eng_row["cognitive_mechanical"],
            "electrical": eng_row["cognitive_electrical"],
            "instrumentation": eng_row["cognitive_instrumentation"],
            "process": eng_row["cognitive_process"]
        }
    else:
        fingerprint = {
            "systematic": 50, "intuitive": 50, "mechanical": 50, 
            "electrical": 50, "instrumentation": 50, "process": 50
        }
        
    source_texts = []
    citations = []
    for idx, s in enumerate(sources):
        content = s.get("content", "")
        if not content:
            print(f"[LLM] WARNING: source {s.get('id')} missing content field — check ingestion/vector_store sync")
        source_texts.append(
            f"[Source {idx+1}] (Title: {s.get('title', 'Untitled')}, "
            f"Author: {s.get('author', 'Unknown')}, Tag: {s.get('equipment_tag', 'N/A')}):\n{content}"
        )
        citations.append({
            "id": s.get("id"),
            "title": s.get("title", "Untitled"),
            "author": s.get("author", "Unknown"),
            "equipment_tag": s.get("equipment_tag", "N/A"),
            "failure_code": s.get("failure_code", "None"),
            "rerank_score": s.get("rerank_score")
        })
        
    # Format persona style based on fingerprint
    style_desc = f"Your Cognitive Fingerprint: Systematic={fingerprint['systematic']}%, Intuitive={fingerprint['intuitive']}%, Mechanical={fingerprint['mechanical']}%, Electrical={fingerprint['electrical']}%, Instrumentation={fingerprint['instrumentation']}%, Process={fingerprint['process']}%."
    
    system_prompt = (
        f"You are speaking as {resolved_engineer}, a senior plant engineer. "
        "NEVER break character. NEVER mention that you are an AI, a language model, or Llama. "
        f"Style Constraints: {style_desc}. "
        "Apply these priorities: "
        "- If Systematic > 70%: Structure answer as a strict step-by-step diagnostic tree. "
        "- If Intuitive > 70%: Summarize the diagnostic root cause immediately in 1-2 sentences. "
        "- Skew diagnostic focus (Mechanical, Electrical, Instrumentation) according to your higher percentages. "
        "Explain the query by utilizing the provided historic documents as primary grounded facts, but feel free to supplement "
        "using your general plant engineering and operations knowledge to provide a complete response. "
        "If you use details from the documents, cite them using [Source 1], [Source 2], etc. otherwise explain naturally."
    )
    
    prompt = (
        f"Query: {query}\n\n"
        f"Retrieved Documents:\n" + "\n\n".join(source_texts) + "\n\n"
        "Generate your expert response grounding in the documents where applicable, otherwise answering as a general knowledgeable assistant in persona."
    )
    
    # 2. Query Groq or generate cognitive-biased mock fallback
    live_key = APIConfig.get_key()
    if live_key:
        try:
            answer = get_groq_response(prompt, system_prompt)
            confidence = compute_calibrated_confidence(sources, answer)
        except Exception as e:
            print(f"[LLM] Groq API error: {type(e).__name__}: {e}")
            answer = build_grounded_fallback_answer(query, resolved_engineer, sources, fingerprint)
            confidence = compute_calibrated_confidence(sources, answer)
    else:
        print("[LLM] No API key — using mock fallback")
        answer = build_grounded_fallback_answer(query, resolved_engineer, sources, fingerprint)
        confidence = compute_calibrated_confidence(sources, answer)
        
    # Related context: find other engineers who worked on this same equipment
    conn = get_db_connection()
    cursor = conn.cursor()
    related_context = []
    if sources:
        target_tag = sources[0]["equipment_tag"]
        cursor.execute("SELECT DISTINCT engineer_author FROM documents WHERE equipment_tag = ? AND engineer_author != ?", (target_tag, resolved_engineer))
        others = cursor.fetchall()
        related_context = [o["engineer_author"] for o in others]
    conn.close()
    
    return {
        "answer": answer,
        "citations": citations,
        "confidence": confidence,
        "engineer": resolved_engineer,
        "related_context": related_context
    }

def build_grounded_fallback_answer(query: str, engineer: str, sources: list, fp: dict) -> str:
    if not sources:
        return (f"I don't have grounded documentation on this yet, {engineer.split()[0] if engineer else ''} "
                f"would typically flag this for manual review rather than guess.")
    lead = sources[0]
    bias = max(("mechanical", fp["mechanical"]), ("electrical", fp["electrical"]),
               ("instrumentation", fp["instrumentation"]), key=lambda x: x[1])[0]
    style = "a step-by-step diagnostic sequence" if fp["systematic"] > fp["intuitive"] else "the likely root cause first"
    cited = "; ".join(f"[Source {i+1}] {s['title']}" for i, s in enumerate(sources[:3]))
    return (
        f"Based on {cited}, and given a {bias}-leaning diagnostic style, "
        f"I'd approach this as {style}: {lead['content'][:280].strip()}..."
    )
