from fastapi import APIRouter
from tothemoon_api.simulation import OrderRequest, OrderResponse, simulate_trade

router = APIRouter(prefix="/api/v1/simulate", tags=["Simulation"])

@router.post("/order", response_model=OrderResponse)
def execute_simulation(order: OrderRequest):
    return simulate_trade(order)
