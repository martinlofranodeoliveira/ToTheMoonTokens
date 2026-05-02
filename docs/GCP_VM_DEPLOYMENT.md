# GCP VM Deployment

This repository deploys to a Google Compute Engine VM with Docker Compose and Caddy. The deploy path keeps production in paper/manual mode by default and does not commit credentials.

## GitHub Actions

Workflow: `.github/workflows/deploy-gcp-vm.yml`

Triggers:

- Pushes to `main` after backend and frontend baseline jobs pass.
- Manual `workflow_dispatch` runs.

Required GitHub secrets or environment secrets:

| Secret | Purpose |
| --- | --- |
| `GCP_PROJECT_ID` | Google Cloud project that owns the VM. |
| `GCP_SERVICE_ACCOUNT_JSON` | Service account JSON used by `google-github-actions/auth`. |
| `GCP_VM_NAME` | Compute Engine VM instance name. |
| `GCP_VM_ZONE` | Compute Engine zone for the VM, for example `us-central1-a`. |
| `GCP_VM_DB_PASSWORD` | Postgres password used by the VM Compose stack. |
| `JWT_SECRET` | API JWT signing secret, at least 32 characters. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. During rotation, set comma-separated `new,old`, verify new webhook delivery, then remove `old`. |
| `GEMINI_API_KEY` | Gemini API key for the agent experience. |
| `PUBLIC_HOST` | Caddy site address, for example `example.com` or `:80`. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed by the API. |

Optional provider/observability secrets used when configured:

- `CIRCLE_API_KEY`
- `CIRCLE_ENTITY_SECRET`
- `CIRCLE_WALLET_SET_ID`
- `GOPLUS_API_KEY`
- `TOKENSNIFFER_API_KEY`
- `BIRDEYE_API_KEY`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_HEADERS`
- `SENTRY_DSN`

The workflow writes `.env.deploy` at runtime from GitHub secrets and then runs `scripts/deploy_gcp_vm.sh`. The generated env file is excluded from the deployment archive and must not be committed.

### CI Evidence

Both CI systems publish a secret-free `ops/evidence/vm-deploy-ci-evidence.json` artifact for `GEN-54`:

- GitHub Actions: `.github/workflows/ci.yml` and `.github/workflows/deploy-gcp-vm.yml` run `make vm-deploy-ci-evidence` after backend and frontend baselines pass, then upload the JSON artifact as `vm-deploy-ci-evidence`.
- GitLab CI: `.gitlab-ci.yml` runs `vm-deploy-evidence` in the `evidence` stage after backend, lint/typecheck, secret/env scan, and static checks pass, then keeps the JSON artifact for 30 days.

The artifact records CI provider metadata, commit/ref, the VM deploy workflow/script/runbook paths, required secret names only, and the production safety defaults. It must not contain secret values.

## VM Prerequisites

The target VM needs:

- Docker Engine with the Compose plugin available as `docker compose`.
- SSH access for the configured Google service account.
- Firewall rules allowing inbound `80/tcp` and, when using a DNS hostname with Caddy TLS, `443/tcp`.
- Enough disk space for release directories under `/opt/tothemoontokens/releases`.

## Local Agent Deploy

From an agent shell with Google credentials available:

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_VM_NAME="your-vm-name"
export GCP_VM_ZONE="us-central1-a"
export PUBLIC_HOST=":80"
export TTM_ENV_FILE="$PWD/.env.deploy"
scripts/deploy_gcp_vm.sh
```

`TTM_ENV_FILE` is optional if `.env.deploy` or `.env` exists. The env file must include at least:

```dotenv
APP_ENV=production
DATABASE_URL=postgresql+psycopg://ttm:replace-me@db:5432/ttm
POSTGRES_PASSWORD=replace-me
JWT_SECRET=replace-with-at-least-32-characters
WALLET_MODE=manual_only
AUTONOMOUS_PAYMENTS_ENABLED=false
CIRCLE_BOOTSTRAP_ON_STARTUP=false
ALLOW_IMPORT_TIME_INIT_DB=false
```

## Environment Gate

Use the same deployment mechanism for `staging` and `production`, but keep their VM/project, database, public URL, CORS origins, cookie/session policy, and secret-manager references separate. The first deployment using real provider credentials must target `staging`; do not point real-provider credentials at `production` until the GEN-25 gate in `docs/production-readiness-gate.md` has named owner evidence for staging smoke, backup/rollback rehearsal, CORS/session settings, provider health, and final go/no-go approval.

Before promoting a release SHA from `staging` to `production`, record this secret-free evidence in `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`:

```text
Release SHA:
Staging VM/project reference:
Staging API/web public URLs:
Production VM/project reference:
Production API/web public URLs:
CORS_ALLOWED_ORIGINS reference:
Cookie/session origin policy:
DATABASE_URL secret/config reference:
Provider credential secret/config references:
Backup/snapshot identifier:
Rollback target release id:
```

## Rollback Behavior

The deploy script uploads a timestamped release archive, updates `/opt/tothemoontokens/current`, starts the VM Compose stack, and verifies `http://127.0.0.1/health` through Caddy. Browser smoke for the React SaaS dashboard is routed through Caddy at `/saas/`, with API calls resolved against the same public origin. If Compose startup or the health check fails, it points `current` back to the previous release and attempts to restart the previous stack.

For a post-deploy app/runtime rollback after the health check passes, SSH to the VM and repoint `current` to the recorded rollback release. This only rolls back application files and containers; use `docs/RUNBOOK_DB.md` for database restore or forward-fix decisions after incompatible migrations.

```bash
export TTM_DEPLOY_ROOT="/opt/tothemoontokens"
export TTM_ROLLBACK_RELEASE="<recorded-release-id>"

cd "$TTM_DEPLOY_ROOT"
test -d "releases/$TTM_ROLLBACK_RELEASE"
ln -sfn "$TTM_DEPLOY_ROOT/releases/$TTM_ROLLBACK_RELEASE" "$TTM_DEPLOY_ROOT/current"
cp "$TTM_DEPLOY_ROOT/shared/.env" "$TTM_DEPLOY_ROOT/current/.env"
cd "$TTM_DEPLOY_ROOT/current"
docker compose -p tothemoontokens -f docker-compose.vm.yml up -d --build --remove-orphans
curl -fsS http://127.0.0.1/health
curl -fsS http://127.0.0.1/ready
```

## Safety Defaults

Production deploys set:

- `WALLET_MODE=manual_only`
- `AUTONOMOUS_PAYMENTS_ENABLED=false`
- `CIRCLE_BOOTSTRAP_ON_STARTUP=false`
- `ALLOW_IMPORT_TIME_INIT_DB=false`

Do not enable live settlement, autonomous payments, or mainnet order submission from this deploy path without a separate production approval and updated runbook.
