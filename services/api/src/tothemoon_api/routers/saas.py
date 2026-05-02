from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Annotated
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import audit_log_response, record_audit_log
from ..auth import (
    create_jwt_for_user,
    current_user_from_jwt,
    generate_api_key,
    hash_password,
    verify_password,
)
from ..database import get_db
from ..db_models import ApiKey, AuditLog, SimulatedTrade, User
from ..observability import enforce_rate_limit
from ..quota import usage_summary
from ..simulation import position_response
from ..tenancy import create_default_org_for_user, primary_org_for_user

router = APIRouter(prefix="/api/v1", tags=["SaaS"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user_from_jwt)]


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=256)


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


def _rate_limit_auth(request: Request) -> Response | None:
    return enforce_rate_limit(request, limit=10, window_seconds=60)


@router.post("/auth/signup", response_model=None, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    request: Request,
    db: DbSession,
) -> dict[str, object] | Response:
    limited = _rate_limit_auth(request)
    if limited:
        return limited

    email = str(payload.email).lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    org = create_default_org_for_user(user, db)
    record_audit_log(
        db,
        org_id=org.id,
        actor_id=user.id,
        action="auth.signup",
        target_type="user",
        target_id=user.id,
        request=request,
        after={"email": user.email, "org_id": org.id, "plan": org.plan.code},
    )
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "org_id": org.id,
        "plan": org.plan.code,
        "created_at": user.created_at,
    }


@router.post("/auth/login", response_model=None)
async def login(
    request: Request,
    db: DbSession,
) -> dict[str, str] | Response:
    limited = _rate_limit_auth(request)
    if limited:
        return limited

    form = parse_qs((await request.body()).decode())
    username = form.get("username", [""])[0].strip().lower()
    password = form.get("password", [""])[0]
    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    user = db.query(User).filter(User.email == username).first()
    if not user or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    org = primary_org_for_user(user, db)
    record_audit_log(
        db,
        org_id=org.id,
        actor_id=user.id,
        action="auth.login",
        target_type="user",
        target_id=user.id,
        request=request,
        after={"email": user.email, "org_id": org.id},
    )
    db.commit()
    return {"access_token": create_jwt_for_user(user), "token_type": "bearer"}


@router.get("/saas/account")
def account(user: CurrentUser, db: DbSession) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    db.commit()
    return {
        "email": user.email,
        "org_id": org.id,
        "organization": org.name,
        "plan": org.plan.code,
        "created_at": user.created_at,
    }


