from fastapi.testclient import TestClient

from tothemoon_api.main import app

client = TestClient(app)

def test_demo_happy_path():
    # 1. Request Job
    res = client.post("/api/demo/jobs/request", json={"artifact_type": "scalp_validation"})
    assert res.status_code == 200
    job = res.json()
    job_id = job["id"]
    assert job["state"] == "REQUESTED"

    # 2. Pay for Job
    res = client.post(f"/api/demo/jobs/{job_id}/pay")
    assert res.status_code == 200
    assert res.json()["state"] == "PAID"

    # 3. Execute Job
    res = client.post(f"/api/demo/jobs/{job_id}/execute")
    assert res.status_code == 200
    assert res.json()["state"] == "REVIEW_PENDING"

    # 4. Review Job
    res = client.post(f"/api/demo/jobs/{job_id}/review?approve=true")
    assert res.status_code == 200
    assert res.json()["state"] == "REVIEWED"

    # 5. Deliver Job
    res = client.post(f"/api/demo/jobs/{job_id}/deliver")
    assert res.status_code == 200
    assert res.json()["state"] == "DELIVERED"

def test_demo_failure_missing_payment():
    # 1. Request Job
    res = client.post("/api/demo/jobs/request", json={"artifact_type": "scalp_validation"})
    assert res.status_code == 200
    job_id = res.json()["id"]

    # 2. Try Execution directly
    res = client.post(f"/api/demo/jobs/{job_id}/execute")
    assert res.status_code == 400
    assert "Payment required" in res.json()["detail"]
