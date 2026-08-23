import re
from datetime import datetime
from backend.database import get_db_connection
from rapidfuzz import fuzz, process
from backend.vector_store import store
import threading

_bm25_timer = None
_bm25_lock = threading.Lock()

def schedule_bm25_rebuild():
    global _bm25_timer
    with _bm25_lock:
        if _bm25_timer is not None:
            _bm25_timer.cancel()
        from backend.hybrid_retrieval import build_bm25_index
        _bm25_timer = threading.Timer(2.0, build_bm25_index)
        _bm25_timer.start()

_nlp_model = None

def get_nlp():
    global _nlp_model
    if _nlp_model is None:
        try:
            import spacy
            try:
                _nlp_model = spacy.load("en_core_web_sm")
            except Exception:
                _nlp_model = spacy.blank("en")
        except ImportError:
            class SimpleNLP:
                def __call__(self, text):
                    class Doc:
                        ents = []
                        sents = [{"text": s.strip()} for s in text.split(".") if s.strip()]
                    return Doc()
            _nlp_model = SimpleNLP()
    return _nlp_model

def build_alias_index(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT tag, name FROM equipment_nodes")
    rows = cursor.fetchall()
    return {r["tag"]: {r["tag"], r["name"], r["name"].replace(" ", "-").upper()} for r in rows}

def resolve_coreference(mention: str, alias_index: dict, threshold: int = 80) -> str | None:
    candidates = {alias: tag for tag, aliases in alias_index.items() for alias in aliases}
    match, score, _ = process.extractOne(
        mention, candidates.keys(), scorer=fuzz.token_sort_ratio
    ) or (None, 0, None)
    if match and score >= threshold:
        return candidates[match]
    return None

def extract_entities_nlp(text: str, alias_index: dict):
    doc = get_nlp()(text)
    equipment_mentions = [ent.text for ent in doc.ents if ent.label_ in ("ORG", "PRODUCT", "FAC")]
    resolved_tags = list({
        resolve_coreference(m, alias_index) for m in equipment_mentions
        if resolve_coreference(m, alias_index)
    })
    persons = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
    return {"resolved_equipment_tags": resolved_tags, "person_mentions": persons}

# Common industrial equipment tag patterns, e.g., B-101, P-302, C-104, V-205
EQUIPMENT_PATTERN = re.compile(r'\b([A-Z]{1,3}-\d{3,4})\b')
# Common failure codes, e.g. F-402, E-101
FAILURE_PATTERN = re.compile(r'\b(F-\d{3,4})\b')
# Date patterns
DATE_PATTERN = re.compile(r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b|\b([A-Z][a-z]{2}\s\d{4})\b')

# Authorship cues
AUTHOR_CUES = [
    r'(?:Prepared|Reported|Written|Logged|Compiled|Authored)\s+by\s*:\s*([A-Za-z\s]+)',
    r'(?:Engineer|Technician|Operator|Expert)\s*:\s*([A-Za-z\s]+)',
    r'Signature\s*:\s*([A-Za-z\s]+)',
    r'([A-Za-z\s]+)\s*\((Senior|Lead|Shift)?\s*(Engineer|Operator|Technician)\)'
]

def extract_entities(text: str):
    """
    Extracts equipment tags, failure codes, dates, and candidate authors from text
    """
    equipment_tags = list(set(EQUIPMENT_PATTERN.findall(text)))
    failure_codes = list(set(FAILURE_PATTERN.findall(text)))
    
    # Try to find dates
    dates = []
    for match in DATE_PATTERN.finditer(text):
        dates.append(match.group(0))
    dates = list(set(dates))
    
    # Attribution search
    author = None
    for cue in AUTHOR_CUES:
        matches = re.findall(cue, text, re.IGNORECASE)
        if matches:
            # Clean up matched string
            candidate = matches[0]
            if isinstance(candidate, tuple):
                candidate = candidate[0]
            candidate = candidate.strip()
            # Basic validation
            if len(candidate) > 2 and len(candidate) < 30:
                author = candidate
                break
                
    return {
        "equipment_tags": equipment_tags,
        "failure_codes": failure_codes,
        "dates": dates,
        "author": author
    }

def ingest_document(title: str, content: str, doc_type: str = "Maintenance Log", forced_author: str = None) -> dict:
    """
    Ingests a document, extracts properties, attributes the author, and stores it in the database.
    """
    entities = extract_entities(content)
    
    author = forced_author or entities["author"]
    if not author:
        # Default fallback
        author = "System Ingestion"
        
    equipment_tag = entities["equipment_tags"][0] if entities["equipment_tags"] else "Unassigned"
    failure_code = entities["failure_codes"][0] if entities["failure_codes"] else "None"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # NLP extraction
    alias_index = build_alias_index(conn)
    nlp_entities = extract_entities_nlp(content, alias_index)
    
    # Merge exact regex tags and NLP fuzzy tags
    merged_tags = list(set(entities["equipment_tags"] + nlp_entities["resolved_equipment_tags"]))
    equipment_tag = merged_tags[0] if merged_tags else "Unassigned"
    
    # Also use NLP person if regex missed author
    if author == "System Ingestion" and nlp_entities["person_mentions"]:
        author = nlp_entities["person_mentions"][0]

    # Ensure engineer exists in the system
    cursor.execute("SELECT name FROM engineers WHERE name = ?", (author,))
    if not cursor.fetchone() and author != "System Ingestion":
        # Create a new dummy record for new engineer
        cursor.execute("""
        INSERT INTO engineers (name, role, status, retirement_date, avatar, risk_score, specialties)
        VALUES (?, 'Operations Engineer', 'Active', '2030-12-31', 'avatar-default.png', 30, ?)
        """, (author, equipment_tag))
        
    # Insert document
    upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO documents (title, content, engineer_author, upload_date, doc_type, equipment_tag, failure_code, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (title, content, author, upload_date, doc_type, equipment_tag, failure_code, 0.95 if entities["author"] else 0.70))
    
    doc_id = cursor.lastrowid
    conn.commit()
    
    store.add_document(doc_id, title + " " + content, {
        "title": title, 
        "content": content,
        "author": author, 
        "equipment_tag": equipment_tag, 
        "failure_code": failure_code
    })
    conn.close()
    
    schedule_bm25_rebuild()
    
    return {
        "id": doc_id,
        "title": title,
        "author": author,
        "equipment_tag": equipment_tag,
        "failure_code": failure_code,
        "confidence": 0.95 if entities["author"] else 0.70,
        "resolved_aliases": nlp_entities["resolved_equipment_tags"]
    }
