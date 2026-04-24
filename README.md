# TTM Agent Market

TTM Agent Market is a hackathon project for the **Agentic Economy on Arc**: a judge-facing marketplace where software agents can request, pay for, verify, and unlock machine work in **USDC on Arc Testnet**.

The shipped demo is centered on a simple public flow:

1. a buyer selects a priced artifact
2. the API creates a checkout and treasury route
3. USDC is sent on Arc Testnet
4. settlement is verified from the transaction proof
5. delivery is unlocked only after the payment gate passes

This repository is intentionally scoped to that flow. It packages a public demo, a public proof endpoint, and the evidence used in the submission.

## What Judges Can Verify

Public surfaces:

- Pitch site: `http://34.56.193.221/`
- Live marketplace / operations room: `http://34.56.193.221/ops/`
- Public proof JSON: `http://34.56.193.221/api/hackathon/summary`
- Health check: `http://34.56.193.221/health`

Current proof surface exposes:

- **63 settled Arc Testnet transfers**
- **USDC-denominated artifact pricing**
- **Circle developer-controlled wallet routing**
- **public transaction hashes and delivery state**

## What The Project Demonstrates

- priced machine-work artifacts instead of vague AI access
- explicit checkout, settlement, review, and delivery gates
- public proof that can be inspected by judges
- deterministic hackathon evidence captured in the repository

Artifact examples in the marketplace:

- `Delivery Packet`
- `Review Bundle`
- `Market Intelligence Brief`

## What Ships In This Repo

- `services/api`
  FastAPI backend for catalog, checkout intents, payment verification, settlement verification, reputation, demo jobs, and hackathon summary endpoints.

- `apps/web`
  Public marketplace / operations surface used in the judge flow.

- `apps/pitch`
  Public pitch site and the 90-second autoplay deck used for recording.

- `docs/hackathon`
  Submission narrative, shooting script, proof references, and handoff material.

- `ops/evidence`
  Versioned evidence used by the public summary endpoint.

## Local Quickstart

### Option 1: Run the three public surfaces directly

```bash
make api-install
make api-test
make api-run
```

In separate terminals:

```bash
make web-serve
make pitch-serve
```

Open:

- API docs: `http://127.0.0.1:8010/docs`
- Marketplace: `http://127.0.0.1:4173`
- Pitch: `http://127.0.0.1:4174`

### Option 2: Local demo bootstrap

```bash
./scripts/run-local-demo.sh start
./scripts/run-local-demo.sh status
```

### Option 3: Docker Compose

```bash
make docker-build
make docker-up
make docker-down
```

## API Surfaces Used In The Demo

- `GET /api/payments/catalog`
- `POST /api/payments/intent`
- `POST /api/payments/verify`
- `POST /api/payments/execute`
- `POST /api/settlements/verify`
- `GET /api/hackathon/summary`
- `GET /api/dashboard`
- `POST /api/demo/jobs/request`
- `POST /api/demo/jobs/{payment_id}/pay`
- `POST /api/demo/jobs/{payment_id}/execute`
- `POST /api/demo/jobs/{payment_id}/review`
- `POST /api/demo/jobs/{payment_id}/deliver`

## Quality Gate

Core checks used for release validation:

```bash
cd services/api
./.venv/bin/python -m pytest --cov --cov-report=term-missing
./.venv/bin/python -m ruff check .
./.venv/bin/python -m ruff format --check .
./.venv/bin/python -m mypy
```

Guardrail regression:

```bash
python scripts/verify_guardrails.py
```

VM performance smoke:

```bash
python scripts/bench_api.py --base-url http://34.56.193.221 --label VM-post-deploy --n 200 --concurrency 8
```

## Submission Notes

- The public demo is designed to be reviewed from the browser without local secrets.
- The proof endpoint is backed by repository evidence and live connector status.
- The video flow is documented in:
  - `docs/hackathon/VIDEO_SHOOTING_SCRIPT.md`
  - `docs/hackathon/narration-script.md`
  - `docs/hackathon/FINAL_HANDOFF.md`

## Scope Boundary

This repository is for a hackathon-grade, judge-facing **paid machine work marketplace on Arc Testnet**.

Any change that weakens the core flow below is out of scope:

**request -> checkout -> settlement verification -> review -> delivery**
