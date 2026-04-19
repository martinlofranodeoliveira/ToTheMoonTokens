from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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


class DashboardResponse(BaseModel):
    app_name: str
    runtime_mode: str
    strategies: list[StrategyDescriptor]
    metrics: BacktestMetrics
    guardrails: GuardrailStatus
    connectors: ConnectorStatus

