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


def test_live_arm_denial_is_recorded_in_metrics():
    client.post("/api/live/arm")
    response = client.get("/metrics")
    assert "live_arm_attempts_total" in response.text
