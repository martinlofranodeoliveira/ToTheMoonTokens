from __future__ import annotations

import os
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class SettingsError(ValueError):
    """Raised when environment configuration is invalid and must be corrected."""

_DEFAULT_CORS_ORIGINS = [
    "http://127.0.0.1:4173",
    "http://localhost:4173",
]

_ROOT_DIR = Path(__file__).parent.parent.parent.parent.parent

class Settings(BaseSettings):
    app_name: str = "ToTheMoonTokens"
    app_env: str = Field("local", alias="APP_ENV")
    host: str = Field("127.0.0.1", alias="API_HOST")
    port: int = Field(8010, alias="API_PORT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    enable_live_trading: bool | str = Field(False, alias="ENABLE_LIVE_TRADING")
    allow_mainnet_trading: bool | str = Field(False, alias="ALLOW_MAINNET_TRADING")
    live_trading_acknowledgement: str = Field("", alias="LIVE_TRADING_ACKNOWLEDGEMENT")
    live_trading_approval_token: str = Field("", alias="LIVE_TRADING_APPROVAL_TOKEN")
    wallet_mode: str = Field("manual_only", alias="WALLET_MODE")
    default_exchange: str = Field("binance_spot_testnet", alias="DEFAULT_EXCHANGE")
    default_symbol: str = Field("BTCUSDT", alias="DEFAULT_SYMBOL")
    default_timeframe: str = Field("1m", alias="DEFAULT_TIMEFRAME")
    max_position_size_pct: float | str = Field(25.0, alias="MAX_POSITION_SIZE_PCT")
    max_daily_loss_pct: float | str = Field(3.0, alias="MAX_DAILY_LOSS_PCT")
    max_open_positions: int | str = Field(1, alias="MAX_OPEN_POSITIONS")
    default_fee_bps: float | str = Field(10.0, alias="DEFAULT_FEE_BPS")
    default_slippage_bps: float | str = Field(5.0, alias="DEFAULT_SLIPPAGE_BPS")
    binance_testnet_base_url: str = Field("https://testnet.binance.vision", alias="BINANCE_TESTNET_BASE_URL")
    binance_user_data_stream_url: str = Field("wss://stream.testnet.binance.vision/ws", alias="BINANCE_USER_DATA_STREAM_URL")
    arc_testnet_rpc_url: str = Field("https://rpc.testnet.arc.network", alias="ARC_TESTNET_RPC_URL")
    cors_allowed_origins: str | list[str] = Field(_DEFAULT_CORS_ORIGINS, alias="CORS_ALLOWED_ORIGINS")
    rate_limit_live_arm_per_minute: int | str = Field(5, alias="RATE_LIMIT_LIVE_ARM_PER_MINUTE")
    rate_limit_backtest_per_minute: int | str = Field(30, alias="RATE_LIMIT_BACKTEST_PER_MINUTE")

    circle_api_key: str = Field("", alias="CIRCLE_API_KEY")
    circle_entity_secret: str = Field("", alias="CIRCLE_ENTITY_SECRET")
    circle_wallet_set_id: str = Field("", alias="CIRCLE_WALLET_SET_ID")

    model_config = SettingsConfigDict(
        env_file=(str(_ROOT_DIR / ".env"), str(_ROOT_DIR / ".env.hackathon")),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True
    )

    @field_validator("cors_allowed_origins", mode="before")
    def _parse_cors(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    @field_validator("enable_live_trading", "allow_mainnet_trading", mode="before")
    def _parse_bool(cls, v):
        if isinstance(v, str):
            return v.strip().lower() in {"1", "true", "yes", "on"}
        return v
        
    @property
    def runtime_mode(self) -> str:
        if self.enable_live_trading and not self.allow_mainnet_trading:
            return "guarded_testnet"
        if self.enable_live_trading and self.allow_mainnet_trading:
            return "blocked_mainnet"
        return "paper"

    def validate(self) -> None:
        errors: list[str] = []
        if self.log_level.upper() not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            errors.append(f"LOG_LEVEL must be one of DEBUG/INFO/WARNING/ERROR/CRITICAL, got {self.log_level!r}")
        if not 1 <= int(self.port) <= 65535:
            errors.append(f"API_PORT must be between 1 and 65535, got {self.port}")
        if self.wallet_mode not in {"manual_only", "custodial", "disabled"}:
            errors.append(f"WALLET_MODE must be one of manual_only/custodial/disabled, got {self.wallet_mode!r}")
        if not 0 < float(self.max_position_size_pct) <= 100:
            errors.append(f"MAX_POSITION_SIZE_PCT must be in (0, 100], got {self.max_position_size_pct}")
        if not 0 < float(self.max_daily_loss_pct) <= 100:
            errors.append(f"MAX_DAILY_LOSS_PCT must be in (0, 100], got {self.max_daily_loss_pct}")
        if int(self.max_open_positions) < 1:
            errors.append(f"MAX_OPEN_POSITIONS must be >= 1, got {self.max_open_positions}")
        if float(self.default_fee_bps) < 0 or float(self.default_slippage_bps) < 0:
            errors.append("DEFAULT_FEE_BPS and DEFAULT_SLIPPAGE_BPS must be >= 0")
        if int(self.rate_limit_live_arm_per_minute) < 1:
            errors.append(f"RATE_LIMIT_LIVE_ARM_PER_MINUTE must be >= 1, got {self.rate_limit_live_arm_per_minute}")
        if int(self.rate_limit_backtest_per_minute) < 1:
            errors.append(f"RATE_LIMIT_BACKTEST_PER_MINUTE must be >= 1, got {self.rate_limit_backtest_per_minute}")
        if self.app_env == "production" and self.allow_mainnet_trading:
            errors.append("ALLOW_MAINNET_TRADING=true is forbidden in production by project policy")
        if errors:
            raise SettingsError("\n".join(errors))


def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    # Normalize types after parsing if needed, pydantic handles basic coercions though.
    settings.port = int(settings.port)
    settings.max_position_size_pct = float(settings.max_position_size_pct)
    settings.max_daily_loss_pct = float(settings.max_daily_loss_pct)
    settings.max_open_positions = int(settings.max_open_positions)
    settings.default_fee_bps = float(settings.default_fee_bps)
    settings.default_slippage_bps = float(settings.default_slippage_bps)
    settings.rate_limit_live_arm_per_minute = int(settings.rate_limit_live_arm_per_minute)
    settings.rate_limit_backtest_per_minute = int(settings.rate_limit_backtest_per_minute)
    settings.log_level = settings.log_level.upper()
    return settings
