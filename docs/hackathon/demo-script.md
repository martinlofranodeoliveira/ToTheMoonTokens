# Demo Script

## Opening

This demo shows a safe agent economy flow. Everything is paper-first and Arc testnet only.

## Step 1

Open the pitch site and show the marketplace catalog. Point out that artifacts are priced in USDC per action.

## Step 2

Create a payment intent for a premium artifact. Show the deposit address and the intent ID.

## Step 3

Verify settlement with the real Arc testnet hash `0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4` when available, or fall back to `0xMockTransactionHash`. Call out that delivery is blocked until the receipt is accepted.

## Step 4

Open the API docs or job endpoints locally. Move the job from `REQUESTED` to `PAYMENT_UNLOCKED`, then to review, then to delivery. No Nexus boot is required for the judge flow.

## Step 5

Show the demo agent flow for the same artifact. Use it as the judge-friendly view of the lifecycle.

## Step 6

Show the reputation endpoint for the source agent and explain that pricing can evolve from real outcomes.

## Close

Summarize the loop in one sentence: request, pay, settle, review, deliver, learn.
