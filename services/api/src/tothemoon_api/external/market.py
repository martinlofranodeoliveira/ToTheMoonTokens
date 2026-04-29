# services/api/src/tothemoon_api/external/market.py
def get_token_market_data(token_address: str) -> dict:
    # Mock implementation of DexScreener
    return {
        "token_address": token_address,
        "price": 1.05,
        "volatility_index": 0.02, # 2% volatility
        "volume_24h": 1500000.0
    }
