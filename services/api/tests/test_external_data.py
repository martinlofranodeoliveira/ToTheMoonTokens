from __future__ import annotations

import httpx

from tothemoon_api.external.cache import clear_external_cache
from tothemoon_api.external.market import get_token_market_data
from tothemoon_api.external.security import get_token_security_audit


def test_get_token_security_audit():
    clear_external_cache()
    audit = get_token_security_audit("0xSAFE")
    assert audit["is_honeypot"] is False
    assert audit["liquidity_locked_pct"] > 0

    audit_scam = get_token_security_audit("0xSCAM")
    assert audit_scam["is_honeypot"] is True


def test_get_token_market_data():
    clear_external_cache()
    market = get_token_market_data("0xABC")
    assert "price" in market
    assert "volatility_index" in market


def test_security_consensus_true_when_2_of_3_say_honeypot(monkeypatch):
    clear_external_cache()

    monkeypatch.setattr(
        "tothemoon_api.external.security._fetch_goplus",
        lambda token, chain: {"provider": "goplus", "is_honeypot": True, "risk_score": 80},
    )
    monkeypatch.setattr(
        "tothemoon_api.external.security._fetch_honeypotis",
        lambda token, chain: {"provider": "honeypotis", "is_honeypot": True, "risk_score": 70},
    )
    monkeypatch.setattr(
        "tothemoon_api.external.security._fetch_tokensniffer",
        lambda token, chain: {"provider": "tokensniffer", "is_honeypot": False, "risk_score": 20},
    )

    audit = get_token_security_audit("0x1111111111111111111111111111111111111111")

    assert audit["is_honeypot"] is True
    assert audit["providers"] == ["goplus", "honeypotis", "tokensniffer"]


def test_security_uses_max_risk_score(monkeypatch):
    clear_external_cache()

    monkeypatch.setattr(
        "tothemoon_api.external.security._fetch_goplus",
        lambda token, chain: {
            "provider": "goplus",
            "is_honeypot": False,
            "risk_score": 25,
            "buy_tax": 1,
            "sell_tax": 2,
        },
    )
    monkeypatch.setattr(
        "tothemoon_api.external.security._fetch_honeypotis",
        lambda token, chain: {
            "provider": "honeypotis",
            "is_honeypot": False,
            "risk_score": 92,
            "buy_tax": 3,
            "sell_tax": 4,
        },
    )
    monkeypatch.setattr(
        "tothemoon_api.external.security._fetch_tokensniffer",
        lambda token, chain: {"provider": "tokensniffer", "is_honeypot": False, "risk_score": 55},
    )

    audit = get_token_security_audit("0x2222222222222222222222222222222222222222")

    assert audit["risk_score"] == 92
    assert audit["buy_tax"] == 3
    assert audit["sell_tax"] == 4


def test_market_caches_for_30_seconds(monkeypatch):
    clear_external_cache()
    calls = {"count": 0}

    def fake_fetch(token_address: str) -> dict[str, object]:
        calls["count"] += 1
        return {
            "token_address": token_address,
            "price": 2.0,
            "chain": "base",
            "volatility_index": 0.1,
            "provider": "dexscreener",
        }

    monkeypatch.setattr("tothemoon_api.external.market._fetch_dexscreener", fake_fetch)

    first = get_token_market_data("0x3333333333333333333333333333333333333333")
    second = get_token_market_data("0x3333333333333333333333333333333333333333")

    assert first == second
    assert calls["count"] == 1


def test_market_falls_back_when_dexscreener_500s(monkeypatch):
    clear_external_cache()

    def fail_dex(token_address: str) -> dict[str, object]:
        request = httpx.Request("GET", "https://api.dexscreener.com/latest/dex/tokens/x")
        response = httpx.Response(500, request=request)
        raise httpx.HTTPStatusError("server error", request=request, response=response)

    monkeypatch.setattr("tothemoon_api.external.market._fetch_dexscreener", fail_dex)
    monkeypatch.setattr(
        "tothemoon_api.external.market._fetch_birdeye",
        lambda token_address: {
            "token_address": token_address,
            "price": 3.0,
            "chain": "solana",
            "volatility_index": 0.03,
            "provider": "birdeye",
        },
    )

    market = get_token_market_data("So11111111111111111111111111111111111111112")

    assert market["provider"] == "birdeye"
    assert market["price"] == 3.0
