import os
from unittest.mock import patch

import httpx
import pytest

from tothemoon_api.circle import CircleWalletError, create_developer_wallet, transfer_usdc


def test_create_developer_wallet_mocked() -> None:
    # Set the CIRCLE_API_KEY to empty to trigger mocked response
    with patch.dict(os.environ, {"CIRCLE_API_KEY": ""}):
        from tothemoon_api import circle
        circle.CIRCLE_API_KEY = ""
        wallet = create_developer_wallet("ARC-TESTNET")
        assert wallet["blockchain"] == "ARC-TESTNET"
        assert wallet["address"] == "0xMockedWalletAddressForArcTestnet"
        assert wallet["status"] == "active"
        assert "id" in wallet

def test_transfer_usdc_mocked() -> None:
    with patch.dict(os.environ, {"CIRCLE_API_KEY": ""}):
        from tothemoon_api import circle
        circle.CIRCLE_API_KEY = ""
        transfer = transfer_usdc("mock-wallet-id", "0xDestination", "10.0")
        assert transfer["amount"] == "10.0"
        assert transfer["destination"] == "0xDestination"
        assert transfer["status"] == "initiated"
        assert transfer["token"] == "USDC"
        assert "transaction_id" in transfer

@patch("tothemoon_api.circle.httpx.post")
def test_create_developer_wallet_with_api_key(mock_post) -> None:
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {
        "data": {
            "wallets": [{
                "id": "real-wallet-id",
                "address": "0xRealAddress",
                "blockchain": "ARC-TESTNET",
                "state": "active"
            }]
        }
    }
    
    with patch.dict(os.environ, {"CIRCLE_API_KEY": "test-key"}):
        from tothemoon_api import circle
        circle.CIRCLE_API_KEY = "test-key"
        wallet = create_developer_wallet("ARC-TESTNET")
        
        assert wallet["blockchain"] == "ARC-TESTNET"
        assert wallet["address"] == "0xRealAddress"
        assert wallet["id"] == "real-wallet-id"
        mock_post.assert_called_once()

@patch("tothemoon_api.circle.httpx.post")
def test_transfer_usdc_with_api_key(mock_post) -> None:
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {
        "data": {
            "id": "real-tx-id",
            "state": "pending"
        }
    }
    
    with patch.dict(os.environ, {"CIRCLE_API_KEY": "test-key"}):
        from tothemoon_api import circle
        circle.CIRCLE_API_KEY = "test-key"
        transfer = transfer_usdc("real-wallet-id", "0xDest", "5.0")
        
        assert transfer["transaction_id"] == "real-tx-id"
        assert transfer["status"] == "pending"
        assert transfer["amount"] == "5.0"
        mock_post.assert_called_once()

@patch("tothemoon_api.circle.httpx.post")
def test_create_developer_wallet_api_error(mock_post) -> None:
    mock_post.return_value.status_code = 400
    mock_post.return_value.raise_for_status.side_effect = httpx.HTTPStatusError("Bad Request", request=None, response=mock_post.return_value)
    
    with patch.dict(os.environ, {"CIRCLE_API_KEY": "test-key"}):
        from tothemoon_api import circle
        circle.CIRCLE_API_KEY = "test-key"
        with pytest.raises(CircleWalletError, match="Failed to create wallet"):
            create_developer_wallet("ARC-TESTNET")
