import argparse
import asyncio
import aiohttp
from scanner import scan_market
from auditor import is_token_safe
from trader import execute_paper_trade

async def analyze_and_trade(session: aiohttp.ClientSession, token: str, api_key: str):
    print(f"\n--- Analyzing Token: {token} ---")
    
    # 2. Audit Token
    print(f"[{token}] Auditing for honeypot and rugpull risks...")
    is_safe = await is_token_safe(session, token)
    
    if is_safe:
        print(f"✅ [{token}] Passed the security audit. Safe to trade.")
        
        # 3. Trade and Manage Risk
        print(f"[{token}] Executing Paper Trade on TTM SaaS...")
        await execute_paper_trade(session, token, api_key, amount=100.0)
    else:
        print(f"🚨 [{token}] SCAM ALERT: Failed the security audit. Skipping trade.")
    
    print(f"--- Finished Token: {token} ---")

async def async_main():
    parser = argparse.ArgumentParser(description="TTM Autonomous Venture Capital Bot")
    parser.add_argument("--api-key", required=True, help="API Key for TTM SaaS")
    args = parser.parse_args()

    print("🚀 Starting TTM Autonomous Trading Bot...")
    print("========================================")

    # 1. Scan Market
    print("[1/3] Scanning the market for new opportunities...")
    promising_tokens = await scan_market()
    print(f"Found {len(promising_tokens)} promising tokens: {promising_tokens}\n")

    print("[2/3] & [3/3] Analyzing and Trading concurrently...")
    async with aiohttp.ClientSession() as session:
        # Analyze and trade all promising tokens concurrently
        tasks = [
            analyze_and_trade(session, token, args.api_key)
            for token in promising_tokens
        ]
        
        # Run all tasks concurrently
        await asyncio.gather(*tasks)

    print("\n========================================")
    print("Bot cycle complete.")

def main():
    asyncio.run(async_main())

if __name__ == "__main__":
    main()
