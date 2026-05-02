import hashlib
import hmac
import json
import time
from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from tothemoon_api.database import SessionLocal
from tothemoon_api.db_models import (
    ApiKey,
    BillingWebhookEvent,
    Membership,
    Organization,
    Plan,
    Subscription,
    User,
)
from tothemoon_api.main import app
from tothemoon_api.quota import enforce_quota
from tothemoon_api.routers.billing import STRIPE_SIGNATURE_TOLERANCE_SECONDS

client = TestClient(app)
PASSWORD = "correct horse battery staple"
STRIPE_FUTURE_PERIOD_END = int(datetime(2099, 1, 1, tzinfo=UTC).timestamp())


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


def _stripe_signature(
    payload: bytes,
    secret: str = "whsec_dev_secret",
    *,
    timestamp: int | None = None,
) -> str:
    timestamp = int(time.time()) if timestamp is None else timestamp
    timestamp_value = str(timestamp)
    digest = hmac.new(
        secret.encode("utf-8"),
        timestamp_value.encode("utf-8") + b"." + payload,
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp_value},v1={digest}"


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
            "id": "evt_checkout_completed",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "client_reference_id": str(org_id),
                    "customer": "cus_test_123",
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

    duplicate = client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": _stripe_signature(payload)},
    )
    assert duplicate.status_code == 200
    assert duplicate.json() == {
        "received": True,
        "duplicate": True,
        "event_id": "evt_checkout_completed",
    }

    account = client.get("/api/v1/saas/account", headers={"Authorization": f"Bearer {token}"})
    assert account.status_code == 200
    assert account.json()["plan"] == "pro"

    with SessionLocal() as db:
        subscription = db.query(Subscription).filter(Subscription.org_id == org_id).one()
        assert subscription.status == "active"
        assert subscription.provider == "stripe"
        assert subscription.provider_customer_id == "cus_test_123"
        assert subscription.provider_subscription_id == "sub_test_123"
        assert (
            db.query(BillingWebhookEvent).filter_by(event_id="evt_checkout_completed").count() == 1
        )


def test_stripe_webhook_rejects_missing_signature():
    payload = b'{"id":"evt_missing_sig","type":"checkout.session.completed"}'
    response = client.post("/api/v1/webhooks/stripe", content=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing Stripe-Signature"


def test_stripe_webhook_rejects_bad_signature():
    payload = b'{"type":"checkout.session.completed"}'
    response = client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": "t=123,v1=bad"},
    )
    assert response.status_code == 400


def test_stripe_webhook_rejects_stale_signature():
    payload = b'{"id":"evt_stale_sig","type":"checkout.session.completed"}'
    stale_timestamp = int(time.time()) - STRIPE_SIGNATURE_TOLERANCE_SECONDS - 1
    response = client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": _stripe_signature(payload, timestamp=stale_timestamp)},
    )
    assert response.status_code == 400


