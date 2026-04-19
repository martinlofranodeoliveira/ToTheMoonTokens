from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .backtesting import run_backtest
from .config import get_settings
from .guards import connector_status, evaluate_guardrails
from .models import BacktestRequest, DashboardResponse
from .observability import (
    LIVE_ARM_ATTEMPTS_TOTAL,
    PrometheusMiddleware,
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
    configure_logging,
    enforce_rate_limit,
    get_logger,
    metrics_response,
)
from .strategies import strategy_catalog


configure_logging()
log = get_logger(__name__)

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Research and paper-trading API. Mainnet trading is permanently blocked "
        "by policy. See docs/TRADING_GUARDRAILS.md."
    ),
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

log.info(
    "api_startup",
    app_env=settings.app_env,
    runtime_mode=settings.runtime_mode,
    cors_origins=settings.cors_allowed_origins,
    exchange=settings.default_exchange,
)


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


@app.get("/ready")
def ready() -> dict[str, object]:
    checks: dict[str, bool] = {
        "settings_valid": True,
        "strategies_loaded": len(strategy_catalog()) > 0,
        "mainnet_permanently_blocked": not evaluate_guardrails(settings).can_submit_mainnet_orders,
    }
    ok = all(checks.values())
    if not ok:
        log.error("readiness_failed", checks=checks)
        raise HTTPException(status_code=503, detail={"ok": False, "checks": checks})
    return {"ok": True, "checks": checks, "mode": settings.runtime_mode}


@app.get("/metrics")
def metrics():
    return metrics_response()


@app.get("/api/strategies")
def list_strategies():
    return strategy_catalog()


@app.post("/api/backtests/run")
def create_backtest(request: BacktestRequest, http_request: Request):
    limited = enforce_rate_limit(
        http_request,
        limit=settings.rate_limit_backtest_per_minute,
        window_seconds=60,
    )
    if limited is not None:
        return limited
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
def arm_testnet_live_mode(http_request: Request):
    limited = enforce_rate_limit(
        http_request,
        limit=settings.rate_limit_live_arm_per_minute,
        window_seconds=60,
    )
    if limited is not None:
        return limited

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
