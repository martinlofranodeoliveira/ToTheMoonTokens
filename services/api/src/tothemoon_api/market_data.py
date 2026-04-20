from __future__ import annotations

import json
import math
import time
from datetime import UTC, datetime, timedelta

import httpx
from websockets.sync.client import connect

from .models import Candle
from .observability import get_logger

log = get_logger(__name__)


class MarketDataError(RuntimeError):
    """Raised when a testnet market-data request cannot be satisfied."""


class BinanceMarketData:
    def __init__(
        self,
        *,
        base_url: str = "https://testnet.binance.vision",
        ws_url: str = "wss://stream.testnet.binance.vision/ws",
        timeout_seconds: float = 5.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.ws_url = ws_url.rstrip("/")
        self.client = httpx.Client(base_url=self.base_url, timeout=timeout_seconds)
        self.operational_status: dict[str, object] = {
            "status": "unknown",
            "latency_ms": 0.0,
            "last_error": None,
            "last_stream": None,
            "sample_count": 0,
        }

    def _mark_degraded(self, error: Exception, *, stream_name: str | None = None) -> None:
        self.operational_status.update(
            {
                "status": "degraded",
                "latency_ms": 0.0,
                "last_error": str(error),
                "last_stream": stream_name,
            }
        )

    def ping(self) -> dict[str, object]:
        started = time.perf_counter()
        try:
            response = self.client.get("/api/v3/ping")
            response.raise_for_status()
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            self.operational_status.update(
                {
                    "status": "online",
                    "latency_ms": latency_ms,
                    "last_error": None,
                }
            )
        except Exception as exc:
            self._mark_degraded(exc)
            log.warning("market_ping_failed", error=str(exc), base_url=self.base_url)
        return dict(self.operational_status)

    def fetch_klines(self, symbol: str, interval: str, limit: int = 180) -> list[Candle]:
        try:
            response = self.client.get(
                "/api/v3/klines",
                params={"symbol": symbol, "interval": interval, "limit": limit},
            )
            response.raise_for_status()
            rows = response.json()
            candles = [
                Candle(
                    timestamp=datetime.fromtimestamp(row[0] / 1000.0, tz=UTC),
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=float(row[5]),
                )
                for row in rows
            ]
            self.operational_status.update(
                {
                    "status": "online",
                    "last_error": None,
                    "sample_count": len(candles),
                }
            )
            return candles
        except Exception as exc:
            self._mark_degraded(exc)
            log.warning(
                "market_klines_fallback",
                symbol=symbol,
                interval=interval,
                limit=limit,
                error=str(exc),
            )
            return generate_sample_candles(length=limit)

    def fetch_ticker(self, symbol: str) -> dict[str, object]:
        try:
            response = self.client.get("/api/v3/ticker/24hr", params={"symbol": symbol})
            response.raise_for_status()
            payload = response.json()
            self.operational_status.update({"status": "online", "last_error": None})
            return payload
        except Exception as exc:
            self._mark_degraded(exc)
            raise MarketDataError(f"failed to fetch ticker for {symbol}: {exc}") from exc

    def fetch_depth(self, symbol: str, limit: int = 5) -> dict[str, object]:
        try:
            response = self.client.get("/api/v3/depth", params={"symbol": symbol, "limit": limit})
            response.raise_for_status()
            payload = response.json()
            self.operational_status.update({"status": "online", "last_error": None})
            return payload
        except Exception as exc:
            self._mark_degraded(exc)
            raise MarketDataError(f"failed to fetch depth for {symbol}: {exc}") from exc

    def listen_stream(self, stream_name: str, max_messages: int = 1) -> list[dict[str, object]]:
        messages: list[dict[str, object]] = []
        try:
            with connect(f"{self.ws_url}/{stream_name}") as websocket:
                for _ in range(max_messages):
                    raw_message = websocket.recv(timeout=5.0)
                    messages.append(json.loads(raw_message))
            self.operational_status.update(
                {
                    "status": "online",
                    "last_error": None,
                    "last_stream": stream_name,
                    "sample_count": len(messages),
                }
            )
            return messages
        except Exception as exc:
            self._mark_degraded(exc, stream_name=stream_name)
            log.warning("market_stream_degraded", stream_name=stream_name, error=str(exc))
            return messages


def generate_sample_candles(length: int = 180) -> list[Candle]:
    candles: list[Candle] = []
    start = datetime(2026, 1, 1, tzinfo=UTC)
    price = 100.0

    for index in range(length):
        trend = 0.14 * index
        cycle = math.sin(index / 8) * 2.8
        pullback = math.cos(index / 17) * 1.3
        close = 100 + trend + cycle + pullback
        open_price = price
        high = max(open_price, close) + 1.2
        low = min(open_price, close) - 1.1
        volume = 1_000 + (index % 24) * 17
        candles.append(
            Candle(
                timestamp=start + timedelta(minutes=index),
                open=round(open_price, 4),
                high=round(high, 4),
                low=round(low, 4),
                close=round(close, 4),
                volume=float(volume),
            )
        )
        price = close

    return candles
