from unittest.mock import patch

from fastapi.testclient import TestClient

from tothemoon_api.main import app
from tothemoon_api.market_data import generate_sample_candles

client = TestClient(app)


def test_health_endpoint_exposes_paper_mode_by_default():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["mode"] == "paper"
    assert payload["orderSubmissionEnabled"] is False
    assert "market_connector" in payload


def test_dashboard_includes_guardrails_and_metrics():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert payload["guardrails"]["can_submit_mainnet_orders"] is False
    assert payload["guardrails"]["can_submit_testnet_orders"] is False
    assert payload["metrics"]["trade_count"] >= 0
    assert len(payload["research_snapshots"]) == 3
    assert payload["runtime_status"] is None
    assert payload["connectors"]["settlement_network"] == "arc_testnet"
    assert payload["connectors"]["wallet_provider"] == "circle_developer_controlled_wallets"
    assert payload["recent_trades"] == []
    assert payload["performance"]["total_trades"] == 0


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


def test_market_klines_endpoint_returns_candles():
    with patch(
        "tothemoon_api.main.BinanceMarketData.fetch_klines",
        return_value=generate_sample_candles(length=4),
    ):
        response = client.get("/api/market/klines?limit=4")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 4
    assert payload[0]["close"] > 0


def test_market_health_endpoint_returns_probe_status():
    with patch(
        "tothemoon_api.main.BinanceMarketData.ping",
        return_value={"status": "online", "latency_ms": 12.4, "last_error": None},
    ):
        response = client.get("/api/market/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "online"

def test_arc_network_health_endpoint():
    with patch(
        "tothemoon_api.main.ping_arc_network",
        return_value={"status": "online", "chain_id": 5042002, "url": "https://rpc.testnet.arc.network"},
    ):
        response = client.get("/api/network/arc/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "online"
    assert payload["chain_id"] == 5042002
