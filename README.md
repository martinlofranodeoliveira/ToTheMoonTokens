# TTM SaaS - Automated Venture Capital

Welcome to TTM SaaS, your platform for Automated Venture Capital. This repository houses the core services and interfaces for our platform.

## Features

- **Paper Trading Simulation Engine:** A powerful engine that allows users to simulate and backtest venture capital investments and trading strategies without risking real capital.
- **Security Token Audit API:** An advanced API surface for verifying, auditing, and validating security tokens to ensure compliance and technical soundness.
- **SaaS Client Dashboard:** A centralized, intuitive interface built with Vanilla JS for clients to monitor their portfolios, view audits, and interact with the simulation engine.

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

### 2. Running the Vanilla JS Frontend

The SaaS Client Dashboard is a Vanilla JS frontend located in the `apps/web` directory.

In a separate terminal, run:

```bash
# Start the frontend development server
make web-serve
```
The frontend dashboard will be available at `http://127.0.0.1:4173`.
