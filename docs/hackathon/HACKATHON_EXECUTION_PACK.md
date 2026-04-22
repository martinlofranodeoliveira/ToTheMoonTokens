# Nexus Economy on Arc

## One-line thesis

Build a paid agent economy where autonomous software agents can request, deliver, validate, and unlock work using USDC micropayments, with Nexus orchestrating the teams and ToTheMoonTokens serving as the first vertical demo.

## Judge runtime note

Nexus was used during build, backlog execution, and validation, but the shipped
demo that jurors run locally does **not** require booting Nexus. The runtime
path for judging is:

- FastAPI on `:8010`
- `apps/web` on `:4173`
- `apps/pitch` on `:4174`

## Why this is the right hackathon project

This hackathon is about the **agentic economy**, **sub-cent transactions**, **USDC settlement**, and economically viable machine-to-machine usage pricing.

That is a strong fit for what already exists here:

- `NexusOrchestrator` already coordinates autonomous teams, rooms, reviews, guardrails, and multi-agent delivery.
- `ToTheMoonTokens` already has a concrete high-value vertical where people may pay for:
  - delivery packets
  - review bundles
  - market intelligence
  - settlement audits
  - runtime evidence artifacts
- the current system already has:
  - strong paper-mode guardrails
  - live monitoring
  - review/evidence patterns
  - a real dashboard to evolve into the hackathon demo

## Project positioning

Do **not** pitch this as:

- a profit-guaranteeing trading bot
- a live-trading system
- an autonomous fund manager

Pitch it as:

> A safe economic coordination layer for paid agent work, where teams can buy validated intelligence and machine work per action, with a concrete demo vertical in artifact delivery, review, and settlement unlocks.

## Demo story

### Core demo

1. A user requests a paid artifact:
   - delivery packet
   - review bundle
   - market report
   - settlement memo
2. The system presents the action cost in USDC.
3. Payment is authorized through the Circle-powered flow.
4. The API opens or reserves the job record.
5. The correct room of agents executes the work.
6. Review agents validate the result.
7. The final artifact is unlocked only after payment + review.
8. The UI shows:
   - payment status
   - job status
   - assigned room / agent lineage
   - delivery artifact
   - audit trail

### Vertical demo inside ToTheMoonTokens

The buyer is not purchasing live trading.

The buyer is purchasing **agent outputs** such as:

- `Delivery Packet`
- `Review Bundle`
- `Settlement Audit`
- `Agent Handoff Pack`
- `News + Market Brief`

All outputs remain:

- paper-only
- evidence-backed
- non-custodial
- non-mainnet-executing

## Scope freeze for the 5-day hackathon

## Must ship

- a clear buyer flow for paid agent work
- a payment intent / payment verification layer
- a job lifecycle bridge that also runs without Nexus in local judging
- one real vertical demo using the existing ToTheMoonTokens evidence engine
- a dashboard that shows request, payment, execution, review, and delivery
- enough evidence to demo end-to-end in a short live walkthrough

## Nice to have

- richer wallet UX
- prettier charting
- multiple paid artifact types
- stronger onchain provenance depth
- Stitch/Figma polish for the final visual pass

## Out of scope

- real-money trading
- mainnet wallet automation
- automatic exchange order execution
- promises of financial return
- full production-grade tokenomics
- large smart-contract surface area beyond the MVP need

## Architecture slice for hackathon

### 1. Buyer UI

Where the user:

- selects an artifact
- sees the price
- initiates payment
- tracks progress
- downloads the result

### 2. Payment gateway layer

Responsible for:

- defining billable actions
- issuing payment requirements
- verifying payment completion
- unlocking the job after valid payment

### 3. Job orchestration and review layer

Responsible for:

- creating the internal task/job
- routing work to the right room
- running implementation + review
- exposing status and evidence

For the shipped local demo, these state transitions are exposed directly by the
API and do not require the Nexus runtime to be online.

### 4. Vertical execution layer

ToTheMoonTokens provides the first concrete workload:

  - evidence snapshots
  - market context
  - delivery validation
  - journal analytics

### 5. Audit / evidence layer

Shows:

- request id
- payment id / economic action id
- job status
- review status
- final artifact
- timestamps

## Product language for judges

Use this framing consistently:

- "pay per validated agent action"
- "micropayment-gated AI work"
- "USDC-priced machine work"
- "reviewed agent output before delivery"
- "safe paid agent artifacts"

Avoid:

- "autonomous trading profit engine"
- "guaranteed alpha"
- "self-managing hedge fund"

## What the judges should see in 90 seconds

1. A premium landing/dashboard explaining the system.
2. A user selects `Review Bundle + Delivery Packet`.
3. The UI shows a USDC price.
4. Payment is initiated/verified.
5. The job appears in the local lifecycle/API state.
6. Agents work in parallel.
7. Review completes.
8. Delivery becomes available.
9. The final report is shown with status/evidence.

## Technical build priorities

### Highest priority

- paid job lifecycle
- payment verification
- simple but credible UI
- visible auditability
- one strong end-to-end demo path

### Medium priority

- additional artifact types
- richer event logging
- better dashboard polish

### Lowest priority

- long-tail edge cases
- extra wallet providers
- non-essential visual experimentation

## Ground rules for every agent

- stay in paper/test mode only
- do not add live trading or mainnet execution
- optimize for demo clarity, not architectural perfection
- prefer reusable adapters over big refactors
- keep diffs focused and reviewable
- if external credentials are missing, build the interfaces and mocks without blocking the rest of the demo

## Deliverables expected by the end of the hackathon

- a working local demo
- code in repo
- seeded backlog / task evidence in Nexus for internal build traceability
- architecture summary
- submission copy
- screenshot set
- short demo script

## Recommended final tagline

**Nexus Economy on Arc lets teams pay AI agents per validated action in USDC, with real review, clear audit trails, and safe delivery unlocks.**
