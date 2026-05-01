import {
  Activity,
  BarChart3,
  Bell,
  Check,
  CreditCard,
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
  ApiKeyRecord,
  AuditEvent,
  CopilotProposal,
  Dashboard,
  Health,
  Usage,
  api,
} from "./lib/api";

type View = "dashboard" | "keys" | "billing" | "invoices" | "settings" | "audit" | "status";
type NoticeType = "ok" | "error";
type Notice = { type: NoticeType; text: string } | null;

const money = (value = 0) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const compactDate = (value: string | null | undefined) => {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
};

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
  const [notice, setNotice] = useState<Notice>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keyName, setKeyName] = useState("default");
  const [tokenAddress, setTokenAddress] = useState("0xSAFE");
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);

  const isSignedIn = Boolean(jwt);

  const chartData = useMemo(() => {
    return (dashboard?.last_30_days_chart_points || []).map((point) => ({
      ...point,
      label: point.date.slice(5),
    }));
  }, [dashboard]);

  async function loadHealth() {
    setHealth(await api.health());
  }

  async function loadAll(activeToken = jwt) {
    if (!activeToken) return;
    await loadHealth();
    const [accountResult, dashboardResult, usageResult, keyResult, proposalResult, auditResult] = await Promise.all([
      api.account(activeToken),
      api.dashboard(activeToken),
      api.usage(activeToken),
      api.apiKeys(activeToken),
      api.proposals(activeToken),
      api.auditLog(activeToken),
    ]);
    setAccount(accountResult);
    setDashboard(dashboardResult);
    setUsage(usageResult);
    setKeys(keyResult);
    setProposals(proposalResult.proposals);
    setAuditEvents(auditResult.events);
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
      show("error", error instanceof Error ? error.message : "Authentication failed.");
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
    show("ok", "Signed out.");
  }

  async function createKey() {
    if (!jwt) return;
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

  async function revokeKey(id: number) {
    if (!jwt) return;
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

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (view !== "status" || health) return;
    loadHealth().catch(() => undefined);
  }, [health, view]);

  useEffect(() => {
    if (!jwt) return;
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
  }, [jwt]);

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

        {isSignedIn && view === "dashboard" ? (
          <DashboardView
            dashboard={dashboard}
            usage={usage}
            chartData={chartData}
            proposals={proposals}
            tokenAddress={tokenAddress}
            amount={amount}
            busy={busy}
            onTokenAddress={setTokenAddress}
            onAmount={setAmount}
            onSimulate={runSimulation}
            onApprove={approveProposal}
          />
        ) : null}
        {isSignedIn && view === "keys" ? (
          <KeysView
            keys={keys}
            apiKey={apiKey}
            keyName={keyName}
            busy={busy}
            onApiKey={setApiKey}
            onKeyName={setKeyName}
            onCreate={createKey}
            onRevoke={revokeKey}
          />
        ) : null}
        {isSignedIn && view === "billing" ? <BillingView usage={usage} busy={busy} onCheckout={checkout} /> : null}
        {isSignedIn && view === "invoices" ? <InvoicesView jwt={jwt} /> : null}
        {isSignedIn && view === "settings" ? <SettingsView account={account} onSignOut={signOut} /> : null}
        {isSignedIn && view === "audit" ? <AuditLogView events={auditEvents} proposals={proposals} keys={keys} /> : null}
        {view === "status" ? <StatusView health={health} /> : null}
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

function DashboardView({
  dashboard,
  usage,
  chartData,
  proposals,
  tokenAddress,
  amount,
  busy,
  onTokenAddress,
  onAmount,
  onSimulate,
  onApprove,
}: {
  dashboard: Dashboard | null;
  usage: Usage | null;
  chartData: Array<{ label: string; trades: number; volume_usd: number }>;
  proposals: CopilotProposal[];
  tokenAddress: string;
  amount: number;
  busy: boolean;
  onTokenAddress: (value: string) => void;
  onAmount: (value: number) => void;
  onSimulate: () => void;
  onApprove: (id: number) => void;
}) {
  return (
    <div className="page-stack">
      <section className="metrics-grid">
        <Metric label="Trades" value={String(dashboard?.total_simulated_trades || 0)} />
        <Metric label="Volume" value={money(dashboard?.total_volume_usd)} />
        <Metric label="Fees" value={money(dashboard?.total_fees_usd)} />
        <Metric label="P&L" value={money((dashboard?.realized_pnl_usd || 0) + (dashboard?.unrealized_pnl_usd || 0))} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>30d Activity</h2>
          <span>{usage?.requests_month || 0} requests</span>
        </div>
        <div className="chart-frame">
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
            {proposals.length === 0 ? <p className="muted">No proposals</p> : null}
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

function KeysView({
  keys,
  apiKey,
  keyName,
  busy,
  onApiKey,
  onKeyName,
  onCreate,
  onRevoke,
}: {
  keys: ApiKeyRecord[];
  apiKey: string;
  keyName: string;
  busy: boolean;
  onApiKey: (value: string) => void;
  onKeyName: (value: string) => void;
  onCreate: () => void;
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
        <label className="full">
          Active key
          <input value={apiKey} onChange={(event) => onApiKey(event.target.value)} placeholder="ttm_sk_live_..." />
        </label>
      </section>
      <section className="panel list">
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
      </section>
    </div>
  );
}

function BillingView({ usage, busy, onCheckout }: { usage: Usage | null; busy: boolean; onCheckout: (plan: "pro" | "enterprise") => void }) {
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
  useEffect(() => {
    if (!jwt) return;
    api.invoices(jwt).then((data) => setItems(data.invoices)).catch(() => setItems([]));
  }, [jwt]);
  return (
    <section className="panel list">
      {items.length === 0 ? <p className="muted">No invoices</p> : null}
      {items.map((item, index) => (
        <div className="list-row" key={item.id || index}>
          <strong>{item.id || `Invoice ${index + 1}`}</strong>
          <span>{item.amount ? money(item.amount) : ""}</span>
        </div>
      ))}
    </section>
  );
}

function SettingsView({ account, onSignOut }: { account: Account | null; onSignOut: () => void }) {
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
}: {
  events: AuditEvent[];
  proposals: CopilotProposal[];
  keys: ApiKeyRecord[];
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
      {rows.map((row, index) => (
        <div className="list-row" key={`${row.title}-${index}`}>
          <strong>{row.title}</strong>
          <span>{row.meta}</span>
        </div>
      ))}
      {rows.length === 0 ? <p className="muted">No events</p> : null}
    </section>
  );
}

function StatusView({ health }: { health: Health | null }) {
  const providers = Object.entries(health?.providers || {});
  return (
    <div className="page-stack">
      <section className="metrics-grid">
        <Metric label="API" value={health?.ok ? "OK" : "Down"} />
        <Metric label="Mode" value={health?.mode || "paper"} />
        <Metric label="Orders" value={health?.orderSubmissionEnabled ? "Enabled" : "Blocked"} />
        <Metric label="Base URL" value={API_ROOT.replace(/^https?:\/\//, "")} />
      </section>
      <section className="panel list">
        {providers.map(([name, provider]) => (
          <div className="list-row" key={name}>
            <div>
              <strong>{name}</strong>
              <span>{provider.last_error || "ready"}</span>
            </div>
            <span className={`status-pill ${provider.status}`}>{provider.status}</span>
          </div>
        ))}
      </section>
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
