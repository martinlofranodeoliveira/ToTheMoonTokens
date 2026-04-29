# services/api/tests/test_api_tokens.py
from fastapi.testclient import TestClient
from tothemoon_api.main import app

client = TestClient(app)

def test_token_audit_endpoint():
    response = client.get("/api/v1/tokens/0xSAFE/audit")
    assert response.status_code == 200
    data = response.json()
    assert "security" in data
    assert "market" in data
    assert data["security"]["is_honeypot"] is False
