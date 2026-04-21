import logging
import uuid

import httpx

logger = logging.getLogger(__name__)


class CircleDeveloperClient:
    """Client for Circle Developer-Controlled Wallets on Arc Testnet."""

    def __init__(self, api_key: str, entity_secret: str | None = None):
        self.api_key = api_key
        self.entity_secret = entity_secret
        self.base_url = "https://api.circle.com/v1/w3s"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def create_wallet(self, wallet_set_id: str, idempotency_key: str | None = None) -> dict:
        """Create a developer-controlled wallet on Arc testnet."""
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())

        payload = {
            "idempotencyKey": idempotency_key,
            "walletSetId": wallet_set_id,
            "blockchains": ["ARC-TESTNET"],
            "count": 1,
            "accountType": "SCA",
        }
        response = httpx.post(
            f"{self.base_url}/developer/wallets", headers=self.headers, json=payload
        )
        response.raise_for_status()
        return response.json()

    def fund_with_testnet_usdc(self, address: str) -> dict:
        """Request testnet USDC from Circle faucet for the given address."""
        payload = {"address": address, "blockchain": "ARC-TESTNET", "usdAmount": "10.0"}
        response = httpx.post(
            "https://api.circle.com/v1/faucet/drips", headers=self.headers, json=payload
        )
        response.raise_for_status()
        return response.json()

    def execute_smoke_transfer(
        self,
        wallet_id: str,
        destination_address: str,
        amount: str,
        token_id: str,
        idempotency_key: str | None = None,
    ) -> dict:
        """Execute a smoke transfer of USDC on Arc testnet."""
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())

        payload = {
            "idempotencyKey": idempotency_key,
            "walletId": wallet_id,
            "destinationAddress": destination_address,
            "amounts": [amount],
            "tokenId": token_id,
            "fee": {"type": "level", "config": {"feeLevel": "MEDIUM"}},
        }

        if self.entity_secret:
            payload["entitySecretCiphertext"] = self.entity_secret

        response = httpx.post(
            f"{self.base_url}/developer/transactions/transfer", headers=self.headers, json=payload
        )
        response.raise_for_status()
        return response.json()
