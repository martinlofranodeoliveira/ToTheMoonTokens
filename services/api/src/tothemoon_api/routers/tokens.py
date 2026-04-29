# services/api/src/tothemoon_api/routers/tokens.py
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from tothemoon_api.external.security import get_token_security_audit
from tothemoon_api.external.market import get_token_market_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tokens", tags=["Tokens"])

@router.get("/{token_address}/audit", response_model=Dict[str, Any])
def get_token_audit(token_address: str) -> Dict[str, Any]:
    logger.info(f"Fetching token audit for {token_address}")
    try:
        security_data: Dict[str, Any] = get_token_security_audit(token_address)
        market_data: Dict[str, Any] = get_token_market_data(token_address)
        
        result: Dict[str, Any] = {
            "token_address": token_address,
            "security": security_data,
            "market": market_data
        }
        logger.info(f"Successfully fetched token audit for {token_address}")
        return result
    except Exception as e:
        logger.error(f"Failed to get token audit for {token_address}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching token audit data")
