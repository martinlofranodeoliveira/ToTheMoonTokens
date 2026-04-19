from fastapi.testclient import TestClient

from tothemoon_api.main import app


client = TestClient(app)


def test_health_endpoint_exposes_paper_mode_by_default():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["mode"] == "paper"
    assert payload["liveTradingEnabled"] is False


def test_dashboard_includes_guardrails_and_metrics():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert payload["guardrails"]["can_submit_mainnet_orders"] is False
    assert payload["metrics"]["trade_count"] >= 0
    assert payload["connectors"]["exchange"] == "binance_spot_testnet"


def test_backtest_endpoint_returns_consistent_metrics():
    response = client.post(
        "/api/backtests/run",
        json={
            "strategy_id": "ema_crossover",
            "lookback_bars": 200,
            "initial_capital": 10000,
            "position_size_pct": 20,
            "fee_bps": 10,
            "slippage_bps": 5,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["initial_capital"] == 10000
    assert payload["ending_equity"] > 0
    assert payload["edge_status"] in {"positive", "flat", "negative"}


def test_live_arm_is_blocked_without_manual_acknowledgement():
    response = client.post("/api/live/arm")
    assert response.status_code == 423
    payload = response.json()["detail"]
    assert payload["can_submit_testnet_orders"] is False
    assert payload["can_submit_mainnet_orders"] is False

