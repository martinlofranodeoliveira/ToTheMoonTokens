from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .backtesting import run_backtest
from .config import get_settings
from .guards import connector_status, evaluate_guardrails
from .models import BacktestRequest, DashboardResponse
from .observability import (
    LIVE_ARM_ATTEMPTS_TOTAL,
    PrometheusMiddleware,
    configure_logging,
    get_logger,
    metrics_response,
)
from .strategies import strategy_catalog


configure_logging()
log = get_logger(__name__)

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(PrometheusMiddleware)


def _default_metrics():
    request = BacktestRequest(
        symbol=settings.default_symbol,
        timeframe=settings.default_timeframe,
        fee_bps=settings.default_fee_bps,
        slippage_bps=settings.default_slippage_bps,
    )
    return run_backtest(request, settings.max_position_size_pct)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "app": settings.app_name,
        "mode": settings.runtime_mode,
        "exchange": settings.default_exchange,
        "liveTradingEnabled": settings.enable_live_trading,
    }


@app.get("/metrics")
def metrics():
    return metrics_response()


@app.get("/api/strategies")
def list_strategies():
    return strategy_catalog()


@app.post("/api/backtests/run")
def create_backtest(request: BacktestRequest):
    return run_backtest(request, settings.max_position_size_pct)


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard():
    return DashboardResponse(
        app_name=settings.app_name,
        runtime_mode=settings.runtime_mode,
        strategies=strategy_catalog(),
        metrics=_default_metrics(),
        guardrails=evaluate_guardrails(settings),
        connectors=connector_status(settings),
    )


@app.post("/api/live/arm")
def arm_testnet_live_mode():
    guardrails = evaluate_guardrails(settings)
    if not guardrails.can_submit_testnet_orders:
        LIVE_ARM_ATTEMPTS_TOTAL.labels(allowed="false").inc()
        log.warning(
            "live_arm_denied",
            runtime_mode=settings.runtime_mode,
            reasons=guardrails.reasons,
        )
        raise HTTPException(status_code=423, detail=guardrails.model_dump())

    LIVE_ARM_ATTEMPTS_TOTAL.labels(allowed="true").inc()
    log.info("live_arm_allowed", runtime_mode=settings.runtime_mode)
    return {
        "ok": True,
        "message": "Runtime elegivel apenas para testnet guarded mode.",
        "guardrails": guardrails.model_dump(),
    }
