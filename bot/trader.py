import argparse
import aiohttp
import asyncio
import json

API_URL = "http://127.0.0.1:8010/api/v1/simulate/order"

async def execute_trade(session: aiohttp.ClientSession, api_key: str, token_address: str, amount: float, side: str = "buy"):
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "token_address": token_address,
        "amount": amount,
        "side": side
    }
    
    print(f"[{token_address}] Executing {side.upper()} order for {amount}...")
    try:
        async with session.post(API_URL, headers=headers, json=payload) as response:
            response.raise_for_status()
            return await response.json()
    except Exception as e:
        print(f"[{token_address}] Error executing trade: {e}")
        return None

async def execute_paper_trade(session: aiohttp.ClientSession, token_address: str, api_key: str, amount: float = 100.0):
    return await execute_trade(session, api_key, token_address, amount, "buy")

def apply_risk_management(entry_price: float, current_price: float, stop_loss_pct: float = 5.0, take_profit_pct: float = 10.0):
    loss_threshold = entry_price * (1 - stop_loss_pct / 100)
    profit_threshold = entry_price * (1 + take_profit_pct / 100)
    
    print(f"Risk Management Check - Entry: {entry_price:.4f}, Current: {current_price:.4f}")
    print(f"Stop Loss Threshold: {loss_threshold:.4f}, Take Profit Threshold: {profit_threshold:.4f}")
    
    if current_price <= loss_threshold:
        print("STOP LOSS triggered!")
        return "SELL"
    elif current_price >= profit_threshold:
        print("TAKE PROFIT triggered!")
        return "SELL"
    
    print("HOLD position.")
    return "HOLD"

async def main_cli():
    parser = argparse.ArgumentParser(description="Autonomous Trading Bot - Trader & Risk Manager")
    parser.add_argument("--token", required=True, help="Token address to trade")
    parser.add_argument("--api-key", required=True, help="TTM SaaS API Key")
    parser.add_argument("--amount", type=float, default=100.0, help="Amount to trade")
    args = parser.parse_args()

    print(f"--- Starting Trading Bot for Token: {args.token} ---")
    
    async with aiohttp.ClientSession() as session:
        # 1. Execute Buy Order
        trade_result = await execute_trade(session, args.api_key, args.token, args.amount, "buy")
        
        if trade_result:
            print("Trade executed successfully:")
            print(json.dumps(trade_result, indent=2))
            
            # Simulate checking price after some time
            print("\nSimulating market movement...")
            await asyncio.sleep(1)
            
            # In a real scenario, this would be fetched from an API
            entry_price = trade_result.get("price", 10.0) 
            simulated_current_price = entry_price * 0.92 
            
            action = apply_risk_management(entry_price, simulated_current_price)
            
            if action == "SELL":
                print("\nExecuting SELL order due to risk management rules...")
                sell_result = await execute_trade(session, args.api_key, args.token, args.amount, "sell")
                if sell_result:
                    print("Sell order executed successfully:")
                    print(json.dumps(sell_result, indent=2))
        else:
            print("Initial trade failed. Aborting.")

if __name__ == "__main__":
    asyncio.run(main_cli())
