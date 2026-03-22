# Getting Started with MTSF

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (via nvm recommended)
- A Stripe account (test mode) for billing
- A Resend account for emails (optional in dev mode)

## Setup

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd mtsf
cp .env.example .env
```

Edit `.env` with your values. For local development, generate secrets:

```bash
# Generate JWT_SECRET and ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Install dependencies

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Build and start

```bash
cd frontend && npm run build && cd ..
docker compose up -d --build
```

### 4. Access the app

- **App:** http://localhost:3002
- **API:** http://localhost:3002/api/health

### 5. Create your first account

With `DEV_SKIP_EMAIL=true`, registration auto-verifies emails.

1. Go to http://localhost:3002/signup
2. Create an account
3. Set up your organisation
4. You're in!

### 6. Make yourself a platform admin

```bash
docker exec -it mtsf_postgres psql -U mtsf -d mtsf -c \
  "UPDATE users SET is_platform_admin = TRUE WHERE email = 'your@email.com';"
```

## White-Labelling

See CLAUDE.md for the full list of configurable values. The key files:

- `backend/src/config.ts` — Backend config (app name, colours, trial days)
- `frontend/src/config.ts` — Frontend config (app name, tagline)
- `frontend/src/index.css` — CSS variables (colours, fonts)
- `frontend/src/components/Sidebar.tsx` — Navigation structure

## Adding Your Domain

1. **Define your entities** — Add tables to `backend/src/db/pool.ts`
2. **Create routes** — Copy `backend/src/routes/items.ts` as a template
3. **Create pages** — Copy `frontend/src/pages/items/` as a template
4. **Wire routing** — Add to `frontend/src/router.tsx` and `Sidebar.tsx`

## Deployment

For production:

1. Set `DEV_SKIP_EMAIL=false`
2. Configure real Stripe keys
3. Configure real Resend API key
4. Set `FRONTEND_URL` to your domain
5. Set up HTTPS (e.g. Cloudflare Tunnel, Caddy, or Traefik)
6. Run `docker compose up -d --build`
