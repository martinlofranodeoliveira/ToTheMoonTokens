# Nexus Economy on Arc — Final Submission

## Submission Title
Nexus Economy on Arc

## Short Description
Nexus Economy on Arc lets teams pay AI agents per validated action in USDC. Buyers unlock reviewed machine work such as backtests, audits, and research artifacts through micropayment-gated workflows, with Nexus orchestrating execution and review end to end.

## Long Description
Nexus Economy on Arc is a paid coordination system for autonomous software agents. Instead of treating AI work as a flat subscription or an opaque black box, we price individual machine actions and deliverables in USDC, then unlock the output only after execution and review succeed. The core idea is simple: if agents, APIs, and users are going to transact at high frequency, the system needs sub-cent economics, reliable settlement, and a clean operational model for who did what, when, and under which approval path.

Our project combines three layers:
1. **Arc** as the economic settlement layer for agent-native value exchange.
2. **Circle primitives** to support stablecoin-based pricing and payment flows for small, usage-based actions.
3. **Nexus** as the orchestration engine that routes jobs through specialized agent rooms, runs implementation, triggers review, and exposes an audit trail for delivery.

The demo vertical for the hackathon is ToTheMoonTokens, a research-first crypto analysis workspace that intentionally remains in paper mode. Users do not buy live trading. They buy validated research outputs: a backtest package, a walk-forward validation, a scalp setup audit, a risk-tier review, or a market intelligence brief. Each artifact becomes a priced machine task. Once payment is confirmed, Nexus opens the internal job, the right agents execute it, reviewers validate the output, and the final artifact is unlocked in the UI with full status visibility.

This makes the project a concrete example of the agentic economy: economically viable machine work, paid per action, with explicit review and delivery rather than vague AI usage. We think that model is more durable than one-shot chatbot monetization because it turns agent labor into structured, billable, auditable work units. For the hackathon, we keep the scope disciplined and prove one strong path end to end.

## Participation Mode
ONLINE

## Suggested Categories
- Agentic Economy
- Payments
- Infrastructure / Developer Tools
- AI x Finance

## Suggested Event Tracks
- Arc
- Circle
- Agentic applications
- Stablecoin-powered coordination

## Technologies Used
- NexusOrchestrator
- ToTheMoonTokens
- Arc L1 Testnet
- Circle USDC / Dev-Controlled Wallets
- x402-style payment gating
- FastAPI
- Node.js / JavaScript / HTML / CSS
- GitHub + GitLab validation pipeline

## Did you use Circle products?
Yes

## Circle products used
- USDC
- Circle Dev-Controlled Wallets
- Circle Web3 Services REST APIs

## Why we used them
- Predictable dollar-denominated pricing
- Natural fit for usage-based micro-transactions
- Better economics for high-frequency agent/API actions
- Clearer business model for pay-per-action AI systems

---

## Architecture Summary
The system is built on four core components:
1. **API Layer (FastAPI):** Exposes endpoints for strategies, dashboard, and backtests. Evaluates returns, win rates, and risk guardrails. Connects to Circle Web3 APIs for payment gating.
2. **Payment Gateway (Circle + Arc):** Manages wallet identities and verifies that USDC payment has settled on Arc Testnet before unlocking a task.
3. **Web Layer:** A pitch dashboard that tracks request status, payment confirmation, and final delivery artifact (research only).
4. **Nexus Orchestrator:** Runs the internal job routing (execution agents and reviewer agents). Ensures delivery is unlocked only after passing strict automated validation checks (e.g., OpenCode, paper-mode restrictions).

---

## Live Demo Script

### 90-Second Demo Path (Executive Pitch)
1. **Intro [0:00-0:15]:** "This is Nexus Economy on Arc. We don't monetize prompts; we monetize validated machine work using Circle and Arc."
2. **Request [0:15-0:30]:** Open the Buyer UI. Select "Backtest + Risk Audit". Show the USDC cost. 
3. **Payment [0:30-0:45]:** Initiate the transaction. Point out the sub-cent Arc fee and rapid settlement using Circle Dev-Controlled Wallets.
4. **Execution [0:45-1:10]:** Show the task moving to Nexus. It shifts from `paid` -> `in_progress` -> `in_review`. Explain that payment guarantees execution, but the artifact is unlocked only after a second review agent validates it.
5. **Delivery [1:10-1:30]:** The artifact unlocks. Download and display the final research package (strictly paper mode). Conclude: "Auditable, reviewed, and paid per action."

### 3-Minute Demo Path (Deep Dive)
1. **Context:** Explain the problem with subscription AI vs. usage-based, multi-agent workflows. 
2. **Architecture:** Show the `services/api` layer interacting with Circle's Web3 API to bootstrap agent wallets.
3. **The Workflow:** 
   - User requests Market Intelligence Brief.
   - Trace the payment intent in the terminal/logs.
   - Show the Arc Testnet transaction confirming on the explorer.
4. **Nexus Routing:** Demonstrate how Nexus orchestrator creates a specialized room of agents to fulfill the request. Highlight the paper-mode guardrails that prevent mainnet trading.
5. **Review Gate:** Explain the `ARC-HACK` rule where delivery is blocked until a QA/Audit agent approves the output.
6. **Delivery & Audit:** Download the final artifact and walk through the immutable audit trail (Request ID, Payment ID, Job Status).

---

## Submission Checklist
- [x] Finalize Title, Short Description, Long Description
- [x] Prepare Architecture Summary
- [x] Draft 90s and 3m Live Demo Scripts
- [x] Add Draft Circle Product Feedback (see `docs/CIRCLE_FEEDBACK.md`)
- [x] Capture UI and Architecture Screenshots
- [x] Verify local API tests pass
- [x] Finalize submission copy for devpost/form

---

## Circle Product Feedback
*(For full details, refer to `docs/CIRCLE_FEEDBACK.md` in the repository.)*
- **Highlights:** Arc L1 Testnet finality and USDC-denominated fees make sub-cent agent actions economically viable. The Circle Developer-Controlled Wallets abstraction seamlessly mapped to our multi-agent model.
- **Recommendations:** We recommend providing a Python SDK (since most AI frameworks are Python-based) and adding a `waitForTransaction` helper to avoid hand-rolling polling loops.
