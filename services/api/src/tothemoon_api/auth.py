import secrets
from datetime import datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .db_models import ApiKey, Membership, User
from .observability import bind_trace_context

ph = PasswordHasher()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
DbSession = Annotated[Session, Depends(get_db)]
JwtToken = Annotated[str | None, Depends(oauth2_scheme)]
ApiKeyValue = Annotated[str | None, Security(api_key_header)]


def hash_password(plain: str) -> str:
    return ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        ph.verify(hashed, plain)
        return True
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def generate_api_key() -> tuple[str, str, str]:
    raw = "ttm_sk_live_" + secrets.token_urlsafe(32)
    return raw, raw[:12], ph.hash(raw)


def create_jwt_for_user(user: User) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def current_user_from_jwt(
    token: JwtToken,
    db: DbSession,
    request: Request,
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    settings = get_settings()
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(data["sub"])
    except (JWTError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")
    membership = user.memberships[0] if user.memberships else None
    bind_trace_context(
        endpoint=request.url.path,
        user_id=user.id,
        org_id=membership.org_id if membership else None,
    )
    return user


def verify_api_key(
    api_key: ApiKeyValue,
    db: DbSession,
    request: Request,
) -> ApiKey:
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key")
    prefix = api_key[:12]
    candidates = db.query(ApiKey).filter(ApiKey.prefix == prefix, ApiKey.revoked_at.is_(None)).all()
    for candidate in candidates:
        try:
            ph.verify(candidate.key_hash, api_key)
        except (InvalidHashError, VerificationError, VerifyMismatchError):
            continue
        if candidate.org_id is None:
            continue
        owner_membership = (
            db.query(Membership)
            .filter(
                Membership.user_id == candidate.user_id,
                Membership.org_id == candidate.org_id,
            )
            .first()
        )
        if owner_membership is None or not candidate.owner.is_active:
            continue
        candidate.last_used_at = datetime.utcnow()
        db.commit()
        bind_trace_context(
            endpoint=request.url.path,
            org_id=candidate.org_id,
            api_key_id=candidate.id,
        )
        return candidate
    raise HTTPException(status_code=403, detail="Invalid API Key")
