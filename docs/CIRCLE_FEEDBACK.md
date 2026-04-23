# Circle Developer Sandbox Feedback — TTM Agent Market

**Project:** TTM Agent Market — agent-to-agent nanopayment settlement on Arc L1
**Hackathon:** Agentic Economy on Arc (Arc x Circle x lablab.ai, Apr 20-26 2026)
**Team contact:** martinguitar@fasuleducacional.edu.br
**Repo:** https://github.com/martinlofranodeoliveira/ToTheMoonTokens
**First onchain proof:** [0x6fc13745…d7679a4](https://testnet.arcscan.app/tx/0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4)
(0.01 USDC source → destination, Arc Testnet, end-to-end through the SDK in 743 ms)

## Products used

- **Arc L1 (Testnet / Arc-Sepolia)** — settlement layer
- **USDC** — unit of account for every nanopayment
- **Circle Dev-Controlled Wallets** — identity + custody for 8 agent wallets
- **Entity Secret (RSA-OAEP-SHA256)** — wallet-operation signing
- **Testnet Faucet** — funding bootstrap wallets without human gates

Not used in the MVP: Gateway, CCTP, Paymaster, user-controlled wallets, modular wallets. We evaluated them — Arc removes the gas-overhead problem that Paymaster solves on other chains, so we kept the stack lean.

## Measured numbers from our build

All observed on Arc Testnet, Circle sandbox, Brazilian residential uplink.

| Metric | Observed | Notes |
|---|---|---|
| Wallet set create → first wallet ready | 1.4 s | single API call, plus SDK bootstrap |
| RSA entity-secret ciphertext generation | 60 ms | local RSA-OAEP in Node 22 |
| Create 6 dev-controlled wallets (batch) | 2.1 s | single `createWallets(count=5)` + `createWallets(count=1)` |
| Faucet USDC delivery (p50) | ~15 s | Console faucet → observable balance |
| Transfer 0.01 USDC source→destination (e2e) | 743 ms | includes polling to `COMPLETE` |
| **63-transaction batch on Arc Testnet** | **214 s total** | **100% success rate, zero failures** |
| Batch latency p50 | 2485 ms | includes 2-second client polling interval |
| Batch latency p95 | 4733 ms | outliers under 5 s |
| Sustained throughput | 17.7 tx/min | single source wallet, sequential fire + poll |
| Sub-cent ticket value | 0.001 USDC per tx | meets ≤ $0.01 hackathon requirement |
| `createTransaction` → `txHash` returned | 310 ms | polling interval 3 s in our script |
| TTFT for a new developer to first tx | ~18 min | account signup → registered secret → first tx |

Eight wallets were created under wallet set `e980936d-182e-50f6-bc6f-e54037777598` and used throughout the demo: `research_00..03`, `consumer_01..02`, `auditor`, `treasury`.

## What worked well

1. **Console → SDK parity.** Registering the Entity Secret ciphertext via the Console, then initializing the SDK with the matching hex, was a painless handoff.
2. **Dev-Controlled Wallets API shape.** The `initiateDeveloperControlledWalletsClient` / `createWalletSet` / `createWallets(count=N)` triad maps exactly onto a "provision agents in code" mental model. Zero friction to go from 2 wallets to 8.
3. **Transaction state machine.** `state in {COMPLETE, FAILED, CANCELLED, DENIED}` as a terminal set is the right abstraction; it makes polling trivial and deterministic.
4. **Arc Testnet finality.** Sub-second onchain settlement is the core of our pitch. No other stack we evaluated (ETH L1, Polygon, Optimism) made a $0.0001 per-call economy viable; on Arc it just works.
5. **USDC-denominated fees.** Removed the need to manage a second asset for gas. Our pricing model is `amount + Arc fee`, both in USDC, both predictable.
6. **Arc explorer quality.** `testnet.arcscan.app` is judge-friendly — clean URLs, linkable tx pages, no ad clutter. We embed explorer links everywhere in the UI.

## Friction points

1. **Entity Secret lifecycle is underdocumented.** The "register ciphertext once, reuse secret everywhere" model is correct but the Console doesn't show the hex back after registration (by design), and the SDK-based registration path (`registerEntitySecretCiphertext` with auto-downloaded recovery file) is not obvious from the Console's registration page. We ended up generating a secret manually, encrypting it with the API's `/v1/w3s/config/entity/publicKey`, pasting the ciphertext in the Console — and only later discovered the SDK would have done this in a single call *and* saved the recovery file. **Recommendation:** link the Console registration page directly to the SDK quickstart, with an "or do this in code" section above the fold.
2. **No `waitForTransaction(id)` in the SDK.** Every integration ends up hand-rolling the same `while (!terminalStates.has(state))` polling loop. A first-class helper (SDK method, webhooks mode, or SSE) would eliminate dozens of lines of boilerplate per project.
3. **Faucet lives in two places.** There is a Console "Faucet" tab *and* a separate `faucet.circle.com`. Both exist, both deliver, but they are discoverable via different docs paths. Unify or cross-link.
4. **Idempotency keys are mandatory but only mentioned deep in the SDK reference.** For hackathon timelines, a "Safety Essentials" front-page callout would save an hour of debugging.
5. **Error messages on insufficient-balance.** When a `createTransaction` fires before the faucet has delivered, the returned error is a generic wallet-state error. A specific `INSUFFICIENT_BALANCE_PENDING_FAUCET_SETTLEMENT` code would short-circuit a common class of first-hour bugs.
6. **SDK types vs API response drift.** A few `.data?.wallet` optional chains were required because the SDK return types are `T | undefined`, even when the API guarantees presence. Tightening types (discriminated unions for success / failure envelopes) would unlock more compiler help.
7. **No public SDK for Python.** We bootstrapped in Node for the JS SDK and then consumed the same wallets from FastAPI via raw HTTP. A Python SDK with parity to `@circle-fin/developer-controlled-wallets` would match the agent-backend ecosystem reality (most agent frameworks live in Python).
8. **No "sandbox status page."** When sandbox latency spiked during our build, we had no external signal to correlate against. A small public status endpoint (like Vercel's or Stripe's) would let teams distinguish their bugs from platform hiccups.

## Recommendations (priority order)

1. **Ship `waitForTransaction` + first-class webhooks.** Biggest DX win; universally needed.
2. **Publish a Python SDK** — even a thin wrapper over the REST API. Agent/AI teams live in Python; right now they're force-migrated to Node for the wallet bootstrap.
3. **Merge the two faucet UXes and link from every SDK example.**
4. **Entity Secret Console → SDK bridge.** A button that says "Register via the SDK instead — copy this one-liner" would be gold.
5. **Status page + a `/sandbox-health` endpoint** so automated CIs can gate on real platform state.
6. **Consolidated "Safety Essentials" guide** covering idempotency keys, rate limits, and secret rotation patterns on one page.

## Conclusion

The Circle + Arc combination is, unironically, the only stack we evaluated where a $0.0001-per-call agent marketplace is economically viable. Finality is sub-second, fees are dollar-denominated, and the SDK shape maps cleanly onto multi-agent topologies. The friction points above are tooling polish, not architectural — and most of them can be closed with a Python SDK and a `waitForTransaction` helper. We built 8 agent wallets, 21 backlog tasks, and a 6-screen pitch site against this platform in under 5 days. That's the DX sign-off we can give.
