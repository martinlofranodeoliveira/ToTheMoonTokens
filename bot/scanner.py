from __future__ import annotations

from typing import Any

import httpx

DEXSCREENER_LATEST = "https://api.dexscreener.com/latest/dex/search"


def _float(value: object, default: float = 0.0) -> float:
    if not isinstance(value, str | int | float):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_pair(pair: dict[str, Any]) -> dict[str, object] | None:
    base = pair.get("baseToken")
    if not isinstance(base, dict):
        return None
    address = str(base.get("address") or "").strip()
    symbol = str(base.get("symbol") or "").strip()
    if not address:
        return None
    return {
        "address": address,
        "chain": str(pair.get("chainId") or "unknown"),
        "symbol": symbol or None,
        "volume_24h": _float(pair.get("volume", {}).get("h24") if isinstance(pair.get("volume"), dict) else None),
        "momentum": _float(
            pair.get("priceChange", {}).get("h1") if isinstance(pair.get("priceChange"), dict) else None
        ),
        "liquidity_usd": _float(
            pair.get("liquidity", {}).get("usd") if isinstance(pair.get("liquidity"), dict) else None
        ),
    }


class MarketScanner:
    def __init__(self, *, query: str = "USDC", timeout_s: float = 10.0):
        self.query = query
        self.timeout_s = timeout_s

    async def scan_new_pairs(self) -> list[dict[str, object]]:
        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            response = await client.get(DEXSCREENER_LATEST, params={"q": self.query})
            response.raise_for_status()
        pairs = response.json().get("pairs", [])
        if not isinstance(pairs, list):
            return []
        normalized = [normalize_pair(pair) for pair in pairs if isinstance(pair, dict)]
        return [token for token in normalized if token is not None]

    def filter_promising_tokens(
        self,
        tokens: list[dict[str, object]],
        *,
        min_volume: float = 100_000,
        min_momentum: float = 5.0,
        min_liquidity: float = 50_000,
    ) -> list[dict[str, object]]:
        promising: list[dict[str, object]] = []
        for token in tokens:
            if (
                _float(token.get("volume_24h")) >= min_volume
                and _float(token.get("momentum")) >= min_momentum
                and _float(token.get("liquidity_usd")) >= min_liquidity
            ):
                promising.append(token)
        return promising


async def scan_market(
    *,
    query: str = "USDC",
    limit: int = 25,
    min_volume: float = 100_000,
    min_momentum: float = 5.0,
    min_liquidity: float = 50_000,
) -> list[dict[str, object]]:
    scanner = MarketScanner(query=query)
    pairs = await scanner.scan_new_pairs()
    return scanner.filter_promising_tokens(
        pairs,
        min_volume=min_volume,
        min_momentum=min_momentum,
        min_liquidity=min_liquidity,
    )[:limit]
