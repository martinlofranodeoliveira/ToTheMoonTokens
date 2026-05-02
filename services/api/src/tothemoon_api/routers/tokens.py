# services/api/src/tothemoon_api/routers/tokens.py
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from tothemoon_api.auth import verify_api_key
from tothemoon_api.database import get_db
from tothemoon_api.db_models import ApiKey
from tothemoon_api.external.market import get_token_market_data
from tothemoon_api.external.security import get_token_security_audit
from tothemoon_api.quota import enforce_quota

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tokens", tags=["Tokens"])
VerifiedApiKey = Annotated[ApiKey, Depends(verify_api_key)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/{token_address}/audit", response_model=dict[str, Any])
def get_token_audit(
    token_address: str,
    api_key: VerifiedApiKey,
    db: DbSession,
) -> dict[str, Any]:
    logger.info(f"Fetching token audit for {token_address}")
    try:
        enforce_quota(api_key, "token_audit", db)
        security_data: dict[str, Any] = get_token_security_audit(token_address)
        market_data: dict[str, Any] = get_token_market_data(token_address)

        result: dict[str, Any] = {
            "token_address": token_address,
            "security": security_data,
            "market": market_data,
        }
        logger.info(f"Successfully fetched token audit for {token_address}")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to get token audit for {token_address}: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching token audit data",
        ) from exc
