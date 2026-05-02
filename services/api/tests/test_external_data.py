from __future__ import annotations

import httpx

from tothemoon_api.external.adapters import refresh_freshness_metadata
from tothemoon_api.external.cache import clear_external_cache
from tothemoon_api.external.health import get_provider_health
from tothemoon_api.external.market import get_token_market_data
from tothemoon_api.external.security import get_token_security_audit
from tothemoon_api.observability import REDACTED_PLACEHOLDER


def test_get_token_security_audit():
    clear_external_cache()
    audit = get_token_security_audit("0xSAFE")
    assert audit["is_honeypot"] is False
    assert audit["liquidity_locked_pct"] > 0
    assert audit["provider"] == "local_fallback"
    assert audit["degraded"] is True
    assert audit["confidence"] == "low"
    assert audit["freshness"]["status"] == "placeholder"

    audit_scam = get_token_security_audit("0xSCAM")
    assert audit_scam["is_honeypot"] is True


def test_get_token_market_data():
    clear_external_cache()
    market = get_token_market_data("0xABC")
    assert "price" in market
    assert "volatility_index" in market
    assert market["provider"] == "local_fallback"
    assert market["degraded"] is True
    assert market["confidence"] == "low"
    assert market["freshness"]["status"] == "placeholder"


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
    assert audit["provider"] == "security_consensus"
    assert audit["confidence"] == "high"
    assert audit["freshness"]["status"] == "live"


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
    assert market["confidence"] == "high"
    assert market["freshness"]["status"] == "live"


def test_market_missing_birdeye_key_is_skipped_not_degraded(monkeypatch):
    clear_external_cache()

    def fail_dex(token_address: str) -> dict[str, object]:
        raise RuntimeError("dexscreener unavailable")

    monkeypatch.setattr("tothemoon_api.external.market._fetch_dexscreener", fail_dex)
    monkeypatch.setattr("tothemoon_api.config.Settings.birdeye_api_key", "", raising=False)

    market = get_token_market_data("So11111111111111111111111111111111111111112")

    assert market["provider"] == "local_fallback"
    health = get_provider_health()
    assert health["birdeye"]["status"] == "skipped"
    assert health["birdeye"]["last_error"] == "missing API key"


def test_security_fails_closed_when_all_real_providers_fail(monkeypatch):
    clear_external_cache()

    def fail_provider(token_address: str, chain: str) -> dict[str, object]:
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr("tothemoon_api.external.security._fetch_goplus", fail_provider)
    monkeypatch.setattr("tothemoon_api.external.security._fetch_honeypotis", fail_provider)
    monkeypatch.setattr("tothemoon_api.external.security._fetch_tokensniffer", fail_provider)

    audit = get_token_security_audit("0x4444444444444444444444444444444444444444")

    assert audit["is_honeypot"] is True
    assert audit["risk_score"] == 99
    assert audit["contract_verified"] is False
    assert audit["providers"] == ["provider_unavailable"]
    assert audit["provider_health"] == "degraded"
    assert audit["provider"] == "provider_unavailable"
    assert audit["confidence"] == "none"
    assert audit["degraded"] is True
    health = get_provider_health()
    assert health["goplus"]["status"] == "degraded"
    assert health["honeypotis"]["status"] == "degraded"
    assert health["tokensniffer"]["status"] == "degraded"


def test_security_missing_key_path_marks_unavailable_not_high_confidence(monkeypatch):
    clear_external_cache()

    def timeout_provider(token_address: str, chain: str) -> dict[str, object]:
        raise RuntimeError("timeout")

    monkeypatch.setattr("tothemoon_api.external.security._fetch_goplus", timeout_provider)
    monkeypatch.setattr("tothemoon_api.external.security._fetch_honeypotis", timeout_provider)
    monkeypatch.setattr("tothemoon_api.config.Settings.tokensniffer_api_key", "", raising=False)

    audit = get_token_security_audit("0x5555555555555555555555555555555555555555")

    assert audit["provider"] == "provider_unavailable"
    assert audit["confidence"] == "none"
    assert audit["degraded"] is True


def test_freshness_metadata_marks_expired_cache_payload_stale():
    payload = {
        "provider": "dexscreener",
        "observed_at": "2020-01-01T00:00:00Z",
        "freshness": {"status": "live", "ttl_seconds": 30, "age_seconds": 0, "stale": False},
        "confidence": "high",
        "degraded": False,
    }

    refreshed = refresh_freshness_metadata(payload)

    assert refreshed["freshness"]["age_seconds"] > 30
    assert refreshed["freshness"]["stale"] is True
    assert refreshed["degraded"] is True


