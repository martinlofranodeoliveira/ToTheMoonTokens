from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator

StrategyId = Literal["ema_crossover", "breakout", "mean_reversion"]


class Candle(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class StrategyDescriptor(BaseModel):
    id: StrategyId
    name: str
    description: str
    market_regime: str


class BacktestRequest(BaseModel):
    strategy_id: StrategyId = "ema_crossover"
    symbol: str = "BTCUSDT"
    timeframe: str = "1m"
    lookback_bars: int = Field(default=180, ge=60, le=1000)
    initial_capital: float = Field(default=10_000, gt=0)
    position_size_pct: float = Field(default=25, gt=0, le=100)
    fee_bps: float = Field(default=10, ge=0, le=100)
    slippage_bps: float = Field(default=5, ge=0, le=100)


class BacktestMetrics(BaseModel):
    initial_capital: float
    ending_equity: float
    net_profit: float
    total_return_pct: float
    max_drawdown_pct: float
    trade_count: int
    win_rate_pct: float
    profit_factor: float
    edge_status: Literal["positive", "flat", "negative"]


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


class AggregateBucket(BaseModel):
    total_trades: int
    total_pnl: float
    win_rate_pct: float
    average_drawdown: float


class PaperTradeRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    strategy_id: str
    symbol: str
    timeframe: str
    entry_time: datetime
    exit_time: datetime | None = None
    entry_price: float = Field(gt=0)
    exit_price: float | None = Field(default=None, gt=0)
    position_size: float = Field(gt=0)
    direction: Literal["long", "short"] = Field(
        validation_alias=AliasChoices("direction", "side"),
        serialization_alias="direction",
    )
    risk_taken: float = Field(ge=0)
    setup_reason: str
    market_regime: str
    pnl: float | None = None
    mae: float | None = Field(default=None, ge=0)
    mfe: float | None = Field(default=None, ge=0)
    drawdown: float | None = Field(default=None, ge=0)
    time_in_trade_seconds: int | None = Field(default=None, ge=0)
    outcome: Literal["win", "loss", "breakeven", "open"] = "open"
    status: Literal["open", "closed"] = "open"

    @model_validator(mode="after")
    def infer_status_and_outcome(self) -> PaperTradeRecord:
        if self.status == "open" and (
            self.exit_time is not None
            or self.exit_price is not None
            or self.pnl is not None
            or self.outcome != "open"
        ):
            self.status = "closed"

        if self.status == "closed" and self.outcome == "open" and self.pnl is not None:
            if self.pnl > 0:
                self.outcome = "win"
            elif self.pnl < 0:
                self.outcome = "loss"
            else:
                self.outcome = "breakeven"

        return self


JournalEntry = PaperTradeRecord


class PerformanceAggregates(BaseModel):
    total_trades: int
    total_pnl: float
    win_rate_pct: float
    average_drawdown: float
    by_strategy: dict[str, AggregateBucket] = Field(default_factory=dict)
    by_symbol: dict[str, AggregateBucket] = Field(default_factory=dict)
    by_timeframe: dict[str, AggregateBucket] = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    app_name: str
    runtime_mode: str
    strategies: list[StrategyDescriptor]
    metrics: BacktestMetrics
    guardrails: GuardrailStatus
    connectors: ConnectorStatus
    recent_trades: list[PaperTradeRecord] = Field(default_factory=list)
    performance: PerformanceAggregates | None = None
