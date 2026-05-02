from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "bot"))

from safety import BotSafetyError, assert_paper_or_guarded_testnet_status  # noqa: E402
from scanner import MarketScanner  # noqa: E402
from trader import create_copilot_proposal  # noqa: E402

from tothemoon_api.database import SessionLocal  # noqa: E402
from tothemoon_api.db_models import ApiKey, CopilotProposal, Organization, Plan  # noqa: E402
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


def test_copilot_bot_status_is_operator_visible_and_paper_only():
    _token, api_key, org_id = _signup_login_key("bot-status")

    response = client.get("/api/v1/copilot/bot/status", headers={"X-API-Key": api_key})

    assert response.status_code == 200
    payload = response.json()
    assert payload["org_id"] == org_id
    assert payload["runtime_mode"] == "paper"
    assert payload["paper_only_default"] is True
    assert payload["order_submission_enabled"] is False
    assert payload["mainnet_order_submission_enabled"] is False
    assert payload["workflows"] == {
        "scanner": "api_adapter_ready",
        "auditor": "api_adapter_ready",
        "trader": "paper_proposal_only",
        "consecutive_failures": 0,
        "circuit_breaker_tripped": False,
    }
    assert payload["safeguards"]["production_mainnet_blocked"] is True
    assert payload["safeguards"]["adapter_contract_enforced"] is True
    assert payload["external_adapter_contract"]["order_submission_enabled"] is False


def test_bot_safety_accepts_paper_and_guarded_testnet_only():
    base_status = {
        "runtime_mode": "paper",
        "order_submission_enabled": False,
        "mainnet_order_submission_enabled": False,
        "safeguards": {
            "guarded_testnet_enabled": False,
            "production_mainnet_blocked": True,
        },
    }
    assert_paper_or_guarded_testnet_status(base_status)
    assert_paper_or_guarded_testnet_status(
        {
            **base_status,
            "runtime_mode": "guarded_testnet",
            "safeguards": {**base_status["safeguards"], "guarded_testnet_enabled": True},
        }
    )

    for unsafe_status in (
        {**base_status, "runtime_mode": "blocked_mainnet"},
        {**base_status, "order_submission_enabled": True},
        {**base_status, "mainnet_order_submission_enabled": True},
        {
            **base_status,
            "runtime_mode": "guarded_testnet",
            "safeguards": {**base_status["safeguards"], "guarded_testnet_enabled": False},
        },
    ):
        try:
            assert_paper_or_guarded_testnet_status(unsafe_status)
        except BotSafetyError:
            continue
        raise AssertionError("unsafe bot status must be rejected")


def test_bot_trader_entrypoint_rejects_real_mode_before_api_call():
    class FailingClient:
        async def post(self, *args, **kwargs):
            raise AssertionError("real-mode bot proposal must not call the API")

    try:
        asyncio.run(
            create_copilot_proposal(
                FailingClient(),
                api_key="ttm_sk_live_redacted",
                token={"address": "0xSAFE"},
                mode="real",
            )
        )
    except ValueError as exc:
        assert "paper-only" in str(exc)
        return
    raise AssertionError("real-mode bot proposal must be rejected")


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


def test_copilot_proposal_approval_is_single_use():
    token, api_key, _org_id = _signup_login_key("proposal-once")
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

    first = client.post(
        f"/api/v1/copilot/proposals/{proposal_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/v1/copilot/proposals/{proposal_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "Proposal is not pending"


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


def test_copilot_proposal_hard_stops_blocked_mainnet_runtime(monkeypatch):
    _token, api_key, _org_id = _signup_login_key("mainnet-stop")
    monkeypatch.setenv("ENABLE_LIVE_TRADING", "true")
    monkeypatch.setenv("ALLOW_MAINNET_TRADING", "true")

    response = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "amount_usd": 100,
            "score": 72,
            "rationale": "Mainnet runtime must hard-stop before proposal persistence.",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Mainnet runtime is blocked by project policy"


def test_real_mode_approval_stays_manual_when_enabled():
    token, api_key, org_id = _signup_login_key("real-manual")
    with SessionLocal() as db:
        org = db.query(Organization).filter(Organization.id == org_id).one()
        org.real_mode_enabled = True
        db.commit()

    created = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "amount_usd": 100,
            "score": 72,
            "rationale": "Real mode requires a manual wallet action.",
            "mode": "real",
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
    assert proposal["mode"] == "real"
    assert proposal["status"] == "approved_manual_required"
    assert proposal["execution_payload"] is None

    with SessionLocal() as db:
        row = db.query(CopilotProposal).filter(CopilotProposal.id == proposal_id).one()
        assert row.status == "approved_manual_required"
        assert row.execution_payload is None


def test_copilot_approval_rolls_back_when_quota_blocks_execution():
    token, api_key, org_id = _signup_login_key("proposal-quota")
    with SessionLocal() as db:
        tiny = Plan(
            code=f"copilot-tiny-{uuid4().hex}",
            name="Copilot Tiny",
            monthly_request_limit=0,
            monthly_token_audit_limit=0,
            active_api_key_limit=1,
        )
        db.add(tiny)
        db.flush()
        org = db.query(Organization).filter(Organization.id == org_id).one()
        org.plan_id = tiny.id
        db.commit()

    created = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "symbol": "SAFE",
            "amount_usd": 100,
            "score": 72,
            "rationale": "Quota should block execution before state changes.",
        },
    )
    assert created.status_code == 201
    proposal_id = created.json()["proposal"]["id"]

    approved = client.post(
        f"/api/v1/copilot/proposals/{proposal_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert approved.status_code == 429
    assert approved.json()["detail"] == "Plan quota exceeded"

    with SessionLocal() as db:
        row = db.query(CopilotProposal).filter(CopilotProposal.id == proposal_id).one()
        assert row.status == "pending"
        assert row.approved_at is None
        assert row.execution_payload is None


def test_copilot_approval_fails_when_source_api_key_revoked():
    token, api_key, _org_id = _signup_login_key("proposal-revoked")
    created = client.post(
        "/api/v1/copilot/proposals",
        headers={"X-API-Key": api_key},
        json={
            "token_address": "0xSAFE",
            "chain": "evm",
            "symbol": "SAFE",
            "amount_usd": 100,
            "score": 72,
            "rationale": "Revoked proposal API key should block execution.",
        },
    )
    assert created.status_code == 201
    proposal_id = created.json()["proposal"]["id"]

    with SessionLocal() as db:
        row = db.query(CopilotProposal).filter(CopilotProposal.id == proposal_id).one()
        api_key_row = db.query(ApiKey).filter(ApiKey.id == row.api_key_id).one()
        api_key_row.revoked_at = row.created_at
        db.commit()

    approved = client.post(
        f"/api/v1/copilot/proposals/{proposal_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert approved.status_code == 409
    assert approved.json()["detail"] == "Proposal API key is unavailable"

    with SessionLocal() as db:
        row = db.query(CopilotProposal).filter(CopilotProposal.id == proposal_id).one()
        assert row.status == "pending"
        assert row.execution_payload is None


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
