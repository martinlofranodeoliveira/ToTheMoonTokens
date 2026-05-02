# GEN-25 Production Gate: Deployment Readiness and Rollback

Date prepared: 2026-05-02
Owner: Sage
Status: blocked pending named owner evidence below
Related docs: `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`, `docs/GCP_VM_DEPLOYMENT.md`, `docs/RUNBOOK_DB.md`, `docs/reports/2026-05-02-production-readiness-risk-register.md`

## Gate Decision

Production deployment is blocked until this gate is completed with evidence. The first real-provider-credential deployment target is `staging`, not `production`. Production remains paper/manual by default and must not enable live settlement, custody movement, autonomous signing, or mainnet order submission without a separate approval.

Do not paste secrets, tokens, cookies, API keys, private keys, webhook signing secrets, or bearer headers into this file. Record secret-manager/config reference names only.

## Environment Separation

| Environment | Purpose | Provider credentials | Data store | Public URL | Deployment approval |
| --- | --- | --- | --- | --- | --- |
| `local` | Developer validation and SQLite smoke checks. | Optional sandbox/test keys only; `.env.example` defaults. | Local disposable SQLite or developer DB. | `http://127.0.0.1:8010` API and local Vite/web server. | Developer-owned; never promotes to users. |
| `staging` | First real-provider-credential target and production dress rehearsal. | Real provider credentials allowed only through secret manager/config references; Stripe remains test mode unless separately approved. | Staging database isolated from production. | Staging API/web URLs recorded in the evidence package. | Release owner plus security/ops reviewer. |
| `production` | User-facing service after all gates pass. | Production credentials by secret reference only. | Production database with pre-change backup/snapshot. | Production API/web URLs recorded in the evidence package. | Explicit go/no-go approval after smoke and rollback evidence. |

Required config evidence for `staging` and `production`:

```text
APP_ENV:
PUBLIC_API_BASE_URL:
CORS_ALLOWED_ORIGINS:
COOKIE_DOMAIN or session origin policy:
DATABASE_URL secret/config reference:
JWT_SECRET secret reference:
Stripe secret/webhook references, if billing is enabled:
Provider key references, if provider-backed checks are enabled:
OTEL/Sentry destination references, if observability is enabled:
ALLOW_IMPORT_TIME_INIT_DB=false evidence:
```

## Required Commands

Run the smallest applicable command set before staging promotion, then rerun the same release SHA evidence before production promotion.

```bash
# Repository and generated-artifact safety
git status --short
make generated-artifacts-check
git rev-parse HEAD

# Backend correctness and production config guardrails
make api-test
make api-lint
make api-typecheck
APP_ENV=production ALLOW_IMPORT_TIME_INIT_DB=false make api-test

# Frontend production baseline
make web-next-build

# Deployment evidence package for the GCP VM path
make vm-deploy-ci-evidence
```

If auth, billing, tenant isolation, dashboard, API key, or status UI behavior changes, also run:

```bash
make web-next-e2e
```

Record pass/fail results and CI URLs in `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`; do not copy secret-bearing logs.

## Production Smoke Checklist

Use the deployed public URLs for browser-facing checks and the private/service URL for internal health checks when available. Replace placeholders with environment-specific URLs and redact credentials from shell history/log capture.

```bash
# Service health and readiness must return non-secret status only.
curl -fsS "$API_BASE_URL/health"
curl -fsS "$API_BASE_URL/ready"

# Provider health must identify unavailable/degraded providers without presenting placeholder data as confident production truth.
curl -fsS "$API_BASE_URL/api/market/health"
curl -fsS "$API_BASE_URL/api/network/arc/health"
```

Minimum smoke evidence to attach before production go/no-go:

