from __future__ import annotations

import tothemoon_api.market_data as market_data


def setup_function() -> None:
    market_data.connector_state.is_healthy = True
    market_data.connector_state.last_error = None
    market_data.connector_state.last_latency_ms = 0.0
    market_data.connector_state.last_heartbeat = None
    market_data.connector_state.reconnect_count = 0


def test_historical_candles_fall_back_to_synthetic_when_exchange_fails(monkeypatch) -> None:
    def fake_fetch_json(url: str, params: dict[str, object]) -> object:
        raise RuntimeError("exchange temporarily unavailable")

    monkeypatch.setattr(market_data, "_fetch_json", fake_fetch_json)

    candles = market_data.get_historical_candles("BTCUSDT", "1m", 12)

    assert len(candles) == 12
    assert market_data.connector_state.is_healthy is False
    assert market_data.connector_state.last_error == "exchange temporarily unavailable"
    assert market_data.connector_state.reconnect_count == 1
