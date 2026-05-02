# Architecture and Security Guardrail Gate

Date: 2026-05-02
Issue: GEN-11
Scope: production-readiness guardrails for the next GEN-1 implementation waves.

## Inputs Reviewed

- `docs/SAAS_IMPLEMENTATION_PLAN.md` production SaaS plan and immutable trading safety policy.
- GEN-2 output in `docs/reports/phase-0-audit.md` covering detected stack, baseline commands, and dependency/install blockers.
- GEN-4 output in `docs/SAAS_UI_BASELINE.md` covering the canonical SaaS UI baseline.
- Existing guardrail and runbook docs: `docs/TRADING_GUARDRAILS.md`, `docs/REAL_MODE_GRADUATION.md`, `docs/SECURITY_RUNBOOK.md`, and `docs/ARCHITECTURE.md`.
- Current backend boundaries in `services/api/src/tothemoon_api/config.py`, `guards.py`, `auth.py`, `routers/billing.py`, and `external/*`.

## Gate Decision

The next waves may continue for local/dev SaaS implementation, but production readiness is gated. No production deployment, real customer billing, live provider settlement, or live trading capability should ship until the blocking follow-ups below are closed and verified.

## Non-Negotiable Guardrails

### Auth and Identity

- Authentication must fail closed when `APP_ENV=production`; demo users, deterministic tokens, and plaintext/shared secrets are not acceptable production fallbacks.
- Passwords and API keys must be one-way hashed with rotation/revocation semantics. Plaintext API keys may be returned once at creation only and must not be logged, stored, or shown again.
- Every tenant-scoped endpoint must derive `org_id` from authenticated context. Request bodies and query strings must not be trusted for tenant selection unless explicitly authorized by admin policy.
- Tests must cover cross-tenant denial for SaaS dashboard, API keys, billing objects, simulation state, invoices, audit logs, and provider status.

### Secrets

- Required production secrets must be externally injected through a secret manager or runtime environment, never committed into `.env`, docs, fixtures, screenshots, or issue comments.
- Startup and readiness must report missing secret classes without echoing values. Logs must redact authorization headers, API keys, bearer tokens, webhook signatures, cookies, and provider secrets.
- Provider credentials must be isolated by purpose: auth/JWT, billing webhooks, external market/security data, Circle/settlement, observability, and live-trading approval must not share secrets.
- Secret rotation must have an operator path in docs before the corresponding integration can be marked production-ready.

### Billing and Payments

- Billing state must be webhook-driven and idempotent. Client-side plan claims or optimistic UI state cannot unlock quotas, settlement, or paid features.
- Webhook handlers must verify provider signatures, persist event IDs, reject replay, and record auditable subscription transitions.
- Quota enforcement must live server-side and be checked at write boundaries, not just in dashboard display logic.
- Any Circle/USDC movement must remain sandbox/testnet/manual until a separate production approval explicitly covers custody, reconciliation, refund/error handling, and incident response.

### External Providers

- External market/security providers must sit behind typed adapters with timeouts, bounded retries, provider health state, and deterministic degraded-mode behavior.
- Cached provider data must carry provider name, observed timestamp, and freshness status so stale data is not mistaken for live truth.
- Provider errors may degrade scoring or mark data unavailable, but must not silently convert to high-confidence safe/risk decisions.
- No provider SDK or HTTP client may log full request headers, raw secrets, wallet credentials, or user payloads containing sensitive fields.

### Paper/Live Trading Boundary

