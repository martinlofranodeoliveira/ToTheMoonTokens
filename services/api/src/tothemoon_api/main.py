from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from .arc_mcp import mcp as arc_mcp
from .backtesting import RISK_PROFILES, run_backtest, run_walk_forward
from .config import get_settings
from .guards import connector_status, evaluate_guardrails
from .journal import (
    clear_journal,
    get_journal,
    get_performance_aggregate,
    get_performance_aggregates,
    get_recent_trades,
    record_trade,
)
from .market_data import (
    BinanceMarketData,
    ExchangeDegradationError,
    connector_state,
    get_depth,
    get_ticker,
)
from .models import (
    BacktestRequest,
    Candle,
    DashboardResponse,
    Horizon,
    NewsCategory,
    NewsIngestRequest,
    PaperTradeRecord,
    PerformanceAggregates,
    ProbabilityChecklist,
    ScalpValidationRequest,
    ValidationResult,
    WalkForwardRequest,
)
from .news import check_news_risk_filter, get_recent_news, ingest_news
from .observability import (
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
        "Hackathon artifact API for research evidence, journal data, and safe market context. "
        "Order submission is permanently blocked by policy."
    ),
)

app.mount("/mcp", arc_mcp.sse_app())

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
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
        strategy_id="mean_reversion",
        symbol=settings.default_symbol,
        timeframe=settings.default_timeframe,
        lookback_bars=240,
        fee_bps=settings.default_fee_bps,
        slippage_bps=settings.default_slippage_bps,
        dataset_id="binance_testnet",
        risk_tier="medium",
        checklist=ProbabilityChecklist(
            trend_alignment=False,
            momentum_confirm=True,
            volume_expansion=False,
            key_level_rejection=True,
            no_upcoming_news=True,
        ),
    )
    return run_backtest(request, settings.max_position_size_pct)


def _dashboard_research_snapshots():
    snapshots = []
    for descriptor in strategy_catalog():
        risk_profile = RISK_PROFILES[descriptor.risk_tier]
        request = BacktestRequest(
            strategy_id=descriptor.id,
            symbol=settings.default_symbol,
            timeframe=settings.default_timeframe,
            lookback_bars=240,
            fee_bps=settings.default_fee_bps,
            slippage_bps=settings.default_slippage_bps,
            dataset_id="binance_testnet",
            risk_tier=descriptor.risk_tier,
            position_size_pct=risk_profile.max_position_size_pct,
            checklist=ProbabilityChecklist(
                trend_alignment=descriptor.id != "mean_reversion",
                momentum_confirm=True,
                volume_expansion=descriptor.id != "mean_reversion",
                key_level_rejection=True,
                no_upcoming_news=True,
            ),
        )
        snapshots.append(run_backtest(request, settings.max_position_size_pct))
    return snapshots


def _market_connector() -> BinanceMarketData:
    return BinanceMarketData(
        base_url=settings.binance_testnet_base_url,
        ws_url=settings.binance_user_data_stream_url,
    )


@app.get("/health")
def health() -> dict[str, object]:
    status = "online" if connector_state.is_healthy else "degraded"
    return {
        "ok": True,
        "app": settings.app_name,
        "mode": settings.runtime_mode,
        "exchange": settings.default_exchange,
        "orderSubmissionEnabled": False,
        "latency_ms": connector_state.last_latency_ms,
        "reconnect_count": connector_state.reconnect_count,
        "last_error": connector_state.last_error,
        "market_connector": {
            "status": status,
            "latency_ms": connector_state.last_latency_ms,
            "last_error": connector_state.last_error,
            "sample_count": 0,
        },
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
    performance = get_performance_aggregate()
    return DashboardResponse(
        app_name=settings.app_name,
        runtime_mode=settings.runtime_mode,
        strategies=strategy_catalog(),
        metrics=_default_metrics(),
        research_snapshots=_dashboard_research_snapshots(),
        guardrails=evaluate_guardrails(settings),
        connectors=connector_status(settings),
        runtime_status=None,
        recent_trades=get_recent_trades(limit=8),
        performance=performance,
        journal_performance=performance,
    )


@app.get("/api/market/health")
def get_market_health() -> dict[str, object]:
    return _market_connector().ping()


@app.get("/api/market/klines", response_model=list[Candle])
def get_market_klines(
    symbol: str | None = None,
    interval: str | None = None,
    limit: int = 180,
):
    connector = _market_connector()
    return connector.fetch_klines(
        symbol or settings.default_symbol,
        interval or settings.default_timeframe,
        limit=max(1, min(limit, 1000)),
    )


@app.get("/api/market/stream-preview")
def get_market_stream_preview(
    stream_name: str = "btcusdt@trade",
    max_messages: int = 1,
) -> dict[str, object]:
    connector = _market_connector()
    messages = connector.listen_stream(
        stream_name=stream_name,
        max_messages=max(1, min(max_messages, 3)),
    )
    return {
        "ok": True,
        "stream": stream_name,
        "message_count": len(messages),
        "messages": messages,
        "status": connector.operational_status,
    }


@app.get("/api/journal/trades", response_model=list[PaperTradeRecord])
def list_journal_trades():
    return get_journal()


@app.post("/api/journal/trades", response_model=PaperTradeRecord)
def add_journal_trade(trade: PaperTradeRecord):
    return record_trade(trade)


@app.get("/api/journal/performance", response_model=PerformanceAggregates)
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


@app.post("/api/paper/journal", response_model=PaperTradeRecord)
def create_paper_journal_entry(record: PaperTradeRecord) -> PaperTradeRecord:
    return record_trade(record)


@app.get("/api/paper/journal", response_model=list[PaperTradeRecord])
def list_paper_journal(limit: int = 20) -> list[PaperTradeRecord]:
    return get_journal(limit=max(1, min(limit, 200)))


@app.delete("/api/paper/journal")
def delete_paper_journal() -> dict[str, object]:
    clear_journal()
    return {"ok": True, "message": "Paper trading journal cleared."}


@app.get("/api/paper/performance", response_model=PerformanceAggregates)
def get_paper_performance() -> PerformanceAggregates:
    return get_performance_aggregate()


@app.post("/api/journal/entries", response_model=PaperTradeRecord)
def create_journal_entry_alias(record: PaperTradeRecord) -> PaperTradeRecord:
    return create_paper_journal_entry(record)


@app.get("/api/journal/entries", response_model=list[PaperTradeRecord])
def list_journal_entries_alias(limit: int = 20) -> list[PaperTradeRecord]:
    return list_paper_journal(limit=limit)


@app.delete("/api/journal/entries")
def delete_journal_entries_alias() -> dict[str, object]:
    return delete_paper_journal()


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
