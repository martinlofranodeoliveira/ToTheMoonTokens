from fastapi.testclient import TestClient
from tothemoon_api.main import app

client = TestClient(app)

def test_simulate_endpoint():
    response = client.post("/api/v1/simulate/order", json={
        "token_address": "0xABC",
        "amount": 50.0,
        "side": "SELL"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["fees_paid"] == 2.0
