from fastapi.testclient import TestClient
from tothemoon_api.main import app

client = TestClient(app)


def test_arc_job_lifecycle():
    # 1. Create a job
    response = client.post(
        "/api/arc/jobs",
        json={
            "nexus_task_id": "test_nexus_task_123",
            "job_type": "research_backtest",
            "agent_id": "test_agent_1",
            "parameters": {"strategy": "ema_crossover"},
            "reward_amount": 10.0,
        },
    )
    assert response.status_code == 200
    job = response.json()
    assert job["nexus_task_id"] == "test_nexus_task_123"
    assert job["status"] == "pending"
    assert job["reward_amount"] == 10.0
    job_id = job["id"]

    # 2. Get the jobs
    response = client.get("/api/arc/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) >= 1
    assert any(j["id"] == job_id for j in jobs)

    # 3. Complete the job with proof
    evidence = {"profit": 500, "trade_count": 10}
    response = client.post(f"/api/arc/jobs/{job_id}/proof", json=evidence)
    assert response.status_code == 200
    completed_job = response.json()
    assert completed_job["status"] == "completed"
    assert completed_job["proof"] is not None
    assert completed_job["proof"]["job_id"] == job_id
    assert completed_job["proof"]["evidence_payload"] == evidence

    # 4. Check that it is available in DashboardResponse
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    dashboard = response.json()
    assert "arc_jobs" in dashboard
    assert any(j["id"] == job_id for j in dashboard["arc_jobs"])
