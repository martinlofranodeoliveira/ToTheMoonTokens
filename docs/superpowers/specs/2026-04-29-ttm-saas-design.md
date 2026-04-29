# TTM SaaS - Bot Testing Infrastructure Design

## 1. Overview
The TTM (To The Moon) SaaS is an infrastructure platform ("Automated Venture Capital" / "Agentic Economy") designed to provide a realistic, high-fidelity Paper Trading environment for AI trading bots. Instead of risking real capital in highly volatile and scam-ridden micro-cap token markets, developers connect their bots to our API. We simulate trades applying real-world constraints like network gas fees, slippage, and honeypot/rug-pull risks.

## 2. Core Architecture
The system consists of the following decoupled components, building upon the existing TTM Agent Market foundation:

### A. API Gateway (FastAPI)
- **Purpose**: The primary interface for external AI bots.
- **Features**:
  - API Key authentication and rate limiting.
  - Endpoints for submitting simulated buy/sell orders (`/api/v1/simulate/order`).
  - Endpoints for fetching token security metadata (`/api/v1/tokens/{address}/audit`).
  - Webhooks for order execution status.

### B. Simulation Engine (Python Core)
- **Purpose**: The heart of the platform. Executes trades in a simulated environment.
- **Features**:
  - **Fee Simulator**: Calculates and deducts gas fees (Ethereum, Solana, Base) from the simulated balance.
  - **Slippage Calculator**: Applies a penalty to the execution price based on market volatility and order size.
  - **Scam Filter**: Reads contract audit data to flag if an AI bought a honeypot (resulting in a 100% loss of the simulated trade).
  - **Ledger**: Records all simulated transactions and maintains the virtual portfolio balance.

### C. Data & Security Ingestion (Background Workers)
- **Purpose**: Feeds real-world data into the simulation engine.
- **Features**:
  - Integrations with external APIs (e.g., TokenSniffer, GoPlus Security, DexScreener).
  - Caches token metadata and security scores to ensure low-latency API responses.

### D. User Dashboard (Frontend)
- **Purpose**: The control panel for the bot developer.
- **Features**:
  - API Key generation and management.
  - Visualization of bot performance (win rate, simulated PnL, detailed trade logs).
  - Subscription management and billing (Integration with Circle USDC programmable wallets for payments, as established in the original TTM repo).

### E. Database
- **Technology**: PostgreSQL (relational structure for ledgers and users).
- **Entities**: Users, API Keys, Portfolios, Transactions, Token Audits.

## 3. Data Flow (The "Happy Path")
1. **Developer Setup**: User registers on the Dashboard, pays the subscription via Circle (USDC), and generates an API Key.
2. **Bot Intelligence**: The external AI bot identifies a promising token (Token X).
3. **Pre-trade Audit**: The bot calls our `/api/v1/tokens/{Token_X}/audit` endpoint. The API Gateway returns security metrics (e.g., "Liquidity locked: 90%, Honeypot risk: Low").
4. **Order Submission**: The bot decides to buy and sends a POST request to `/api/v1/simulate/order` with the API Key and trade details.
5. **Simulation**:
   - The Simulation Engine verifies the user's virtual balance.
   - It calculates real-time slippage and deducts simulated network fees.
   - It records the executed trade in the Ledger.
6. **Reporting**: The user logs into the Dashboard to see that their bot successfully executed a simulated trade, netting a 20% virtual profit after simulated fees.

## 4. Implementation Strategy (Iterative)
We will adopt an iterative, test-driven approach, committing code at each stable milestone:
- **Phase 1**: Enhance the existing FastAPI backend to support the Simulation Engine core (virtual wallets, basic buy/sell logic with hardcoded fees).
- **Phase 2**: Implement the API Gateway with API Key authentication.
- **Phase 3**: Integrate external real-time data for accurate slippage and security auditing.
- **Phase 4**: Develop the Dashboard frontend for user management and reporting.
- **Phase 5**: Wire up the Circle USDC billing for SaaS subscriptions.

## 5. Security & Error Handling
- All API endpoints must be strongly typed (Pydantic) and validated.
- Robust error handling for external API failures (e.g., DexScreener is down) to ensure the simulation engine fails gracefully or uses cached data.
- API Keys must be hashed in the database.

## 6. Testing Strategy
- Unit tests for the Simulation Engine's mathematical calculations (fees, slippage).
- Integration tests for the API endpoints using test database sessions.
- Mocked external API calls to ensure reliable test suites.
- Coverage must be maintained above 85% for core components.