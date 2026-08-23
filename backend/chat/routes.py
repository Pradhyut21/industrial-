"""
DeadMind Chat & Agent FastAPI Router.
Provides complete conversational management, streaming, expert discovery, and agent endpoints.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from backend.chat.conversation_store import ConversationStore
from backend.chat.expert_router import ExpertRouter
from backend.chat.service import chat_service
from backend.chat.agent_api import AgentQueryRequest, handle_agent_query

chat_router = APIRouter(prefix="/api/chat", tags=["Chat & Organizational Memory"])
agent_router = APIRouter(prefix="/api/agent", tags=["AI Agent Programmatic API"])


# ── Request / Response Models ──────────────────────────────────────────────────

class CreateConversationPayload(BaseModel):
    title: Optional[str] = None
    user_id: Optional[str] = "default_user"
    role: Optional[str] = "Field Technician"
    selected_experts: Optional[List[str]] = None
    tag: Optional[str] = "General"
    initial_query: Optional[str] = None


class UpdateConversationPayload(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    selected_experts: Optional[List[str]] = None
    relevant_entities: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    tag: Optional[str] = None


class ChatQueryPayload(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = "default_user"
    role: Optional[str] = "Field Technician"
    selected_experts: Optional[List[str]] = None
    analysis_mode: Optional[str] = "standard"


# ── Conversation Management Routes ─────────────────────────────────────────────

@chat_router.post("/conversations")
def create_conversation(payload: CreateConversationPayload):
    conv = ConversationStore.create_conversation(
        title=payload.title,
        user_id=payload.user_id or "default_user",
        role=payload.role or "Field Technician",
        selected_experts=payload.selected_experts,
        tag=payload.tag or "General",
        initial_query=payload.initial_query
    )
    return conv


@chat_router.get("/conversations")
def list_conversations(
    user_id: str = "default_user",
    search: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50
):
    return ConversationStore.list_conversations(user_id=user_id, search=search, tag=tag, limit=limit)


@chat_router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user_id: Optional[str] = None):
    conv = ConversationStore.get_conversation(conversation_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@chat_router.patch("/conversations/{conversation_id}")
def update_conversation(conversation_id: str, payload: UpdateConversationPayload):
    success = ConversationStore.update_conversation_meta(
        conversation_id,
        title=payload.title,
        summary=payload.summary,
        selected_experts=payload.selected_experts,
        relevant_entities=payload.relevant_entities,
        is_favorite=payload.is_favorite,
        tag=payload.tag
    )
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or could not be updated")
    return {"status": "success", "conversation_id": conversation_id}


@chat_router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user_id: Optional[str] = None):
    success = ConversationStore.delete_conversation(conversation_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "message": "Conversation deleted successfully"}


# ── Expert Discovery Route ─────────────────────────────────────────────────────

@chat_router.get("/experts")
def list_experts():
    """Returns all plant domain specialists with record counts, domains, and verification badges."""
    return ExpertRouter.get_all_available_experts()


# ── Chat Query & Stream Routes ─────────────────────────────────────────────────

@chat_router.post("/query")
def execute_chat_query(payload: ChatQueryPayload):
    result = chat_service.process_query(
        query=payload.query,
        conversation_id=payload.conversation_id,
        user_id=payload.user_id or "default_user",
        role=payload.role or "Field Technician",
        manual_experts=payload.selected_experts,
        analysis_mode=payload.analysis_mode or "standard"
    )
    return result


@chat_router.post("/query/stream")
async def execute_chat_query_stream(payload: ChatQueryPayload):
    generator = chat_service.process_query_stream(
        query=payload.query,
        conversation_id=payload.conversation_id,
        user_id=payload.user_id or "default_user",
        role=payload.role or "Field Technician",
        manual_experts=payload.selected_experts
    )
    return StreamingResponse(generator, media_type="text/event-stream")


# ── AI Agent Autonomous Programmatic Endpoint ───────────────────────────────────

@agent_router.post("/query")
def query_agent_endpoint(
    payload: AgentQueryRequest,
    request: Request,
    x_payment: Optional[str] = Header(None, alias="X-Payment")
):
    return handle_agent_query(payload, x_payment=x_payment)
