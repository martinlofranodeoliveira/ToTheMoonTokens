# SaaS UI Baseline

_Last verified: 2026-05-02_

## Current frontend surface

The active SaaS dashboard lives in `apps/web-next` and uses React, Vite, Recharts, and Lucide icons. The baseline screen set is:

- Dashboard overview with monthly requests, simulated volume, active keys, realized PnL, 30-day chart, copilot proposals, and paper-order simulation.
- API keys management with key creation, one-time plaintext display via session storage, key list, and revoke action.
- Billing and plan cards for starter, pro, and enterprise upgrade paths.
- Invoices placeholder/list view wired to the backend invoices endpoint.
- Settings panel for account identity, organization, plan, API base URL, and docs link.
- Audit log and system status views for operational visibility.

## Interaction and responsive baseline

- Signed-out users can sign up or sign in from the top auth bar.
- Signed-in users can navigate via the left rail, manage keys, simulate paper orders, approve copilot proposals, start billing checkout, and sign out.
- The layout collapses from a left rail to a sticky top navigation on tablet widths, then to single-column cards on small screens.
- Toast notices report success and error states for auth, key, billing, simulation, and proposal actions.


## Public VM routing baseline

On the GCP VM, Caddy serves the React SaaS dashboard from `apps/web-next` at `/saas/`. The root `/` can remain the Agent Market landing page, so browser smoke for SaaS auth/dashboard must target `/saas/` rather than assuming root is the dashboard.

Post-deploy frontend evidence should cover:

- `/saas/` desktop render with the signed-out auth controls visible.
- `/saas/` mobile render without overlapping navigation or clipped controls.
- Same-origin API resolution through `window.location.origin` via `/config.js` or the Vite runtime config.
- No console errors during initial render.

## Baseline setup and checks

Use dev dependencies when installing in automation because the build requires local `tsc`:

```bash
cd apps/web-next
npm install --include=dev
npm run build
```

Verification on 2026-05-02:

- `npm install` completed with production dependencies but omitted dev binaries in this environment.
- `npm run build` then failed with `sh: 1: tsc: not found`.
- `npm install --include=dev` installed the required TypeScript and Playwright dev packages.
- `npm run build` passed: TypeScript build and Vite production bundle completed successfully.

## Near-term UI polish backlog

- Add skeleton/loading states for signed-in data fetches instead of holding empty panels during network requests.
- Add copied-to-clipboard affordance for newly created API keys.
- Add inline empty states for proposals, audit log, invoices, and provider health with clear next actions.
- Add focused Playwright smoke coverage for sign-in screen rendering and responsive navigation.
