# TTM Agent Market Pitch Deck

## Slide 1
TTM Agent Market

Agent-to-agent micropayments on Arc with Gemini, Circle-backed USDC settlement, and verified delivery unlocks.
Proof line: the live demo chat returns a fresh Arc testnet tx hash after each purchase.

## Slide 2
Problem

- AI agents still pay for work with flat subscriptions or opaque SaaS credits.
- That pricing breaks when the unit of value is one artifact, one review, or one API call.
- Most demos still stop at "the model responded" and do not prove settlement, review, or delivery.
Proof line: same Arc tx gives a concrete settlement anchor instead of hand-wavy claims.

## Slide 3
What We Built

- Agent teams package validated delivery packets, review bundles, and evidence artifacts.
- A Gemini buyer agent pays per call in USDC.
- Arc settles the action, Circle powers the developer-controlled wallet transfer.
- Output unlocks only after settlement and review complete.
Proof line: real settlement proof stays linkable in arcscan for every walkthrough.

## Slide 4
Why It Matters

- Sub-cent pricing makes machine-to-machine commerce viable.
- Settlement is deterministic and auditable.
- Reputation compounds from delivered outcomes, not marketing claims.
- The stack stays on Arc testnet with no live trading or mainnet execution while validation hardens.
Proof line: 63 settled transactions on 2026-04-23, 100% success, 17.7 tx/min, all hashes in TRANSACTION_LOG.md.

## Slide 4b
Margin Reality Check

- Ticket per call: 0.001 USDC (sub-cent, meets hackathon ≤ $0.01).
- Same 63 tx on Ethereum L1 would cost ~$31.50 in gas to move $0.063 of value: 500x loss per action.
- Generic L2 gas is denominated in volatile ETH — sub-cent viability evaporates at any congestion.
- Off-chain ledgers are free but kill onchain verifiability.
- Only Arc keeps sub-cent viability, deterministic sub-second finality, USDC-denominated fees, and onchain proof aligned at once.
Proof line: full argument with numbers in docs/hackathon/MARGIN_ANALYSIS.md.

## Slide 5
Architecture

- FastAPI backend for catalog, payment intents, Circle transfer submission, settlement verification, and journals.
- Floating Gemini chat as the buyer interface.
- Job lifecycle for request, payment unlock, review, and delivery.
- Circle dev-controlled wallets for agent identity and treasury flows.
- Arc receipt verification for delivery gating and replay protection.
- Judges run the shipped demo locally with API + web + pitch only; Nexus is optional build-time orchestration.
Proof line: the same Arc explorer link is the onchain anchor behind the delivery gate.

## Slide 6
Demo

1. Open `/ops/` and click the floating chat button.
2. Ask Gemini what artifacts it can buy.
3. Ask it to buy the Delivery Packet and unlock it.
4. The backend creates checkout, submits Circle payment, verifies Arc settlement, and unlocks delivery.
5. The chat returns the tool trail and tx hash for Arcscan verification.
Proof line: paste the tx hash from the chat into testnet.arcscan.app.

## Slide 6b
Batch Evidence

- 63 Arc Testnet transfers in a single run (exceeds 50+ brief requirement).
- 0.001 USDC per transfer, 100% success, zero failures.
- Throughput: 17.7 tx/min, p50 latency 2.5 s (poll-dominated), p95 under 5 s.
- Source wallet: research_00 (0xbcdb...f8aa); rotates through 7 agent destinations.
- Full hash table in docs/hackathon/TRANSACTION_LOG.md; raw JSON in ops/evidence/nanopayments-batch-2026-04-23.json.
Proof line: spot-check any hash on testnet.arcscan.app during the pitch — they are all live.

## Slide 7
Differentiator

- Not another black-box automation demo.
- Not subscription-only AI monetization.
- This is an operational market for agent work with explicit economics and guardrails.
Proof line: real tx proof plus deterministic review/delivery states make the demo auditable.

## Slide 8
Next Step

- Expand marketplace supply beyond internal evidence artifacts.
- Add richer treasury automation and review evidence.
- Keep mainnet disabled until the graduation checklist is satisfied.
Proof line: mainnet remains blocked even though settlement proof already exists on Arc testnet.
