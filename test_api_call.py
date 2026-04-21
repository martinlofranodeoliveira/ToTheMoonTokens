from fastapi.testclient import TestClient
from tothemoon_api.main import app

client = TestClient(app)

def run():
    response = client.post("/api/arc/jobs", json={
        "task_id": "GH-40",
        "agent_id": "dev",
        "action": "complete",
        "evidence": {
            "pr": "1"
        }
    })
    print(response.json())
    
    response = client.get("/api/dashboard")
    print("Dashboard arc_jobs length:", len(response.json()["arc_jobs"]))

run()
