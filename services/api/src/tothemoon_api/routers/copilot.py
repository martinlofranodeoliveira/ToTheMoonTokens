from __future__ import annotations

import asyncio
import json
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import current_user_from_jwt, verify_api_key
from ..database import get_db
from ..db_models import ApiKey, CopilotProposal, Organization, User
from ..quota import enforce_quota
from ..simulation import OrderRequest, TradeSide, simulate_trade
from ..tenancy import primary_org_for_user

router = APIRouter(prefix="/api/v1/copilot", tags=["Copilot"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user_from_jwt)]
VerifiedApiKey = Annotated[ApiKey, Depends(verify_api_key)]


class CopilotProposalCreate(BaseModel):
    token_address: str = Field(min_length=3, max_length=128)
    chain: str = Field("unknown", min_length=2, max_length=40)
    symbol: str | None = Field(default=None, max_length=40)
    side: TradeSide = TradeSide.BUY
    amount_usd: Decimal = Field(gt=0, le=1_000_000)
    score: float = Field(default=0.0, ge=0, le=100)
    rationale: str = Field(min_length=1, max_length=2000)
    mode: Literal["paper", "real"] = "paper"


def _proposal_payload(proposal: CopilotProposal) -> dict[str, object]:
    return {
        "id": proposal.id,
        "org_id": proposal.org_id,
        "token_address": proposal.token_address,
        "chain": proposal.chain,
        "symbol": proposal.symbol,
        "side": proposal.side,
        "amount_usd": float(proposal.amount_usd),
        "score": proposal.score,
        "rationale": proposal.rationale,
        "mode": proposal.mode,
        "status": proposal.status,
        "execution_payload": proposal.execution_payload,
        "created_at": proposal.created_at,
        "updated_at": proposal.updated_at,
        "approved_at": proposal.approved_at,
    }


def _org_for_api_key(api_key: ApiKey) -> Organization:
    if api_key.organization is None:
        raise HTTPException(status_code=403, detail="API key is not scoped to an organization")
    return api_key.organization


@router.post("/proposals", status_code=201)
def create_proposal(
    payload: CopilotProposalCreate,
    api_key: VerifiedApiKey,
    db: DbSession,
) -> dict[str, object]:
    org = _org_for_api_key(api_key)
    if payload.mode == "real" and not org.real_mode_enabled:
        raise HTTPException(status_code=403, detail="Real mode is disabled for this organization")

    proposal = CopilotProposal(
        org_id=org.id,
        api_key_id=api_key.id,
        token_address=payload.token_address,
        chain=payload.chain.lower(),
        symbol=payload.symbol,
        side=payload.side.value,
        amount_usd=payload.amount_usd,
        score=payload.score,
        rationale=payload.rationale,
        mode=payload.mode,
        status="pending",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return {"proposal": _proposal_payload(proposal)}


@router.get("/proposals")
def list_proposals(user: CurrentUser, db: DbSession) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    db.commit()
    rows = (
        db.query(CopilotProposal)
        .filter(CopilotProposal.org_id == org.id)
        .order_by(CopilotProposal.created_at.desc(), CopilotProposal.id.desc())
        .limit(100)
        .all()
    )
    return {"org_id": org.id, "proposals": [_proposal_payload(row) for row in rows]}


@router.post("/proposals/{proposal_id}/approve")
def approve_proposal(
    proposal_id: int,
    user: CurrentUser,
    db: DbSession,
) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    proposal = (
        db.query(CopilotProposal)
        .filter(CopilotProposal.id == proposal_id, CopilotProposal.org_id == org.id)
        .first()
    )
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != "pending":
        raise HTTPException(status_code=409, detail="Proposal is not pending")
    if proposal.mode == "real":
        if not org.real_mode_enabled:
            raise HTTPException(status_code=403, detail="Real mode is disabled for this organization")
        proposal.status = "approved_manual_required"
        proposal.approved_at = datetime.utcnow()
        proposal.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(proposal)
        return {"proposal": _proposal_payload(proposal)}

    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.id == proposal.api_key_id, ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
        .first()
    )
    if api_key is None:
        raise HTTPException(status_code=409, detail="Proposal API key is unavailable")
    order = OrderRequest(
        token_address=proposal.token_address,
        amount=float(proposal.amount_usd),
        side=TradeSide(proposal.side),
    )
    enforce_quota(api_key, "simulate_order", db, simulated_volume_usd=proposal.amount_usd)
    result = simulate_trade(order, api_key=api_key, db=db)
    org.bot_consecutive_failures = 0
    proposal.status = "executed"
    proposal.approved_at = datetime.utcnow()
    proposal.updated_at = datetime.utcnow()
    proposal.execution_payload = result.model_dump(mode="json")
    db.commit()
    db.refresh(proposal)
    return {"proposal": _proposal_payload(proposal)}


@router.post("/circuit-breaker/failures")
def record_failure(api_key: VerifiedApiKey, db: DbSession) -> dict[str, object]:
    org = _org_for_api_key(api_key)
    org.bot_consecutive_failures += 1
    tripped = org.bot_consecutive_failures >= 3
    if tripped:
        org.real_mode_enabled = False
    db.commit()
    db.refresh(org)
    return {
        "org_id": org.id,
        "bot_consecutive_failures": org.bot_consecutive_failures,
        "real_mode_enabled": org.real_mode_enabled,
        "circuit_breaker_tripped": tripped,
    }


@router.get("/stream")
async def stream_proposals(
    user: CurrentUser,
    db: DbSession,
    once: bool = Query(False),
) -> StreamingResponse:
    org = primary_org_for_user(user, db)
    db.commit()

    async def events():
        last_seen = 0
        while True:
            rows = (
                db.query(CopilotProposal)
                .filter(CopilotProposal.org_id == org.id, CopilotProposal.id > last_seen)
                .order_by(CopilotProposal.id.asc())
                .limit(25)
                .all()
            )
            for row in rows:
                last_seen = max(last_seen, int(row.id))
                yield f"event: proposal\ndata: {json.dumps(_proposal_payload(row), default=str)}\n\n"
            if once:
                break
            await asyncio.sleep(2)

    return StreamingResponse(events(), media_type="text/event-stream")
