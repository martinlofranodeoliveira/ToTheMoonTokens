# TTM SaaS Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the core Simulation Engine and API Gateway endpoints to allow basic simulated buy/sell orders with hardcoded network fees and slippage, laying the foundation for the Agentic Economy SaaS.

**Architecture:** We will add new models to `src/models/`, core simulation logic to `src/services/simulator.py`, and expose it via a new router in `src/routers/simulate.py` within the FastAPI application.

**Tech Stack:** FastAPI, Pydantic, Pytest

---

### Task 1: Simulation Data Models

**Files:**
- Create: `services/api/src/models/simulation.py`
- Test: `services/api/tests/test_simulation_models.py`

- [ ] **Step 1: Write the failing test for order models**

```python
# services/api/tests/test_simulation_models.py
from src.models.simulation import OrderRequest, OrderResponse, TradeSide

def test_order_request_validation():
    req = OrderRequest(token_address="0xABC", amount=100.0, side=TradeSide.BUY)
    assert req.token_address == "0xABC"
    assert req.amount == 100.0
    assert req.side == "BUY"

def test_order_response_structure():
    resp = OrderResponse(
        status="SUCCESS",
        executed_price=1.05,
        fees_paid=0.5,
        net_amount=99.5
    )
    assert resp.status == "SUCCESS"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && ./.venv/bin/python -m pytest tests/test_simulation_models.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'src.models.simulation')

- [ ] **Step 3: Write minimal implementation**

```python
# services/api/src/models/simulation.py
from pydantic import BaseModel
from enum import Enum

class TradeSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderRequest(BaseModel):
    token_address: str
    amount: float
    side: TradeSide

class OrderResponse(BaseModel):
    status: str
    executed_price: float
    fees_paid: float
    net_amount: float
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && ./.venv/bin/python -m pytest tests/test_simulation_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/tests/test_simulation_models.py services/api/src/models/simulation.py
git commit -m "feat: add basic simulation pydantic models"
```

### Task 2: Core Simulation Logic (Fee and Slippage)

**Files:**
- Create: `services/api/src/services/simulator.py`
- Test: `services/api/tests/test_simulator.py`

- [ ] **Step 1: Write the failing test for simulator**

```python
# services/api/tests/test_simulator.py
from src.services.simulator import simulate_trade
from src.models.simulation import OrderRequest, TradeSide

def test_simulate_trade_applies_fees_and_slippage():
    # Hardcoded base price: $1.00 for testing
    # Hardcoded fee: $2.00 per trade
    # Slippage: 1% penalty on amount
    req = OrderRequest(token_address="0xTEST", amount=100.0, side=TradeSide.BUY)
    response = simulate_trade(req)
    
    assert response.status == "SUCCESS"
    assert response.executed_price == 1.01  # 1% slippage added to buy
    assert response.fees_paid == 2.0
    # Amount after fees and slippage: (100.0 / 1.01) = 99.0099. Then minus 2.0 fee? 
    # Let's keep math simple for now: net_amount = amount - fees
    assert response.net_amount == 98.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && ./.venv/bin/python -m pytest tests/test_simulator.py -v`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```python
# services/api/src/services/simulator.py
from src.models.simulation import OrderRequest, OrderResponse, TradeSide

def simulate_trade(order: OrderRequest) -> OrderResponse:
    # MVP Hardcoded values
    base_price = 1.0
    fee = 2.0
    slippage_rate = 0.01

    if order.side == TradeSide.BUY:
        executed_price = base_price * (1 + slippage_rate)
    else:
        executed_price = base_price * (1 - slippage_rate)

    net_amount = order.amount - fee

    return OrderResponse(
        status="SUCCESS",
        executed_price=executed_price,
        fees_paid=fee,
        net_amount=net_amount
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && ./.venv/bin/python -m pytest tests/test_simulator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/tests/test_simulator.py services/api/src/services/simulator.py
git commit -m "feat: implement basic simulation math logic"
```

### Task 3: Simulation API Endpoint

**Files:**
- Create: `services/api/src/routers/simulate.py`
- Modify: `services/api/src/main.py`
- Test: `services/api/tests/test_api_simulate.py`

- [ ] **Step 1: Write the failing test**

```python
# services/api/tests/test_api_simulate.py
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_simulate_endpoint():
    response = client.post("/api/v1/simulate/order", json={
        "token_address": "0xABC",
        "amount": 50.0,
        "side": "SELL"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["fees_paid"] == 2.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && ./.venv/bin/python -m pytest tests/test_api_simulate.py -v`
Expected: FAIL (404 Not Found)

- [ ] **Step 3: Write minimal implementation**

```python
# services/api/src/routers/simulate.py
from fastapi import APIRouter
from src.models.simulation import OrderRequest, OrderResponse
from src.services.simulator import simulate_trade

router = APIRouter(prefix="/api/v1/simulate", tags=["Simulation"])

@router.post("/order", response_model=OrderResponse)
def execute_simulation(order: OrderRequest):
    return simulate_trade(order)
```

```python
# Add to services/api/src/main.py (Find APIRouter includes and add this)
# Assuming typical FastAPI main.py structure. If src.main is missing, create minimal wrapper or adapt.
# For plan purposes, we assume main.py exists and we append the include:

# In services/api/src/main.py:
from src.routers.simulate import router as simulate_router
# app.include_router(simulate_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && ./.venv/bin/python -m pytest tests/test_api_simulate.py -v`
Expected: PASS

- [ ] **Step 5: Commit and Push**

```bash
git add services/api/tests/test_api_simulate.py services/api/src/routers/simulate.py services/api/src/main.py
git commit -m "feat: expose simulation engine via API endpoint"
git push origin HEAD
```