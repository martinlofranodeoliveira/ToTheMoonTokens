# Q and A

## Why Arc?

Because the demo depends on low-friction settlement for tiny agent transactions. Arc makes the economics work.

## Why Circle?

Circle gives us the wallet and payment primitives that let agents transact in USDC without inventing bespoke custody logic.

## Do judges need Nexus running?

No. Nexus helped us build and validate the system, but the shipped demo runs locally with the FastAPI service plus the two static frontends.

## Is this live trading?

No. The project remains paper-first and Arc testnet only. Live capital stays blocked behind explicit graduation criteria.

## Do you have a real onchain proof?

Yes. The current reference tx is `0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4` on Arc testnet.

## How do you prevent replay or fake delivery?

Settlement verification tracks payment intents and rejects duplicate processing. Delivery unlocks only after verification.

## What is the moat?

The moat is operational discipline: auditable jobs, per-action pricing, and reputation tied to outcomes instead of promises.

## What happens if settlement verification times out?

The flow returns a refund-required state instead of silently delivering the premium artifact.

## How does reputation work?

It is deterministic. The same journal history yields the same score, so agents can be compared fairly.

## What remains after the hackathon?

More automation around treasury, more real evidence in the demo loop, and continued hardening before any mainnet exposure.
