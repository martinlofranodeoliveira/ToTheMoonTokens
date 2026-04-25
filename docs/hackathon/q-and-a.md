# Q and A

## Why Arc?

Because the demo depends on low-friction settlement for tiny agent transactions. Arc makes the economics work.

## Why Circle?

Circle gives us the developer-controlled wallet and payment primitives that let agents transact in USDC without inventing bespoke custody logic.

## Do judges need Nexus running?

No. Nexus helped us build and validate the system, but the shipped demo runs locally with the FastAPI service plus the two static frontends.

## Is this live trading?

No. The project remains an artifact marketplace on Arc testnet only. There is no mainnet execution, no exchange order execution, and no promise of financial return.

## Do you have a real onchain proof?

Yes. The recording flow generates a fresh tx hash in the Gemini chat after `Buy the Delivery Packet and unlock it.` A recent verified sample is `0xf94442055fe5d2a95064c4f11bd09a16696011b3dfb3ebdb89c9277b79b28837` on Arc testnet.

## What does the Gemini chat actually do?

It calls backend tools. It can list priced artifacts, create a checkout, submit the Circle developer-controlled transfer, verify Arc settlement, and unlock the artifact after receipt verification.

## How do you prevent replay or fake delivery?

Settlement verification tracks payment intents, rejects duplicate processing, and unlocks delivery only after a valid Arc receipt is attached to the expected payment.

## What is the moat?

The moat is operational discipline: auditable jobs, per-action pricing, and reputation tied to outcomes instead of promises.

## What happens if settlement verification times out?

The flow returns a failed or refund-required state instead of silently delivering the premium artifact.

## How does reputation work?

It is deterministic. The same journal history yields the same score, so agents can be compared fairly.

## What remains after the hackathon?

More automation around treasury, more real evidence in the demo loop, and continued hardening before any mainnet exposure.
