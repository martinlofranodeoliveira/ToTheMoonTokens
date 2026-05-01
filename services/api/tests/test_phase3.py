import hashlib
import hmac
import json
import time
from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from tothemoon_api.database import SessionLocal
from tothemoon_api.db_models import ApiKey, Membership, Organization, Plan, User
from tothemoon_api.main import app
from tothemoon_api.quota import enforce_quota

client = TestClient(app)
PASSWORD = "correct horse battery staple"


def _signup_login_key(prefix: str = "phase3") -> tuple[str, str, int]:
    email = f"{prefix}-{uuid4().hex}@example.com"
    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": PASSWORD})
    assert signup.status_code == 201
    org_id = int(signup.json()["org_id"])
    login = client.post("/api/v1/auth/login", data={"username": email, "password": PASSWORD})
    assert login.status_code == 200
    token = login.json()["access_token"]
    created = client.post(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "phase3"},
    )
    assert created.status_code == 201
    return token, created.json()["plaintext"], org_id


def _stripe_signature(payload: bytes, secret: str = "whsec_dev_secret") -> str:
    timestamp = str(int(time.time()))
    digest = hmac.new(
        secret.encode("utf-8"),
        timestamp.encode("utf-8") + b"." + payload,
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={digest}"


def test_quota_blocks_when_exceeded():
    _token, api_key, org_id = _signup_login_key("quota")
    with SessionLocal() as db:
        tiny = Plan(
            code=f"tiny-{uuid4().hex}",
            name="Tiny",
            monthly_request_limit=1,
            monthly_token_audit_limit=1,
            active_api_key_limit=1,
        )
        db.add(tiny)
        db.flush()
        org = db.query(Organization).filter(Organization.id == org_id).one()
        org.plan_id = tiny.id
        db.commit()

    first = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": api_key},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": api_key},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert second.status_code == 429
    assert second.json()["detail"] == "Plan quota exceeded"


def test_quota_resets_per_month(db_session):
    plan = Plan(
        code="tiny",
        name="Tiny",
        monthly_request_limit=1,
        monthly_token_audit_limit=1,
        active_api_key_limit=1,
    )
    user = User(email="quota-reset@example.com", password_hash="hashed")
    db_session.add_all([plan, user])
    db_session.flush()
    org = Organization(name="Quota Reset", plan_id=plan.id)
    db_session.add(org)
    db_session.flush()
    db_session.add(Membership(user_id=user.id, org_id=org.id, role="owner"))
    api_key = ApiKey(
        user_id=user.id,
        org_id=org.id,
        name="quota-reset",
        prefix="ttm_sk_live_",
        key_hash="hashed",
    )
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)

    enforce_quota(api_key, "simulate_order", db_session, today=date(2026, 4, 30))
    with pytest.raises(HTTPException):
        enforce_quota(api_key, "simulate_order", db_session, today=date(2026, 4, 30))
    enforce_quota(api_key, "simulate_order", db_session, today=date(2026, 5, 1))


def test_stripe_webhook_promotes_plan():
    token, _api_key, org_id = _signup_login_key("stripe")
    payload = json.dumps(
        {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "client_reference_id": str(org_id),
                    "subscription": "sub_test_123",
                    "metadata": {"plan_code": "pro"},
                }
            },
        },
        separators=(",", ":"),
    ).encode("utf-8")
    response = client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": _stripe_signature(payload)},
    )
    assert response.status_code == 200
    assert response.json()["plan"] == "pro"

    account = client.get("/api/v1/saas/account", headers={"Authorization": f"Bearer {token}"})
    assert account.status_code == 200
    assert account.json()["plan"] == "pro"


def test_stripe_webhook_rejects_bad_signature():
    payload = b'{"type":"checkout.session.completed"}'
    response = client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": "t=123,v1=bad"},
    )
    assert response.status_code == 400


def test_x402_returns_payment_required_when_missing_signature():
    token, _api_key, _org_id = _signup_login_key("x402")
    created = client.post(
        "/api/v1/nanopayments/resources",
        headers={"Authorization": f"Bearer {token}"},
        json={"id": "resource-phase3", "amount_usd": 0.01, "content": "paid payload"},
    )
    assert created.status_code == 201

    response = client.get("/api/v1/nanopayments/resources/resource-phase3")
    assert response.status_code == 402
    assert "PAYMENT-REQUIREMENTS" in response.headers
