"""
DeadMind Conversation Store — Persistent SQLite & Memory Storage for Organizational Knowledge Chats.
Supports RBAC scoping, message histories, metadata updates, and title generation.
"""
import uuid
import json
import datetime
from typing import Optional, List, Dict, Any
from backend.database import get_db_connection


def auto_generate_title(query: str) -> str:
    """Generates a clean, concise industrial title from the initial user query."""
    q = query.strip()
    # Normalize common greetings / prefixes
    for prefix in ["what is the ", "what is ", "why is ", "how do i ", "explain the ", "explain ", "what caused ", "show me "]:
        if q.lower().startswith(prefix):
            q = q[len(prefix):].strip()
            break
    q = q.rstrip("?.!").strip()
    if len(q) > 42:
        q = q[:39].rsplit(" ", 1)[0] + "..."
    return q.capitalize() or "Industrial Operations Query"


class ConversationStore:
    @staticmethod
    def create_conversation(
        title: Optional[str] = None,
        user_id: str = "default_user",
        role: str = "Field Technician",
        selected_experts: Optional[List[str]] = None,
        tag: str = "General",
        initial_query: Optional[str] = None
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        conv_id = f"conv_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        resolved_title = title
        if not resolved_title and initial_query:
            resolved_title = auto_generate_title(initial_query)
        elif not resolved_title:
            resolved_title = "New Plant Inquiry"

        experts_json = json.dumps(selected_experts if selected_experts is not None else ["auto"])
        entities_json = json.dumps([])

        cursor.execute("""
        INSERT INTO conversations (id, user_id, role, title, summary, selected_experts, relevant_entities, is_favorite, tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        """, (conv_id, user_id, role, resolved_title, "", experts_json, entities_json, tag, now, now))
        
        conn.commit()
        conn.close()

        return {
            "id": conv_id,
            "user_id": user_id,
            "role": role,
            "title": resolved_title,
            "summary": "",
            "selected_experts": selected_experts or ["auto"],
            "relevant_entities": [],
            "is_favorite": False,
            "tag": tag,
            "created_at": now,
            "updated_at": now,
            "messages": []
        }

    @staticmethod
    def get_conversation(conversation_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
        else:
            cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        
        conv_row = cursor.fetchone()
        if not conv_row:
            conn.close()
            return None

        conv = dict(conv_row)
        conv["is_favorite"] = bool(conv.get("is_favorite", 0))
        try:
            conv["selected_experts"] = json.loads(conv.get("selected_experts") or '["auto"]')
        except Exception:
            conv["selected_experts"] = ["auto"]

        try:
            conv["relevant_entities"] = json.loads(conv.get("relevant_entities") or '[]')
        except Exception:
            conv["relevant_entities"] = []

        # Retrieve messages
        cursor.execute("""
        SELECT id, conversation_id, role, content, structured_data_json, timestamp
        FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY rowid ASC
        """, (conversation_id,))
        msg_rows = cursor.fetchall()
        conn.close()

        messages = []
        for r in msg_rows:
            m = dict(r)
            try:
                m["structured_data"] = json.loads(m.get("structured_data_json") or "{}")
            except Exception:
                m["structured_data"] = {}
            messages.append(m)

        conv["messages"] = messages
        return conv

    @staticmethod
    def list_conversations(
        user_id: str = "default_user",
        search: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT c.*, COUNT(m.id) as message_count FROM conversations c LEFT JOIN chat_messages m ON c.id = m.conversation_id WHERE c.user_id = ?"
        params = [user_id]

        if tag and tag.lower() != "all":
            query += " AND c.tag = ?"
            params.append(tag)

        if search and search.strip():
            query += " AND (c.title LIKE ? OR c.summary LIKE ?)"
            term = f"%{search.strip()}%"
            params.extend([term, term])

        query += " GROUP BY c.id ORDER BY c.updated_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        result = []
        for r in rows:
            d = dict(r)
            d["is_favorite"] = bool(d.get("is_favorite", 0))
            try:
                d["selected_experts"] = json.loads(d.get("selected_experts") or '["auto"]')
            except Exception:
                d["selected_experts"] = ["auto"]
            try:
                d["relevant_entities"] = json.loads(d.get("relevant_entities") or '[]')
            except Exception:
                d["relevant_entities"] = []
            result.append(d)

        return result

    @staticmethod
    def update_conversation_meta(
        conversation_id: str,
        title: Optional[str] = None,
        summary: Optional[str] = None,
        selected_experts: Optional[List[str]] = None,
        relevant_entities: Optional[List[str]] = None,
        is_favorite: Optional[bool] = None,
        tag: Optional[str] = None
    ) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()

        updates = []
        params = []
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if summary is not None:
            updates.append("summary = ?")
            params.append(summary)
        if selected_experts is not None:
            updates.append("selected_experts = ?")
            params.append(json.dumps(selected_experts))
        if relevant_entities is not None:
            updates.append("relevant_entities = ?")
            params.append(json.dumps(relevant_entities))
        if is_favorite is not None:
            updates.append("is_favorite = ?")
            params.append(1 if is_favorite else 0)
        if tag is not None:
            updates.append("tag = ?")
            params.append(tag)

        updates.append("updated_at = ?")
        params.append(now)

        params.append(conversation_id)
        sql = f"UPDATE conversations SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, params)
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

    @staticmethod
    def delete_conversation(conversation_id: str, user_id: Optional[str] = None) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("DELETE FROM chat_messages WHERE conversation_id = ? AND conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)", (conversation_id, user_id))
            cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
        else:
            cursor.execute("DELETE FROM chat_messages WHERE conversation_id = ?", (conversation_id,))
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

    @staticmethod
    def append_message(
        conversation_id: str,
        role: str,
        content: str,
        structured_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()

        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        struct_json = json.dumps(structured_data or {})

        cursor.execute("""
        INSERT INTO chat_messages (id, conversation_id, role, content, structured_data_json, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (msg_id, conversation_id, role, content, struct_json, now))

        # Touch conversation updated_at
        cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))

        conn.commit()
        conn.close()

        return {
            "id": msg_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "structured_data": structured_data or {},
            "timestamp": now
        }
