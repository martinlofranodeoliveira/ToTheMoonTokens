const DEFAULT_API_BASE_URL = "";
const STORAGE_KEY = "ttm-marketplace-state-v5";
const VIDEO_SOURCE_WALLET = "research_03";
const FALLBACK_WALLETS = [
  { name: "research_00", address: "0xde618b260763a606e0380150d1338364f5ff3139" },
  { name: "research_01", address: "0x9a2b38ec283d3a51faa3095f0c0708c1b225462a" },
  { name: "research_02", address: "0x95140a42f10eb10551e076ed8d9a2ad8dcdb968d" },
  { name: "research_03", address: "0xbcdb0012b84dc6158c50b1e353b1627d2d4af8aa" },
  { name: "consumer_01", address: "0x28c83e915c791131678286977a42c6fe95da9a42" },
  { name: "consumer_02", address: "0xa82aa51fd19476a1dc37759b0fc41770f4a238d8" },
  { name: "auditor", address: "0x0201fdaa7b7298f351d8bc58cb045abe7089bb01" },
  { name: "treasury", address: "0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f" },
];

let refreshTimer = null;
let bannerTimer = null;

function resolveApiBaseUrl() {
  const meta = document.querySelector('meta[name="ttm-api-base-url"]');
  const fromMeta = meta && meta.getAttribute("content");
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.has("api") ? params.get("api") : null;
  const fromGlobal = typeof window.TTM_API_BASE_URL === "string" ? window.TTM_API_BASE_URL : null;

  for (const candidate of [fromQuery, fromGlobal, fromMeta, DEFAULT_API_BASE_URL]) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim();
      return normalized ? normalized.replace(/\/$/, "") : window.location.origin;
    }
  }

  return window.location.origin;
}

const API_BASE_URL = resolveApiBaseUrl();
const root = document.getElementById("app-root");

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
    treasury_address: "0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f",
    wallets: FALLBACK_WALLETS,
  },
  connectors: {
    settlement_network: "arc_testnet",
    wallet_provider: "circle_developer_controlled_wallets",
    wallet_mode: "manual_only",
    settlement_auth_mode: "manual",
    autonomous_payments_enabled: false,
    wallet_set_id: "e980936d-182e-50f6-bc6f-e54037777598",
    wallets_configured: 8,
    wallets_loaded: false,
    treasury_address: "0x80a2ab194e34c50e7d5ba836dbc40b9733559c2f",
    arc_rpc_url: "https://rpc.testnet.arc.network",
    metamask_ready: true,
    agent_chat_ready: false,
    agent_model: null,
    latency_ms: 0,
    reconnect_count: 0,
    last_error: null,
  },
  guardrails: {
    mode: "paper",
    can_submit_testnet_orders: false,
    can_submit_mainnet_orders: false,
    requires_manual_wallet_signature: true,
    settlement_auth_mode: "manual",
    autonomous_payments_enabled: false,
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

const ARTIFACT_PROFILES = {
  artifact_delivery_packet: {
    publisher: "research_00",
    score: 96,
    ttl: 42,
    badgeLabel: "execution receipt",
    note: "Reviewed execution receipt with unlock metadata.",
  },
  artifact_review_bundle: {
    publisher: "auditor",
    score: 92,
    ttl: 58,
    badgeLabel: "reviewed evidence",
    note: "Reviewer-approved evidence bundle with settlement checks.",
  },
  artifact_market_intel_brief: {
    publisher: "research_03",
    score: 89,
    ttl: 75,
    badgeLabel: "premium brief",
    note: "Premium machine brief released only after payment verification.",
  },
};

const state = {
  summary: FALLBACK_SUMMARY,
  demoJobs: FALLBACK_SUMMARY.demo_jobs.slice(),
  usedFallback: false,
  filters: {
    search: "",
    types: new Set(FALLBACK_SUMMARY.catalog.map((item) => item.type)),
    maxPrice: 0.01,
    underOneCentOnly: false,
  },
  market: loadMarketState(),
  ui: {
    route: "marketplace",
    modalArtifactId: null,
    creatingArtifactId: null,
    payingOrderId: null,
    verifyingOrderId: null,
    unlockingOrderId: null,
    banner: null,
    selectedAgentId: "research_00",
    agentComposer: "",
    agentChatOpen: false,
    agentSending: false,
  },
};

const VALID_ROUTES = new Set(["marketplace", "agents", "architecture", "about"]);

function resolveRoute(value) {
  const route = String(value || "")
    .replace(/^#\/?/, "")
    .trim()
    .toLowerCase();
  return VALID_ROUTES.has(route) ? route : "marketplace";
}

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

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    if (isExplorerTxHash(code)) {
      return `<a class="chat-inline-code chat-tx" href="${escapeHtml(txUrl(code))}" target="_blank" rel="noreferrer"><code>${code}</code>${icon("link", 10)}</a>`;
    }
    return `<code>${code}</code>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function normalizeAgentMessage(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+(\d+)\.\s+(\*\*|`|[A-Z])/g, "\n$1. $2")
    .replace(/\s+\*\s+(\*\*|`|[A-Z])/g, "\n* $1")
    .trim();
}

function renderMarkdownMessage(value) {
  const lines = normalizeAgentMessage(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let listType = null;
  let listItems = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }
    blocks.push(`<${listType}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (ordered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(renderInlineMarkdown(ordered[1]));
      continue;
    }
    if (unordered) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(renderInlineMarkdown(unordered[1]));
      continue;
    }
    flushList();
    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }
  flushList();

  return `<div class="chat-markdown">${blocks.join("")}</div>`;
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

function formatUsdc(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return `${number.toFixed(digits)} USDC`;
}

function formatPct(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return `${number.toFixed(digits)}%`;
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

function relativeTime(value) {
  if (!value) {
    return "just now";
  }
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return "just now";
  }
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 5) {
    return "just now";
  }
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function truncateHash(hash, head = 6, tail = 4) {
  if (!hash) {
    return "-";
  }
  const text = String(hash);
  return `${text.slice(0, 2 + head)}...${text.slice(-tail)}`;
}

function truncateMiddle(value, head = 8, tail = 6) {
  if (!value) {
    return "-";
  }
  const text = String(value);
  if (text.length <= head + tail + 3) {
    return text;
  }
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function humanizeWalletName(value) {
  return String(value || "buyer wallet").replaceAll("_", " ");
}

function walletInventory() {
  const wallets = Array.isArray(state.summary.circle?.wallets) ? state.summary.circle.wallets : [];
  return wallets.length ? wallets : FALLBACK_WALLETS;
}

function findWalletByName(name) {
  const target = String(name || "").trim().toLowerCase();
  if (!target) {
    return null;
  }
  return (
    walletInventory().find((wallet) => String(wallet.name || "").trim().toLowerCase() === target) || null
  );
}

function walletNameForAddress(address) {
  const normalized = String(address || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const wallet = walletInventory().find(
    (entry) => String(entry.address || "").trim().toLowerCase() === normalized,
  );
  return wallet?.name || null;
}

function recommendedVideoWallet() {
  return findWalletByName(VIDEO_SOURCE_WALLET) || findWalletByName("research_00") || null;
}

function isExplorerTxHash(txHash) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(txHash || "").trim());
}

function renderTxReference(txHash, head = 10, tail = 6, label = "Arc explorer hash") {
  if (!txHash) {
    return "";
  }
  const text = escapeHtml(truncateHash(txHash, head, tail));
  if (isExplorerTxHash(txHash)) {
    return `<a class="tx-pill" href="${escapeHtml(txUrl(txHash))}" target="_blank" rel="noreferrer">${text} ${icon("link", 10)}</a>`;
  }
  return `<span class="tx-pill" title="${escapeHtml(label)}">${text}</span>`;
}

function settlementAuthMode() {
  return (
    state.summary.connectors?.settlement_auth_mode ||
    state.summary.guardrails?.settlement_auth_mode ||
    "manual"
  );
}

function isProgrammaticSettlement() {
  return settlementAuthMode() === "programmatic";
}

function agentChatReady() {
  return !!state.summary.connectors?.agent_chat_ready;
}

function formatArtifactType(value) {
  return String(value || "artifact").replaceAll("_", " ");
}

function tierFromPrice(price) {
  const value = asNumber(price);
  if (value <= 0.001) {
    return "low";
  }
  if (value <= 0.005) {
    return "med";
  }
  return "high";
}

function tierPill(tier) {
  if (tier === "low") {
    return "pill-low";
  }
  if (tier === "med") {
    return "pill-med";
  }
  return "pill-high";
}

function scoreColor(score) {
  if (score >= 95) {
    return "rep-gold";
  }
  if (score >= 90) {
    return "rep-green";
  }
  if (score >= 80) {
    return "rep-blue";
  }
  return "rep-gray";
}

