from fastapi import APIRouter, Depends
from tothemoon_api.simulation import OrderRequest, OrderResponse, simulate_trade
from tothemoon_api.auth import verify_api_key

router = APIRouter(prefix="/api/v1/simulate", tags=["Simulation"])

@router.post("/order", response_model=OrderResponse)
def execute_simulation(order: OrderRequest, api_key: str = Depends(verify_api_key)):
    return simulate_trade(order)
