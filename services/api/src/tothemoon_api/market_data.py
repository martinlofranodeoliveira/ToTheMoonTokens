from __future__ import annotations

import hashlib
import math
import random
import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from .config import get_settings
from .models import Candle, MarketRegime

settings = get_settings()


class ExchangeDegradationError(RuntimeError):
    pass


class ConnectorState:
    def __init__(self) -> None:
        self.is_healthy: bool = True
        self.last_latency_ms: float = 0.0
        self.last_error: str | None = None
        self.reconnect_count: int = 0
        self.last_heartbeat: datetime | None = None

    def degrade(self, error: str) -> None:
        self.is_healthy = False
        self.last_error = error

    def recover(self, latency_ms: float | None = None) -> None:
        self.is_healthy = True
        self.last_error = None
        self.last_heartbeat = datetime.now(UTC)
        if latency_ms is not None:
            self.last_latency_ms = latency_ms


connector_state = ConnectorState()


def _seed_for(dataset_id: str, seed: int) -> int:
    material = f"{dataset_id}:{seed}".encode()
    return int(hashlib.sha256(material).hexdigest()[:16], 16)


def _regime_for_index(index: int, length: int, rng: random.Random) -> MarketRegime:
    third = max(length // 3, 1)
    segment = min(index // third, 2)
    if segment == 0:
        return "bull"
    if segment == 1:
        return "chop"
    if rng.random() > 0.45:
        return "bear"
    return "chop"


def generate_sample_candles(length: int = 180, dataset_id: str = "synthetic", seed: int = 42) -> list[Candle]:
    candles: list[Candle] = []
    rng = random.Random(_seed_for(dataset_id, seed))
    start = datetime(2026, 1, 1, tzinfo=UTC)
    price = 100.0 + rng.uniform(-3.0, 3.0)

    for index in range(length):
        regime = _regime_for_index(index, length, rng)
        drift = {"bull": 0.28, "bear": -0.24, "chop": 0.03}[regime]
        cycle = math.sin(index / 8) * 1.8
        pullback = math.cos(index / 17) * 0.9
        noise = rng.uniform(-1.5, 1.5)
        close = max(1.0, price + drift + cycle + pullback + noise)
        open_price = price
        high = max(open_price, close) + abs(rng.uniform(0.4, 1.6))
        low = min(open_price, close) - abs(rng.uniform(0.4, 1.4))
        volume = 900 + rng.randint(0, 180) + (index % 24) * 15
        candles.append(
            Candle(
                timestamp=start + timedelta(minutes=index),
                open=round(open_price, 4),
                high=round(high, 4),
                low=round(low, 4),
                close=round(close, 4),
                volume=float(volume),
                regime=regime,
            )
        )
        price = close

    return candles


def _fetch_json(url: str, params: dict[str, Any]) -> Any:
    start = time.perf_counter()
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        latency_ms = (time.perf_counter() - start) * 1000
        connector_state.recover(latency_ms)
        return response.json()


def get_historical_candles(symbol: str, interval: str, limit: int) -> list[Candle]:
    url = f"{settings.binance_testnet_base_url}/api/v3/klines"
    params = {"symbol": symbol, "interval": interval, "limit": limit}

    try:
        rows = _fetch_json(url, params)
        candles: list[Candle] = []
        for index, row in enumerate(rows):
            regime = _regime_for_index(index, max(len(rows), 1), random.Random(index + 7))
            candles.append(
                Candle(
                    timestamp=datetime.fromtimestamp(row[0] / 1000, tz=UTC),
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=float(row[5]),
                    regime=regime,
                )
            )
        if not candles:
            raise ExchangeDegradationError("No candles returned by exchange.")
        return candles
    except Exception as exc:
        connector_state.degrade(str(exc))
        connector_state.reconnect_count += 1
        return generate_sample_candles(limit, dataset_id=f"{symbol}:{interval}", seed=limit)


def get_ticker(symbol: str) -> dict[str, Any]:
    url = f"{settings.binance_testnet_base_url}/api/v3/ticker/24hr"
    params = {"symbol": symbol}
    try:
        return _fetch_json(url, params)
    except Exception as exc:
        connector_state.degrade(str(exc))
        connector_state.reconnect_count += 1
        raise ExchangeDegradationError(f"Failed to fetch ticker: {exc}") from exc


def get_depth(symbol: str, limit: int = 100) -> dict[str, Any]:
    url = f"{settings.binance_testnet_base_url}/api/v3/depth"
    params = {"symbol": symbol, "limit": limit}
    try:
        return _fetch_json(url, params)
    except Exception as exc:
        connector_state.degrade(str(exc))
        connector_state.reconnect_count += 1
        raise ExchangeDegradationError(f"Failed to fetch depth: {exc}") from exc
