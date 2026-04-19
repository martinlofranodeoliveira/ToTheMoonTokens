from __future__ import annotations

import os

from .config import Settings
from .market_data import connector_state
from .models import ConnectorStatus, GuardrailStatus, RiskTier
from .observability import GUARDRAIL_EVALUATIONS_TOTAL, get_logger

log = get_logger(__name__)

FORBIDDEN_SECRETS = [
    "BINANCE_API_SECRET",
    "BINANCE_SECRET_KEY",
    "BINANCE_SECRET",
    "WALLET_PRIVATE_KEY",
    "PRIVATE_KEY",
    "WEB3_PRIVATE_KEY",
    "MAINNET_API_KEY",
    "MAINNET_PRIVATE_KEY",
]


def evaluate_guardrails(settings: Settings, risk_tier: RiskTier = "low") -> GuardrailStatus:
    reasons: list[str] = []
    can_submit_testnet_orders = False
    can_submit_mainnet_orders = False

    if risk_tier == "high":
        reasons.append(
            "RISK_TIER=high: perfis agressivos permanecem elegiveis apenas para pesquisa e paper trading."
        )

    for secret in FORBIDDEN_SECRETS:
        if os.getenv(secret):
            reasons.append(
                f"FORBIDDEN_SECRET: {secret} detectado. Segredos de carteira e keys reais sao bloqueados."
            )

    if settings.wallet_mode != "manual_only":
        reasons.append(
            f"WALLET_MODE={settings.wallet_mode!r}: apenas 'manual_only' e aceito para qualquer fluxo armado."
        )

    if not settings.enable_live_trading:
        reasons.append("ENABLE_LIVE_TRADING=false: runtime bloqueado em paper mode.")
    elif settings.allow_mainnet_trading:
        reasons.append(
            "ALLOW_MAINNET_TRADING=true foi solicitado, mas a politica do projeto bloqueia mainnet."
        )
    elif settings.live_trading_acknowledgement != "I_ACCEPT_TESTNET_ONLY":
        reasons.append(
            "LIVE_TRADING_ACKNOWLEDGEMENT ausente ou invalido para testnet guarded mode."
        )
    elif not settings.live_trading_approval_token:
        reasons.append("LIVE_TRADING_APPROVAL_TOKEN ausente: falta aprovacao manual explicita.")

    if not reasons:
        can_submit_testnet_orders = True

    GUARDRAIL_EVALUATIONS_TOTAL.labels(
        mode=settings.runtime_mode,
        can_submit_testnet=str(can_submit_testnet_orders).lower(),
    ).inc()

    if reasons:
        log.warning("guardrail_blocked", runtime_mode=settings.runtime_mode, reasons=reasons)
    else:
        log.info("guardrail_passed", runtime_mode=settings.runtime_mode, risk_tier=risk_tier)

    return GuardrailStatus(
        mode=settings.runtime_mode,
        can_submit_testnet_orders=can_submit_testnet_orders,
        can_submit_mainnet_orders=can_submit_mainnet_orders,
        requires_manual_wallet_signature=settings.wallet_mode == "manual_only",
        reasons=reasons,
    )


def connector_status(settings: Settings) -> ConnectorStatus:
    return ConnectorStatus(
        exchange=settings.default_exchange,
        wallet_mode=settings.wallet_mode,
        binance_base_url=settings.binance_testnet_base_url,
        user_stream_url=settings.binance_user_data_stream_url,
        metamask_ready=settings.wallet_mode == "manual_only",
        latency_ms=connector_state.last_latency_ms or None,
        reconnect_count=connector_state.reconnect_count,
        last_error=connector_state.last_error,
    )
