#!/usr/bin/env python3
import sys
import os
import argparse
import logging

# Ensure the tothemoon_api module can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../services/api/src"))

from tothemoon_api.circle import create_developer_wallet, transfer_usdc, CircleWalletError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap Circle Wallet and execute USDC smoke transfer.")
    parser.add_argument("--destination", type=str, required=True, help="Destination wallet address for USDC transfer")
    parser.add_argument("--amount", type=str, default="1.0", help="Amount of USDC to transfer (default: 1.0)")
    parser.add_argument("--blockchain", type=str, default="ARC-TESTNET", help="Testnet blockchain name (default: ARC-TESTNET)")
    args = parser.parse_args()

    try:
        log.info("Bootstrapping Circle developer wallet on %s...", args.blockchain)
        wallet = create_developer_wallet(blockchain=args.blockchain)
        wallet_id = wallet.get("id")
        wallet_address = wallet.get("address")
        log.info("Wallet created! ID: %s | Address: %s", wallet_id, wallet_address)

        log.info("Initiating USDC smoke transfer of %s to %s...", args.amount, args.destination)
        transfer = transfer_usdc(
            wallet_id=wallet_id,
            destination_address=args.destination,
            amount=args.amount
        )
        
        tx_id = transfer.get("transaction_id")
        status = transfer.get("status")
        log.info("Transfer successful! TX ID: %s | Status: %s", tx_id, status)
        
    except CircleWalletError as e:
        log.error("Smoke transfer failed: %s", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
