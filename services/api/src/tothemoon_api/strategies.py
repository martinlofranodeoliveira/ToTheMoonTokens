from __future__ import annotations

import math

from .models import Candle, StrategyDescriptor, StrategyId

STRATEGIES: list[StrategyDescriptor] = [
    StrategyDescriptor(
        id="ema_crossover",
        name="EMA Crossover",
        description="Segue tendencia quando a media curta cruza acima da longa.",
        market_regime="trend",
        risk_tier="low",
    ),
    StrategyDescriptor(
        id="breakout",
        name="Breakout Range",
        description="Compra rompimento de maxima recente e sai na perda de estrutura.",
        market_regime="expansion",
        risk_tier="medium",
    ),
    StrategyDescriptor(
        id="mean_reversion",
        name="Mean Reversion",
        description="Compra desvios negativos contra uma media curta em mercado lateral.",
        market_regime="range",
        risk_tier="medium",
    ),
    StrategyDescriptor(
        id="agentic",
        name="Agentic Strategy",
        description="Estrategia orientada por agentes.",
        market_regime="trend",
        risk_tier="medium",
    ),
]


def strategy_catalog() -> list[StrategyDescriptor]:
    return STRATEGIES


def _ema(values: list[float], period: int) -> list[float]:
    multiplier = 2 / (period + 1)
    result: list[float] = []
    current = values[0]
    for value in values:
        current = (value - current) * multiplier + current
        result.append(current)
    return result


def build_signals(strategy_id: StrategyId, candles: list[Candle]) -> list[str]:
    closes = [candle.close for candle in candles]
    signals = ["hold"] * len(candles)

    if strategy_id == "ema_crossover":
        fast = _ema(closes, 9)
        slow = _ema(closes, 21)
        for index in range(21, len(candles)):
            if fast[index] > slow[index] * 1.001:
                signals[index] = "buy"
            elif fast[index] < slow[index] * 0.999:
                signals[index] = "sell"
        return signals

    if strategy_id == "breakout":
        for index in range(20, len(candles)):
            prior_high = max(candle.high for candle in candles[index - 20 : index])
            prior_low = min(candle.low for candle in candles[index - 10 : index])
            if candles[index].close > prior_high:
                signals[index] = "buy"
            elif candles[index].close < prior_low:
                signals[index] = "sell"
        return signals

    if strategy_id == "agentic":
        for index in range(len(candles)):
            if candles[index].regime == "bull":
                signals[index] = "buy"
            elif candles[index].regime == "bear":
                signals[index] = "sell"
        return signals

    for index in range(20, len(candles)):
        window = closes[index - 20 : index]
        mean = sum(window) / len(window)
        variance = sum((value - mean) ** 2 for value in window) / len(window)
        stddev = math.sqrt(variance) or 1.0
        zscore = (closes[index] - mean) / stddev
        if zscore < -1.2:
            signals[index] = "buy"
        elif zscore > 0.6:
            signals[index] = "sell"

    return signals
