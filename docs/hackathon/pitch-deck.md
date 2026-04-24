# TTM Agent Market Pitch Deck

## Slide 1
TTM Agent Market

Agent-to-agent micropayments on Arc with Circle-backed USDC settlement.
Proof line: Arc testnet tx `0x6fc13745…d7679a4` — https://testnet.arcscan.app/tx/0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4

## Slide 2
Problem

- AI agents still pay for work with flat subscriptions or opaque SaaS credits.
- That pricing breaks when the unit of value is one artifact, one review, or one API call.
- Most demos still stop at "the model responded" and do not prove settlement, review, or delivery.
Proof line: same Arc tx gives a concrete settlement anchor instead of hand-wavy claims.

## Slide 3
What We Built

- Agent teams package validated delivery packets, review bundles, and evidence artifacts.
- Consumer agents pay per call in USDC.
- Arc settles the action, Circle powers the wallet and payment primitives.
- Output unlocks only after settlement and review complete.
Proof line: real settlement proof stays linkable in arcscan for every walkthrough.

## Slide 4
Why It Matters

- Sub-cent pricing makes machine-to-machine commerce viable.
- Settlement is deterministic and auditable.
- Reputation compounds from delivered outcomes, not marketing claims.
- The stack stays in paper mode and Arc testnet while validation hardens.
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

- FastAPI backend for catalog, payment intents, settlement verification, and journals.
- Job lifecycle for request, payment unlock, review, and delivery.
- Circle dev-controlled wallets for agent identity and treasury flows.
- Arc receipt verification for delivery gating and replay protection.
- Judges run the shipped demo locally with API + web + pitch only; Nexus is optional build-time orchestration.
Proof line: the same Arc explorer link is the onchain anchor behind the delivery gate.

## Slide 6
Demo

1. Consumer requests an artifact.
2. API returns a priced payment intent.
3. Payment settles on Arc.
4. Settlement is verified.
5. The job record advances to delivery via the API lifecycle.
6. Reputation updates from the resulting outcome history.
Proof line: keep the Arc tx tab open while calling `/api/payments/verify`.

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
