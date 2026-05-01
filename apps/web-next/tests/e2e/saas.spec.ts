import { expect, test } from "@playwright/test";

test("signup creates an authenticated dashboard session", async ({ page }) => {
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
  await page.route("**/api/v1/auth/signup", async (route) => {
    await route.fulfill({ status: 201, json: { id: 1, email: "e2e@example.com", org_id: 1, plan: "free" } });
  });
  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({ json: { access_token: "jwt-test", token_type: "bearer" } });
  });
  await page.route("**/api/v1/saas/account", async (route) => {
    await route.fulfill({
      json: {
        email: "e2e@example.com",
        org_id: 1,
        organization: "E2E Org",
        plan: "free",
        created_at: new Date().toISOString(),
      },
    });
  });
  await page.route("**/api/v1/saas/dashboard", async (route) => {
    await route.fulfill({
      json: {
        email: "e2e@example.com",
        org_id: 1,
        plan: "free",
        requests_this_month: 0,
        simulated_volume_usd: 0,
        active_api_keys: 0,
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
    await route.fulfill({ json: { requests_today: 0, requests_month: 0, plan: "free", quota: {} } });
  });
  await page.route("**/api/v1/saas/api-keys", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/v1/saas/audit-log", async (route) => {
    await route.fulfill({ json: { org_id: 1, events: [], limit: 50, offset: 0 } });
  });
  await page.route("**/api/v1/copilot/proposals", async (route) => {
    await route.fulfill({ json: { org_id: 1, proposals: [] } });
  });
  await page.route("**/api/v1/copilot/stream?once=true", async (route) => {
    await route.fulfill({ body: "" });
  });

  await page.goto("/");
  await page.getByPlaceholder("email@company.com").fill("e2e@example.com");
  await page.getByPlaceholder("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Signup" }).click();
  await expect(page.getByText("E2E Org")).toBeVisible();
  await expect(page.getByText("$100.00")).toBeVisible();
});
