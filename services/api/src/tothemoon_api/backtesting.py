from __future__ import annotations

from .market_data import generate_sample_candles
from .models import BacktestMetrics, BacktestRequest
from .strategies import build_signals


def _safe_pct(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return (numerator / denominator) * 100


def run_backtest(request: BacktestRequest, max_position_size_pct: float) -> BacktestMetrics:
    candles = generate_sample_candles(length=request.lookback_bars)
    signals = build_signals(request.strategy_id, candles)
    position_limit = min(request.position_size_pct, max_position_size_pct) / 100

    cash = request.initial_capital
    units = 0.0
    entry_cost = 0.0
    gross_wins = 0.0
    gross_losses = 0.0
    wins = 0
    trade_count = 0
    peak_equity = cash
    max_drawdown = 0.0

    for candle, signal in zip(candles, signals, strict=True):
        marked_equity = cash + units * candle.close
        peak_equity = max(peak_equity, marked_equity)
        if peak_equity > 0:
            drawdown = (peak_equity - marked_equity) / peak_equity
            max_drawdown = max(max_drawdown, drawdown)

        if units == 0 and signal == "buy":
            notional = cash * position_limit
            if notional <= 0:
                continue
            fill_price = candle.close * (1 + request.slippage_bps / 10_000)
            fee = notional * (request.fee_bps / 10_000)
            units = max((notional - fee) / fill_price, 0.0)
            cash -= notional
            entry_cost = notional
            trade_count += 1
            continue

        if units > 0 and signal == "sell":
            gross = units * candle.close * (1 - request.slippage_bps / 10_000)
            fee = gross * (request.fee_bps / 10_000)
            proceeds = gross - fee
            pnl = proceeds - entry_cost
            if pnl >= 0:
                wins += 1
                gross_wins += pnl
            else:
                gross_losses += abs(pnl)
            cash += proceeds
            units = 0.0
            entry_cost = 0.0

    if units > 0:
        final_price = candles[-1].close
        gross = units * final_price * (1 - request.slippage_bps / 10_000)
        fee = gross * (request.fee_bps / 10_000)
        proceeds = gross - fee
        pnl = proceeds - entry_cost
        if pnl >= 0:
            wins += 1
            gross_wins += pnl
        else:
            gross_losses += abs(pnl)
        cash += proceeds

    ending_equity = round(cash, 4)
    net_profit = round(ending_equity - request.initial_capital, 4)
    closed_trades = trade_count if trade_count > 0 else 0
    win_rate = _safe_pct(wins, closed_trades) if closed_trades else 0.0
    profit_factor = gross_wins / gross_losses if gross_losses else (gross_wins if gross_wins else 0.0)

    edge_status = "flat"
    if net_profit > 0:
        edge_status = "positive"
    elif net_profit < 0:
        edge_status = "negative"

    return BacktestMetrics(
        initial_capital=request.initial_capital,
        ending_equity=ending_equity,
        net_profit=net_profit,
        total_return_pct=round(_safe_pct(net_profit, request.initial_capital), 4),
        max_drawdown_pct=round(max_drawdown * 100, 4),
        trade_count=closed_trades,
        win_rate_pct=round(win_rate, 4),
        profit_factor=round(profit_factor, 4),
        edge_status=edge_status,
    )

