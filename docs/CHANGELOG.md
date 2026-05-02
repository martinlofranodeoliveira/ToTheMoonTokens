## Unreleased

- Added `make ci-evidence` to run backend compile/lint/test plus frontend build checks and publish secret-free backend/frontend CI evidence artifacts.
# Changelog

## Production deployment evidence

- Added `docs/production-readiness-gate.md` for GEN-25 with local/staging/production separation, staging real-provider credential expectations, smoke commands, migration rollback evidence, owner blockers, and a production go/no-go gate.
- Added GitHub Actions and GitLab CI artifact evidence for the GCP VM deploy path via `make vm-deploy-ci-evidence` and `ops/evidence/vm-deploy-ci-evidence.json`.
- Added `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` with a production deployment checklist, smoke-check expectations, rollback evidence requirements, and a copyable operator evidence template.
- Linked the production checklist from `docs/DELIVERY_VALIDATION.md` so release validation and deployment evidence stay connected.

## Fase 8 - Observabilidade enterprise

- Added opt-in OpenTelemetry FastAPI tracing with OTLP export configuration and trace attributes for user, organization, API key, and endpoint context.
- Added opt-in Sentry initialization for the backend and Vite React frontend.
- Added organization-scoped audit log persistence with before/after context for signup, login, API key creation/revocation, checkout, and Stripe subscription updates.
- Added `GET /api/v1/saas/audit-log` for authenticated audit event retrieval.
- Added Grafana/Prometheus alert rules for API latency, API error rate, disk usage, scanner lag, and failed payments.

## Fase 7 - Frontend SaaS

- Added `apps/web-next`, a Vite React TypeScript SaaS dashboard with login/signup, dashboard, API keys, billing, invoices, settings, audit log, status, and copilot proposal workflows.
- Added a typed API client for auth, SaaS account/dashboard/usage, API keys, billing checkout, invoices, simulation, copilot proposals, and health.
- Added Recharts dashboard activity chart and lucide icon controls.
- Added Playwright E2E coverage for signup and authenticated dashboard rendering with mocked API responses.
- Added production build configuration with split chunks for charts and icons.
- Added basic SEO metadata, favicon, robots policy, and Lighthouse validation for the signed-out app shell.

## Fase 6 - Bot copilot funcional

- Replaced mock bot scanner with a one-shot DexScreener search job that filters by volume, momentum, and liquidity.
- Updated the bot to audit candidates through the SaaS API and create copilot proposals instead of submitting trades automatically.
- Added `copilot_proposals`, organization real-mode flags, daily real-mode limit, and bot failure circuit-breaker state.
- Added `/api/v1/copilot/proposals`, `/api/v1/copilot/proposals/{id}/approve`, `/api/v1/copilot/stream`, and `/api/v1/copilot/circuit-breaker/failures`.
- Added migration `0005_copilot_bot` and tests for scanner filtering, proposal persistence, SSE stream output, paper approval execution, real-mode blocking, and circuit breaker shutdown.

## Fase 5 - Integracoes externas e cache

- Added DexScreener market-data integration with Birdeye fallback and deterministic local fallback for offline placeholder tokens.
- Added GoPlus, Honeypot.is, and TokenSniffer security provider clients with 2-of-3 honeypot consensus.
- Added Redis-backed external response caching with in-memory fallback and provider health state exposed from `/health`.
- Added a typed external-provider adapter contract exposed from `/health` so bot orchestration remains paper-only/read-through across market and security providers.
- Added external provider configuration to `.env.example`.
- Added tests for security consensus, risk-score aggregation, 30-second market cache behavior, DexScreener fallback, and provider health output.

## Fase 4 - Engine de simulacao real

- Replaced hardcoded simulation pricing with market/audit-driven paper execution, chain-specific gas, slippage, fees, and token tax handling.
- Added persisted organization-scoped simulated trades with open/closed position state, close price, and realized P&L.
- Added `/api/v1/simulate/positions` and `/api/v1/simulate/positions/{id}/close` endpoints.
- Updated SaaS dashboard aggregates with trade count, volume, fees, realized/unrealized P&L, and 30-day chart points.
- Added migration `0004_simulated_trade_pnl` and tests for trade persistence, close/P&L, honeypot blocking, dashboard aggregation, tenant isolation, and chain-specific slippage.

## Fase 3 - Multi-tenancy, quotas e billing

- Added organization-scoped API keys and default free organization creation on signup.
- Added plan-aware quota enforcement for simulation and token audit routes.
- Added SaaS usage, billing checkout, Stripe-style webhook, invoices, and x402 nanopayment resource endpoints.
- Added migration `0003_multi_tenancy_quota` for API key organization scope and resource usage.
- Added tests for quota blocking, monthly reset, Stripe webhook promotion, bad webhook signatures, x402 payment-required responses, and tenant isolation.

## Fase 2 - Persistencia de producao

- Added Alembic configuration and migrations for users, API keys, organizations, billing, usage, simulated trades, audit logs, and nanopayment receipts.
- Added Postgres service and `DATABASE_URL` wiring to Docker Compose.
- Added shared SQLite in-memory database fixture for tests.
- Added `ops/backup.sh` and database restore runbook.

## Fase 1 - Auth real

- Added SaaS signup, login, account, dashboard, API key creation/list/revocation endpoints.
- Replaced the hardcoded API key with Argon2-hashed per-user API keys and JWT auth.
- Parameterized the database URL and added SQLite table initialization for local/test usage.
- Updated simulation calls to require `X-API-Key` and added auth/API key coverage.

## Fase 0 - Bloqueios iniciais

- Fixed corrupted trailing lines in `main.py`.
- Added missing router imports for tokens and simulation routes.
- Moved the loose root smoke script into a skipped manual pytest file.
