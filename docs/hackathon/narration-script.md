# 90-second demo narration — for ElevenLabs

Drop each segment into ElevenLabs separately (or paste all 6 as one block — your call).
Total: ~240 words, ~90 seconds at natural pace.

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

## Part 2 — Live functional demo (1:30 – 3:00)

Segments 7–11 narrate the live screen capture showing the deployed VM, the judge-facing API, a real Circle Developer Console transaction, and Arc Block Explorer verification.

See `docs/hackathon/VIDEO_SHOOTING_SCRIPT.md` for the scene-by-scene shooting guide.

---

## Segment 7 — 1:30 to 1:45 (Live deployed pitch site)

> Here is the live deployment. The pitch site runs at three four dot five six dot one nine three dot two two one — served by Caddy, backed by the same Arc and Circle stack you just saw. Public. Online. Testable right now.

---

## Segment 8 — 1:45 to 2:00 (Live marketplace)

> This is the live marketplace. Buyers can open a checkout, pay per artifact, verify the transaction on Arc, and unlock delivery. Behind that commerce flow sit sixty-three settled transfers, one hundred percent success, and a gas counterfactual on Ethereum L one that would be five hundred times the value moved.

---

## Segment 9 — 2:00 to 2:15 (Judge-facing API endpoint)

> Every claim in the pitch is backed by a single endpoint. Slash api slash hackathon slash summary. Project. Tracks. Proof. Margin. Catalog. Transactions. One JSON payload. One source of truth.

---

## Segment 10 — 2:15 to 2:45 (Circle Developer Console — brief-critical, 30s)

> Now a live transaction, executed directly through the Circle Developer Console. We pick research zero zero as the source, treasury as the destination, amount zero point zero zero one USDC, blockchain Arc Testnet. The Console signs it, submits it, and confirms it. The transaction hash appears right here. This is exactly the end-to-end integration flow the hackathon asked us to demonstrate — through the Console, not a custom script.

---

## Segment 11 — 2:45 to 3:00 (Arc Block Explorer verification — brief-critical)

> And here it is onchain, on the Arc Block Explorer. Anyone, any time, can verify at testnet dot arcscan dot app. Hackathon brief satisfied end to end. Real agents. Real economics. Live.

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

## After you have the 6 audio files

**Option A — concat in any video editor:**
Drop the video (screen-recorded MP4) and the 6 audio clips on the timeline. Align each audio segment to the start of its slide (0s, 15s, 30s, 45s, 60s, 75s). Export at 1080p.

**Option B — concat audio first, then overlay once:**
```
ffmpeg -i seg1.mp3 -i seg2.mp3 -i seg3.mp3 -i seg4.mp3 -i seg5.mp3 -i seg6.mp3 \
  -filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a]concat=n=6:v=0:a=1[out]" \
  -map "[out]" narration.mp3
```
Then drop `narration.mp3` on the video timeline once — it aligns automatically because each segment is exactly 15s.

**Option C — one-shot:**
Paste all 6 segments in ElevenLabs as a single input, separated by blank lines. Get one 90s MP3. Same result, less fiddling.
