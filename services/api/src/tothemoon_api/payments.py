from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, HTTPException

from .circle import circle_client
from .config import get_settings
from .demo_agent import DemoJobRequest, advance_job_to_delivered, ensure_job_paid, request_job
from .models import (
    BillableArtifact,
    JobExecutionRequest,
    JobExecutionResponse,
    PaymentIntentRecord,
    PaymentIntentRequest,
    PaymentIntentResponse,
    PaymentPayRequest,
    PaymentPayResponse,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
)
from .settlement import SettlementRequest, clear_seen_payment_intents, verify_settlement

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _looks_like_evm_address(value: str | None) -> bool:
    if not value or not value.startswith("0x") or len(value) != 42:
        return False
    try:
        int(value[2:], 16)
        return True
    except ValueError:
        return False


def _to_native_usdc_units(amount: float) -> int:
    scaled = Decimal(str(amount)) * (Decimal(10) ** 18)
    return int(scaled.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _format_usdc_amount(amount: float) -> str:
    normalized = Decimal(str(amount)).normalize()
    return format(normalized, "f")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


ARTIFACT_CATALOG: dict[str, BillableArtifact] = {
    "artifact_delivery_packet": BillableArtifact(
        id="artifact_delivery_packet",
        name="Delivery Packet",
        description="Reviewed delivery packet with execution summary and unlock metadata.",
        price_usd=0.001,
        type="delivery_packet",
    ),
    "artifact_review_bundle": BillableArtifact(
        id="artifact_review_bundle",
        name="Review Bundle",
        description="Reviewer-approved evidence bundle with settlement and quality checkpoints.",
        price_usd=0.005,
        type="review_bundle",
    ),
    "artifact_market_intel_brief": BillableArtifact(
        id="artifact_market_intel_brief",
        name="Market Intelligence Brief",
        description="Premium machine-generated brief unlocked only after payment verification.",
        price_usd=0.01,
        type="market_intel_brief",
    ),
}

_PAYMENT_INTENTS: dict[str, PaymentIntentRecord] = {}


def clear_payment_intents() -> None:
    _PAYMENT_INTENTS.clear()
    clear_seen_payment_intents()


def list_payment_intents() -> list[PaymentIntentRecord]:
    return sorted(_PAYMENT_INTENTS.values(), key=lambda intent: intent.updated_at, reverse=True)


def get_payment_intent_record(payment_id: str) -> PaymentIntentRecord | None:
    return _PAYMENT_INTENTS.get(payment_id)


def _require_payment_intent(payment_id: str) -> PaymentIntentRecord:
    intent = get_payment_intent_record(payment_id)
    if not intent:
        raise HTTPException(status_code=404, detail="Payment intent not found")
    return intent


def _save_payment_intent(intent: PaymentIntentRecord) -> PaymentIntentRecord:
    _PAYMENT_INTENTS[intent.payment_id] = intent
    return intent


def _update_payment_intent(intent: PaymentIntentRecord, **changes: object) -> PaymentIntentRecord:
    payload = intent.model_dump(mode="json")
    payload.update(changes)
    payload["updated_at"] = str(changes.get("updated_at") or _now_iso())
    updated = PaymentIntentRecord(**payload)
    _PAYMENT_INTENTS[updated.payment_id] = updated
    return updated


def _treasury_address() -> str:
    circle_client.ensure_wallets_loaded()
    return circle_client.get_wallet_address("TREASURY") or "0xMockDepositAddressForTestnetOnly"


def create_checkout(
    artifact_id: str,
    buyer_address: str,
    *,
    job_id: str | None = None,
) -> PaymentIntentRecord:
    if artifact_id not in ARTIFACT_CATALOG:
        raise HTTPException(status_code=404, detail="Artifact not found")

    artifact = ARTIFACT_CATALOG[artifact_id]
    now = _now_iso()
    payment_id = str(uuid.uuid4())

    intent = PaymentIntentRecord(
        payment_id=payment_id,
        artifact_id=artifact.id,
        artifact_name=artifact.name,
        artifact_type=artifact.type,
        amount_usd=artifact.price_usd,
        buyer_address=buyer_address,
        deposit_address=_treasury_address(),
        job_id=job_id,
        status="pending",
        settlement_status="PENDING",
        reason=None,
        tx_hash=None,
        circle_transaction_id=None,
        executed=False,
        download_url=None,
        execution_message=None,
        created_at=now,
        updated_at=now,
    )
    return _save_payment_intent(intent)


def create_demo_checkout(artifact_id: str, buyer_address: str) -> PaymentIntentRecord:
    artifact = ARTIFACT_CATALOG.get(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    demo_job = request_job(DemoJobRequest(artifact_type=artifact.type))
    return create_checkout(artifact_id, buyer_address, job_id=demo_job.id)


def _mock_receipt(
    tx_hash: str,
    *,
    sender: str,
    receiver: str,
    native_amount: int,
) -> dict[str, object]:
    return {
        "status": "0x1",
        "from": sender,
        "to": receiver,
        "transactionHash": tx_hash,
        "value": hex(native_amount),
        "logs": [
            {
                "address": "0x1800000000000000000000000000000000000000",
                "topics": [
                    "0x62f084c00a442dcf51cdbb51beed2839bf42a268da8474b0e98f38edb7db5a22",
                    f"0x{'0' * 24}{sender[2:]}",
                    f"0x{'0' * 24}{receiver[2:]}",
                ],
                "data": hex(native_amount),
            }
        ],
    }


def _mock_transaction(
    tx_hash: str,
    *,
    sender: str,
    receiver: str,
    native_amount: int,
) -> dict[str, object]:
    return {
        "hash": tx_hash,
        "from": sender,
        "to": receiver,
        "value": hex(native_amount),
    }


def verify_payment_intent(payment_id: str, tx_hash: str) -> PaymentVerificationResponse:
    intent = _require_payment_intent(payment_id)

    if intent.status == "verified" and intent.tx_hash == tx_hash:
        return PaymentVerificationResponse(
            payment_id=payment_id,
            status="verified",
            unlocked_artifact_id=intent.artifact_id,
            settlement_status=intent.settlement_status,
            reason=intent.reason,
        )

    settings = get_settings()
    work_proof = f"payment-intent:{payment_id}:{intent.artifact_id}"
    native_amount = _to_native_usdc_units(intent.amount_usd)
    buyer_address = intent.buyer_address
    deposit_address = intent.deposit_address
    mock_sender = (
        buyer_address
        if _looks_like_evm_address(buyer_address)
        else "0x00000000000000000000000000000000000000bb"
    )

    receipt_fetcher = None
    transaction_fetcher = None
    if "mock" in tx_hash.lower():

        def receipt_fetcher(value: str) -> dict[str, object]:
            return _mock_receipt(
                value,
                sender=mock_sender,
                receiver=deposit_address,
                native_amount=native_amount,
            )

        def transaction_fetcher(value: str) -> dict[str, object]:
            return _mock_transaction(
                value,
                sender=mock_sender,
                receiver=deposit_address,
                native_amount=native_amount,
            )

    settlement_result = verify_settlement(
        SettlementRequest(
            payment_intent_id=payment_id,
            job_id=str(intent.job_id or intent.artifact_id),
            agent_id="consumer_01",
            amount=float(intent.amount_usd),
            tx_hash=tx_hash,
            expected_sender=buyer_address if _looks_like_evm_address(buyer_address) else None,
            expected_receiver=deposit_address,
            expected_token_address=settings.arc_native_usdc_token_address,
            work_proof=work_proof,
            timeout_s=settings.marketplace_settlement_timeout_s,
        ),
        receipt_fetcher=receipt_fetcher,
        transaction_fetcher=transaction_fetcher,
    )

    updated = _update_payment_intent(
        intent,
        status="verified" if settlement_result.status == "SETTLED" else "failed",
        settlement_status=settlement_result.status,
        reason=settlement_result.reason or None,
        tx_hash=tx_hash,
    )

    return PaymentVerificationResponse(
        payment_id=payment_id,
        status=updated.status,
        unlocked_artifact_id=updated.artifact_id if updated.status == "verified" else None,
        settlement_status=updated.settlement_status,
        reason=updated.reason,
    )


def _resolve_programmatic_source_address(intent: PaymentIntentRecord) -> str:
    settings = get_settings()
    circle_client.ensure_wallets_loaded()

    candidate = intent.buyer_address.strip()
    if _looks_like_evm_address(candidate):
        return candidate

    if candidate:
        wallet_by_role = circle_client.get_wallet_address(candidate)
        if wallet_by_role:
            return wallet_by_role

    fallback = circle_client.get_wallet_address(settings.demo_buyer_wallet_role)
    if fallback:
        return fallback

    raise HTTPException(
        status_code=409,
        detail=(
            "Programmatic settlement requires a known Circle wallet address or "
            "a configured demo buyer wallet role."
        ),
    )


def pay_payment_intent(payment_id: str) -> PaymentPayResponse:
    settings = get_settings()
    if not settings.autonomous_payments_enabled:
        raise HTTPException(
            status_code=409,
            detail="Autonomous payments are disabled. Use the manual settlement flow.",
        )

    intent = _require_payment_intent(payment_id)
    if intent.status == "verified" and intent.tx_hash:
        return PaymentPayResponse(
            payment_id=intent.payment_id,
            status=intent.status,
            settlement_status=intent.settlement_status,
            tx_hash=intent.tx_hash,
            circle_transaction_id=intent.circle_transaction_id,
            reason=intent.reason,
        )

    source_address = _resolve_programmatic_source_address(intent)
    circle_transaction_id = intent.circle_transaction_id

    try:
        transfer = circle_client.create_transfer(
            wallet_address=source_address,
            destination_address=intent.deposit_address,
            amount=_format_usdc_amount(intent.amount_usd),
            token_address=settings.arc_native_usdc_token_address,
        )

        circle_transaction_id = str(transfer.get("data", {}).get("id", "")).strip() or None
        if not circle_transaction_id:
            raise RuntimeError("Circle did not return a transaction id.")

        updated = _update_payment_intent(
            intent,
            circle_transaction_id=circle_transaction_id,
            settlement_status=str(transfer.get("data", {}).get("state", "PENDING")).upper(),
        )

        state = str(transfer.get("data", {}).get("state", "")).upper()
        tx_hash = str(transfer.get("data", {}).get("txHash", "")).strip()
        if state not in circle_client.TERMINAL_STATES or not tx_hash:
            final_transaction = circle_client.wait_for_transaction(circle_transaction_id)
            state = str(final_transaction.get("state", "")).upper()
            tx_hash = str(final_transaction.get("txHash", "")).strip() or tx_hash

        if state != "COMPLETE" or not tx_hash:
            failed = _update_payment_intent(
                updated,
                status="failed",
                settlement_status=state or "FAILED",
                tx_hash=tx_hash or None,
                reason=(
                    "Circle transfer did not complete successfully. "
                    f"Final state: {state or 'unknown'}"
                ),
            )
            return PaymentPayResponse(
                payment_id=failed.payment_id,
                status=failed.status,
                settlement_status=failed.settlement_status,
                tx_hash=failed.tx_hash,
                circle_transaction_id=failed.circle_transaction_id,
                reason=failed.reason,
            )

        verification = verify_payment_intent(payment_id, tx_hash)
        paid_intent = _require_payment_intent(payment_id)
        if verification.status == "verified" and paid_intent.job_id:
            ensure_job_paid(paid_intent.job_id)

        return PaymentPayResponse(
            payment_id=paid_intent.payment_id,
            status=paid_intent.status,
            settlement_status=paid_intent.settlement_status,
            tx_hash=paid_intent.tx_hash,
            circle_transaction_id=paid_intent.circle_transaction_id,
            reason=paid_intent.reason,
        )
    except HTTPException:
        raise
    except Exception as exc:
        _update_payment_intent(
            intent,
            status="failed",
            settlement_status="FAILED",
            reason=str(exc),
            circle_transaction_id=circle_transaction_id,
        )
        raise HTTPException(status_code=502, detail=f"Programmatic payment failed: {exc}") from exc


def unlock_payment_intent(payment_id: str, artifact_id: str) -> JobExecutionResponse:
    intent = _require_payment_intent(payment_id)

    if intent.artifact_id != artifact_id:
        raise HTTPException(
            status_code=409,
            detail="Payment intent does not match requested artifact.",
        )

    if intent.status != "verified":
        raise HTTPException(status_code=402, detail="Payment required to unlock this job.")

    if intent.executed and intent.download_url:
        return JobExecutionResponse(
            artifact_id=artifact_id,
            status="completed",
            message=intent.execution_message or "Artifact already unlocked.",
            download_url=intent.download_url,
        )

    execution = JobExecutionResponse(
        artifact_id=artifact_id,
        status="completed",
        message="Job executed successfully after payment verification.",
        download_url=f"/api/artifacts/{artifact_id}/download",
    )
    _update_payment_intent(
        intent,
        executed=True,
        download_url=execution.download_url,
        execution_message=execution.message,
    )
    return execution


def unlock_and_deliver_payment_intent(payment_id: str) -> PaymentIntentRecord:
    intent = _require_payment_intent(payment_id)
    unlock_payment_intent(payment_id, intent.artifact_id)
    if intent.job_id:
        advance_job_to_delivered(intent.job_id)
    return _require_payment_intent(payment_id)


@router.get("/catalog", response_model=list[BillableArtifact])
def get_catalog():
    return list(ARTIFACT_CATALOG.values())


@router.get("/orders", response_model=list[PaymentIntentRecord])
def get_orders():
    return list_payment_intents()


@router.post("/intent", response_model=PaymentIntentResponse)
def create_payment_intent(request: PaymentIntentRequest):
    intent = create_checkout(
        request.artifact_id,
        request.buyer_address,
        job_id=request.job_id,
    )
    return PaymentIntentResponse(
        payment_id=intent.payment_id,
        amount_usd=intent.amount_usd,
        deposit_address=intent.deposit_address,
        status=intent.status,
        job_id=intent.job_id,
    )


@router.post("/pay", response_model=PaymentPayResponse)
def pay_payment(request: PaymentPayRequest):
    return pay_payment_intent(request.payment_id)


@router.post("/verify", response_model=PaymentVerificationResponse)
def verify_payment(request: PaymentVerificationRequest):
    return verify_payment_intent(request.payment_id, request.tx_hash)


@router.post("/execute", response_model=JobExecutionResponse)
def execute_job(request: JobExecutionRequest):
    return unlock_payment_intent(request.payment_id, request.artifact_id)
