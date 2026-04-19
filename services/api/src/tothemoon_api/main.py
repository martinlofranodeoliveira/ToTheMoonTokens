from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from .backtesting import run_backtest, run_walk_forward
from .config import get_settings
from .guards import connector_status, evaluate_guardrails
from .journal import get_journal, get_performance_aggregates, record_trade
from .market_data import ExchangeDegradationError, connector_state, get_depth, get_ticker
from .models import (
    ArmRequest,
    BacktestRequest,
    DashboardResponse,
    Horizon,
    NewsCategory,
    NewsIngestRequest,
    PaperTradeRecord,
    ProbabilityChecklist,
    ScalpValidationRequest,
    ValidationResult,
    WalkForwardRequest,
)
from .news import check_news_risk_filter, get_recent_news, ingest_news
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
from .scalp import validate_scalp_setup
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
        risk_tier="low",
        checklist=ProbabilityChecklist(
            trend_alignment=True,
            momentum_confirm=True,
            volume_expansion=True,
            key_level_rejection=True,
            no_upcoming_news=True,
        ),
    )
    return run_backtest(request, settings.max_position_size_pct)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": connector_state.is_healthy,
        "app": settings.app_name,
        "mode": settings.runtime_mode,
        "exchange": settings.default_exchange,
        "liveTradingEnabled": settings.enable_live_trading,
        "latency_ms": connector_state.last_latency_ms,
        "reconnect_count": connector_state.reconnect_count,
        "last_error": connector_state.last_error,
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


@app.post("/api/backtests/walk-forward")
def create_walk_forward(request: WalkForwardRequest, http_request: Request):
    limited = enforce_rate_limit(
        http_request,
        limit=settings.rate_limit_backtest_per_minute,
        window_seconds=60,
    )
    if limited is not None:
        return limited
    return run_walk_forward(request, settings.max_position_size_pct)


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard():
    return DashboardResponse(
        app_name=settings.app_name,
        runtime_mode=settings.runtime_mode,
        strategies=strategy_catalog(),
        metrics=_default_metrics(),
        guardrails=evaluate_guardrails(settings),
        connectors=connector_status(settings),
        journal_performance=get_performance_aggregates(),
    )


@app.post("/api/live/arm")
def arm_testnet_live_mode(http_request: Request, request: ArmRequest | None = None):
    limited = enforce_rate_limit(
        http_request,
        limit=settings.rate_limit_live_arm_per_minute,
        window_seconds=60,
    )
    if limited is not None:
        return limited

    risk_tier = request.risk_tier if request else "low"
    guardrails = evaluate_guardrails(settings, risk_tier=risk_tier)
    if not guardrails.can_submit_testnet_orders:
        LIVE_ARM_ATTEMPTS_TOTAL.labels(allowed="false").inc()
        if risk_tier == "high":
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "High-risk profiles remain research-only until explicit human approval exists.",
                    "risk_tier": risk_tier,
                    "guardrails": guardrails.model_dump(),
                },
            )
        raise HTTPException(status_code=423, detail=guardrails.model_dump())

    LIVE_ARM_ATTEMPTS_TOTAL.labels(allowed="true").inc()
    log.info("live_arm_allowed", runtime_mode=settings.runtime_mode, risk_tier=risk_tier)
    return {
        "ok": True,
        "message": "Runtime elegivel apenas para testnet guarded mode.",
        "tier": risk_tier,
        "guardrails": guardrails.model_dump(),
    }


@app.get("/api/journal/trades", response_model=list[PaperTradeRecord])
def list_journal_trades():
    return get_journal()


@app.post("/api/journal/trades", response_model=PaperTradeRecord)
def add_journal_trade(trade: PaperTradeRecord):
    return record_trade(trade)


@app.get("/api/journal/performance")
def get_journal_performance(
    strategy_id: str | None = None,
    symbol: str | None = None,
    timeframe: str | None = None,
):
    return get_performance_aggregates(
        strategy_id=strategy_id,
        symbol=symbol,
        timeframe=timeframe,
    )


@app.post("/api/news/ingest")
def api_ingest_news(request: NewsIngestRequest):
    item = ingest_news(request)
    if not item:
        return {"status": "ignored", "reason": "duplicate"}
    return {"status": "ingested", "item": item}


@app.get("/api/news")
def api_get_news(
    limit: int = Query(default=50, ge=1, le=200),
    horizon: Horizon | None = None,
    category: NewsCategory | None = None,
):
    return get_recent_news(limit=limit, horizon=horizon, category=category)


@app.get("/api/news/risk")
def api_news_risk(symbol: str = "BTCUSDT"):
    return check_news_risk_filter(symbol)


@app.post("/api/scalp/validate", response_model=ValidationResult)
def validate_scalp(request: ScalpValidationRequest):
    return validate_scalp_setup(request.setup, request.context)


@app.get("/api/market/ticker")
def api_get_ticker(symbol: str = "BTCUSDT"):
    try:
        return get_ticker(symbol)
    except ExchangeDegradationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/market/depth")
def api_get_depth(symbol: str = "BTCUSDT", limit: int = Query(default=20, ge=5, le=100)):
    try:
        return get_depth(symbol, limit=limit)
    except ExchangeDegradationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
