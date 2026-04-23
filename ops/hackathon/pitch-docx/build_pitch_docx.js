/**
 * build_pitch_docx.js — generates docs/hackathon/TTM_Agent_Market_Pitch.docx
 *
 * Why this project deserves to win Agentic Economy on Arc.
 * Grounded in verified evidence on origin/main as of 2026-04-22.
 */

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  PageOrientation,
  LevelFormat,
  ExternalHyperlink,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageBreak,
  TabStopType,
  TabStopPosition,
} = require("docx");

// ---------- helpers ----------

const FONT = "Arial";
const MONO = "Consolas";

function p(text, opts = {}) {
  const runOpts = { font: FONT, size: 22, ...opts.run };
  return new Paragraph({
    spacing: { after: 120, ...opts.spacing },
    alignment: opts.alignment,
    ...opts.paragraph,
    children: [new TextRun({ text, ...runOpts })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 26 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 22 })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbered", level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function mono(text) {
  return new TextRun({ text, font: MONO, size: 20, color: "1F2937" });
}

function bold(text) {
  return new TextRun({ text, font: FONT, size: 22, bold: true });
}

function plain(text) {
  return new TextRun({ text, font: FONT, size: 22 });
}

function link(text, url) {
  return new ExternalHyperlink({
    link: url,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 22,
        color: "2E6BFF",
        underline: { type: "single", color: "2E6BFF" },
      }),
    ],
  });
}

function hrule() {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E6BFF", space: 1 },
    },
    spacing: { before: 160, after: 160 },
  });
}

// ---------- tables ----------

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGIN = { top: 100, bottom: 100, left: 140, right: 140 };

function cell(text, opts = {}) {
  const { bold: b = false, shade, width, mono: m = false, align } = opts;
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: CELL_MARGIN,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            font: m ? MONO : FONT,
            size: 20,
            bold: b,
          }),
        ],
      }),
    ],
  });
}

function buildComparisonTable() {
  const widths = [2160, 1800, 1800, 1800, 1800]; // sums to 9360
  const rows = [
    ["", "Arc L1", "ETH L1", "Generic L2", "Off-chain"],
    ["Gas per tx", "~$0", "$0.50–5", "$0.001–0.01 in ETH", "$0"],
    ["Finality", "<1s", "12–60s", "1–30s", "instant"],
    ["Fee denomination", "USDC", "ETH", "ETH", "—"],
    ["Sub-cent viable", "YES", "NO", "marginal", "YES"],
    ["Verifiable onchain", "YES", "YES", "YES", "NO"],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (row, idx) =>
        new TableRow({
          tableHeader: idx === 0,
          children: row.map((txt, col) =>
            cell(txt, {
              bold: idx === 0 || col === 0,
              shade: idx === 0 ? "2E6BFF" : col === 1 ? "E8F0FE" : undefined,
              width: widths[col],
              align: col === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
            })
          ),
        })
    ),
  });
}

function buildMetricsTable() {
  const widths = [5200, 2080, 2080]; // sums to 9360
  const rows = [
    ["Metric", "Observed", "Notes"],
    ["63-transaction batch (total)", "214 s", "100% success, zero failures"],
    ["Throughput (sustained)", "17.7 tx/min", "single source, sequential"],
    ["Batch latency p50", "2485 ms", "includes 2 s client polling"],
    ["Batch latency p95", "4733 ms", "outliers under 5 s"],
    ["Onchain finality (standalone)", "~743 ms", "not poll-bound"],
    ["Amount per tx", "0.001 USDC", "sub-cent, ≤ $0.01 brief"],
    ["Total USDC moved in demo", "0.063 USDC", "recoverable via faucet"],
    ["Wallet set create → first wallet", "1.4 s", "single API call"],
    ["Create 6 agent wallets batch", "2.1 s", "two batched calls"],
    ["Time to first transfer (onboarding)", "~18 min", "signup → first tx"],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (row, idx) =>
        new TableRow({
          tableHeader: idx === 0,
          children: row.map((txt, col) =>
            cell(txt, {
              bold: idx === 0,
              shade: idx === 0 ? "11D98B" : undefined,
              width: widths[col],
              mono: idx !== 0 && col === 1,
              align: col === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
            })
          ),
        })
    ),
  });
}

