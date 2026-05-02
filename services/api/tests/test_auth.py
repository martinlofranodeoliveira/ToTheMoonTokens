from uuid import uuid4

from fastapi.testclient import TestClient

from tothemoon_api.auth import create_jwt_for_user, hash_password
from tothemoon_api.database import SessionLocal
from tothemoon_api.db_models import ApiKey, Membership, Organization, User
from tothemoon_api.main import app

client = TestClient(app)
PASSWORD = "correct horse battery staple"


def _email(prefix: str = "user") -> str:
    return f"{prefix}-{uuid4().hex}@example.com"


def _signup(email: str, password: str = PASSWORD):
    return client.post("/api/v1/auth/signup", json={"email": email, "password": password})


def _login(email: str, password: str = PASSWORD):
    return client.post("/api/v1/auth/login", data={"username": email, "password": password})


def _token(email: str | None = None) -> str:
    email = email or _email()
    assert _signup(email).status_code == 201
    response = _login(email)
    assert response.status_code == 200
    return response.json()["access_token"]


def _api_key(token: str | None = None) -> dict[str, object]:
    token = token or _token()
    response = client.post(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "default"},
    )
    assert response.status_code == 201
    return response.json()


def _member_token(org_id: int) -> str:
    with SessionLocal() as db:
        user = User(email=_email("member"), password_hash=hash_password(PASSWORD))
        db.add(user)
        db.flush()
        db.add(Membership(user_id=user.id, org_id=org_id, role="member"))
        db.commit()
        db.refresh(user)
        return create_jwt_for_user(user)


def test_signup_creates_user():
    email = _email()
    response = _signup(email)
    assert response.status_code == 201
    assert response.json()["email"] == email
    assert response.json()["plan"] == "free"
    assert response.json()["org_id"]
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        assert db.query(Membership).filter(Membership.user_id == user.id).count() == 1
        assert (
            db.query(Organization).filter(Organization.id == response.json()["org_id"]).count() == 1
        )


def test_signup_rejects_short_password():
    response = _signup(_email(), "short")
    assert response.status_code == 422


def test_signup_rejects_invalid_email():
    response = _signup("not-an-email")
    assert response.status_code == 422


def test_login_returns_jwt():
    email = _email()
    assert _signup(email).status_code == 201
    response = _login(email)
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_login_rejects_wrong_password():
    email = _email()
    assert _signup(email).status_code == 201
    response = _login(email, "wrong password value")
    assert response.status_code == 401


def test_login_rejects_inactive_user():
    email = _email()
    assert _signup(email).status_code == 201
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        user.is_active = False
        db.commit()

    response = _login(email)
    assert response.status_code == 401


