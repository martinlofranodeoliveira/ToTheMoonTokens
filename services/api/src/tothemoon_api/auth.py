# services/api/src/tothemoon_api/auth.py
import secrets
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

# Mocked valid key for now
VALID_API_KEY = "ttm_sk_live_mocked12345"

def verify_api_key(api_key: str = Security(api_key_header)):
    if not secrets.compare_digest(api_key, VALID_API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key
