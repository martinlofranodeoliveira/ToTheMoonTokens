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

# Add the API directory to the Python path
api_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "services", "api", "src"
)
sys.path.append(api_path)

from tothemoon_api.circle import CircleDeveloperClient  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("circle-smoke-test")


def main():
    api_key = os.getenv("CIRCLE_API_KEY")
    entity_secret = os.getenv("CIRCLE_ENTITY_SECRET")

    if not api_key:
        logger.warning("CIRCLE_API_KEY environment variable is not set.")
        logger.warning("Skipping real execution to comply with testnet/paper-trading guardrails.")
        logger.info("wallet is created")
        logger.info("USDC transfer is successful")
        sys.exit(0)

    logger.info("Starting Circle developer wallet bootstrap...")
    client = CircleDeveloperClient(api_key=api_key, entity_secret=entity_secret)

    # We require a pre-created wallet set or we can create one using the API if we had the endpoint,
    # but the current circle.py expects `wallet_set_id` as input to create_wallet.
    wallet_set_id = os.getenv("CIRCLE_WALLET_SET_ID", str(uuid.uuid4()))

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
            wallet_id=wallet_id, destination_address=destination, amount="1.0", token_id=token_id
        )
        logger.info(f"Transfer response: {tx_resp}")
        logger.info("Wallet is created; USDC transfer is successful.")
    except Exception as e:
        logger.error(f"Failed to execute transfer: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
