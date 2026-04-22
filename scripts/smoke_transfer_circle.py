#!/usr/bin/env python3
import sys
import os
import argparse
import logging
import uuid

# Ensure the tothemoon_api module can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../services/api/src"))

from tothemoon_api.circle import CircleDeveloperClient
from tothemoon_api.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap Circle Wallet and execute USDC smoke transfer.")
    parser.add_argument("--destination", type=str, required=True, help="Destination wallet address for USDC transfer")
    parser.add_argument("--amount", type=str, default="1.0", help="Amount of USDC to transfer (default: 1.0)")
    parser.add_argument("--blockchain", type=str, default="ARC-TESTNET", help="Testnet blockchain name (default: ARC-TESTNET)")
    args = parser.parse_args()

    settings = get_settings()
    client = CircleDeveloperClient()
    wallet_set_id = settings.circle_wallet_set_id or str(uuid.uuid4())

    try:
        log.info("Bootstrapping Circle developer wallet on %s...", args.blockchain)
        wallet_resp = client.create_wallet(wallet_set_id=wallet_set_id)
        wallets = wallet_resp.get("data", {}).get("wallets", [])
        if not wallets:
            log.error("No wallets returned in creation response.")
            sys.exit(1)
            
        wallet = wallets[0]
        wallet_id = wallet.get("id")
        wallet_address = wallet.get("address")
        log.info("Wallet created! ID: %s | Address: %s", wallet_id, wallet_address)

        log.info("Initiating USDC smoke transfer of %s to %s...", args.amount, args.destination)
        token_id = os.getenv("CIRCLE_USDC_TOKEN_ID", "usdc-testnet-token-id")
        transfer = client.execute_smoke_transfer(
            wallet_id=wallet_id,
            destination_address=args.destination,
            amount=args.amount,
            token_id=token_id
        )
        
        data = transfer.get("data", {})
        tx_id = data.get("id")
        status = data.get("state")
        log.info("Transfer successful! TX ID: %s | Status: %s", tx_id, status)
        
    except Exception as e:
        log.error("Smoke transfer failed: %s", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
