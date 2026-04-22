from fastapi.testclient import TestClient

from tothemoon_api.main import app

client = TestClient(app)


def test_payment_catalog_returns_items():
    response = client.get("/api/payments/catalog")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 3
    assert any(item["id"] == "artifact_backtest_report" for item in payload)
    assert any(item["price_usd"] > 0 for item in payload)


def test_payment_intent_creation_and_verification_flow():
    # 1. Create intent
    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_walk_forward", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    intent_payload = intent_response.json()
    assert intent_payload["status"] == "pending"
    assert intent_payload["amount_usd"] == 10.0
    payment_id = intent_payload["payment_id"]

    # 2. Verify payment
    verify_response = client.post(
        "/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "0xMockTransactionHash"}
    )
    assert verify_response.status_code == 200
    verify_payload = verify_response.json()
    assert verify_payload["status"] == "verified"
    assert verify_payload["unlocked_artifact_id"] == "artifact_walk_forward"


def test_payment_verification_fails_with_invalid_tx():
    # 1. Create intent
    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_live_signal", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    payment_id = intent_response.json()["payment_id"]

    # 2. Verify payment with invalid tx
    verify_response = client.post(
        "/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "invalid_tx"}
    )
    assert verify_response.status_code == 200
    verify_payload = verify_response.json()
    assert verify_payload["status"] == "failed"
    assert verify_payload["unlocked_artifact_id"] is None


def test_job_lifecycle_requires_payment():
    # Attempt to execute without payment
    response = client.post("/api/payments/execute", json={"artifact_id": "artifact_backtest_report"})
    assert response.status_code == 402
    assert "Payment required" in response.json()["detail"]

    # 1. Create intent
    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_backtest_report", "buyer_address": "0xBuyerAddress"},
    )
    payment_id = intent_response.json()["payment_id"]

    # 2. Verify payment
    client.post("/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "0xMockTransactionHash"})

    # 3. Execute job after payment
    response = client.post("/api/payments/execute", json={"artifact_id": "artifact_backtest_report"})
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_get_payment_intent():
    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_backtest_report", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    payment_id = intent_response.json()["payment_id"]

    get_response = client.get(f"/api/payments/intent/{payment_id}")
    assert get_response.status_code == 200
    get_payload = get_response.json()
    assert get_payload["payment_id"] == payment_id
    assert get_payload["status"] == "pending"
    assert get_payload["amount_usd"] == 5.0

def test_get_payment_intent_not_found():
    response = client.get("/api/payments/intent/invalid_id")
    assert response.status_code == 404
