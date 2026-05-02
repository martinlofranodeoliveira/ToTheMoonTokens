import { expect, type Page, test } from "@playwright/test";

const account = {
  email: "e2e@example.com",
  org_id: 1,
  organization: "E2E Org",
  plan: "free",
  created_at: "2026-05-02T12:00:00.000Z",
};

const apiKeys = [
  {
    id: 7,
    org_id: 1,
    name: "default",
    prefix: "ttm_sk_test",
    scopes: "simulate",
    last_used_at: null,
    revoked_at: null,
    created_at: "2026-05-02T12:00:00.000Z",
  },
];

const proposal = {
  id: 11,
  org_id: 1,
  token_address: "0xMOON",
  chain: "base",
  symbol: "MOON",
  side: "BUY",
  amount_usd: 100,
  score: 0.91,
  rationale: "High conviction test proposal",
  mode: "paper",
  status: "pending",
  execution_payload: null,
  created_at: "2026-05-02T12:00:00.000Z",
  updated_at: "2026-05-02T12:00:00.000Z",
  approved_at: null,
};

const artifacts = [
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

type PaymentFixture = {
  payment_id: string;
  artifact_id: string;
  artifact_name: string;
  artifact_type: string;
  amount_usd: number;
  buyer_address: string;
  deposit_address: string;
  job_id: string;
  status: string;
  settlement_status: string;
  reason: string | null;
  tx_hash: string | null;
  circle_transaction_id: string | null;
  executed: boolean;
  download_url: string | null;
  execution_message: string | null;
  created_at: string;
  updated_at: string;
};

type NexusJobFixture = {
  id: string;
  description: string;
  state: string;
  payment_id: string;
  artifact_id: string;
  artifact_type: string;
  amount_usdc: number;
  buyer_address: string;
  settlement_status: string;
  tx_hash: string | null;
  download_url: string | null;
  history: Array<{ state: string; reason: string; at: string }>;
};

const pendingPayment: PaymentFixture = {
  payment_id: "pay_demo_1234567890",
  artifact_id: "artifact_delivery_packet",
  artifact_name: "Delivery Packet",
  artifact_type: "delivery_packet",
  amount_usd: 0.001,
  buyer_address: "0x000000000000000000000000000000000000dEaD",
  deposit_address: "0xMockDepositAddressForTestnetOnly",
  job_id: "nexus-pay-demo",
  status: "pending",
  settlement_status: "PENDING",
  reason: null,
  tx_hash: null,
  circle_transaction_id: null,
  executed: false,
  download_url: null,
  execution_message: null,
  created_at: "2026-05-02T12:00:00.000Z",
  updated_at: "2026-05-02T12:00:00.000Z",
};

const paidPayment = {
  ...pendingPayment,
  status: "verified",
  settlement_status: "SETTLED",
  tx_hash: "0xMockTransactionHash",
  updated_at: "2026-05-02T12:01:00.000Z",
};

const deliveredPayment = {
  ...paidPayment,
  executed: true,
  download_url: "https://example.test/delivery-packet.json",
  execution_message: "Delivery unlocked after review gate.",
};

const nexusJob: NexusJobFixture = {
  id: "nexus-pay-demo",
  description: "Paid work unit for Delivery Packet",
  state: "REQUESTED",
  payment_id: pendingPayment.payment_id,
  artifact_id: pendingPayment.artifact_id,
  artifact_type: pendingPayment.artifact_type,
  amount_usdc: pendingPayment.amount_usd,
  buyer_address: pendingPayment.buyer_address,
  settlement_status: "PENDING",
  tx_hash: null,
  download_url: null,
  history: [{ state: "REQUESTED", reason: "Payment intent created", at: "2026-05-02T12:00:00.000Z" }],
};

const arcProof = {
  job_id: "job_arc_1_1777723260",
  task_id: "work-unit-demo",
  agent_id: "agent-demo",
  status: "escrowed",
  proof_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  timestamp: "2026-05-02T12:01:00.000Z",
  metadata: { source: "paid_work_unit", onchain_write: "stubbed" },
  work_unit_id: "work-unit-demo",
  payment_id: pendingPayment.payment_id,
  payment_status: "verified",
  settlement_status: "SETTLED",
  tx_hash: "0xMockTransactionHash",
  onchain_write_status: "stubbed",
};

async function mockSaasApi(page: Page) {
  let paymentOrder: PaymentFixture = pendingPayment;
  let currentNexusJob: NexusJobFixture = nexusJob;
  await page.route("**/health", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        app: "ToTheMoonTokens",
        mode: "paper",
        orderSubmissionEnabled: false,
        providers: {},
      },
    });
  });
  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({ json: { access_token: "jwt-test", token_type: "bearer" } });
  });
  await page.route("**/api/v1/auth/signup", async (route) => {
    await route.fulfill({ status: 201, json: { id: 1, email: account.email, org_id: account.org_id, plan: account.plan } });
  });
  await page.route("**/api/v1/saas/account", async (route) => {
    await route.fulfill({ json: account });
  });
  await page.route("**/api/v1/saas/dashboard", async (route) => {
    await route.fulfill({
      json: {
        email: account.email,
        org_id: account.org_id,
        plan: account.plan,
        requests_this_month: 12,
        simulated_volume_usd: 100,
        active_api_keys: 1,
        total_simulated_trades: 1,
        total_volume_usd: 100,
        total_fees_usd: 8,
        realized_pnl_usd: 0,
        unrealized_pnl_usd: 0,
        last_30_days_chart_points: [],
      },
    });
  });
  await page.route("**/api/v1/saas/usage", async (route) => {
    await route.fulfill({
      json: {
        requests_today: 3,
        requests_month: 12,
        plan: account.plan,
        quota: { simulate_order: 1000, token_audit: 100, active_api_keys: 3 },
      },
    });
  });
  await page.route("**/api/v1/saas/api-keys", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { id: 8, org_id: 1, name: "qa-key", prefix: "ttm_sk_new", plaintext: "ttm_sk_live_created" } });
      return;
    }
    await route.fulfill({ json: apiKeys });
  });
  await page.route("**/api/v1/saas/api-keys/7", async (route) => {
    await route.fulfill({ json: { id: 7, revoked_at: "2026-05-02T12:30:00.000Z" } });
  });
  await page.route("**/api/v1/saas/audit-log", async (route) => {
    await route.fulfill({
      json: {
        org_id: 1,
        events: [
          {
            id: 99,
            org_id: 1,
            actor_id: 1,
            actor_type: "user",
            action: "api_key.created",
            target_type: "api_key",
            target_id: "7",
            ip: "127.0.0.1",
            ua: "playwright",
            before: null,
            after: null,
            created_at: "2026-05-02T12:00:00.000Z",
          },
        ],
        limit: 50,
        offset: 0,
      },
    });
  });
  await page.route("**/api/v1/saas/invoices", async (route) => {
    await route.fulfill({ json: { org_id: 1, invoices: [{ id: "inv_smoke", amount: 49 }] } });
  });
  await page.route("**/api/v1/copilot/proposals", async (route) => {
    await route.fulfill({ json: { org_id: 1, proposals: [proposal] } });
  });
  await page.route("**/api/v1/copilot/proposals/11/approve", async (route) => {
    await route.fulfill({ json: { proposal: { ...proposal, status: "approved", approved_at: "2026-05-02T12:30:00.000Z" } } });
  });
  await page.route("**/api/v1/copilot/stream?once=true", async (route) => {
    await route.fulfill({ body: "" });
  });
  await page.route("**/api/v1/simulate/order", async (route) => {
    await route.fulfill({
      json: {
        status: "simulated",
        trade_id: 123,
        token_address: "0xMOON",
        side: "BUY",
        input_amount: 100,
        executed_price: 1,
        fees_paid: 1,
        slippage_paid: 0,
        token_tax_paid: 0,
        net_amount: 99,
        estimated_quantity: 99,
        realized_pnl_usd: null,
        source: "playwright",
        warning: "",
      },
    });
  });
  await page.route("**/api/v1/billing/checkout", async (route) => {
    await route.fulfill({ json: { url: "https://billing.example.test/session", org_id: 1, plan: "pro" } });
  });
  await page.route("**/api/payments/catalog", async (route) => {
    await route.fulfill({ json: artifacts });
  });
  await page.route("**/api/payments/orders", async (route) => {
    await route.fulfill({ json: [paymentOrder] });
  });
  await page.route("**/api/payments/intent", async (route) => {
    paymentOrder = pendingPayment;
    currentNexusJob = nexusJob;
    await route.fulfill({
      json: {
        payment_id: paymentOrder.payment_id,
        amount_usd: paymentOrder.amount_usd,
        currency: "USDC",
        deposit_address: paymentOrder.deposit_address,
        payment_requirement: { asset: "USDC", network: "arc_testnet", amount: "0.001" },
        status: paymentOrder.status,
        job_id: paymentOrder.job_id,
      },
    });
  });
  await page.route("**/api/payments/verify", async (route) => {
    paymentOrder = paidPayment;
    currentNexusJob = { ...nexusJob, state: "PAYMENT_UNLOCKED", settlement_status: "SETTLED", tx_hash: "0xMockTransactionHash" };
    await route.fulfill({ json: { payment_id: paymentOrder.payment_id, status: "verified", unlocked_artifact_id: null, settlement_status: "SETTLED", reason: null } });
  });
  await page.route("**/api/payments/execute", async (route) => {
    paymentOrder = deliveredPayment;
    currentNexusJob = { ...currentNexusJob, state: "DELIVERED", download_url: deliveredPayment.download_url };
    await route.fulfill({ json: { artifact_id: paymentOrder.artifact_id, status: "completed", message: "Delivery unlocked after review gate.", download_url: paymentOrder.download_url } });
  });
  await page.route("**/api/jobs/nexus-pay-demo", async (route) => {
    await route.fulfill({ json: currentNexusJob });
  });
  await page.route("**/api/arc/jobs?limit=5", async (route) => {
    await route.fulfill({ json: [arcProof] });
  });
}

