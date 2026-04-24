import uuid
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, HTTPException

from .circle import circle_client
from .config import get_settings
from .models import (
    BillableArtifact,
    JobExecutionRequest,
    JobExecutionResponse,
    PaymentIntentRequest,
    PaymentIntentResponse,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
)
from .settlement import SettlementRequest, verify_settlement

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

# In-memory storage for testnet/mock
_PAYMENT_INTENTS: dict[str, dict] = {}


@router.get("/catalog", response_model=list[BillableArtifact])
def get_catalog():
    return list(ARTIFACT_CATALOG.values())


@router.post("/intent", response_model=PaymentIntentResponse)
def create_payment_intent(request: PaymentIntentRequest):
    if request.artifact_id not in ARTIFACT_CATALOG:
        raise HTTPException(status_code=404, detail="Artifact not found")

    artifact = ARTIFACT_CATALOG[request.artifact_id]
    payment_id = str(uuid.uuid4())

    deposit_address = (
        circle_client.get_wallet_address("TREASURY") or "0xMockDepositAddressForTestnetOnly"
    )

    intent = {
        "payment_id": payment_id,
        "artifact_id": request.artifact_id,
        "amount_usd": artifact.price_usd,
        "buyer_address": request.buyer_address,
        "deposit_address": deposit_address,
        "status": "pending",
        "job_id": request.job_id,
        "tx_hash": None,
        "executed": False,
    }
    _PAYMENT_INTENTS[payment_id] = intent

    return PaymentIntentResponse(
        payment_id=str(intent["payment_id"]),
        amount_usd=float(intent["amount_usd"]),  # type: ignore
        deposit_address=str(intent["deposit_address"]),
        status=str(intent["status"]),  # type: ignore
        job_id=request.job_id,
    )


@router.post("/verify", response_model=PaymentVerificationResponse)
def verify_payment(request: PaymentVerificationRequest):
    if request.payment_id not in _PAYMENT_INTENTS:
        raise HTTPException(status_code=404, detail="Payment intent not found")

    intent = _PAYMENT_INTENTS[request.payment_id]
    if intent["status"] == "verified" and intent["tx_hash"] == request.tx_hash:
        return PaymentVerificationResponse(
            payment_id=request.payment_id,
            status="verified",
            unlocked_artifact_id=intent["artifact_id"],
            settlement_status="SETTLED",
        )

    settings = get_settings()
    artifact_id = str(intent["artifact_id"])
    work_proof = f"payment-intent:{request.payment_id}:{artifact_id}"
    buyer_address = str(intent["buyer_address"])
    deposit_address = str(intent["deposit_address"])
    native_amount = _to_native_usdc_units(float(intent["amount_usd"]))
    mock_sender = (
        buyer_address
        if _looks_like_evm_address(buyer_address)
        else "0x00000000000000000000000000000000000000bb"
    )

    def _mock_receipt(tx_hash: str) -> dict[str, object]:
        return {
            "status": "0x1",
            "from": mock_sender,
            "to": deposit_address,
            "transactionHash": tx_hash,
            "value": hex(native_amount),
            "logs": [
                {
                    "address": "0x1800000000000000000000000000000000000000",
                    "topics": [
                        "0x62f084c00a442dcf51cdbb51beed2839bf42a268da8474b0e98f38edb7db5a22",
                        f"0x{'0' * 24}{mock_sender[2:]}",
                        f"0x{'0' * 24}{deposit_address[2:]}",
                    ],
                    "data": hex(native_amount),
                }
            ],
        }

    def _mock_transaction(tx_hash: str) -> dict[str, object]:
        return {
            "hash": tx_hash,
            "from": mock_sender,
            "to": deposit_address,
            "value": hex(native_amount),
        }

    receipt_fetcher = _mock_receipt if "mock" in request.tx_hash.lower() else None
    transaction_fetcher = _mock_transaction if "mock" in request.tx_hash.lower() else None
    settlement_result = verify_settlement(
        SettlementRequest(
            payment_intent_id=request.payment_id,
            job_id=str(intent["job_id"] or artifact_id),
            agent_id="consumer_01",
            amount=float(intent["amount_usd"]),
            tx_hash=request.tx_hash,
            expected_sender=buyer_address if _looks_like_evm_address(buyer_address) else None,
            expected_receiver=deposit_address,
            expected_token_address=settings.arc_native_usdc_token_address,
            work_proof=work_proof,
            timeout_s=settings.marketplace_settlement_timeout_s,
        ),
        receipt_fetcher=receipt_fetcher,
        transaction_fetcher=transaction_fetcher,
    )

    if settlement_result.status == "SETTLED":
        intent["status"] = "verified"
        intent["tx_hash"] = request.tx_hash
    else:
        intent["status"] = "failed"
        intent["tx_hash"] = request.tx_hash

    return PaymentVerificationResponse(
        payment_id=request.payment_id,
        status=intent["status"],
        unlocked_artifact_id=intent["artifact_id"] if intent["status"] == "verified" else None,
        settlement_status=settlement_result.status,
        reason=settlement_result.reason,
    )


@router.post("/execute", response_model=JobExecutionResponse)
def execute_job(request: JobExecutionRequest):
    intent = _PAYMENT_INTENTS.get(request.payment_id)
    if not intent:
        raise HTTPException(status_code=404, detail="Payment intent not found.")

    if str(intent["artifact_id"]) != request.artifact_id:
        raise HTTPException(
            status_code=409, detail="Payment intent does not match requested artifact."
        )

    if intent["status"] != "verified":
        raise HTTPException(status_code=402, detail="Payment required to unlock this job.")

    intent["executed"] = True

    return JobExecutionResponse(
        artifact_id=request.artifact_id,
        status="completed",
        message="Job executed successfully after payment verification.",
        download_url=f"/api/artifacts/{request.artifact_id}/download",
    )
