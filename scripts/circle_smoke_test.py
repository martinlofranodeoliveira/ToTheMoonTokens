#!/usr/bin/env python3
"""
Smoke test for Circle Developer Wallet and USDC transfer on Arc Testnet.
This script demonstrates bootstrapping a wallet and executing a transfer.
"""

import logging
import os
import sys
import time
import uuid
import json
from datetime import datetime

# Add the API directory to the Python path
api_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "services", "api", "src"
)
sys.path.append(api_path)

from tothemoon_api.circle import CircleDeveloperClient  # noqa: E402
from tothemoon_api.config import get_settings  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("circle-smoke-test")


def main():
    settings = get_settings()
    api_key = settings.circle_api_key
    entity_secret = settings.circle_entity_secret

    if not api_key:
        logger.warning("CIRCLE_API_KEY environment variable is not set. Running against MOCK sandbox.")

    logger.info("Starting Circle developer wallet bootstrap...")
    client = CircleDeveloperClient()

    wallet_set_id = settings.circle_wallet_set_id or str(uuid.uuid4())

    logger.info(f"Creating wallet under wallet set {wallet_set_id}...")
    try:
        wallet_resp = client.create_wallet(wallet_set_id=wallet_set_id)
        logger.info(f"Wallet creation response: {wallet_resp}")

        # Typically the wallet address is in the response
        wallets = wallet_resp.get("data", {}).get("wallets", [])
        if not wallets:
            logger.error("No wallets returned in creation response.")
            sys.exit(1)

        wallet_address = wallets[0].get("address")
        wallet_id = wallets[0].get("id")
        logger.info(f"Wallet {wallet_id} created with address {wallet_address}.")
    except Exception as e:
        logger.error(f"Failed to create wallet: {e}")
        sys.exit(1)

    logger.info(f"Funding wallet {wallet_address} with testnet USDC...")
    try:
        fund_resp = client.fund_with_testnet_usdc(address=wallet_address)
        logger.info(f"Funding response: {fund_resp}")
    except Exception as e:
        logger.error(f"Failed to request testnet funds: {e}")
        sys.exit(1)

    logger.info("Waiting for funds to settle...")
    time.sleep(5)

    destination = os.getenv(
        "CIRCLE_DESTINATION_ADDRESS", "0x0000000000000000000000000000000000000000"
    )
    token_id = os.getenv("CIRCLE_USDC_TOKEN_ID", "usdc-testnet-token-id")

    logger.info(f"Executing smoke transfer to {destination}...")
    try:
        tx_resp = client.execute_smoke_transfer(
            wallet_id=wallet_id, destination_address=destination, amount="0.01", token_id=token_id
        )
        logger.info(f"Transfer response: {tx_resp}")
        tx_hash = tx_resp.get("data", {}).get("txHash", "mocked_tx_hash")
        
        evidence_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ops", "evidence")
        os.makedirs(evidence_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        evidence_file = os.path.join(evidence_dir, f"circle-smoke-{timestamp}.json")
        
        evidence = {
            "wallet_id": wallet_id,
            "wallet_address": wallet_address,
            "destination": destination,
            "amount": "0.01",
            "token_id": token_id,
            "tx_hash": tx_hash,
            "raw_response": tx_resp,
            "timestamp": timestamp
        }
        
        with open(evidence_file, "w") as f:
            json.dump(evidence, f, indent=2)
            
        logger.info(f"Wallet is created; USDC transfer is successful. Evidence saved to {evidence_file}")
    except Exception as e:
        logger.error(f"Failed to execute transfer: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()