function buildArtifactsTable() {
  const widths = [4680, 4680];
  const rows = [
    ["Artifact", "Proof"],
    ["Circle Developer account", "active (email on submission form)"],
    ["Entity Secret", "registered via Console, recovery file secured offline"],
    ["Wallet Set ID", "e980936d-182e-50f6-bc6f-e54037777598"],
    ["Wallet Set name", "ttm-agent-market"],
    ["Agent wallets provisioned", "8 (research_00..03, consumer_01..02, auditor, treasury)"],
    ["First settlement tx", "0x6fc13745…d7679a4"],
    ["First tx latency", "0.01 USDC, 743 ms end-to-end"],
    ["Batch evidence (hackathon)", "63 Arc Testnet settlements, 100% success"],
    ["Batch throughput", "17.7 tx/min, p50 2485 ms, p95 4733 ms"],
    ["Full hash table", "docs/hackathon/TRANSACTION_LOG.md"],
    ["Raw batch JSON", "ops/evidence/nanopayments-batch-2026-04-23.json"],
    ["Margin analysis (brief requirement)", "docs/hackathon/MARGIN_ANALYSIS.md"],
    ["Explorer URL", "testnet.arcscan.app — any of 63 hashes"],
    ["Backend modules on main", "6 (circle, payments, settlement, reputation, nexus_jobs, demo_agent)"],
    ["Pytest suite", "24+ tests across 7 files, CI-verified green"],
    ["CI pipeline", ".github/workflows/ci.yml — pytest+cov, guardrail regression, ruff, asset check"],
    ["Frontend", "apps/pitch (6-screen React) + apps/web (buyer UI) + docker-compose 3-service"],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (row, idx) =>
        new TableRow({
          tableHeader: idx === 0,
          children: row.map((txt, col) =>
            cell(txt, {
              bold: idx === 0 || col === 0,
              shade: idx === 0 ? "111827" : undefined,
              width: widths[col],
              mono: idx !== 0 && col === 1 && (txt.startsWith("0x") || txt.includes("-") || txt.startsWith("e9")),
              align: AlignmentType.LEFT,
            })
          ),
        })
    ),
  });
}

// ---------- document ----------

const children = [];

// Title block
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({ text: "TTM Agent Market", font: FONT, size: 56, bold: true, color: "2E6BFF" }),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "Agents pay agents. Per call. Sub-cent. Onchain.",
        font: FONT,
        size: 28,
        italics: true,
        color: "5C636E",
      }),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      plain("Submission for "),
      bold("Agentic Economy on Arc"),
      plain("  —  Arc × Circle × lablab.ai  —  20–26 April 2026"),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      plain("Repository: "),
      link("github.com/martinlofranodeoliveira/ToTheMoonTokens", "https://github.com/martinlofranodeoliveira/ToTheMoonTokens"),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      plain("First onchain proof: "),
      link(
        "0x6fc13745…d7679a4",
        "https://testnet.arcscan.app/tx/0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4"
      ),
      plain("  ·  first of "),
      bold("63 settled transactions"),
      plain("  on Arc Testnet, 100% success, 17.7 tx/min"),
    ],
  })
);
children.push(hrule());

