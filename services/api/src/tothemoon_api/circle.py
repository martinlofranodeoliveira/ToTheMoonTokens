import logging
import uuid
import httpx
from .config import get_settings

logger = logging.getLogger(__name__)

class CircleDeveloperClient:
    """Client for Circle Developer-Controlled Wallets on Arc Testnet."""

    def __init__(self, api_key: str | None = None, entity_secret: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.circle_api_key
        self.entity_secret = entity_secret or settings.circle_entity_secret
        self.wallet_set_id = settings.circle_wallet_set_id
        self.base_url = "https://api.circle.com/v1/w3s"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        self.wallets_by_role: dict[str, dict] = {}
        self.roles = [
            "RESEARCH_00", "RESEARCH_01", "RESEARCH_02", "RESEARCH_03",
            "CONSUMER_01", "CONSUMER_02",
            "AUDITOR", "TREASURY"
        ]

    def load_wallets(self) -> None:
        """Load wallets from the wallet set and map to roles."""
        if not self.api_key or not self.wallet_set_id:
            logger.warning("Circle credentials missing. Skipping wallet load.")
            return

        try:
            response = httpx.get(
                f"{self.base_url}/wallets?walletSetId={self.wallet_set_id}",
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            wallets = data.get("data", {}).get("wallets", [])
            
            # Sort wallets to ensure deterministic mapping
            wallets.sort(key=lambda w: w.get("id", ""))
            
            for i, role in enumerate(self.roles):
                if i < len(wallets):
                    self.wallets_by_role[role] = wallets[i]

            logger.info(f"Circle client ready, wallet set={self.wallet_set_id}, {len(self.wallets_by_role)} wallets loaded")
        except Exception as exc:
            logger.error(f"Failed to load Circle wallets: {exc}")

    def get_wallet_address(self, role: str) -> str | None:
        """Get the wallet address assigned to a specific role."""
        wallet = self.wallets_by_role.get(role)
        if wallet:
            return wallet.get("address")
        return None

    def create_wallet(self, wallet_set_id: str, idempotency_key: str | None = None) -> dict:
        """Create a developer-controlled wallet on Arc testnet."""
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())

        if not self.api_key:
            logger.info("MOCK: Creating developer wallet on Arc testnet (no API key provided)")
            return {
                "data": {
                    "wallets": [
                        {
                            "id": f"mock-wallet-{uuid.uuid4().hex[:8]}",
                            "address": f"0xMockAddress{uuid.uuid4().hex[:8]}",
                            "blockchain": "ARC-TESTNET"
                        }
                    ]
                }
            }

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
        if not self.api_key:
            logger.info(f"MOCK: Requesting testnet USDC for {address}")
            return {"data": {"status": "success", "mock": True}}

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

        if not self.api_key:
            logger.info(f"MOCK: Executing smoke transfer of {amount} to {destination_address}")
            return {
                "data": {
                    "id": f"mock-tx-{uuid.uuid4().hex[:8]}",
                    "state": "INITIATED",
                    "txHash": f"0xMockTxHash{uuid.uuid4().hex[:16]}"
                }
            }

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

circle_client = CircleDeveloperClient()
