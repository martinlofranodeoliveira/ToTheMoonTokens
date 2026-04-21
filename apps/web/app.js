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

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return number.toFixed(digits);
}

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatSignedCurrency(value) {
  const number = asNumber(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatCurrency(number)}`;
}

function formatPct(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return `${number.toFixed(digits)}%`;
}

function formatSignedPct(value, digits = 2) {
  const number = asNumber(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatPct(number, digits)}`;
}

function formatCompact(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
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

function formatDurationFromSeconds(seconds) {
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "-";
  }
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function progressPct(runtimeStatus) {
  if (!runtimeStatus || !runtimeStatus.started_at || !runtimeStatus.ends_at) {
    return 0;
  }
  const started = Date.parse(runtimeStatus.started_at);
  const ends = Date.parse(runtimeStatus.ends_at);
  if (!Number.isFinite(started) || !Number.isFinite(ends) || ends <= started) {
    return 0;
  }
  if (runtimeStatus.state === "completed") {
    return 100;
  }
  const now = Date.now();
  const pct = ((now - started) / (ends - started)) * 100;
  return Math.max(0, Math.min(100, pct));
}

function toneFromSigned(value) {
  const number = asNumber(value);
  if (number > 0) {
    return "positive";
  }
  if (number < 0) {
    return "danger";
  }
  return "neutral";
}

function toneFromBoolean(flag, positiveTone = "positive", negativeTone = "danger") {
  return flag ? positiveTone : negativeTone;
}

function toneFromOutcome(outcome) {
  if (outcome === "win") {
    return "positive";
  }
  if (outcome === "loss") {
    return "danger";
  }
  if (outcome === "breakeven") {
    return "warning";
  }
  return "neutral";
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

async function fetchOptional(path) {
  try {
    return await fetchJson(path);
  } catch (_error) {
    return null;
  }
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

function renderHero(dashboard, marketHealth, ticker) {
  const runtimeStatus = dashboard.runtime_status;
  const topRuntimeBadge = document.getElementById("top-runtime-badge");
  const runtimeStrip = document.getElementById("runtime-strip");
  const runtimeState = document.getElementById("runtime-state");
  const runtimeWindow = document.getElementById("runtime-window");
  const runtimeProgress = document.getElementById("runtime-progress");
  const spotPrice = document.getElementById("spot-price");
  const spotChange = document.getElementById("spot-change");
  const spotVolume = document.getElementById("spot-volume");

  const runtimeTone = dashboard.guardrails.mode === "paper" ? "warning" : "positive";

  if (topRuntimeBadge) {
    topRuntimeBadge.textContent = `${dashboard.guardrails.mode.toUpperCase()} mode`;
  }

  if (runtimeStrip) {
    runtimeStrip.innerHTML = [
      chip("Mode", dashboard.guardrails.mode.toUpperCase(), runtimeTone),
      chip("Orders", "Disabled", "warning"),
      chip("Wallet", dashboard.connectors?.wallet_mode ?? "manual_only", "neutral"),
      chip("Scope", "Artifact-only", "positive"),
      chip("Market", marketHealth?.status ?? "unknown", marketHealth?.status === "online" ? "positive" : "warning"),
    ].join("");
  }

  if (spotPrice) {
    spotPrice.textContent = ticker?.lastPrice ? formatCurrency(ticker.lastPrice) : "-";
  }

  if (spotChange) {
    const change = asNumber(ticker?.priceChangePercent);
    const tone = toneFromSigned(change);
    spotChange.textContent = ticker ? formatSignedPct(change) : "No ticker";
    spotChange.dataset.tone = tone;
  }

  if (spotVolume) {
    const volumeLabel = ticker?.quoteVolume ? `24h quote vol ${formatCompact(ticker.quoteVolume)}` : "Ticker unavailable";
    spotVolume.textContent = volumeLabel;
  }

  if (runtimeState) {
    runtimeState.textContent = runtimeStatus
      ? `${runtimeStatus.state} · ${runtimeStatus.symbol}`
      : "No continuous runtime";
  }

  if (runtimeWindow) {
    runtimeWindow.textContent = runtimeStatus
      ? `${formatDateTime(runtimeStatus.started_at)} -> ${formatDateTime(runtimeStatus.ends_at)} · ${runtimeStatus.lookback_bars} bars · ${runtimeStatus.poll_interval_seconds}s cadence`
      : "The MVP now uses snapshots, journal evidence, and connector health instead of a paper-trading loop.";
  }

  if (runtimeProgress) {
    runtimeProgress.style.width = `${progressPct(runtimeStatus)}%`;
  }
}

function renderKpis(performance, researchSnapshots, marketHealth) {
  const container = document.getElementById("kpi-grid");
  if (!container) {
    return;
  }

  const strategyEntries = Object.entries(performance?.by_strategy || {});
  const bestPaper = strategyEntries
    .slice()
    .sort((left, right) => asNumber(right[1].total_pnl) - asNumber(left[1].total_pnl))[0];
  const strongestResearch = (researchSnapshots || [])
    .slice()
    .sort((left, right) => asNumber(right.net_profit) - asNumber(left.net_profit))[0];
  const connectorLatency = marketHealth?.latency_ms ?? 0;
  const marketTone = marketHealth?.status === "online" ? "positive" : "warning";

  const cards = [
    {
      label: "Journal PnL",
      value: formatSignedCurrency(performance?.total_pnl),
      tone: toneFromSigned(performance?.total_pnl),
      copy: `${performance?.total_trades ?? 0} closed samples in the evidence journal`,
    },
    {
      label: "Win rate",
      value: formatPct(performance?.win_rate_pct),
      tone: toneFromSigned((performance?.win_rate_pct ?? 0) - 50),
      copy: `Profit factor ${formatNumber(performance?.profit_factor)}`,
    },
    {
      label: "Average drawdown",
      value: formatPct(performance?.average_drawdown),
      tone: "warning",
      copy: "Lower is better while packaging a safe artifact",
    },
    {
      label: "Best evidence lane",
      value: bestPaper ? bestPaper[0] : "No leader yet",
      tone: bestPaper ? toneFromSigned(bestPaper[1].total_pnl) : "neutral",
      copy: bestPaper ? formatSignedCurrency(bestPaper[1].total_pnl) : "Need more trades",
    },
    {
      label: "Best research snapshot",
      value: strongestResearch ? strongestResearch.strategy_id : "No snapshot",
      tone: strongestResearch ? toneFromSigned(strongestResearch.net_profit) : "neutral",
      copy: strongestResearch ? formatSignedCurrency(strongestResearch.net_profit) : "Snapshot unavailable",
    },
    {
      label: "Market heartbeat",
      value: marketHealth?.status ?? "Unknown",
      tone: marketTone,
      copy: Number.isFinite(connectorLatency)
        ? `Connector latency ${formatNumber(connectorLatency)} ms`
        : "Waiting for connector heartbeat",
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

function renderStrategies(strategies, researchSnapshots, performance) {
  const container = document.getElementById("strategy-grid");
  if (!container) {
    return;
  }

  const snapshotMap = new Map((researchSnapshots || []).map((snapshot) => [snapshot.strategy_id, snapshot]));
  const aggregateMap = performance?.by_strategy || {};

  container.innerHTML = strategies
    .map((strategy) => {
      const snapshot = snapshotMap.get(strategy.id);
      const aggregate = aggregateMap[strategy.id] || {
        total_trades: 0,
        total_pnl: 0,
        win_rate_pct: 0,
        average_drawdown: 0,
      };
      const combinedTone =
        aggregate.total_trades > 0 ? toneFromSigned(aggregate.total_pnl) : toneFromSigned(snapshot?.net_profit);
      const winRateWidth = Math.max(4, Math.min(asNumber(aggregate.win_rate_pct), 100));

      return `
        <article class="strategy-card">
          <div class="strategy-header">
            <div>
              <p class="eyebrow">${escapeHtml(strategy.market_regime)}</p>
              <h4>${escapeHtml(strategy.name)}</h4>
            </div>
            <span class="strategy-pill" data-tone="${escapeHtml(combinedTone)}">${escapeHtml(strategy.risk_tier)}</span>
          </div>
          <p class="strategy-copy">${escapeHtml(strategy.description)}</p>
          <div class="metric-stack">
            <div class="metric-tile">
              <p class="eyebrow">Research net</p>
              <strong>${formatSignedCurrency(snapshot?.net_profit)}</strong>
            </div>
            <div class="metric-tile">
              <p class="eyebrow">Research drawdown</p>
              <strong>${formatPct(snapshot?.max_drawdown_pct)}</strong>
            </div>
            <div class="metric-tile">
              <p class="eyebrow">Paper net</p>
              <strong>${formatSignedCurrency(aggregate.total_pnl)}</strong>
            </div>
            <div class="metric-tile">
              <p class="eyebrow">Paper win rate</p>
              <strong>${formatPct(aggregate.win_rate_pct)}</strong>
            </div>
          </div>
          <div>
            <div class="metric-inline">
              <p class="eyebrow">Paper conversion</p>
              <span class="mono">${aggregate.total_trades} trades</span>
            </div>
            <div class="bar-meter"><span style="width:${winRateWidth}%"></span></div>
          </div>
          <p class="helper-text">
            Research PF ${formatNumber(snapshot?.profit_factor)} · Journal drawdown ${formatPct(aggregate.average_drawdown)}
          </p>
        </article>
      `;
    })
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
      <p class="eyebrow">Order submission</p>
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

  const uniqueReasons = [...new Set(guardrails.reasons || [])];
  list.innerHTML = uniqueReasons.length
    ? uniqueReasons
        .map(
          (reason) => `
            <li class="guardrail-item">
              <p>${escapeHtml(reason)}</p>
            </li>
          `,
        )
        .join("")
    : `<li class="guardrail-item"><p>No blocking reasons returned by the API.</p></li>`;
}

function renderConnectors(connectors, marketHealth, ticker) {
  const container = document.getElementById("connector-grid");
  if (!container) {
    return;
  }

  const heartbeatTone = marketHealth?.status === "online" ? "positive" : "warning";
  const priceChange = asNumber(ticker?.priceChangePercent);

  container.innerHTML = `
    <article class="connector-card">
      <p class="eyebrow">Exchange</p>
      <strong>${escapeHtml(connectors.exchange)}</strong>
      <p>${escapeHtml(connectors.binance_base_url)}</p>
    </article>
    <article class="connector-card">
      <p class="eyebrow">Wallet mode</p>
      <strong>${escapeHtml(connectors.wallet_mode)}</strong>
      <p>MetaMask ready: ${connectors.metamask_ready ? "yes" : "no"}</p>
    </article>
    <article class="connector-card">
      <p class="eyebrow">Heartbeat</p>
      <strong class="trend-pill" data-tone="${escapeHtml(heartbeatTone)}">${escapeHtml(marketHealth?.status ?? "unknown")}</strong>
      <p>Latency ${formatNumber(marketHealth?.latency_ms)} ms · 24h change ${formatSignedPct(priceChange)}</p>
    </article>
  `;
}

function renderTrades(trades) {
  const container = document.getElementById("journal-list");
  if (!container) {
    return;
  }

  if (!trades || trades.length === 0) {
    container.innerHTML = `
      <article class="trade-card">
        <p class="eyebrow">No journal samples yet</p>
        <p>Use the artifact flow to generate validated research evidence here.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = trades
    .map((trade) => {
      const tone = toneFromOutcome(trade.outcome);
      return `
        <article class="trade-card">
          <div class="trade-topline">
            <strong class="trade-symbol">${escapeHtml(trade.symbol)} · ${escapeHtml(trade.strategy_id)}</strong>
            <span class="trade-pill" data-tone="${escapeHtml(tone)}">${escapeHtml(trade.outcome)}</span>
          </div>
          <p>${escapeHtml(trade.setup_reason)}</p>
          <div class="trade-meta">
            <span>${escapeHtml(trade.timeframe)} · ${escapeHtml(trade.market_regime)}</span>
            <span>${formatDateTime(trade.entry_time)} -> ${formatDateTime(trade.exit_time)}</span>
          </div>
          <div class="trade-grid">
            <div class="trade-stat">
              <p class="eyebrow">PnL</p>
              <strong>${formatSignedCurrency(trade.pnl)}</strong>
            </div>
            <div class="trade-stat">
              <p class="eyebrow">Drawdown</p>
              <strong>${formatPct(trade.drawdown)}</strong>
            </div>
            <div class="trade-stat">
              <p class="eyebrow">Hold</p>
              <strong>${formatDurationFromSeconds(trade.time_in_trade_seconds)}</strong>
            </div>
            <div class="trade-stat">
              <p class="eyebrow">Exit</p>
              <strong>${escapeHtml(trade.exit_reason ?? "-")}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRuntimeMonitor(runtimeStatus) {
  const container = document.getElementById("runtime-monitor");
  if (!container) {
    return;
  }

  if (!runtimeStatus || !runtimeStatus.tick) {
    container.innerHTML = `
      <article class="runtime-card">
        <p class="eyebrow">No continuous runner</p>
        <p>The hackathon MVP relies on snapshots, journal evidence, and connector health instead of a paper-trading bot loop.</p>
      </article>
    `;
    return;
  }

  const strategyStates = Object.entries(runtimeStatus.tick.strategies || {});
  const summaryCard = `
    <article class="runtime-card">
      <div class="runtime-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(runtimeStatus.symbol)} · ${escapeHtml(runtimeStatus.timeframe)}</p>
          <strong>${escapeHtml(runtimeStatus.state)}</strong>
        </div>
        <span class="trend-pill" data-tone="${escapeHtml(runtimeStatus.tick.market_connector?.status === "online" ? "positive" : "warning")}">
          ${escapeHtml(runtimeStatus.tick.market_connector?.status ?? "unknown")}
        </span>
      </div>
      <p>Latest candle ${formatDateTime(runtimeStatus.tick.candle_timestamp)} · Close ${formatCurrency(runtimeStatus.tick.close)}</p>
      <div class="runtime-grid">
        <div class="runtime-stat">
          <p class="eyebrow">Sample count</p>
          <strong>${escapeHtml(String(runtimeStatus.tick.market_connector?.sample_count ?? 0))}</strong>
        </div>
        <div class="runtime-stat">
          <p class="eyebrow">Connector latency</p>
          <strong>${formatNumber(runtimeStatus.tick.market_connector?.latency_ms)} ms</strong>
        </div>
      </div>
    </article>
  `;

  const strategyCards = strategyStates
    .map(([strategyId, state]) => {
      const signalTone =
        state.signal === "buy" ? "positive" : state.signal === "sell" ? "warning" : "neutral";
      const openState = state.open_position ? "open" : "flat";
      return `
        <article class="runtime-card">
          <div class="runtime-card-header">
            <div>
              <p class="eyebrow">${escapeHtml(strategyId)}</p>
              <strong>${escapeHtml(openState)}</strong>
            </div>
            <span class="trend-pill" data-tone="${escapeHtml(signalTone)}">${escapeHtml(state.signal)}</span>
          </div>
          <div class="runtime-grid">
            <div class="runtime-stat">
              <p class="eyebrow">Equity</p>
              <strong>${formatCurrency(state.equity)}</strong>
            </div>
            <div class="runtime-stat">
              <p class="eyebrow">Realized</p>
              <strong>${formatSignedCurrency(state.realized_pnl)}</strong>
            </div>
            <div class="runtime-stat">
              <p class="eyebrow">Unrealized</p>
              <strong>${formatSignedCurrency(state.unrealized_pnl)}</strong>
            </div>
            <div class="runtime-stat">
              <p class="eyebrow">Last event</p>
              <strong>${escapeHtml(state.last_event ?? "none")}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.innerHTML = `${summaryCard}${strategyCards}`;
}

async function loadDashboard({ manual = false } = {}) {
  const [dashboard, marketHealth, ticker] = await Promise.all([
    fetchJson("/api/dashboard"),
    fetchOptional("/api/market/health"),
    fetchOptional("/api/market/ticker?symbol=BTCUSDT"),
  ]);

  renderHero(dashboard, marketHealth, ticker);
  renderKpis(dashboard.performance, dashboard.research_snapshots, marketHealth);
  renderStrategies(dashboard.strategies, dashboard.research_snapshots, dashboard.performance);
  renderGuardrails(dashboard.guardrails);
  renderConnectors(dashboard.connectors, marketHealth, ticker);
  renderTrades(dashboard.recent_trades);
  renderRuntimeMonitor(dashboard.runtime_status);

  if (manual) {
    showStatus(`Dashboard refreshed at ${new Date().toLocaleTimeString()}.`, "success");
  }
}

async function connectMetaMask() {
  if (!window.ethereum) {
    showStatus("MetaMask not found. Keep wallet mode manual_only until a browser wallet is available.", "warning");
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

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    loadDashboard().catch((error) => {
      console.error(error);
      showStatus("Auto-refresh failed. Keeping the latest successful snapshot on screen.", "warning");
    });
  }, 60_000);
}

const refreshButton = document.getElementById("refresh-button");
if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadDashboard({ manual: true }).catch((error) => {
      console.error(error);
      showStatus("Could not refresh dashboard.", "error");
    });
  });
}

const connectButton = document.getElementById("connect-wallet-button");
if (connectButton) {
  connectButton.addEventListener("click", connectMetaMask);
}

loadDashboard()
  .then(startAutoRefresh)
  .catch((error) => {
    console.error(error);
    const topRuntimeBadge = document.getElementById("top-runtime-badge");
    if (topRuntimeBadge) {
      topRuntimeBadge.textContent = "API offline";
    }
    showStatus("API offline. Start the FastAPI service to populate the control room.", "error");
  });
