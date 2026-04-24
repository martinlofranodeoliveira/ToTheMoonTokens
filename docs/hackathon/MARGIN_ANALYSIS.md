# Margin analysis — why sub-cent agent commerce fails without Arc

Hackathon brief requirement: *"Include a margin explanation: why this model would fail with traditional gas costs."*

This document does that with real numbers, not hypotheticals.

---

## 1. The unit economics of TTM Agent Market

| Variable | Value |
|---|---|
| Price per API call (typical) | **$0.001 USDC** |
| Price per API call (premium signal) | **$0.01 USDC** |
| Hackathon demo batch | **63 real transactions** on Arc Testnet |
| USDC per transaction in demo | **0.001 USDC** (sub-cent, meets ≤ $0.01 brief) |
| Total USDC moved in demo | **0.063 USDC** |
| Batch evidence file | `ops/evidence/nanopayments-batch-2026-04-22.json` |

Every transaction hash is verifiable on [testnet.arcscan.app](https://testnet.arcscan.app). No simulation, no mock.

---

## 2. The four stacks we compared

For a single USDC transfer of 0.001 USDC (our unit of economic action), we looked at the cost structure on four stacks.

| Stack | Gas per tx | Finality | Fee denomination | Cost vs. our ticket |
|---|---|---|---|---|
| **Arc L1 (testnet / mainnet)** | **low / predictable** | **<1s** | **USDC** | **sub-cent viable** |
| Ethereum L1 | $0.50 – $5.00 | 12–60s | ETH (volatile) | 500× – 5,000× over-cost |
| Generic L2 (Arbitrum, OP) | $0.001 – $0.01 | 1–30s | ETH (volatile) | 1× – 10× over-cost |
| Off-chain ledger | $0 | instant | USD (database) | 0× but **zero verifiability** |

### 2.1 Why Ethereum L1 is instantly disqualified

At a ticket of $0.001 per call and a gas floor of ~$0.50 per transfer:

- **Cost / revenue ratio per tx:** $0.50 / $0.001 = **500×**
- **Break-even ticket:** ≥ $0.50 per call — **500× our target**
- **63-tx demo counterfactual:** 63 × $0.50 = **$31.50 of gas** to move $0.063 of value. Net loss: **$31.44**.

Ethereum L1 gas does not make agent commerce "expensive" — it makes it **arithmetically impossible**. The gas line-item eats every ticket before the first margin dollar materializes.

### 2.2 Why generic L2s are fragile

L2s (Arbitrum, Optimism, Base) bring gas down to the $0.001–$0.01 range per transfer. That is *almost* our ticket. Two remaining killers:

- **Volatility:** L2 gas is denominated in ETH. A 2× move in ETH price doubles our gas cost overnight. Pricing an agent product at $0.001 USDC when the variable cost is $0.0015 ± 50% is gambling, not a business.
- **No guarantee on sub-cent:** During peak L2 congestion (seen multiple times in 2024–2025), gas rose above $0.05, which is **50× our ticket**.

L2 is the "almost" layer. Almost cheap enough. Almost stable enough. Almost verifiable in dollar terms. Almost is not a margin.

### 2.3 Why off-chain ledgers kill the product

An off-chain ledger (centralized DB, closed platform) can run this at zero gas. But:

- **Consumer cannot prove delivery** — no onchain receipt
- **Provider cannot prove payment** — must trust operator
- **Judge, regulator, or external auditor has no verification path** — the ledger is the operator's private artifact

The moment the economic unit depends on trust in a single operator, agent-to-agent commerce loses its reason to exist. Agents cross vendors. The point of the architecture is that no single party can censor or forge the history.

### 2.4 Why Arc + Circle is the only viable answer

Arc L1 gives us:

- **Dollar-denominated fees** (USDC-native, not ETH) — pricing is stable
- **USDC-native, predictable fees** — 0.001 USDC ticket survives
- **Sub-second finality** — the "live" experience of agent interaction
- **Onchain verifiability** — every tx hash is on [testnet.arcscan.app](https://testnet.arcscan.app)
- **Circle Nanopayments + Dev-Controlled Wallets on top** — production-grade wallet identity and payment orchestration without building custodial logic

We did not pick Arc + Circle because it was easy or because we had contacts there. We picked it because when you write out the cost matrix honestly, **it is the only combination that survives the sub-cent ticket constraint with onchain verifiability preserved.**

---

## 3. Demo-level proof

Full tx-by-tx log: [`docs/hackathon/TRANSACTION_LOG.md`](TRANSACTION_LOG.md)
Raw evidence JSON: [`ops/evidence/nanopayments-batch-2026-04-23.json`](../../ops/evidence/nanopayments-batch-2026-04-23.json)

Spot-check any of the 63 hashes on [testnet.arcscan.app](https://testnet.arcscan.app) — each is a real, settled USDC transfer between dev-controlled wallets provisioned by our bootstrap.

**Observed batch metrics (2026-04-23 run):**

| Metric | Value |
|---|---|
| Total transactions | **63** (exceeds 50+ brief requirement) |
| Successful settlements | **63** (100% success rate, zero failures) |
| Amount per tx | 0.001 USDC (sub-cent, ≤ $0.01 per brief) |
| Total USDC moved | 0.063 USDC |
| Latency p50 | 2485 ms (includes 2 s client polling) |
| Latency p95 | 4733 ms |
| Onchain finality (standalone measurement) | ~743 ms |
| Throughput | **17.7 tx/min** |
| Total runtime | 214 s (3 m 34 s) for the full batch |

At $0.001 per call × 17.7 calls/min observed throughput, a single research agent on a single wallet pair sustains **~$1.06/hour of revenue line**. That is not large on its own — but it is **margin-positive**, and it compounds with every new consumer agent that joins and every parallel research producer added. On any other stack, it is negative from the first transaction.

### 3.1 Onchain vs batch-runtime latency

A note on the 2485 ms p50: it includes a 2-second client-side polling interval between state checks (our script polls for `COMPLETE` state every 2 s). Actual onchain finality on Arc Testnet is **sub-second** — measured directly at ~743 ms on our first standalone transfer. The 2.5 s p50 is dominated by our client's polling strategy, not by the network. A webhook or tighter poll interval brings user-visible latency back under 1 s. This is a developer-experience observation, not a platform limit.

---

## 4. The product consequence

Because the unit economics survive at $0.001, we can build product primitives that don't exist on any other chain today:

- **Per-signal pricing** for quant research instead of subscriptions
- **Per-query pricing** for AI inference instead of token bundles
- **Per-review pricing** for content auditors instead of flat retainers
- **Per-render pricing** for compute workers instead of hourly instances

Every one of these is a variable cost that used to be locked behind a flat fee because the rails could not charge less. Arc + Circle unlocks the *actual* unit of value.

---

## 5. Conclusion

Traditional gas costs don't just make this model "expensive" — they make it arithmetically impossible. A 500× gap between cost and ticket is not a growth problem; it is a physics problem. Arc removes the physics problem. Circle makes the resulting economic primitives usable by agents that don't have a human at the keyboard. The margin exists because the stack exists. That is the entire argument.
