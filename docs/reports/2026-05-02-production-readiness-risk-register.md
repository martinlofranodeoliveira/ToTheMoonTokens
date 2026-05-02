# Production Readiness Risk Register Refresh

Date: 2026-05-02
Issue: GEN-20
Owner: Marcus / CTO architecture review
Scope: re-audit after the current SaaS backend/frontend/QA wave, focused on auth/session boundaries, secrets handling, live-trading guardrails, migrations, and deployment assumptions.

## Sources Reviewed

- Architecture/security gate: `docs/ARCHITECTURE_SECURITY_GUARDRAIL_GATE.md`.
- Prior baseline: `docs/reports/phase-0-audit.md`.
- Operator docs: `docs/ARCHITECTURE.md`, `docs/SECURITY_RUNBOOK.md`, `docs/RUNBOOK_DB.md`, `docs/TRADING_GUARDRAILS.md`, `docs/REAL_MODE_GRADUATION.md`, `docs/DELIVERY_VALIDATION.md`.
- Current backend surfaces: `services/api/src/tothemoon_api/config.py`, `auth.py`, `main.py`, `database.py`, `routers/billing.py`, `external/*`, and `db_models.py`.
- Current tests: `services/api/tests/test_auth.py`, `services/api/tests/test_api.py`, and `services/api/tests/test_config.py`.

## Gate Decision

Production remains blocked. Local/dev SaaS implementation may continue, but no production deployment, real customer billing, live provider settlement, or relaxation of paper-only trading is acceptable until the P0/P1 items below have owners, implementation evidence, and focused verification attached to their issue threads.

## Ranked Risk Register

