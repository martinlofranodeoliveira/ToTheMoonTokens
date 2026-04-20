from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx

from tothemoon_api.market_data import BinanceMarketData, MarketDataError


def test_ping_success_marks_connector_online():
    market = BinanceMarketData()
    with patch.object(market.client, "get") as mock_get:
        response = MagicMock()
        response.raise_for_status.return_value = None
        mock_get.return_value = response

        status = market.ping()

    assert status["status"] == "online"
    assert status["latency_ms"] >= 0
    assert status["last_error"] is None


def test_fetch_klines_falls_back_to_sample_candles_on_api_failure():
    market = BinanceMarketData()
    with patch.object(market.client, "get") as mock_get:
        mock_get.side_effect = httpx.RequestError("network down")

        candles = market.fetch_klines("BTCUSDT", "1m", limit=8)

    assert len(candles) == 8
    assert market.operational_status["status"] == "degraded"
    assert "network down" in str(market.operational_status["last_error"])


def test_fetch_ticker_raises_market_data_error_on_failure():
    market = BinanceMarketData()
    with patch.object(market.client, "get") as mock_get:
        mock_get.side_effect = httpx.HTTPStatusError(
            "bad gateway",
            request=MagicMock(),
            response=MagicMock(),
        )

        try:
            market.fetch_ticker("BTCUSDT")
        except MarketDataError as exc:
            assert "failed to fetch ticker" in str(exc)
        else:
            raise AssertionError("expected MarketDataError")


def test_fetch_depth_raises_market_data_error_on_failure():
    market = BinanceMarketData()
    with patch.object(market.client, "get") as mock_get:
        mock_get.side_effect = httpx.RequestError("depth unavailable")

        try:
            market.fetch_depth("BTCUSDT")
        except MarketDataError as exc:
            assert "failed to fetch depth" in str(exc)
        else:
            raise AssertionError("expected MarketDataError")


def test_listen_stream_degrades_gracefully_on_websocket_failure():
    market = BinanceMarketData()
    with patch("tothemoon_api.market_data.connect") as mock_connect:
        mock_connect.side_effect = RuntimeError("ws refused")
        messages = market.listen_stream("btcusdt@trade")

    assert messages == []
    assert market.operational_status["status"] == "degraded"
    assert market.operational_status["last_stream"] == "btcusdt@trade"
