import httpx

from tothemoon_api.settlement import (
    AgentReputation,
    SettlementRequest,
    clear_seen_payment_intents,
    verify_settlement,
)


def setup_function():
    clear_seen_payment_intents()


def _receipt(_tx_hash: str, to_address: str = "0xabc") -> dict[str, object]:
    return {
        "status": "0x1",
        "to": to_address,
        "transactionHash": _tx_hash,
    }


def test_settlement_rejected_unverified():
    agent = AgentReputation(
        agent_id="agent_1", successful_jobs=10, failed_jobs=0, is_verified=False
    )
    request = SettlementRequest(
        payment_intent_id="pi-1",
        job_id="job_1",
        agent_id="agent_1",
        amount=100.0,
        tx_hash="0xvalidtx",
        expected_receiver="0xabc",
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(request, agent=agent, receipt_fetcher=_receipt)

    assert result.status == "REJECTED"
    assert result.reason == "Agent must be verified to settle jobs."
    assert any(signal.signal_type == "verification_failure" for signal in result.auditable_signals)


def test_settlement_rejected_low_reputation():
    agent = AgentReputation(agent_id="agent_2", successful_jobs=5, failed_jobs=10, is_verified=True)
    request = SettlementRequest(
        payment_intent_id="pi-2",
        job_id="job_2",
        agent_id="agent_2",
        amount=100.0,
        tx_hash="0xvalidtx",
        expected_receiver="0xabc",
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(request, agent=agent, receipt_fetcher=_receipt)

    assert result.status == "REJECTED"
    assert result.reason == "Agent reputation too low for settlement."
    assert any(signal.signal_type == "reputation_low" for signal in result.auditable_signals)


def test_settlement_rejected_missing_proof():
    agent = AgentReputation(agent_id="agent_3", successful_jobs=10, failed_jobs=0, is_verified=True)
    request = SettlementRequest(
        payment_intent_id="pi-3",
        job_id="job_3",
        agent_id="agent_3",
        amount=100.0,
        tx_hash="0xvalidtx",
        expected_receiver="0xabc",
        work_proof="short",
    )

    result = verify_settlement(request, agent=agent, receipt_fetcher=_receipt)

    assert result.status == "REJECTED"
    assert result.reason == "Missing or invalid proof of work."
    assert any(signal.signal_type == "missing_proof" for signal in result.auditable_signals)


def test_settlement_timeout_returns_refund_required():
    request = SettlementRequest(
        payment_intent_id="pi-4",
        job_id="job_4",
        agent_id="agent_4",
        amount=100.0,
        tx_hash="0xvalidtx",
        expected_receiver="0xabc",
        work_proof="valid_proof_hash_123",
    )

    def _timeout(_tx_hash: str):
        raise httpx.TimeoutException("timeout")

    result = verify_settlement(request, receipt_fetcher=_timeout)

    assert result.status == "REFUND_REQUIRED"
    assert result.reason == "Settlement verification timed out."


def test_settlement_successful_and_replay_protected():
    agent = AgentReputation(agent_id="agent_5", successful_jobs=10, failed_jobs=1, is_verified=True)
    request = SettlementRequest(
        payment_intent_id="pi-5",
        job_id="job_5",
        agent_id="agent_5",
        amount=100.0,
        tx_hash="0xvalidtx",
        expected_receiver="0xabc",
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(request, agent=agent, receipt_fetcher=_receipt)

    assert result.status == "SETTLED"
    assert result.reason == "Job settled successfully."
    assert any(signal.signal_type == "receipt_verified" for signal in result.auditable_signals)

    replay = verify_settlement(request, agent=agent, receipt_fetcher=_receipt)
    assert replay.status == "REJECTED"
    assert replay.reason == "Payment intent replay detected."