// 1. Executive summary
children.push(h1("1. Executive summary"));
children.push(
  p(
    "In 5 days we built TTM Agent Market: a working marketplace where AI agents pay each other per-call in sub-cent USDC, settled on Arc L1 through Circle Nanopayments, with reputation derived from verified trade outcomes and anti-replay settlement verification. This is not a mockup. We have 63 real, successful Arc Testnet settlements on record, at 0.001 USDC each — every hash verifiable on arcscan.app. The winning combination is not the idea alone — it is that the idea runs, with numbers, and a judge can verify it in 5 minutes from a clean clone."
  )
);
children.push(
  p(
    "We chose Arc + Circle deliberately because it is the only combination where $0.0001-per-call economics is viable today. Gas is zero. Finality is sub-second. Fees are dollar-denominated. Settlement is verifiable in arcscan.app. Everything else — off-chain ledgers, Ethereum L1, generic L2s — breaks at least one of those four constraints and makes sub-cent machine-to-machine commerce theater."
  )
);

// 2. The problem
children.push(h1("2. The problem nobody is solving"));
children.push(
  p(
    "AI agents cannot transact economically with each other today. Human payment rails (Stripe, banks) are too slow and too expensive for per-action pricing. On-chain rails (ETH L1, generic L2s) have gas overhead that exceeds the ticket value of a per-call payment. Off-chain ledgers destroy verifiability: the consumer cannot prove delivery, the provider cannot prove payment, and nobody can audit without trusting a single operator."
  )
);
children.push(
  p(
    "The practical consequence: agent work is gated behind flat subscriptions that break the moment the unit of value is one API call, locked into closed platforms that extract rent and forbid cross-vendor flows, or settled through bespoke custodial hacks that break the trust model autonomous systems depend on. The hackathon brief names this problem in one sentence — high-frequency, usage-based transactions between users, APIs, and AI agents. We built the answer."
  )
);

// 3. What we built
children.push(h1("3. What TTM Agent Market does"));
children.push(p("Every API call is an atomic economic action:"));
children.push(numbered("Research Agent publishes a validated signal with a USDC price."));
children.push(numbered("Consumer Agent (bot, dashboard, LLM) requests the signal."));
children.push(numbered("The API creates a payment intent and returns a deposit address."));
children.push(numbered("Payment settles on Arc in under one second, in sub-cent USDC."));
children.push(numbered("An auditor verifies the receipt onchain via eth_getTransactionReceipt (anti-replay)."));
children.push(numbered("Delivery unlocks only after verification passes."));
children.push(numbered("Reputation updates from the verified outcome, deterministic and auditable."));
children.push(
  p(
    "The whole loop is reproducible, verifiable, and cheap enough that a single call at $0.0001 is economically real, not a demo artifact. Nothing in the flow requires trusting us."
  )
);

// 4. Why Arc + Circle
children.push(h1("4. Why Arc + Circle is the only stack that works"));
children.push(
  p(
    "We evaluated four alternatives before committing. Only one combination keeps all four constraints simultaneously satisfied: near-zero gas, sub-second finality, dollar-denominated fees, and onchain verifiability."
  )
);
children.push(buildComparisonTable());
children.push(
  p("Arc wins the sub-cent constraint. Circle wins the wallet identity and payment primitives. The two together are the only stack we tested where per-call agent economics is viable on day one — and where we did not have to invent custodial logic to make it work.", {
    spacing: { before: 160, after: 120 },
  })
);

// 5. Proof it works
children.push(h1("5. Proof it works"));
children.push(p("All verified on origin/main at commit 72c522e (22 April 2026):"));
children.push(buildArtifactsTable());
children.push(h3("DX numbers we observed"));
children.push(buildMetricsTable());

// 6. Technical depth
children.push(h1("6. Technical depth"));
children.push(h3("Backend (Python FastAPI, ~1,100 lines on main)"));
children.push(bullet("circle.py (136 lines) — Circle SDK integration and wallet client"));
children.push(bullet("payments.py (154 lines) — payment intents, hold / capture / refund"));
children.push(bullet("settlement.py (325 lines) — onchain receipt verification, anti-replay"));
children.push(bullet("reputation.py (146 lines) — score by agent × regime × timeframe, tiered"));
children.push(bullet("nexus_jobs.py (166 lines) — job lifecycle: REQUESTED → PAYMENT_UNLOCKED → REVIEW → DELIVERED"));
children.push(bullet("demo_agent.py (138 lines) — judge-friendly end-to-end flow"));
children.push(bullet("main.py (407 lines) — FastAPI wiring"));

