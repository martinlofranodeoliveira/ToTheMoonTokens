# Agentic Economy on Arc Submission Draft

## Submission Title

`TTM Agent Market`

## Backup Title Options

- `TTM Agent Market — Agent Commerce on Arc`
- `Paid Agent Artifacts on Arc`
- `USDC-Priced Agent Workflows`

## Short Description

TTM Agent Market is a live Arc + Circle demo where buyers pay for validated AI artifacts in sub-cent USDC, verify settlement on Arc Testnet, and unlock delivery only after receipt verification and review.

## Long Description

TTM Agent Market is a judge-facing marketplace for paid machine work. Instead of charging flat subscriptions for vague AI access, we price concrete artifacts such as delivery packets, review bundles, and market intelligence briefs in USDC, then unlock those artifacts only after payment settlement is verified on Arc Testnet. The workflow is explicit: request artifact, create payment intent, route funds to the treasury wallet, verify the transaction receipt, advance the review lifecycle, and deliver the artifact.

We chose Arc + Circle because sub-cent agent commerce breaks on every other stack we evaluated. Our typical ticket is 0.001 USDC. On Ethereum L1 that would be immediately destroyed by gas. Generic L2s get closer, but the economics remain fragile and fee denomination stays volatile. Arc preserves sub-cent viability with fast settlement, while Circle gives us dev-controlled wallets, USDC-native pricing, and the operational model needed to coordinate multiple agent identities safely.

This is not a mock pitch. The demo already exposes a public deployment, a public summary endpoint, and proof from a 63-transaction Arc Testnet batch recorded on April 23, 2026. That batch moved 0.063 USDC total at 0.001 USDC per action, reached 100% success, and sustained 17.7 transactions per minute. Judges can watch the live checkout flow, trigger a payment through the Circle Developer Console, and verify the resulting hash on the Arc Block Explorer. The product stays safely in paper mode for the hackathon: no mainnet, no live trading, no promises of profit.

## Participation Mode

`ONLINE`

## Suggested Categories

- Agentic Economy
- Payments
- Infrastructure / Developer Tools
- AI x Onchain Commerce

## Suggested Event Tracks

- Arc
- Circle
- Agentic applications
- Stablecoin-powered coordination

## Technologies Used

- Arc
- Circle USDC
- Circle Dev-Controlled Wallets
- FastAPI
- JavaScript / HTML / CSS
- Caddy
- Docker Compose
- Arc receipt verification
- ToTheMoonTokens
- Nexus-assisted orchestration during development
- Prometheus
- structlog

## Did you use Circle products?

`Yes`

## Circle products used

- USDC
- Circle Dev-Controlled Wallets
- Entity Secret signing flow
- Testnet Faucet
- Arc settlement flow with Circle-managed wallets

## Why we used them

- predictable dollar-denominated pricing
- natural fit for usage-based micro-transactions
- better economics for high-frequency agent/API actions
- clearer business model for pay-per-action AI systems

## Draft Circle Product Feedback

### Products Used

We used Arc L1 for settlement, USDC for pricing, Circle Dev-Controlled Wallets for multi-agent wallet identity, the Entity Secret flow for signing wallet operations, and the Circle Testnet Faucet to bootstrap the demo wallets.

### Use Case

We chose Circle because this project depends on economically viable low-cost payments for small but frequent AI actions. Subscription-only pricing is a poor fit for agent-to-agent and API-to-agent work. Stablecoin settlement makes the pricing model explicit, understandable, and easy for judges to validate in a live demo.

### Successes

The conceptual fit between micropayments and the agentic economy is very strong. Arc preserved the unit economics, Circle made wallet provisioning and treasury routing practical, and the resulting UX is easy for developers and judges to understand.

### Challenges

The hardest part is not the value proposition but the integration clarity during rapid prototyping: developers need an even more opinionated reference path for “charge for one AI action, verify payment, unlock artifact, record audit trail.” Local simulation and transaction waiting are the main DX gaps.

### Recommendations

- provide a canonical micropayment-for-agent-work sample app
- ship a first-class `waitForTransaction` or equivalent webhook-oriented helper
- publish a Python SDK with parity to the Node flow
- make local testing of multiple payment outcomes easier

## Demo talking points

- We are not monetizing prompts. We are monetizing validated machine work.
- Payment alone is not enough; output is unlocked only after review.
- The same economic model can be reused for code review, analytics, compliance, or research artifacts.
- Our live demo uses safe paid agent artifacts instead of risky real-money automation.
