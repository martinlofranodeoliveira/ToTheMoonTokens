from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import tothemoon_api.main as main_module
from tothemoon_api.observability import rate_limiter

client = TestClient(main_module.app)


def setup_function() -> None:
    rate_limiter.reset()


@pytest.mark.test_id("QA-ERR-001")
def test_live_arm_rate_limiter_returns_429_after_budget_exhausted():
    limit = main_module.settings.rate_limit_live_arm_per_minute
    for _ in range(limit):
        response = client.post("/api/live/arm")
        # Each call is denied at 423 because no approval token is set;
        # the important invariant is that the rate limiter is NOT yet firing.
        assert response.status_code == 423

    # One more request should cross the budget and be rejected with 429.
    over = client.post("/api/live/arm")
    assert over.status_code == 429
    payload = over.json()
    assert payload["error"] == "rate_limited"
    assert int(over.headers["retry-after"]) >= 1


def test_backtest_rate_limiter_uses_independent_bucket():
    body = {
        "strategy_id": "ema_crossover",
        "lookback_bars": 100,
        "initial_capital": 5000,
        "position_size_pct": 10,
        "fee_bps": 5,
        "slippage_bps": 3,
    }
    # Exhaust the live-arm budget so we confirm the backtest path doesn't
    # share a counter with it.
    for _ in range(main_module.settings.rate_limit_live_arm_per_minute + 1):
        client.post("/api/live/arm")

    response = client.post("/api/backtests/run", json=body)
    assert response.status_code == 200


def test_rate_limiter_resets_after_reset_hook():
    for _ in range(main_module.settings.rate_limit_live_arm_per_minute + 1):
        client.post("/api/live/arm")
    rate_limiter.reset()
    response = client.post("/api/live/arm")
    # Back to the guardrail denial, not a 429, which proves the bucket cleared.
    assert response.status_code == 423


def test_rate_limit_rejections_are_counted_in_metrics():
    for _ in range(main_module.settings.rate_limit_live_arm_per_minute + 2):
        client.post("/api/live/arm")
    response = client.get("/metrics")
    assert "rate_limit_rejections_total" in response.text
