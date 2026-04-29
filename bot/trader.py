import argparse
import requests
import json
import time

API_URL = "http://127.0.0.1:8010/api/v1/simulate/order"

def execute_trade(api_key, token_address, amount, side="buy"):
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "token_address": token_address,
        "amount": amount,
        "side": side
    }
    
    print(f"Executing {side.upper()} order for {amount} of {token_address}...")
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error executing trade: {e}")
        if response is not None:
             print(f"Response: {response.text}")
        return None

def apply_risk_management(entry_price, current_price, stop_loss_pct=5.0, take_profit_pct=10.0):
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

def main():
    parser = argparse.ArgumentParser(description="Autonomous Trading Bot - Trader & Risk Manager")
    parser.add_argument("--token", required=True, help="Token address to trade")
    parser.add_argument("--api-key", required=True, help="TTM SaaS API Key")
    parser.add_argument("--amount", type=float, default=100.0, help="Amount to trade")
    args = parser.parse_args()

    print(f"--- Starting Trading Bot for Token: {args.token} ---")
    
    # 1. Execute Buy Order
    trade_result = execute_trade(args.api_key, args.token, args.amount, "buy")
    
    if trade_result:
        print("Trade executed successfully:")
        print(json.dumps(trade_result, indent=2))
        
        # Simulate checking price after some time
        print("\nSimulating market movement...")
        # In a real scenario, this would be fetched from an API
        # Mock entry price if the API doesn't return one
        entry_price = trade_result.get("price", 10.0) 
        
        # Simulate price drop triggering stop loss
        simulated_current_price = entry_price * 0.92 
        
        action = apply_risk_management(entry_price, simulated_current_price)
        
        if action == "SELL":
            print("\nExecuting SELL order due to risk management rules...")
            sell_result = execute_trade(args.api_key, args.token, args.amount, "sell")
            if sell_result:
                print("Sell order executed successfully:")
                print(json.dumps(sell_result, indent=2))
    else:
        print("Initial trade failed. Aborting.")

if __name__ == "__main__":
    main()
