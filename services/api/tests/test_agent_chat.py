from types import SimpleNamespace

from fastapi.testclient import TestClient
from google.genai import types

from tothemoon_api.agent_chat import GeminiMarketplaceAgent
from tothemoon_api.config import get_settings
from tothemoon_api.main import app
from tothemoon_api.models import (
    AgentChatRequest,
    AgentChatResponse,
    AgentToolEvent,
    PaymentIntentRecord,
)
from tothemoon_api.payments import clear_payment_intents

client = TestClient(app)


def setup_function():
    clear_payment_intents()


def test_agent_chat_route_returns_structured_payload(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    def fake_respond(self, request):
        assert request.message == "buy the delivery packet"
        return AgentChatResponse(
            reply="Delivery Packet bought and unlocked.",
            events=[
                AgentToolEvent(
                    name="create_checkout",
                    args={"artifact_id": "artifact_delivery_packet"},
                    response={"message": "Checkout created."},
                )
            ],
            orders=[
                PaymentIntentRecord(
                    payment_id="pi-123",
                    artifact_id="artifact_delivery_packet",
                    artifact_name="Delivery Packet",
                    artifact_type="delivery_packet",
                    amount_usd=0.001,
                    buyer_address="0x00000000000000000000000000000000000000aa",
                    deposit_address="0x00000000000000000000000000000000000000bb",
                    job_id="job-123",
                    status="verified",
                    settlement_status="SETTLED",
                    reason=None,
                    tx_hash="0xmockautopayhash",
                    circle_transaction_id="tx-123",
                    executed=True,
                    download_url="/api/artifacts/artifact_delivery_packet/download",
                    execution_message="Job executed successfully after payment verification.",
                    created_at="2026-04-25T00:00:00Z",
                    updated_at="2026-04-25T00:00:01Z",
                )
            ],
            settlement_auth_mode="programmatic",
            autonomous_payments_enabled=True,
        )

    monkeypatch.setattr("tothemoon_api.agent_chat.GeminiMarketplaceAgent.respond", fake_respond)

    response = client.post(
        "/api/agent/chat",
        json={"message": "buy the delivery packet", "history": []},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["reply"] == "Delivery Packet bought and unlocked."
    assert payload["events"][0]["name"] == "create_checkout"
    assert payload["orders"][0]["payment_id"] == "pi-123"
    assert payload["settlement_auth_mode"] == "programmatic"
    assert payload["autonomous_payments_enabled"] is True


def test_gemini_agent_runs_manual_tool_call_loop(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    calls = []

    class FakeModels:
        def generate_content(self, *, model, contents, config):
            calls.append(
                {
                    "model": model,
                    "contents": contents,
                    "config": config,
                }
            )
            if len(calls) == 1:
                return SimpleNamespace(
                    function_calls=[
                        types.FunctionCall(
                            id="call-1",
                            name="list_artifacts",
                            args={},
                        )
                    ],
                    candidates=[
                        SimpleNamespace(
                            content=types.Content(
                                role="model",
                                parts=[
                                    types.Part.from_function_call(
                                        name="list_artifacts",
                                        args={},
                                    )
                                ],
                            )
                        )
                    ],
                    text=None,
                )
            return SimpleNamespace(
                function_calls=[],
                candidates=[],
                text="There are three paid artifacts available.",
            )

    class FakeClient:
        def __init__(self, api_key):
            assert api_key == "test-gemini-key"
            self.models = FakeModels()

    monkeypatch.setattr("tothemoon_api.agent_chat.genai.Client", FakeClient)

    agent = GeminiMarketplaceAgent(settings=get_settings())
    response = agent.respond(AgentChatRequest(message="What artifacts can you buy?", history=[]))

    assert response.reply == "There are three paid artifacts available."
    assert response.events[0].name == "list_artifacts"
    assert len(response.events[0].response["artifacts"]) == 3
    assert len(calls) == 2
    assert calls[1]["contents"][-1].role == "tool"
    assert calls[0]["config"].automatic_function_calling.disable is True


def test_gemini_agent_blocks_purchase_without_ui_selection(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    calls = []

    class FakeModels:
        def generate_content(self, *, model, contents, config):
            calls.append(
                {
                    "model": model,
                    "contents": contents,
                    "config": config,
                }
            )
            if len(calls) == 1:
                return SimpleNamespace(
                    function_calls=[
                        types.FunctionCall(
                            id="call-1",
                            name="create_checkout",
                            args={"artifact_id": "artifact_delivery_packet"},
                        )
                    ],
                    candidates=[
                        SimpleNamespace(
                            content=types.Content(
                                role="model",
                                parts=[
                                    types.Part.from_function_call(
                                        name="create_checkout",
                                        args={"artifact_id": "artifact_delivery_packet"},
                                    )
                                ],
                            )
                        )
                    ],
                    text=None,
                )
            return SimpleNamespace(
                function_calls=[],
                candidates=[],
                text="Select an artifact in the UI before I create checkout.",
            )

    class FakeClient:
        def __init__(self, api_key):
            assert api_key == "test-gemini-key"
            self.models = FakeModels()

    monkeypatch.setattr("tothemoon_api.agent_chat.genai.Client", FakeClient)

    agent = GeminiMarketplaceAgent(settings=get_settings())
    response = agent.respond(AgentChatRequest(message="Buy the delivery packet", history=[]))

    assert response.reply == "Select an artifact in the UI before I create checkout."
    assert response.events[0].name == "create_checkout"
    assert "Purchase blocked" in response.events[0].response["error"]
    assert response.orders == []
    assert "No artifact has been selected" in calls[0]["config"].system_instruction


def test_gemini_agent_can_use_vertexai(monkeypatch):
    created = {}

    class FakeClient:
        def __init__(self, **kwargs):
            created.update(kwargs)

    monkeypatch.setattr("tothemoon_api.agent_chat.genai.Client", FakeClient)

    settings = get_settings()
    settings.gemini_api_key = ""
    settings.gemini_use_vertexai = True
    settings.gemini_vertex_project = "demo-project"
    settings.gemini_vertex_location = "us-central1"

    GeminiMarketplaceAgent(settings=settings)

    assert created == {
        "vertexai": True,
        "project": "demo-project",
        "location": "us-central1",
    }
