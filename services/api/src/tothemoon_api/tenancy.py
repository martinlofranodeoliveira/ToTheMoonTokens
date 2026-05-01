from __future__ import annotations

from sqlalchemy.orm import Session

from .db_models import Membership, Organization, Plan, User

DEFAULT_PLANS = [
    {
        "code": "free",
        "name": "Free",
        "monthly_request_limit": 1000,
        "monthly_token_audit_limit": 100,
        "active_api_key_limit": 1,
    },
    {
        "code": "pro",
        "name": "Pro",
        "monthly_request_limit": 100_000,
        "monthly_token_audit_limit": 10_000,
        "active_api_key_limit": 10,
    },
    {
        "code": "enterprise",
        "name": "Enterprise",
        "monthly_request_limit": -1,
        "monthly_token_audit_limit": -1,
        "active_api_key_limit": -1,
    },
]


def ensure_default_plans(db: Session) -> None:
    existing_codes = {code for (code,) in db.query(Plan.code).all()}
    for plan_data in DEFAULT_PLANS:
        if plan_data["code"] not in existing_codes:
            db.add(Plan(**plan_data))
    db.flush()


def plan_by_code(db: Session, code: str) -> Plan:
    ensure_default_plans(db)
    plan = db.query(Plan).filter(Plan.code == code).one()
    return plan


def create_default_org_for_user(user: User, db: Session) -> Organization:
    free_plan = plan_by_code(db, "free")
    org = Organization(name=f"{user.email} org", plan_id=free_plan.id)
    db.add(org)
    db.flush()
    db.add(Membership(user_id=user.id, org_id=org.id, role="owner"))
    db.flush()
    db.refresh(org)
    return org


def primary_org_for_user(user: User, db: Session) -> Organization:
    membership = (
        db.query(Membership)
        .filter(Membership.user_id == user.id)
        .order_by(Membership.id.asc())
        .first()
    )
    if membership:
        return membership.organization
    return create_default_org_for_user(user, db)
