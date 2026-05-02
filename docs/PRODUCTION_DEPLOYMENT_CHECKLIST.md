# Production Deployment Checklist and Evidence Template

Date prepared: 2026-05-02
Issue: GEN-45
Applies to: production deployments for the FastAPI backend, SaaS frontend, and supporting Cloud Run/runtime services.

## Deployment Gate

Production deployment is not approved until the current production readiness blockers in `docs/reports/2026-05-02-production-readiness-risk-register.md` are closed with evidence. Use this checklist as the evidence package shape for a future approved deployment; do not treat the template itself as approval to deploy.

GEN-25 adds the operator gate in `docs/production-readiness-gate.md`. Complete that gate first for environment separation, staging real-provider credentials, migration rollback evidence, production smoke commands, and go/no-go ownership.

## Operator Inputs

Record only references, URLs, commit SHAs, and pass/fail results. Do not paste secret values, bearer tokens, cookies, webhook signing secrets, private keys, API keys, or raw authorization headers.

| Field | Evidence |
| --- | --- |
| Release owner | _TBD_ |
| Reviewer / approver | _TBD_ |
| Deployment window | _TBD_ |
| Target environment | `production` |
| Git branch | _TBD_ |
| Git commit SHA | _TBD_ |
| CI run URL | _TBD_ |
| Artifact / image digest | _TBD_ |
| Cloud project / region | _TBD_ |
| API service URL | _TBD_ |
| Web service URL | _TBD_ |
| Rollback target | _TBD previous revision, image digest, or commit SHA_ |

## Pre-Deployment Checklist

### 1. Release Scope

- [ ] Confirm the release issue links every included product, backend, frontend, migration, billing, provider, and observability change.
- [ ] Confirm all P0/P1 production blockers from `docs/reports/2026-05-02-production-readiness-risk-register.md` are closed or explicitly waived by the accountable owner.
- [ ] Confirm no live trading, custody, autonomous signing, or mainnet order submission behavior is enabled.
- [ ] Confirm the rollback target is deployable and still compatible with the current database/schema state.

Evidence:

```text
Release issue(s):
Closed blocker issue(s):
Approved waiver(s), if any:
Rollback target:
```

### 2. Repository and Artifact Integrity

- [ ] Confirm the worktree is clean before tagging or building: `git status --short`.
- [ ] Confirm GitHub/GitLab mirrors match for the release branch: `make mirror-verify`.
- [ ] Confirm generated artifacts are not tracked or accidentally unignored: `make generated-artifacts-check`.
- [ ] Capture the exact commit SHA: `git rev-parse HEAD`.
- [ ] Capture artifact/image digest from the deploy platform or registry.

Evidence:

```text
git status --short:
make mirror-verify:
make generated-artifacts-check:
git rev-parse HEAD:
Artifact/image digest:
```

### 3. Backend Validation

- [ ] Run the backend regression suite: `make api-test`.
- [ ] Run backend lint: `make api-lint`.
- [ ] Run backend type checks: `make api-typecheck`.
- [ ] Confirm production config fails closed for missing required secret classes without logging secret values.
- [ ] Confirm `/health` and `/ready` smoke checks are expected to be non-secret and class-based only.

Evidence:

```text
make api-test:
make api-lint:
make api-typecheck:
Production config/secret validation evidence:
Expected /health response shape:
Expected /ready response shape:
```

### 4. Frontend Validation

- [ ] Run the production frontend build: `make web-next-build`.
- [ ] Run targeted E2E coverage when the release changes auth, billing, dashboard, audit log, API keys, or status UI: `make web-next-e2e`.
- [ ] Confirm the frontend API base URL points at the production API origin.
- [ ] Confirm CORS/session origins exactly match the deployed web URL and any approved operator origins.

Evidence:

```text
make web-next-build:
make web-next-e2e or skipped reason:
Frontend API base URL reference:
Approved CORS/session origins:
```

### 5. Secrets and Provider Readiness

- [ ] Verify production secrets are referenced by secret-manager/config names only; do not copy values into the evidence package.
- [ ] Confirm auth/JWT/session secret requirements are production-grade and rotated according to `docs/SECURITY_RUNBOOK.md`.
- [ ] Confirm Stripe/webhook secrets are present for test-mode smoke or production billing, as applicable; rotate by temporarily configuring `STRIPE_WEBHOOK_SECRET` as comma-separated `new,old`, verify both signatures during the deploy window, then remove `old` after Stripe delivery uses `new` only.
- [ ] Confirm external provider keys and degraded-mode semantics are documented for the release.
- [ ] Confirm observability destinations are configured without leaking DSNs, headers, or API keys in logs.

Evidence:

