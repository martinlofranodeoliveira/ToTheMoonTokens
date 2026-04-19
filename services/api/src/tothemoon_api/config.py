from __future__ import annotations

import os
from dataclasses import dataclass, field


class SettingsError(ValueError):
    """Raised when environment configuration is invalid and must be corrected."""


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _as_float(value: str | None, default: float, *, name: str) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise SettingsError(f"{name} must be a number, got {value!r}") from exc


def _as_int(value: str | None, default: int, *, name: str) -> int:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise SettingsError(f"{name} must be an integer, got {value!r}") from exc


def _as_list(value: str | None, default: list[str]) -> list[str]:
    if value is None or value == "":
        return list(default)
    return [entry.strip() for entry in value.split(",") if entry.strip()]


_DEFAULT_CORS_ORIGINS = [
    "http://127.0.0.1:4173",
    "http://localhost:4173",
]


@dataclass(slots=True)
class Settings:
    app_name: str = "ToTheMoonTokens"
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "local"))
    host: str = field(default_factory=lambda: os.getenv("API_HOST", "127.0.0.1"))
    port: int = field(default_factory=lambda: _as_int(os.getenv("API_PORT"), 8010, name="API_PORT"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())
    enable_live_trading: bool = field(
        default_factory=lambda: _as_bool(os.getenv("ENABLE_LIVE_TRADING"), False)
    )
    allow_mainnet_trading: bool = field(
        default_factory=lambda: _as_bool(os.getenv("ALLOW_MAINNET_TRADING"), False)
    )
    live_trading_acknowledgement: str = field(
        default_factory=lambda: os.getenv("LIVE_TRADING_ACKNOWLEDGEMENT", "")
    )
    live_trading_approval_token: str = field(
        default_factory=lambda: os.getenv("LIVE_TRADING_APPROVAL_TOKEN", "")
    )
    wallet_mode: str = field(default_factory=lambda: os.getenv("WALLET_MODE", "manual_only"))
    default_exchange: str = field(
        default_factory=lambda: os.getenv("DEFAULT_EXCHANGE", "binance_spot_testnet")
    )
    default_symbol: str = field(default_factory=lambda: os.getenv("DEFAULT_SYMBOL", "BTCUSDT"))
    default_timeframe: str = field(default_factory=lambda: os.getenv("DEFAULT_TIMEFRAME", "1m"))
    max_position_size_pct: float = field(
        default_factory=lambda: _as_float(
            os.getenv("MAX_POSITION_SIZE_PCT"), 25.0, name="MAX_POSITION_SIZE_PCT"
        )
    )
    max_daily_loss_pct: float = field(
        default_factory=lambda: _as_float(
            os.getenv("MAX_DAILY_LOSS_PCT"), 3.0, name="MAX_DAILY_LOSS_PCT"
        )
    )
    max_open_positions: int = field(
        default_factory=lambda: _as_int(
            os.getenv("MAX_OPEN_POSITIONS"), 1, name="MAX_OPEN_POSITIONS"
        )
    )
    default_fee_bps: float = field(
        default_factory=lambda: _as_float(
            os.getenv("DEFAULT_FEE_BPS"), 10.0, name="DEFAULT_FEE_BPS"
        )
    )
    default_slippage_bps: float = field(
        default_factory=lambda: _as_float(
            os.getenv("DEFAULT_SLIPPAGE_BPS"), 5.0, name="DEFAULT_SLIPPAGE_BPS"
        )
    )
    binance_testnet_base_url: str = field(
        default_factory=lambda: os.getenv(
            "BINANCE_TESTNET_BASE_URL", "https://testnet.binance.vision"
        )
    )
    binance_user_data_stream_url: str = field(
        default_factory=lambda: os.getenv(
            "BINANCE_USER_DATA_STREAM_URL", "wss://stream.testnet.binance.vision/ws"
        )
    )
    cors_allowed_origins: list[str] = field(
        default_factory=lambda: _as_list(os.getenv("CORS_ALLOWED_ORIGINS"), _DEFAULT_CORS_ORIGINS)
    )
    rate_limit_live_arm_per_minute: int = field(
        default_factory=lambda: _as_int(
            os.getenv("RATE_LIMIT_LIVE_ARM_PER_MINUTE"),
            5,
            name="RATE_LIMIT_LIVE_ARM_PER_MINUTE",
        )
    )
    rate_limit_backtest_per_minute: int = field(
        default_factory=lambda: _as_int(
            os.getenv("RATE_LIMIT_BACKTEST_PER_MINUTE"),
            30,
            name="RATE_LIMIT_BACKTEST_PER_MINUTE",
        )
    )

    @property
    def runtime_mode(self) -> str:
        if self.enable_live_trading and not self.allow_mainnet_trading:
            return "guarded_testnet"
        if self.enable_live_trading and self.allow_mainnet_trading:
            return "blocked_mainnet"
        return "paper"

    def validate(self) -> None:
        errors: list[str] = []
        if self.log_level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            errors.append(f"LOG_LEVEL must be one of DEBUG/INFO/WARNING/ERROR/CRITICAL, got {self.log_level!r}")
        if not 1 <= self.port <= 65535:
            errors.append(f"API_PORT must be between 1 and 65535, got {self.port}")
        if self.wallet_mode not in {"manual_only", "custodial", "disabled"}:
            errors.append(
                f"WALLET_MODE must be one of manual_only/custodial/disabled, got {self.wallet_mode!r}"
            )
        if not 0 < self.max_position_size_pct <= 100:
            errors.append(
                f"MAX_POSITION_SIZE_PCT must be in (0, 100], got {self.max_position_size_pct}"
            )
        if not 0 < self.max_daily_loss_pct <= 100:
            errors.append(
                f"MAX_DAILY_LOSS_PCT must be in (0, 100], got {self.max_daily_loss_pct}"
            )
        if self.max_open_positions < 1:
            errors.append(f"MAX_OPEN_POSITIONS must be >= 1, got {self.max_open_positions}")
        if self.default_fee_bps < 0 or self.default_slippage_bps < 0:
            errors.append("DEFAULT_FEE_BPS and DEFAULT_SLIPPAGE_BPS must be >= 0")
        if self.rate_limit_live_arm_per_minute < 1:
            errors.append(
                f"RATE_LIMIT_LIVE_ARM_PER_MINUTE must be >= 1, got {self.rate_limit_live_arm_per_minute}"
            )
        if self.rate_limit_backtest_per_minute < 1:
            errors.append(
                f"RATE_LIMIT_BACKTEST_PER_MINUTE must be >= 1, got {self.rate_limit_backtest_per_minute}"
            )
        if self.app_env == "production" and self.allow_mainnet_trading:
            errors.append("ALLOW_MAINNET_TRADING=true is forbidden in production by project policy")
        if errors:
            raise SettingsError("\n".join(errors))


def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings
