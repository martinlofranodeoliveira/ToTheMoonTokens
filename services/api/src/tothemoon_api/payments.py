import uuid

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

ARTIFACT_CATALOG: dict[str, BillableArtifact] = {
    "artifact_delivery_packet": BillableArtifact(
        id="artifact_delivery_packet",
        name="Delivery Packet",
        description="Reviewed delivery packet with execution summary and unlock metadata.",
        price_usd=5.00,
        type="delivery_packet",
    ),
    "artifact_review_bundle": BillableArtifact(
        id="artifact_review_bundle",
        name="Review Bundle",
        description="Reviewer-approved evidence bundle with settlement and quality checkpoints.",
        price_usd=10.00,
        type="review_bundle",
    ),
    "artifact_market_intel_brief": BillableArtifact(
        id="artifact_market_intel_brief",
        name="Market Intelligence Brief",
        description="Premium market context brief packaged for the live hackathon flow.",
        price_usd=15.00,
        type="market_intel_brief",
    ),
}

# In-memory storage for testnet/mock
_PAYMENT_INTENTS: dict[str, dict] = {}
_UNLOCKED_JOBS: dict[str, bool] = {}


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

    def _mock_receipt(tx_hash: str) -> dict[str, object]:
        return {
            "status": "0x1",
            "to": str(intent["deposit_address"]),
            "transactionHash": tx_hash,
        }

    receipt_fetcher = _mock_receipt if "mock" in request.tx_hash.lower() else None
    settlement_result = verify_settlement(
        SettlementRequest(
            payment_intent_id=request.payment_id,
            job_id=str(intent["job_id"] or artifact_id),
            agent_id="consumer_01",
            amount=float(intent["amount_usd"]),
            tx_hash=request.tx_hash,
            expected_receiver=str(intent["deposit_address"]),
            work_proof=work_proof,
            timeout_s=settings.marketplace_settlement_timeout_s,
        ),
        receipt_fetcher=receipt_fetcher,
    )

    if settlement_result.status == "SETTLED":
        intent["status"] = "verified"
        intent["tx_hash"] = request.tx_hash
        _UNLOCKED_JOBS[intent["artifact_id"]] = True
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
    if not _UNLOCKED_JOBS.get(request.artifact_id):
        raise HTTPException(status_code=402, detail="Payment required to unlock this job.")

    return JobExecutionResponse(
        artifact_id=request.artifact_id,
        status="completed",
        message="Job executed successfully after payment verification.",
        download_url=f"/api/artifacts/{request.artifact_id}/download",
    )
