from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .backtesting import run_backtest
from .config import get_settings
from .guards import connector_status, evaluate_guardrails
from .journal import add_trade, clear_trades, get_performance_aggregate, get_recent_trades
from .market_data import BinanceMarketData, MarketDataError
from .models import (
    BacktestRequest,
    Candle,
    DashboardResponse,
    PaperTradeRecord,
    PerformanceAggregates,
)
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


def _market_connector() -> BinanceMarketData:
    return BinanceMarketData(
        base_url=settings.binance_testnet_base_url,
        ws_url=settings.binance_user_data_stream_url,
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "app": settings.app_name,
        "mode": settings.runtime_mode,
        "exchange": settings.default_exchange,
        "liveTradingEnabled": settings.enable_live_trading,
        "market_connector": {
            "status": "unknown",
            "latency_ms": 0.0,
            "last_error": None,
            "last_stream": None,
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


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard():
    return DashboardResponse(
        app_name=settings.app_name,
        runtime_mode=settings.runtime_mode,
        strategies=strategy_catalog(),
        metrics=_default_metrics(),
        guardrails=evaluate_guardrails(settings),
        connectors=connector_status(settings),
        recent_trades=get_recent_trades(limit=8),
        performance=get_performance_aggregate(),
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


@app.get("/api/market/ticker")
def get_market_ticker(symbol: str | None = None) -> dict[str, object]:
    connector = _market_connector()
    try:
        return connector.fetch_ticker(symbol or settings.default_symbol)
    except MarketDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/market/depth")
def get_market_depth(symbol: str | None = None, limit: int = 5) -> dict[str, object]:
    connector = _market_connector()
    try:
        return connector.fetch_depth(
            symbol or settings.default_symbol, limit=max(1, min(limit, 100))
        )
    except MarketDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/market/stream-preview")
def get_market_stream_preview(
    stream_name: str = "btcusdt@trade",
    max_messages: int = 1,
) -> dict[str, object]:
    connector = _market_connector()
    messages = connector.listen_stream(
        stream_name=stream_name, max_messages=max(1, min(max_messages, 3))
    )
    return {
        "ok": True,
        "stream": stream_name,
        "message_count": len(messages),
        "messages": messages,
        "status": connector.operational_status,
    }


@app.post("/api/paper/journal", response_model=PaperTradeRecord)
def create_paper_journal_entry(record: PaperTradeRecord) -> PaperTradeRecord:
    return add_trade(record)


@app.get("/api/paper/journal", response_model=list[PaperTradeRecord])
def list_paper_journal(limit: int = 20) -> list[PaperTradeRecord]:
    return get_recent_trades(limit=max(1, min(limit, 200)))


@app.delete("/api/paper/journal")
def delete_paper_journal() -> dict[str, object]:
    clear_trades()
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


@app.get("/api/journal/performance", response_model=PerformanceAggregates)
def get_journal_performance_alias() -> PerformanceAggregates:
    return get_paper_performance()


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
