from decimal import ROUND_HALF_UP, Decimal

import httpx

from tothemoon_api.settlement import (
    AgentReputation,
    SettlementRequest,
    clear_seen_payment_intents,
    verify_settlement,
)

SENDER = "0x00000000000000000000000000000000000000aa"
RECEIVER = "0x00000000000000000000000000000000000000bb"
TOKEN = "0x3600000000000000000000000000000000000000"
TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
NATIVE_MOVEMENT_TOPIC = "0x62f084c00a442dcf51cdbb51beed2839bf42a268da8474b0e98f38edb7db5a22"


def setup_function():
    clear_seen_payment_intents()


def _to_units(amount: float, decimals: int) -> int:
    scaled = Decimal(str(amount)) * (Decimal(10) ** decimals)
    return int(scaled.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _topic(address: str) -> str:
    return f"0x{'0' * 24}{address[2:].lower()}"


def _native_receipt(_tx_hash: str, amount: float = 1.0) -> dict[str, object]:
    return {
        "status": "0x1",
        "from": SENDER,
        "to": RECEIVER,
        "transactionHash": _tx_hash,
        "logs": [
            {
                "address": "0x1800000000000000000000000000000000000000",
                "topics": [NATIVE_MOVEMENT_TOPIC, _topic(SENDER), _topic(RECEIVER)],
                "data": hex(_to_units(amount, 18)),
            }
        ],
    }


def _native_tx(_tx_hash: str, amount: float = 1.0, sender: str = SENDER) -> dict[str, object]:
    return {
        "hash": _tx_hash,
        "from": sender,
        "to": RECEIVER,
        "value": hex(_to_units(amount, 18)),
    }


def _erc20_receipt(_tx_hash: str, amount: float = 1.0) -> dict[str, object]:
    return {
        "status": "0x1",
        "from": SENDER,
        "to": TOKEN,
        "transactionHash": _tx_hash,
        "logs": [
            {
                "address": TOKEN,
                "topics": [TRANSFER_TOPIC, _topic(SENDER), _topic(RECEIVER)],
                "data": hex(_to_units(amount, 6)),
            }
        ],
    }


def _erc20_tx(_tx_hash: str) -> dict[str, object]:
    return {
        "hash": _tx_hash,
        "from": SENDER,
        "to": TOKEN,
        "value": "0x0",
    }


def test_settlement_rejected_unverified():
    agent = AgentReputation(
        agent_id="agent_1", successful_jobs=10, failed_jobs=0, is_verified=False
    )
    request = SettlementRequest(
        payment_intent_id="pi-1",
        job_id="job_1",
        agent_id="agent_1",
        amount=1.0,
        tx_hash="0x1111111111111111111111111111111111111111111111111111111111111111",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(
        request,
        agent=agent,
        receipt_fetcher=_native_receipt,
        transaction_fetcher=_native_tx,
    )

    assert result.status == "REJECTED"
    assert result.reason == "Agent must be verified to settle jobs."
    assert any(signal.signal_type == "verification_failure" for signal in result.auditable_signals)


def test_settlement_rejected_low_reputation():
    agent = AgentReputation(agent_id="agent_2", successful_jobs=5, failed_jobs=10, is_verified=True)
    request = SettlementRequest(
        payment_intent_id="pi-2",
        job_id="job_2",
        agent_id="agent_2",
        amount=1.0,
        tx_hash="0x2222222222222222222222222222222222222222222222222222222222222222",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(
        request,
        agent=agent,
        receipt_fetcher=_native_receipt,
        transaction_fetcher=_native_tx,
    )

    assert result.status == "REJECTED"
    assert result.reason == "Agent reputation too low for settlement."
    assert any(signal.signal_type == "reputation_low" for signal in result.auditable_signals)


def test_settlement_rejected_missing_proof():
    agent = AgentReputation(agent_id="agent_3", successful_jobs=10, failed_jobs=0, is_verified=True)
    request = SettlementRequest(
        payment_intent_id="pi-3",
        job_id="job_3",
        agent_id="agent_3",
        amount=1.0,
        tx_hash="0x3333333333333333333333333333333333333333333333333333333333333333",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        work_proof="short",
    )

    result = verify_settlement(
        request,
        agent=agent,
        receipt_fetcher=_native_receipt,
        transaction_fetcher=_native_tx,
    )

    assert result.status == "REJECTED"
    assert result.reason == "Missing or invalid proof of work."
    assert any(signal.signal_type == "missing_proof" for signal in result.auditable_signals)


def test_settlement_timeout_returns_refund_required():
    request = SettlementRequest(
        payment_intent_id="pi-4",
        job_id="job_4",
        agent_id="agent_4",
        amount=1.0,
        tx_hash="0x4444444444444444444444444444444444444444444444444444444444444444",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
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
        amount=1.0,
        tx_hash="0x5555555555555555555555555555555555555555555555555555555555555555",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(
        request,
        agent=agent,
        receipt_fetcher=_native_receipt,
        transaction_fetcher=_native_tx,
    )

    assert result.status == "SETTLED"
    assert result.reason == "Job settled successfully."
    assert any(signal.signal_type == "receipt_verified" for signal in result.auditable_signals)
    assert any(signal.signal_type == "native_value_verified" for signal in result.auditable_signals)

    replay = verify_settlement(
        request,
        agent=agent,
        receipt_fetcher=_native_receipt,
        transaction_fetcher=_native_tx,
    )
    assert replay.status == "REJECTED"
    assert replay.reason == "Payment intent replay detected."


def test_settlement_rejects_amount_mismatch_for_native_transfer():
    request = SettlementRequest(
        payment_intent_id="pi-6",
        job_id="job_6",
        agent_id="agent_6",
        amount=1.0,
        tx_hash="0x6666666666666666666666666666666666666666666666666666666666666666",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(
        request,
        receipt_fetcher=lambda tx_hash: _native_receipt(tx_hash, amount=0.5),
        transaction_fetcher=lambda tx_hash: _native_tx(tx_hash, amount=0.5),
    )

    assert result.status == "REJECTED"
    assert result.reason == "Settlement amount does not match the payment intent."
    assert any(signal.signal_type == "amount_mismatch" for signal in result.auditable_signals)


def test_settlement_rejects_sender_mismatch_for_native_transfer():
    request = SettlementRequest(
        payment_intent_id="pi-7",
        job_id="job_7",
        agent_id="agent_7",
        amount=1.0,
        tx_hash="0x7777777777777777777777777777777777777777777777777777777777777777",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(
        request,
        receipt_fetcher=_native_receipt,
        transaction_fetcher=lambda tx_hash: _native_tx(
            tx_hash,
            amount=1.0,
            sender="0x00000000000000000000000000000000000000cc",
        ),
    )

    assert result.status == "REJECTED"
    assert result.reason == "Settlement sender does not match the payment intent."
    assert any(signal.signal_type == "sender_mismatch" for signal in result.auditable_signals)


def test_settlement_accepts_erc20_transfer_log_path():
    request = SettlementRequest(
        payment_intent_id="pi-8",
        job_id="job_8",
        agent_id="agent_8",
        amount=1.0,
        tx_hash="0x8888888888888888888888888888888888888888888888888888888888888888",
        expected_sender=SENDER,
        expected_receiver=RECEIVER,
        expected_token_address=TOKEN,
        work_proof="valid_proof_hash_123",
    )

    result = verify_settlement(
        request,
        receipt_fetcher=_erc20_receipt,
        transaction_fetcher=_erc20_tx,
    )

    assert result.status == "SETTLED"
    assert any(signal.signal_type == "transfer_log_verified" for signal in result.auditable_signals)
