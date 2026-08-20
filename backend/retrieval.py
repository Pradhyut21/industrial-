import re
from backend.database import get_db_connection
from backend.vector_store import store

STOP_WORDS = {"a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at", 
              "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could", 
              "did", "do", "does", "doing", "dont", "down", "during", "each", "few", "for", "from", "further", "had", "has", 
              "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", 
              "is", "it", "its", "itself", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", 
              "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", 
              "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", 
              "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", 
              "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves",
              "hello", "hi", "hey", "whats", "name", "names", "please", "thank", "thanks", "tell", "explain", "greetings", "good", "morning", "evening"}

def tokenize(text: str):
    """
    Lowercase and tokenize text, filter out punctuation and stop words.
    """
    words = re.findall(r'\b\w+\b', text.lower())
    return [w for w in words if w not in STOP_WORDS]

def retrieve_expert_knowledge(query: str, engineer_name: str = None, limit: int = 5):
    """
    Search database. If engineer_name is provided, filters to that engineer's documents.
    Scores documents based on:
    - Exact match of equipment tag (weight: 10)
    - Exact match of failure code (weight: 10)
    - Term match frequency (weight: 1 per word match)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if engineer_name and engineer_name != "Auto-Route":
        cursor.execute("SELECT * FROM documents WHERE engineer_author = ?", (engineer_name,))
    else:
        cursor.execute("SELECT * FROM documents")
        
    docs = cursor.fetchall()
    conn.close()
    
    query_tokens = tokenize(query)
    
    # Extract tags from query
    equip_tags = re.findall(r'\b([A-Z]{1,3}-\d{3,4})\b', query.upper())
    fail_codes = re.findall(r'\b(F-\d{3,4})\b', query.upper())
    
    scored_docs = []
    for doc in docs:
        score = 0
        title = doc['title']
        content = doc['content']
        doc_text = (title + " " + content).lower()
        doc_tokens = tokenize(doc_text)
        
        # 1. Equipment tag match
        doc_tag = doc['equipment_tag']
        if doc_tag in equip_tags:
            score += 15
            
        # 2. Failure code match
        doc_fail = doc['failure_code']
        if doc_fail in fail_codes:
            score += 15
            
        # 3. Term match
        for token in query_tokens:
            if token in doc_tokens:
                # Add score proportional to frequency
                score += doc_tokens.count(token) * 1.5
                
        if score >= 3.0:
            scored_docs.append({
                "id": doc["id"],
                "title": doc["title"],
                "content": doc["content"],
                "author": doc["engineer_author"],
                "doc_type": doc["doc_type"],
                "equipment_tag": doc["equipment_tag"],
                "failure_code": doc["failure_code"],
                "score": score
            })
            
    # Sort by score descending
    scored_docs.sort(key=lambda x: x["score"], reverse=True)
    return scored_docs[:limit]

def retrieve_expert_knowledge_semantic(query: str, engineer_name: str = None, limit: int = 5):
    """Semantic retrieval via sentence-transformer embeddings + FAISS cosine similarity."""
    results = store.search(query, k=limit, engineer_filter=engineer_name)
    if results:
        return results
    # Graceful degrade: if vector index is empty (e.g. fresh clone, no ingested docs yet),
    # fall back to the keyword method so the demo never breaks.
    return retrieve_expert_knowledge(query, engineer_name, limit)

