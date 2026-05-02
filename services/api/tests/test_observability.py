from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from tothemoon_api.database import SessionLocal
from tothemoon_api.db_models import AuditLog
from tothemoon_api.main import app

client = TestClient(app)
PASSWORD = "correct horse battery staple"


def test_metrics_endpoint_exposes_prometheus_text():
    client.get("/health")
    client.post(
        "/api/backtests/run",
        json={
            "strategy_id": "ema_crossover",
            "lookback_bars": 120,
            "initial_capital": 5000,
            "position_size_pct": 10,
            "fee_bps": 5,
            "slippage_bps": 3,
        },
    )

    response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    body = response.text
    assert "http_requests_total" in body
    assert "backtests_run_total" in body


def test_response_carries_security_headers():
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "permissions-policy" in response.headers


def test_request_id_is_generated_when_absent():
    response = client.get("/health")
    request_id = response.headers.get("x-request-id")
    assert request_id
    assert len(request_id) >= 16


def test_request_id_is_propagated_from_client():
    response = client.get("/health", headers={"X-Request-ID": "fixture-123"})
    assert response.headers.get("x-request-id") == "fixture-123"


def test_overly_long_request_id_is_rejected_and_regenerated():
    response = client.get("/health", headers={"X-Request-ID": "x" * 500})
    incoming = response.headers.get("x-request-id")
    assert incoming and incoming != "x" * 500


def test_readiness_endpoint_returns_checks():
    response = client.get("/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["checks"]["mainnet_permanently_blocked"] is True
    assert payload["checks"]["strategies_loaded"] is True
    assert payload["checks"]["external_adapters_paper_only"] is True


def test_readiness_fails_when_external_adapter_contract_is_unsafe(monkeypatch):
    monkeypatch.setattr(
        "tothemoon_api.main.get_external_adapter_contract",
        lambda: {
            "order_submission_enabled": True,
            "mainnet_order_submission_enabled": False,
            "providers": [
                {
                    "name": "unsafe_exchange",
                    "read_only": False,
                    "supports_order_submission": True,
                    "mainnet_order_submission": False,
                }
            ],
        },
    )

    response = client.get("/ready")

    assert response.status_code == 503
    payload = response.json()["detail"]
    assert payload["ok"] is False
    assert payload["checks"]["external_adapters_paper_only"] is False


def test_readiness_fails_when_external_adapter_contract_is_malformed(monkeypatch):
    monkeypatch.setattr(
        "tothemoon_api.main.get_external_adapter_contract",
        lambda: {
            "order_submission_enabled": False,
            "mainnet_order_submission_enabled": False,
            "providers": ["not-a-provider-object"],
        },
    )

    response = client.get("/ready")

    assert response.status_code == 503
    payload = response.json()["detail"]
    assert payload["checks"]["external_adapters_paper_only"] is False


def test_readiness_fails_when_external_adapter_contract_has_no_providers(monkeypatch):
    monkeypatch.setattr(
        "tothemoon_api.main.get_external_adapter_contract",
        lambda: {
            "order_submission_enabled": False,
            "mainnet_order_submission_enabled": False,
            "providers": [],
        },
    )

    response = client.get("/ready")

    assert response.status_code == 503
    payload = response.json()["detail"]
    assert payload["checks"]["external_adapters_paper_only"] is False


def test_cors_preflight_responds_for_allowed_origin():
    response = client.options(
        "/api/dashboard",
        headers={
            "Origin": "http://127.0.0.1:4173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code in {200, 204}
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:4173"


def test_forced_observability_error_endpoint_returns_500():
    isolated = TestClient(app, raise_server_exceptions=False)
    response = isolated.get("/api/_test/raise")
    assert response.status_code == 500


def test_audit_log_records_auth_key_and_checkout_events():
    email = f"phase8-{uuid4().hex}@example.com"
    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": PASSWORD})
    assert signup.status_code == 201
    org_id = signup.json()["org_id"]

    login = client.post("/api/v1/auth/login", data={"username": email, "password": PASSWORD})
    assert login.status_code == 200
    token = login.json()["access_token"]

    created = client.post(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "phase8"},
    )
    assert created.status_code == 201

    revoked = client.delete(
        f"/api/v1/saas/api-keys/{created.json()['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoked.status_code == 200

    checkout = client.post(
        "/api/v1/billing/checkout",
        headers={"Authorization": f"Bearer {token}"},
        json={"plan_code": "pro"},
    )
    assert checkout.status_code == 200

    response = client.get("/api/v1/saas/audit-log", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["org_id"] == org_id
    actions = {event["action"] for event in payload["events"]}
    assert {
        "auth.signup",
        "auth.login",
        "api_key.created",
        "api_key.revoked",
        "billing.checkout.created",
    }.issubset(actions)

    with SessionLocal() as db:
        rows = db.query(AuditLog).filter(AuditLog.org_id == org_id).all()
        assert len(rows) >= 5
        assert any(row.after and row.after.get("prefix") for row in rows)
