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
    <div class="connector-item">
      <p class="label">Market heartbeat</p>
      <strong>${escapeHtml(marketHealth.status ?? "unknown")}</strong>
      <p>Latency: ${formatNumber(marketHealth.latency_ms ?? 0, " ms")}</p>
      <p>${escapeHtml(marketHealth.last_error ?? "Testnet connector responsive.")}</p>
    </div>
  `;
}

function renderGuardrails(guardrails) {
  setText("runtime-mode", guardrails.mode);
  setText(
    "guardrail-copy",
    guardrails.can_submit_testnet_orders
      ? "Testnet guarded mode armed; manual wallet signature remains required."
      : "Paper mode remains active until explicit human approval unlocks guarded testnet execution.",
  );
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
  try {
    const [dashboard, marketHealth] = await Promise.all([
      fetchJson("/api/dashboard"),
      fetchJson("/api/market/health"),
    ]);
    renderGuardrails(dashboard.guardrails);
    renderConnectors(dashboard.connectors, marketHealth || {});
  } catch (error) {
    console.error(error);
    setText("runtime-mode", "offline");
    setText(
      "guardrail-copy",
      "API offline. Start the FastAPI service to view metrics.",
    );
    showStatus("API offline — dashboard will retry on refresh.", "error");
  }
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
    loadDashboard();
  });
}

const connectButton = document.getElementById("connect-wallet-button");
if (connectButton) {
  connectButton.addEventListener("click", connectMetaMask);
}

// Economic Flow Logic
const artifactSelectionView = document.getElementById("artifact-selection-view");
const economicFlowView = document.getElementById("economic-flow-view");
const btnReset = document.getElementById("btn-reset");
const btnPay = document.getElementById("btn-pay");
const btnDownload = document.getElementById("btn-download");

const stepPayment = document.getElementById("step-payment");
const stepJob = document.getElementById("step-job");
const stepReview = document.getElementById("step-review");
const stepDelivery = document.getElementById("step-delivery");

function resetFlow() {
  artifactSelectionView.hidden = false;
  economicFlowView.hidden = true;
  
  [stepPayment, stepJob, stepReview, stepDelivery].forEach(step => {
    step.classList.remove("active", "completed");
    step.classList.add("pending");
    step.querySelector(".step-status").textContent = "Waiting";
  });
  
  stepPayment.classList.remove("pending");
  stepPayment.classList.add("active");
  stepPayment.querySelector(".step-status").textContent = "Pending";
  
  btnPay.disabled = false;
  btnPay.textContent = "Sign Transaction (Stub)";
  btnDownload.hidden = true;
  btnDownload.textContent = "Download Artifact";
  stepDelivery.querySelector("p").textContent = "Artifact is locked until payment and review clear.";
}

function updateStepStatus(stepElement, statusClass, statusText) {
  stepElement.classList.remove("pending", "active", "completed");
  stepElement.classList.add(statusClass);
  stepElement.querySelector(".step-status").textContent = statusText;
}

document.querySelectorAll(".action-select-artifact").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const artifactName = e.target.getAttribute("data-artifact");
    const price = e.target.getAttribute("data-price");
    
    setText("selected-artifact-name", artifactName);
    setText("flow-price", price);
    
    resetFlow();
    artifactSelectionView.hidden = true;
    economicFlowView.hidden = false;
  });
});

if (btnReset) {
  btnReset.addEventListener("click", resetFlow);
}

if (btnPay) {
  btnPay.addEventListener("click", async () => {
    btnPay.disabled = true;
    btnPay.textContent = "Processing...";
    
    // Simulate payment transaction
    await new Promise(r => setTimeout(r, 1000));
    updateStepStatus(stepPayment, "completed", "Paid");
    updateStepStatus(stepJob, "active", "Processing");
    
    // Simulate Job state
    await new Promise(r => setTimeout(r, 2000));
    updateStepStatus(stepJob, "completed", "Done");
    updateStepStatus(stepReview, "active", "Validating");
    
    // Simulate Review state
    await new Promise(r => setTimeout(r, 2000));
    updateStepStatus(stepReview, "completed", "Approved");
    updateStepStatus(stepDelivery, "active", "Unlocked");
    
    // Unlock Delivery
    stepDelivery.querySelector("p").textContent = "Artifact successfully validated and unlocked.";
    btnDownload.hidden = false;
  });
}

if (btnDownload) {
  btnDownload.addEventListener("click", () => {
    btnDownload.textContent = "Downloaded!";
    updateStepStatus(stepDelivery, "completed", "Delivered");
  });
}

// Init
loadDashboard();