@router.get("/saas/dashboard")
def dashboard(user: CurrentUser, db: DbSession) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    db.commit()
    summary = usage_summary(org.id, db)
    trades = db.query(SimulatedTrade).filter(SimulatedTrade.org_id == org.id).all()
    open_trades = [trade for trade in trades if trade.status == "OPEN"]
    total_volume = sum((trade.amount for trade in trades), Decimal("0"))
    total_fees = sum((trade.fees_total for trade in trades), Decimal("0"))
    realized_pnl = sum(
        (trade.realized_pnl_usd for trade in trades if trade.realized_pnl_usd is not None),
        Decimal("0"),
    )
    unrealized_pnl = sum(
        (Decimal(str(position_response(trade).unrealized_pnl_usd)) for trade in open_trades),
        Decimal("0"),
    )
    chart_start = date.today() - timedelta(days=29)
    chart_points: list[dict[str, object]] = []
    for offset in range(30):
        chart_day = chart_start + timedelta(days=offset)
        day_trades = [trade for trade in trades if trade.created_at.date() == chart_day]
        day_volume = sum((trade.amount for trade in day_trades), Decimal("0"))
        chart_points.append(
            {
                "date": chart_day.isoformat(),
                "trades": len(day_trades),
                "volume_usd": round(float(day_volume), 6),
            }
        )
    return {
        "email": user.email,
        "org_id": org.id,
        "plan": org.plan.code,
        "requests_this_month": summary["requests_month"],
        "simulated_volume_usd": round(float(total_volume), 6),
        "total_simulated_trades": len(trades),
        "total_volume_usd": round(float(total_volume), 6),
        "total_fees_usd": round(float(total_fees), 6),
        "realized_pnl_usd": round(float(realized_pnl), 6),
        "unrealized_pnl_usd": round(float(unrealized_pnl), 6),
        "last_30_days_chart_points": chart_points,
        "active_api_keys": (
            db.query(func.count(ApiKey.id))
            .filter(ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
            .scalar()
            or 0
        ),
    }


@router.get("/saas/usage")
def usage(user: CurrentUser, db: DbSession) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    db.commit()
    summary = usage_summary(org.id, db)
    return {
        **summary,
        "plan": org.plan.code,
        "quota": {
            "simulate_order": org.plan.limit_for("simulate_order"),
            "token_audit": org.plan.limit_for("token_audit"),
            "active_api_keys": org.plan.active_api_key_limit,
        },
    }


@router.get("/saas/api-keys")
def list_api_keys(user: CurrentUser, db: DbSession) -> list[dict[str, object]]:
    org = primary_org_for_user(user, db)
    api_keys = (
        db.query(ApiKey)
        .filter(ApiKey.org_id == org.id)
        .order_by(ApiKey.created_at.desc(), ApiKey.id.desc())
        .all()
    )
    db.commit()
    return [
        {
            "id": key.id,
            "org_id": key.org_id,
            "name": key.name,
            "prefix": key.prefix,
            "scopes": key.scopes,
            "last_used_at": key.last_used_at,
            "revoked_at": key.revoked_at,
            "created_at": key.created_at,
        }
        for key in api_keys
    ]


@router.post("/saas/api-keys", status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreateRequest,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    active_key_limit = org.plan.active_api_key_limit
    active_keys = (
        db.query(func.count(ApiKey.id))
        .filter(ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
        .scalar()
        or 0
    )
    if active_key_limit >= 0 and active_keys >= active_key_limit:
        raise HTTPException(status_code=409, detail="Active API key limit reached")
    plaintext, prefix, key_hash = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        org_id=org.id,
        name=payload.name,
        prefix=prefix,
        key_hash=key_hash,
    )
    db.add(api_key)
    db.flush()
    record_audit_log(
        db,
        org_id=org.id,
        actor_id=user.id,
        action="api_key.created",
        target_type="api_key",
        target_id=api_key.id,
        request=request,
        before={"active_keys": active_keys},
        after={"id": api_key.id, "name": api_key.name, "prefix": api_key.prefix},
    )
    db.commit()
    db.refresh(api_key)
    return {
        "id": api_key.id,
        "org_id": api_key.org_id,
        "name": api_key.name,
        "prefix": api_key.prefix,
        "plaintext": plaintext,
    }


@router.delete("/saas/api-keys/{api_key_id}")
def revoke_api_key(
    api_key_id: int,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    api_key = db.query(ApiKey).filter(ApiKey.id == api_key_id, ApiKey.org_id == org.id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    before = {"revoked_at": api_key.revoked_at, "prefix": api_key.prefix}
    if api_key.revoked_at is None:
        api_key.revoked_at = datetime.utcnow()
    record_audit_log(
        db,
        org_id=api_key.org_id,
        actor_id=user.id,
        action="api_key.revoked",
        target_type="api_key",
        target_id=api_key.id,
        request=request,
        before=before,
        after={"revoked_at": api_key.revoked_at, "prefix": api_key.prefix},
    )
    db.commit()
    db.refresh(api_key)
    return {"id": api_key.id, "revoked_at": api_key.revoked_at}


@router.get("/saas/audit-log")
def audit_log(
    user: CurrentUser,
    db: DbSession,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    bounded_limit = max(1, min(limit, 100))
    bounded_offset = max(0, offset)
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.org_id == org.id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(bounded_offset)
        .limit(bounded_limit)
        .all()
    )
    db.commit()
    return {
        "org_id": org.id,
        "limit": bounded_limit,
        "offset": bounded_offset,
        "events": [audit_log_response(row) for row in rows],
    }
