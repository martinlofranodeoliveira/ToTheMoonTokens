# TTM SaaS Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement JWT-based API Key authentication to secure the SaaS Simulation Engine.

**Architecture:** Create an `auth.py` utility to verify a hardcoded or basic JWT API key, and protect the `/api/v1/simulate/order` endpoint.

**Tech Stack:** FastAPI, Pytest

---

### Task 1: Authentication Middleware and Protection

**Files:**
- Create: `services/api/src/tothemoon_api/auth.py`
- Modify: `services/api/src/tothemoon_api/simulate.py`

- [ ] **Step 1: Write auth.py**

```python
# services/api/src/tothemoon_api/auth.py
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key.startswith("ttm_sk_"):
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key
```

- [ ] **Step 2: Protect the simulate endpoint**

```python
# Replace the contents of services/api/src/tothemoon_api/simulate.py with:
from fastapi import APIRouter, Depends
from tothemoon_api.simulation import OrderRequest, OrderResponse, simulate_trade
from tothemoon_api.auth import verify_api_key

router = APIRouter(prefix="/api/v1/simulate", tags=["Simulation"])

@router.post("/order", response_model=OrderResponse)
def execute_simulation(order: OrderRequest, api_key: str = Depends(verify_api_key)):
    return simulate_trade(order)
```
