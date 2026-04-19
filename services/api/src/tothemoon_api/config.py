from __future__ import annotations

import os
from dataclasses import dataclass


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _as_float(value: str | None, default: float) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


@dataclass(slots=True)
class Settings:
    app_name: str = "ToTheMoonTokens"
    app_env: str = os.getenv("APP_ENV", "local")
    host: str = os.getenv("API_HOST", "127.0.0.1")
    port: int = int(os.getenv("API_PORT", "8010"))
    enable_live_trading: bool = _as_bool(os.getenv("ENABLE_LIVE_TRADING"), False)
    allow_mainnet_trading: bool = _as_bool(os.getenv("ALLOW_MAINNET_TRADING"), False)
    live_trading_acknowledgement: str = os.getenv("LIVE_TRADING_ACKNOWLEDGEMENT", "")
    live_trading_approval_token: str = os.getenv("LIVE_TRADING_APPROVAL_TOKEN", "")
    wallet_mode: str = os.getenv("WALLET_MODE", "manual_only")
    default_exchange: str = os.getenv("DEFAULT_EXCHANGE", "binance_spot_testnet")
    default_symbol: str = os.getenv("DEFAULT_SYMBOL", "BTCUSDT")
    default_timeframe: str = os.getenv("DEFAULT_TIMEFRAME", "1m")
    max_position_size_pct: float = _as_float(os.getenv("MAX_POSITION_SIZE_PCT"), 25.0)
    max_daily_loss_pct: float = _as_float(os.getenv("MAX_DAILY_LOSS_PCT"), 3.0)
    max_open_positions: int = int(os.getenv("MAX_OPEN_POSITIONS", "1"))
    default_fee_bps: float = _as_float(os.getenv("DEFAULT_FEE_BPS"), 10.0)
    default_slippage_bps: float = _as_float(os.getenv("DEFAULT_SLIPPAGE_BPS"), 5.0)
    binance_testnet_base_url: str = os.getenv(
        "BINANCE_TESTNET_BASE_URL", "https://testnet.binance.vision"
    )
    binance_user_data_stream_url: str = os.getenv(
        "BINANCE_USER_DATA_STREAM_URL", "wss://stream.testnet.binance.vision/ws"
    )

    @property
    def runtime_mode(self) -> str:
        if self.enable_live_trading and not self.allow_mainnet_trading:
            return "guarded_testnet"
        if self.enable_live_trading and self.allow_mainnet_trading:
            return "blocked_mainnet"
        return "paper"


def get_settings() -> Settings:
    return Settings()