function hashString(value) {
  return Array.from(String(value)).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function avatarGradient(id) {
  const hue = hashString(id) % 360;
  return `linear-gradient(135deg, hsl(${hue} 78% 58%), hsl(${(hue + 48) % 360} 74% 50%))`;
}

function initialsFor(value) {
  const text = String(value || "??").replace(/[^a-zA-Z0-9]/g, "");
  return text.slice(0, 2).toUpperCase() || "??";
}

function syntheticAddressFor(value) {
  const chars = "0123456789abcdef";
  let seed = hashString(value);
  let result = "0x";
  for (let index = 0; index < 40; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    result += chars[seed % chars.length];
  }
  return result;
}

function txUrl(txHash) {
  return `https://testnet.arcscan.app/tx/${encodeURIComponent(txHash)}`;
}

function icon(name, size = 14) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  switch (name) {
    case "search":
      return `<svg ${common}><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`;
    case "link":
      return `<svg ${common}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1-1"></path></svg>`;
    case "x":
      return `<svg ${common}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    case "arrow-r":
      return `<svg ${common}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
    case "copy":
      return `<svg ${common}><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    case "github":
      return `<svg ${common}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`;
    case "check":
      return `<svg ${common}><path d="M20 6 9 17l-5-5"></path></svg>`;
    case "chat":
      return `<svg ${common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path></svg>`;
    default:
      return "";
  }
}

function sanitizeOrder(order) {
  if (!order || typeof order !== "object") {
    return null;
  }

  const paymentId = String(order.paymentId || order.payment_id || "");
  if (!paymentId) {
    return null;
  }

  const now = new Date().toISOString();
  const rawStatus = String(order.status || "CHECKOUT_READY").toLowerCase();
  let status = String(order.status || "CHECKOUT_READY");
  if (rawStatus === "pending") {
    status = "CHECKOUT_READY";
  } else if (rawStatus === "verified") {
    status = order.executed || order.download_url || order.downloadUrl ? "DELIVERED" : "SETTLED";
  } else if (rawStatus === "failed") {
    status = "FAILED";
  }
  return {
    paymentId,
    artifactId: String(order.artifactId || order.artifact_id || ""),
    artifactName: String(order.artifactName || order.artifact_name || "Artifact"),
    artifactType: String(order.artifactType || order.artifact_type || "delivery_packet"),
    amountUsd: asNumber(order.amountUsd ?? order.amount_usd),
    buyerAddress: String(order.buyerAddress || order.buyer_address || ""),
    depositAddress: String(order.depositAddress || order.deposit_address || ""),
    jobId: order.jobId ? String(order.jobId) : order.job_id ? String(order.job_id) : null,
    status,
    settlementStatus:
      order.settlementStatus || order.settlement_status
        ? String(order.settlementStatus || order.settlement_status)
        : null,
    reason: order.reason ? String(order.reason) : null,
    txHash: String(order.txHash || order.tx_hash || ""),
    downloadUrl: order.downloadUrl || order.download_url ? String(order.downloadUrl || order.download_url) : null,
    executionMessage:
      order.executionMessage || order.execution_message
        ? String(order.executionMessage || order.execution_message)
        : null,
    createdAt: String(order.createdAt || order.created_at || now),
    updatedAt: String(order.updatedAt || order.updated_at || now),
  };
}

function sanitizeChatTurn(turn) {
  if (!turn || typeof turn !== "object") {
    return null;
  }
  const role = String(turn.role || "").toLowerCase();
  const text = String(turn.text || "").trim();
  if (!text || (role !== "user" && role !== "assistant")) {
    return null;
  }
  return { role, text };
}

function loadMarketState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        buyerAddress: "",
        activeOrderId: null,
        orders: [],
        agentHistory: [],
        agentEvents: [],
      };
    }
    const parsed = JSON.parse(raw);
    const orders = (parsed.orders || []).map(sanitizeOrder).filter(Boolean);
    const agentHistory = (parsed.agentHistory || []).map(sanitizeChatTurn).filter(Boolean);
    const agentEvents = Array.isArray(parsed.agentEvents) ? parsed.agentEvents : [];
    return {
      buyerAddress: typeof parsed.buyerAddress === "string" ? parsed.buyerAddress : "",
      activeOrderId: typeof parsed.activeOrderId === "string" ? parsed.activeOrderId : null,
      orders,
      agentHistory,
      agentEvents,
    };
  } catch (_error) {
    return {
      buyerAddress: "",
      activeOrderId: null,
      orders: [],
      agentHistory: [],
      agentEvents: [],
    };
  }
}

function persistMarketState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        buyerAddress: state.market.buyerAddress,
        activeOrderId: state.market.activeOrderId,
        orders: state.market.orders,
        agentHistory: state.market.agentHistory,
        agentEvents: state.market.agentEvents,
      }),
    );
  } catch (_error) {
    // Ignore persistence errors.
  }
}

function mergeRemoteOrders(orders) {
  [...(orders || [])].reverse().forEach((order) => {
    upsertOrder(order);
  });
}

function getSortedOrders() {
  return [...state.market.orders].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function latestOrderForArtifact(artifactId) {
  return getSortedOrders().find((order) => order.artifactId === artifactId) || null;
}

function findOrderById(orderId) {
  return state.market.orders.find((order) => order.paymentId === orderId) || null;
}

function getActiveOrder() {
  if (state.market.activeOrderId) {
    const order = findOrderById(state.market.activeOrderId);
    if (order) {
      return order;
    }
  }
  const first = getSortedOrders()[0] || null;
  if (first) {
    state.market.activeOrderId = first.paymentId;
    persistMarketState();
  }
  return first;
}

function upsertOrder(nextOrder) {
  const sanitized = sanitizeOrder(nextOrder);
  if (!sanitized) {
    return;
  }
  const index = state.market.orders.findIndex((order) => order.paymentId === sanitized.paymentId);
  if (index === -1) {
    state.market.orders.unshift(sanitized);
  } else {
    state.market.orders[index] = {
      ...state.market.orders[index],
      ...sanitized,
    };
  }
  state.market.activeOrderId = sanitized.paymentId;
  persistMarketState();
}

function patchOrder(paymentId, patch) {
  const current = findOrderById(paymentId);
  if (!current) {
    return null;
  }
  const nextOrder = {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
  upsertOrder(nextOrder);
  return nextOrder;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch (_error) {
          return null;
        }
      })()
    : null;

  if (!response.ok) {
    const detail = payload?.detail || payload?.message || text || `Request failed: ${response.status}`;
    throw new Error(typeof detail === "string" ? detail : `Request failed: ${response.status}`);
  }

  return payload;
}

async function safePost(path) {
  try {
    return await fetchJson(path, { method: "POST" });
  } catch (_error) {
    return null;
  }
}

async function copyToClipboard(value, label) {
  if (!value) {
    showBanner(`No ${label} available to copy.`, "warn");
    return;
  }
  try {
    if (!window.isSecureContext || !navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(value);
    showBanner(`${label} copied to clipboard.`, "info");
  } catch (_error) {
    if (typeof window.prompt === "function") {
      window.prompt(`Copy the ${label} below:`, value);
      showBanner(`Clipboard access failed. Copy the ${label} from the prompt.`, "warn");
      return;
    }
    showBanner(`Clipboard access failed. Copy the ${label} manually.`, "warn");
  }
}

function showBanner(message, tone = "info", timeoutMs = 4500) {
  state.ui.banner = { message, tone };
  renderApp();
  if (bannerTimer) {
    window.clearTimeout(bannerTimer);
  }
  if (timeoutMs > 0) {
    bannerTimer = window.setTimeout(() => {
      state.ui.banner = null;
      renderApp();
    }, timeoutMs);
  }
}

function syncRouteFromLocation() {
  const nextRoute = resolveRoute(window.location.hash);
  state.ui.route = nextRoute;
  if (nextRoute !== "marketplace") {
    state.ui.modalArtifactId = null;
  }
}

function setRoute(route) {
  const nextRoute = resolveRoute(route);
  if (window.location.hash !== `#${nextRoute}`) {
    window.location.hash = nextRoute;
    return;
  }
  syncRouteFromLocation();
  renderApp();
}

function buildListings() {
  return (state.summary.catalog || []).map((item) => {
    const profile = ARTIFACT_PROFILES[item.id] || {
      publisher: "market",
      score: 88,
      ttl: 60,
      badgeLabel: formatArtifactType(item.type),
      note: item.description,
    };
    const latestOrder = latestOrderForArtifact(item.id);
    return {
      ...item,
      publisher: profile.publisher,
      score: profile.score,
      ttl: profile.ttl,
      badgeLabel: profile.badgeLabel,
      note: profile.note,
      tier: tierFromPrice(item.price_usd),
      latestOrder,
    };
  });
}

function getFilteredListings() {
  const listings = buildListings();
  return listings.filter((listing) => {
    const query = state.filters.search.trim().toLowerCase();
    const haystack = `${listing.name} ${listing.description} ${listing.publisher} ${listing.type}`.toLowerCase();
    if (query && !haystack.includes(query)) {
      return false;
    }
    if (!state.filters.types.has(listing.type)) {
      return false;
    }
    if (asNumber(listing.price_usd) > asNumber(state.filters.maxPrice)) {
      return false;
    }
    if (state.filters.underOneCentOnly && asNumber(listing.price_usd) >= 0.01) {
      return false;
    }
    return true;
  });
}

function buildSettlements() {
  const local = getSortedOrders()
    .filter((order) => isExplorerTxHash(order.txHash))
    .map((order) => {
      const listing = buildListings().find((item) => item.id === order.artifactId);
      return {
        id: `order-${order.paymentId}`,
        consumer: order.buyerAddress || "buyer",
        research: listing?.publisher || "treasury",
        amount: order.amountUsd,
        hash: order.txHash,
        ts: order.updatedAt,
        agoLabel: relativeTime(order.updatedAt),
      };
    });

  const proof = (state.summary.transactions || []).map((tx) => {
    return {
      id: `proof-${tx.seq}`,
      consumer: tx.from,
      research: tx.to,
      amount: asNumber(tx.amount_usdc),
      hash: tx.tx_hash,
      ts: tx.timestamp,
      agoLabel: relativeTime(tx.timestamp),
    };
  });

  const seen = new Set();
  return [...local, ...proof]
    .filter((item) => {
      if (!item.hash || seen.has(item.hash)) {
        return false;
      }
      seen.add(item.hash);
      return true;
    })
    .sort((left, right) => new Date(right.ts).getTime() - new Date(left.ts).getTime())
    .slice(0, 15);
}

function orderStateLabel(order) {
  switch (order?.status) {
    case "CHECKOUT_READY":
      return isProgrammaticSettlement() ? "Ready to auto-pay" : "Awaiting tx";
    case "SETTLED":
      return "Settlement verified";
    case "DELIVERED":
      return "Artifact unlocked";
    case "FAILED":
      return "Verification failed";
    default:
      return "Ready";
  }
}

function modalArtifact() {
  if (!state.ui.modalArtifactId) {
    return null;
  }
  return buildListings().find((listing) => listing.id === state.ui.modalArtifactId) || null;
}

function stepState(order, step) {
  if (!order) {
    return "pending";
  }

  if (step === "intent") {
    return "complete";
  }
  if (step === "route") {
    return order.depositAddress ? "complete" : "active";
  }
  if (step === "fund") {
    return order.txHash ? "complete" : "active";
  }
  if (step === "settle") {
    if (order.status === "FAILED") {
      return "failed";
    }
    if (order.status === "SETTLED" || order.status === "DELIVERED") {
      return "complete";
    }
    return order.txHash ? "active" : "pending";
  }
  if (step === "deliver") {
    if (order.status === "DELIVERED") {
      return "complete";
    }
    if (order.status === "SETTLED") {
      return "active";
    }
  }
  return "pending";
}

function renderStepper(order) {
  const labels = [
    { key: "intent", label: "Quote" },
    { key: "route", label: "Route" },
    { key: "fund", label: "Fund" },
    { key: "settle", label: "Settle" },
    { key: "deliver", label: "Deliver" },
  ];

  return `
    <div class="stepper">
      <div class="stepper-connectors">
        ${[0, 1, 2, 3]
          .map((index) => {
            const previous = stepState(order, labels[index].key);
            const next = stepState(order, labels[index + 1].key);
            const lineClass =
              previous === "complete" && (next === "complete" || next === "active")
                ? "done"
                : next === "active"
                  ? "active"
                  : "";
            return `<div class="line ${lineClass}"></div>`;
          })
          .join("")}
      </div>
      ${labels
        .map((item, index) => {
          const status = stepState(order, item.key);
          return `
            <div class="step ${status}">
              <div class="step-circle">${status === "complete" ? icon("check", 14) : String(index + 1).padStart(2, "0")}</div>
              <div class="step-label">${escapeHtml(item.label)}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function rolePillClass(role) {
  return (
    {
      research: "pill-blue",
      consumer: "pill-violet",
      auditor: "pill-green",
      treasury: "pill-gold",
    }[role] || "pill"
  );
}

function roleLabel(role) {
  return (
    {
      research: "Research",
      consumer: "Consumer",
      auditor: "Auditor",
      treasury: "Treasury",
    }[role] || "Agent"
  );
}

function getWalletAddress(name, fallbackId) {
  return findWalletByName(name)?.address || syntheticAddressFor(fallbackId || name);
}

function buildAgentModels() {
  const proof = state.summary.proof || FALLBACK_SUMMARY.proof;
  const transactions = state.summary.transactions || [];
  const totalMoved = asNumber(proof.total_usdc_moved);
  const buyerWallet = state.market.buyerAddress.trim();
  const buyerLabel = buyerWallet ? "buyer_wallet" : "consumer_01";
  const treasuryAddress =
    state.summary.circle?.treasury_address ||
    state.summary.connectors?.treasury_address ||
    getWalletAddress("treasury", "treasury");

  return [
    {
      id: "research_00",
      role: "research",
      address: getWalletAddress("research_00", "research_00"),
      balance: 0.214 + totalMoved / 3,
      reputation: 96,
      txCount: transactions.filter((tx) => tx.from === "research_00" || tx.to === "research_00").length || 26,
      flowLabel: "Revenue 24h",
      flowValue: totalMoved / 2 || 0.0315,
      flowDisplay: formatUsdc(totalMoved / 2 || 0.0315),
      note: "Publishes reviewed delivery packets and settlement-ready unlock metadata.",
      status: "Publishing live artifacts to the marketplace feed.",
    },
    {
      id: "research_03",
      role: "research",
      address: getWalletAddress("research_03", "research_03"),
      balance: 0.181,
      reputation: 89,
      txCount: transactions.filter((tx) => tx.from === "research_03" || tx.to === "research_03").length || 18,
      flowLabel: "Revenue 24h",
      flowValue: 0.018,
      flowDisplay: formatUsdc(0.018),
      note: "Owns the premium market intelligence brief unlocked after verified payment.",
      status: "Premium artifact pipeline online.",
    },
    {
      id: "auditor",
      role: "auditor",
      address: getWalletAddress("auditor", "auditor"),
      balance: 0.119,
      reputation: 92,
      txCount: transactions.filter((tx) => tx.from === "auditor" || tx.to === "auditor").length || 12,
      flowLabel: "Reviews 24h",
      flowValue: 14,
      flowDisplay: "14 approvals",
      note: "Verifies receipts, approves review bundles, and gates final delivery.",
      status: "Final settlement verification path healthy.",
    },
    {
      id: buyerLabel,
      role: "consumer",
      address: buyerWallet || getWalletAddress("consumer_01", "consumer_01"),
      balance: 1.247,
      reputation: 74,
      txCount: getSortedOrders().length || 7,
      flowLabel: "Spend 24h",
      flowValue: 0.016,
      flowDisplay: formatUsdc(0.016),
      note: "Buyer wallet funding intents on Arc and unlocking artifacts without subscription rails.",
      status: buyerWallet ? "Live buyer wallet connected." : "Ready to fund checkout intents.",
    },
    {
      id: "treasury",
      role: "treasury",
      address: treasuryAddress,
      balance: totalMoved,
      reputation: null,
      txCount: asNumber(proof.transactions_total) || 63,
      flowLabel: "Settled batch",
      flowValue: totalMoved,
      flowDisplay: formatUsdc(totalMoved),
      note: "Receives buyer funds and hands off to verification before artifact release.",
      status: state.summary.circle?.wallets_loaded ? "Wallet bootstrap complete." : "Wallet bootstrap pending.",
    },
  ];
}

function getSelectedAgent() {
  const agents = buildAgentModels();
  const selected = agents.find((agent) => agent.id === state.ui.selectedAgentId);
  if (selected) {
    return { agents, selected };
  }
  state.ui.selectedAgentId = agents[0]?.id || "research_00";
  return { agents, selected: agents[0] || null };
}

function sparkColorForRole(role) {
  if (role === "consumer") {
    return "var(--danger)";
  }
  if (role === "treasury") {
    return "var(--arc-blue)";
  }
  return "var(--circle-green)";
}

function buildSparklinePoints(agent) {
  const seed = hashString(agent.id);
  const base =
    agent.role === "consumer"
      ? 8
      : agent.role === "treasury"
        ? 12
        : 6;
  return Array.from({ length: 24 }, (_value, index) => {
    const drift = agent.role === "consumer" ? -index * 0.06 : index * 0.04;
    const wave = Math.sin(index * 0.6 + (seed % 7)) * 0.9;
    const noise = ((seed >> (index % 8)) & 7) / 10;
    return base + drift + wave + noise;
  });
}

function renderSparkline(points, color = "var(--arc-blue)") {
  const width = 280;
  const height = 64;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.0001, max - min);
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - 4 - ((point - min) / range) * (height - 8);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"></stop>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path d="${path} L ${width} ${height} L 0 ${height} Z" fill="url(#sparkGrad)"></path>
      <path d="${path}" stroke="${color}" stroke-width="1.5" fill="none"></path>
    </svg>
  `;
}

function renderActivityFeed(agent) {
  const rows = [];
  const orders = getSortedOrders();

  (state.summary.transactions || []).slice(0, 6).forEach((tx) => {
    const matchesAgent =
      agent.role === "treasury"
        ? tx.to === "treasury"
        : tx.from === agent.id || tx.to === agent.id;

    if (!matchesAgent) {
      return;
    }

    rows.push({
      pill: tx.to === "treasury" ? "pill-gold" : tx.from === agent.id ? "pill-blue" : "pill-green",
      label: tx.to === "treasury" ? "settlement" : tx.from === agent.id ? "outbound" : "receipt",
      description: `${tx.from} → ${tx.to}`,
      amount: `${formatNumber(tx.amount_usdc, 3)} USDC`,
      hash: tx.tx_hash,
      ago: relativeTime(tx.timestamp),
    });
  });

  if (agent.role === "consumer") {
    orders.slice(0, 4).forEach((order) => {
      rows.push({
        pill: order.status === "DELIVERED" ? "pill-green" : order.status === "FAILED" ? "pill-high" : "pill-violet",
        label: order.status.toLowerCase(),
        description: `${order.artifactName} · ${orderStateLabel(order)}`,
        amount: formatUsdc(order.amountUsd),
        hash: order.txHash || null,
        ago: relativeTime(order.updatedAt),
      });
    });
  }

  if (rows.length === 0) {
    rows.push({
      pill: rolePillClass(agent.role),
      label: "ready",
      description: agent.status,
      amount: agent.role === "treasury" ? formatUsdc(agent.balance) : agent.flowDisplay || formatUsdc(agent.flowValue),
      hash: state.summary.proof?.sample_tx_hash || null,
      ago: "just now",
    });
  }

  return rows.slice(0, 6);
}

function renderProofTransactions(limit = 4) {
  return (state.summary.transactions || [])
    .slice(0, limit)
    .map((tx) => {
      return `
        <div class="trade-row">
          <span class="seq">#${escapeHtml(String(tx.seq))}</span>
          <span class="path">
            <span class="agent">${escapeHtml(tx.from)}</span>
            <span class="arrow">${icon("arrow-r", 12)}</span>
            <span class="agent">${escapeHtml(tx.to)}</span>
          </span>
          <span class="amount">${escapeHtml(formatNumber(tx.amount_usdc, 3))} USDC</span>
          <a class="hash" href="${escapeHtml(txUrl(tx.tx_hash))}" target="_blank" rel="noreferrer">${escapeHtml(truncateHash(tx.tx_hash, 8, 6))}</a>
        </div>
      `;
    })
    .join("");
}

function renderChainStrip() {
  const summary = state.summary;
  return `
    <div class="chain-strip">
      <span class="row g6"><span class="dot"></span><strong>Arc Testnet</strong></span>
      <span class="sep">·</span>
      <span>Chain ID <strong>${escapeHtml(String(summary.arc.chain_id || 5042002))}</strong></span>
      <span class="sep">·</span>
      <span>${escapeHtml(String(summary.proof.transactions_total || 63))} onchain settlements</span>
      <div class="right">
        <span class="live-block">≤ $0.01 per action</span>
        <span>${escapeHtml(formatNumber(summary.proof.throughput_tx_per_min || 17.7, 1))} tx/min</span>
      </div>
    </div>
  `;
}

function renderTopNav() {
  const route = state.ui.route;
  const connectedAgent = route === "agents" ? state.ui.selectedAgentId : state.market.buyerAddress.trim() || "consumer_01";
  return `
    <div class="topnav">
      <a class="brand" href="/">
        <span class="brand-mark"></span>
        <span>TTM Agent Market</span>
      </a>
      <nav aria-label="Primary">
        <a href="/">Pitch</a>
        <a class="${route === "marketplace" ? "active" : ""}" href="#marketplace" data-route="marketplace">Marketplace</a>
        <a class="${route === "agents" ? "active" : ""}" href="#agents" data-route="agents">Agents</a>
        <a class="${route === "architecture" ? "active" : ""}" href="#architecture" data-route="architecture">Architecture</a>
        <a class="${route === "about" ? "active" : ""}" href="#about" data-route="about">About</a>
        <a href="/pitch-video.html">90s Deck</a>
        <a href="/api/hackathon/summary" target="_blank" rel="noreferrer">Proof JSON</a>
        <a href="/docs" target="_blank" rel="noreferrer">Swagger</a>
        <a href="https://github.com/martinlofranodeoliveira/ToTheMoonTokens" target="_blank" rel="noreferrer">${icon("github", 12)} GitHub</a>
      </nav>
      <div class="right">
        <span class="live"><span class="dot"></span>Connected</span>
        <span class="testnet-badge">Arc Testnet</span>
        <div class="row g6" style="padding-left: 8px; border-left: 1px solid var(--border)">
          ${renderAvatar(connectedAgent, "sm")}
          <span class="mono-s t2">${escapeHtml(truncateMiddle(connectedAgent, 8, 4))}</span>
        </div>
      </div>
    </div>
  `;
}

function renderAvatar(id, size = "") {
  const sizeClass = size === "sm" ? "avatar-sm" : size === "lg" ? "avatar-lg" : size === "xl" ? "avatar-xl" : "";
  return `<span class="avatar ${sizeClass}" style="background:${escapeHtml(avatarGradient(id))}">${escapeHtml(initialsFor(id))}</span>`;
}

function renderFilterColumn(listings) {
  const types = Array.from(new Set((state.summary.catalog || []).map((item) => item.type)));
  const activeOrder = getActiveOrder();

  return `
    <aside class="col-filter">
      <div class="col g16">
        <div class="col g8">
          <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Search</label>
          <div style="position: relative;">
            <input
              class="search"
              style="padding-left: 30px;"
              placeholder="Artifact, publisher, type"
              data-field="search"
              value="${escapeHtml(state.filters.search)}"
            />
            <div style="position: absolute; left: 10px; top: 11px; pointer-events: none; color: var(--text-3);">${icon("search", 12)}</div>
          </div>
        </div>

        <div class="col g8">
          <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Artifact type</label>
          <div>
            ${types
              .map((type) => {
                return `
                  <label class="check-row">
                    <input type="checkbox" data-type-filter="${escapeHtml(type)}" ${state.filters.types.has(type) ? "checked" : ""} />
                    <span class="mono-s">${escapeHtml(formatArtifactType(type))}</span>
                  </label>
                `;
              })
              .join("")}
          </div>
        </div>

        <div class="col g8">
          <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Max price (USDC)</label>
          <input type="range" min="0.001" max="0.01" step="0.001" value="${escapeHtml(String(state.filters.maxPrice))}" data-field="max-price" style="accent-color: var(--arc-blue);" />
          <div class="row between">
            <span class="mono-s t3">0.001</span>
            <span class="mono-s">${escapeHtml(formatNumber(state.filters.maxPrice, 3))}</span>
          </div>
        </div>

        <label class="check-row">
          <input type="checkbox" data-field="under-one-cent" ${state.filters.underOneCentOnly ? "checked" : ""} />
          <span>Only sub-cent artifacts (&lt; $0.01)</span>
        </label>

        <div class="col g8">
          <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Buyer wallet</label>
          <input
            class="input"
            placeholder="0xBuyerAddress"
            data-field="buyer-address"
            value="${escapeHtml(state.market.buyerAddress)}"
          />
        </div>

        <button class="btn btn-ghost" style="width: 100%; justify-content: center;" data-action="clear-filters">
          Clear filters
        </button>

        <div class="card card-pad">
          <div class="sect-head" style="margin-bottom: 8px;">
            <h3>Live proof</h3>
            <span class="live"><span class="dot"></span>Batch</span>
          </div>
          <div class="col g8">
            <div class="row between">
              <span class="mono-s t3">Transfers</span>
              <span class="mono-s">${escapeHtml(String(state.summary.proof.transactions_total))}</span>
            </div>
            <div class="row between">
              <span class="mono-s t3">Throughput</span>
              <span class="mono-s">${escapeHtml(formatNumber(state.summary.proof.throughput_tx_per_min, 1))} tx/min</span>
            </div>
            <div class="row between">
              <span class="mono-s t3">Margin</span>
              <span class="mono-s">$${escapeHtml(formatNumber(state.summary.margin.eth_l1_counterfactual_gas_usd, 2))} on ETH L1</span>
            </div>
            <div class="row between">
              <span class="mono-s t3">Wallets</span>
              <span class="mono-s">${escapeHtml(String(state.summary.circle.wallets_configured))} configured</span>
            </div>
            <div class="row between">
              <span class="mono-s t3">Settlement mode</span>
              <span class="mono-s">${escapeHtml(settlementAuthMode())}</span>
            </div>
            <div class="row between">
              <span class="mono-s t3">Agent chat</span>
              <span class="mono-s">${agentChatReady() ? "ready" : "offline"}</span>
            </div>
          </div>
        </div>

        <div class="card card-pad">
          <div class="sect-head" style="margin-bottom: 8px;">
            <h3>${activeOrder ? "Active checkout" : "Ready to buy"}</h3>
          </div>
          ${
            activeOrder
              ? `
                <div class="col g8">
                  <div class="mono-s t3">Artifact</div>
                  <div>${escapeHtml(activeOrder.artifactName)}</div>
                  <div class="mono-s t3">State</div>
                  <div>${escapeHtml(orderStateLabel(activeOrder))}</div>
                  <div class="mono-s t3">Treasury route</div>
                  <div class="mono-s">${escapeHtml(truncateMiddle(activeOrder.depositAddress, 10, 6))}</div>
                  ${
                    activeOrder.txHash
                      ? renderTxReference(activeOrder.txHash, 10, 6, "Settlement receipt")
                      : `<div class="mono-s t2">Awaiting buyer tx hash.</div>`
                  }
                  <button class="btn btn-secondary" style="width: 100%; justify-content: center;" data-select-order="${escapeHtml(activeOrder.paymentId)}">
                    Open checkout
                  </button>
                </div>
              `
              : `
                <div class="col g8">
                  <div class="t2" style="font-size: 12px;">
                    Pick any artifact in the live feed to open the same modal flow from the prototype, now wired to real payment intents and Arc settlement verification.
                  </div>
                  <button class="btn btn-secondary" style="width: 100%; justify-content: center;" data-action="open-first-artifact">
                    See the marketplace live ${icon("arrow-r", 12)}
                  </button>
                </div>
              `
          }
        </div>
      </div>
    </aside>
  `;
}

function renderListingCard(listing) {
  const latestOrder = listing.latestOrder;
  const actionLabel = latestOrder ? "Open checkout" : "Subscribe & pay";
  const statusText = latestOrder ? orderStateLabel(latestOrder) : "Verify tx";
  const profileColor = latestOrder?.status === "DELIVERED" ? "var(--circle-green)" : latestOrder?.status === "FAILED" ? "var(--danger)" : "var(--text-2)";

  return `
    <div class="signal">
      <div class="col g4">
        <div class="sym">${escapeHtml(listing.name)}</div>
        <div class="row g6">
          <span class="pill pill-blue">${escapeHtml(listing.badgeLabel || formatArtifactType(listing.type))}</span>
          <span class="pill ${escapeHtml(tierPill(listing.tier))}">${escapeHtml(listing.tier)}</span>
        </div>
      </div>
      <div class="score-cell">
        <span class="rep-badge ${escapeHtml(scoreColor(listing.score))}">${escapeHtml(String(listing.score))}</span>
      </div>
      <div class="col g4">
        <div class="mono-s t3">checkout</div>
        <div class="mono-s" style="color:${escapeHtml(profileColor)};">${escapeHtml(statusText)}</div>
      </div>
      <div class="pub">
        ${renderAvatar(listing.publisher, "sm")}
        <span class="pub-name mono-s">${escapeHtml(listing.publisher)}</span>
      </div>
      <div class="actions">
        <div class="price-pill">${escapeHtml(formatNumber(listing.price_usd, 3))} <span class="t3">USDC</span></div>
        <button class="btn ${latestOrder ? "btn-secondary" : "btn-primary"}" data-open-artifact="${escapeHtml(listing.id)}">${escapeHtml(actionLabel)}</button>
      </div>
    </div>
  `;
}

function renderMainColumn(listings) {
  const programmatic = isProgrammaticSettlement();
  return `
    <main class="col-main">
      ${renderBanner()}
      <div class="card card-pad" style="margin-bottom: 16px;">
        <div class="row between" style="margin-bottom: 10px;">
          <div class="sect-head" style="margin-bottom: 0;">
            <h3>Live marketplace</h3>
            <span class="live"><span class="dot"></span>Arc + Circle</span>
          </div>
          <button class="btn btn-ghost" style="height: 30px;" data-action="refresh-market">Refresh market</button>
        </div>
        <div class="t2" style="font-size: 13px;">
          ${
            programmatic
              ? "Real-Time Micro-Commerce Flow. Buyers or the in-app agent create a priced checkout, the backend submits the Circle dev-controlled transfer, Arc verifies the tx hash, and the artifact unlocks on the same marketplace surface."
              : "Real-Time Micro-Commerce Flow. Buyers request a priced artifact, fund treasury in USDC, paste the Arc tx hash, verify settlement, and unlock delivery without leaving the marketplace surface."
          }
        </div>
      </div>
      <div class="row between" style="margin-bottom: 16px;">
        <div class="sect-head" style="margin-bottom: 0;">
          <h3>Live artifacts</h3>
          <span class="live"><span class="dot"></span>Streaming proof</span>
          <span class="count">${escapeHtml(String(listings.length))} active</span>
        </div>
        <div class="row g8">
          <button class="btn btn-ghost" style="height: 30px;">${icon("search", 12)} Sort: newest</button>
        </div>
      </div>

      ${
        listings.length === 0
          ? `
            <div class="empty">
              <div class="glyph">${icon("search", 22)}</div>
              <h4>No artifacts match your filters</h4>
              <p>Try loosening the type or price filters to bring the marketplace cards back into view.</p>
            </div>
          `
          : `
            <div class="col g8">
              ${listings.map((listing) => renderListingCard(listing)).join("")}
            </div>
          `
      }
    </main>
  `;
}

function summarizeAgentEvent(event) {
  const response = event?.response || {};
  if (response.error) {
    return String(response.error);
  }
  if (response.message) {
    return String(response.message);
  }
  if (response.result?.status) {
    const txLabel = response.result.tx_hash ? ` · ${truncateHash(response.result.tx_hash, 8, 6)}` : "";
    return `${response.result.status}${txLabel}`;
  }
  if (response.payment?.artifact_name) {
    return `${response.payment.artifact_name} · ${response.payment.status}`;
  }
  if (Array.isArray(response.artifacts)) {
    return `${response.artifacts.length} artifacts loaded`;
  }
  if (Array.isArray(response.orders)) {
    return `${response.orders.length} tracked orders`;
  }
  return "completed";
}

function txHashFromAgentEvent(event) {
  const response = event?.response || {};
  const candidates = [
    response.result?.tx_hash,
    response.result?.txHash,
    response.payment?.tx_hash,
    response.payment?.txHash,
    response.payment?.result?.tx_hash,
    response.payment?.result?.txHash,
  ];
  return candidates.find((candidate) => isExplorerTxHash(candidate)) || null;
}

function latestAgentProof() {
  const events = state.market.agentEvents || [];
  for (const event of [...events].reverse()) {
    const toolName = String(event?.name || "");
    if (toolName !== "pay_artifact" && toolName !== "unlock_artifact") {
      continue;
    }
    const txHash = txHashFromAgentEvent(event);
    if (txHash) {
      const response = event?.response || {};
      const matchingOrder = getSortedOrders().find((order) => order.txHash === txHash);
      return {
        artifactName:
          response.payment?.artifact_name ||
          response.payment?.artifactName ||
          matchingOrder?.artifactName ||
          "Paid artifact",
        paymentId:
          response.payment?.payment_id ||
          response.payment?.paymentId ||
          matchingOrder?.paymentId ||
          null,
        downloadUrl:
          response.payment?.download_url ||
          response.payment?.downloadUrl ||
          matchingOrder?.downloadUrl ||
          null,
        txHash,
      };
    }
  }
  return null;
}

function renderAgentProofCard() {
  const proof = latestAgentProof();
  if (!proof) {
    return "";
  }
  return `
    <div class="agent-proof-card">
      <div class="agent-proof-main">
        <div class="agent-proof-icon">${icon("check", 16)}</div>
        <div class="agent-proof-copy">
          <span class="agent-proof-label">Arc settlement proof</span>
          <strong>${escapeHtml(proof.artifactName)} unlocked</strong>
          <span class="agent-proof-hash">${renderTxReference(proof.txHash, 10, 8, "Verified Arc transaction")}</span>
        </div>
      </div>
      <div class="agent-proof-actions">
        <button class="btn btn-primary" data-action="open-tx" data-tx-hash="${escapeHtml(proof.txHash)}">${icon("link", 13)} Open Arcscan</button>
        ${
          proof.downloadUrl
            ? `<a class="btn btn-secondary" href="${escapeHtml(proof.downloadUrl)}" target="_blank" rel="noreferrer">Download artifact</a>`
            : ""
        }
      </div>
    </div>
  `;
}

function formatToolName(name) {
  return String(name || "tool").replaceAll("_", " ");
}

function renderAgentEventSummary(event) {
  const response = event?.response || {};
  if (response.error) {
    return renderInlineMarkdown(response.error);
  }
  const txHash = txHashFromAgentEvent(event);
  if (response.result?.status) {
    return `
      <span>${escapeHtml(response.result.status)}</span>
      ${txHash ? `<span class="tool-event-proof">${renderTxReference(txHash, 8, 6, "Tool transaction")}</span>` : ""}
    `;
  }
  if (response.payment?.artifact_name) {
    return `
      <span>${escapeHtml(response.payment.artifact_name)} · ${escapeHtml(response.payment.status || "completed")}</span>
      ${txHash ? `<span class="tool-event-proof">${renderTxReference(txHash, 8, 6, "Tool transaction")}</span>` : ""}
    `;
  }
  return renderInlineMarkdown(summarizeAgentEvent(event));
}

function toolEventTone(event) {
  const response = event?.response || {};
  if (response.error) {
    return "tool-error";
  }
  const status = String(
    response.result?.status ||
      response.payment?.status ||
      response.payment?.settlement_status ||
      response.result?.settlement_status ||
      "",
  ).toLowerCase();
  if (["verified", "delivered", "settled", "complete", "completed"].some((value) => status.includes(value))) {
    return "tool-success";
  }
  if (["pending", "checkout", "created"].some((value) => status.includes(value))) {
    return "tool-pending";
  }
  return "tool-info";
}

function renderAgentConsole({ floating = false } = {}) {
  const history = state.market.agentHistory || [];
  const events = state.market.agentEvents || [];
  const ready = agentChatReady();
  const programmatic = isProgrammaticSettlement();
  const intro = programmatic
    ? "Ask the agent to buy an artifact and it will create the checkout, submit the Circle payment, and unlock delivery after Arc verification."
    : "Ask the agent to prepare a checkout. Manual funding is still required in the current mode.";
  const placeholder = programmatic
    ? "Buy the Delivery Packet and unlock it."
    : "Create a checkout for the Delivery Packet.";
  const primaryPrompt = programmatic
    ? "Buy the Delivery Packet and unlock it."
    : "Create a checkout for the Delivery Packet.";
  const secondaryPrompt = programmatic
    ? "Buy the Review Bundle and unlock it."
    : "Create a checkout for the Review Bundle.";
  const outerClass = floating ? "agent-console agent-console-panel" : "card card-pad agent-console";
  const outerStyle = floating ? "" : ' style="margin-bottom: 18px;"';

  return `
    <div class="${outerClass}"${outerStyle}>
      <div class="row between agent-console-head">
        <div class="sect-head" style="margin-bottom: 0;">
          <h3>Agent chat</h3>
          <span class="live"><span class="dot"></span>${ready ? "Gemini live" : "offline"}</span>
        </div>
        <div class="row g8" style="align-items: center;">
          <span class="pill ${programmatic ? "pill-green" : "pill-gold"}">${escapeHtml(settlementAuthMode())}</span>
          ${
            state.summary.connectors?.agent_model
              ? `<span class="mono-s t3">${escapeHtml(state.summary.connectors.agent_model)}</span>`
              : ""
          }
          ${floating ? `<button class="btn btn-ghost floating-agent-close" data-action="close-agent-chat" aria-label="Close agent chat">${icon("x", 14)}</button>` : ""}
        </div>
      </div>

      <p class="section-copy" style="margin-top: 10px; margin-bottom: 14px;">${escapeHtml(intro)}</p>

      <div class="chat-log">
        ${
          history.length
            ? history
                .slice(-8)
                .map((turn) => {
                  return `
                    <div class="chat-bubble ${turn.role === "user" ? "chat-user" : "chat-assistant"}">
                      <div class="chat-bubble-head">
                        <span class="chat-speaker">${turn.role === "user" ? "You" : "Agent"}</span>
                        ${turn.role === "assistant" ? `<span class="chat-model">Gemini</span>` : ""}
                      </div>
                      <div class="chat-content">${turn.role === "user" ? escapeHtml(turn.text) : renderMarkdownMessage(turn.text)}</div>
                    </div>
                  `;
                })
                .join("")
            : `
              <div class="chat-bubble chat-assistant">
                <div class="chat-bubble-head">
                  <span class="chat-speaker">Agent</span>
                  <span class="chat-model">Gemini</span>
                </div>
                <div class="chat-content">${renderMarkdownMessage(programmatic ? "I can buy one of the live artifacts for you end-to-end in the current mode." : "I can prepare the checkout and explain the manual settlement step in the current mode.")}</div>
              </div>
            `
        }
      </div>

      ${renderAgentProofCard()}

      ${
        events.length
          ? `
            <div class="tool-events">
              <div class="mono-s t3" style="margin-bottom: 8px;">Last agent actions</div>
              ${events
                .slice(-4)
                .map((event) => {
                  return `
                    <div class="tool-event ${toolEventTone(event)}">
                      <span class="tool-dot"></span>
                      <div class="tool-event-body">
                        <span class="tool-event-title">${escapeHtml(formatToolName(event.name))}</span>
                        <span class="tool-event-summary">${renderAgentEventSummary(event)}</span>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : ""
      }

      <div class="row g8" style="margin-top: 12px; flex-wrap: wrap;">
        <button class="btn btn-ghost" data-action="agent-prompt" data-prompt="What artifacts can you buy right now?">What can you buy?</button>
        <button class="btn btn-ghost" data-action="agent-prompt" data-prompt="${escapeHtml(primaryPrompt)}">Buy Delivery Packet</button>
        <button class="btn btn-ghost" data-action="agent-prompt" data-prompt="${escapeHtml(secondaryPrompt)}">Buy Review Bundle</button>
      </div>

      <div class="row g8 agent-compose">
        <textarea
          id="agent-composer"
          class="input agent-input"
          rows="3"
          data-field="agent-composer"
          placeholder="${escapeHtml(placeholder)}"
        >${escapeHtml(state.ui.agentComposer)}</textarea>
        <button class="btn btn-primary" data-action="send-agent-message">${state.ui.agentSending ? "Thinking..." : "Send"}</button>
      </div>

      ${
        ready
          ? ""
          : `<div class="banner warn" style="margin-top: 12px;">Set <code>GEMINI_API_KEY</code> to enable the in-app agent chat.</div>`
      }
    </div>
  `;
}

function renderFloatingAgentChat() {
  const open = state.ui.agentChatOpen;
  const ready = agentChatReady();
  const hasActivity = (state.market.agentHistory || []).length > 0 || (state.market.agentEvents || []).length > 0;

  return `
    <div class="floating-agent-chat ${open ? "is-open" : ""}">
      ${open ? renderAgentConsole({ floating: true }) : ""}
      <button
        class="floating-agent-button"
        data-action="toggle-agent-chat"
        aria-label="${open ? "Close agent chat" : "Open agent chat"}"
        aria-expanded="${open ? "true" : "false"}"
      >
        ${icon(open ? "x" : "chat", 22)}
        ${ready ? `<span class="floating-agent-status ${hasActivity ? "has-activity" : ""}"></span>` : ""}
      </button>
    </div>
  `;
}

function renderSettlementItem(item) {
  return `
    <div class="settle-item">
      <div class="flow">
        ${renderAvatar(item.consumer, "sm")}
        <span class="arrow">${icon("arrow-r", 12)}</span>
        ${renderAvatar(item.research, "sm")}
      </div>
      <div class="meta">
        <div class="amt">+${escapeHtml(formatNumber(item.amount, 3))} USDC</div>
        ${renderTxReference(item.hash, 10, 6, "Settlement reference")}
      </div>
      <div class="ts">${escapeHtml(item.agoLabel)}</div>
    </div>
  `;
}

function renderOrdersCard() {
  const orders = getSortedOrders();
  return `
    <div class="card card-pad" style="margin-top: 14px;">
      <div class="sect-head">
        <h3>Active orders</h3>
        <span class="count">${escapeHtml(String(orders.length))} tracked</span>
      </div>
      ${
        orders.length === 0
          ? `
            <div class="t2" style="font-size: 12px; margin-bottom: 12px;">
              Checkout history from this browser session appears here after the first purchase flow starts.
            </div>
          `
          : `
            <div class="col g8">
              ${orders
                .slice(0, 4)
                .map(
                  (order) => `
                    <button class="order-item" data-select-order="${escapeHtml(order.paymentId)}">
                      <span class="mono-s">${escapeHtml(order.artifactName)}</span>
                      <span class="mono-s t2">${escapeHtml(orderStateLabel(order))}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          `
      }
      <button class="btn btn-ghost" style="width: 100%; justify-content: center; margin-top: 12px;" data-action="inspect-payment-flow">
        Inspect payment flow ${icon("arrow-r", 12)}
      </button>
    </div>
  `;
}

function renderRightColumn() {
  const settlements = buildSettlements();
  const totalAmount = settlements.reduce((sum, item) => sum + asNumber(item.amount), 0);
  return `
    <aside class="col-right">
      <div class="sect-head">
        <h3>Settlements</h3>
        <span class="live"><span class="dot"></span>Live</span>
      </div>

      <div class="card card-pad" style="margin-bottom: 14px; padding: 14px;">
        <div class="row between" style="margin-bottom: 8px;">
          <span class="mono-s t3">LAST BATCH</span>
          <span class="mono-s t2">${escapeHtml(String(state.summary.proof.transactions_total))} txs</span>
        </div>
        <div class="row between">
          <div class="col g4">
            <span class="mono-s t3">Total</span>
            <span class="mono" style="font-size: 15px; color: var(--circle-green);">${escapeHtml(formatNumber(totalAmount, 3))} USDC</span>
          </div>
          <div class="col g4">
            <span class="mono-s t3">Avg finality</span>
            <span class="mono" style="font-size: 15px;">${escapeHtml(formatNumber(state.summary.proof.latency_p50_ms / 1000, 1))}<span class="t3">s</span></span>
          </div>
        </div>
      </div>

      <div class="col">
        ${settlements.map((item) => renderSettlementItem(item)).join("")}
      </div>

      ${renderOrdersCard()}
    </aside>
  `;
}

function renderMarketplacePage(listings) {
  return `
    <div class="layout-3col">
      ${renderFilterColumn(listings)}
      ${renderMainColumn(listings)}
      ${renderRightColumn()}
    </div>
  `;
}

function renderAgentsPage() {
  const { agents, selected } = getSelectedAgent();
  if (!selected) {
    return "";
  }

  const activities = renderActivityFeed(selected);
  const proof = state.summary.proof || FALLBACK_SUMMARY.proof;
  const selectedSpark = renderSparkline(buildSparklinePoints(selected), sparkColorForRole(selected.role));

  const roleDetail =
    selected.role === "research"
      ? `
        <div class="col g8">
          <div class="row between"><span class="mono-s t3">Revenue path</span><span class="mono-s">${escapeHtml(formatUsdc(selected.flowValue))}</span></div>
          <div class="row between"><span class="mono-s t3">Artifact pricing</span><span class="mono-s">0.001 / 0.005 / 0.010</span></div>
          <div class="row between"><span class="mono-s t3">Current role</span><span class="mono-s">${escapeHtml(selected.status)}</span></div>
        </div>
      `
      : selected.role === "consumer"
        ? `
          <div class="col g8">
            <div class="row between"><span class="mono-s t3">Last checkout</span><span class="mono-s">${escapeHtml(getSortedOrders()[0]?.artifactName || "Awaiting first purchase")}</span></div>
            <div class="row between"><span class="mono-s t3">Funding mode</span><span class="mono-s">${escapeHtml(isProgrammaticSettlement() ? "Circle dev-controlled backend" : "Circle Console or Arc wallet")}</span></div>
            <div class="row between"><span class="mono-s t3">Buyer address</span><span class="mono-s">${escapeHtml(truncateMiddle(selected.address, 8, 6))}</span></div>
          </div>
        `
        : selected.role === "auditor"
          ? `
            <div class="col g8">
              <div class="row between"><span class="mono-s t3">Verification step</span><span class="mono-s">Receipt + settlement proof</span></div>
              <div class="row between"><span class="mono-s t3">Demo jobs</span><span class="mono-s">${escapeHtml(String(state.demoJobs.length || 0))} tracked</span></div>
              <div class="row between"><span class="mono-s t3">Unlock gate</span><span class="mono-s">${escapeHtml(isProgrammaticSettlement() ? "Backend unlock after payment" : "Manual approval required")}</span></div>
            </div>
          `
          : `
            <div class="col g8">
              <div class="row between"><span class="mono-s t3">Treasury route</span><span class="mono-s">${escapeHtml(truncateMiddle(selected.address, 8, 6))}</span></div>
              <div class="row between"><span class="mono-s t3">Wallets loaded</span><span class="mono-s">${state.summary.circle?.wallets_loaded ? "yes" : "no"}</span></div>
              <div class="row between"><span class="mono-s t3">Batch value</span><span class="mono-s">${escapeHtml(formatUsdc(proof.total_usdc_moved))}</span></div>
            </div>
          `;

  return `
    <main style="padding: 28px 32px 64px; max-width: 1240px; margin: 0 auto;">
      <div class="row g8" style="margin-bottom: 24px; overflow-x: auto; padding: 4px 0;">
        ${agents
          .map((agent) => {
            const active = agent.id === selected.id;
            return `
              <button
                class="btn ${active ? "btn-secondary" : "btn-ghost"}"
                data-select-agent="${escapeHtml(agent.id)}"
                style="${active ? "border-color: var(--arc-blue); color: var(--text);" : "color: var(--text-2);"}"
              >
                ${renderAvatar(agent.id, "sm")}
                <span class="mono-s">${escapeHtml(agent.id)}</span>
              </button>
            `;
          })
          .join("")}
      </div>

      <div class="card card-pad" style="margin-bottom: 20px;">
        <div class="row g16">
          ${renderAvatar(selected.id, "xl")}
          <div class="col g8" style="flex: 1;">
            <div class="row g10">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">${escapeHtml(selected.id)}</h1>
              <span class="pill ${escapeHtml(rolePillClass(selected.role))}">${escapeHtml(roleLabel(selected.role))}</span>
              <span class="live"><span class="dot"></span>Active</span>
            </div>
            <div class="row g12 mono-s t2" style="flex-wrap: wrap;">
              <span class="row g6">${icon("copy", 11)}<span class="mono">${escapeHtml(truncateMiddle(selected.address, 10, 8))}</span></span>
              <span class="t3">·</span>
              <span>${escapeHtml(selected.status)}</span>
              <span class="t3">·</span>
              <span>${escapeHtml(String(selected.txCount))} tx observed</span>
            </div>
            <p class="section-copy" style="max-width: 780px;">${escapeHtml(selected.note)}</p>
          </div>
          <button class="btn btn-secondary" data-route="marketplace">Open marketplace ${icon("arrow-r", 12)}</button>
        </div>
      </div>

      <div class="grid-2" style="gap: 20px;">
        <div class="card card-pad">
          <div class="row between" style="margin-bottom: 14px;">
            <span class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Balance &amp; flow</span>
            <span class="mono-s t3">24h</span>
          </div>
          <div class="balance">
            <div class="big">
              <span>${escapeHtml(formatUsdc(selected.balance, 4).replace(" USDC", ""))}</span>
              <span class="ccy">USDC</span>
            </div>
            <div class="sub">${escapeHtml(selected.flowLabel)} · ${escapeHtml(selected.flowDisplay || (typeof selected.flowValue === "number" ? formatUsdc(selected.flowValue) : String(selected.flowValue)))}</div>
          </div>
          <div class="row g16" style="margin-top: 14px; margin-bottom: 14px; flex-wrap: wrap;">
            <div class="col g4"><span class="mono-s t3">Role</span><span class="mono">${escapeHtml(roleLabel(selected.role))}</span></div>
            <div class="col g4"><span class="mono-s t3">Observed txs</span><span class="mono">${escapeHtml(String(selected.txCount))}</span></div>
            <div class="col g4"><span class="mono-s t3">Finality</span><span class="mono">${escapeHtml(formatNumber(proof.latency_p50_ms / 1000, 1))}s</span></div>
          </div>
          ${selectedSpark}
        </div>

        <div class="card card-pad">
          <div class="row between" style="margin-bottom: 18px;">
            <span class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">${selected.role === "treasury" ? "Wallet health" : "Reputation"}</span>
            <span class="mono-s t3">${selected.role === "treasury" ? "Circle wallets" : "score 0-100"}</span>
          </div>
          ${
            selected.reputation !== null
              ? `
                <div class="row g24" style="align-items: center;">
                  <div class="col g8" style="align-items: center;">
                    <span class="rep-badge rep-badge-lg ${escapeHtml(scoreColor(selected.reputation))}">${escapeHtml(String(selected.reputation))}</span>
                    <span class="mono-s t3">overall</span>
                  </div>
                  <div class="col g8" style="flex: 1;">
                    <div class="row between"><span class="mono-s t3">Settlement readiness</span><span class="mono-s">${escapeHtml(String(Math.min(99, selected.reputation + 1)))} / 100</span></div>
                    <div class="row between"><span class="mono-s t3">Artifact quality</span><span class="mono-s">${escapeHtml(String(Math.max(70, selected.reputation - 4)))} / 100</span></div>
                    <div class="row between"><span class="mono-s t3">Response latency</span><span class="mono-s">${escapeHtml(formatNumber(proof.latency_p50_ms, 0))} ms</span></div>
                  </div>
                </div>
              `
              : `
                <div class="col g8">
                  <div class="row between"><span class="mono-s t3">Wallet provider</span><span class="mono-s">${escapeHtml(state.summary.connectors?.wallet_provider || "circle")}</span></div>
                  <div class="row between"><span class="mono-s t3">Wallet set</span><span class="mono-s">${escapeHtml(truncateMiddle(state.summary.circle?.wallet_set_id || "", 10, 6))}</span></div>
                  <div class="row between"><span class="mono-s t3">Wallets configured</span><span class="mono-s">${escapeHtml(String(state.summary.circle?.wallets_configured || 0))}</span></div>
                  <div class="row between"><span class="mono-s t3">Wallets loaded</span><span class="mono-s">${state.summary.circle?.wallets_loaded ? "yes" : "no"}</span></div>
                </div>
              `
          }
          <div style="margin-top: 18px; border-top: 1px solid var(--border); padding-top: 14px;">
            ${roleDetail}
          </div>
        </div>

        <div class="card">
          <div class="card-header row between">
            <span>Recent activity</span>
            <span class="live"><span class="dot"></span>Live</span>
          </div>
          <div style="padding: 4px;">
            ${activities
              .map((activity, index) => {
                return `
                  <div class="row" style="padding: 10px 14px; border-bottom: ${index < activities.length - 1 ? "1px solid var(--border)" : "none"}; gap: 10px;">
                    <span class="pill ${escapeHtml(activity.pill)}" style="font-size: 10px; min-width: 108px; justify-content: center;">${escapeHtml(activity.label)}</span>
                    <span class="mono-s t2" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(activity.description)}</span>
                    <span class="mono-s" style="color: var(--circle-green);">${escapeHtml(activity.amount)}</span>
                    ${activity.hash ? renderTxReference(activity.hash, 8, 6, "Activity reference") : ""}
                    <span class="mono-s t3" style="min-width: 56px; text-align: right;">${escapeHtml(activity.ago)}</span>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <div class="card card-pad">
          <div class="row between" style="margin-bottom: 14px;">
            <span class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Settlement context</span>
            <a class="btn btn-ghost" href="/api/hackathon/summary" target="_blank" rel="noreferrer" style="height: 26px;">Proof JSON</a>
          </div>
          <div class="col g12">
            <div class="grid-2" style="gap: 10px;">
              <div class="col g4"><span class="mono-s t3">Track</span><span class="mono">${escapeHtml((state.summary.tracks || [])[0] || "Real-Time Micro-Commerce Flow")}</span></div>
              <div class="col g4"><span class="mono-s t3">Wallet mode</span><span class="mono">${escapeHtml(state.summary.connectors?.wallet_mode || "manual_only")}</span></div>
              <div class="col g4"><span class="mono-s t3">Settlement auth</span><span class="mono">${escapeHtml(settlementAuthMode())}</span></div>
              <div class="col g4"><span class="mono-s t3">Treasury</span><span class="mono">${escapeHtml(truncateMiddle(state.summary.connectors?.treasury_address || state.summary.circle?.treasury_address || selected.address, 8, 6))}</span></div>
              <div class="col g4"><span class="mono-s t3">Batch throughput</span><span class="mono">${escapeHtml(formatNumber(proof.throughput_tx_per_min, 1))} tx/min</span></div>
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 14px;">
              <div class="mono-s t3" style="margin-bottom: 8px;">Last proof transactions</div>
              <div class="trade-list" style="max-height: 240px;">${renderProofTransactions(4)}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}

function renderArchitecturePage() {
  const summary = state.summary;
  const proof = summary.proof || FALLBACK_SUMMARY.proof;
  const connectors = summary.connectors || FALLBACK_SUMMARY.connectors;
  const programmatic = isProgrammaticSettlement();
  const flowCards = [
    {
      eyebrow: "01 Quote",
      title: "Buyer opens marketplace",
      copy: "Marketplace creates a priced payment intent for one artifact at a time with sub-cent USDC pricing.",
    },
    {
      eyebrow: "02 Route",
      title: "Circle treasury address",
      copy: "The checkout surfaces a live treasury route sourced from the Circle wallet set instead of a mock fallback.",
    },
    {
      eyebrow: "03 Verify",
      title: "Arc settlement proof",
      copy: programmatic
        ? "The backend captures the Arc tx hash from Circle, then the API verifies the receipt before the artifact unlock path can advance."
        : "Buyer pastes the Arc tx hash and the API verifies the receipt before the artifact unlock path can advance.",
    },
    {
      eyebrow: "04 Deliver",
      title: "Artifact unlock",
      copy: "Once settlement is verified, the agent flow executes demo jobs and releases the paid artifact payload.",
    },
  ];

  return `
    <main style="padding: 28px 32px 64px; max-width: 1240px; margin: 0 auto;" class="col g20">
      <div class="card card-pad">
        <div class="col g8">
          <p class="eyebrow">Architecture</p>
          <h1>Real-Time Micro-Commerce on Arc + Circle</h1>
          <p class="lede">The frontend judges see is the same buyer surface that creates intents, routes settlement to Circle wallets, verifies Arc receipts, and unlocks paid agent artifacts after proof lands onchain.</p>
        </div>
      </div>

      <div class="grid-4">
        <div class="card card-pad kpi"><span class="label">Pricing</span><span class="value green">0.001</span><span class="sub">Entry artifact price in USDC</span></div>
        <div class="card card-pad kpi"><span class="label">Transactions</span><span class="value">${escapeHtml(String(proof.transactions_total || 63))}</span><span class="sub">Real Arc settlements demonstrated</span></div>
        <div class="card card-pad kpi"><span class="label">Throughput</span><span class="value blue">${escapeHtml(formatNumber(proof.throughput_tx_per_min || 17.7, 1))}</span><span class="sub">Observed tx/min in the proof batch</span></div>
        <div class="card card-pad kpi"><span class="label">ETH L1 Counterfactual</span><span class="value">${escapeHtml(formatNumber(summary.margin?.eth_l1_counterfactual_gas_usd || 31.5, 1))}</span><span class="sub">Why this would break on traditional gas</span></div>
      </div>

      <div class="grid-2" style="gap: 20px;">
        <div class="card card-pad">
          <div class="sect-head">
            <h3>Settlement flow</h3>
            <span class="live"><span class="dot"></span>Live checkout</span>
          </div>
          <div class="col g8">
            ${flowCards
              .map((card) => {
                return `
                  <div class="signal" style="grid-template-columns: minmax(88px, 100px) 1fr auto;">
                    <div class="col g4">
                      <span class="pill pill-blue">${escapeHtml(card.eyebrow)}</span>
                    </div>
                    <div class="col g4">
                      <div class="sym" style="font-size: 14px;">${escapeHtml(card.title)}</div>
                      <div class="mono-s t2" style="white-space: normal;">${escapeHtml(card.copy)}</div>
                    </div>
                    <div class="actions">
                      <span class="price-pill">proof</span>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <div class="card card-pad">
          <div class="sect-head">
            <h3>Connectors</h3>
            <span class="count">${escapeHtml(String(summary.circle?.wallets_configured || 0))} wallets</span>
          </div>
          <div class="connector-grid">
            <div class="connector-card"><span class="eyebrow">Wallet Provider</span><strong>${escapeHtml(connectors.wallet_provider || "circle_developer_controlled_wallets")}</strong><p>Developer-controlled wallets route the buyer into a known treasury destination.</p></div>
            <div class="connector-card"><span class="eyebrow">Wallet Set</span><strong>${escapeHtml(truncateMiddle(summary.circle?.wallet_set_id || "", 12, 8))}</strong><p>Wallet set exposed in the public judge-facing summary.</p></div>
            <div class="connector-card"><span class="eyebrow">Treasury</span><strong>${escapeHtml(truncateMiddle(connectors.treasury_address || summary.circle?.treasury_address || "", 10, 8))}</strong><p>Checkout intents now use the live treasury route instead of the mock fallback.</p></div>
            <div class="connector-card"><span class="eyebrow">Arc RPC</span><strong><a href="${escapeHtml(connectors.arc_rpc_url || summary.arc?.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(connectors.arc_rpc_url || summary.arc?.url || "https://rpc.testnet.arc.network")}</a></strong><p>Receipt verification happens against Arc Testnet before delivery unlocks.</p></div>
          </div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="sect-head">
          <h3>Recent proof</h3>
          <span class="live"><span class="dot"></span>63 tx batch</span>
        </div>
        <div class="trade-list">${renderProofTransactions(6)}</div>
      </div>
    </main>
  `;
}

function renderAboutPage() {
  const summary = state.summary;
  const proof = summary.proof || FALLBACK_SUMMARY.proof;
  const listings = buildListings();

  return `
    <main style="padding: 28px 32px 64px; max-width: 1240px; margin: 0 auto;" class="col g20">
      <div class="card card-pad">
        <div class="col g8">
          <p class="eyebrow">About</p>
          <h1>TTM Agent Market</h1>
          <p class="lede">A buyer experience for paid agent artifacts where every interaction is priced in USDC, settled on Arc, and unlocked only after verification. The public demo aligns with the hackathon tracks instead of the old trading-bot surface.</p>
        </div>
      </div>

      <div class="grid-2" style="gap: 20px;">
        <div class="card card-pad">
          <div class="sect-head"><h3>Submission alignment</h3></div>
          <div class="col g8">
            ${(summary.tracks || FALLBACK_SUMMARY.tracks)
              .map((track) => `<div class="row between"><span class="mono-s t3">Track</span><span class="pill pill-blue">${escapeHtml(track)}</span></div>`)
              .join("")}
            <div class="row between"><span class="mono-s t3">Chain</span><span class="mono-s">Arc Testnet · ${escapeHtml(String(summary.arc?.chain_id || 5042002))}</span></div>
            <div class="row between"><span class="mono-s t3">Wallet stack</span><span class="mono-s">Circle developer-controlled wallets</span></div>
          </div>
        </div>

        <div class="card card-pad">
          <div class="sect-head"><h3>Judge click path</h3></div>
          <div class="col g8">
            <div class="row between"><span class="mono-s t3">1.</span><span class="mono-s">Open Marketplace and select an artifact.</span></div>
            <div class="row between"><span class="mono-s t3">2.</span><span class="mono-s">${escapeHtml(isProgrammaticSettlement() ? "Create checkout, pay automatically, inspect tx hash." : "Create checkout, fund treasury, paste tx hash.")}</span></div>
            <div class="row between"><span class="mono-s t3">3.</span><span class="mono-s">${escapeHtml(isProgrammaticSettlement() ? "Unlock the paid artifact after backend verification." : "Verify settlement and unlock the paid artifact.")}</span></div>
            <div class="row between"><span class="mono-s t3">4.</span><span class="mono-s">Inspect Agents and Architecture for onchain proof.</span></div>
          </div>
        </div>

        <div class="card card-pad">
          <div class="sect-head"><h3>Artifact catalog</h3><span class="count">${escapeHtml(String(listings.length))} SKUs</span></div>
          <div class="col g8">
            ${listings
              .map((listing) => {
                return `
                  <div class="row between" style="padding: 8px 0; border-bottom: 1px solid var(--border);">
                    <div class="col g4">
                      <span class="mono-s">${escapeHtml(listing.name)}</span>
                      <span class="mono-s t3">${escapeHtml(formatArtifactType(listing.type))}</span>
                    </div>
                    <span class="price-pill">${escapeHtml(formatNumber(listing.price_usd, 3))} USDC</span>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <div class="card card-pad">
          <div class="sect-head"><h3>Proof snapshot</h3></div>
          <div class="col g8">
            <div class="row between"><span class="mono-s t3">Transactions</span><span class="mono-s">${escapeHtml(String(proof.transactions_total || 63))}</span></div>
            <div class="row between"><span class="mono-s t3">Success rate</span><span class="mono-s">${escapeHtml(formatPct(proof.success_rate_pct || 100))}</span></div>
            <div class="row between"><span class="mono-s t3">Throughput</span><span class="mono-s">${escapeHtml(formatNumber(proof.throughput_tx_per_min || 17.7, 1))} tx/min</span></div>
            <div class="row between"><span class="mono-s t3">Moved</span><span class="mono-s">${escapeHtml(formatUsdc(proof.total_usdc_moved || 0.063))}</span></div>
            <div class="row between"><span class="mono-s t3">Margin vs ETH L1</span><span class="mono-s">$${escapeHtml(formatNumber(summary.margin?.eth_l1_counterfactual_gas_usd || 31.5, 2))}</span></div>
          </div>
        </div>

        <div class="card card-pad">
          <div class="sect-head"><h3>Project links</h3></div>
          <div class="row g8" style="flex-wrap: wrap;">
            <a class="btn btn-ghost" href="/">Pitch</a>
            <a class="btn btn-ghost" href="/pitch-video.html">90s Deck</a>
            <a class="btn btn-ghost" href="/api/hackathon/summary" target="_blank" rel="noreferrer">Proof JSON</a>
            <a class="btn btn-ghost" href="/docs" target="_blank" rel="noreferrer">Swagger</a>
          </div>
          <p class="section-copy" style="margin-top: 12px;">These public links are repeated here so judges can reach every proof surface from inside the page body as well.</p>
        </div>
      </div>
    </main>
  `;
}

function renderBanner() {
  if (state.ui.banner) {
    return `<div class="banner ${escapeHtml(state.ui.banner.tone)}" style="margin-bottom: 16px;">${escapeHtml(state.ui.banner.message)}</div>`;
  }
  if (state.usedFallback) {
    return `<div class="banner warn" style="margin-bottom: 16px;">API offline. Showing repo-backed fallback proof so the marketplace remains presentation-ready.</div>`;
  }
  return "";
}

function renderModal() {
  const artifact = modalArtifact();
  if (!artifact) {
    return "";
  }

  const selectedOrder = latestOrderForArtifact(artifact.id);
  const isCreating = state.ui.creatingArtifactId === artifact.id;
  const isPaying = selectedOrder && state.ui.payingOrderId === selectedOrder.paymentId;
  const isVerifying = selectedOrder && state.ui.verifyingOrderId === selectedOrder.paymentId;
  const isUnlocking = selectedOrder && state.ui.unlockingOrderId === selectedOrder.paymentId;
  const programmatic = isProgrammaticSettlement();
  const videoWallet = recommendedVideoWallet();
  const usingVideoWallet =
    !!videoWallet && state.market.buyerAddress.trim().toLowerCase() === videoWallet.address.toLowerCase();
  const selectedBuyerName = selectedOrder ? walletNameForAddress(selectedOrder.buyerAddress) : null;
  const selectedBuyerLabel = selectedBuyerName ? humanizeWalletName(selectedBuyerName) : "custom buyer";
  const canOpenExplorer = selectedOrder ? isExplorerTxHash(selectedOrder.txHash) : false;

  let primaryAction = "";
  let secondaryAction = `<button class="btn btn-ghost" data-action="close-modal">Close</button>`;

  if (!selectedOrder) {
    primaryAction = `<button class="btn btn-primary" data-action="create-checkout" data-artifact-id="${escapeHtml(artifact.id)}">${isCreating ? "Creating checkout..." : `Pay ${escapeHtml(formatNumber(artifact.price_usd, 3))} USDC`}</button>`;
  } else if (selectedOrder.status === "SETTLED") {
    secondaryAction = canOpenExplorer
      ? `<button class="btn btn-secondary" data-action="open-tx" data-tx-hash="${escapeHtml(selectedOrder.txHash)}">Open tx</button>`
      : `<button class="btn btn-secondary" data-action="copy-treasury" data-payment-id="${escapeHtml(selectedOrder.paymentId)}">Copy treasury</button>`;
    primaryAction = `<button class="btn btn-primary" data-action="unlock-order" data-order-id="${escapeHtml(selectedOrder.paymentId)}">${isUnlocking ? "Unlocking..." : "Unlock artifact"}</button>`;
  } else if (selectedOrder.status === "DELIVERED") {
    secondaryAction = canOpenExplorer
      ? `<button class="btn btn-secondary" data-action="open-tx" data-tx-hash="${escapeHtml(selectedOrder.txHash)}">Open tx</button>`
      : `<button class="btn btn-secondary" data-action="copy-treasury" data-payment-id="${escapeHtml(selectedOrder.paymentId)}">Copy treasury</button>`;
    primaryAction = `<button class="btn btn-primary" data-action="copy-payment-id" data-payment-id="${escapeHtml(selectedOrder.paymentId)}">Copy payment ID</button>`;
  } else if (programmatic) {
    secondaryAction = `<button class="btn btn-secondary" data-action="focus-agent-console">Ask agent</button>`;
    primaryAction = `<button class="btn btn-primary" data-action="pay-order" data-order-id="${escapeHtml(selectedOrder.paymentId)}">${isPaying ? "Submitting payment..." : "Pay automatically"}</button>`;
  } else {
    secondaryAction = `<button class="btn btn-secondary" data-action="copy-treasury" data-payment-id="${escapeHtml(selectedOrder.paymentId)}">Copy treasury</button>`;
    primaryAction = `<button class="btn btn-primary" data-action="verify-order" data-order-id="${escapeHtml(selectedOrder.paymentId)}">${isVerifying ? "Verifying..." : "Verify settlement"}</button>`;
  }

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-head">
          <div class="row between">
            <h2>Confirm purchase</h2>
            <button class="btn btn-ghost" data-action="close-modal" style="height: 28px; padding: 0 6px;">${icon("x", 14)}</button>
          </div>
          <p class="t2" style="margin: 0; font-size: 13px;">One priced artifact = one settlement path in USDC on Arc Testnet.</p>
        </div>

        <div class="modal-body">
          <div class="card card-pad" style="margin-bottom: 20px;">
            <div class="row between" style="margin-bottom: 10px;">
              <div class="mono" style="font-size: 16px; font-weight: 500;">${escapeHtml(artifact.name)}</div>
              <div class="row g6">
                <span class="pill pill-blue">${escapeHtml(artifact.badgeLabel || formatArtifactType(artifact.type))}</span>
                <span class="pill ${escapeHtml(tierPill(artifact.tier))}">${escapeHtml(artifact.tier)}</span>
              </div>
            </div>
            <div class="row between">
              <div class="col g4">
                <span class="mono-s t3">PUBLISHER</span>
                <div class="row g6">${renderAvatar(artifact.publisher, "sm")}<span class="mono-s">${escapeHtml(artifact.publisher)}</span></div>
              </div>
              <div class="col g4">
                <span class="mono-s t3">SCORE</span>
                <span class="rep-badge ${escapeHtml(scoreColor(artifact.score))}">${escapeHtml(String(artifact.score))}</span>
              </div>
              <div class="col g4" style="align-items: flex-end;">
                <span class="mono-s t3">PRICE</span>
                <div class="mono" style="font-size: 18px; font-weight: 500;">${escapeHtml(formatNumber(artifact.price_usd, 3))} <span class="t2" style="font-size: 12px;">USDC</span></div>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            ${renderStepper(selectedOrder)}
          </div>

          <div class="col g12">
            <div class="col g6">
              <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Buyer wallet</label>
              <input class="input" placeholder="0xBuyerAddress" data-field="buyer-address" value="${escapeHtml(state.market.buyerAddress)}" />
            </div>

            ${
              videoWallet
                ? `
                  <div class="card card-pad" style="padding: 14px;">
                    <div class="row between" style="align-items: flex-start; gap: 12px;">
                      <div class="col g4" style="flex: 1;">
                        <span class="mono-s t3">Live video wallet</span>
                        <span class="mono-s">${escapeHtml(humanizeWalletName(videoWallet.name))}</span>
                        <span class="mono-s" style="word-break: break-all;">${escapeHtml(videoWallet.address)}</span>
                      </div>
                      <button class="btn btn-secondary" data-action="use-video-wallet">${usingVideoWallet ? "Using video wallet" : "Use video wallet"}</button>
                    </div>
                    <div class="t2" style="font-size: 12px; margin-top: 8px;">
                      Recommended source for the live Circle Console checkout. It is already funded in the public demo wallet set.
                    </div>
                  </div>
                `
                : ""
            }

            ${
              selectedOrder
                ? `
                  <div class="card card-pad" style="padding: 14px;">
                    <div class="row between" style="margin-bottom: 8px;">
                      <span class="mono-s t3">PAYMENT ID</span>
                      <span class="mono-s">${escapeHtml(truncateMiddle(selectedOrder.paymentId, 10, 8))}</span>
                    </div>
                    <div class="row between" style="margin-bottom: 8px;">
                      <span class="mono-s t3">SOURCE</span>
                      <span class="mono-s">${escapeHtml(selectedBuyerLabel)}</span>
                    </div>
                    <div class="mono-s" style="word-break: break-all; margin-bottom: 8px;">${escapeHtml(selectedOrder.buyerAddress)}</div>
                    <div class="row between" style="margin-bottom: 8px;">
                      <span class="mono-s t3">NETWORK</span>
                      <span class="mono-s">Arc Testnet · ${escapeHtml(formatNumber(selectedOrder.amountUsd, 3))} USDC</span>
                    </div>
                    <div class="row between" style="margin-bottom: 8px;">
                      <span class="mono-s t3">TREASURY ROUTE</span>
                      <span class="mono-s">Circle destination</span>
                    </div>
                    <div class="mono-s" style="word-break: break-all; margin-bottom: 8px;">${escapeHtml(selectedOrder.depositAddress)}</div>
                    ${
                      programmatic
                        ? `
                          <div class="row between" style="margin-bottom: 8px;">
                            <span class="mono-s t3">PAYMENT MODE</span>
                            <span class="mono-s">Programmatic Circle transfer</span>
                          </div>
                          ${
                            selectedOrder.txHash
                              ? `
                                <div class="col g6" style="margin-bottom: 8px;">
                                  <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Settlement tx hash</label>
                                  <input class="input mono-s" value="${escapeHtml(selectedOrder.txHash)}" readonly />
                                </div>
                              `
                              : ""
                          }
                          <div class="t2" style="font-size: 12px;">
                            Autonomous mode is active. Use Pay automatically or ask the agent to buy this artifact. The backend submits the Circle transfer, waits for COMPLETE, captures the Arc tx hash, and then you can unlock delivery.
                          </div>
                        `
                        : `
                          <div class="col g6" style="margin-bottom: 8px;">
                            <label class="mono-s t3" style="text-transform: uppercase; letter-spacing: 0.08em;">Settlement tx hash</label>
                            <input class="input mono-s" data-field="tx-hash" data-order-id="${escapeHtml(selectedOrder.paymentId)}" placeholder="0x..." value="${escapeHtml(selectedOrder.txHash)}" />
                          </div>
                          <div class="t2" style="font-size: 12px;">
                            1. Create the checkout. 2. In Circle Console, send the exact amount above from the source wallet to the treasury route. 3. If the wallet detail page shows no send button, switch to Developer Controlled → Transactions and create the transfer there. 4. Paste the tx hash. 5. Verify and unlock.
                          </div>
                        `
                    }
                  </div>
                `
                : `
                  <div class="banner info">
                    ${
                      programmatic
                        ? "Create a checkout to receive the treasury route, then use Pay automatically or the agent console to complete settlement."
                        : "Create a checkout to receive the exact treasury route and Circle transfer instructions for this artifact."
                    }
                  </div>
                `
            }

            ${
              selectedOrder && selectedOrder.reason
                ? `<div class="banner danger">${escapeHtml(selectedOrder.reason)}</div>`
                : ""
            }

            ${
              selectedOrder && selectedOrder.status === "DELIVERED"
                ? `
                  <div class="card card-pad" style="border-color: rgba(17, 217, 139, 0.3); background: rgba(17, 217, 139, 0.04);">
                    <div class="row between" style="margin-bottom: 10px;">
                      <span class="row g6" style="color: var(--circle-green);">${icon("check", 14)} Delivered</span>
                      ${selectedOrder.txHash ? renderTxReference(selectedOrder.txHash, 10, 6, "Delivery settlement reference") : ""}
                    </div>
                    <pre class="json">{
  "artifact_id": "${escapeHtml(selectedOrder.artifactId)}",
  "status": "completed",
  "download_url": "${escapeHtml(selectedOrder.downloadUrl || "/api/artifacts/download")}"
}</pre>
                  </div>
                `
                : ""
            }
          </div>
        </div>

        <div class="modal-foot">
          ${secondaryAction}
          ${primaryAction}
        </div>
      </div>
    </div>
  `;
}

function renderApp() {
  if (!root) {
    return;
  }

  syncRouteFromLocation();
  const listings = getFilteredListings();
  const route = state.ui.route;

  let page = "";
  if (route === "agents") {
    page = renderAgentsPage();
  } else if (route === "architecture") {
    page = renderArchitecturePage();
  } else if (route === "about") {
    page = renderAboutPage();
  } else {
    page = renderMarketplacePage(listings);
  }

  root.innerHTML = `
    ${renderChainStrip()}
    <div class="app">
      ${renderTopNav()}
      ${page}
      ${route === "marketplace" ? renderModal() : ""}
      ${renderFloatingAgentChat()}
    </div>
  `;
}

async function refreshDemoJobs() {
  try {
    state.demoJobs = (await fetchJson("/api/demo/jobs")) || [];
  } catch (_error) {
    state.demoJobs = state.summary.demo_jobs || FALLBACK_SUMMARY.demo_jobs.slice();
  }
}

async function loadBoard({ manual = false } = {}) {
  try {
    state.summary = await fetchJson("/api/hackathon/summary");
    state.usedFallback = false;
  } catch (_error) {
    state.summary = FALLBACK_SUMMARY;
    state.usedFallback = true;
  }

  await refreshDemoJobs();
  renderApp();

  if (manual) {
    showBanner(`Marketplace refreshed at ${new Date().toLocaleTimeString()}.`, "info");
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    loadBoard().catch((_error) => {
      showBanner("Auto-refresh failed. Keeping the latest successful marketplace snapshot.", "warn");
    });
  }, 60000);
}

async function createCheckout(artifactId) {
  const artifact = buildListings().find((item) => item.id === artifactId);
  const buyerAddress = state.market.buyerAddress.trim();

  if (!artifact) {
    showBanner("Artifact not found in the marketplace.", "danger");
    return;
  }
  if (!buyerAddress) {
    showBanner("Enter a buyer wallet before creating a checkout.", "warn");
    return;
  }

  state.ui.creatingArtifactId = artifactId;
  renderApp();

  try {
    const demoJob = await fetchJson("/api/demo/jobs/request", {
      method: "POST",
      body: { artifact_type: artifact.type },
    }).catch(() => null);

    const intent = await fetchJson("/api/payments/intent", {
      method: "POST",
      body: {
        artifact_id: artifact.id,
        buyer_address: buyerAddress,
        job_id: demoJob?.id || null,
      },
    });

    upsertOrder({
      paymentId: intent.payment_id,
      artifactId: artifact.id,
      artifactName: artifact.name,
      artifactType: artifact.type,
      amountUsd: intent.amount_usd,
      buyerAddress,
      depositAddress: intent.deposit_address,
      jobId: intent.job_id || demoJob?.id || null,
      status: "CHECKOUT_READY",
      settlementStatus: "PENDING",
      reason: null,
      txHash: "",
      downloadUrl: null,
      executionMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await refreshDemoJobs();
    renderApp();
    const sourceName = walletNameForAddress(buyerAddress);
    const sourceLabel = sourceName
      ? `${humanizeWalletName(sourceName)} ${truncateMiddle(buyerAddress, 8, 6)}`
      : truncateMiddle(buyerAddress, 8, 6);
    showBanner(
      isProgrammaticSettlement()
        ? `Checkout created. Use Pay automatically or ask the agent to send ${formatNumber(intent.amount_usd, 3)} USDC from ${sourceLabel}.`
        : `Checkout created. In Circle Console, send ${formatNumber(intent.amount_usd, 3)} USDC from ${sourceLabel} to the treasury route, then paste the tx hash.`,
      "info",
    );
  } catch (error) {
    showBanner(`Could not create checkout: ${error.message}`, "danger");
  } finally {
    state.ui.creatingArtifactId = null;
    renderApp();
  }
}

async function payOrder(orderId) {
  const order = findOrderById(orderId);
  if (!order) {
    showBanner("Checkout not found.", "danger");
    return;
  }

  state.ui.payingOrderId = orderId;
  renderApp();

  try {
    const payment = await fetchJson("/api/payments/pay", {
      method: "POST",
      body: {
        payment_id: order.paymentId,
      },
    });

    patchOrder(orderId, {
      status:
        payment.status === "verified"
          ? "SETTLED"
          : payment.status === "failed"
            ? "FAILED"
            : "CHECKOUT_READY",
      settlementStatus: payment.settlement_status || null,
      reason: payment.reason || null,
      txHash: payment.tx_hash || order.txHash,
    });

    await refreshDemoJobs();
    renderApp();
    if (payment.status === "verified") {
      showBanner("Autonomous settlement complete. You can now unlock the artifact.", "info");
    } else {
      showBanner(`Autonomous settlement failed${payment.reason ? `: ${payment.reason}` : "."}`, "danger");
    }
  } catch (error) {
    showBanner(`Could not submit programmatic payment: ${error.message}`, "danger");
  } finally {
    state.ui.payingOrderId = null;
    renderApp();
  }
}

async function verifyOrder(orderId) {
  const order = findOrderById(orderId);
  if (!order) {
    showBanner("Checkout not found.", "danger");
    return;
  }
  if (!order.txHash.trim()) {
    showBanner("Paste the settlement tx hash before verifying.", "warn");
    return;
  }

  state.ui.verifyingOrderId = orderId;
  renderApp();

  try {
    const verification = await fetchJson("/api/payments/verify", {
      method: "POST",
      body: {
        payment_id: order.paymentId,
        tx_hash: order.txHash.trim(),
      },
    });

    if (verification.status === "verified" && order.jobId) {
      await safePost(`/api/demo/jobs/${order.jobId}/pay`);
    }

    patchOrder(orderId, {
      status: verification.status === "verified" ? "SETTLED" : "FAILED",
      settlementStatus: verification.settlement_status || null,
      reason: verification.reason || null,
      txHash: order.txHash.trim(),
    });

    await refreshDemoJobs();
    renderApp();
    if (verification.status === "verified") {
      showBanner("Settlement verified. The artifact can now be unlocked.", "info");
    } else {
      showBanner(`Settlement verification failed${verification.reason ? `: ${verification.reason}` : "."}`, "danger");
    }
  } catch (error) {
    showBanner(`Could not verify settlement: ${error.message}`, "danger");
  } finally {
    state.ui.verifyingOrderId = null;
    renderApp();
  }
}

async function runDeliverySequence(jobId) {
  if (!jobId) {
    return;
  }
  await safePost(`/api/demo/jobs/${jobId}/execute`);
  await safePost(`/api/demo/jobs/${jobId}/review?approve=true`);
  await safePost(`/api/demo/jobs/${jobId}/deliver`);
}

async function unlockOrder(orderId) {
  const order = findOrderById(orderId);
  if (!order) {
    showBanner("Checkout not found.", "danger");
    return;
  }
  if (order.status !== "SETTLED") {
    showBanner("Verify settlement before unlocking the artifact.", "warn");
    return;
  }

  state.ui.unlockingOrderId = orderId;
  renderApp();

  try {
    const execution = await fetchJson("/api/payments/execute", {
      method: "POST",
      body: {
        artifact_id: order.artifactId,
        payment_id: order.paymentId,
      },
    });

    await runDeliverySequence(order.jobId);

    patchOrder(orderId, {
      status: "DELIVERED",
      executionMessage: execution.message || "Artifact unlocked after payment verification.",
      downloadUrl: execution.download_url || null,
      reason: null,
    });

    await refreshDemoJobs();
    renderApp();
    showBanner(`${order.artifactName} unlocked after verified settlement.`, "info");
  } catch (error) {
    showBanner(`Could not unlock artifact: ${error.message}`, "danger");
  } finally {
    state.ui.unlockingOrderId = null;
    renderApp();
  }
}

async function sendAgentMessage(message = state.ui.agentComposer.trim()) {
  const text = String(message || "").trim();
  if (!text) {
    showBanner("Type a message for the agent first.", "warn");
    return;
  }
  if (!agentChatReady()) {
    showBanner("Agent chat is offline. Configure GEMINI_API_KEY on the backend first.", "warn");
    return;
  }

  state.ui.agentChatOpen = true;
  state.ui.agentSending = true;
  renderApp();

  try {
    const response = await fetchJson("/api/agent/chat", {
      method: "POST",
      body: {
        message: text,
        history: state.market.agentHistory,
      },
    });

    state.market.agentHistory = [...state.market.agentHistory, { role: "user", text }, { role: "assistant", text: response.reply }].slice(-12);
    state.market.agentEvents = Array.isArray(response.events) ? response.events : [];
    mergeRemoteOrders(response.orders || []);
    persistMarketState();

    await refreshDemoJobs();
    state.ui.agentComposer = "";
    renderApp();
  } catch (error) {
    showBanner(`Agent request failed: ${error.message}`, "danger");
  } finally {
    state.ui.agentSending = false;
    renderApp();
  }
}

function focusAgentConsole() {
  state.ui.modalArtifactId = null;
  state.ui.agentChatOpen = true;
  renderApp();
  window.setTimeout(() => {
    const composer = document.getElementById("agent-composer");
    if (composer && typeof composer.focus === "function") {
      composer.focus();
      composer.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, 0);
}

function openArtifact(artifactId) {
  state.ui.modalArtifactId = artifactId;
  const order = latestOrderForArtifact(artifactId);
  if (order) {
    state.market.activeOrderId = order.paymentId;
    persistMarketState();
  }
  renderApp();
}

function closeModal() {
  state.ui.modalArtifactId = null;
  renderApp();
}

function handleClick(event) {
  if (event.target.classList.contains("modal-backdrop")) {
    closeModal();
    return;
  }

  const target = event.target.closest("[data-action], [data-open-artifact], [data-select-order], [data-route], [data-select-agent]");
  if (!target || !root.contains(target)) {
    return;
  }

  if (target.dataset.route) {
    event.preventDefault();
    setRoute(target.dataset.route);
    return;
  }

  if (target.dataset.selectAgent) {
    state.ui.selectedAgentId = target.dataset.selectAgent;
    renderApp();
    return;
  }

  if (target.dataset.openArtifact) {
    openArtifact(target.dataset.openArtifact);
    return;
  }

  if (target.dataset.selectOrder) {
    state.market.activeOrderId = target.dataset.selectOrder;
    persistMarketState();
    const order = findOrderById(target.dataset.selectOrder);
    if (order) {
      state.ui.modalArtifactId = order.artifactId;
    }
    renderApp();
    return;
  }

  const action = target.dataset.action;
  if (!action) {
    return;
  }

  if (target.tagName === "A" && target.getAttribute("href") === "#") {
    event.preventDefault();
  }

  switch (action) {
    case "close-modal":
      closeModal();
      return;
    case "refresh-market":
      loadBoard({ manual: true }).catch((_error) => {
        showBanner("Could not refresh the marketplace.", "danger");
      });
      return;
    case "clear-filters":
      state.filters.search = "";
      state.filters.types = new Set((state.summary.catalog || []).map((item) => item.type));
      state.filters.maxPrice = 0.01;
      state.filters.underOneCentOnly = false;
      renderApp();
      return;
    case "open-first-artifact": {
      const first = buildListings()[0];
      if (first) {
        openArtifact(first.id);
      }
      return;
    }
    case "inspect-payment-flow": {
      const activeOrder = getActiveOrder();
      if (activeOrder) {
        state.ui.modalArtifactId = activeOrder.artifactId;
      } else {
        const first = buildListings()[0];
        state.ui.modalArtifactId = first ? first.id : null;
      }
      renderApp();
      return;
    }
    case "create-checkout":
      createCheckout(target.dataset.artifactId);
      return;
    case "pay-order":
      payOrder(target.dataset.orderId);
      return;
    case "verify-order":
      verifyOrder(target.dataset.orderId);
      return;
    case "unlock-order":
      unlockOrder(target.dataset.orderId);
      return;
    case "copy-treasury": {
      const order = findOrderById(target.dataset.paymentId);
      copyToClipboard(order?.depositAddress, "treasury address");
      return;
    }
    case "use-video-wallet": {
      const wallet = recommendedVideoWallet();
      if (!wallet) {
        showBanner("No funded video wallet is available in the current proof data.", "warn");
        return;
      }
      state.market.buyerAddress = wallet.address;
      persistMarketState();
      renderApp();
      showBanner(`Buyer wallet set to ${humanizeWalletName(wallet.name)} for the live Circle checkout.`, "info");
      return;
    }
    case "open-tx":
      window.open(txUrl(target.dataset.txHash), "_blank", "noopener,noreferrer");
      return;
    case "copy-payment-id":
      copyToClipboard(target.dataset.paymentId, "payment ID");
      return;
    case "agent-prompt":
      state.ui.agentChatOpen = true;
      state.ui.agentComposer = target.dataset.prompt || "";
      renderApp();
      sendAgentMessage(target.dataset.prompt || "");
      return;
    case "send-agent-message":
      sendAgentMessage();
      return;
    case "focus-agent-console":
      focusAgentConsole();
      return;
    case "toggle-agent-chat":
      state.ui.agentChatOpen = !state.ui.agentChatOpen;
      renderApp();
      if (state.ui.agentChatOpen) {
        focusAgentConsole();
      }
      return;
    case "close-agent-chat":
      state.ui.agentChatOpen = false;
      renderApp();
      return;
    case "open-docs":
      window.open(`${API_BASE_URL}/docs`, "_blank", "noopener,noreferrer");
      return;
    default:
      return;
  }
}

function handleInput(event) {
  const target = event.target;
  if (!root.contains(target) || !target.dataset.field) {
    return;
  }

  switch (target.dataset.field) {
    case "search":
      state.filters.search = target.value;
      renderApp();
      return;
    case "max-price":
      state.filters.maxPrice = asNumber(target.value);
      renderApp();
      return;
    case "buyer-address":
      state.market.buyerAddress = target.value;
      persistMarketState();
      return;
    case "agent-composer":
      state.ui.agentComposer = target.value;
      return;
    case "tx-hash":
      patchOrder(target.dataset.orderId, { txHash: target.value });
      return;
    default:
      return;
  }
}

function handleChange(event) {
  const target = event.target;
  if (!root.contains(target)) {
    return;
  }

  if (target.dataset.typeFilter) {
    const value = target.dataset.typeFilter;
    if (target.checked) {
      state.filters.types.add(value);
    } else {
      state.filters.types.delete(value);
    }
    renderApp();
    return;
  }

  if (target.dataset.field === "under-one-cent") {
    state.filters.underOneCentOnly = target.checked;
    renderApp();
  }
}

function ensureBuyerWalletPreset() {
  if (state.market.buyerAddress.trim()) {
    return;
  }
  const wallet = recommendedVideoWallet();
  if (!wallet) {
    return;
  }
  state.market.buyerAddress = wallet.address;
  persistMarketState();
}

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
window.addEventListener("hashchange", () => {
  syncRouteFromLocation();
  renderApp();
});

if (!window.location.hash) {
  window.location.hash = "marketplace";
}

ensureBuyerWalletPreset();
renderApp();
loadBoard()
  .then(startAutoRefresh)
  .catch((_error) => {
    showBanner("Could not load the marketplace.", "danger");
  });
