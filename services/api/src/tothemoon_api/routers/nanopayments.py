from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..auth import current_user_from_jwt
from ..config import get_settings
from ..db_models import User

router = APIRouter(prefix="/api/v1/nanopayments", tags=["Nanopayments"])
CurrentUser = Annotated[User, Depends(current_user_from_jwt)]

_RESOURCES: dict[str, dict[str, object]] = {}


class ResourceCreateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    amount_usd: float = Field(gt=0)
    content: str = Field(min_length=1, max_length=4000)


@router.post("/resources", status_code=201)
def create_resource(payload: ResourceCreateRequest, user: CurrentUser) -> dict[str, object]:
    resource = {
        "id": payload.id,
        "amount_usd": payload.amount_usd,
        "content": payload.content,
        "owner_email": user.email,
    }
    _RESOURCES[payload.id] = resource
    return {"resource": resource}


@router.get("/resources/{resource_id}")
def get_resource(
    resource_id: str,
    request: Request,
    payment_signature: Annotated[str | None, Header(alias="PAYMENT-SIGNATURE")] = None,
):
    resource = _RESOURCES.get(resource_id)
    if not resource:
        return JSONResponse(status_code=404, content={"detail": "Resource not found"})
    if not payment_signature:
        settings = get_settings()
        requirements = {
            "scheme": "x402",
            "network": "arc_testnet",
            "resource_id": resource_id,
            "amount_usd": resource["amount_usd"],
            "pay_to": settings.x402_payment_address,
            "method": request.method,
            "path": request.url.path,
        }
        return JSONResponse(
            status_code=402,
            content={"detail": "Payment required"},
            headers={"PAYMENT-REQUIREMENTS": json.dumps(requirements, separators=(",", ":"))},
        )
    return {"resource": resource, "payment_signature": payment_signature}
