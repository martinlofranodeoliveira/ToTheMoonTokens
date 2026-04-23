const DEFAULT_API_BASE_URL = "http://127.0.0.1:8010";
let refreshTimer = null;

function resolveApiBaseUrl() {
  const meta = document.querySelector('meta[name="ttm-api-base-url"]');
  const fromMeta = meta && meta.getAttribute("content");
  const fromQuery = new URLSearchParams(window.location.search).get("api");
  const fromGlobal = typeof window.TTM_API_BASE_URL === "string" ? window.TTM_API_BASE_URL : null;
  return fromQuery || fromGlobal || fromMeta || DEFAULT_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

const FALLBACK_SUMMARY = {
  ok: true,
  project: "TTM Agent Market",
  tracks: [
    "Agent-to-Agent Payment Loop",
    "Per-API Monetization Engine",
    "Real-Time Micro-Commerce Flow",
  ],
  evidence_file: "repo-fallback",
  proof: {
    wallet_set_id: "e980936d-182e-50f6-bc6f-e54037777598",
    generated_at: "2026-04-23T00:01:38.506Z",
    transactions_total: 63,
    transactions_successful: 63,
    transactions_failed: 0,
    success_rate_pct: 100,
    latency_p50_ms: 2485,
    latency_p95_ms: 4733,
    throughput_tx_per_min: 17.7,
    total_usdc_moved: 0.063,
    amount_per_tx_usdc: 0.001,
    sample_tx_hash: "0x01092dbfccb591728a41e14a7716c2ac7aec4d93f478d725590a3a3988b13c9d",
    explorer_base_url: "https://testnet.arcscan.app",
  },
  margin: {
    arc_total_value_usdc: 0.063,
    eth_l1_counterfactual_gas_usd: 31.5,
    generic_l2_counterfactual_gas_usd: 0.189,
    eth_l1_overhead_multiple: 500,
    explanation:
      "The same batch would burn far more in traditional gas than the value moved. Arc keeps per-action economics viable.",
  },
  arc: {
    status: "online",
    chain_id: 5042002,
    url: "https://rpc.testnet.arc.network",
  },
  circle: {
    wallet_set_id: "e980936d-182e-50f6-bc6f-e54037777598",
    wallets_configured: 8,
    wallets_loaded: false,
    treasury_address: null,
    wallets: [],
  },
  connectors: {
    settlement_network: "arc_testnet",
    wallet_provider: "circle_developer_controlled_wallets",
    wallet_mode: "manual_only",
    wallet_set_id: "e980936d-182e-50f6-bc6f-e54037777598",
    wallets_configured: 8,
    wallets_loaded: false,
    treasury_address: null,
    arc_rpc_url: "https://rpc.testnet.arc.network",
    metamask_ready: true,
    latency_ms: 0,
    reconnect_count: 0,
    last_error: null,
  },
  guardrails: {
    mode: "paper",
    can_submit_testnet_orders: false,
    can_submit_mainnet_orders: false,
    requires_manual_wallet_signature: true,
    reasons: [
      "Order submission is disabled. Hackathon scope is paid agent artifacts, not trading automation.",
    ],
  },
  catalog: [
    {
      id: "artifact_delivery_packet",
      name: "Delivery Packet",
      description: "Reviewed delivery packet with execution summary and unlock metadata.",
      price_usd: 0.001,
      type: "delivery_packet",
    },
    {
      id: "artifact_review_bundle",
      name: "Review Bundle",
      description: "Reviewer-approved evidence bundle with settlement and quality checkpoints.",
      price_usd: 0.005,
      type: "review_bundle",
    },
    {
      id: "artifact_market_intel_brief",
      name: "Market Intelligence Brief",
      description: "Premium machine-generated brief unlocked only after payment verification.",
      price_usd: 0.01,
      type: "market_intel_brief",
    },
  ],
  demo_jobs: [
    {
      id: "demo_001",
      artifact_type: "delivery_packet",
      state: "DELIVERED",
      price_usdc: 0.001,
    },
    {
      id: "demo_002",
      artifact_type: "review_bundle",
      state: "REVIEW_PENDING",
      price_usdc: 0.005,
    },
  ],
  transactions: [
    {
      seq: 63,
      from: "research_00",
      to: "treasury",
      amount_usdc: "0.001",
      state: "COMPLETE",
      tx_hash: "0x01092dbfccb591728a41e14a7716c2ac7aec4d93f478d725590a3a3988b13c9d",
      elapsed_ms: 2455,
      timestamp: "2026-04-23T00:01:38.102Z",
    },
    {
      seq: 62,
      from: "research_00",
      to: "auditor",
      amount_usdc: "0.001",
      state: "COMPLETE",
      tx_hash: "0xef9dcf454ce5e2763eaff4c49e57f0492defb7b206d646c5579e57ede9e0fb38",
      elapsed_ms: 2471,
      timestamp: "2026-04-23T00:01:35.242Z",
    },
    {
      seq: 60,
      from: "research_00",
      to: "research_03",
      amount_usdc: "0.001",
      state: "COMPLETE",
      tx_hash: "0x1ece4fd34bf75d7dbe4feab863846851e61ff3b64fedf4881a0051e14c50d7ec",
      elapsed_ms: 2450,
      timestamp: "2026-04-23T00:01:29.485Z",
    },
    {
      seq: 49,
      from: "research_00",
      to: "treasury",
      amount_usdc: "0.001",
      state: "COMPLETE",
      tx_hash: "0xfd5164fa11d5be54d676a3fcd09d055ce0dc1218ba5eb63c402944e0ded7fda6",
      elapsed_ms: 2515,
      timestamp: "2026-04-23T00:00:50.734Z",
    },
  ],
  arc_jobs: [],
};

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char];
  });
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return number.toFixed(digits);
}

