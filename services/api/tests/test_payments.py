from fastapi.testclient import TestClient

from tothemoon_api.circle import circle_client
from tothemoon_api.demo_agent import clear_demo_jobs
from tothemoon_api.main import app
from tothemoon_api.payments import clear_payment_intents

client = TestClient(app)

SENDER = "0x00000000000000000000000000000000000000aa"
TREASURY = "0x00000000000000000000000000000000000000bb"


def setup_function():
    clear_payment_intents()
    clear_demo_jobs()
    circle_client.wallets_by_role = {}
    circle_client.wallets_loaded = False


def test_payment_catalog_returns_items(monkeypatch):
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)
    response = client.get("/api/payments/catalog")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 3
    assert any(item["id"] == "artifact_delivery_packet" for item in payload)
    assert all(0 < item["price_usd"] <= 0.01 for item in payload)


def test_payment_intent_creation_and_verification_flow(monkeypatch):
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)

    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_review_bundle", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    intent_payload = intent_response.json()
    assert intent_payload["status"] == "pending"
    assert intent_payload["amount_usd"] == 0.005
    assert intent_payload["currency"] == "USDC"
    assert intent_payload["payment_requirement"] == {
        "asset": "USDC",
        "network": "arc_testnet",
        "amount": "0.005",
        "amount_native_units": "5000000000000000",
        "pay_to": "0xMockDepositAddressForTestnetOnly",
        "payment_id": intent_payload["payment_id"],
        "verification_endpoint": "/api/payments/verify",
    }
    payment_id = intent_payload["payment_id"]

    verify_response = client.post(
        "/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "0xMockTransactionHash"}
    )
    assert verify_response.status_code == 200
    verify_payload = verify_response.json()
    assert verify_payload["status"] == "verified"
    assert verify_payload["unlocked_artifact_id"] == "artifact_review_bundle"


def test_payment_verification_fails_with_invalid_tx(monkeypatch):
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)

    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_market_intel_brief", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    payment_id = intent_response.json()["payment_id"]

    verify_response = client.post(
        "/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "invalid_tx"}
    )
    assert verify_response.status_code == 200
    verify_payload = verify_response.json()
    assert verify_payload["status"] == "failed"
    assert verify_payload["unlocked_artifact_id"] is None


def test_job_lifecycle_requires_payment(monkeypatch):
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)

    response = client.post(
        "/api/payments/execute",
        json={"artifact_id": "artifact_delivery_packet", "payment_id": "missing-payment"},
    )
    assert response.status_code == 404
    assert "Payment intent not found" in response.json()["detail"]

    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_delivery_packet", "buyer_address": "0xBuyerAddress"},
    )
    payment_id = intent_response.json()["payment_id"]

    client.post(
        "/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "0xMockTransactionHash"}
    )

    response = client.post(
        "/api/payments/execute",
        json={"artifact_id": "artifact_delivery_packet", "payment_id": payment_id},
    )
    assert response.status_code == 200
    execute_payload = response.json()
    assert execute_payload["status"] == "completed"
    assert execute_payload["download_url"] == "/api/artifacts/artifact_delivery_packet/download"

    orders_response = client.get("/api/payments/orders")
    assert orders_response.status_code == 200
    [order] = orders_response.json()
    assert order["status"] == "verified"
    assert order["settlement_status"] == "SETTLED"
    assert order["executed"] is True
    assert order["download_url"] == execute_payload["download_url"]

    job_response = client.get(f"/api/jobs/{order['job_id']}")
    assert job_response.status_code == 200
    job_payload = job_response.json()
    assert job_payload["state"] == "DELIVERED"
    assert job_payload["download_url"] == execute_payload["download_url"]
    assert [event["to_state"] for event in job_payload["transitions"]] == [
        "REQUESTED",
        "PAYMENT_UNLOCKED",
        "WORK_RESERVED",
        "REVIEW_PENDING",
        "DELIVERED",
    ]


def test_delivery_unlock_is_blocked_until_payment_verified(monkeypatch):
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)

    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_delivery_packet", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    intent_payload = intent_response.json()

    blocked_response = client.post(
        "/api/payments/execute",
        json={
            "artifact_id": "artifact_delivery_packet",
            "payment_id": intent_payload["payment_id"],
        },
    )
    assert blocked_response.status_code == 402
    assert blocked_response.json()["detail"] == "Payment required to unlock this job."

    job_response = client.get(f"/api/jobs/{intent_payload['job_id']}")
    assert job_response.status_code == 200
    job_payload = job_response.json()
    assert job_payload["state"] == "REQUESTED"
    assert job_payload["download_url"] is None


def test_execute_requires_matching_payment_intent(monkeypatch):
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)

    delivery_intent = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_delivery_packet", "buyer_address": "0xBuyerAddress"},
    )
    delivery_payment_id = delivery_intent.json()["payment_id"]
    client.post(
        "/api/payments/verify",
        json={"payment_id": delivery_payment_id, "tx_hash": "0xMockTransactionHash"},
    )

    response = client.post(
        "/api/payments/execute",
        json={
            "artifact_id": "artifact_market_intel_brief",
            "payment_id": delivery_payment_id,
        },
    )
    assert response.status_code == 409
    assert "does not match requested artifact" in response.json()["detail"]


def test_programmatic_payment_endpoint_verifies_and_marks_demo_job_paid(monkeypatch):
    monkeypatch.setenv("AUTONOMOUS_PAYMENTS_ENABLED", "true")
    monkeypatch.setenv("WALLET_MODE", "custodial")
    monkeypatch.setenv("CIRCLE_API_KEY", "test-api-key")
    monkeypatch.setenv("CIRCLE_ENTITY_SECRET", "test-entity-secret")
    monkeypatch.setenv("CIRCLE_WALLET_SET_ID", "ws-123")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)
    monkeypatch.setattr(
        circle_client,
        "create_transfer",
        lambda **_kwargs: {"data": {"id": "tx-123", "state": "INITIATED"}},
    )
    monkeypatch.setattr(
        circle_client,
        "wait_for_transaction",
        lambda *_args, **_kwargs: {
            "id": "tx-123",
            "state": "COMPLETE",
            "txHash": "0xmockautopayhash",
        },
    )

    circle_client.wallets_by_role = {"TREASURY": {"address": TREASURY}}
    circle_client.wallets_loaded = True

    job_response = client.post("/api/demo/jobs/request", json={"artifact_type": "delivery_packet"})
    assert job_response.status_code == 200
    job_id = job_response.json()["id"]

    intent_response = client.post(
        "/api/payments/intent",
        json={
            "artifact_id": "artifact_delivery_packet",
            "buyer_address": SENDER,
            "job_id": job_id,
        },
    )
    assert intent_response.status_code == 200
    payment_id = intent_response.json()["payment_id"]

    pay_response = client.post("/api/payments/pay", json={"payment_id": payment_id})
    assert pay_response.status_code == 200
    pay_payload = pay_response.json()
    assert pay_payload["status"] == "verified"
    assert pay_payload["settlement_status"] == "SETTLED"
    assert pay_payload["tx_hash"] == "0xmockautopayhash"

    job_state = client.get(f"/api/demo/jobs/{job_id}")
    assert job_state.status_code == 200
    assert job_state.json()["state"] == "PAID"
