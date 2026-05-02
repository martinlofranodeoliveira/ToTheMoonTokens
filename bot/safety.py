from __future__ import annotations

from typing import Any


class BotSafetyError(RuntimeError):
    pass


def assert_paper_or_guarded_testnet_status(status: dict[str, Any]) -> None:
    runtime_mode = status.get("runtime_mode")
    if runtime_mode not in {"paper", "guarded_testnet"}:
        raise BotSafetyError(f"Unsupported bot runtime mode: {runtime_mode!r}")
    if status.get("order_submission_enabled") is not False:
        raise BotSafetyError("Bot orchestration requires order submission to remain disabled")
    if status.get("mainnet_order_submission_enabled") is not False:
        raise BotSafetyError("Mainnet order submission is permanently blocked for bots")

    safeguards = status.get("safeguards")
    if not isinstance(safeguards, dict):
        raise BotSafetyError("Bot orchestration status is missing safeguards")
    if safeguards.get("production_mainnet_blocked") is not True:
        raise BotSafetyError("Production/mainnet safeguard is not active")
    if runtime_mode == "guarded_testnet" and safeguards.get("guarded_testnet_enabled") is not True:
        raise BotSafetyError("Guarded testnet mode requires an explicit feature flag")


async def fetch_bot_status(client: Any, *, api_key: str) -> dict[str, Any]:
    response = await client.get("/api/v1/copilot/bot/status", headers={"X-API-Key": api_key})
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise BotSafetyError("Bot orchestration status must be a JSON object")
    assert_paper_or_guarded_testnet_status(data)
    return data
