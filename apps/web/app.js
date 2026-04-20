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

function renderConnectors(connectors, marketHealth) {
  const connectorList = document.getElementById("connector-list");
  if (!connectorList) return;
  connectorList.innerHTML = `
    <div class="connector-item" data-testid="connector-item-exchange">
      <p class="label">Exchange</p>
      <strong>${escapeHtml(connectors.exchange)}</strong>
      <p>${escapeHtml(connectors.binance_base_url)}</p>
    </div>
    <div class="connector-item" data-testid="connector-item-wallet">
      <p class="label">Wallet mode</p>
      <strong>${escapeHtml(connectors.wallet_mode)}</strong>
      <p>MetaMask ready: ${connectors.metamask_ready ? "yes" : "no"}</p>
    </div>
    <div class="connector-item" data-testid="connector-item-heartbeat">
      <p class="label">Market heartbeat</p>
      <strong>${escapeHtml(marketHealth.status ?? "unknown")}</strong>
      <p>Latency: ${formatNumber(marketHealth.latency_ms ?? 0, " ms")}</p>
      <p>${escapeHtml(marketHealth.last_error ?? "Testnet connector responsive.")}</p>
    </div>
  `;
}

function renderStrategies(strategies) {
  const strategyList = document.getElementById("strategy-list");
  if (!strategyList) return;
  strategyList.innerHTML = strategies
    .map(
      (strategy) => `
        <div class="strategy-item" data-testid="strategy-item-${escapeHtml(strategy.id || strategy.name)}">
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
    .map((reason) => `<li data-testid="guardrail-reason">${escapeHtml(reason)}</li>`)
    .join("");
}

function renderMetrics(metrics) {
  setText("net-profit", formatNumber(metrics.net_profit, " USD"));
  setText("return-pct", formatNumber(metrics.total_return_pct, "%"));
  setText("drawdown-pct", formatNumber(metrics.max_drawdown_pct, "%"));
  setText("profit-factor", formatNumber(metrics.profit_factor));
}

function renderAggregates(performance) {
  const list = document.getElementById("aggregates-list");
  if (!list) return;

  if (!performance || performance.total_trades === 0) {
    list.innerHTML = `<div class="aggregate-item" data-testid="aggregate-empty"><strong>No paper trades yet.</strong><p>Post journal entries to compare strategies by realized PnL and drawdown.</p></div>`;
    return;
  }

  const strategyEntries = Object.entries(performance.by_strategy || {});
  list.innerHTML = `
    <div class="aggregate-item aggregate-summary" data-testid="aggregate-summary">
      <strong>${performance.total_trades} trades tracked</strong>
      <p>Total PnL: ${formatNumber(performance.total_pnl, " USD")}</p>
      <p>Win rate: ${formatNumber(performance.win_rate_pct, "%")}</p>
      <p>Avg drawdown: ${formatNumber(performance.average_drawdown)}</p>
    </div>
    ${strategyEntries
      .map(
        ([strategyId, aggregate]) => `
          <div class="aggregate-item" data-testid="aggregate-strategy-${escapeHtml(strategyId)}">
            <strong>${escapeHtml(strategyId)}</strong>
            <p>Trades: ${aggregate.total_trades}</p>
            <p>PnL: ${formatNumber(aggregate.total_pnl, " USD")}</p>
            <p>Win rate: ${formatNumber(aggregate.win_rate_pct, "%")}</p>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderRecentTrades(trades) {
  const list = document.getElementById("journal-list");
  if (!list) return;

  if (!trades || trades.length === 0) {
    list.innerHTML = `<div class="journal-item" data-testid="journal-empty"><strong>No journal entries yet.</strong><p>Use the paper journal endpoints to accumulate structured trade evidence.</p></div>`;
    return;
  }

  list.innerHTML = trades
    .map(
      (trade, index) => `
        <article class="journal-item" data-testid="journal-trade-${escapeHtml(trade.id || index)}">
          <div class="journal-header">
            <strong>${escapeHtml(trade.symbol)} ${escapeHtml(trade.direction.toUpperCase())}</strong>
            <span>${escapeHtml(trade.status)}</span>
          </div>
          <p>${escapeHtml(trade.strategy_id)} · ${escapeHtml(trade.timeframe)} · ${escapeHtml(trade.market_regime)}</p>
          <p>${escapeHtml(trade.setup_reason)}</p>
          <div class="journal-metrics">
            <span>Entry ${formatNumber(trade.entry_price)}</span>
            <span>Exit ${trade.exit_price !== null ? formatNumber(trade.exit_price) : "-"}</span>
            <span>PnL ${trade.pnl !== null ? formatNumber(trade.pnl, " USD") : "-"}</span>
            <span>DD ${trade.drawdown !== null ? formatNumber(trade.drawdown) : "-"}</span>
          </div>
        </article>
      `,
    )
    .join("");
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
  const [dashboard, marketHealth] = await Promise.all([
    fetchJson("/api/dashboard"),
    fetchJson("/api/market/health"),
  ]);
  renderMetrics(dashboard.metrics);
  renderGuardrails(dashboard.guardrails);
  renderConnectors(dashboard.connectors, marketHealth || {});
  renderStrategies(dashboard.strategies);
  renderAggregates(dashboard.performance);
  renderRecentTrades(dashboard.recent_trades);
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
