const DEFAULT_API_BASE_URL = "http://127.0.0.1:8010";

function resolveApiBaseUrl() {
  const meta = document.querySelector('meta[name="ttm-api-base-url"]');
  const fromMeta = meta && meta.getAttribute("content");
  const fromQuery = new URLSearchParams(window.location.search).get("api");
  const fromGlobal = typeof window.TTM_API_BASE_URL === "string" ? window.TTM_API_BASE_URL : null;
  return fromQuery || fromGlobal || fromMeta || DEFAULT_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };
  return text.replace(/[&<>"'/]/g, (char) => replacements[char]);
}

function formatNumber(value, suffix = "") {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return `${number.toFixed(2)}${suffix}`;
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderConnectors(connectors) {
  const connectorList = document.getElementById("connector-list");
  if (!connectorList) return;
  connectorList.innerHTML = `
    <div class="connector-item">
      <p class="label">Exchange</p>
      <strong>${escapeHtml(connectors.exchange)}</strong>
      <p>${escapeHtml(connectors.binance_base_url)}</p>
    </div>
    <div class="connector-item">
      <p class="label">Wallet mode</p>
      <strong>${escapeHtml(connectors.wallet_mode)}</strong>
      <p>MetaMask ready: ${connectors.metamask_ready ? "yes" : "no"}</p>
    </div>
  `;
}

function renderStrategies(strategies) {
  const strategyList = document.getElementById("strategy-list");
  if (!strategyList) return;
  strategyList.innerHTML = strategies
    .map(
      (strategy) => `
        <div class="strategy-item">
          <strong>${escapeHtml(strategy.name)}</strong>
          <p>${escapeHtml(strategy.description)}</p>
          <p class="label">Best regime: ${escapeHtml(strategy.market_regime)}</p>
        </div>
      `,
    )
    .join("");
}

function renderGuardrails(guardrails) {
  setText("runtime-mode", guardrails.mode);
  setText(
    "guardrail-copy",
    guardrails.can_submit_testnet_orders
      ? "Testnet guarded mode armed; manual wallet signature remains required."
      : "Paper mode remains active until explicit human approval unlocks guarded testnet execution.",
  );

  const reasonList = document.getElementById("guardrail-reasons");
  if (!reasonList) return;
  reasonList.innerHTML = guardrails.reasons
    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
    .join("");
}

function renderMetrics(metrics) {
  setText("net-profit", formatNumber(metrics.net_profit, " USD"));
  setText("return-pct", formatNumber(metrics.total_return_pct, "%"));
  setText("drawdown-pct", formatNumber(metrics.max_drawdown_pct, "%"));
  setText("profit-factor", formatNumber(metrics.profit_factor));
}

function showStatus(message, variant = "info") {
  const banner = document.getElementById("status-banner");
  if (!banner) return;
  banner.textContent = message;
  banner.dataset.variant = variant;
  banner.hidden = !message;
}

async function loadDashboard() {
  showStatus("");
  const dashboard = await fetchJson("/api/dashboard");
  renderMetrics(dashboard.metrics);
  renderGuardrails(dashboard.guardrails);
  renderConnectors(dashboard.connectors);
  renderStrategies(dashboard.strategies);
}

async function connectMetaMask() {
  if (!window.ethereum) {
    showStatus(
      "MetaMask not found. Keep wallet mode manual_only until a browser wallet is available.",
      "warning",
    );
    return;
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    showStatus("Wallet connected for manual signature flow.", "success");
  } catch (error) {
    const reason = error && error.message ? error.message : "unknown error";
    showStatus(`Wallet connection failed: ${reason}`, "error");
  }
}

const refreshButton = document.getElementById("refresh-button");
if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadDashboard().catch((error) => {
      console.error(error);
      showStatus("Could not refresh dashboard.", "error");
    });
  });
}

const connectButton = document.getElementById("connect-wallet-button");
if (connectButton) {
  connectButton.addEventListener("click", connectMetaMask);
}

loadDashboard().catch((error) => {
  console.error(error);
  setText("runtime-mode", "offline");
  setText(
    "guardrail-copy",
    "API offline. Start the FastAPI service to view metrics.",
  );
  showStatus("API offline — dashboard will retry on refresh.", "error");
});