async function signIn(page: Page, mode: "Login" | "Signup" = "Signup") {
  await page.goto("/");
  await page.getByPlaceholder("email@company.com").fill(account.email);
  await page.getByPlaceholder("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: mode }).click();
  await expect(page.getByText(account.organization)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await mockSaasApi(page);
});

test("signup creates an authenticated dashboard session", async ({ page }) => {
  await signIn(page);

  await expect(page.getByText("$100.00")).toBeVisible();
  await expect(page.getByText("MOON")).toBeVisible();
});

test("authenticated SaaS navigation renders dashboard sections", async ({ page }) => {
  await signIn(page, "Login");

  await page.getByRole("button", { name: "API Keys" }).click();
  await expect(page.getByText("ttm_sk_test · active · never")).toBeVisible();

  await page.getByRole("button", { name: "Billing" }).click();
  await expect(page.getByText("100k requests")).toBeVisible();

  await page.getByRole("button", { name: "Invoices" }).click();
  await expect(page.getByText("inv_smoke")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator('input[value="E2E Org"]')).toBeVisible();

  await page.getByRole("button", { name: "Audit Log" }).click();
  await expect(page.getByText("api_key created")).toBeVisible();

  await page.getByRole("button", { name: "Status" }).click();
  await expect(page.getByText("127.0.0.1:4174")).toBeVisible();
});

test("recoverable data refresh errors can be retried", async ({ page }) => {
  let usageAttempts = 0;
  await page.unroute("**/api/v1/saas/usage");
  await page.route("**/api/v1/saas/usage", async (route) => {
    usageAttempts += 1;
    if (usageAttempts === 1) {
      await route.fulfill({ status: 503, json: { detail: "Usage service unavailable" } });
      return;
    }
    await route.fulfill({
      json: {
        requests_today: 3,
        requests_month: 12,
        plan: account.plan,
        quota: { simulate_order: 1000, token_audit: 100, active_api_keys: 3 },
      },
    });
  });

  await signIn(page, "Login");

  await expect(page.getByRole("alert")).toContainText("Usage service unavailable");
  await expect(page.getByText("MOON")).toBeVisible();

  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.getByText("12 requests")).toBeVisible();
});

