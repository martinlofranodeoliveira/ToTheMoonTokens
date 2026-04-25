# TTM Agent Market — Submission video shooting script

**Goal:** ~3:30 video, well under lablab's 5-minute cap. Combines the already-recorded animated pitch narrative (Part 1) with a new live functional demo (Part 2) that shows the deployed product, Gemini agent chat, a real Circle Developer Controlled Wallet transfer on Arc, Circle Console evidence, and Arc Block Explorer verification.

---

## Brief requirements covered

| Requirement | Satisfied by |
|---|---|
| real per-action pricing ≤ $0.01 | Part 1 (KPI card), Part 2 Scene C (0.001 USDC live tx) |
| 50+ onchain transactions in demo | Part 1 receipt slide shows 63 / 63, referenced in narration |
| Margin explanation vs traditional gas | Part 1 comparison table, Part 2 Scene B counterfactual card |
| Gemini autonomous agent flow | Part 2 Scene C |
| Circle Developer Controlled Wallet transfer | Part 2 Scene C, verified in Circle Console in Scene D |
| Verification on **Arc Block Explorer** | Part 2 Scene E |

---

## Equipment & software

- **Screen recorder:** OBS Studio (recommended), Xbox Game Bar (Win+G), or Loom
- **Browser:** Chrome full-screen (F11) for clean captures
- **Editor:** CapCut (easiest), Shotcut (free open-source), Premiere / Resolve (if you have them)
- **Narration:** ElevenLabs, voice Adam (Stability 35, Similarity 75). Script: `docs/hackathon/narration-script.md`

---

## Part 1 — Animated pitch (0:00 – 1:30)

**What to record:**

1. Open Chrome, navigate to `file:///C:/SITES/gemini/ToTheMoonTokens/apps/pitch/pitch-video.html`
2. Press F11 for full-screen
3. Press R if needed to restart (the slideshow auto-plays for exactly 90 seconds)
4. Start OBS recording *before* pressing R, let it run 92s, stop recording
5. Save as `part1_pitch.mp4`

**Narration:** segments 1–6 from `narration-script.md`. Each segment is 15s, aligned to each slide transition.

---

## Part 2 — Live functional demo (1:30 – 3:30)

**Do all 5 scenes in one continuous screen recording if possible — makes editing easier.** Press F11 for full-screen. This is the only part that needs to be re-recorded after the floating chat update.

