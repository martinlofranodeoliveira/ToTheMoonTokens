# Demo Script

## Opening

This demo shows a safe agent economy flow on Arc testnet. The buyer interface is a Gemini chat, and the paid action is a real Circle developer-controlled wallet transfer for a priced artifact.

## Step 1

Open `http://34.56.193.221/` and show the public pitch site. Keep this short if Part 1 of the video is already recorded.

## Step 2

Open `http://34.56.193.221/ops/`, hard refresh, and show the marketplace catalog. Point out that artifacts are priced in USDC per action and that the floating chat button is visible in the lower-right corner.

## Step 3

Open the floating chat and send:

```text
What artifacts can you buy right now?
```

Let Gemini list the available artifacts.

## Step 4

Send:

```text
Buy the Delivery Packet and unlock it.
```

Keep the chat panel visible while the tool trail appears: catalog, checkout, Circle payment, Arc verification, and artifact unlock.

## Step 5

Copy or keep visible the tx hash returned by the chat. Open Circle Console only as evidence of the developer-controlled wallet transfer. Do not show API keys, entity secrets, or local `.env` files.

## Step 6

Open `https://testnet.arcscan.app`, paste the tx hash, and show the successful transaction page. Call out source wallet, treasury destination, amount, and status.

## Close

Summarize the loop in one sentence: Gemini requests, Circle pays, Arc settles, the backend verifies, and the artifact unlocks.
