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
