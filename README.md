# Rasd Traffic Violations Management Platform

Rasd is an Arabic, right-to-left evaluation platform for managing traffic-violation records and their review lifecycle. This repository evolves the original PHP demonstration into a role-aware Django API and React/TypeScript application while preserving the original source in [`legacy/`](legacy/).

> **Evaluation release only.** This project is not operated by or approved for a government authority. Camera recognition, government identity, real payment, messaging, and legal-rule integrations are not connected. Use synthetic records only.

## What works in this release

- Tenant-scoped case, vehicle, camera, rule, appeal, payment, evidence, and audit APIs with role-based permissions.
- A documented case lifecycle with separate review and approval roles, reasoned appeal decisions, and a manual finance reconciliation flow.
- Private evidence uploads with type/size validation, content hashes, chain-of-custody events, and non-delete API behavior.
- Append-only audit verification, PostgreSQL integrity triggers, controlled legacy import, CSV export, and a printable receipt.
- An Arabic RTL interface, API schema, disposable synthetic accounts, and an end-to-end browser workflow.

Payments in this build are simulated or manually recorded; a successful local workflow is not evidence of a bank or government-service integration. See the [readiness assessment](docs/READINESS.md) and [feature roadmap](docs/FEATURE_ROADMAP.md) for the remaining operational, legal, security, and integration gates.

## Technology

- Python 3.14, Django 5.2, Django REST Framework, PostgreSQL 18, and optional Redis.
- React 19, TypeScript 7, Vite 8, and Nginx for the static web client.
- Docker Compose for local evaluation; GitHub Actions for database, API, browser, dependency, and container checks.

## Run a local synthetic evaluation

Prerequisites: Python 3.14, Node.js 24, PostgreSQL 18, and a disposable database. From the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/rasd'
$env:SIMULATION_MODE = '1'
$env:DEMO_PASSWORD = 'choose-a-unique-password-of-12-chars-or-more'
$env:CSRF_TRUSTED_ORIGINS = 'http://127.0.0.1:5173'
Set-Location backend
..\.venv\Scripts\python manage.py migrate
..\.venv\Scripts\python manage.py seed_demo
..\.venv\Scripts\python manage.py runserver 127.0.0.1:8017
```

In a second terminal, run `npm ci` and `npm run dev` from `frontend/`, then open <http://127.0.0.1:5173>. Demo users are `demo.admin`, `demo.registrar`, `demo.reviewer`, `demo.approver`, `demo.finance`, `demo.appeals`, `demo.auditor`, and `demo.citizen`; the password is supplied only through `DEMO_PASSWORD`. The seed command refuses to run outside simulation mode and does not reset existing passwords.

For container evaluation, copy `.env.example` to a private environment file, set a unique `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY`, then follow [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md). Do not expose the development compose configuration to the public internet.

## Verify changes

```powershell
python backend/manage.py makemigrations --check --dry-run
python backend/manage.py test --verbosity 2
python backend/manage.py spectacular --file docs/openapi.yaml --validate --fail-on-warn
Set-Location frontend
npm ci
npm run build
npm test
npm audit --audit-level=high
npm run test:e2e
```

The end-to-end test uses a disposable backend populated by the synthetic seed command. It needs a running API, a frontend dev server, Chromium, and `DEMO_PASSWORD` set in the test environment. The GitHub Actions workflow provisions these services and runs the full suite.

## Repository map

- `backend/` — Django project, domain services, API, migrations, and tests.
- `frontend/` — Arabic React application, unit tests, and Playwright lifecycle test.
- `docs/` — audit, product requirements, architecture, security, API, operations, deployment, and verification records.
- `legacy/` — preserved PHP/HTML prototype and its schema; not mounted as application code.
- `deploy/`, `compose.yml` — web container and local evaluation composition.

See [`docs/CURRENT_SYSTEM_AUDIT.md`](docs/CURRENT_SYSTEM_AUDIT.md) for the original prototype audit, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the target design, and [`docs/VERIFICATION_REPORT.md`](docs/VERIFICATION_REPORT.md) for the latest verified results and limitations.
