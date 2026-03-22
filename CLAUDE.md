# CLAUDE.md — MTSF (Multi-Tenant SaaS Framework)

Read this file at the start of every session. It defines how to work with this project.

---

## What is MTSF?

MTSF is a white-label multi-tenant SaaS framework extracted from battle-tested production code. It provides the complete infrastructure for building multi-tenant SaaS applications without repeating foundational work:

- **Multi-tenant architecture** — org_id isolation across all data
- **Auth** — JWT (HS256, HKDF-derived), registration, email verification, invites
- **Billing** — Stripe integration (checkout, portal, webhooks), plan-based feature gating
- **User management** — Org roles, platform admin, suspension
- **Middleware** — Billing gate, plan checks, API key validation, rate limiting
- **Security** — AES-256-GCM encryption, bcrypt passwords, HKDF key derivation
- **Example CRUD entity** — "Items" demonstrating the standard pattern

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express 5 + TypeScript |
| Frontend | React 19 + Vite + TypeScript |
| Database | PostgreSQL 16 |
| Proxy | Nginx (Alpine) |
| Containers | Docker Compose |
| Payments | Stripe |
| Email | Resend |
| Icons | Lucide React |
| Charts | Recharts |

## White-Label Configuration

The framework is designed for white-labelling. To rebrand:

**Backend:** Set environment variables:
- `APP_NAME` — Display name (default: "MTSF")
- `APP_TAGLINE` — Tagline for emails (default: "Multi-Tenant SaaS Framework")
- `APP_ACCENT_COLOR` — Hex colour for email buttons (default: "#3b82f6")
- `API_KEY_PREFIX` — Prefix for API keys (default: "mtsf_")
- `TRIAL_DAYS` — Default trial duration (default: 14)

**Frontend:** Edit `frontend/src/config.ts`:
- `APP_CONFIG.name` — App name shown in UI
- `APP_CONFIG.tagline` — Tagline on auth pages

**Styling:** Edit CSS variables in `frontend/src/index.css`:
- `--accent` — Primary brand colour
- `--bg`, `--surface`, `--border` — Background tones

## Quick Start

```bash
cp .env.example .env   # Edit with your values
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd frontend && npm run build && cd ..
docker compose up -d --build
```

App runs at http://localhost:3002

## Project Structure

```
backend/src/
  config.ts          — White-label configuration
  index.ts           — Express app entry + route composition
  db/pool.ts         — Postgres schema + pool
  middleware/         — Auth, billing gate, plan checks, rate limiting, API keys
  routes/            — Auth, org, billing, account, items, admin/
  services/          — Billing, email, API keys, activity log, scheduler, telemetry
  utils/             — Encryption, password, token, key derivation, logger

frontend/src/
  config.ts          — White-label frontend config
  context/           — AuthContext
  layouts/           — Root, Public, Authenticated, Admin
  components/        — PageHeader, StatCard, Sidebar, BillingBanner
  pages/             — Login, Signup, OrgSetup, Dashboard, Items, Billing, Settings, Admin
  router.tsx         — Route definitions
```

## Extending MTSF

To add a new domain entity:

1. **Backend:** Add table to `db/pool.ts`, create route in `routes/`, follow the `items.ts` pattern
2. **Frontend:** Add pages in `pages/`, add route to `router.tsx`, add nav item to `Sidebar.tsx` navSections
3. **Middleware:** Use `requireAuth`, `requirePlan('pro')`, etc. as needed

## Port Map

| Service | Port |
|---|---|
| Frontend (nginx) | 3002 |
| Backend | 3001 |
| Backend (test) | 3011 |
| Postgres | 5433 |

## Documentation

| Document | Path | Purpose |
|----------|------|---------|
| [README](README.md) | `README.md` | Project overview, quick start |
| [Adoption Guide](docs/ADOPTION-GUIDE.md) | `docs/ADOPTION-GUIDE.md` | Full setup walkthrough, env var reference |
| [White-Label Guide](docs/WHITE-LABEL-GUIDE.md) | `docs/WHITE-LABEL-GUIDE.md` | Branding and customisation |
| [Architecture](docs/ARCHITECTURE.md) | `docs/ARCHITECTURE.md` | System design, schema, auth flow, billing states |
| [Extending Guide](docs/EXTENDING-GUIDE.md) | `docs/EXTENDING-GUIDE.md` | Adding domain entities, features, pages |
| [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) | `docs/DEPLOYMENT-GUIDE.md` | Production setup, HTTPS, backups, security |
| [API Reference](docs/API-REFERENCE.md) | `docs/API-REFERENCE.md` | Every endpoint, request/response format |
| [Getting Started](docs/GETTING-STARTED.md) | `docs/GETTING-STARTED.md` | Condensed quick start |

## Environment Notes

- **Node.js:** Use nvm — prefix with `source ~/.nvm/nvm.sh &&`
- **Build:** `cd frontend && npm run build && cd .. && docker compose up -d --build`
- **Never commit `.env`**
