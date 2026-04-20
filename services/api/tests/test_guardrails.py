from __future__ import annotations

import pytest

from tothemoon_api.config import Settings
from tothemoon_api.guards import connector_status, evaluate_guardrails


def _make_settings(**overrides: object) -> Settings:
    defaults: dict[str, object] = {
        "enable_live_trading": False,
        "allow_mainnet_trading": False,
        "live_trading_acknowledgement": "",
        "live_trading_approval_token": "",
        "wallet_mode": "manual_only",
    }
    defaults.update(overrides)
    return Settings(**defaults)  # type: ignore[arg-type]


def test_paper_mode_blocks_all_orders():
    status = evaluate_guardrails(_make_settings())
    assert status.mode == "paper"
    assert status.can_submit_testnet_orders is False
    assert status.can_submit_mainnet_orders is False
    assert any("ENABLE_LIVE_TRADING=false" in reason for reason in status.reasons)


def test_mainnet_is_always_blocked_even_with_full_approval():
    status = evaluate_guardrails(
        _make_settings(
            enable_live_trading=True,
            allow_mainnet_trading=True,
            live_trading_acknowledgement="I_ACCEPT_TESTNET_ONLY",
            live_trading_approval_token="token-123",
        )
    )
    assert status.can_submit_mainnet_orders is False
    assert status.can_submit_testnet_orders is False
    assert any("ALLOW_MAINNET_TRADING=true" in reason for reason in status.reasons)


def test_acknowledgement_typo_blocks_testnet():
    status = evaluate_guardrails(
        _make_settings(
            enable_live_trading=True,
            live_trading_acknowledgement="I_ACCEPT_TESTNET",
            live_trading_approval_token="token-123",
        )
    )
    assert status.can_submit_testnet_orders is False
    assert any("LIVE_TRADING_ACKNOWLEDGEMENT" in reason for reason in status.reasons)


@pytest.mark.parametrize("bad_value", ["", "i_accept_testnet_only", "yes", "TRUE", " "])
def test_acknowledgement_case_and_whitespace_sensitive(bad_value: str):
    status = evaluate_guardrails(
        _make_settings(
            enable_live_trading=True,
            live_trading_acknowledgement=bad_value,
            live_trading_approval_token="token-123",
        )
    )
    assert status.can_submit_testnet_orders is False


def test_missing_approval_token_blocks_testnet():
    status = evaluate_guardrails(
        _make_settings(
            enable_live_trading=True,
            live_trading_acknowledgement="I_ACCEPT_TESTNET_ONLY",
            live_trading_approval_token="",
        )
    )
    assert status.can_submit_testnet_orders is False
    assert any("LIVE_TRADING_APPROVAL_TOKEN" in reason for reason in status.reasons)


def test_full_approval_allows_testnet_but_never_mainnet():
    status = evaluate_guardrails(
        _make_settings(
            enable_live_trading=True,
            live_trading_acknowledgement="I_ACCEPT_TESTNET_ONLY",
            live_trading_approval_token="token-123",
        )
    )
    assert status.can_submit_testnet_orders is True
    assert status.can_submit_mainnet_orders is False
    assert status.reasons == []


def test_high_risk_tier_remains_research_only_even_with_full_approval():
    status = evaluate_guardrails(
        _make_settings(
            enable_live_trading=True,
            live_trading_acknowledgement="I_ACCEPT_TESTNET_ONLY",
            live_trading_approval_token="token-123",
        ),
        risk_tier="high",
    )
    assert status.can_submit_testnet_orders is False
    assert status.can_submit_mainnet_orders is False
    assert any("RISK_TIER=high" in reason for reason in status.reasons)


def test_wallet_mode_manual_requires_manual_signature():
    status = evaluate_guardrails(_make_settings(wallet_mode="manual_only"))
    assert status.requires_manual_wallet_signature is True


def test_wallet_mode_non_manual_does_not_require_manual_signature():
    status = evaluate_guardrails(_make_settings(wallet_mode="custodial"))
    assert status.requires_manual_wallet_signature is False


def test_connector_status_exposes_testnet_endpoints():
    info = connector_status(_make_settings())
    assert info.exchange == "binance_spot_testnet"
    assert info.binance_base_url.startswith("https://testnet.")
    assert info.user_stream_url.startswith("wss://stream.testnet.")
    assert info.metamask_ready is True


def test_runtime_mode_transitions():
    assert _make_settings().runtime_mode == "paper"
    assert _make_settings(enable_live_trading=True).runtime_mode == "guarded_testnet"
    assert (
        _make_settings(enable_live_trading=True, allow_mainnet_trading=True).runtime_mode
        == "blocked_mainnet"
    )
