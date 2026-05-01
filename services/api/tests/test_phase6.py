from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "bot"))

from scanner import MarketScanner  # noqa: E402

from tothemoon_api.database import SessionLocal  # noqa: E402
from tothemoon_api.db_models import CopilotProposal, Organization  # noqa: E402
from tothemoon_api.main import app  # noqa: E402

client = TestClient(app)
PASSWORD = "correct horse battery staple"


def _signup_login_key(prefix: str = "phase6") -> tuple[str, str, int]:
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
        json={"name": "phase6"},
    )
    assert created.status_code == 201
    return token, created.json()["plaintext"], org_id


def test_scanner_filters_by_volume_and_momentum():
    scanner = MarketScanner()
    tokens = [
        {
            "address": "0xlowvolume",
            "volume_24h": 99_999,
            "momentum": 20,
            "liquidity_usd": 60_000,
        },
        {
            "address": "0xlowmomentum",
            "volume_24h": 500_000,
            "momentum": 4.99,
            "liquidity_usd": 60_000,
        },
        {
            "address": "0xlowliquidity",
            "volume_24h": 500_000,
            "momentum": 6,
            "liquidity_usd": 49_999,
        },
        {
            "address": "0xpromising",
            "volume_24h": 500_000,
            "momentum": 6,
            "liquidity_usd": 60_000,
        },
    ]

    promising = scanner.filter_promising_tokens(tokens)

    assert [token["address"] for token in promising] == ["0xpromising"]


def test_copilot_proposal_persists():
    token, api_key, org_id = _signup_login_key("proposal")
    response = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "symbol": "SAFE",
            "amount_usd": 100,
            "score": 72,
            "rationale": "High momentum with sufficient liquidity.",
        },
    )
    assert response.status_code == 201
    proposal = response.json()["proposal"]
    assert proposal["org_id"] == org_id
    assert proposal["status"] == "pending"

    listed = client.get("/api/v1/copilot/proposals", headers={"Authorization": f"Bearer {token}"})
    assert listed.status_code == 200
    assert listed.json()["proposals"][0]["id"] == proposal["id"]
    streamed = client.get(
        "/api/v1/copilot/stream?once=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert streamed.status_code == 200
    assert "event: proposal" in streamed.text

    with SessionLocal() as db:
        row = db.query(CopilotProposal).filter(CopilotProposal.id == proposal["id"]).one()
        assert row.org_id == org_id
        assert row.token_address == "0xSAFE"


def test_copilot_proposal_approval_executes_paper_simulation():
    token, api_key, _org_id = _signup_login_key("proposal-approve")
    created = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "symbol": "SAFE",
            "amount_usd": 100,
            "score": 72,
            "rationale": "High momentum with sufficient liquidity.",
        },
    )
    assert created.status_code == 201
    proposal_id = created.json()["proposal"]["id"]

    approved = client.post(
        f"/api/v1/copilot/proposals/{proposal_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert approved.status_code == 200
    proposal = approved.json()["proposal"]
    assert proposal["status"] == "executed"
    assert proposal["execution_payload"]["trade_id"]


def test_real_mode_blocked_when_flag_off():
    _token, api_key, _org_id = _signup_login_key("real-block")
    response = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "amount_usd": 100,
            "score": 72,
            "rationale": "Real mode proposal should be rejected until enabled.",
            "mode": "real",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Real mode is disabled for this organization"


def test_circuit_breaker_after_3_failures():
    _token, api_key, org_id = _signup_login_key("breaker")
    with SessionLocal() as db:
        org = db.query(Organization).filter(Organization.id == org_id).one()
        org.real_mode_enabled = True
        db.commit()

    for attempt in range(1, 4):
        response = client.post(
            "/api/v1/copilot/circuit-breaker/failures",
            headers={"X-API-Key": api_key},
        )
        assert response.status_code == 200
        assert response.json()["bot_consecutive_failures"] == attempt

    body = response.json()
    assert body["circuit_breaker_tripped"] is True
    assert body["real_mode_enabled"] is False

    with SessionLocal() as db:
        org = db.query(Organization).filter(Organization.id == org_id).one()
        assert org.real_mode_enabled is False
        assert org.bot_consecutive_failures == 3
