# Rasd operations interface

Arabic, right-to-left React interface for the evaluation platform. All displayed records come from the authenticated API. No browser token storage or mock API responses are used.

## Local development

Use Node.js 24 and run `npm ci`, then `npm run dev`. The Vite server listens on `http://127.0.0.1:5173` and proxies `/api` to the Django server at `http://127.0.0.1:8017`. Set `CSRF_TRUSTED_ORIGINS=http://127.0.0.1:5173` on the backend for this development origin.

Run `npm run build` for strict TypeScript checks and the production bundle. Serve the generated `dist/` through the application's same-origin deployment; a standalone static preview does not provide the API.

## Validation

- `npm test` checks API error handling, cookie/CSRF behavior and role-based navigation.
- `npm run test:e2e` runs the real browser workflow against a running, disposable evaluation backend. First install Chromium with `npx playwright install chromium`, provision the synthetic accounts using the backend's `seed_demo` command, and supply their password through `DEMO_PASSWORD`. The test skips if that variable is absent.
- `E2E_BASE_URL` can select a different frontend origin for browser tests. Keep the backend's trusted origins aligned.

The browser test creates a synthetic case and a clearly labelled test screenshot attachment, then exercises review, approval, issue, citizen appeal, appeal rejection, simulated settlement, receipt, financial closure and audit viewing. It also checks desktop/mobile layouts and writes screenshots to ignored `test-results/`. Never run this data-creating test against a production database.

The interface exposes actions according to the session role and server-provided `allowed_actions`. Authorization, tenant scope, concurrency and integrity checks remain enforced by the backend. Device status is a stored status, not a live video feed. Simulation payments are explicitly marked and do not collect money or card data.
