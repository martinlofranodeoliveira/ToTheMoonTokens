# Submission video narration — for ElevenLabs

Drop each segment into ElevenLabs separately, or paste all 11 segments as one block.
Part 1 is still the already-recorded 90-second pitch. Part 2 is the new live demo with the floating Gemini chat.
Total target: about 3:30 at a natural pace.

---

## Voice recommendation

- **Adam** (masculine, professional, authoritative) — default choice
- **Rachel** (feminine, clear, warm) — if you prefer neutral tone
- **Brian** (masculine, British, precise) — if you want a more "product demo" feel

Settings: **Stability 35%, Similarity 75%, Style 20%, Speaker Boost ON**. These keep the delivery steady without sounding robotic.

---

## Segment 1 — 0:00 to 0:15 (Problem)

> AI agents can't pay each other today. Subscriptions break the moment the unit of value is one API call. On-chain gas destroys sub-cent economics. Off-chain ledgers kill verifiability. The rails that work for humans don't work for machines.

---

## Segment 2 — 0:15 to 0:30 (Solution)

> We built TTM Agent Market. Agents pay agents, per call, in sub-cent USDC. Every action settles on Arc Layer One, powered by Circle Nanopayments. Deterministic sub-second finality. USDC-native fees. Every transaction auditable onchain.

---

## Segment 3 — 0:30 to 0:45 (Why Arc + Circle)

> Why this stack? Because no other combination keeps every constraint satisfied. Arc has USDC-native fees, sub-second finality, and dollar-denominated pricing. Ethereum breaks on cost. Layer-twos break on volatility. Off-chain breaks on trust. Only Arc plus Circle works.

---

## Segment 4 — 0:45 to 1:00 (Proof)

> This isn't theory. We provisioned eight agent wallets and ran sixty-three real transactions on Arc Testnet. Zero failures. One hundred percent success rate. Zero point zero six three USDC moved, at seventeen point seven transactions per minute. Every single hash is verifiable on arcscan dot app right now.

---

## Segment 5 — 1:00 to 1:15 (Three advantages)

> Three unfair advantages. First: reputation derived from verified outcomes, not marketing. Second: anti-replay settlement with onchain receipt verification. Third: an auditable journal as the economic ledger. Every score is reproducible, every delivery traceable.

---

## Segment 6 — 1:15 to 1:30 (CTA / close of Part 1)

> Three commands and five minutes. Clone, install, run. Judges get the API, the live marketplace, and this pitch site running locally. This is the agent economy. Built on Arc. Powered by Circle.

---

## Part 2 — Live functional demo (1:30 – 3:30)

Segments 7–11 narrate the live screen capture showing the deployed VM, the floating Gemini agent chat, a real Circle Developer Controlled Wallet payment, Circle Console evidence, and Arc Block Explorer verification.

See `docs/hackathon/VIDEO_SHOOTING_SCRIPT.md` for the scene-by-scene shooting guide.

---

## Segment 7 — 1:30 to 1:42 (Live deployed pitch site)

> Here is the live deployment. The pitch site runs at three four dot five six dot one nine three dot two two one, served by Caddy and backed by the same Arc and Circle stack you just saw.

---

## Segment 8 — 1:42 to 2:00 (Live marketplace)

> This is the live marketplace. Buyers can inspect pricing, proof, active orders, wallet routes, and the gas counterfactual. But the main interaction is now this floating Gemini agent chat, which can buy and unlock artifacts from the same page.

---

## Segment 9 — 2:00 to 2:55 (Floating Gemini agent purchase)

> The chat is not decorative. First, Gemini reads the live catalog and explains what it can buy. Then we ask it to buy the Delivery Packet and unlock it. The agent calls backend tools, creates the checkout, submits a Circle developer-controlled wallet transfer, waits for Arc settlement, verifies the receipt, and unlocks the artifact. This is the product loop in one place: an AI agent buying machine work with a real sub-cent USDC payment.

---

## Segment 10 — 2:55 to 3:12 (Circle Console evidence)

> Here is the same payment inside Circle. The funded buyer wallet sends zero point zero zero one USDC to treasury on Arc Testnet. Circle handles the developer-controlled wallet operation, and the app uses that payment as the delivery gate.

---

## Segment 11 — 3:12 to 3:30 (Arc Block Explorer verification)

> And here it is onchain, on the Arc Block Explorer. Anyone can verify the hash, source, destination, and successful settlement at testnet dot arcscan dot app. Real agents, real economics, live.

---

## Pronunciation hints (if ElevenLabs mispronounces)

| Written | Pronounce as |
|---|---|
| `USDC` | "U S D C" — all letters |
| `Arc L1` | "Arc Layer One" |
| `0.01 USDC` | "one one-hundredth of a USDC" (already expanded above) |
| `0x6fc1` | "zero x six F C one" (already expanded above) |
| `743 ms` | "seven hundred and forty-three milliseconds" (already expanded above) |
| `arcscan.app` | "arc-scan dot app" |
| `eth_getTransactionReceipt` | (not in narration — kept in visuals only) |

If a specific word sounds off, use **phoneme override** in ElevenLabs (e.g., `/ˈɑːrk ɛlˈwʌn/` for "Arc L1").

---

## After you have the audio files

**Option A — concat in any video editor:**
Drop the video clips and the 11 audio clips on the timeline. Align segments 1–6 to the pitch slides, then align segments 7–11 to the Part 2 scene starts from `VIDEO_SHOOTING_SCRIPT.md`. Export at 1080p.

**Option B — concat audio first, then overlay once:**
```
ffmpeg -i seg1.mp3 -i seg2.mp3 -i seg3.mp3 -i seg4.mp3 -i seg5.mp3 -i seg6.mp3 \
  -i seg7.mp3 -i seg8.mp3 -i seg9.mp3 -i seg10.mp3 -i seg11.mp3 \
  -filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a][6:a][7:a][8:a][9:a][10:a]concat=n=11:v=0:a=1[out]" \
  -map "[out]" narration.mp3
```
Then drop `narration.mp3` on the video timeline once and trim scene video lengths to the narration.

**Option C — one-shot:**
Paste all 11 segments in ElevenLabs as a single input, separated by blank lines. This is the simplest path for the final submission cut.