- [ ] **Auth:** register/login or approved auth smoke succeeds; unauthenticated access to tenant data fails.
- [ ] **Tenant isolation:** a user/API key from tenant A cannot read tenant B dashboard, API keys, audit logs, invoices, proposals, or token usage.
- [ ] **Billing/quota:** Stripe test-mode webhook or equivalent billing smoke updates subscription/quota state exactly once, including duplicate webhook/idempotency behavior where applicable.
- [ ] **Provider health:** `/health`, `/ready`, provider health, and market/ARC health endpoints report ready/degraded/unavailable without leaking secret values.
- [ ] **Immutable paper/live guardrails:** `/ready` confirms mainnet submission is blocked, paper/manual mode remains default, and no live settlement/custody/autonomous payment path is enabled.
- [ ] **CORS/session:** browser smoke from the approved web origin succeeds, and a disallowed origin is rejected or not granted credentials.
- [ ] **Observability:** release owner confirms alerts/dashboard destination references and redacted error telemetry without pasting DSNs or auth headers.

## Migration Backup and Rollback Gate

For releases touching auth, billing, subscription, settlement, provider state, audit log, API key, quota, or trading records, complete this section before migration execution.

1. Capture a pre-change database backup/snapshot using the procedure in `docs/RUNBOOK_DB.md`.
2. Record the backup/snapshot identifier and storage location reference, not credentials.
3. Confirm `ALLOW_IMPORT_TIME_INIT_DB=false` in `staging` and `production`.
4. Run the migration in `staging` first and capture command/result.
5. Run the targeted smoke checklist against `staging`.
6. Document whether rollback is schema downgrade, forward fix, or database restore.
7. Perform or cite a restore rehearsal for high-risk auth/billing/audit migrations.

Evidence template:

```text
Migration files:
Pre-change backup/snapshot identifier:
Backup storage reference:
Staging migration command/result:
Production migration command/result:
Rollback strategy, one of downgrade | forward-fix | restore:
Rollback command or restore runbook reference:
Restore rehearsal evidence:
Data owner approval:
```

Rollback path:

```bash
# VM deploy rollback for app/runtime failure; see docs/GCP_VM_DEPLOYMENT.md for details.
./scripts/deploy_gcp_vm.sh

# Database restore path for data rollback; replace with the approved backup reference.
gunzip -c backups/ttm-YYYYMMDDTHHMMSSZ.sql.gz | psql "$DATABASE_URL"
```

Do not use app rollback as a substitute for database rollback when a forward migration changes incompatible data or schema.

## Go/No-Go

Production promotion is allowed only when every row has an owner, evidence reference, and pass result.

| Gate | Owner | Evidence reference | Result |
| --- | --- | --- | --- |
| P0/P1 blockers closed or waived | _blocked: release owner_ | _TBD_ | _TBD_ |
| Staging real-provider credential smoke | _blocked: backend/provider owner_ | _TBD_ | _TBD_ |
| Auth and tenant-isolation smoke | _blocked: backend/auth owner_ | _TBD_ | _TBD_ |
| Billing/quota smoke | _blocked: billing owner_ | _TBD_ | _TBD_ |
| Paper/live guardrail smoke | _blocked: backend/ops owner_ | _TBD_ | _TBD_ |
| CORS/cookie/public URL config | _blocked: ops owner_ | _TBD_ | _TBD_ |
| Backup/snapshot and rollback rehearsal | _blocked: database owner_ | _TBD_ | _TBD_ |
| Production smoke after deploy | _blocked: release owner_ | _TBD_ | _TBD_ |

## Current Blockers and Next Action

Blocked owner/action list:

- Backend/auth owner: provide auth and tenant-isolation smoke commands or CI evidence for the deployed `staging` URL.
- Billing owner: provide Stripe test-mode billing/quota smoke evidence and duplicate webhook/idempotency evidence.
- Provider owner: provide staging provider credential references and degraded/unavailable provider health evidence.
- Database owner: provide migration list, backup/snapshot identifier, rollback strategy, and restore rehearsal evidence for schema/data changes.
- Ops owner: provide concrete staging and production public URLs, CORS origins, cookie/session policy, health/readiness endpoints, and alert/dashboard references.
- Release owner: fill `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` with commit SHA, CI URL, artifact digest, rollback target, go/no-go decision, and post-deploy smoke results.

Next action: keep GEN-25 blocked until these owner inputs are attached, then replace the `_TBD_` gate rows with evidence and request production go/no-go approval.
