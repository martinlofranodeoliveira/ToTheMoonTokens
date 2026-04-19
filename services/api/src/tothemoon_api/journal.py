from __future__ import annotations

import uuid

from .models import PaperTradeRecord, PerformanceAggregates

_journal: list[PaperTradeRecord] = []


def record_trade(trade: PaperTradeRecord) -> PaperTradeRecord:
    if not trade.id:
        trade.id = str(uuid.uuid4())
    _journal.append(trade)
    return trade


def get_journal() -> list[PaperTradeRecord]:
    return list(_journal)


def get_performance_aggregates(
    strategy_id: str | None = None,
    symbol: str | None = None,
    timeframe: str | None = None,
) -> PerformanceAggregates:
    closed_trades = [trade for trade in _journal if trade.outcome != "open"]

    if strategy_id:
        closed_trades = [trade for trade in closed_trades if trade.strategy_id == strategy_id]
    if symbol:
        closed_trades = [trade for trade in closed_trades if trade.symbol == symbol]
    if timeframe:
        closed_trades = [trade for trade in closed_trades if trade.timeframe == timeframe]

    total_trades = len(closed_trades)
    wins = len([trade for trade in closed_trades if trade.outcome == "win"])
    win_rate = (wins / total_trades) if total_trades > 0 else 0.0

    total_pnl = sum(trade.pnl for trade in closed_trades if trade.pnl is not None)
    gross_wins = sum(trade.pnl for trade in closed_trades if trade.pnl is not None and trade.pnl > 0)
    gross_losses = sum(
        abs(trade.pnl) for trade in closed_trades if trade.pnl is not None and trade.pnl < 0
    )
    profit_factor = (
        (gross_wins / gross_losses)
        if gross_losses > 0
        else (gross_wins if gross_wins > 0 else 0.0)
    )

    outcomes_by_regime: dict[str, dict[str, int]] = {}
    for trade in closed_trades:
        outcomes_by_regime.setdefault(trade.regime, {"win": 0, "loss": 0, "breakeven": 0})
        outcomes_by_regime[trade.regime][trade.outcome] += 1

    return PerformanceAggregates(
        total_trades=total_trades,
        win_rate=win_rate,
        profit_factor=profit_factor,
        total_pnl=total_pnl,
        outcomes_by_regime=outcomes_by_regime,
    )


def clear_journal() -> None:
    _journal.clear()