function formatPct(value, digits = 0) {
  return `${formatNumber(value, digits)}%`;
}

function formatUsdc(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return `${number.toFixed(digits)} USDC`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function truncateHash(hash, head = 6, tail = 4) {
  if (!hash) {
    return "-";
  }
  return `${hash.slice(0, 2 + head)}…${hash.slice(-tail)}`;
}

function chip(label, value, tone = "neutral") {
  return `<span class="chip" data-tone="${escapeHtml(tone)}">${escapeHtml(label)}: ${escapeHtml(value)}</span>`;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function showStatus(message, variant = "info") {
  const banner = document.getElementById("status-banner");
  if (!banner) {
    return;
  }
  banner.textContent = message;
  banner.dataset.variant = variant;
  banner.hidden = !message;
}

function renderHero(summary) {
  const topRuntimeBadge = document.getElementById("top-runtime-badge");
  const runtimeStrip = document.getElementById("runtime-strip");
  const runtimeState = document.getElementById("runtime-state");
  const runtimeWindow = document.getElementById("runtime-window");
  const runtimeProgress = document.getElementById("runtime-progress");
  const spotPrice = document.getElementById("spot-price");
  const spotChange = document.getElementById("spot-change");
  const spotVolume = document.getElementById("spot-volume");

  if (topRuntimeBadge) {
    topRuntimeBadge.textContent = `${summary.guardrails.mode.toUpperCase()} mode`;
  }

  if (runtimeStrip) {
    runtimeStrip.innerHTML = [
      chip("Track", "Agent payments", "positive"),
      chip("Wallet set", truncateHash(summary.proof.wallet_set_id, 4, 4), "neutral"),
      chip("Transactions", String(summary.proof.transactions_total), "positive"),
      chip("Throughput", `${formatNumber(summary.proof.throughput_tx_per_min, 1)} tx/min`, "positive"),
      chip("Cap", "<= $0.01", "warning"),
    ].join("");
  }

  if (spotPrice) {
    spotPrice.textContent = `${summary.proof.transactions_total} real tx`;
  }

  if (spotChange) {
    spotChange.textContent = `${formatPct(summary.proof.success_rate_pct, 0)} success`;
    spotChange.dataset.tone = "positive";
  }

  if (spotVolume) {
    spotVolume.textContent = `${formatUsdc(summary.proof.total_usdc_moved)} moved`;
  }

  if (runtimeState) {
    runtimeState.textContent = `${summary.circle.wallets_configured} wallets configured`;
  }

  if (runtimeWindow) {
    runtimeWindow.textContent = [
      `Wallet set ${truncateHash(summary.circle.wallet_set_id, 4, 4)}`,
      `Arc chain ${summary.arc.chain_id || "unknown"}`,
      `p50 ${summary.proof.latency_p50_ms} ms`,
      `p95 ${summary.proof.latency_p95_ms} ms`,
      `generated ${formatDateTime(summary.proof.generated_at)}`,
    ].join(" · ");
  }

  if (runtimeProgress) {
    runtimeProgress.style.width = `${Math.max(4, Math.min(asNumber(summary.proof.success_rate_pct), 100))}%`;
  }
}

function renderKpis(summary) {
  const container = document.getElementById("kpi-grid");
  if (!container) {
    return;
  }

  const cards = [
    {
      label: "Transactions",
      value: String(summary.proof.transactions_total),
      tone: "positive",
      copy: `${summary.proof.transactions_successful} settled on Arc Testnet`,
    },
    {
      label: "Price ceiling",
      value: "$0.01",
      tone: "warning",
      copy: "All catalog actions stay within the hackathon limit",
    },
    {
      label: "Latency p50",
      value: `${summary.proof.latency_p50_ms} ms`,
      tone: "neutral",
      copy: `p95 ${summary.proof.latency_p95_ms} ms`,
    },
    {
      label: "Throughput",
      value: `${formatNumber(summary.proof.throughput_tx_per_min, 1)} tx/min`,
      tone: "positive",
      copy: `${formatUsdc(summary.proof.total_usdc_moved)} moved in the batch`,
    },
    {
      label: "Wallets",
      value: String(summary.circle.wallets_configured),
      tone: "neutral",
      copy: summary.circle.wallets_loaded ? "Loaded from Circle client" : "Provisioned in wallet set",
    },
    {
      label: "ETH L1 counterfactual",
      value: `$${formatNumber(summary.margin.eth_l1_counterfactual_gas_usd, 2)}`,
      tone: "danger",
      copy: `${formatNumber(summary.margin.eth_l1_overhead_multiple, 0)}x the value moved`,
    },
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <article class="kpi-card">
          <p class="eyebrow">${escapeHtml(card.label)}</p>
          <strong class="trend-pill" data-tone="${escapeHtml(card.tone)}">${escapeHtml(card.value)}</strong>
          <p class="subcopy">${escapeHtml(card.copy)}</p>
        </article>
      `,
    )
    .join("");
}

function renderCatalog(catalog) {
  const container = document.getElementById("strategy-grid");
  if (!container) {
    return;
  }

  container.innerHTML = catalog
    .map(
      (item) => `
        <article class="strategy-card">
          <div class="strategy-header">
            <div>
              <p class="eyebrow">${escapeHtml(item.type.replaceAll("_", " "))}</p>
              <h4>${escapeHtml(item.name)}</h4>
            </div>
            <span class="strategy-pill" data-tone="positive">${escapeHtml(formatUsdc(item.price_usd))}</span>
          </div>
          <p class="strategy-copy">${escapeHtml(item.description)}</p>
          <div class="metric-stack">
            <div class="metric-tile">
              <p class="eyebrow">Settlement</p>
              <strong>Arc + Circle</strong>
            </div>
            <div class="metric-tile">
              <p class="eyebrow">Unlock gate</p>
              <strong>verify tx</strong>
            </div>
            <div class="metric-tile">
              <p class="eyebrow">Economic model</p>
              <strong>per action</strong>
            </div>
            <div class="metric-tile">
              <p class="eyebrow">Judge status</p>
              <strong>demo-ready</strong>
            </div>
          </div>
          <p class="helper-text">Request -> pay -> verify -> review -> deliver</p>
        </article>
      `,
    )
    .join("");
}

function renderGuardrails(guardrails) {
  const summary = document.getElementById("approval-summary");
  const list = document.getElementById("guardrail-list");
  if (!summary || !list) {
    return;
  }

  summary.innerHTML = `
    <div class="approval-tile">
      <p class="eyebrow">Exchange orders</p>
      <strong>${guardrails.can_submit_testnet_orders ? "Enabled" : "Disabled"}</strong>
    </div>
    <div class="approval-tile">
      <p class="eyebrow">Mainnet</p>
      <strong>${guardrails.can_submit_mainnet_orders ? "Enabled" : "Blocked"}</strong>
    </div>
    <div class="approval-tile">
      <p class="eyebrow">Wallet signing</p>
      <strong>${guardrails.requires_manual_wallet_signature ? "Manual only" : "Review needed"}</strong>
    </div>
  `;

  list.innerHTML = (guardrails.reasons || [])
    .map(
      (reason) => `
        <li class="guardrail-item">
          <p>${escapeHtml(reason)}</p>
        </li>
      `,
    )
    .join("");
}

function renderConnectors(summary) {
  const container = document.getElementById("connector-grid");
  if (!container) {
    return;
  }

  const arcTone = summary.arc.status === "online" ? "positive" : "warning";
  const walletStatus = summary.circle.wallets_loaded ? "loaded" : "configured";

  container.innerHTML = `
    <article class="connector-card">
      <p class="eyebrow">Settlement network</p>
      <strong>${escapeHtml(summary.connectors.settlement_network)}</strong>
      <p>Chain ${escapeHtml(String(summary.arc.chain_id || "unknown"))} · ${escapeHtml(summary.arc.url || summary.connectors.arc_rpc_url)}</p>
    </article>
    <article class="connector-card">
      <p class="eyebrow">Wallet provider</p>
      <strong>${escapeHtml(summary.connectors.wallet_provider)}</strong>
      <p>${escapeHtml(summary.circle.wallets_configured)} wallets ${escapeHtml(walletStatus)} · mode ${escapeHtml(summary.connectors.wallet_mode)}</p>
    </article>
    <article class="connector-card">
      <p class="eyebrow">Counterfactual</p>
      <strong class="trend-pill" data-tone="${escapeHtml(arcTone)}">$${escapeHtml(formatNumber(summary.margin.eth_l1_counterfactual_gas_usd, 2))}</strong>
      <p>ETH L1 gas to move ${escapeHtml(formatUsdc(summary.proof.total_usdc_moved))}</p>
    </article>
  `;
}

function renderTransactions(transactions) {
  const container = document.getElementById("journal-list");
  if (!container) {
    return;
  }

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <article class="trade-card">
        <p class="eyebrow">No transactions loaded</p>
        <p>The API did not return any Arc settlement evidence.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = transactions
    .map(
      (tx) => `
        <article class="trade-card">
          <div class="trade-topline">
            <strong class="trade-symbol">#${escapeHtml(String(tx.seq))} ${escapeHtml(tx.from)} -> ${escapeHtml(tx.to)}</strong>
            <span class="trade-pill" data-tone="positive">${escapeHtml(tx.state)}</span>
          </div>
          <p class="mono">${escapeHtml(truncateHash(tx.tx_hash, 10, 6))}</p>
          <div class="trade-meta">
            <span>${escapeHtml(formatUsdc(tx.amount_usdc))}</span>
            <span>${escapeHtml(formatDateTime(tx.timestamp))}</span>
          </div>
          <div class="trade-grid">
            <div class="trade-stat">
              <p class="eyebrow">Elapsed</p>
              <strong>${escapeHtml(String(tx.elapsed_ms))} ms</strong>
            </div>
            <div class="trade-stat">
              <p class="eyebrow">State</p>
              <strong>${escapeHtml(tx.state)}</strong>
            </div>
            <div class="trade-stat">
              <p class="eyebrow">Explorer</p>
              <strong><a href="https://testnet.arcscan.app/tx/${escapeHtml(tx.tx_hash)}" target="_blank" rel="noreferrer">open tx</a></strong>
            </div>
            <div class="trade-stat">
              <p class="eyebrow">Sequence</p>
              <strong>${escapeHtml(String(tx.seq))}</strong>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderDemoJobs(demoJobs) {
  const container = document.getElementById("runtime-monitor");
  if (!container) {
    return;
  }

  const jobs = demoJobs && demoJobs.length > 0 ? demoJobs : FALLBACK_SUMMARY.demo_jobs;
  container.innerHTML = jobs
    .map(
      (job) => `
        <article class="runtime-card">
          <div class="runtime-card-header">
            <div>
              <p class="eyebrow">${escapeHtml(job.artifact_type.replaceAll("_", " "))}</p>
              <strong>${escapeHtml(job.state)}</strong>
            </div>
            <span class="trend-pill" data-tone="${escapeHtml(job.state === "DELIVERED" ? "positive" : "warning")}">
              ${escapeHtml(formatUsdc(job.price_usdc))}
            </span>
          </div>
          <div class="runtime-grid">
            <div class="runtime-stat">
              <p class="eyebrow">Job ID</p>
              <strong>${escapeHtml(job.id)}</strong>
            </div>
            <div class="runtime-stat">
              <p class="eyebrow">Flow</p>
              <strong>request -> review</strong>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderArcProof(summary) {
  const container = document.getElementById("arc-jobs-list");
  if (!container) {
    return;
  }

  const cards = [
    {
      title: "Arc network",
      body: `${summary.arc.status} · chain ${summary.arc.chain_id || "unknown"}`,
      detail: summary.arc.url || summary.connectors.arc_rpc_url,
    },
    {
      title: "Wallet set",
      body: truncateHash(summary.proof.wallet_set_id, 4, 4),
      detail: `${summary.circle.wallets_configured} wallets configured`,
    },
    {
      title: "Margin proof",
      body: `$${formatNumber(summary.margin.eth_l1_counterfactual_gas_usd, 2)} ETH L1 gas`,
      detail: `${formatNumber(summary.margin.eth_l1_overhead_multiple, 0)}x the value moved`,
    },
    {
      title: "Sample tx",
      body: truncateHash(summary.proof.sample_tx_hash, 10, 6),
      detail: "click to inspect on Arc Explorer",
      href: `https://testnet.arcscan.app/tx/${summary.proof.sample_tx_hash}`,
    },
  ];

  const arcJobs = summary.arc_jobs || [];
  const arcJobMarkup = arcJobs
    .map(
      (job) => `
        <article class="trade-card">
          <div class="trade-topline">
            <strong class="trade-symbol">${escapeHtml(job.task_id)} · ${escapeHtml(job.agent_id)}</strong>
            <span class="trade-pill" data-tone="${escapeHtml(job.status === "completed" ? "positive" : "warning")}">${escapeHtml(job.status)}</span>
          </div>
          <p class="mono">${escapeHtml(truncateHash(job.proof_hash, 10, 6))}</p>
          <div class="trade-meta">
            <span>${escapeHtml(job.metadata?.action || "proof")}</span>
            <span>${escapeHtml(formatDateTime(job.timestamp))}</span>
          </div>
        </article>
      `,
    )
    .join("");

  container.innerHTML = `
    <div class="connector-grid" style="margin-bottom: 1rem;">
      ${cards
        .map(
          (card) => `
            <article class="connector-card">
              <p class="eyebrow">${escapeHtml(card.title)}</p>
              <strong>${card.href ? `<a href="${escapeHtml(card.href)}" target="_blank" rel="noreferrer">${escapeHtml(card.body)}</a>` : escapeHtml(card.body)}</strong>
              <p>${escapeHtml(card.detail)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
    ${arcJobMarkup || ""}
  `;
}

async function loadBoard({ manual = false } = {}) {
  let summary;
  let usedFallback = false;
  try {
    summary = await fetchJson("/api/hackathon/summary");
  } catch (_error) {
    summary = FALLBACK_SUMMARY;
    usedFallback = true;
  }

  renderHero(summary);
  renderKpis(summary);
  renderCatalog(summary.catalog || []);
  renderGuardrails(summary.guardrails || FALLBACK_SUMMARY.guardrails);
  renderConnectors(summary);
  renderTransactions(summary.transactions || []);
  renderDemoJobs(summary.demo_jobs || []);
  renderArcProof(summary);

  if (usedFallback) {
    showStatus("API offline. Showing repo-backed fallback proof so the room stays presentation-ready.", "warning");
  } else if (manual) {
    showStatus(`Board refreshed at ${new Date().toLocaleTimeString()}.`, "success");
  } else {
    showStatus("", "info");
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    loadBoard().catch((_error) => {
      showStatus("Auto-refresh failed. Keeping the latest successful snapshot on screen.", "warning");
    });
  }, 60_000);
}

const refreshButton = document.getElementById("refresh-button");
if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadBoard({ manual: true }).catch((_error) => {
      showStatus("Could not refresh the operational room.", "error");
    });
  });
}

const docsButton = document.getElementById("open-docs-button");
if (docsButton) {
  docsButton.addEventListener("click", () => {
    window.open(`${API_BASE_URL}/docs`, "_blank", "noopener,noreferrer");
  });
}

loadBoard()
  .then(startAutoRefresh)
  .catch((_error) => {
    showStatus("Could not load the operational room.", "error");
  });
