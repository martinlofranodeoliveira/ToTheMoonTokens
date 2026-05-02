# services/api/tests/test_api_tokens.py
from fastapi.testclient import TestClient

from tothemoon_api.main import app

client = TestClient(app)


def _create_api_key() -> str:
    email = "tokens@example.com"
    password = "correct horse battery staple"
    client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = login.json()["access_token"]
    created = client.post(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "tokens-test"},
    )
    return created.json()["plaintext"]


def test_token_audit_endpoint():
    response = client.get("/api/v1/tokens/0xSAFE/audit", headers={"X-API-Key": _create_api_key()})
    assert response.status_code == 200
    data = response.json()
    assert "security" in data
    assert "market" in data
    assert data["security"]["is_honeypot"] is False


def test_token_audit_requires_api_key():
    response = client.get("/api/v1/tokens/0xSAFE/audit")
    assert response.status_code == 401
