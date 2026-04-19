const API_BASE_URL = "http://127.0.0.1:8010";

function formatNumber(value, suffix = "") {
  const number = Number(value ?? 0);
  return `${number.toFixed(2)}${suffix}`;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function renderConnectors(connectors) {
  const connectorList = document.getElementById("connector-list");
  connectorList.innerHTML = `
    <div class="connector-item">
      <p class="label">Exchange</p>
      <strong>${connectors.exchange}</strong>
      <p>${connectors.binance_base_url}</p>
    </div>
    <div class="connector-item">
      <p class="label">Wallet mode</p>
      <strong>${connectors.wallet_mode}</strong>
      <p>MetaMask ready: ${connectors.metamask_ready ? "yes" : "no"}</p>
    </div>
  `;
}

function renderStrategies(strategies) {
  const strategyList = document.getElementById("strategy-list");
  strategyList.innerHTML = strategies
    .map(
      (strategy) => `
        <div class="strategy-item">
          <strong>${strategy.name}</strong>
          <p>${strategy.description}</p>
          <p class="label">Best regime: ${strategy.market_regime}</p>
        </div>
      `,
    )
    .join("");
}

function renderGuardrails(guardrails) {
  document.getElementById("runtime-mode").textContent = guardrails.mode;
  document.getElementById("guardrail-copy").textContent =
    guardrails.can_submit_testnet_orders
      ? "Testnet guarded mode armed; manual wallet signature remains required."
      : "Paper mode remains active until explicit human approval unlocks guarded testnet execution.";

  document.getElementById("guardrail-reasons").innerHTML = guardrails.reasons
    .map((reason) => `<li>${reason}</li>`)
    .join("");
}

function renderMetrics(metrics) {
  document.getElementById("net-profit").textContent = formatNumber(metrics.net_profit, " USD");
  document.getElementById("return-pct").textContent = formatNumber(metrics.total_return_pct, "%");
  document.getElementById("drawdown-pct").textContent = formatNumber(metrics.max_drawdown_pct, "%");
  document.getElementById("profit-factor").textContent = formatNumber(metrics.profit_factor);
}

async function loadDashboard() {
  const dashboard = await fetchJson("/api/dashboard");
  renderMetrics(dashboard.metrics);
  renderGuardrails(dashboard.guardrails);
  renderConnectors(dashboard.connectors);
  renderStrategies(dashboard.strategies);
}

async function connectMetaMask() {
  if (!window.ethereum) {
    window.alert("MetaMask not found. Keep wallet mode manual_only until a browser wallet is available.");
    return;
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    window.alert("Wallet connected for manual signature flow.");
  } catch (error) {
    window.alert(`Wallet connection failed: ${error.message}`);
  }
}

document.getElementById("refresh-button").addEventListener("click", () => {
  loadDashboard().catch((error) => {
    console.error(error);
    window.alert("Could not refresh dashboard.");
  });
});

document.getElementById("connect-wallet-button").addEventListener("click", connectMetaMask);

loadDashboard().catch((error) => {
  console.error(error);
  document.getElementById("runtime-mode").textContent = "offline";
  document.getElementById("guardrail-copy").textContent = "API offline. Start the FastAPI service to view metrics.";
});
