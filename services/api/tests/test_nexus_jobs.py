from fastapi.testclient import TestClient

from tothemoon_api.main import app
from tothemoon_api.nexus_jobs import clear_jobs

client = TestClient(app)


def setup_function():
    clear_jobs()


def test_job_lifecycle():
    response = client.post("/api/jobs", json={"id": "job1", "description": "test job"})
    assert response.status_code == 200
    assert response.json()["state"] == "REQUESTED"

    response = client.post("/api/jobs/job1/unlock_payment")
    assert response.status_code == 200
    assert response.json()["state"] == "PAYMENT_UNLOCKED"

    response = client.post("/api/jobs/job1/reserve_work")
    assert response.status_code == 200
    assert response.json()["state"] == "WORK_RESERVED"

    response = client.post("/api/jobs/job1/request_review")
    assert response.status_code == 200
    assert response.json()["state"] == "REVIEW_PENDING"

    response = client.post("/api/jobs/job1/deliver")
    assert response.status_code == 200
    payload = response.json()
    assert payload["state"] == "DELIVERED"
    assert len(payload["transitions"]) == 5


def test_job_invalid_transition_returns_conflict():
    client.post("/api/jobs", json={"id": "job2", "description": "test job"})
    response = client.post("/api/jobs/job2/reserve_work")
    assert response.status_code == 409


def test_list_jobs():
    client.post("/api/jobs", json={"id": "job1", "description": "test job"})
    client.post("/api/jobs", json={"id": "job2", "description": "test job"})
    response = client.get("/api/jobs")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_paid_payment_flow_updates_nexus_lifecycle(monkeypatch):
    from tothemoon_api.circle import circle_client
    from tothemoon_api.payments import clear_payment_intents

    clear_payment_intents()
    monkeypatch.setattr(circle_client, "ensure_wallets_loaded", lambda: None)

    intent_response = client.post(
        "/api/payments/intent",
        json={"artifact_id": "artifact_delivery_packet", "buyer_address": "0xBuyerAddress"},
    )
    assert intent_response.status_code == 200
    intent_payload = intent_response.json()
    payment_id = intent_payload["payment_id"]
    job_id = intent_payload["job_id"]

    job_response = client.get(f"/api/jobs/{job_id}")
    assert job_response.status_code == 200
    job_payload = job_response.json()
    assert job_payload["state"] == "REQUESTED"
    assert job_payload["payment_id"] == payment_id
    assert job_payload["artifact_id"] == "artifact_delivery_packet"

    execute_before_payment = client.post(
        "/api/payments/execute",
        json={"artifact_id": "artifact_delivery_packet", "payment_id": payment_id},
    )
    assert execute_before_payment.status_code == 402

    verify_response = client.post(
        "/api/payments/verify", json={"payment_id": payment_id, "tx_hash": "0xMockTransactionHash"}
    )
    assert verify_response.status_code == 200

    paid_job = client.get(f"/api/jobs/{job_id}").json()
    assert paid_job["state"] == "PAYMENT_UNLOCKED"
    assert paid_job["settlement_status"] == "SETTLED"
    assert paid_job["tx_hash"] == "0xMockTransactionHash"

    execute_response = client.post(
        "/api/payments/execute",
        json={"artifact_id": "artifact_delivery_packet", "payment_id": payment_id},
    )
    assert execute_response.status_code == 200

    delivered_job = client.get(f"/api/jobs/{job_id}").json()
    assert delivered_job["state"] == "DELIVERED"
    assert delivered_job["download_url"] == "/api/artifacts/artifact_delivery_packet/download"
    assert [transition["to_state"] for transition in delivered_job["transitions"]] == [
        "REQUESTED",
        "PAYMENT_UNLOCKED",
        "WORK_RESERVED",
        "REVIEW_PENDING",
        "DELIVERED",
    ]


def test_delivery_endpoint_still_requires_review_gate():
    client.post("/api/jobs", json={"id": "review-gated", "description": "test job"})
    client.post("/api/jobs/review-gated/unlock_payment")
    client.post("/api/jobs/review-gated/reserve_work")

    response = client.post("/api/jobs/review-gated/deliver")
    assert response.status_code == 409
