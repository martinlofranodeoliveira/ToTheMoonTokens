from __future__ import annotations

import json
import os
from collections import defaultdict
from collections.abc import Iterable
from pathlib import Path

from .models import AggregateBucket, PaperTradeRecord, PerformanceAggregates


def _journal_path() -> Path:
    configured = os.getenv("PAPER_JOURNAL_FILE", ".nexus/paper_journal.json")
    return Path(configured)


def _load_raw() -> list[dict[str, object]]:
    path = _journal_path()
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def load_trades() -> list[PaperTradeRecord]:
    records: list[PaperTradeRecord] = []
    for payload in _load_raw():
        try:
            records.append(PaperTradeRecord.model_validate(payload))
        except Exception:
            continue
    return records


def _persist(records: list[PaperTradeRecord]) -> None:
    path = _journal_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.parent / f".{path.name}.tmp"
    tmp_path.write_text(
        json.dumps([record.model_dump(mode="json") for record in records], indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(path)


def add_trade(record: PaperTradeRecord) -> PaperTradeRecord:
    records = load_trades()
    records.append(record)
    _persist(records)
    return record


def get_recent_trades(limit: int = 12) -> list[PaperTradeRecord]:
    records = sorted(load_trades(), key=lambda record: record.entry_time, reverse=True)
    return records[: max(limit, 0)]


def clear_trades() -> None:
    path = _journal_path()
    if path.exists():
        path.unlink()


def _bucket(records: Iterable[PaperTradeRecord]) -> AggregateBucket:
    items = list(records)
    total_trades = len(items)
    realized = [item.pnl for item in items if item.pnl is not None]
    total_pnl = round(sum(realized), 4)
    closed = [item for item in items if item.status == "closed" or item.pnl is not None]
    wins = sum(
        1
        for item in closed
        if item.outcome == "win" or (item.outcome == "open" and (item.pnl or 0) > 0)
    )
    drawdowns = [item.drawdown for item in items if item.drawdown is not None]
    win_rate_pct = round((wins / len(closed)) * 100, 4) if closed else 0.0
    average_drawdown = round(sum(drawdowns) / len(drawdowns), 4) if drawdowns else 0.0
    return AggregateBucket(
        total_trades=total_trades,
        total_pnl=total_pnl,
        win_rate_pct=win_rate_pct,
        average_drawdown=average_drawdown,
    )


def get_performance_aggregate() -> PerformanceAggregates:
    trades = load_trades()

    by_strategy: dict[str, list[PaperTradeRecord]] = defaultdict(list)
    by_symbol: dict[str, list[PaperTradeRecord]] = defaultdict(list)
    by_timeframe: dict[str, list[PaperTradeRecord]] = defaultdict(list)

    for trade in trades:
        by_strategy[trade.strategy_id].append(trade)
        by_symbol[trade.symbol].append(trade)
        by_timeframe[trade.timeframe].append(trade)

    return PerformanceAggregates(
        total_trades=len(trades),
        total_pnl=round(sum(trade.pnl or 0.0 for trade in trades), 4),
        win_rate_pct=_bucket(trades).win_rate_pct if trades else 0.0,
        average_drawdown=_bucket(trades).average_drawdown if trades else 0.0,
        by_strategy={key: _bucket(value) for key, value in sorted(by_strategy.items())},
        by_symbol={key: _bucket(value) for key, value in sorted(by_symbol.items())},
        by_timeframe={key: _bucket(value) for key, value in sorted(by_timeframe.items())},
    )