Before recording, open these tabs in order (you'll switch between them):
1. `http://34.56.193.221/`
2. `http://34.56.193.221/ops/`
3. `https://console.circle.com` — **log in first**, navigate to `Wallets → Developer Controlled → Transactions` or `Wallets`
4. `https://testnet.arcscan.app` — open home, ready to paste the tx hash
5. Optional backup tab: `http://34.56.193.221/api/hackathon/summary`

### Scene A — Live deployed pitch site (1:30 – 1:42, 12s)

- Switch to tab 1: `http://34.56.193.221/`
- Let the landing page load, hover over the navigation briefly
- **Narration segment 7**: *"Here is the live deployment. The pitch site runs at three four dot five six dot one nine three dot two two one — served by Caddy, backed by the same Arc + Circle stack you just saw."*
- Screen capture: 12 seconds

### Scene B — Live marketplace + proof data (1:42 – 2:00, 18s)

- Switch to tab 2: `http://34.56.193.221/ops/`
- Hard refresh (`Ctrl+F5`) before recording if the browser was already open
- Scroll gently through the page — the marketplace shows catalog cards, active orders, 63 tx, wallet set ID, and the margin counterfactual
- End the scene with the floating chat button visible in the lower-right corner
- **Narration segment 8**: *"This is the live marketplace. Buyers can still inspect pricing, proof, and the gas counterfactual, but now the primary surface is an autonomous Gemini agent that can buy and unlock artifacts from the same page."*
- Screen capture: 18 seconds

### Scene C — Floating Gemini agent buys an artifact (2:00 – 2:55, 55s)

- Stay on tab 2: `http://34.56.193.221/ops/`
- Click the floating chat button in the lower-right corner
- First send or click the prompt: `What artifacts can you buy right now?`
- Wait for the agent to list the artifacts
- Then send or click the prompt: `Buy the Delivery Packet and unlock it.`
- Keep the panel visible while the tool events appear:
  - list artifacts
  - create checkout
  - submit Circle payment
  - verify Arc settlement
  - unlock artifact
- When the response shows the transaction hash, copy it or keep it visible for Scene E
- **Narration segment 9**: *"The agent is not decorative. It calls the backend tools. First it reads the catalog. Then it creates a real checkout, submits a Circle developer-controlled transfer, waits for Arc settlement, and unlocks the artifact after verification."*
- Screen capture: 55 seconds

### Scene D — Circle Console evidence (2:55 – 3:12, 17s)

**This is the Circle proof scene.** The transfer was submitted by the app through Circle Developer Controlled Wallets; the Console is used here to show the same transaction in Circle's dashboard.

- Switch to tab 3: Circle Console
- Open the most recent Developer Controlled Wallet transaction
- Show:
  - source wallet: `research_03` / `0xbcdb0012b84dc6158c50b1e353b1627d2d4af8aa`
  - destination treasury: `0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f`
  - amount: `0.001 USDC`
  - blockchain: `Arc Testnet`
  - status: `COMPLETE` or terminal success status
- **Narration segment 10**: *"Here is the same payment inside Circle. It is a developer-controlled wallet transfer from the funded buyer wallet to treasury, for zero point zero zero one USDC on Arc Testnet. Circle handles the wallet operation; Arc provides the settlement receipt."*
- Screen capture: 17 seconds

**If the Console does not surface the new row immediately:** keep the chat response and use the Arc Explorer scene as the authoritative onchain proof. Do not show secrets or `.env` values on camera.

### Scene E — Arc Block Explorer verification (3:12 – 3:30, 18s)

- Switch to tab 4: `https://testnet.arcscan.app`
- Paste the tx hash from Scene C in the search bar
- Press Enter — the explorer shows the transaction page: Status `Success`, From/To, Amount, Block, Timestamp
- Hover briefly over the Block number and the "From" address to emphasize real, verifiable onchain data
- **Narration segment 11**: *"And here it is onchain on the Arc Block Explorer. Anyone, any time, can verify at testnet dot arcscan dot app. Hackathon brief satisfied. End to end. Live."*
- Screen capture: 18 seconds

---

## Assembly in your editor

1. **Import media:**
   - `part1_pitch.mp4` (90s)
   - `part2_demo.mp4` (about 120s, the continuous Part 2 recording)
   - `narration.mp3` (about 210s total, from ElevenLabs — pass all 11 segments as one input for a single aligned track, or use 11 individual files)
   - Optional: fade-to-black between parts

2. **Timeline:**
   - 0:00 video = part1_pitch.mp4
   - 1:30 video = new `part2_demo.mp4` (immediately after Part 1 ends)
   - 0:00 audio = narration track (silent first 200ms lets the video breathe)

3. **Export:**
   - Format: MP4 (H.264)
   - Resolution: 1920×1080
   - Frame rate: 30fps
   - Bitrate: 8–12 Mbps (high enough that the hashes are crisp on replay)
   - Duration target: ~3:30 (trim to ≤ 4:45 to leave buffer under lablab's 5-min cap)

---

## Pre-flight checklist before you start recording

- [ ] Services on VM are green: `curl http://34.56.193.221/health` returns 200
- [ ] Pitch site loads fast: `curl -o /dev/null -w "%{time_total}s\n" http://34.56.193.221/`
- [ ] Marketplace is hard-refreshed and the floating chat button is visible on `/ops/`
- [ ] Circle Developer Console is logged in on tab 3 for transaction evidence
- [ ] Source wallet has balance: check `research_03` has ≥ 0.01 USDC for the demo tx
- [ ] OBS is configured for 1920×1080 @ 30fps, audio source disabled (we'll overlay narration)
- [ ] Chrome is in clean profile (no extensions that add UI chrome to captures; disable ad blockers for the session)
- [ ] Mic is muted (if narrating later in post-production)
- [ ] Screen resolution matches 1920×1080 so scaling doesn't blur text

---

## Retake strategy

- If Scene C's agent purchase fails or takes too long, **re-record only Part 2** and start from a fresh hard refresh.
- If Scene D's Console evidence takes too long to appear, keep the app chat result and Arc Explorer verification; Circle Console can be trimmed or omitted if it risks leaking private account details.
- If you miss narration timing, generate a fresh audio take from ElevenLabs (the 11 segments combined take 30 seconds to regenerate).
- Press `R` in the pitch site tab to reset the animated slideshow mid-recording if Part 1 runs out before you hit stop.

---

## Final output filename

Suggested: `TTM_Agent_Market_Submission.mp4`

Upload as **unlisted** on YouTube or directly to X — both are accepted by lablab.ai. The direct-to-X path also helps with the tag requirement (@buildoncircle @arc @lablabai).

---

## What NOT to do on camera

- Don't open DevTools or the Windows taskbar — hides the production feel
- Don't show the entity secret, API key, or `.env.hackathon` contents. The public VM is safe to show; local credentials are not.
- Don't hesitate or ad-lib the narration in-frame; the ElevenLabs track is authoritative, your video is silent to it.
- Don't forget to clear notifications / Slack / email before recording.

---

## Timings cheat sheet

```
0:00 ─────── Part 1 (pitch-video.html, 90s, captions + narration 1-6)
1:30 ─┐
      │      Part 2 Scene A — live site        (12s, narr 7)
1:42 ─┤      Part 2 Scene B — marketplace      (18s, narr 8)
2:00 ─┤      Part 2 Scene C — agent purchase   (55s, narr 9)
2:55 ─┤      Part 2 Scene D — Circle evidence  (17s, narr 10)
3:12 ─┘      Part 2 Scene E — Arc Explorer     (18s, narr 11)
3:30 ─────── END
```
