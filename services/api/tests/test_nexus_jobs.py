from fastapi.testclient import TestClient

from tothemoon_api.main import app
from tothemoon_api.nexus_jobs import clear_jobs

client = TestClient(app)

def setup_function():
    clear_jobs()

def test_job_lifecycle():
    # Create job
    resp = client.post("/api/jobs", json={"id": "job1", "description": "test job"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["state"] == "REQUESTED"
    assert len(data["transitions"]) == 1

    # Unlock payment
    resp = client.post("/api/jobs/job1/unlock_payment")
    assert resp.status_code == 200
    assert resp.json()["state"] == "PAYMENT_UNLOCKED"

    # Reserve work
    resp = client.post("/api/jobs/job1/reserve_work")
    assert resp.status_code == 200
    assert resp.json()["state"] == "WORK_RESERVED"

    # Request review
    resp = client.post("/api/jobs/job1/request_review")
    assert resp.status_code == 200
    assert resp.json()["state"] == "REVIEW_PENDING"

    # Deliver
    resp = client.post("/api/jobs/job1/deliver")
    assert resp.status_code == 200
    data = resp.json()
    assert data["state"] == "DELIVERED"
    assert len(data["transitions"]) == 5
    
    # Audit trail verification
    assert data["transitions"][0]["to_state"] == "REQUESTED"
    assert data["transitions"][1]["to_state"] == "PAYMENT_UNLOCKED"
    assert data["transitions"][2]["to_state"] == "WORK_RESERVED"
    assert data["transitions"][3]["to_state"] == "REVIEW_PENDING"
    assert data["transitions"][4]["to_state"] == "DELIVERED"

def test_job_invalid_transition():
    client.post("/api/jobs", json={"id": "job2", "description": "test job"})
    # Cannot reserve work if payment not unlocked
    resp = client.post("/api/jobs/job2/reserve_work")
    assert resp.status_code == 404

def test_list_jobs():
    client.post("/api/jobs", json={"id": "job1", "description": "test job"})
    client.post("/api/jobs", json={"id": "job2", "description": "test job"})
    resp = client.get("/api/jobs")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
