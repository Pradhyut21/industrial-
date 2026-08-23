"""
DeadMind Chat Package — General-Purpose Industrial Knowledge Assistant powered by Organizational Memory.
"""
from backend.chat.service import chat_service
from backend.chat.routes import chat_router

__all__ = ["chat_service", "chat_router"]
