import os
import sys

# Add project root to path so backend module is found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import get_db_connection
from backend.vector_store import store

def backfill():
    print("Starting vector store backfill...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, engineer_author, equipment_tag, failure_code FROM documents")
    rows = cursor.fetchall()
    
    count = 0
    for r in rows:
        text = r["title"] + " " + r["content"]
        meta = {
            "title": r["title"],
            "author": r["engineer_author"],
            "equipment_tag": r["equipment_tag"],
            "failure_code": r["failure_code"]
        }
        store.add_document(r["id"], text, meta)
        count += 1
        
    conn.close()
    print(f"Successfully embedded {count} documents.")

if __name__ == "__main__":
    backfill()