```text
Secret reference inventory, names only:
Auth/session readiness:
Billing/webhook readiness:
Provider readiness/degraded-mode decision:
Observability readiness:
Log redaction spot-check:
```

### 6. Database and Migration Safety

- [ ] Confirm whether the release includes schema migrations.
- [ ] Capture backup/snapshot evidence before migration-bearing releases.
- [ ] Confirm production startup does not perform implicit schema mutation outside the approved migration path.
- [ ] Confirm rollback instructions account for forward-only migrations or data backfills.
- [ ] Attach restore-test or dry-run evidence when a migration changes auth, billing, subscriptions, audit logs, provider state, or trading records.

Evidence:

```text
Migration included: yes/no
Migration revision(s):
Backup/snapshot reference:
Restore-test/dry-run result:
Rollback notes for schema/data:
```

### 7. Deployment Execution

- [ ] Confirm `GCLOUD_PROJECT_ID`, `GCLOUD_REGION`, service names, and runtime env var references are set in the operator shell or deployment system.
- [ ] Review `scripts/deploy_cloud_run.sh` before use and confirm service source directories match the release target.
- [ ] Deploy the API service first and capture the revision URL/name.
- [ ] Deploy the web service after confirming its API base URL points to the deployed API.
- [ ] Update CORS/session origins only to approved HTTPS production origins and approved temporary smoke-test origins.

Evidence:

```text
Deployment command or pipeline URL:
API revision:
Web revision:
CORS/session origin update:
Deployment logs location:
```

### 8. Post-Deployment Smoke Checks

- [ ] `GET /health` returns healthy runtime status without secrets.
- [ ] `GET /ready` returns ready only when production guardrails, dependencies, and required secret classes pass.
- [ ] Auth smoke covers signup/login or production identity-provider session flow, as applicable.
- [ ] Tenant-boundary smoke confirms one organization cannot read another organization's dashboard, billing, invoice, audit-log, API-key, or provider-status data.
- [ ] Billing webhook smoke runs in Stripe test mode before any production billing switch.
- [ ] Provider-status smoke confirms stale/degraded/unavailable provider states are visible and not presented as high-confidence live safety decisions.
- [ ] Observability smoke confirms traces/errors/audit logs arrive without leaking tokens, cookies, API keys, signatures, or private values.

Evidence:

```text
/health result:
/ready result:
Auth/session smoke:
Tenant-boundary smoke:
Billing webhook smoke:
Provider-status smoke:
Observability/audit smoke:
```

### 9. Rollback and Handoff

- [ ] Confirm rollback command or platform action before declaring the release complete.
- [ ] Confirm rollback smoke checks are listed for API, frontend, database, billing, providers, and observability.
- [ ] Record residual risks, skipped checks, and owner-approved exceptions.
- [ ] Post the final operator handoff to the release issue with links to evidence artifacts.

Evidence:

```text
Rollback command/action:
Rollback smoke checklist:
Skipped checks and reason:
Residual risks:
Final handoff link:
```

## Evidence Package Template

Copy this section into the release issue or an evidence artifact under `ops/evidence/`.

```markdown
# Production Deployment Evidence

Date:
Release issue:
Release owner:
Approver:
Target environment:
Commit SHA:
Artifact/image digest:
API revision:
Web revision:
Rollback target:

## Gate Status

- Production readiness blockers closed/waived:
- Live trading/custody/mainnet guardrails confirmed:
- Migration safety confirmed:
- Secret references verified without value exposure:

## Verification Results

| Check | Command / source | Result | Evidence link or excerpt |
| --- | --- | --- | --- |
| Worktree clean | `git status --short` |  |  |
| Mirror verification | `make mirror-verify` |  |  |
| Generated artifacts | `make generated-artifacts-check` |  |  |
| Backend tests | `make api-test` |  |  |
| Backend lint | `make api-lint` |  |  |
| Backend typecheck | `make api-typecheck` |  |  |
| Frontend build | `make web-next-build` |  |  |
| Frontend E2E | `make web-next-e2e` or skipped reason |  |  |
| Health smoke | `GET /health` |  |  |
| Readiness smoke | `GET /ready` |  |  |
| Auth/session smoke | scripted/manual |  |  |
| Tenant-boundary smoke | scripted/manual |  |  |
| Billing webhook smoke | Stripe test mode |  |  |
| Provider degraded-mode smoke | scripted/manual |  |  |
| Observability/audit smoke | dashboard/log query |  |  |
| Rollback dry-run/review | platform/runbook |  |  |

## Deployment Notes

- Deployment command or pipeline:
- Runtime config references, names only:
- CORS/session origins:
- Database backup/snapshot reference:
- Rollback action:

## Exceptions and Residual Risk

- Skipped checks:
- Approved waivers:
- Residual risks:
- Next owner/action:
```
