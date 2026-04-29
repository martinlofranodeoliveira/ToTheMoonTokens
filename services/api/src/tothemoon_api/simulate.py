import logging
from fastapi import APIRouter, Depends, HTTPException
from tothemoon_api.simulation import OrderRequest, OrderResponse, simulate_trade
from tothemoon_api.auth import verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/simulate", tags=["Simulation"])

@router.post("/order", response_model=OrderResponse)
def execute_simulation(order: OrderRequest, api_key: str = Depends(verify_api_key)) -> OrderResponse:
    logger.info(f"Executing simulation for order: {order}")
    try:
        result: OrderResponse = simulate_trade(order)
        logger.info("Simulation executed successfully")
        return result
    except Exception as e:
        logger.error(f"Error executing simulation: {e}")
        raise HTTPException(status_code=500, detail="Simulation execution failed")
