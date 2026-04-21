import json
import os
import sys

# Ensure Python can find tothemoon_api
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../services/api/src")))

from fastapi.testclient import TestClient
from tothemoon_api.main import app

client = TestClient(app)

EVIDENCE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../ops/evidence/demo_audit_trail.json"))

def main():
    print("Starting Demo Path Replay...")
    evidence = []
    
    # Ensure evidence directory exists
    os.makedirs(os.path.dirname(EVIDENCE_FILE), exist_ok=True)
    
    # 1. Request Job
    print("1. Requesting Job...")
    res = client.post("/api/demo/jobs/request", json={"artifact_type": "scalp_validation"})
    res.raise_for_status()
    job = res.json()
    job_id = job["id"]
    evidence.append({"step": "request", "response": job})
    
    # 2. Pay for Job
    print(f"2. Paying for Job {job_id}...")
    res = client.post(f"/api/demo/jobs/{job_id}/pay")
    res.raise_for_status()
    job = res.json()
    evidence.append({"step": "payment", "response": job})
    
    # 3. Execute Job
    print(f"3. Executing Job {job_id}...")
    res = client.post(f"/api/demo/jobs/{job_id}/execute")
    res.raise_for_status()
    job = res.json()
    evidence.append({"step": "execution", "response": job})
    
    # 4. Review Job
    print(f"4. Reviewing Job {job_id}...")
    res = client.post(f"/api/demo/jobs/{job_id}/review?approve=true")
    res.raise_for_status()
    job = res.json()
    evidence.append({"step": "review", "response": job})
    
    # 5. Deliver Job
    print(f"5. Delivering Job {job_id}...")
    res = client.post(f"/api/demo/jobs/{job_id}/deliver")
    res.raise_for_status()
    job = res.json()
    evidence.append({"step": "delivery", "response": job})
    
    # 6. Test Failure (Skip payment)
    print("6. Testing failure path (execute without payment)...")
    res = client.post("/api/demo/jobs/request", json={"artifact_type": "backtest_run"})
    res.raise_for_status()
    fail_job_id = res.json()["id"]
    
    fail_res = client.post(f"/api/demo/jobs/{fail_job_id}/execute")
    if fail_res.status_code == 400:
        evidence.append({"step": "failure_test", "status": 400, "detail": fail_res.json()})
        print("   -> Failed as expected")
    else:
        print("   -> Unexpected status code")
    
    with open(EVIDENCE_FILE, "w") as f:
        json.dump(evidence, f, indent=2)
    print(f"\nDone! Evidence saved to {EVIDENCE_FILE}")

if __name__ == "__main__":
    main()