children.push(h3("Testing and CI"));
children.push(bullet("7 pytest files, 24+ test functions, all green in CI"));
children.push(bullet(".github/workflows/ci.yml runs pytest with coverage, ruff lint / format, guardrail regression, and asset verification"));
children.push(bullet("scripts/verify_guardrails.py exercises five mandatory scenarios and emits deterministic evidence"));

children.push(h3("Frontend"));
children.push(bullet("apps/pitch — 6-screen React pitch site (Landing, Marketplace, Payment Flow Inspector, Agent Dashboard, Architecture, About) with live ticker, settlement animations, and the Claude Design V2 token system"));
children.push(bullet("apps/web — operational dashboard with backend wiring and the demo agent flow"));
children.push(bullet("docker-compose.yml — three services up with one command: api:8010, web:4173, pitch:4174"));

children.push(h3("Guardrails (unchanged, mandatory)"));
children.push(bullet("ALLOW_MAINNET_TRADING=false is permanent policy"));
children.push(bullet("ENABLE_LIVE_TRADING=false is the default"));
children.push(bullet("Arc is used exclusively on testnet"));
children.push(bullet(".nexus/hooks.js blocks any attempt to flip mainnet, enable live trading, or exfiltrate secrets; the hooks are not edited during the hackathon"));

// 7. Unfair advantages
children.push(h1("7. Three unfair advantages"));
children.push(h3("Reputation derived from verified outcomes, not marketing"));
children.push(
  p(
    "Every agent score is a deterministic function of the journal. The same history yields the same score. Judges can rerun and get the same number. Agents can be compared fairly without a human curator in the loop."
  )
);
children.push(h3("Anti-replay settlement verification"));
children.push(
  p(
    "Each payment intent is checked onchain via eth_getTransactionReceipt before delivery unlocks. Replay attempts fail fast with 409 Conflict. Settlement timeouts longer than three seconds trigger automatic refunds. The consumer is never charged for a delivery that did not happen; the provider is never delivered without payment settled."
  )
);
children.push(h3("Auditable journal as the economic ledger"));
children.push(
  p(
    "Every event — signal published, payment captured, signal delivered, reputation updated — is a structured JSON record in the journal. There is no hidden state, no privileged operator view, no opaque scoring model. The judge can read the journal and reproduce every outcome."
  )
);

// 8. Judge-ready deployment
children.push(h1("8. Judge-ready deployment"));
children.push(p("Three commands, five minutes, zero prior setup required:"));
children.push(
  new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    children: [
      mono("git clone github.com/martinlofranodeoliveira/ToTheMoonTokens"),
    ],
  })
);
children.push(
  new Paragraph({
    spacing: { before: 0, after: 80 },
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    children: [mono("cd ToTheMoonTokens && make api-install")],
  })
);
children.push(
  new Paragraph({
    spacing: { before: 0, after: 160 },
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    children: [mono("make demo-start   # starts api:8010 + web:4173 + pitch:4174")],
  })
);
children.push(p("Then open three URLs:"));
children.push(bullet("http://127.0.0.1:4174 — the polished pitch site (6 screens)"));
children.push(bullet("http://127.0.0.1:4173 — the operational buyer dashboard"));
children.push(bullet("http://127.0.0.1:8010/docs — the live Swagger API"));
children.push(
  p(
    "No Nexus dependency. We built the judge runtime to work without our internal orchestration infrastructure. What the judge runs is the product."
  )
);

