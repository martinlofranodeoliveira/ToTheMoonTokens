from __future__ import annotations

import json
import os
from decimal import Decimal

SLIPPAGE_BPS_BY_CHAIN = {"evm": 50.0, "base": 30.0, "solana": 10.0, "bsc": 40.0}
GAS_USD_BY_CHAIN = {"evm": 8.0, "base": 0.4, "solana": 0.05, "bsc": 0.5}


def _chain_key(chain: str) -> str:
    return chain.strip().lower().replace("-", "_")


def _mapping_from_env(name: str, defaults: dict[str, float]) -> dict[str, float]:
    raw = os.getenv(name, "").strip()
    if not raw:
        return defaults
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return {**defaults, **{_chain_key(str(k)): float(v) for k, v in parsed.items()}}
    except (TypeError, ValueError, json.JSONDecodeError):
        pass

    overrides: dict[str, float] = {}
    for item in raw.split(","):
        if ":" not in item:
            continue
        key, value = item.split(":", 1)
        try:
            overrides[_chain_key(key)] = float(value)
        except ValueError:
            continue
    return {**defaults, **overrides}


def chain_slippage_bps(chain: str) -> float:
    values = _mapping_from_env("SIMULATION_SLIPPAGE_BPS_BY_CHAIN", SLIPPAGE_BPS_BY_CHAIN)
    return values.get(_chain_key(chain), values["evm"])


def chain_gas_usd_estimate(chain: str, amount_usd: float | Decimal) -> Decimal:
    values = _mapping_from_env("SIMULATION_GAS_USD_BY_CHAIN", GAS_USD_BY_CHAIN)
    _ = amount_usd
    return Decimal(str(values.get(_chain_key(chain), values["evm"])))
