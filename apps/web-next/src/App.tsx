import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Check,
  Copy,
  CreditCard,
  Download,
  FileText,
  KeyRound,
  LogOut,
  Play,
  Radio,
  Settings,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  API_BASE,
  API_ROOT,
  Account,
  ArcJobProof,
  ApiKeyRecord,
  AuditEvent,
  BillableArtifact,
  CopilotProposal,
  Dashboard,
  Health,
  NexusJob,
  PaymentIntentRecord,
  Usage,
  api,
} from "./lib/api";

type View = "dashboard" | "keys" | "billing" | "invoices" | "settings" | "audit" | "status";
type NoticeType = "ok" | "error";
type Notice = { type: NoticeType; text: string } | null;
type DataMode = "live" | "fallback";

const money = (value = 0) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const compactDate = (value: string | null | undefined) => {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
};

const demoBuyerAddress = "0x000000000000000000000000000000000000dEaD";
const demoTimestamp = "2026-05-02T12:00:00.000Z";

const shortId = (value: string | null | undefined) => (value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "not issued");

const demoAccount: Account = {
  email: "demo@tothemoon.local",
  org_id: 1,
  organization: "Pitch Demo Workspace",
  plan: "pro",
  created_at: demoTimestamp,
};

const demoDashboard: Dashboard = {
  email: demoAccount.email,
  org_id: demoAccount.org_id,
  plan: demoAccount.plan,
  requests_this_month: 4280,
  simulated_volume_usd: 128450,
  active_api_keys: 1,
  total_simulated_trades: 86,
  total_volume_usd: 128450,
  total_fees_usd: 321.12,
  realized_pnl_usd: 7420.5,
  unrealized_pnl_usd: 1180.75,
  last_30_days_chart_points: [
    { date: "2026-04-26", trades: 8, volume_usd: 12100 },
    { date: "2026-04-27", trades: 11, volume_usd: 16200 },
    { date: "2026-04-28", trades: 9, volume_usd: 13800 },
    { date: "2026-04-29", trades: 14, volume_usd: 22400 },
    { date: "2026-04-30", trades: 17, volume_usd: 28600 },
    { date: "2026-05-01", trades: 12, volume_usd: 18750 },
    { date: "2026-05-02", trades: 15, volume_usd: 26600 },
  ],
};

const demoUsage: Usage = {
  requests_today: 184,
  requests_month: demoDashboard.requests_this_month,
  plan: demoAccount.plan,
  quota: { simulate_order: 100000, token_audit: 1000, active_api_keys: 3 },
};

const demoKeys: ApiKeyRecord[] = [
  {
    id: 7,
    org_id: demoAccount.org_id,
    name: "demo pitch key",
    prefix: "ttm_sk_demo",
    scopes: "simulate",
    last_used_at: "2026-05-02T11:58:00.000Z",
    revoked_at: null,
    created_at: demoTimestamp,
  },
];

const demoProposals: CopilotProposal[] = [
  {
    id: 11,
    org_id: demoAccount.org_id,
    token_address: "0xMOON",
    chain: "base",
    symbol: "MOON",
    side: "BUY",
    amount_usd: 100,
    score: 0.91,
    rationale: "High-conviction demo proposal with tax and slippage guardrails enabled.",
    mode: "paper",
    status: "pending",
    execution_payload: null,
    created_at: demoTimestamp,
    updated_at: demoTimestamp,
    approved_at: null,
  },
];

const demoAuditEvents: AuditEvent[] = [
  {
    id: 1,
    org_id: demoAccount.org_id,
    actor_id: 1,
    actor_type: "system",
    action: "demo.fallback_enabled",
    target_type: "workspace",
    target_id: "pitch-demo",
    ip: null,
    ua: null,
    before: null,
    after: { source: "local demo fixture" },
    created_at: demoTimestamp,
  },
];

const demoHealth: Health = {
  ok: false,
  app: "ToTheMoonTokens",
  mode: "demo fallback",
  orderSubmissionEnabled: false,
  providers: {
    api: { status: "degraded", latency_ms: null, last_error: "Live backend unavailable; local demo data is active." },
    payments: { status: "skipped", latency_ms: null, last_error: "Mutating payment actions require the live backend." },
  },
};

const demoArtifacts: BillableArtifact[] = [
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
];

const demoPaymentOrders: PaymentIntentRecord[] = [
  {
    payment_id: "pay_demo_1234567890",
    artifact_id: "artifact_delivery_packet",
    artifact_name: "Delivery Packet",
    artifact_type: "delivery_packet",
    amount_usd: 0.001,
    buyer_address: demoBuyerAddress,
    deposit_address: "0xDemoDepositAddressForFallbackOnly",
    job_id: "nexus-pay-demo",
    status: "pending",
    settlement_status: "PENDING",
    reason: null,
    tx_hash: null,
    circle_transaction_id: null,
    executed: false,
    download_url: null,
    execution_message: null,
    created_at: demoTimestamp,
    updated_at: demoTimestamp,
  },
];

const demoNexusJob: NexusJob = {
  id: "nexus-pay-demo",
  description: "Paid work unit for Delivery Packet",
  state: "REQUESTED",
  payment_id: demoPaymentOrders[0].payment_id,
  artifact_id: demoPaymentOrders[0].artifact_id,
  artifact_type: demoPaymentOrders[0].artifact_type,
  amount_usdc: demoPaymentOrders[0].amount_usd,
  buyer_address: demoBuyerAddress,
  settlement_status: "PENDING",
  tx_hash: null,
  download_url: null,
  history: [{ state: "REQUESTED", reason: "Payment intent created", at: demoTimestamp }],
};