def test_external_adapter_contract_is_paper_only_read_through():
    from tothemoon_api.external import get_external_adapter_contract

    contract = get_external_adapter_contract()

    assert contract["mode"] == "paper_only_read_through"
    assert contract["order_submission_enabled"] is False
    assert contract["mainnet_order_submission_enabled"] is False
    assert {provider["name"] for provider in contract["providers"]} == {
        "goplus",
        "honeypotis",
        "tokensniffer",
        "dexscreener",
        "birdeye",
    }
    assert all(provider["read_only"] is True for provider in contract["providers"])
    assert all(provider["supports_order_submission"] is False for provider in contract["providers"])
    assert all(provider["mainnet_order_submission"] is False for provider in contract["providers"])
    assert all(isinstance(provider["requires_api_key"], bool) for provider in contract["providers"])
    assert all("secret" not in str(provider).lower() for provider in contract["providers"])


def test_adapter_rejects_order_capable_provider():
    from tothemoon_api.external.adapters import ExternalProviderAdapter, UnsafeProviderAdapterError

    adapter = ExternalProviderAdapter(
        name="unsafe_exchange",
        capabilities=frozenset({"market_data"}),
        fetch=lambda token: {"token_address": token},
        supports_order_submission=True,
    )

    try:
        adapter.assert_safe_for_paper_mode()
    except UnsafeProviderAdapterError:
        return
    raise AssertionError("order-capable providers must be rejected")


def test_adapter_rejects_missing_capabilities():
    from tothemoon_api.external.adapters import ExternalProviderAdapter, UnsafeProviderAdapterError

    adapter = ExternalProviderAdapter(
        name="empty_capabilities",
        capabilities=frozenset(),
        fetch=lambda token: {"token_address": token},
    )

    try:
        adapter.assert_safe_for_paper_mode()
    except UnsafeProviderAdapterError:
        return
    raise AssertionError("providers must declare at least one known capability")


def test_adapter_rejects_unknown_capabilities():
    from tothemoon_api.external.adapters import ExternalProviderAdapter, UnsafeProviderAdapterError

    adapter = ExternalProviderAdapter(
        name="unknown_capability",
        capabilities=frozenset({"wallet_write"}),
        fetch=lambda token: {"token_address": token},
    )

    try:
        adapter.assert_safe_for_paper_mode()
    except UnsafeProviderAdapterError:
        return
    raise AssertionError("providers must only declare approved read-through capabilities")


def test_adapter_rejects_blank_provider_name():
    from tothemoon_api.external.adapters import ExternalProviderAdapter, UnsafeProviderAdapterError

    adapter = ExternalProviderAdapter(
        name=" ",
        capabilities=frozenset({"market_data"}),
        fetch=lambda token: {"token_address": token},
    )

    try:
        adapter.assert_safe_for_paper_mode()
    except UnsafeProviderAdapterError:
        return
    raise AssertionError("providers must declare a non-empty name")


def test_provider_health_redacts_secret_values_from_last_error():
    from tothemoon_api.external.health import record_provider_status

    record_provider_status(
        "dexscreener",
        status="degraded",
        last_error="upstream rejected Authorization=Bearer abc.def.ghi api_key=sk_live_deadbeef",
    )

    health = get_provider_health()
    assert health["dexscreener"]["last_error"] == (
        f"upstream rejected {REDACTED_PLACEHOLDER} {REDACTED_PLACEHOLDER}"
    )
    assert "abc.def.ghi" not in health["dexscreener"]["last_error"]
    assert "sk_live_deadbeef" not in health["dexscreener"]["last_error"]


def test_external_cache_disables_redis_after_read_failure(monkeypatch):
    import tothemoon_api.external.cache as cache

    class FailingRedisClient:
        get_calls = 0

        def get(self, key: str) -> bytes | None:
            self.get_calls += 1
            raise RuntimeError("redis unavailable")

        def setex(self, key: str, ttl: int, payload: str) -> None:
            raise AssertionError("redis writes should be skipped after read failure")

    client = FailingRedisClient()
    calls = {"count": 0}

    monkeypatch.setenv("REDIS_URL", "redis://cache.example:6379/0")
    monkeypatch.setattr(cache, "redis", object())
    monkeypatch.setattr(cache, "_REDIS_CLIENT", client)
    monkeypatch.setattr(cache, "_REDIS_DISABLED", False)
    clear_external_cache()
    monkeypatch.setattr(cache, "_REDIS_CLIENT", client)

    @cache.cached(ttl=60, namespace="redis-fallback-test")
    def fetch_value(token_address: str) -> dict[str, object]:
        calls["count"] += 1
        return {"token_address": token_address, "value": calls["count"]}

    first = fetch_value("0xredis")
    second = fetch_value("0xredis")

    assert first == second == {"token_address": "0xredis", "value": 1}
    assert client.get_calls == 1
    assert cache._REDIS_CLIENT is None
    assert cache._REDIS_DISABLED is True
    assert calls["count"] == 1
