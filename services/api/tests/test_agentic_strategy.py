from datetime import datetime, timezone
from tothemoon_api.models import Candle
from tothemoon_api.strategies import build_signals

def test_agentic_strategy_signals():
    candles = [
        Candle(timestamp=datetime.now(timezone.utc), open=100, high=101, low=99, close=100, volume=10, regime="bull"),
        Candle(timestamp=datetime.now(timezone.utc), open=100, high=101, low=99, close=100, volume=10, regime="bear"),
        Candle(timestamp=datetime.now(timezone.utc), open=100, high=101, low=99, close=100, volume=10, regime="chop"),
    ]
    
    signals = build_signals("agentic", candles)
    
    assert signals == ["buy", "sell", "hold"]
