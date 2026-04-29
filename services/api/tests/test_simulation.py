from tothemoon_api.simulation import OrderRequest, OrderResponse, TradeSide, simulate_trade

def test_order_request_validation():
    req = OrderRequest(token_address="0xABC", amount=100.0, side=TradeSide.BUY)
    assert req.token_address == "0xABC"
    assert req.amount == 100.0
    assert req.side == "BUY"

def test_simulate_trade_applies_fees_and_slippage():
    # Hardcoded base price: $1.00 for testing
    # Hardcoded fee: $2.00 per trade
    # Slippage: 1% penalty on amount
    req = OrderRequest(token_address="0xTEST", amount=100.0, side=TradeSide.BUY)
    response = simulate_trade(req)
    
    assert response.status == "SUCCESS"
    assert response.executed_price == 1.01  # 1% slippage added to buy
    assert response.fees_paid == 2.0
    assert response.net_amount == 98.0
