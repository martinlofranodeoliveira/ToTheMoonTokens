import pytest
from fastapi.testclient import TestClient

from tothemoon_api.arc_adapter import (
    NexusTaskEvent,
    PaidWorkUnit,
    get_arc_jobs,
    submit_nexus_task_event,
    submit_paid_work_unit,
)
from tothemoon_api.main import app


@pytest.fixture(autouse=True)
def isolate_arc_jobs_file(monkeypatch, tmp_path):
    monkeypatch.setenv("ARC_JOBS_FILE", str(tmp_path / "arc_jobs.json"))


def test_submit_nexus_task_event():
    event = NexusTaskEvent(
        task_id="GH-40",
        agent_id="dev",
        action="complete",
        evidence={"commit": "abc", "lines": "100"},
    )
    proof = submit_nexus_task_event(event)
    assert proof.task_id == "GH-40"
    assert proof.agent_id == "dev"
    assert proof.status == "completed"
    assert proof.proof_hash.startswith("0x")
    assert "commit" in proof.metadata["evidence_keys"]

    jobs = get_arc_jobs()
    assert len(jobs) > 0
    assert jobs[0].job_id == proof.job_id


def test_submit_paid_work_unit_records_arc_safe_stub_metadata():
    work_unit = PaidWorkUnit(
        work_unit_id="nexus-job-123",
        payment_id="pay_123",
        artifact_id="artifact_delivery_packet",
        agent_id="agent_backend",
        amount_usdc=0.001,
        status="completed",
        tx_hash="0xMockSettlementHash",
        evidence={"delivery": "artifact_delivery_packet", "review": "approved"},
    )

    proof = submit_paid_work_unit(work_unit)

    assert proof.work_unit_id == "nexus-job-123"
    assert proof.task_id == "nexus-job-123"
    assert proof.payment_id == "pay_123"
    assert proof.payment_status == "verified"
    assert proof.settlement_status == "SETTLED"
    assert proof.tx_hash == "0xMockSettlementHash"
    assert proof.status == "completed"
    assert proof.onchain_write_status == "stubbed"
    assert proof.metadata["source"] == "paid_work_unit"
    assert proof.metadata["artifact_id"] == "artifact_delivery_packet"
    assert proof.metadata["amount_usdc"] == "0.001"
    assert proof.metadata["onchain_write"] == "stubbed"
    assert proof.metadata["onchain_write_reason"]
    assert proof.proof_hash.startswith("0x")


def test_paid_work_unit_endpoint_exposes_arc_proof_contract():
    client = TestClient(app)

    response = client.post(
        "/api/arc/paid-work-units",
        json={
            "work_unit_id": "nexus-job-api",
            "payment_id": "pay_api",
            "artifact_id": "artifact_review_bundle",
            "agent_id": "agent_backend",
            "amount_usdc": 0.005,
            "status": "paid",
            "tx_hash": "0xMockSettlementHash",
            "evidence": {"review": "queued"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["work_unit_id"] == "nexus-job-api"
    assert payload["payment_id"] == "pay_api"
    assert payload["status"] == "escrowed"
    assert payload["onchain_write_status"] == "stubbed"
    assert payload["metadata"]["source"] == "paid_work_unit"
    assert payload["metadata"]["onchain_write"] == "stubbed"
