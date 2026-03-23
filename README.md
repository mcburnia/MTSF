# MTSF — Multi-Tenant SaaS Framework

A white-label, production-ready framework for building multi-tenant SaaS applications. Extracted from battle-tested production code, MTSF gives you the complete infrastructure — auth, billing, org management, multi-tenancy, and security — so you can focus on your domain logic instead of rebuilding the same foundations every time.

## What You Get

| Feature | Description |
|---------|-------------|
| **Multi-tenant architecture** | Organisation-scoped data isolation via `org_id` across all tables |
| **Authentication** | JWT (HS256, HKDF-derived), registration, email verification, team invites |
| **Billing & subscriptions** | Stripe integration — checkout, customer portal, webhooks, plan-based feature gating |
| **User management** | Org roles (admin/member/viewer), platform admin, suspension |
| **Middleware pipeline** | Global billing gate, plan checks, API key auth, rate limiting |
| **Security** | AES-256-GCM encryption, HKDF key derivation, bcrypt passwords |
| **White-label ready** | Rebrand via environment variables and a single config file |
| **Example CRUD entity** | "Items" demonstrating the standard pattern for adding your own domain |
| **Admin panel** | Platform dashboard, user management, org management |
| **Docker infrastructure** | Compose with nginx, backend, Postgres — production-ready |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express 5 + TypeScript |
| Frontend | React 19 + Vite + TypeScript |
| Database | PostgreSQL 16 |
| Reverse proxy | Nginx (Alpine) |
| Containers | Docker Compose |
| Payments | Stripe |
| Email | Resend |
| Icons | Lucide React |
| Charts | Recharts |
| Styling | CSS modules + CSS variables (dark theme) |

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/mcburnia/MTSF.git
cd MTSF
cp .env.example .env
# Edit .env with your values (see docs/ADOPTION-GUIDE.md for details)

# 2. Install and build
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

# 3. Start
docker compose up -d --build
```

Open http://localhost:3002 — you're running.

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [Adoption Guide](docs/ADOPTION-GUIDE.md) | New adopters | Full setup walkthrough, env var reference, troubleshooting |
| [White-Label Guide](docs/WHITE-LABEL-GUIDE.md) | Product owners | Complete branding and customisation guide |
| [Architecture](docs/ARCHITECTURE.md) | Developers / AI coders | System design, data model, auth flow, billing state machine |
| [Extending Guide](docs/EXTENDING-GUIDE.md) | Developers / AI coders | How to add your own domain entities, pages, and features |
| [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) | DevOps / operators | Production setup, HTTPS, backups, monitoring, security |
| [API Reference](docs/API-REFERENCE.md) | Developers / integrators | Every endpoint, request/response format, auth patterns |
| [Getting Started](docs/GETTING-STARTED.md) | Quick reference | Condensed setup and first steps |
| [CLAUDE.md](CLAUDE.md) | AI coding assistants | Project context for Claude Code, Codex, Cursor, etc. |

## Project Structure

```
MTSF/
├── backend/src/
│   ├── config.ts              # White-label configuration (env-driven)
│   ├── index.ts               # Express app entry + route composition
│   ├── db/pool.ts             # Postgres schema + connection pool
│   ├── middleware/             # requireAuth, billingGate, requirePlan, rateLimit, apiKey
│   ├── routes/                # auth, org, billing, account, items, admin/
│   ├── services/              # billing, email, api-keys, activity-log, scheduler, telemetry
│   └── utils/                 # encryption, password, token, key-derivation, logger
├── frontend/src/
│   ├── config.ts              # White-label frontend config
│   ├── context/AuthContext.tsx # Auth state management
│   ├── layouts/               # Root, Public, Authenticated, Admin
│   ├── components/            # PageHeader, StatCard, Sidebar, BillingBanner
│   ├── pages/                 # Login, Signup, Dashboard, Items, Billing, Settings, Admin
│   └── router.tsx             # Route definitions
├── nginx/default.conf         # Reverse proxy + security headers
├── docker-compose.yml         # nginx + backend + postgres (+ test profile)
├── scripts/                   # backup, restore, test-stack
└── docs/                      # Full documentation suite
```

## Licence

Custom open licence — free to use, with two conditions:

1. **Attribution** — credit MTSF in your product's documentation or about page
2. **Contribution back** — submit bug fixes and framework improvements back via pull request

See [LICENCE](LICENCE) for the full text.

## Contact

For questions, support, or contribution enquiries:

- **Email:** info@lomancavendish.com
- **Company:** Loman Cavendish Limited (UK Company No. 06335037)
- **GitHub:** https://github.com/mcburnia/MTSF