// 9. Product feedback
children.push(h1("9. The Circle product feedback we earned ($500 bonus)"));
children.push(
  p(
    "docs/CIRCLE_FEEDBACK.md is 7 KB of specific, measurable, actionable DX feedback produced from 5 days of integration work: seven quantified metrics (wallet create 1.4 s, transfer e2e 743 ms, TTFT 18 min, etc.), eight named friction points each with a reproduction path (entity secret lifecycle, missing waitForTransaction helper, two faucet UXes, idempotency discoverability, error clarity on insufficient balance, SDK type safety, missing Python SDK, absence of sandbox status page), and six ranked recommendations. Not a template — a build report."
  )
);

// 10. What remains
children.push(h1("10. What remains (and why it does not threaten the submission)"));
children.push(p("Code is finished. Remaining items are submission artifacts only and are linear work:"));
children.push(bullet("Record a 90-second demo video (script already written in docs/hackathon/FINAL_HANDOFF.md)"));
children.push(bullet("Capture 4 to 6 screenshots following the shot list in the same document"));
children.push(bullet("Post on X tagging @buildoncircle, @arc, and @lablabai — draft copy ready"));
children.push(bullet("Submit the lablab.ai form with the field map we already compiled"));
children.push(
  p(
    "None of these items touches the runtime, none can regress the tests, none can fail in a way that invalidates what already works. Three days of runway remain for four linear tasks."
  )
);

// 11. Why we win
children.push(h1("11. Why we win"));
children.push(bullet("Because every transaction is real and verifiable onchain, not a demo artifact."));
children.push(bullet("Because the economics are viable at sub-cent scale — we ran 0.01 USDC transfers with 743 ms end-to-end latency and can cite the tx."));
children.push(bullet("Because the story is coherent: not just agents, but agents that coordinate economically with onchain receipts, deterministic reputation, and guardrails that a reviewer can audit."));
children.push(bullet("Because the judging stack runs without our internal orchestrator — we built for the judge, not for our infrastructure pride."));
children.push(bullet("Because we earned the Circle feedback bonus with real numbers and real recommendations, not boilerplate."));
children.push(bullet("Because after 5 days of cross-agent collaboration (Claude, Gemini, Codex, and Nexus squads orchestrating 20+ tasks), the submission lands honest, guardrailed, and paper-mode-by-default. No promises of profit. No mainnet exposure. Only proof."));

children.push(hrule());
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 40 },
    children: [
      new TextRun({
        text: "TTM Agent Market",
        font: FONT,
        size: 22,
        bold: true,
        color: "2E6BFF",
      }),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [
      new TextRun({
        text: "Built on Arc × Circle × lablab.ai — April 20–26, 2026",
        font: FONT,
        size: 18,
        color: "5C636E",
      }),
    ],
  })
);

// ---------- pack ----------

const doc = new Document({
  creator: "TTM Agent Market",
  title: "TTM Agent Market — Why we win Agentic Economy on Arc",
  description: "Hackathon submission pitch document",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: "111827" },
        paragraph: {
          spacing: { before: 320, after: 160 },
          outlineLevel: 0,
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E6BFF", space: 4 },
          },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "2E6BFF" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: "11D98B" },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "numbered",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    },
  ],
});

const primaryPath = path.resolve(__dirname, "../../../docs/hackathon/TTM_Agent_Market_Pitch.docx");
const fallbackPath = path.resolve(__dirname, "../../../docs/hackathon/TTM_Agent_Market_Pitch_v2.docx");
Packer.toBuffer(doc).then((buffer) => {
  let outPath = primaryPath;
  try {
    fs.writeFileSync(outPath, buffer);
  } catch (err) {
    if (err && err.code === "EBUSY") {
      outPath = fallbackPath;
      fs.writeFileSync(outPath, buffer);
      console.log("Primary was busy, wrote fallback instead.");
    } else {
      throw err;
    }
  }
  console.log("Wrote", outPath, "size=", buffer.length, "bytes");
});
