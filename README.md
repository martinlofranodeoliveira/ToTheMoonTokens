# TTM SaaS - Automated Venture Capital

Welcome to TTM SaaS, your platform for Automated Venture Capital. This repository houses the core services and interfaces for our platform.

## Features

- **Paper Trading Simulation Engine:** A powerful engine that allows users to simulate and backtest venture capital investments and trading strategies without risking real capital.
- **Security Token Audit API:** An advanced API surface for verifying, auditing, and validating security tokens to ensure compliance and technical soundness.
- **SaaS Client Dashboard:** A responsive React/Vite interface for clients to monitor usage, manage API keys, review invoices, inspect audit events, and interact with the simulation engine.

## Local Quickstart

### 1. Running the FastAPI Backend

The backend is located in the `services/api` directory and provides the core API endpoints for the simulation engine and token auditing.

```bash
# Install backend dependencies
make api-install

# Run the backend test suite
make api-test

# Start the FastAPI development server
make api-run
```
The API documentation will be available at `http://127.0.0.1:8010/docs`.

### 2. Running the React/Vite Frontend

The SaaS Client Dashboard is a React/Vite frontend located in the `apps/web-next` directory.

In a separate terminal, run:

```bash
cd apps/web-next
npm install --include=dev
npm run dev
```
The frontend dashboard will be available at the Vite URL printed by the command, typically `http://127.0.0.1:5173`.

To run the baseline production check:

```bash
make web-next-build
```

`make web-next-build` runs `npm ci --include=dev` with `NODE_ENV` cleared for the install step, so CI/local shells that default to `NODE_ENV=production` or `npm_config_omit=dev` still install the TypeScript/Vite build toolchain.

### 3. Baseline checks

Use the Make targets below for repeatable local and CI checks:

```bash
# Create/use .venv and run the backend pytest baseline
make api-baseline

# Install frontend dev dependencies safely and run the production build
make web-next-build

# Run both backend and frontend baselines
make baseline-check

# Run backend compile/lint/test plus frontend build and write CI evidence
make ci-evidence

# Remove local caches/build outputs from common validation runs
make clean-generated

# Fail if generated artifacts are tracked or missing ignore coverage
make generated-artifacts-check
```

## GCP VM Deployment

CI runs backend and frontend baselines on pull requests and pushes to `main`, then uploads `ops/evidence/backend-frontend-ci-evidence.json` from `make ci-evidence`. Production deployment to a GCP VM is handled by `.github/workflows/deploy-gcp-vm.yml` after those baselines pass.

See `docs/GCP_VM_DEPLOYMENT.md` for required GitHub secrets, VM prerequisites, local `gcloud` deployment, rollback behavior, and production safety defaults.

Production promotion remains blocked until `docs/production-readiness-gate.md` and `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` are completed with staging smoke, rollback, and go/no-go evidence.
