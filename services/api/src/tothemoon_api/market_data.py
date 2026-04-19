from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

from .models import Candle


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

