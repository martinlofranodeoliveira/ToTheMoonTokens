import argparse
import time
from scanner import scan_market
from auditor import is_token_safe
from trader import execute_paper_trade

def main():
    parser = argparse.ArgumentParser(description="TTM Autonomous Venture Capital Bot")
    parser.add_argument("--api-key", required=True, help="API Key for TTM SaaS")
    args = parser.parse_args()

    print("🚀 Starting TTM Autonomous Trading Bot...")
    print("========================================")

    # 1. Scan Market
    print("[1/3] Scanning the market for new opportunities...")
    promising_tokens = scan_market()
    print(f"Found {len(promising_tokens)} promising tokens: {promising_tokens}\n")

    for token in promising_tokens:
        print(f"--- Analyzing Token: {token} ---")
        
        # 2. Audit Token
        print(f"[2/3] Auditing token {token} for honeypot and rugpull risks...")
        if is_token_safe(token):
            print(f"✅ Token {token} passed the security audit. Safe to trade.")
            
            # 3. Trade and Manage Risk
            print(f"[3/3] Executing Paper Trade on TTM SaaS...")
            execute_paper_trade(token, args.api_key, amount=100.0)
        else:
            print(f"🚨 SCAM ALERT: Token {token} failed the security audit. Skipping trade.")
        
        print("-" * 40)
        time.sleep(1) # Be nice to the API

    print("========================================")
    print("Bot cycle complete.")

if __name__ == "__main__":
    main()
