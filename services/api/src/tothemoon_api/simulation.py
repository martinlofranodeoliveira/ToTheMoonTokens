from pydantic import BaseModel
from enum import Enum

class TradeSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderRequest(BaseModel):
    token_address: str
    amount: float
    side: TradeSide

class OrderResponse(BaseModel):
    status: str
    executed_price: float
    fees_paid: float
    net_amount: float

def simulate_trade(order: OrderRequest) -> OrderResponse:
    # MVP Hardcoded values
    base_price = 1.0
    fee = 2.0
    slippage_rate = 0.01

    if order.side == TradeSide.BUY:
        executed_price = base_price * (1 + slippage_rate)
    else:
        executed_price = base_price * (1 - slippage_rate)

    net_amount = order.amount - fee

    return OrderResponse(
        status="SUCCESS",
        executed_price=executed_price,
        fees_paid=fee,
        net_amount=net_amount
    )