| ID | Severity | Area | Risk | Evidence | Required owner/action | Verification expectation |
| --- | --- | --- | --- | --- | --- | --- |
| GEN20-R1 | P0 | Auth/session boundary | Production auth can still rely on in-app password/JWT behavior without a documented production session posture, cookie policy, CSRF posture, admin policy, or complete cross-tenant matrix. This is the highest deployment blocker because every SaaS, billing, audit, and provider-status surface depends on tenant identity. | `auth.py` issues bearer JWTs; `test_auth.py` covers signup/login/API-key basics and some tenant denial, but no production cookie/session/CORS/CSRF decision record or complete matrix for billing objects, audit logs, provider status, and future admin access. | Backend owner: Felix. QA owner: Mira. Define production auth/session contract, fail-closed production secret requirements, admin-only tenant override policy, and cross-tenant denial tests. | Focused pytest suite covering production `APP_ENV`, JWT secret requirements, CORS/session behavior, API-key lifecycle, and cross-tenant denial for dashboard, API keys, billing/subscriptions, invoices, usage, audit logs, and provider status. |
| GEN20-R2 | P0 | Billing/webhooks | Stripe webhook handling upgrades plans directly from checkout metadata/client reference and appears to lack persisted event IDs/replay protection, provider customer/subscription ownership checks, and full subscription lifecycle transitions. Real billing must not rely on optimistic UI or replayable webhook state. | `routers/billing.py` verifies a signature and updates `Organization.plan_id`, but the reviewed model/test surface does not show webhook event-id persistence, replay rejection, customer ownership reconciliation, or lifecycle coverage beyond checkout completion. | Backend owner: Theo. QA owner: Rex. Implement idempotent webhook event storage, replay rejection, provider customer/subscription reconciliation, and subscription lifecycle tests before enabling paid features. | Tests for invalid/missing signatures, duplicate event IDs, wrong org/customer mapping, plan downgrade/cancel events, quota gating from server-side subscription state, and audit log entries. |
| GEN20-R3 | P0 | Live trading / custody boundary | The paper-only trading guardrail remains correct, but future settlement/Circle/provider work risks blurring sandbox payment, wallet, and trading execution boundaries without a separate approval gate. | `main.py` exposes `orderSubmissionEnabled: False` and `/ready` checks mainnet remains blocked; `TRADING_GUARDRAILS.md` and `REAL_MODE_GRADUATION.md` prohibit mainnet. Current config still includes Circle and live-trading env names that need strict operational separation. | CTO owner: Marcus for review gate. Backend owner: Iris for any settlement work. Keep Circle/USDC sandbox/manual-only; require new architecture/security/legal approval before custody, autonomous signing, live settlement, or mainnet routes. | `/ready` and guardrail tests must fail closed for mainnet/autonomous settings; any settlement PR must include sandbox-only proof, no private-key handling, no order submission capability, and an operator runbook. |
| GEN20-R4 | P1 | Secrets/readiness | Production secret classes are partly validated, but secret rotation, readiness semantics, and no-leak behavior need one consolidated production-readiness check before deployment. | `config.py` has many secret-backed integrations and production validation hooks; `SECURITY_RUNBOOK.md` documents secret inventory/rotation concepts, but provider/billing/auth/observability secrets are not yet tied to a deploy-time evidence checklist. | Backend owner: Felix. Ops/architecture reviewer: Marcus. Add a deploy checklist mapping secret classes to required env/secret-manager references and readiness failure messages that never echo values. | Tests for missing production JWT/billing/provider secrets where required, log redaction for authorization/API keys/webhook signatures/cookies/provider keys, and `/ready` responses that disclose classes only. |
| GEN20-R5 | P1 | External providers | Provider adapters now assert read-only paper-mode contracts, but degraded-mode semantics still allow placeholder/fallback security results that could be mistaken for confident production decisions. | `external/adapters.py` enforces read-only adapters; `external/security.py` falls back to placeholder audit data when providers fail or are missing. Provider health exists, but cached result freshness/confidence is not consistently part of every API decision boundary. | Backend owner: Lily. QA owner: Mira. Make provider responses carry provider, observed timestamp, freshness, confidence/degraded status, and ensure UI/API cannot present placeholder data as live safety truth. | Provider tests for timeout/degraded/missing-key paths, stale cache metadata, health endpoint semantics, and API responses that mark unavailable/degraded instead of returning high-confidence safety decisions. |
| GEN20-R6 | P1 | Migrations/data rollback | Database backup/restore docs exist, but schema-change release safety is not yet tied to the SaaS auth/billing/audit migrations and import-time `init_db()` behavior remains a production deployment hazard. | `RUNBOOK_DB.md` covers backup/restore/monthly restore tests; `database.py` exposes `init_db()` and `main.py` calls it during import. Alembic migration docs exist, but production rollout criteria are not attached to migration PRs. | Backend owner: Theo. Ops reviewer: Marcus. Remove or gate import-time schema creation for production, require Alembic-only production migrations, and add backup/snapshot instructions to migration-bearing issues. | Test/import check proving production app startup does not mutate schema implicitly; migration PR checklist with backup, rollback, and restore-test evidence for auth/billing/audit tables. |
| GEN20-R7 | P2 | Deployment assumptions | Deployment still lacks a single production profile covering host/origin/CORS, TLS termination expectations, static asset target, smoke checks, CI evidence, and mirror/review-gate artifacts. | `DELIVERY_VALIDATION.md` defines checks/evidence; `.env.example`, `docker-compose.yml`, `Makefile`, and web-next scripts define local defaults. The current worktree also contains frontend/backend implementation edits, so this register intentionally avoids asserting those are release-ready. | PM owner: Sage with Marcus review. Create a production readiness checklist that references exact commands, expected env names, CORS/session origins, health/readiness smoke checks, rollback, and evidence artifacts. | Dry-run deployment checklist with `make api-test`, targeted frontend build/e2e where applicable, `/health`, `/ready`, auth smoke, billing webhook smoke in test mode, and rollback evidence. |

## Follow-Up Issues Recommended

Create concrete child issues rather than broad product edits:

1. Backend/auth: production auth and tenant-boundary hardening for GEN20-R1 and GEN20-R4.
2. Backend/billing: idempotent billing webhook and subscription lifecycle hardening for GEN20-R2.
3. Backend/providers: provider freshness/degraded-mode contract for GEN20-R5.
4. Backend/ops: production migration/import-time `init_db()` rollback gate for GEN20-R6.
5. PM/ops: production deployment checklist and evidence template for GEN20-R7.

## Verification Performed

No code was changed for this review. Verification was documentation and static source audit only:

- `git status --short` showed an already-dirty worktree with unrelated backend/frontend/doc edits; those were not modified by this audit except this new register.
- `rg -n "risk register|production readiness|readiness|architecture risk|deployment risk|security|backup|observability" -S . --glob '!node_modules' --glob '!dist' --glob '!build'` located the existing guardrail and audit materials.
- `curl -fsS ... /api/issues/$PAPERCLIP_TASK_ID` confirmed GEN-20 acceptance criteria and ownership.
- Focused reads were performed for the docs and source files listed in `Sources Reviewed`.

## Residual Risk

This refresh is intentionally an architecture/risk gate, not remediation. The ranked register should be treated as the production blocker list until child issues close with implementation evidence and focused tests.