test("API key, simulation, proposal, and billing actions call expected endpoints", async ({ page }) => {
  const requests: Array<{ method: string; url: string; body: string | null }> = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) {
      requests.push({ method: request.method(), url: request.url(), body: request.postData() });
    }
  });

  await signIn(page);

  await page.getByRole("button", { name: "API Keys" }).click();
  await page.getByPlaceholder("ttm_sk_live_...").fill("ttm_sk_live_manual");

  await page.locator("label", { hasText: "Name" }).getByRole("textbox").fill("qa-key");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByPlaceholder("ttm_sk_live_...")).toHaveValue("ttm_sk_live_created");
  await page.getByRole("button", { name: "Revoke key" }).click();
  await expect(page.getByText("API key revoked.")).toBeVisible();

  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText("Simulation recorded.")).toBeVisible();

  await page.getByRole("button", { name: "Approve proposal" }).click();
  await expect(page.getByText("Proposal executed.")).toBeVisible();

  await page.getByRole("button", { name: "Billing" }).click();
  await page.locator(".plan-card", { hasText: "Pro" }).getByRole("button", { name: "Select" }).click();
  await expect(page.getByText("Checkout opened.")).toBeVisible();

  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/v1/simulate/order") }),
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/v1/copilot/proposals/11/approve") }),
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/v1/saas/api-keys") }),
      expect.objectContaining({ method: "DELETE", url: expect.stringContaining("/api/v1/saas/api-keys/7") }),
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/v1/billing/checkout") }),
    ]),
  );
});

