import logging
import os
import uuid

import httpx

log = logging.getLogger(__name__)

CIRCLE_API_URL = os.getenv("CIRCLE_API_URL", "https://api.circle.com/v1/w3s")
CIRCLE_API_KEY = os.getenv("CIRCLE_API_KEY", "")

class CircleWalletError(Exception):
    pass

def create_developer_wallet(blockchain: str = "ARC-TESTNET") -> dict[str, str]:
    """
    Bootstrap a Circle Developer-Controlled Wallet on the specified testnet.
    Returns the wallet ID and its address.
    """
    if not CIRCLE_API_KEY:
        log.warning("CIRCLE_API_KEY not set, using mock response for developer wallet creation.")
        return {
            "id": str(uuid.uuid4()),
            "address": "0xMockedWalletAddressForArcTestnet",
            "blockchain": blockchain,
            "status": "active"
        }

    headers = {
        "Authorization": f"Bearer {CIRCLE_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "idempotencyKey": str(uuid.uuid4()),
        "blockchains": [blockchain],
        "count": 1,
        "walletSetId": "default"  # In a real scenario, this would be a configured ID
    }

    try:
        response = httpx.post(
            f"{CIRCLE_API_URL}/developer/wallets",
            json=payload,
            headers=headers,
            timeout=10.0
        )
        response.raise_for_status()
        data = response.json()
        wallet = data.get("data", {}).get("wallets", [])[0]
        return {
            "id": wallet.get("id"),
            "address": wallet.get("address"),
            "blockchain": wallet.get("blockchain"),
            "status": wallet.get("state")
        }
    except Exception as e:
        log.error("Failed to create Circle developer wallet: %s", e)
        raise CircleWalletError(f"Failed to create wallet: {e!s}") from e

def transfer_usdc(wallet_id: str, destination_address: str, amount: str, token_id: str = "USDC") -> dict[str, str]:
    """
    Perform a USDC smoke transfer from the given developer wallet.
    """
    if not CIRCLE_API_KEY:
        log.warning("CIRCLE_API_KEY not set, using mock response for USDC transfer.")
        return {
            "transaction_id": str(uuid.uuid4()),
            "status": "initiated",
            "amount": amount,
            "token": token_id,
            "destination": destination_address
        }

    headers = {
        "Authorization": f"Bearer {CIRCLE_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "idempotencyKey": str(uuid.uuid4()),
        "walletId": wallet_id,
        "destinationAddress": destination_address,
        "tokenId": token_id,
        "amounts": [amount],
        "feeLevel": "MEDIUM"
    }

    try:
        response = httpx.post(
            f"{CIRCLE_API_URL}/developer/transactions/transfer",
            json=payload,
            headers=headers,
            timeout=10.0
        )
        response.raise_for_status()
        data = response.json()
        return {
            "transaction_id": data.get("data", {}).get("id"),
            "status": data.get("data", {}).get("state"),
            "amount": amount,
            "token": token_id,
            "destination": destination_address
        }
    except Exception as e:
        log.error("Failed to perform USDC transfer: %s", e)
        raise CircleWalletError(f"Failed to transfer USDC: {e!s}") from e
