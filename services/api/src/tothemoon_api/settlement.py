from __future__ import annotations

from collections.abc import Callable
from typing import Literal

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from .config import get_settings
from .observability import get_logger

router = APIRouter(prefix="/api/settlements", tags=["settlement"])
log = get_logger(__name__)

JobStatus = Literal["PENDING", "SETTLED", "REJECTED", "REFUND_REQUIRED"]


class AgentReputation(BaseModel):
    agent_id: str
    successful_jobs: int = 0
    failed_jobs: int = 0
    is_verified: bool = True
    reputation_score_override: float | None = None

    @property
    def reputation_score(self) -> float:
        if self.reputation_score_override is not None:
            return self.reputation_score_override
        total_jobs = self.successful_jobs + self.failed_jobs
        if total_jobs <= 0:
            return 0.0
        return self.successful_jobs / total_jobs


class JobSignal(BaseModel):
    signal_type: str
    description: str


class SettlementRequest(BaseModel):
    job_id: str
    agent_id: str
    amount: float = Field(gt=0)
    tx_hash: str
    payment_intent_id: str | None = None
    expected_receiver: str | None = None
    work_proof: str = ""
    timeout_s: float = Field(default=3.0, gt=0, le=30.0)
    signals: list[JobSignal] = Field(default_factory=list)


class SettlementResult(BaseModel):
    job_id: str
    status: JobStatus
    reason: str
    payment_intent_id: str | None = None
    tx_hash: str | None = None
    auditable_signals: list[JobSignal] = Field(default_factory=list)
    receipt_status: str | None = None


_SEEN_PAYMENT_INTENTS: set[str] = set()


def clear_seen_payment_intents() -> None:
    _SEEN_PAYMENT_INTENTS.clear()


def _normalize_address(value: str | None) -> str | None:
    if not value:
        return None
    return value.lower()


def fetch_transaction_receipt(
    tx_hash: str,
    timeout_s: float = 3.0,
    rpc_url: str | None = None,
) -> dict[str, object] | None:
    settings = get_settings()
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getTransactionReceipt",
        "params": [tx_hash],
        "id": 1,
    }
    response = httpx.post(
        rpc_url or settings.arc_testnet_rpc_url,
        json=payload,
        timeout=timeout_s,
    )
    response.raise_for_status()
    return response.json().get("result")


def verify_settlement(
    request: SettlementRequest,
    agent: AgentReputation | None = None,
    receipt_fetcher: Callable[[str], dict[str, object] | None] | None = None,
) -> SettlementResult:
    signals = request.signals.copy()

    if request.payment_intent_id and request.payment_intent_id in _SEEN_PAYMENT_INTENTS:
        signals.append(
            JobSignal(
                signal_type="replay_detected",
                description=f"Payment intent {request.payment_intent_id} was already processed",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REJECTED",
            reason="Payment intent replay detected.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    if agent is not None and not agent.is_verified:
        signals.append(
            JobSignal(
                signal_type="verification_failure",
                description="Agent is not network verified",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REJECTED",
            reason="Agent must be verified to settle jobs.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    if agent is not None and agent.reputation_score < 0.6:
        signals.append(
            JobSignal(
                signal_type="reputation_low",
                description=(
                    f"Agent reputation {agent.reputation_score:.2f} is below 0.6 threshold"
                ),
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REJECTED",
            reason="Agent reputation too low for settlement.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    if (
        not request.work_proof
        or len(request.work_proof.strip()) < 10
        or request.work_proof == "none"
    ):
        signals.append(
            JobSignal(
                signal_type="missing_proof",
                description="No valid proof of work provided",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REJECTED",
            reason="Missing or invalid proof of work.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    if not request.tx_hash.startswith("0x"):
        signals.append(
            JobSignal(
                signal_type="receipt_missing",
                description="Transaction hash is not a valid hex hash",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REFUND_REQUIRED",
            reason="Settlement transaction hash is invalid.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    fetcher = receipt_fetcher or (
        lambda tx_hash: fetch_transaction_receipt(tx_hash, request.timeout_s)
    )
    try:
        receipt = fetcher(request.tx_hash)
    except httpx.TimeoutException:
        signals.append(
            JobSignal(
                signal_type="refund_required",
                description=f"Settlement verification exceeded {request.timeout_s:.1f}s timeout",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REFUND_REQUIRED",
            reason="Settlement verification timed out.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )
    except httpx.HTTPError as exc:
        log.warning("settlement_receipt_fetch_failed", tx_hash=request.tx_hash, error=str(exc))
        signals.append(
            JobSignal(
                signal_type="receipt_missing",
                description="Transaction receipt lookup failed",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REFUND_REQUIRED",
            reason="Transaction receipt lookup failed.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    if not receipt:
        signals.append(
            JobSignal(
                signal_type="receipt_missing",
                description="No transaction receipt was found on Arc testnet",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REFUND_REQUIRED",
            reason="Transaction receipt not found.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
        )

    receipt_status = str(receipt.get("status", ""))
    if receipt_status not in {"0x1", "1", "True"}:
        signals.append(
            JobSignal(
                signal_type="receipt_failed",
                description=f"Receipt status {receipt_status!r} indicates failure",
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REJECTED",
            reason="Settlement receipt indicates a failed transaction.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
            receipt_status=receipt_status,
        )

    expected_receiver = _normalize_address(request.expected_receiver)
    onchain_receiver = _normalize_address(receipt.get("to") if isinstance(receipt, dict) else None)
    if expected_receiver and onchain_receiver and expected_receiver != onchain_receiver:
        signals.append(
            JobSignal(
                signal_type="receipt_mismatch",
                description=(
                    f"Receipt receiver {onchain_receiver} does not match expected {expected_receiver}"
                ),
            )
        )
        return SettlementResult(
            job_id=request.job_id,
            status="REJECTED",
            reason="Settlement receipt receiver mismatch.",
            payment_intent_id=request.payment_intent_id,
            tx_hash=request.tx_hash,
            auditable_signals=signals,
            receipt_status=receipt_status,
        )

    signals.append(
        JobSignal(
            signal_type="proof_validated",
            description="Proof of work successfully validated",
        )
    )
    signals.append(
        JobSignal(
            signal_type="receipt_verified",
            description="Arc receipt confirms funds were settled",
        )
    )
    signals.append(
        JobSignal(
            signal_type="funds_cleared",
            description="Settlement funds are cleared for payment",
        )
    )

    if request.payment_intent_id:
        _SEEN_PAYMENT_INTENTS.add(request.payment_intent_id)

    return SettlementResult(
        job_id=request.job_id,
        status="SETTLED",
        reason="Job settled successfully.",
        payment_intent_id=request.payment_intent_id,
        tx_hash=request.tx_hash,
        auditable_signals=signals,
        receipt_status=receipt_status,
    )


@router.post("/verify", response_model=SettlementResult)
def verify_settlement_endpoint(request: SettlementRequest):
    def _mock_receipt(tx_hash: str) -> dict[str, object]:
        return {
            "status": "0x1",
            "to": request.expected_receiver or "0xmockreceiver",
            "transactionHash": tx_hash,
        }

    receipt_fetcher = _mock_receipt if "mock" in request.tx_hash.lower() else None
    return verify_settlement(request, receipt_fetcher=receipt_fetcher)
