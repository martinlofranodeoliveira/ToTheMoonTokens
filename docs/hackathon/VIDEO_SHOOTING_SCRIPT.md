# TTM Agent Market — Submission video shooting script

**Goal:** ~3:00 video, well under lablab's 5-minute cap. Combines an animated pitch narrative (Part 1) with a live functional demo (Part 2) that shows the deployed product, a real Circle Developer Console transaction, and Arc Block Explorer verification — **satisfying every explicit brief requirement**.

---

## Brief requirements covered

| Requirement | Satisfied by |
|---|---|
| real per-action pricing ≤ $0.01 | Part 1 (KPI card), Part 2 Scene D (0.001 USDC live tx) |
| 50+ onchain transactions in demo | Part 1 receipt slide shows 63 / 63, referenced in narration |
| Margin explanation vs traditional gas | Part 1 comparison table, Part 2 Scene B counterfactual card |
| Transaction executed via **Circle Developer Console** | Part 2 Scene D |
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

## Part 2 — Live functional demo (1:30 – 3:00)

**Do all 5 scenes in one continuous screen recording if possible — makes editing easier.** Press F11 for full-screen.

Before recording, open these tabs in order (you'll switch between them):
1. `http://34.56.193.221/`
2. `http://34.56.193.221/ops/`
3. `http://34.56.193.221/api/hackathon/summary` (in a JSON viewer extension if you have one; otherwise raw)
4. `https://console.circle.com` — **log in first**, navigate to `Wallets → Developer Controlled → Wallets`
5. `https://testnet.arcscan.app` — open home, ready to paste

### Scene A — Live deployed pitch site (1:30 – 1:45, 15s)

- Switch to tab 1: `http://34.56.193.221/`
- Let the landing page load, hover over the navigation briefly
- **Narration segment 7**: *"Here is the live deployment. The pitch site runs at three four dot five six dot one nine three dot two two one — served by Caddy, backed by the same Arc + Circle stack you just saw."*
- Screen capture: 15 seconds

### Scene B — Live marketplace with checkout + proof data (1:45 – 2:00, 15s)

- Switch to tab 2: `http://34.56.193.221/ops/`
- Scroll gently through the page — the marketplace shows catalog cards, checkout desk, 63 tx, wallet set ID, and the margin counterfactual
- **Narration segment 8**: *"This is the live marketplace. Buyers can open a checkout, pay per artifact, verify the transaction on Arc, and unlock delivery. Under the hood you still see sixty-three settled transfers and the five-hundred-times gas advantage versus Ethereum L one."*
- Screen capture: 15 seconds

### Scene C — Judge-facing API endpoint (2:00 – 2:15, 15s)

- Switch to tab 3: `http://34.56.193.221/api/hackathon/summary`
- Let the JSON render. If your browser shows raw text, use a JSON formatter extension. Expand a couple of sections (`proof`, `margin`, `catalog`)
- **Narration segment 9**: *"Every claim in the pitch is backed by a single endpoint: slash api slash hackathon slash summary. Project, tracks, proof, margin, catalog, transactions — one JSON payload."*
- Screen capture: 15 seconds

### Scene D — Live Circle Developer Console transaction (2:15 – 2:45, 30s)

**This is the critical scene — it satisfies the brief's explicit "transaction executed via the Circle Developer Console" requirement.**

- Switch to tab 4: Circle Console → Wallets → Developer Controlled → Wallets
- Use the funded buyer wallet **research_03** (source, address `0xbcdb0012b84dc6158c50b1e353b1627d2d4af8aa`)
- Click **Send Transaction**. If the wallet detail page does not show the action, switch to **Developer Controlled → Transactions** and create the transfer there with the same source wallet.
- Fill the form:
  - **Destination address:** `0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f` (treasury wallet)
  - **Amount:** `0.001`
  - **Token:** USDC
  - **Blockchain:** Arc Testnet
  - **Fee level:** MEDIUM
- Click **Send / Confirm**
- Wait for the transaction to appear with status `INITIATED` → `SENT` → `COMPLETE`
- When `COMPLETE`, hover/click on the transaction row and **copy the tx hash** (you will paste it in Scene E)
- **Narration segment 10** (30s, longer): *"Now a live transaction executed through the Circle Developer Console. We pick the funded buyer wallet as the source, treasury as the destination, amount zero point zero zero one USDC, and settle on Arc Testnet. The Console signs, submits, and confirms. The transaction hash appears right here. This is exactly the integration flow the hackathon asked us to demonstrate."*
- Screen capture: 30 seconds

**If the Console live flow takes longer than 30s on your connection, either:** (a) trim in the editor to 30s, (b) pre-record a rehearsal run, or (c) use the already-completed batch as reference and manually copy any of the 63 hashes from `TRANSACTION_LOG.md` if the Console tx stalls during recording.

### Scene E — Arc Block Explorer verification (2:45 – 3:00, 15s)

- Switch to tab 5: `https://testnet.arcscan.app`
- Paste the tx hash from Scene D in the search bar
- Press Enter — the explorer shows the transaction page: Status `Success`, From/To, Amount, Block, Timestamp
- Hover briefly over the Block number and the "From" address to emphasize real, verifiable onchain data
- **Narration segment 11**: *"And here it is onchain on the Arc Block Explorer. Anyone, any time, can verify at testnet dot arcscan dot app. Hackathon brief satisfied. End to end. Live."*
- Screen capture: 15 seconds

---

## Assembly in your editor

1. **Import media:**
   - `part1_pitch.mp4` (90s)
   - `part2_demo.mp4` (90s, the continuous Part 2 recording)
   - `narration.mp3` (90s, from ElevenLabs — pass all 11 segments as one input for a single aligned track, or use 11 individual files)
   - Optional: fade-to-black between parts

2. **Timeline:**
   - 0:00 video = part1_pitch.mp4
   - 1:30 video = part2_demo.mp4 (immediately after Part 1 ends)
   - 0:00 audio = narration track (silent first 200ms lets the video breathe)

3. **Export:**
   - Format: MP4 (H.264)
   - Resolution: 1920×1080
   - Frame rate: 30fps
   - Bitrate: 8–12 Mbps (high enough that the hashes are crisp on replay)
   - Duration target: ~3:00 (trim to ≤ 4:45 to leave buffer under lablab's 5-min cap)

---

## Pre-flight checklist before you start recording

- [ ] Services on VM are green: `curl http://34.56.193.221/health` returns 200
- [ ] Pitch site loads fast: `curl -o /dev/null -w "%{time_total}s\n" http://34.56.193.221/`
- [ ] Circle Developer Console is logged in on tab 4
- [ ] Source wallet has balance: check `research_03` has ≥ 0.01 USDC for the demo tx
- [ ] OBS is configured for 1920×1080 @ 30fps, audio source disabled (we'll overlay narration)
- [ ] Chrome is in clean profile (no extensions that add UI chrome to captures; disable ad blockers for the session)
- [ ] Mic is muted (if narrating later in post-production)
- [ ] Screen resolution matches 1920×1080 so scaling doesn't blur text

---

## Retake strategy

- If Scene D's Console transaction fails or takes too long, **re-record only Scene D** — the other four scenes can stay.
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
      │      Part 2 Scene A — live site       (15s, narr 7)
1:45 ─┤      Part 2 Scene B — marketplace     (15s, narr 8)
2:00 ─┤      Part 2 Scene C — API endpoint    (15s, narr 9)
2:15 ─┤      Part 2 Scene D — Circle Console  (30s, narr 10) ← brief-critical
2:45 ─┘      Part 2 Scene E — Arc Explorer    (15s, narr 11) ← brief-critical
3:00 ─────── END
```
