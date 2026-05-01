from __future__ import annotations

import hashlib
import hmac
import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..audit import record_audit_log
from ..auth import current_user_from_jwt
from ..config import get_settings
from ..database import get_db
from ..db_models import Organization, Subscription, User
from ..tenancy import plan_by_code, primary_org_for_user

router = APIRouter(prefix="/api/v1", tags=["Billing"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user_from_jwt)]


class CheckoutRequest(BaseModel):
    plan_code: str = Field("pro", pattern="^(pro|enterprise)$")


def _verify_stripe_signature(payload: bytes, signature_header: str | None, secret: str) -> None:
    if not signature_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature")
    values: dict[str, list[str]] = {}
    for part in signature_header.split(","):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        values.setdefault(key, []).append(value)
    timestamp = values.get("t", [""])[0]
    signatures = values.get("v1", [])
    if not timestamp or not signatures:
        raise HTTPException(status_code=400, detail="Invalid Stripe-Signature")
    expected = hmac.new(
        secret.encode("utf-8"),
        timestamp.encode("utf-8") + b"." + payload,
        hashlib.sha256,
    ).hexdigest()
    if not any(hmac.compare_digest(expected, signature) for signature in signatures):
        raise HTTPException(status_code=400, detail="Invalid Stripe-Signature")


@router.post("/billing/checkout")
def create_checkout(
    payload: CheckoutRequest,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    plan = plan_by_code(db, payload.plan_code)
    record_audit_log(
        db,
        org_id=org.id,
        actor_id=user.id,
        action="billing.checkout.created",
        target_type="organization",
        target_id=org.id,
        request=request,
        before={"plan": org.plan.code},
        after={"requested_plan": plan.code},
    )
    db.commit()
    settings = get_settings()
    return {
        "url": (
            f"{settings.stripe_checkout_base_url}"
            f"?client_reference_id={org.id}&plan={plan.code}"
        ),
        "org_id": org.id,
        "plan": plan.code,
    }


@router.get("/saas/invoices")
def list_invoices(user: CurrentUser, db: DbSession) -> dict[str, object]:
    org = primary_org_for_user(user, db)
    db.commit()
    return {"org_id": org.id, "invoices": []}


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: DbSession,
    stripe_signature: Annotated[str | None, Header(alias="Stripe-Signature")] = None,
) -> dict[str, object]:
    payload = await request.body()
    settings = get_settings()
    _verify_stripe_signature(payload, stripe_signature, settings.stripe_webhook_secret)
    try:
        event = json.loads(payload.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc

    if event.get("type") != "checkout.session.completed":
        return {"received": True, "ignored": True}

    session = event.get("data", {}).get("object", {})
    metadata = session.get("metadata", {}) or {}
    org_id_value = session.get("client_reference_id") or metadata.get("org_id")
    plan_code = str(metadata.get("plan_code") or "pro")
    if not org_id_value:
        raise HTTPException(status_code=400, detail="Missing organization reference")

    org = db.query(Organization).filter(Organization.id == int(org_id_value)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    previous_plan = org.plan.code
    plan = plan_by_code(db, plan_code)
    org.plan_id = plan.id

    subscription = db.query(Subscription).filter(Subscription.org_id == org.id).first()
    previous_status = subscription.status if subscription else None
    if subscription is None:
        subscription = Subscription(org_id=org.id, provider="stripe")
        db.add(subscription)
    subscription.status = "active"
    subscription.provider = "stripe"
    subscription.provider_subscription_id = session.get("subscription")
    record_audit_log(
        db,
        org_id=org.id,
        actor_type="system",
        action="billing.subscription.updated",
        target_type="organization",
        target_id=org.id,
        request=request,
        before={"plan": previous_plan, "subscription_status": previous_status},
        after={
            "plan": plan.code,
            "subscription_status": subscription.status,
            "provider_subscription_id": subscription.provider_subscription_id,
        },
    )
    db.commit()
    return {"received": True, "org_id": org.id, "plan": plan.code}
