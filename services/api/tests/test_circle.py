from unittest.mock import MagicMock, patch

import pytest

from tothemoon_api.circle import CircleDeveloperClient


@pytest.fixture
def circle_client():
    return CircleDeveloperClient(  # pragma: allowlist secret
        api_key="TEST_API_KEY",  # pragma: allowlist secret
        entity_secret="TEST_ENTITY_VALUE",  # pragma: allowlist secret
    )


def test_create_wallet(circle_client):
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": {
                "wallets": [{"id": "wallet-123", "address": "0x123", "blockchain": "ARC-TESTNET"}]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = circle_client.create_wallet(wallet_set_id="ws-123", idempotency_key="idemp-1")

        assert result["data"]["wallets"][0]["id"] == "wallet-123"
        mock_post.assert_called_once()
        _args, kwargs = mock_post.call_args
        assert "ARC-TESTNET" in kwargs["json"]["blockchains"]


def test_fund_with_testnet_usdc(circle_client):
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": {"status": "success"}}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = circle_client.fund_with_testnet_usdc(address="0x123")

        assert result["data"]["status"] == "success"
        mock_post.assert_called_once()
        _args, kwargs = mock_post.call_args
        assert kwargs["json"]["address"] == "0x123"


def test_execute_smoke_transfer(circle_client):
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": {"id": "tx-123", "state": "INITIATED"}}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = circle_client.execute_smoke_transfer(
            wallet_id="wallet-123",
            destination_address="0x456",
            amount="10.0",
            token_id="usdc-token-id",
            idempotency_key="idemp-tx-1",
        )

        assert result["data"]["id"] == "tx-123"
        mock_post.assert_called_once()
        _args, kwargs = mock_post.call_args
        assert kwargs["json"]["walletId"] == "wallet-123"
        assert kwargs["json"]["destinationAddress"] == "0x456"
        assert "entitySecretCiphertext" in kwargs["json"]


def test_create_wallet_no_idempotency_key(circle_client):
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": {
                "wallets": [{"id": "wallet-124", "address": "0x124", "blockchain": "ARC-TESTNET"}]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = circle_client.create_wallet(wallet_set_id="ws-124")

        assert result["data"]["wallets"][0]["id"] == "wallet-124"
        mock_post.assert_called_once()
        _args, kwargs = mock_post.call_args
        assert "idempotencyKey" in kwargs["json"]
        assert kwargs["json"]["idempotencyKey"] is not None


def test_execute_smoke_transfer_no_idempotency_key():
    client = CircleDeveloperClient(api_key="TEST_API_KEY", entity_secret="")
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": {"id": "tx-124", "state": "INITIATED"}}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = client.execute_smoke_transfer(
            wallet_id="wallet-124",
            destination_address="0x457",
            amount="5.0",
            token_id="usdc-token-id",
        )

        assert result["data"]["id"] == "tx-124"
        mock_post.assert_called_once()
        _args, kwargs = mock_post.call_args
        assert "idempotencyKey" in kwargs["json"]
        assert kwargs["json"]["idempotencyKey"] is not None
        assert "entitySecretCiphertext" not in kwargs["json"]