def test_stripe_subscription_lifecycle_reconciles_and_downgrades_on_cancel():
    token, _api_key, org_id = _signup_login_key("stripe-lifecycle")
    created_payload = json.dumps(
        {
            "id": "evt_sub_created",
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": "sub_lifecycle_123",
                    "customer": "cus_lifecycle_123",
                    "status": "active",
                    "current_period_end": STRIPE_FUTURE_PERIOD_END,
                    "metadata": {"org_id": str(org_id), "plan_code": "enterprise"},
                }
            },
        },
        separators=(",", ":"),
    ).encode("utf-8")
    created = client.post(
        "/api/v1/webhooks/stripe",
        content=created_payload,
        headers={"Stripe-Signature": _stripe_signature(created_payload)},
    )
    assert created.status_code == 200
    assert created.json()["plan"] == "enterprise"

    account = client.get("/api/v1/saas/account", headers={"Authorization": f"Bearer {token}"})
    assert account.status_code == 200
    assert account.json()["plan"] == "enterprise"

    with SessionLocal() as db:
        subscription = db.query(Subscription).filter(Subscription.org_id == org_id).one()
        assert subscription.current_period_end == datetime(2099, 1, 1)

    canceled_payload = json.dumps(
        {
            "id": "evt_sub_deleted",
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_lifecycle_123",
                    "customer": "cus_lifecycle_123",
                    "status": "canceled",
                    "metadata": {"org_id": str(org_id), "plan_code": "enterprise"},
                }
            },
        },
        separators=(",", ":"),
    ).encode("utf-8")
    canceled = client.post(
        "/api/v1/webhooks/stripe",
        content=canceled_payload,
        headers={"Stripe-Signature": _stripe_signature(canceled_payload)},
    )
    assert canceled.status_code == 200
    assert canceled.json()["plan"] == "free"

    account = client.get("/api/v1/saas/account", headers={"Authorization": f"Bearer {token}"})
    assert account.status_code == 200
    assert account.json()["plan"] == "free"

    with SessionLocal() as db:
        subscription = db.query(Subscription).filter(Subscription.org_id == org_id).one()
        assert subscription.status == "canceled"
        assert subscription.provider_customer_id == "cus_lifecycle_123"
        assert subscription.provider_subscription_id == "sub_lifecycle_123"


def test_stripe_invoice_payment_failed_marks_subscription_past_due():
    _token, _api_key, org_id = _signup_login_key("stripe-past-due")
    payload = json.dumps(
        {
            "id": "evt_checkout_past_due",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "client_reference_id": str(org_id),
                    "customer": "cus_past_due_123",
                    "subscription": "sub_past_due_123",
                    "metadata": {"plan_code": "pro"},
                }
            },
        },
        separators=(",", ":"),
    ).encode("utf-8")
    checkout = client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": _stripe_signature(payload)},
    )
    assert checkout.status_code == 200

    failed_payload = json.dumps(
        {
            "id": "evt_invoice_failed",
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "customer": "cus_past_due_123",
                    "subscription": "sub_past_due_123",
                }
            },
        },
        separators=(",", ":"),
    ).encode("utf-8")
    failed = client.post(
        "/api/v1/webhooks/stripe",
        content=failed_payload,
        headers={"Stripe-Signature": _stripe_signature(failed_payload)},
    )
    assert failed.status_code == 200

    with SessionLocal() as db:
        subscription = db.query(Subscription).filter(Subscription.org_id == org_id).one()
        assert subscription.status == "past_due"


def test_stripe_subscription_owner_mismatch_is_rejected():
    _token_a, _api_key_a, org_id_a = _signup_login_key("stripe-owner-a")
    _token_b, _api_key_b, org_id_b = _signup_login_key("stripe-owner-b")
    with SessionLocal() as db:
        db.add(
            Subscription(
                org_id=org_id_a,
                provider="stripe",
                status="active",
                provider_customer_id="cus_owner",
                provider_subscription_id="sub_owner",
            )
        )
        db.commit()

    payload = json.dumps(
        {
            "id": "evt_owner_mismatch",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_owner",
                    "customer": "cus_owner",
                    "status": "active",
                    "metadata": {"org_id": str(org_id_b), "plan_code": "pro"},
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
    assert response.status_code == 409


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
    requirements = json.loads(response.headers["PAYMENT-REQUIREMENTS"])
    assert requirements["scheme"] == "x402"
    assert requirements["resource_id"] == "resource-phase3"
    assert requirements["amount_usd"] == 0.01
    assert requirements["method"] == "GET"
    assert requirements["path"] == "/api/v1/nanopayments/resources/resource-phase3"

    paid = client.get(
        "/api/v1/nanopayments/resources/resource-phase3",
        headers={"PAYMENT-SIGNATURE": "sig_test_123"},
    )
    assert paid.status_code == 200
    assert paid.json()["payment_signature"] == "sig_test_123"
    assert paid.json()["resource"]["content"] == "paid payload"
