from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

StrategyId = Literal["ema_crossover", "breakout", "mean_reversion"]
RiskTier = Literal["low", "medium", "high"]
Horizon = Literal["short", "medium", "long"]
NewsCategory = Literal[
    "regulatory",
    "macro",
    "exchange-specific",
    "asset-specific",
    "general",
]
MarketRegime = Literal["bull", "bear", "chop"]


class RiskProfile(BaseModel):
    tier: RiskTier
    max_position_size_pct: float
    max_daily_loss_pct: float
    requires_confirmation: bool
    min_probability_score: int


class ProbabilityChecklist(BaseModel):
    trend_alignment: bool = False
    momentum_confirm: bool = False
    volume_expansion: bool = False
    key_level_rejection: bool = False
    no_upcoming_news: bool = False


class ArmRequest(BaseModel):
    risk_tier: RiskTier = "low"


class Candle(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    regime: MarketRegime = "chop"


class StrategyDescriptor(BaseModel):
    id: StrategyId
    name: str
    description: str
    market_regime: str
    risk_tier: RiskTier = "medium"


class BacktestRequest(BaseModel):
    strategy_id: StrategyId = "ema_crossover"
    symbol: str = "BTCUSDT"
    timeframe: str = "1m"
    lookback_bars: int = Field(default=180, ge=60, le=1000)
    initial_capital: float = Field(default=10_000, gt=0)
    position_size_pct: float = Field(default=25, gt=0, le=100)
    fee_bps: float = Field(default=10, ge=0, le=100)
    slippage_bps: float = Field(default=5, ge=0, le=100)
    dataset_id: str = "synthetic"
    seed: int = 42
    risk_tier: RiskTier = "medium"
    checklist: ProbabilityChecklist | None = None


class WalkForwardRequest(BacktestRequest):
    train_split_pct: float = Field(default=70, gt=0, lt=100)


class BacktestMetrics(BaseModel):
    strategy_id: StrategyId | None = None
    timeframe: str | None = None
    risk_tier: RiskTier | None = None
    initial_capital: float
    ending_equity: float
    net_profit: float
    total_return_pct: float
    max_drawdown_pct: float
    trade_count: int
    win_rate_pct: float
    profit_factor: float
    edge_status: Literal["positive", "flat", "negative"]
    expectancy: float = 0.0
    payoff_ratio: float = 0.0
    max_consecutive_wins: int = 0
    max_consecutive_losses: int = 0
    checklist_score: int = 0
    regime_metrics: dict[str, dict[str, float]] = Field(default_factory=dict)
    is_setup_blocked: bool = False
    block_reasons: list[str] = Field(default_factory=list)


class WalkForwardResult(BaseModel):
    train_metrics: BacktestMetrics
    validation_metrics: BacktestMetrics


class GuardrailStatus(BaseModel):
    mode: str
    can_submit_testnet_orders: bool
    can_submit_mainnet_orders: bool
    requires_manual_wallet_signature: bool
    reasons: list[str]


class ConnectorStatus(BaseModel):
    exchange: str
    wallet_mode: str
    binance_base_url: str
    user_stream_url: str
    metamask_ready: bool
    latency_ms: float | None = None
    reconnect_count: int = 0
    last_error: str | None = None


class PaperTradeEntry(BaseModel):
    timestamp: datetime
    price: float
    size: float
    reason: str
    risk_assumed: float


class PaperTradeExit(BaseModel):
    timestamp: datetime
    price: float
    reason: str


class PaperTradeRecord(BaseModel):
    id: str | None = None
    strategy_id: str
    symbol: str
    timeframe: str
    regime: str
    entry: PaperTradeEntry
    exit: PaperTradeExit | None = None
    pnl: float | None = None
    mae: float | None = None
    mfe: float | None = None
    drawdown: float | None = None
    time_in_trade_ms: int | None = None
    outcome: Literal["win", "loss", "breakeven", "open"] = "open"


class PerformanceAggregates(BaseModel):
    total_trades: int
    win_rate: float
    profit_factor: float
    total_pnl: float
    outcomes_by_regime: dict[str, dict[str, int]]


class DashboardResponse(BaseModel):
    app_name: str
    runtime_mode: str
    strategies: list[StrategyDescriptor]
    metrics: BacktestMetrics
    guardrails: GuardrailStatus
    connectors: ConnectorStatus
    journal_performance: PerformanceAggregates | None = None


class NewsItem(BaseModel):
    id: str
    headline: str
    timestamp: datetime
    horizon: Horizon
    category: NewsCategory
    impact_score: int = Field(ge=1, le=10)
    justification: str


class NewsIngestRequest(BaseModel):
    headline: str
    timestamp: datetime
    source: str
    body: str | None = None


class MarketContext(BaseModel):
    timeframe: str
    regime: Literal["trend", "range", "expansion"]
    has_high_impact_news: bool
    extreme_volatility: bool
    trend_aligned: bool
    volume_above_baseline: bool
    at_support_or_resistance: bool
    spread_bps: float
    slippage_bps: float


class ScalpSetup(BaseModel):
    symbol: str
    entry_price: float
    stop_loss: float
    target_price: float
    strategy_limit_bps: float = 10.0
    risk_tier: RiskTier = "low"


class ValidationResult(BaseModel):
    is_eligible: bool
    reasons: list[str]


class ScalpValidationRequest(BaseModel):
    setup: ScalpSetup
    context: MarketContext
