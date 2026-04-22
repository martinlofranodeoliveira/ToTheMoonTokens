import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from .circle import circle_client
from .models import (
    BillableArtifact,
    JobExecutionRequest,
    JobExecutionResponse,
    PaymentIntentRequest,
    PaymentIntentResponse,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])

ARTIFACT_CATALOG: dict[str, BillableArtifact] = {
    "artifact_backtest_report": BillableArtifact(
        id="artifact_backtest_report",
        name="Backtest Report",
        description="Comprehensive backtest report with performance metrics.",
        price_usd=5.00,
        type="backtest_report",
    ),
    "artifact_walk_forward": BillableArtifact(
        id="artifact_walk_forward",
        name="Walk Forward Analysis",
        description="Detailed walk-forward analysis for strategy validation.",
        price_usd=10.00,
        type="walk_forward_report",
    ),
    "artifact_live_signal": BillableArtifact(
        id="artifact_live_signal",
        name="Live Trade Signal",
        description="Real-time trade signal generation.",
        price_usd=15.00,
        type="live_trade_signal",
    ),
}

# In-memory storage for testnet/mock
_PAYMENT_INTENTS: dict[str, dict[str, Any]] = {}
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

    deposit_address = circle_client.get_wallet_address("TREASURY") or "0xMockDepositAddressForTestnetOnly"

    intent = {
        "payment_id": payment_id,
        "artifact_id": request.artifact_id,
        "amount_usd": artifact.price_usd,
        "buyer_address": request.buyer_address,
        "deposit_address": deposit_address,
        "status": "pending",
    }
    _PAYMENT_INTENTS[payment_id] = intent

    return PaymentIntentResponse(
        payment_id=str(intent["payment_id"]),
        amount_usd=float(str(intent["amount_usd"])),
        deposit_address=str(intent["deposit_address"]),
        status=str(intent["status"])  # type: ignore
    )


@router.get("/intent/{payment_id}", response_model=PaymentIntentResponse)
def get_payment_intent(payment_id: str):
    if payment_id not in _PAYMENT_INTENTS:
        raise HTTPException(status_code=404, detail="Payment intent not found")
        
    intent = _PAYMENT_INTENTS[payment_id]
    return PaymentIntentResponse(
        payment_id=str(intent["payment_id"]),
        amount_usd=float(str(intent["amount_usd"])),
        deposit_address=str(intent["deposit_address"]),
        status=str(intent["status"])  # type: ignore
    )


@router.get("/intents", response_model=list[dict])
def list_payment_intents(buyer_address: str):
    intents = [
        intent for intent in _PAYMENT_INTENTS.values()
        if intent.get("buyer_address") == buyer_address
    ]
    return intents

@router.post("/verify", response_model=PaymentVerificationResponse)
def verify_payment(request: PaymentVerificationRequest):
    if request.payment_id not in _PAYMENT_INTENTS:
        raise HTTPException(status_code=404, detail="Payment intent not found")

    intent = _PAYMENT_INTENTS[request.payment_id]
    
    if intent.get("status") == "verified":
        return PaymentVerificationResponse(
            payment_id=request.payment_id,
            status=intent["status"],
            unlocked_artifact_id=intent["artifact_id"],
        )

    # Mock verification logic: any tx_hash starting with "0x" is valid in testnet
    if request.tx_hash and request.tx_hash.startswith("0x"):
        intent["status"] = "verified"
        _UNLOCKED_JOBS[intent["artifact_id"]] = True
    else:
        intent["status"] = "failed"

    return PaymentVerificationResponse(
        payment_id=request.payment_id,
        status=intent["status"],
        unlocked_artifact_id=intent["artifact_id"] if intent["status"] == "verified" else None,
    )

@router.post("/execute", response_model=JobExecutionResponse)
def execute_job(request: JobExecutionRequest):
    if not _UNLOCKED_JOBS.get(request.artifact_id):
        raise HTTPException(
            status_code=402,
            detail="Payment required to unlock this job."
        )

    return JobExecutionResponse(
        artifact_id=request.artifact_id,
        status="completed",
        message="Job executed successfully after payment verification.",
        download_url=f"/api/artifacts/{request.artifact_id}/download"
    )

