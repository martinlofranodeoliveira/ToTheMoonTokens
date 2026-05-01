export type ApiKeyRecord = {
  id: number;
  org_id: number;
  name: string;
  prefix: string;
  scopes: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ApiKeyCreateResponse = {
  id: number;
  org_id: number;
  name: string;
  prefix: string;
  plaintext: string;
};

export type Account = {
  email: string;
  org_id: number;
  organization: string;
  plan: string;
  created_at: string;
};

export type Dashboard = {
  email: string;
  org_id: number;
  plan: string;
  requests_this_month: number;
  simulated_volume_usd: number;
  active_api_keys: number;
  total_simulated_trades?: number;
  total_volume_usd?: number;
  total_fees_usd?: number;
  realized_pnl_usd?: number;
  unrealized_pnl_usd?: number;
  last_30_days_chart_points?: Array<{ date: string; trades: number; volume_usd: number }>;
};

export type Usage = {
  requests_today: number;
  requests_month: number;
  plan: string;
  quota: {
    simulate_order: number;
    token_audit: number;
    active_api_keys: number;
  };
};

export type SimulationResult = {
  status: string;
  trade_id: number | null;
  token_address: string;
  side: "BUY" | "SELL";
  input_amount: number;
  executed_price: number;
  fees_paid: number;
  slippage_paid: number;
  token_tax_paid: number;
  net_amount: number;
  estimated_quantity: number;
  realized_pnl_usd: number | null;
  source: string;
  warning: string;
};

export type CopilotProposal = {
  id: number;
  org_id: number;
  token_address: string;
  chain: string;
  symbol: string | null;
  side: "BUY" | "SELL";
  amount_usd: number;
  score: number;
  rationale: string;
  mode: "paper" | "real";
  status: string;
  execution_payload: SimulationResult | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
};

export type AuditEvent = {
  id: number;
  org_id: number | null;
  actor_id: number | null;
  actor_type: string;
  action: string;
  target_type: string;
  target_id: string | null;
  ip: string | null;
  ua: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

export type Health = {
  ok: boolean;
  app: string;
  mode: string;
  orderSubmissionEnabled: boolean;
  providers?: Record<string, { status: string; latency_ms: number | null; last_error: string | null }>;
};

const configuredBase = import.meta.env.VITE_TTM_API_BASE_URL || "http://127.0.0.1:8010";
export const API_ROOT = configuredBase.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
export const API_BASE = `${API_ROOT}/api/v1`;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // keep HTTP status detail
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export function bearer(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function apiKeyHeader(apiKey: string | null): HeadersInit {
  return apiKey ? { "X-API-Key": apiKey } : {};
}

export const api = {
  signup(email: string, password: string) {
    return request<{ id: number; email: string; org_id: number; plan: string }>("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    return request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  },
  account(token: string) {
    return request<Account>("/saas/account", { headers: bearer(token) });
  },
  dashboard(token: string) {
    return request<Dashboard>("/saas/dashboard", { headers: bearer(token) });
  },
  usage(token: string) {
    return request<Usage>("/saas/usage", { headers: bearer(token) });
  },
  apiKeys(token: string) {
    return request<ApiKeyRecord[]>("/saas/api-keys", { headers: bearer(token) });
  },
  createApiKey(token: string, name: string) {
    return request<ApiKeyCreateResponse>("/saas/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...bearer(token) },
      body: JSON.stringify({ name }),
    });
  },
  revokeApiKey(token: string, id: number) {
    return request<{ id: number; revoked_at: string }>(`/saas/api-keys/${id}`, {
      method: "DELETE",
      headers: bearer(token),
    });
  },
  simulate(apiKey: string, tokenAddress: string, amount: number) {
    return request<SimulationResult>("/simulate/order", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...apiKeyHeader(apiKey) },
      body: JSON.stringify({ token_address: tokenAddress, amount, side: "BUY" }),
    });
  },
  checkout(token: string, planCode: "pro" | "enterprise") {
    return request<{ url: string; org_id: number; plan: string }>("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...bearer(token) },
      body: JSON.stringify({ plan_code: planCode }),
    });
  },
  invoices(token: string) {
    return request<{ org_id: number; invoices: Array<{ id?: string; url?: string; amount?: number }> }>(
      "/saas/invoices",
      { headers: bearer(token) },
    );
  },
  auditLog(token: string) {
    return request<{ org_id: number; events: AuditEvent[]; limit: number; offset: number }>(
      "/saas/audit-log",
      { headers: bearer(token) },
    );
  },
  proposals(token: string) {
    return request<{ org_id: number; proposals: CopilotProposal[] }>("/copilot/proposals", {
      headers: bearer(token),
    });
  },
  approveProposal(token: string, id: number) {
    return request<{ proposal: CopilotProposal }>(`/copilot/proposals/${id}/approve`, {
      method: "POST",
      headers: bearer(token),
    });
  },
  health() {
    return request<Health>(`${API_ROOT}/health`);
  },
};
