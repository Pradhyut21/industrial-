"""
DeadMind Chat & Organizational Memory Service Unit & Integration Tests.
Verifies Conversation Store CRUD, Coreference Memory, Auto/Manual Expert Routing,
Consensus & Uncertainty Synthesis, Grounded Attribution, and AI Agent x402 Endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.chat.conversation_store import ConversationStore, auto_generate_title
from backend.chat.memory import ChatMemoryEngine
from backend.chat.expert_router import ExpertRouter
from backend.chat.service import chat_service
from backend.database import init_db

# Initialize test database
init_db()
client = TestClient(app)


def test_auto_generate_title():
    t1 = auto_generate_title("Why is P-302 vibrating during startup?")
    assert "P-302" in t1 or "Vibrating" in t1
    t2 = auto_generate_title("What is the procedure for starting B-101?")
    assert "B-101" in t2 or "Procedure" in t2


def test_conversation_store_crud():
    # 1. Create
    conv = ConversationStore.create_conversation(
        title="P-302 Cavitation Review",
        user_id="test_user_1",
        role="Reliability Engineer",
        selected_experts=["Rajan Sharma", "Amit Patel"],
        tag="Equipment Troubleshooting"
    )
    conv_id = conv["id"]
    assert conv_id.startswith("conv_")
    assert conv["title"] == "P-302 Cavitation Review"
    assert len(conv["selected_experts"]) == 2

    # 2. Append Messages
    msg1 = ConversationStore.append_message(conv_id, "user", "Why is P-302 vibrating?")
    assert msg1["id"].startswith("msg_")
    assert msg1["role"] == "user"

    msg2 = ConversationStore.append_message(conv_id, "assistant", "Historical records indicate cavitation.", structured_data={"evidence_summary": {"target_equipment": "P-302"}})
    assert msg2["role"] == "assistant"
    assert msg2["structured_data"]["evidence_summary"]["target_equipment"] == "P-302"

    # 3. Read
    fetched = ConversationStore.get_conversation(conv_id, user_id="test_user_1")
    assert fetched is not None
    assert len(fetched["messages"]) == 2
    assert fetched["messages"][0]["content"] == "Why is P-302 vibrating?"

    # 4. Update Meta
    ConversationStore.update_conversation_meta(conv_id, title="P-302 Vibration & Suction Review", is_favorite=True)
    updated = ConversationStore.get_conversation(conv_id, user_id="test_user_1")
    assert updated["title"] == "P-302 Vibration & Suction Review"
    assert updated["is_favorite"] is True

    # 5. List
    conv_list = ConversationStore.list_conversations(user_id="test_user_1", search="P-302")
    assert len(conv_list) >= 1
    assert any(c["id"] == conv_id for c in conv_list)

    # 6. Delete
    deleted = ConversationStore.delete_conversation(conv_id, user_id="test_user_1")
    assert deleted is True
    assert ConversationStore.get_conversation(conv_id) is None


def test_coreference_and_entity_memory():
    # Turn 1 context
    history = [
        {"role": "user", "content": "What happened to P-302 pump yesterday?"},
        {
            "role": "assistant",
            "content": "Rajan Sharma diagnosed severe suction cavitation on P-302.",
            "structured_data": {
                "employee_insights": [{"name": "Rajan Sharma"}],
                "sources": [{"equipment_tag": "P-302"}]
            }
        }
    ]

    # Turn 2: User says "What did he recommend to fix it?"
    enriched_query, meta = ChatMemoryEngine.resolve_coreferences("What did he recommend to fix it?", history)
    assert "P-302" in enriched_query
    assert "Rajan Sharma" in enriched_query
    assert meta["resolved_equipment"] == "P-302"
    assert meta["resolved_engineer"] == "Rajan Sharma"


def test_expert_router_generic_vs_equipment():
    # 1. Generic query should NOT force employee consultation
    generic_decision = ExpertRouter.route_experts("What is cavitation in centrifugal pumps?")
    assert generic_decision["should_consult_employees"] is False

    # 2. Equipment query SHOULD discover relevant plant engineers
    eq_decision = ExpertRouter.route_experts("Why is P-302 vibrating during cold startup?")
    assert eq_decision["should_consult_employees"] is True
    assert len(eq_decision["selected_experts"]) >= 1
    exp_names = [e["name"] for e in eq_decision["selected_experts"]]
    assert any("Nair" in n or "Nayar" in n or "Rajan" in n or "Vikram" in n or "Amit" in n for n in exp_names)

    # 3. Manual override
    manual_decision = ExpertRouter.route_experts("What is the valve positioner status?", manual_experts=["Amit Patel", "Vikram Sen"])
    assert manual_decision["is_manual"] is True
    assert len(manual_decision["selected_experts"]) == 2
    assert manual_decision["selected_experts"][0]["name"] == "Amit Patel"


def test_chat_service_full_synthesis():
    query = "Why is P-302 showing high vibration during startup?"
    result = chat_service.process_query(
        query=query,
        user_id="test_user_2",
        role="Field Technician"
    )

    assert "answer" in result
    assert len(result["answer"]) > 50
    assert "sources" in result
    assert len(result["sources"]) > 0
    assert "source_type" in result["sources"][0]
    assert "uncertainty" in result
    assert "risk_score" in result["uncertainty"]
    assert "recommended_steps" in result
    assert len(result["recommended_steps"]) >= 2
    assert "conversation_id" in result


def test_chat_api_endpoints():
    # 1. Create conversation
    resp1 = client.post("/api/chat/conversations", json={
        "title": "B-101 Superheater Startup",
        "user_id": "test_api_user",
        "tag": "Boiler Operations"
    })
    assert resp1.status_code == 200
    conv_data = resp1.json()
    conv_id = conv_data["id"]

    # 2. Query endpoint
    resp2 = client.post("/api/chat/query", json={
        "query": "What are the temperature ramp limits for B-101?",
        "conversation_id": conv_id,
        "user_id": "test_api_user"
    })
    assert resp2.status_code == 200
    query_data = resp2.json()
    assert "answer" in query_data
    assert "sources" in query_data
    assert len(query_data["sources"]) > 0

    # 3. List conversations
    resp3 = client.get(f"/api/chat/conversations?user_id=test_api_user")
    assert resp3.status_code == 200
    convs = resp3.json()
    assert len(convs) >= 1
    assert convs[0]["id"] == conv_id

    # 4. Get experts list
    resp4 = client.get("/api/chat/experts")
    assert resp4.status_code == 200
    experts = resp4.json()
    assert len(experts) >= 3
    assert "primary_domain" in experts[0]

    # Clean up
    client.delete(f"/api/chat/conversations/{conv_id}?user_id=test_api_user")


def test_agent_api_standard_and_x402():
    # 1. Standard Agent Query (Free tier)
    resp_std = client.post("/api/agent/query", json={
        "question": "What is the standard startup sequence for P-302?",
        "analysis_type": "standard",
        "experts": ["auto"]
    })
    assert resp_std.status_code == 200
    data = resp_std.json()
    assert data["status"] == "success"
    assert "cryptographic_anchor" in data

    # 2. Premium Multi-Expert Consensus Agent Query without payment header -> Expect 402 if payment address configured
    resp_prem = client.post("/api/agent/query", json={
        "question": "Perform multi-expert consensus analysis on P-302 vibration failure",
        "analysis_type": "expert_consensus",
        "experts": ["auto"]
    })
    # If ALGORAND_PAYMENT_ADDRESS is set, returns 402; otherwise passes through in dev mode
    if resp_prem.status_code == 402:
        body = resp_prem.json()
        assert body["detail"]["error"] == "X402 Payment Required"
        assert len(body["detail"]["accepts"]) >= 1
        assert "network" in body["detail"]["accepts"][0]
        assert "payTo" in body["detail"]["accepts"][0]
    else:
        assert resp_prem.status_code == 200
        assert resp_prem.json()["status"] == "success"
