from __future__ import annotations

from fastapi.testclient import TestClient

from tothemoon_api.main import app

client = TestClient(app)


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
