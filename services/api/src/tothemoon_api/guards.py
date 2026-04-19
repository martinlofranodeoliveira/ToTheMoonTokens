from __future__ import annotations

from .config import Settings
from .models import ConnectorStatus, GuardrailStatus
from .observability import GUARDRAIL_EVALUATIONS_TOTAL, get_logger


log = get_logger(__name__)


def evaluate_guardrails(settings: Settings) -> GuardrailStatus:
    reasons: list[str] = []
    can_submit_testnet_orders = False
    can_submit_mainnet_orders = False

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
    else:
        can_submit_testnet_orders = True

    GUARDRAIL_EVALUATIONS_TOTAL.labels(
        mode=settings.runtime_mode,
        can_submit_testnet=str(can_submit_testnet_orders).lower(),
    ).inc()

    if reasons:
        log.info(
            "guardrail_blocked",
            runtime_mode=settings.runtime_mode,
            reasons=reasons,
        )

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
    )