const demoArcProofs: ArcJobProof[] = [
  {
    job_id: "job_arc_1_1777723260",
    task_id: "work-unit-demo",
    agent_id: "agent-demo",
    status: "escrowed",
    proof_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    timestamp: "2026-05-02T12:01:00.000Z",
    metadata: { source: "fallback_demo", onchain_write: "stubbed" },
    work_unit_id: "work-unit-demo",
    payment_id: demoPaymentOrders[0].payment_id,
    payment_status: "pending",
    settlement_status: "PENDING",
    tx_hash: null,
    onchain_write_status: "stubbed",
  },
];

function applyDemoFallback(message: string) {
  return {
    account: demoAccount,
    dashboard: demoDashboard,
    usage: demoUsage,
    keys: demoKeys,
    proposals: demoProposals,
    auditEvents: demoAuditEvents,
    health: demoHealth,
    artifacts: demoArtifacts,
    paymentOrders: demoPaymentOrders,
    selectedPaymentId: demoPaymentOrders[0]?.payment_id || null,
    nexusJob: demoNexusJob,
    arcProofs: demoArcProofs,
    error: message,
  };
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [jwt, setJwt] = useState(() => localStorage.getItem("ttm_jwt"));
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("ttm_api_key") || "");
  const [account, setAccount] = useState<Account | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [proposals, setProposals] = useState<CopilotProposal[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [artifacts, setArtifacts] = useState<BillableArtifact[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentIntentRecord[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState("artifact_delivery_packet");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [nexusJob, setNexusJob] = useState<NexusJob | null>(null);
  const [arcProofs, setArcProofs] = useState<ArcJobProof[]>([]);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("live");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keyName, setKeyName] = useState("default");
  const [tokenAddress, setTokenAddress] = useState("0xSAFE");
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const isSignedIn = Boolean(jwt);

  const chartData = useMemo(() => {
    return (dashboard?.last_30_days_chart_points || []).map((point) => ({
      ...point,
      label: point.date.slice(5),
    }));
  }, [dashboard]);

  const activePayment = useMemo(() => {
    return paymentOrders.find((payment) => payment.payment_id === selectedPaymentId) || paymentOrders[0] || null;
  }, [paymentOrders, selectedPaymentId]);

  const selectedArtifact = useMemo(() => {
    return artifacts.find((artifact) => artifact.id === selectedArtifactId) || artifacts[0] || null;
  }, [artifacts, selectedArtifactId]);

  const activeArcProof = useMemo(() => {
    return arcProofs.find((proof) => proof.payment_id === activePayment?.payment_id) || arcProofs[0] || null;
  }, [activePayment?.payment_id, arcProofs]);

  async function loadHealth() {
    setHealth(await api.health());
  }

  async function loadLifecycle(jobId?: string | null) {
    const [artifactResult, orderResult, proofResult] = await Promise.allSettled([api.artifacts(), api.paymentOrders(), api.arcJobs()]);
    if (artifactResult.status === "fulfilled") {
      setArtifacts(artifactResult.value);
      setSelectedArtifactId((current) => (artifactResult.value.some((artifact) => artifact.id === current) ? current : artifactResult.value[0]?.id || current));
    } else {
      setArtifacts(demoArtifacts);
      setSelectedArtifactId((current) => (demoArtifacts.some((artifact) => artifact.id === current) ? current : demoArtifacts[0]?.id || current));
    }
    if (orderResult.status === "fulfilled") {
      setPaymentOrders(orderResult.value);
      setSelectedPaymentId((current) => current || orderResult.value[0]?.payment_id || null);
    } else {
      setPaymentOrders(demoPaymentOrders);
      setSelectedPaymentId((current) => current || demoPaymentOrders[0]?.payment_id || null);
    }
    if (proofResult.status === "fulfilled") setArcProofs(proofResult.value);
    else setArcProofs(demoArcProofs);

    const latestJobId = jobId || (orderResult.status === "fulfilled" ? orderResult.value[0]?.job_id : activePayment?.job_id);
    if (latestJobId) {
      try {
        setNexusJob(await api.nexusJob(latestJobId));
      } catch {
        setNexusJob(demoNexusJob);
      }
    }

    const failed = [artifactResult, orderResult, proofResult].find((result) => result.status === "rejected");
    if (failed) setDataMode("fallback");
    setLifecycleError(failed ? "Paid lifecycle metadata is unavailable; showing safe demo placeholders." : null);
    return Boolean(failed);
  }

  function enableFallback(message: string) {
    const fallback = applyDemoFallback(message);
    setAccount(fallback.account);
    setDashboard(fallback.dashboard);
    setUsage(fallback.usage);
    setKeys(fallback.keys);
    setProposals(fallback.proposals);
    setAuditEvents(fallback.auditEvents);
    setHealth(fallback.health);
    setArtifacts(fallback.artifacts);
    setPaymentOrders(fallback.paymentOrders);
    setSelectedPaymentId(fallback.selectedPaymentId);
    setNexusJob(fallback.nexusJob);
    setArcProofs(fallback.arcProofs);
    setLifecycleError("Paid lifecycle metadata is unavailable; showing safe demo placeholders.");
    setDataError(fallback.error);
    setDataMode("fallback");
  }

  async function loadAll(activeToken = jwt) {
    if (!activeToken) return;
    setLoadingData(true);
    setDataError(null);
    try {
      const [healthResult, accountResult, dashboardResult, usageResult, keyResult, proposalResult, auditResult] = await Promise.allSettled([
        api.health(),
        api.account(activeToken),
        api.dashboard(activeToken),
        api.usage(activeToken),
        api.apiKeys(activeToken),
        api.proposals(activeToken),
        api.auditLog(activeToken),
      ]);
      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      else setHealth(demoHealth);
      if (accountResult.status === "fulfilled") setAccount(accountResult.value);
      else setAccount(demoAccount);
      if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
      else setDashboard(demoDashboard);
      if (usageResult.status === "fulfilled") setUsage(usageResult.value);
      else setUsage(demoUsage);
      if (keyResult.status === "fulfilled") setKeys(keyResult.value);
      else setKeys(demoKeys);
      if (proposalResult.status === "fulfilled") setProposals(proposalResult.value.proposals);
      else setProposals(demoProposals);
      if (auditResult.status === "fulfilled") setAuditEvents(auditResult.value.events);
      else setAuditEvents(demoAuditEvents);
      const lifecycleFallback = await loadLifecycle();

      const failures = [healthResult, accountResult, dashboardResult, usageResult, keyResult, proposalResult, auditResult].filter(
        (result) => result.status === "rejected",
      );
      if (failures.length > 0) {
        const firstFailure = failures[0];
        const fallback = "Some dashboard data could not be refreshed.";
        setDataError(firstFailure.status === "rejected" && firstFailure.reason instanceof Error ? firstFailure.reason.message : fallback);
        setDataMode("fallback");
      } else if (lifecycleFallback) {
        setDataError("Paid lifecycle metadata could not be refreshed.");
        setDataMode("fallback");
      } else {
        setDataMode("live");
      }
    } finally {
      setLoadingData(false);
    }
  }

  function show(type: NoticeType, text: string) {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3200);
  }

  async function signIn(mode: "login" | "signup") {
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.signup(email.trim(), password);
      }
      const result = await api.login(email.trim(), password);
      localStorage.setItem("ttm_jwt", result.access_token);
      setJwt(result.access_token);
      await loadAll(result.access_token);
      show("ok", mode === "signup" ? "Account created." : "Signed in.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      const fallbackToken = "demo-fallback-token";
      localStorage.setItem("ttm_jwt", fallbackToken);
      setJwt(fallbackToken);
      enableFallback(message);
      show("ok", "Live login failed; demo fallback active.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem("ttm_jwt");
    sessionStorage.removeItem("ttm_api_key");
    setJwt(null);
    setApiKey("");
    setAccount(null);
    setDashboard(null);
    setUsage(null);
    setKeys([]);
    setProposals([]);
    setAuditEvents([]);
    setDataError(null);
    setDataMode("live");
    show("ok", "Signed out.");
  }

  async function createKey() {
    if (!jwt) return;
    if (dataMode === "fallback") {
      const demoKey = "ttm_sk_demo_fallback_only";
      sessionStorage.setItem("ttm_api_key", demoKey);
      setApiKey(demoKey);
      show("ok", "Demo API key staged locally.");
      return;
    }
    setBusy(true);
    try {
      const created = await api.createApiKey(jwt, keyName.trim() || "default");
      sessionStorage.setItem("ttm_api_key", created.plaintext);
      setApiKey(created.plaintext);
      await loadAll();
      show("ok", "API key created.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Key creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyActiveKey() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      show("ok", "API key copied.");
    } catch {
      show("error", "Copy failed. Select the key manually.");
    }
  }

  async function revokeKey(id: number) {
    if (!jwt) return;
    if (dataMode === "fallback") {
      setKeys((current) => current.map((key) => (key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key)));
      show("ok", "Demo API key marked revoked locally.");
      return;
    }
    setBusy(true);
    try {
      await api.revokeApiKey(jwt, id);
      await loadAll();
      show("ok", "API key revoked.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Revoke failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runSimulation() {
    if (!apiKey) {
      show("error", "Set an API key.");
      return;
    }
    if (dataMode === "fallback") {
      setDashboard((current) => ({
        ...(current || demoDashboard),
        requests_this_month: (current?.requests_this_month || demoDashboard.requests_this_month) + 1,
        total_simulated_trades: (current?.total_simulated_trades || demoDashboard.total_simulated_trades || 0) + 1,
      }));
      show("ok", "Demo simulation recorded locally.");
      return;
    }
    setBusy(true);
    try {
      await api.simulate(apiKey, tokenAddress.trim(), amount);
      await loadAll();
      show("ok", "Simulation recorded.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(planCode: "pro" | "enterprise") {
    if (!jwt) return;
    if (dataMode === "fallback") {
      setUsage((current) => ({ ...(current || demoUsage), plan: planCode }));
      setAccount((current) => ({ ...(current || demoAccount), plan: planCode }));
      show("ok", "Demo plan selected locally.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.checkout(jwt, planCode);
      window.open(result.url, "_blank", "noopener,noreferrer");
      show("ok", "Checkout opened.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approveProposal(id: number) {
    if (!jwt) return;
    if (dataMode === "fallback") {
      setProposals((current) =>
        current.map((proposal) => (proposal.id === id ? { ...proposal, status: "approved", approved_at: new Date().toISOString() } : proposal)),
      );
      show("ok", "Demo proposal approved locally.");
      return;
    }
    setBusy(true);
    try {
      await api.approveProposal(jwt, id);
      await loadAll();
      show("ok", "Proposal executed.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createPaymentIntent() {
    if (!selectedArtifact) return;
    if (dataMode === "fallback") {
      setPaymentOrders(demoPaymentOrders);
      setSelectedPaymentId(demoPaymentOrders[0].payment_id);
      setNexusJob(demoNexusJob);
      show("ok", "Demo payment requirement staged locally.");
      return;
    }
    setBusy(true);
    try {
      const intent = await api.createPaymentIntent(selectedArtifact.id, demoBuyerAddress);
      setSelectedPaymentId(intent.payment_id);
      await loadLifecycle(intent.job_id);
      show("ok", "Payment requirement created.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Payment setup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyPayment() {
    if (!activePayment) return;
    if (dataMode === "fallback") {
      const verifiedPayment: PaymentIntentRecord = {
        ...activePayment,
        status: "verified",
        settlement_status: "SETTLED",
        tx_hash: "0xMockTransactionHash",
        updated_at: new Date().toISOString(),
      };
      setPaymentOrders([verifiedPayment]);
      setNexusJob({ ...demoNexusJob, state: "PAYMENT_UNLOCKED", settlement_status: "SETTLED", tx_hash: verifiedPayment.tx_hash });
      setArcProofs(demoArcProofs.map((proof) => ({ ...proof, payment_status: "verified", settlement_status: "SETTLED", tx_hash: verifiedPayment.tx_hash })));
      show("ok", "Demo payment verified locally.");
      return;
    }
    setBusy(true);
    try {
      await api.verifyPayment(activePayment.payment_id, "0xMockTransactionHash");
      await loadLifecycle(activePayment.job_id);
      show("ok", "Payment verified.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Payment verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function unlockDelivery() {
    if (!activePayment) return;
    if (dataMode === "fallback") {
      const deliveredPayment: PaymentIntentRecord = {
        ...activePayment,
        status: "verified",
        settlement_status: "SETTLED",
        executed: true,
        download_url: "https://example.test/delivery-packet.json",
        execution_message: "Demo delivery unlocked locally after fallback verification.",
        updated_at: new Date().toISOString(),
      };
      setPaymentOrders([deliveredPayment]);
      setNexusJob({ ...demoNexusJob, state: "DELIVERED", settlement_status: "SETTLED", tx_hash: deliveredPayment.tx_hash, download_url: deliveredPayment.download_url });
      show("ok", "Demo delivery unlocked locally.");
      return;
    }
    setBusy(true);
    try {
      await api.executePayment(activePayment.artifact_id, activePayment.payment_id);
      await loadLifecycle(activePayment.job_id);
      show("ok", "Delivery unlocked.");
    } catch (error) {
      show("error", error instanceof Error ? error.message : "Delivery unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (view !== "status" || health) return;
    loadHealth().catch(() => undefined);
  }, [health, view]);

  useEffect(() => {
    if (!jwt || dataMode === "fallback") return;
    const controller = new AbortController();
    fetch(`${API_BASE}/copilot/stream?once=true`, {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const event of events) {
            const line = event.split("\n").find((item) => item.startsWith("data: "));
            if (!line) continue;
            const proposal = JSON.parse(line.slice(6)) as CopilotProposal;
            setProposals((current) => [proposal, ...current.filter((item) => item.id !== proposal.id)]);
          }
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [dataMode, jwt]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Shield size={24} />
          <div>
            <strong>TTM</strong>
            <span>Agent Market</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary">
          <NavButton icon={<BarChart3 size={18} />} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <NavButton icon={<KeyRound size={18} />} label="API Keys" active={view === "keys"} onClick={() => setView("keys")} />
          <NavButton icon={<CreditCard size={18} />} label="Billing" active={view === "billing"} onClick={() => setView("billing")} />
          <NavButton icon={<FileText size={18} />} label="Invoices" active={view === "invoices"} onClick={() => setView("invoices")} />
          <NavButton icon={<Settings size={18} />} label="Settings" active={view === "settings"} onClick={() => setView("settings")} />
          <NavButton icon={<Activity size={18} />} label="Audit Log" active={view === "audit"} onClick={() => setView("audit")} />
          <NavButton icon={<Radio size={18} />} label="Status" active={view === "status"} onClick={() => setView("status")} />
        </nav>
        <div className="sidebar-footer">
          <span>{account?.plan || "free"}</span>
          <span>{health?.mode || "paper"}</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{account?.organization || "Workspace"}</p>
            <h1>{titleFor(view)}</h1>
          </div>
          {isSignedIn ? (
            <div className="user-chip">
              <span>{account?.email || "Signed in"}</span>
              <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <AuthBar
              email={email}
              password={password}
              busy={busy}
              onEmail={setEmail}
              onPassword={setPassword}
              onLogin={() => signIn("login")}
              onSignup={() => signIn("signup")}
            />
          )}
        </header>

        {!isSignedIn ? <SignedOutPanel /> : null}
        {isSignedIn && dataMode === "fallback" ? <DegradedNotice message={dataError || "Live backend unavailable."} onRetry={() => loadAll()} busy={loadingData} /> : null}
        {isSignedIn && dataMode !== "fallback" && dataError ? <RecoverableError message={dataError} busy={loadingData} onRetry={() => loadAll()} /> : null}

        {isSignedIn && view === "dashboard" ? (
          <DashboardView
            dashboard={dashboard}
            usage={usage}
            chartData={chartData}
            proposals={proposals}
            loading={loadingData}
            tokenAddress={tokenAddress}
            amount={amount}
            busy={busy}
            onTokenAddress={setTokenAddress}
            onAmount={setAmount}
            onSimulate={runSimulation}
            onApprove={approveProposal}
            artifacts={artifacts}
            selectedArtifactId={selectedArtifactId}
            selectedArtifact={selectedArtifact}
            activePayment={activePayment}
            nexusJob={nexusJob}
            activeArcProof={activeArcProof}
            lifecycleError={lifecycleError}
            onSelectedArtifact={setSelectedArtifactId}
            onCreatePayment={createPaymentIntent}
            onVerifyPayment={verifyPayment}
            onUnlockDelivery={unlockDelivery}
          />
        ) : null}
        {isSignedIn && view === "keys" ? (
          <KeysView
            keys={keys}
            apiKey={apiKey}
            keyName={keyName}
            loading={loadingData}
            busy={busy}
            onApiKey={setApiKey}
            onKeyName={setKeyName}
            onCreate={createKey}
            onCopy={copyActiveKey}
            onRevoke={revokeKey}
          />
        ) : null}
        {isSignedIn && view === "billing" ? <BillingView usage={usage} loading={loadingData} busy={busy} onCheckout={checkout} /> : null}
        {isSignedIn && view === "invoices" ? <InvoicesView jwt={jwt} /> : null}
        {isSignedIn && view === "settings" ? <SettingsView account={account} loading={loadingData} onSignOut={signOut} /> : null}
        {isSignedIn && view === "audit" ? <AuditLogView events={auditEvents} proposals={proposals} keys={keys} loading={loadingData} /> : null}
        {view === "status" ? <StatusView health={health} loading={loadingData} /> : null}
      </main>
      {notice ? <div className={`toast toast-${notice.type}`}>{notice.text}</div> : null}
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AuthBar({
  email,
  password,
  busy,
  onEmail,
  onPassword,
  onLogin,
  onSignup,
}: {
  email: string;
  password: string;
  busy: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <div className="auth-bar">
      <input value={email} onChange={(event) => onEmail(event.target.value)} placeholder="email@company.com" autoComplete="email" />
      <input
        value={password}
        onChange={(event) => onPassword(event.target.value)}
        placeholder="Password"
        type="password"
        autoComplete="current-password"
      />
      <button className="secondary-button" disabled={busy} onClick={onLogin}>
        Login
      </button>
      <button className="primary-button" disabled={busy} onClick={onSignup}>
        <UserPlus size={16} />
        Signup
      </button>
    </div>
  );
}

function SignedOutPanel() {
  return (
    <section className="empty-state">
      <Shield size={28} />
      <strong>Sign in to continue</strong>
    </section>
  );
}

function RecoverableError({ message, busy, onRetry }: { message: string; busy: boolean; onRetry: () => void }) {
  return (
    <section className="error-banner" role="alert">
      <div>
        <strong>Data refresh failed</strong>
        <span>{message}</span>
      </div>
      <button className="secondary-button" disabled={busy} onClick={onRetry}>
        {busy ? "Retrying…" : "Retry"}
      </button>
    </section>
  );
}

function DegradedNotice({ message, busy, onRetry }: { message: string; busy: boolean; onRetry: () => void }) {
  return (
    <section className="degraded-banner" role="status" aria-live="polite">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>Demo fallback active</strong>
        <span>{message} Live backend data is used automatically when it recovers.</span>
      </div>
      <button className="secondary-button" disabled={busy} onClick={onRetry}>
        {busy ? "Checking…" : "Retry live"}
      </button>
    </section>
  );
}

function DashboardView({
  dashboard,
  usage,
  chartData,
  proposals,
  loading,
  tokenAddress,
  amount,
  busy,
  onTokenAddress,
  onAmount,
  onSimulate,
  onApprove,
  artifacts,
  selectedArtifactId,
  selectedArtifact,
  activePayment,
  nexusJob,
  activeArcProof,
  lifecycleError,
  onSelectedArtifact,
  onCreatePayment,
  onVerifyPayment,
  onUnlockDelivery,
}: {
  dashboard: Dashboard | null;
  usage: Usage | null;
  chartData: Array<{ label: string; trades: number; volume_usd: number }>;
  proposals: CopilotProposal[];
  loading: boolean;
  tokenAddress: string;
  amount: number;
  busy: boolean;
  onTokenAddress: (value: string) => void;
  onAmount: (value: number) => void;
  onSimulate: () => void;
  onApprove: (id: number) => void;
  artifacts: BillableArtifact[];
  selectedArtifactId: string;
  selectedArtifact: BillableArtifact | null;
  activePayment: PaymentIntentRecord | null;
  nexusJob: NexusJob | null;
  activeArcProof: ArcJobProof | null;
  lifecycleError: string | null;
  onSelectedArtifact: (value: string) => void;
  onCreatePayment: () => void;
  onVerifyPayment: () => void;
  onUnlockDelivery: () => void;
}) {
  const hasChartData = chartData.length > 0;
  const deliveryUnlocked = Boolean(activePayment?.download_url || nexusJob?.state === "DELIVERED");
  const nextLifecycleAction = deliveryUnlocked
    ? "Delivery is unlocked. Download URL and Arc proof metadata are ready for handoff."
    : activePayment?.status === "verified"
      ? "Payment is verified. Unlock delivery to complete the paid work unit."
      : activePayment
        ? "Payment requirement is open. Verify the test transaction before delivery unlocks."
        : "Select an artifact and create a payment requirement to start the gated flow.";
  const lifecycleSteps = [
    { label: "1 · Price", complete: Boolean(selectedArtifact), helper: selectedArtifact ? `${selectedArtifact.name} selected` : "Choose a priced artifact" },
    { label: "2 · Escrow", complete: Boolean(activePayment), helper: activePayment?.status || "Create a payment requirement" },
    { label: "3 · Verify", complete: activePayment?.status === "verified", helper: activePayment?.settlement_status || "Waiting for settlement" },
    { label: "4 · Deliver", complete: deliveryUnlocked, helper: deliveryUnlocked ? "Artifact unlocked" : "Locked until verification" },
  ];
  return (
    <div className="page-stack">
      {loading && !dashboard ? (
        <MetricsSkeleton />
      ) : (
        <section className="metrics-grid">
          <Metric label="Trades" value={String(dashboard?.total_simulated_trades || 0)} />
          <Metric label="Volume" value={money(dashboard?.total_volume_usd)} />
          <Metric label="Fees" value={money(dashboard?.total_fees_usd)} />
          <Metric label="P&L" value={money((dashboard?.realized_pnl_usd || 0) + (dashboard?.unrealized_pnl_usd || 0))} />
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>30d Activity</h2>
          <span>{usage?.requests_month || 0} requests</span>
        </div>
        <div className="chart-frame">
          {loading && !dashboard ? <PanelSkeleton rows={5} /> : null}
          {!loading && !hasChartData ? <EmptyState title="No activity yet" description="Run a simulation to populate the 30-day activity chart." /> : null}
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="volume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f9d78" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1f9d78" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e3e0d9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="volume_usd" stroke="#1f9d78" fill="url(#volume)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </section>

      <section className="panel lifecycle-panel" aria-labelledby="paid-agent-lifecycle-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Demo only · Arc testnet metadata</p>
            <h2 id="paid-agent-lifecycle-title">Paid Agent Lifecycle</h2>
          </div>
          <span className="status-pill skipped">No mainnet execution</span>
        </div>

        {lifecycleError ? <p className="inline-warning">{lifecycleError}</p> : null}

        <div className="lifecycle-next" role="status" aria-live="polite">
          <span>Next action</span>
          <strong>{nextLifecycleAction}</strong>
        </div>

        <ol className="lifecycle-steps" aria-label="Paid lifecycle progress">
          {lifecycleSteps.map((step) => (
            <li className={step.complete ? "complete" : ""} key={step.label}>
              <strong>{step.label}</strong>
              <span>{step.helper}</span>
            </li>
          ))}
        </ol>

        <div className="lifecycle-grid">
          <div className="artifact-options" role="radiogroup" aria-label="Priced artifact options">
            {artifacts.length === 0 ? <PanelSkeleton rows={3} /> : null}
            {artifacts.map((artifact) => (
              <button
                className={`artifact-card ${artifact.id === selectedArtifactId ? "selected" : ""}`}
                key={artifact.id}
                onClick={() => onSelectedArtifact(artifact.id)}
                role="radio"
                aria-checked={artifact.id === selectedArtifactId}
              >
                <span>{artifact.name}</span>
                <strong>{money(artifact.price_usd)} USDC</strong>
                <small>{artifact.description}</small>
              </button>
            ))}
          </div>

          <div className="lifecycle-details">
            <div className="lifecycle-actions">
              <button className="primary-button" disabled={busy || !selectedArtifact} onClick={onCreatePayment}>
                <CreditCard size={16} />
                Create payment requirement
              </button>
              <button className="secondary-button" disabled={busy || !activePayment || activePayment.status === "verified"} onClick={onVerifyPayment}>
                <Check size={16} />
                Verify payment
              </button>
              <button className="secondary-button" disabled={busy || !activePayment || activePayment.status !== "verified" || deliveryUnlocked} onClick={onUnlockDelivery}>
                <Download size={16} />
                Unlock delivery
              </button>
            </div>

            <div className="gate-grid" aria-label="Lifecycle gates">
              <Gate label="Payment" value={activePayment?.status || "required"} active={Boolean(activePayment)} />
              <Gate label="Nexus" value={nexusJob?.state || "waiting"} active={Boolean(nexusJob)} />
              <Gate label="Review" value={nexusJob?.state === "DELIVERED" ? "passed" : nexusJob?.state === "REVIEW_PENDING" ? "pending" : "not ready"} active={nexusJob?.state === "REVIEW_PENDING" || nexusJob?.state === "DELIVERED"} />
              <Gate label="Delivery" value={deliveryUnlocked ? "unlocked" : "locked"} active={deliveryUnlocked} />
            </div>

            <div className="proof-grid">
              <Detail label="Artifact" value={activePayment?.artifact_name || selectedArtifact?.name || "Select an artifact"} />
              <Detail label="Payment ID" value={shortId(activePayment?.payment_id)} />
              <Detail label="Settlement" value={activePayment?.settlement_status || "pending"} />
              <Detail label="Nexus Job" value={shortId(nexusJob?.id || activePayment?.job_id)} />
              <Detail label="Arc Proof" value={shortId(activeArcProof?.proof_hash)} />
              <Detail label="Arc Write" value={activeArcProof?.onchain_write_status || "stub unavailable"} />
            </div>
          </div>
        </div>
      </section>

      <section className="work-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Simulation</h2>
            <Play size={18} />
          </div>
          <div className="form-grid">
            <label>
              Token
              <input value={tokenAddress} onChange={(event) => onTokenAddress(event.target.value)} />
            </label>
            <label>
              Amount
              <input type="number" min={1} value={amount} onChange={(event) => onAmount(Number(event.target.value))} />
            </label>
            <button className="primary-button" disabled={busy} onClick={onSimulate}>
              <Play size={16} />
              Run
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Copilot</h2>
            <Bell size={18} />
          </div>
          <div className="list">
            {loading && proposals.length === 0 ? <PanelSkeleton rows={3} /> : null}
            {proposals.slice(0, 5).map((proposal) => (
              <div className="list-row" key={proposal.id}>
                <div>
                  <strong>{proposal.symbol || proposal.token_address.slice(0, 12)}</strong>
                  <span>{proposal.status}</span>
                </div>
                {proposal.status === "pending" ? (
                  <button className="icon-button" onClick={() => onApprove(proposal.id)} title="Approve" aria-label="Approve proposal">
                    <Check size={17} />
                  </button>
                ) : null}
              </div>
            ))}
            {!loading && proposals.length === 0 ? (
              <EmptyState title="No proposals" description="Copilot proposals will appear here when strategy checks find an actionable move." compact />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Gate({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className={`gate ${active ? "active" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KeysView({
  keys,
  apiKey,
  keyName,
  loading,
  busy,
  onApiKey,
  onKeyName,
  onCreate,
  onCopy,
  onRevoke,
}: {
  keys: ApiKeyRecord[];
  apiKey: string;
  keyName: string;
  loading: boolean;
  busy: boolean;
  onApiKey: (value: string) => void;
  onKeyName: (value: string) => void;
  onCreate: () => void;
  onCopy: () => void;
  onRevoke: (id: number) => void;
}) {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="form-grid two">
          <label>
            Name
            <input value={keyName} onChange={(event) => onKeyName(event.target.value)} />
          </label>
          <button className="primary-button" disabled={busy} onClick={onCreate}>
            <KeyRound size={16} />
            Create
          </button>
        </div>
        <div className="full key-copy-row">
          <label>
            Active key
            <input value={apiKey} onChange={(event) => onApiKey(event.target.value)} placeholder="ttm_sk_live_..." />
          </label>
          <button className="secondary-button" disabled={!apiKey} onClick={onCopy}>
            <Copy size={16} />
            Copy
          </button>
        </div>
      </section>
      <section className="panel list">
        {loading && keys.length === 0 ? <PanelSkeleton rows={3} /> : null}
        {keys.map((key) => (
          <div className="list-row" key={key.id}>
            <div>
              <strong>{key.name}</strong>
              <span>
                {key.prefix} · {key.revoked_at ? "revoked" : "active"} · {compactDate(key.last_used_at)}
              </span>
            </div>
            <button className="icon-button danger" disabled={Boolean(key.revoked_at)} onClick={() => onRevoke(key.id)} title="Revoke" aria-label="Revoke key">
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        {!loading && keys.length === 0 ? <EmptyState title="No API keys" description="Create a key to run simulations from this workspace." compact /> : null}
      </section>
    </div>
  );
}

function BillingView({
  usage,
  loading,
  busy,
  onCheckout,
}: {
  usage: Usage | null;
  loading: boolean;
  busy: boolean;
  onCheckout: (plan: "pro" | "enterprise") => void;
}) {
  if (loading && !usage) {
    return <PlanSkeleton />;
  }

  return (
    <section className="plan-grid">
      <Plan name="Free" price="$0" current={usage?.plan === "free"} limit="1k requests" onClick={() => {}} />
      <Plan name="Pro" price="$49" current={usage?.plan === "pro"} limit="100k requests" disabled={busy} onClick={() => onCheckout("pro")} />
      <Plan name="Enterprise" price="Custom" current={usage?.plan === "enterprise"} limit="Unlimited" disabled={busy} onClick={() => onCheckout("enterprise")} />
    </section>
  );
}

function Plan({
  name,
  price,
  limit,
  current,
  disabled,
  onClick,
}: {
  name: string;
  price: string;
  limit: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="plan-card">
      <span>{name}</span>
      <strong>{price}</strong>
      <p>{limit}</p>
      <button className={current ? "secondary-button" : "primary-button"} disabled={current || disabled} onClick={onClick}>
        {current ? "Current" : "Select"}
      </button>
    </div>
  );
}

function InvoicesView({ jwt }: { jwt: string | null }) {
  const [items, setItems] = useState<Array<{ id?: string; url?: string; amount?: number }>>([]);
  const [loading, setLoading] = useState(Boolean(jwt));
  useEffect(() => {
    if (!jwt) return;
    setLoading(true);
    api
      .invoices(jwt)
      .then((data) => setItems(data.invoices))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [jwt]);
  return (
    <section className="panel list">
      {loading ? <PanelSkeleton rows={3} /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No invoices" description="Paid billing history will appear here after checkout creates an invoice." compact /> : null}
      {items.map((item, index) => (
        <div className="list-row" key={item.id || index}>
          <strong>{item.id || `Invoice ${index + 1}`}</strong>
          <span>{item.amount ? money(item.amount) : ""}</span>
        </div>
      ))}
    </section>
  );
}

function SettingsView({ account, loading, onSignOut }: { account: Account | null; loading: boolean; onSignOut: () => void }) {
  if (loading && !account) {
    return (
      <section className="panel settings-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="settings-field-skeleton" key={index}>
            <span className="skeleton-line short" />
            <span className="skeleton-line value" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="panel settings-grid">
      <label>
        Email
        <input value={account?.email || ""} readOnly />
      </label>
      <label>
        Organization
        <input value={account?.organization || ""} readOnly />
      </label>
      <label>
        Plan
        <input value={account?.plan || ""} readOnly />
      </label>
      <div className="settings-actions">
        <button className="secondary-button" onClick={onSignOut}>
          <LogOut size={16} />
          Sign out
        </button>
        <button className="secondary-button danger" disabled>
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </section>
  );
}

function AuditLogView({
  events,
  proposals,
  keys,
  loading,
}: {
  events: AuditEvent[];
  proposals: CopilotProposal[];
  keys: ApiKeyRecord[];
  loading: boolean;
}) {
  const rows =
    events.length > 0
      ? events.map((event) => ({
          title: event.action.replaceAll(".", " "),
          meta: `${event.target_type}${event.target_id ? ` ${event.target_id}` : ""} · ${compactDate(event.created_at)}`,
        }))
      : [
          ...proposals.map((proposal) => ({
            title: `Proposal ${proposal.status}`,
            meta: `${proposal.symbol || proposal.token_address} · ${compactDate(proposal.updated_at)}`,
          })),
          ...keys.map((key) => ({
            title: key.revoked_at ? "API key revoked" : "API key active",
            meta: `${key.name} · ${compactDate(key.created_at)}`,
          })),
        ];
  return (
    <section className="panel list">
      {loading && rows.length === 0 ? <PanelSkeleton rows={4} /> : null}
      {rows.map((row, index) => (
        <div className="list-row" key={`${row.title}-${index}`}>
          <strong>{row.title}</strong>
          <span>{row.meta}</span>
        </div>
      ))}
      {!loading && rows.length === 0 ? <EmptyState title="No audit events" description="Account, key, and copilot actions will be recorded here." compact /> : null}
    </section>
  );
}

function StatusView({ health, loading }: { health: Health | null; loading: boolean }) {
  const providers = Object.entries(health?.providers || {});
  if (loading && !health) {
    return (
      <div className="page-stack">
        <MetricsSkeleton />
        <section className="panel list">
          <PanelSkeleton rows={3} />
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="metrics-grid">
        <Metric label="API" value={health?.ok ? "OK" : "Down"} />
        <Metric label="Mode" value={health?.mode || "paper"} />
        <Metric label="Orders" value={health?.orderSubmissionEnabled ? "Enabled" : "Blocked"} />
        <Metric label="Base URL" value={API_ROOT.replace(/^https?:\/\//, "")} />
      </section>
      <section className="panel list">
        {!health ? <PanelSkeleton rows={3} /> : null}
        {providers.map(([name, provider]) => (
          <div className="list-row" key={name}>
            <div>
              <strong>{name}</strong>
              <span>{provider.last_error || "ready"}</span>
            </div>
            <span className={`status-pill ${provider.status}`}>{provider.status}</span>
          </div>
        ))}
        {health && providers.length === 0 ? <EmptyState title="No provider health" description="Provider checks are not configured for this environment." compact /> : null}
      </section>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <section className="metrics-grid" aria-label="Loading metrics">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="metric-card skeleton-card" key={index}>
          <span className="skeleton-line short" />
          <span className="skeleton-line value" />
        </div>
      ))}
    </section>
  );
}

function PlanSkeleton() {
  return (
    <section className="plan-grid" aria-label="Loading plans">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="plan-card skeleton-card" key={index}>
          <span className="skeleton-line short" />
          <span className="skeleton-line value" />
          <span className="skeleton-line" />
          <span className="skeleton-line" />
        </div>
      ))}
    </section>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="skeleton-stack" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <span className="skeleton-line" key={index} />
      ))}
    </div>
  );
}

function EmptyState({ title, description, compact }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={compact ? "empty-state compact" : "empty-state"}>
      <FileText size={compact ? 20 : 28} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function titleFor(view: View) {
  const map: Record<View, string> = {
    dashboard: "Dashboard",
    keys: "API Keys",
    billing: "Billing",
    invoices: "Invoices",
    settings: "Settings",
    audit: "Audit Log",
    status: "Status",
  };
  return map[view];
}

export default App;
