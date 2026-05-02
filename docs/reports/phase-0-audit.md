# Phase 0 Audit — TTM SaaS

Date: 2026-05-02
Issue: GEN-2 — Fase 0: auditar repo e registrar plano minimo

## Repository Snapshot

This repository is a mixed Python + frontend SaaS codebase for ToTheMoonTokens / TTM SaaS.

Top-level areas:

- `services/api`: FastAPI backend package (`tothemoontokens-api`) with tests, Alembic config, Dockerfile, and Python packaging metadata.
- `apps/web`: existing static Vanilla JS client dashboard served by Python `http.server` or nginx container.
- `apps/web-next`: newer React 19 + Vite + TypeScript dashboard with Playwright e2e config.
- `apps/pitch`: static pitch/demo site.
- `bot`: standalone Python bot/scanner/trader modules.
- `scripts`: local demo, validation, benchmarking, and integration helper scripts.
- `ops`: deployment, Grafana alerting, VM startup, evidence, and hackathon ops assets.
- `docs`: architecture, runbooks, implementation plans, hackathon handoffs, and reports.

## Detected Stack

### Backend API

- Language/runtime: Python `>=3.12`.
- Framework: FastAPI + Uvicorn.
- Package metadata: `services/api/pyproject.toml`.
- Package source: `services/api/src/tothemoon_api`.
- Main entrypoint: `services/api/src/tothemoon_api/main.py` exposes `app = FastAPI(...)`.
- API routers include payments, agent chat, jobs, demo agent, reputation, settlements, hackathon summary, SaaS, billing, copilot, nanopayments, tokens, and simulation.
- Data/storage dependencies include SQLAlchemy, Alembic, PostgreSQL drivers (`psycopg`, `asyncpg`), Redis client, and default local SQLite via `.env.example` (`DATABASE_URL=sqlite:///./saas.db`).
- Observability/security dependencies include structlog, prometheus-client, OpenTelemetry, Sentry, argon2, and python-jose.

### Frontend

- `apps/web`: static Vanilla JS dashboard.
  - Entrypoints: `apps/web/index.html`, `apps/web/app.js`, `apps/web/config.js`.
  - Local serve command: `make web-serve`.
  - Container files: `apps/web/Dockerfile`, `apps/web/nginx.conf`, `apps/web/40-write-config.sh`.
- `apps/web-next`: React + Vite + TypeScript dashboard.
  - Entrypoints: `apps/web-next/src/main.tsx`, `apps/web-next/src/App.tsx`.
  - Scripts: `dev`, `build`, `start`, `test:e2e` in `apps/web-next/package.json`.
  - Lockfile present: `apps/web-next/package-lock.json`.
  - Playwright config present: `apps/web-next/playwright.config.ts`.

### Infrastructure / Local Runtime

- `Makefile` wraps backend install/test/lint/typecheck/run and static web/pitch serving.
- `docker-compose.yml` defines PostgreSQL, API, static web, and pitch services.
- `.github/workflows/ci.yml` runs Python 3.12 backend install and pytest for `services/api`.
- `.env.example` documents local config and optional secret-backed integrations.

## Commands Identified

### Backend

- Install: `make api-install`
  - Runs `cd services/api && python3 -m pip install -e .[dev]`.
- Test: `make api-test`
  - Runs `cd services/api && python3 -m pytest -q`.
- Coverage: `make api-cov`.
- Lint: `make api-lint`.
- Format: `make api-format`.
- Typecheck: `make api-typecheck`.
- Run API: `make api-run`
  - Starts Uvicorn on `127.0.0.1:8010` with `tothemoon_api.main:app`.

### Frontend

- Static dashboard: `make web-serve`
  - Serves `apps/web` on `127.0.0.1:4173`.
- Pitch site: `make pitch-serve`
  - Serves `apps/pitch` on `127.0.0.1:4174`.
- React dashboard install: `cd apps/web-next && npm install` or `npm ci`.
- React dashboard dev: `cd apps/web-next && npm run dev`.
- React dashboard build: `cd apps/web-next && npm run build`.
- React dashboard preview: `cd apps/web-next && npm run start`.
- React dashboard e2e: `cd apps/web-next && npm run test:e2e`.

### Containers / Ops

- Build containers: `make docker-build`.
- Start local compose stack: `make docker-up`.
- Stop local compose stack: `make docker-down`.
- Local demo helpers: `make demo-start`, `make demo-stop`, `make demo-status`, `make demo-logs`.
- Nexus helpers: `make nexus-start`, `make nexus-stop`, `make nexus-status`, `make nexus-logs`.

## Cheap Verification Performed

The task requested only cheap checks that do not depend on secrets. No install was performed during this audit.

| Command | Result |
| --- | --- |
| `git status --short` | Clean at start of audit. |
| `find . -maxdepth 3 -type f ...` | Repository structure inspected. |
| `python3 --version` | `Python 3.12.3`. |
| `node --version` | `v22.22.2`. |
| `npm --version` | `10.9.7`. |
| `cd services/api && python3 -m pytest -q` | Failed before test collection: `/usr/bin/python3: No module named pytest`. |
| `test -d apps/web-next/node_modules` | `missing`. |
| `cd apps/web-next && npm run build` | Failed: `tsc: not found`, because frontend dependencies are not installed. |

## Risks / Blockers

- Backend verification is blocked in the current workspace until Python dev dependencies are installed (`pytest`, `ruff`, `mypy`, and package deps). The expected command is `make api-install`.
- React/Vite verification is blocked until `apps/web-next` dependencies are installed from `package-lock.json` via `npm ci` or equivalent.
- `.env.example` includes placeholder secret-backed integrations (`CIRCLE_API_KEY`, Gemini, token-security providers, Sentry, OTLP). Feature work should keep these optional and avoid requiring secrets for local tests.
- The repository currently has both `apps/web` (Vanilla JS) and `apps/web-next` (React/Vite). The next implementation task should explicitly choose the canonical SaaS UI target to avoid duplicated work.
- `services/api/src/tothemoon_api/main.py` calls `init_db()` at import time. Future tests and local runs should verify this remains safe for isolated local SQLite and does not require external services.

## Recommended Next Task

Create the next child issue (GEN-4 or next available ID) as the first SaaS implementation task:

> Establish a reproducible local dev baseline for the SaaS target: install backend and `apps/web-next` dependencies, run the smallest backend test command and React build, document any failing tests without refactoring features, and decide whether the active dashboard implementation target is `apps/web` or `apps/web-next`.

Suggested acceptance criteria:

- Backend dev install command succeeds or a concrete dependency blocker is documented.
- At least one backend smoke test or targeted pytest command runs locally without secrets.
- `apps/web-next` dependency install and `npm run build` succeed or failing diagnostics are documented.
- The chosen frontend target for upcoming SaaS implementation is recorded in `docs/SAAS_IMPLEMENTATION_PLAN.md` or a follow-up report.