- `orderSubmissionEnabled` remains false, direct order submission remains blocked, and `/ready` must continue validating this invariant.
- Bot orchestration may read through external market/security providers only via `ExternalProviderAdapter` instances. The exposed `/health.external_adapter_contract` must remain `mode: paper_only_read_through`, `order_submission_enabled: false`, and `mainnet_order_submission_enabled: false` before any bot-facing workflow is considered releasable.
- New provider integrations must be registered through `provider_adapter(...)` and must not set `read_only=false`, `supports_order_submission=true`, or `mainnet_order_submission=true`; unsafe adapters are expected to fail at registration or call time.
- `runtime_mode=paper` is the default. `guarded_testnet` requires explicit non-production feature flags and hard limits. `blocked_mainnet` is forbidden in production.
- Wallet signing must remain manual-only in this MVP. No autonomous signing, seed phrase handling, private-key storage, or mainnet route should be introduced.
- Any future change that relaxes paper-only behavior requires a new architecture/security review, legal/compliance approval, and a separate operator runbook before implementation.

### Observability and Audit

- Security-relevant events must emit structured audit records with actor, org, action, target, result, correlation ID, and timestamp.
- Metrics/alerts must cover auth failures, API-key creation/revocation, billing webhook failures, quota denials, provider degradation, guardrail failures, and readiness failures.
- Logs must be useful for incident response while preserving redaction. Production logs must not contain full tokens, API keys, webhook signatures, or payment secrets.
- Readiness must distinguish deploy blockers from degraded optional providers so operators can safely decide rollback vs. degraded operation.

### Deployment

- Production deployment needs explicit environment separation for local, staging, and production; staging must be the first target for real provider credentials.
- Migrations must be reversible or have a documented rollback path. Schema changes touching auth, billing, settlement, or audit data need backup/snapshot instructions.
- CORS, cookie/session settings, public URLs, and service health endpoints must be configured per environment, not hardcoded for local demos.
- CI/verification must include the focused guardrail tests before production readiness can be claimed.

## Blocking Follow-Ups Filed Under GEN-1

- Auth and tenant isolation production gate: prove production auth fails closed, API keys are hashed/revocable, and cross-tenant reads/writes are denied.
- Billing webhook and quota enforcement gate: make paid entitlement changes signature-verified, idempotent, auditable, and server-enforced.
- Provider and secret redaction gate: enforce adapter failure behavior, freshness metadata, readiness/provider health semantics, and no secret leakage.
- Deployment readiness and rollback gate: define staging/production env separation, migrations/backup/rollback, CORS/session settings, and production smoke checks.

## Recommended Merge/Release Policy

- Implementation PRs may merge when they preserve the non-negotiable guardrails and pass scoped tests for their slice.
- Any change touching auth, API keys, billing webhooks, Circle/settlement, provider clients, runtime mode, readiness, or deployment config needs architecture/security review before production release.
- Production readiness for GEN-1 requires closing the blocking follow-ups, updating runbooks, and attaching verification evidence to the relevant issue threads.

## GEN-32 Operator Handoff — Paper-Only Bot Orchestration

- Scope: GEN-32 is unblocked for docs/release handoff because the API now exposes a typed external-provider adapter contract while preserving paper-only bot orchestration over the API boundary.
- Runtime evidence: `GET /health` includes `external_adapter_contract` with provider names, declared capabilities, API-key requirement flags, read-only status, and explicit order-submission booleans.
- Required checks: run `PYTHONPATH=services/api/src pytest services/api/tests/test_external_data.py::test_external_adapter_contract_is_paper_only_read_through services/api/tests/test_external_data.py::test_adapter_rejects_order_capable_provider services/api/tests/test_api.py::test_health_endpoint_exposes_paper_mode_by_default` before claiming the adapter boundary is intact.
- Release gate: do not mark any bot workflow production-ready if `/health.external_adapter_contract.order_submission_enabled` or `/health.external_adapter_contract.mainnet_order_submission_enabled` is true, or if any listed provider reports `read_only=false`, `supports_order_submission=true`, or `mainnet_order_submission=true`.
- Next action: backend owner should keep new market/security providers behind `ExternalProviderAdapter`; docs owner should update this handoff and `docs/CHANGELOG.md` whenever the public provider list or adapter contract fields change.