def test_inactive_user_jwt_rejected():
    email = _email()
    token = _token(email)
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        user.is_active = False
        db.commit()

    response = client.get("/api/v1/saas/account", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_create_api_key_requires_jwt():
    response = client.post("/api/v1/saas/api-keys", json={"name": "missing-token"})
    assert response.status_code == 401


def test_free_plan_allows_only_one_active_api_key():
    token = _token()
    created = _api_key(token)

    second = client.post(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "second"},
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "Active API key limit reached"

    revoked = client.delete(
        f"/api/v1/saas/api-keys/{created['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoked.status_code == 200

    replacement = client.post(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "replacement"},
    )
    assert replacement.status_code == 201


def test_api_key_plaintext_returned_only_once():
    token = _token()
    created = _api_key(token)
    assert str(created["plaintext"]).startswith("ttm_sk_live_")
    listed = client.get("/api/v1/saas/api-keys", headers={"Authorization": f"Bearer {token}"})
    assert listed.status_code == 200
    assert "plaintext" not in listed.json()[0]


def test_api_key_hash_stored_not_plaintext():
    created = _api_key()
    plaintext = str(created["plaintext"])
    with SessionLocal() as db:
        row = db.query(ApiKey).filter(ApiKey.id == int(created["id"])).one()
        assert row.key_hash != plaintext
        assert plaintext not in row.key_hash
        assert row.org_id == int(created["org_id"])


def test_api_key_revoke_blocks_future_calls():
    token = _token()
    created = _api_key(token)
    plaintext = str(created["plaintext"])
    response = client.delete(
        f"/api/v1/saas/api-keys/{created['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    simulated = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": plaintext},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert simulated.status_code == 403


def test_api_key_rejected_after_owner_membership_removed():
    token = _token()
    created = _api_key(token)
    plaintext = str(created["plaintext"])
    with SessionLocal() as db:
        api_key = db.query(ApiKey).filter(ApiKey.id == int(created["id"])).one()
        db.query(Membership).filter(
            Membership.user_id == api_key.user_id,
            Membership.org_id == api_key.org_id,
        ).delete()
        db.commit()

    simulated = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": plaintext},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert simulated.status_code == 403
    assert simulated.json()["detail"] == "Invalid API Key"


def test_api_key_rejected_after_owner_deactivated():
    token = _token()
    created = _api_key(token)
    plaintext = str(created["plaintext"])
    with SessionLocal() as db:
        api_key = db.query(ApiKey).filter(ApiKey.id == int(created["id"])).one()
        api_key.owner.is_active = False
        db.commit()

    simulated = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": plaintext},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert simulated.status_code == 403
    assert simulated.json()["detail"] == "Invalid API Key"


def test_simulate_order_requires_x_api_key():
    response = client.post(
        "/api/v1/simulate/order",
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert response.status_code == 401


def test_bearer_token_does_not_authorize_simulate_order():
    token = _token()
    response = client.post(
        "/api/v1/simulate/order",
        headers={"Authorization": f"Bearer {token}"},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing X-API-Key"


def test_invalid_api_key_rejected_for_simulate_order():
    response = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": "ttm_sk_live_not-a-real-key"},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid API Key"


def test_last_used_at_updated_on_use():
    token = _token()
    created = _api_key(token)
    plaintext = str(created["plaintext"])

    simulated = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": plaintext},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert simulated.status_code == 200

    listed = client.get("/api/v1/saas/api-keys", headers={"Authorization": f"Bearer {token}"})
    assert listed.status_code == 200
    assert listed.json()[0]["last_used_at"] is not None


def test_saas_usage_and_dashboard_reflect_paper_simulation_only():
    token = _token()
    created = _api_key(token)
    plaintext = str(created["plaintext"])

    before_usage = client.get(
        "/api/v1/saas/usage",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert before_usage.status_code == 200
    assert before_usage.json()["plan"] == "free"
    assert before_usage.json()["quota"] == {
        "simulate_order": 1000,
        "token_audit": 100,
        "active_api_keys": 1,
    }

    simulated = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": plaintext},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert simulated.status_code == 200
    assert simulated.json()["status"] == "SUCCESS"

    after_usage = client.get(
        "/api/v1/saas/usage",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert after_usage.status_code == 200
    assert after_usage.json()["requests_month"] == before_usage.json()["requests_month"] + 1

    dashboard = client.get(
        "/api/v1/saas/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dashboard.status_code == 200
    payload = dashboard.json()
    assert payload["active_api_keys"] == 1
    assert payload["total_simulated_trades"] == 1
    assert payload["total_volume_usd"] == 100.0


def test_signup_hashes_password():
    email = _email()
    assert _signup(email).status_code == 201
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        assert user.password_hash != PASSWORD
        assert PASSWORD not in user.password_hash


def test_user_does_not_see_other_users_api_keys():
    token_a = _token(_email("tenant-a"))
    token_b = _token(_email("tenant-b"))
    key_a = _api_key(token_a)
    key_b = _api_key(token_b)

    listed_a = client.get("/api/v1/saas/api-keys", headers={"Authorization": f"Bearer {token_a}"})
    assert listed_a.status_code == 200
    ids_a = {item["id"] for item in listed_a.json()}
    assert key_a["id"] in ids_a
    assert key_b["id"] not in ids_a

    revoked_b = client.delete(
        f"/api/v1/saas/api-keys/{key_b['id']}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert revoked_b.status_code == 404


def test_org_member_can_manage_org_api_keys():
    owner_token = _token(_email("tenant-owner"))
    key = _api_key(owner_token)
    member_token = _member_token(int(key["org_id"]))

    listed = client.get(
        "/api/v1/saas/api-keys",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [key["id"]]

    revoked = client.delete(
        f"/api/v1/saas/api-keys/{key['id']}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert revoked.status_code == 200
    assert revoked.json()["id"] == key["id"]

    simulated = client.post(
        "/api/v1/simulate/order",
        headers={"X-API-Key": str(key["plaintext"])},
        json={"token_address": "0xSAFE", "amount": 100, "side": "BUY"},
    )
    assert simulated.status_code == 403
