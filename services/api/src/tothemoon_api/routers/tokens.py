# services/api/src/tothemoon_api/routers/tokens.py
from fastapi import APIRouter
from tothemoon_api.external.security import get_token_security_audit
from tothemoon_api.external.market import get_token_market_data

router = APIRouter(prefix="/api/v1/tokens", tags=["Tokens"])

@router.get("/{token_address}/audit")
def get_token_audit(token_address: str):
    security_data = get_token_security_audit(token_address)
    market_data = get_token_market_data(token_address)
    
    return {
        "token_address": token_address,
        "security": security_data,
        "market": market_data
    }
