# GEN-53 GCP VM Browser Smoke Evidence

Target: `http://34.29.171.34`
Run time: 2026-05-02 14:49–14:51 UTC

## Commands

```bash
curl -i --max-time 15 http://34.29.171.34/health
curl -I --max-time 15 http://34.29.171.34/
cd apps/web-next
node gen53-smoke.mjs
node - <<'EOF_NODE'
# Playwright DOM/screenshot capture for desktop and iPhone 13 contexts.
EOF_NODE
```

## Results

- Passed: `/health` returned `200 OK` with `mode: paper`, `orderSubmissionEnabled: false`, `autonomous_payments_enabled: false`, and `settlement_network: arc_testnet`.
- Passed: `/` returned `200 OK` from Caddy/nginx and loaded without Playwright console errors in desktop and mobile contexts.
- Blocked: signed-out SaaS auth render expected by the issue is not present on the public VM. The deployed page title is `TTM Agent Market — Agents pay agents. Per call. Sub-cent. Onchain.` and no `email@company.com` field exists.
- Blocked: responsive SaaS dashboard navigation/auth journey cannot be completed because `/`, `/dashboard`, `/app`, `/saas`, `/login`, and `/auth` all serve the same Agent Market landing page.

## Evidence Files

- `ops/evidence/gen-53/smoke-evidence.json`
- `ops/evidence/gen-53/desktop-current-page.txt`
- `ops/evidence/gen-53/desktop-current-page.png`
- `ops/evidence/gen-53/mobile-current-page.txt`
- `ops/evidence/gen-53/mobile-current-page.png`

## Unblock Needed

Deploy or route the expected `apps/web-next` SaaS dashboard build on the public VM, or provide the correct public URL/path for the SaaS dashboard. Then rerun GEN-53 browser smoke against that URL.

## Re-smoke 2026-05-02 17:01 UTC

Command:

```bash
curl -sS -i --max-time 15 http://34.29.171.34/health
curl -sS -I --max-time 15 http://34.29.171.34/
curl -sS --max-time 15 http://34.29.171.34/
```

Result:

- `/health` still returns `200 OK` with `mode: paper`, `orderSubmissionEnabled: false`, and `autonomous_payments_enabled: false`.
- `/` still returns `200 OK` from Caddy/nginx with page title `TTM Agent Market — Agents pay agents. Per call. Sub-cent. Onchain.`
- GEN-53 remains blocked for browser/auth/dashboard smoke until GEN-56 routes or deploys the expected SaaS dashboard UI.

Evidence file: `ops/evidence/gen-53/resmoke-2026-05-02T170105Z.txt`

## SaaS Route Smoke 2026-05-02 17:02–17:04 UTC

Command:

```bash
cd apps/web-next
node --input-type=module <<'EOF_NODE'
# Playwright desktop/mobile smoke against http://34.29.171.34/saas/.
EOF_NODE
```

Result:

- Passed: `/health` returned `200 OK` with `mode: paper`, `orderSubmissionEnabled: false`, `autonomous_payments_enabled: false`, and `settlement_network: arc_testnet`.
- Passed: `http://34.29.171.34/saas/` returned `200 OK` and renders title `TTM SaaS Dashboard`.
- Passed: desktop and iPhone 13 signed-out renders show the `email@company.com` field, password field, Login/Signup controls, and `Sign in to continue` state with no Playwright console errors.
- Passed: responsive navigation can open Status, where safe paper-mode behavior shows `Orders` as `Blocked`.
- Blocked: live signup/auth dashboard journey is blocked by `POST /api/v1/auth/signup` returning `500 Internal Server Error`; the UI falls back to `demo@tothemoon.local` demo data.

Evidence files:

- `ops/evidence/gen-53/saas-smoke-evidence.json`
- `ops/evidence/gen-53/saas-auth-capture.json`
- `ops/evidence/gen-53/desktop-saas-current-page.txt`
- `ops/evidence/gen-53/desktop-saas-current-page.png`
- `ops/evidence/gen-53/mobile-saas-current-page.txt`
- `ops/evidence/gen-53/mobile-saas-current-page.png`
- `ops/evidence/gen-53/desktop-saas-auth-capture.txt`
- `ops/evidence/gen-53/desktop-saas-auth-capture.png`

## Auth Unblock 2026-05-02 17:09 UTC

Cause: the public VM Postgres schema was empty, and API logs showed `relation "users" does not exist` during `POST /api/v1/auth/signup`.

Fix applied on the VM: ran `alembic upgrade head` inside the `tothemoontokens-api` container against the VM Postgres database. The deploy script now includes the same migration step after Compose startup and before health success.

Result:

- `POST /api/v1/auth/signup` returned `201` on the public VM.
- `POST /api/v1/auth/login` with form credentials returned `200`.
- `GET /api/v1/saas/account` with the returned JWT returned `200`.
- Core public routes stayed green: `/health`, `/ready`, `/`, `/pitch/`, `/ops/`, `/saas/`, and `/config.js`.

## Browser Auth Pass 2026-05-02 17:23 UTC

Playwright live smoke against `http://34.29.171.34/saas/` passed after the VM migration fix:

- Desktop signed-out render: `200`, title `TTM SaaS Dashboard`, auth controls visible, no console errors.
- iPhone 13 signed-out render: `200`, title `TTM SaaS Dashboard`, auth controls visible, no console errors.
- Desktop signup UI: created a unique browser-smoke account, displayed the signed-in user chip, exposed the accessible `Sign out` button, and produced no console errors.
