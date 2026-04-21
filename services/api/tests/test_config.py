from __future__ import annotations

import pytest

from tothemoon_api.config import Settings, SettingsError


def test_default_settings_validate_in_paper_mode():
    settings = Settings()
    settings.validate()
    assert settings.runtime_mode == "paper"


def test_invalid_log_level_rejected():
    settings = Settings(log_level="VERBOSE")
    with pytest.raises(SettingsError, match="LOG_LEVEL"):
        settings.validate()


def test_invalid_wallet_mode_rejected():
    settings = Settings(wallet_mode="shared_hot_wallet")
    with pytest.raises(SettingsError, match="WALLET_MODE"):
        settings.validate()


def test_port_out_of_range_rejected():
    settings = Settings(port=0)
    with pytest.raises(SettingsError, match="API_PORT"):
        settings.validate()


def test_position_size_out_of_range_rejected():
    settings = Settings(max_position_size_pct=150)
    with pytest.raises(SettingsError, match="MAX_POSITION_SIZE_PCT"):
        settings.validate()


def test_negative_fees_rejected():
    settings = Settings(default_fee_bps=-1.0)
    with pytest.raises(SettingsError):
        settings.validate()


def test_cors_origins_parse_from_default_list():
    settings = Settings()
    assert "http://127.0.0.1:4173" in settings.cors_allowed_origins


def test_backtest_rate_limit_must_be_positive():
    settings = Settings(rate_limit_backtest_per_minute=0)
    with pytest.raises(SettingsError, match="RATE_LIMIT_BACKTEST_PER_MINUTE"):
        settings.validate()


def test_multiple_errors_are_reported_together():
    settings = Settings(
        log_level="NOPE",
        wallet_mode="bogus",
        max_position_size_pct=0,
    )
    with pytest.raises(SettingsError) as exc:
        settings.validate()
    message = str(exc.value)
    assert "LOG_LEVEL" in message
    assert "WALLET_MODE" in message
    assert "MAX_POSITION_SIZE_PCT" in message