test("paid agent lifecycle shows payment, Nexus, Arc, and delivery gates", async ({ page }) => {
  const requests: Array<{ method: string; url: string }> = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) {
      requests.push({ method: request.method(), url: request.url() });
    }
  });

  await signIn(page, "Login");

  await expect(page.getByRole("heading", { name: "Paid Agent Lifecycle" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Delivery Packet/ })).toBeVisible();
  await expect(page.getByText("No mainnet execution")).toBeVisible();
  await expect(page.getByText("Payment requirement is open. Verify the test transaction before delivery unlocks.")).toBeVisible();
  await expect(page.getByText("stubbed")).toBeVisible();
  await expect(page.getByLabel("Lifecycle gates").getByText("pending")).toBeVisible();
  await expect(page.getByLabel("Lifecycle gates").getByText("locked")).toBeVisible();

  await page.getByRole("button", { name: "Create payment requirement" }).click();
  await expect(page.getByText("Payment requirement created.")).toBeVisible();
  await expect(page.getByText("Payment requirement is open. Verify the test transaction before delivery unlocks.")).toBeVisible();
  await expect(page.getByText("pay_demo_1…567890")).toBeVisible();

  await page.getByRole("button", { name: "Verify payment" }).click();
  await expect(page.getByText("Payment verified.")).toBeVisible();
  await expect(page.getByText("Payment is verified. Unlock delivery to complete the paid work unit.")).toBeVisible();
  await expect(page.getByText("PAYMENT_UNLOCKED")).toBeVisible();

  await page.getByRole("button", { name: "Unlock delivery" }).click();
  await expect(page.getByText("Delivery unlocked.")).toBeVisible();
  await expect(page.getByText("Delivery is unlocked. Download URL and Arc proof metadata are ready for handoff.")).toBeVisible();
  await expect(page.getByText("DELIVERED")).toBeVisible();
  await expect(page.getByLabel("Lifecycle gates").getByText("unlocked")).toBeVisible();

  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ method: "GET", url: expect.stringContaining("/api/payments/catalog") }),
      expect.objectContaining({ method: "GET", url: expect.stringContaining("/api/arc/jobs?limit=5") }),
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/payments/intent") }),
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/payments/verify") }),
      expect.objectContaining({ method: "POST", url: expect.stringContaining("/api/payments/execute") }),
      expect.objectContaining({ method: "GET", url: expect.stringContaining("/api/jobs/nexus-pay-demo") }),
    ]),
  );
});

test("paid agent lifecycle keeps delivery locked before payment verification", async ({ page }) => {
  const executeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/payments/execute")) {
      executeRequests.push(request.url());
    }
  });

  await signIn(page, "Login");

  await expect(page.getByRole("heading", { name: "Paid Agent Lifecycle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock delivery" })).toBeDisabled();
  await expect(page.getByLabel("Lifecycle gates").getByText("locked")).toBeVisible();

  await page.getByRole("button", { name: "Create payment requirement" }).click();
  await expect(page.getByText("Payment requirement created.")).toBeVisible();
  await expect(page.getByLabel("Lifecycle gates").getByText("pending")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock delivery" })).toBeDisabled();
  await expect(page.getByLabel("Lifecycle gates").getByText("locked")).toBeVisible();
  expect(executeRequests).toEqual([]);
});
