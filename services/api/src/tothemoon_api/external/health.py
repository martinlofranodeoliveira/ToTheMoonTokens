from __future__ import annotations

from datetime import UTC, datetime
from time import perf_counter
from typing import Any

from tothemoon_api.observability import redact_sensitive_value

_DEFAULT_PROVIDERS = ("goplus", "honeypotis", "tokensniffer", "dexscreener", "birdeye")
_PROVIDER_HEALTH: dict[str, dict[str, Any]] = {
    provider: {"status": "unknown", "latency_ms": None, "last_error": None, "observed_at": None}
    for provider in _DEFAULT_PROVIDERS
}


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def record_provider_status(
    provider: str,
    *,
    status: str,
    started_at: float | None = None,
    last_error: str | None = None,
) -> None:
    latency_ms = None
    if started_at is not None:
        latency_ms = round((perf_counter() - started_at) * 1000, 2)
    _PROVIDER_HEALTH[provider] = {
        "status": status,
        "latency_ms": latency_ms,
        "last_error": redact_sensitive_value(last_error),
        "observed_at": utc_now_iso(),
    }


def get_provider_health() -> dict[str, dict[str, Any]]:
    return {provider: dict(status) for provider, status in _PROVIDER_HEALTH.items()}
