# MTSF Adoption Guide

Complete walkthrough for adopting MTSF as the foundation for your SaaS product. This guide takes you from zero to a running, branded application.

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Docker & Docker Compose | 20+ | Container orchestration |
| Node.js | 20+ (24 recommended) | Local development, dependency installation |
| npm | 10+ | Package management |
| Git | 2+ | Source control |
| Stripe account | Test mode | Payment processing |
| Resend account | Free tier | Transactional email (optional in dev mode) |

## Step 1: Clone the Framework

```bash
git clone https://github.com/mcburnia/MTSF.git my-saas-app
cd my-saas-app
```

Remove the MTSF git history and start fresh:

```bash
rm -rf .git
git init
git remote add origin https://github.com/your-org/your-app.git
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Generate the required secrets:

```bash
# Generate JWT_SECRET (64-character hex string)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (64-character hex string — different from JWT_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variable Reference

File: `.env`

#### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | Yes | `mtsf` | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password |
| `POSTGRES_DB` | Yes | `mtsf` | PostgreSQL database name |

#### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | 64-char hex string for JWT signing (HKDF-derived) |
| `ENCRYPTION_KEY` | Yes | — | 64-char hex string for AES-256-GCM encryption |

#### Stripe (Billing)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Yes | — | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | — | Stripe publishable key (`pk_test_...` or `pk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | — | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRODUCT_ID` | Yes | — | Stripe product ID (`prod_...`) |
| `STRIPE_PRICE_ID` | Yes | — | Stripe price ID (`price_...`) |

#### Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Prod only | — | Resend API key (`re_...`) |
| `EMAIL_FROM` | Prod only | `noreply@example.com` | Sender email address |

#### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | `http://localhost:3002` | Public URL of the frontend (used in emails, redirects) |

#### White-Label (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_NAME` | No | `MTSF` | Application display name |
| `APP_TAGLINE` | No | `Multi-Tenant SaaS Framework` | Tagline used in emails |
| `APP_ACCENT_COLOR` | No | `#3b82f6` | Hex colour for email button branding |
| `API_KEY_PREFIX` | No | `mtsf_` | Prefix for generated API keys |
| `TRIAL_DAYS` | No | `14` | Default trial duration in days |
| `APP_EMAIL_FROM_NAME` | No | Value of `APP_NAME` | Email sender display name |

#### Development

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEV_SKIP_EMAIL` | No | `false` | Set to `true` to auto-verify emails (skip Resend) |
| `LOG_LEVEL` | No | `info` | Log verbosity: `error`, `warn`, `info`, `debug` |
| `MTSF_E2E_MODE` | No | `false` | E2E test mode flag |
| `MTSF_TEST_MODE` | No | `false` | Set automatically by test stack — do not set manually |

### Minimal Development `.env`

```env
POSTGRES_USER=mtsf
POSTGRES_PASSWORD=localdev123
POSTGRES_DB=mtsf
JWT_SECRET=<paste-generated-hex>
ENCRYPTION_KEY=<paste-generated-hex>
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_PRODUCT_ID=prod_your_id_here
STRIPE_PRICE_ID=price_your_id_here
FRONTEND_URL=http://localhost:3002
DEV_SKIP_EMAIL=true
LOG_LEVEL=info
```

## Step 3: Install Dependencies

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Step 4: Build and Start

```bash
cd frontend && npm run build && cd ..
docker compose up -d --build
```

Verify all three containers are running:

```bash
docker compose ps
```

Expected output: `mtsf_nginx`, `mtsf_backend`, `mtsf_postgres` — all `Up`.

## Step 5: Verify the Application

### Health check

```bash
curl http://localhost:3002/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Open the app

Navigate to http://localhost:3002 — you should see the login page.

## Step 6: Create Your First Account

1. Go to http://localhost:3002/signup
2. Enter your email and a strong password (8+ chars, upper, lower, number, special)
3. With `DEV_SKIP_EMAIL=true`, the account is auto-verified
4. You'll be redirected to the org setup page
5. Enter your organisation name and details
6. Click "Create Organisation"
7. You're now on the dashboard

## Step 7: Make Yourself a Platform Admin

Platform admins can access the admin panel (`/admin/dashboard`) to manage all organisations and users.

```bash
docker exec -it mtsf_postgres psql -U mtsf -d mtsf -c \
  "UPDATE users SET is_platform_admin = TRUE WHERE email = 'your@email.com';"
```

Refresh the page — "Admin Panel" now appears in the sidebar.

## Step 8: Set Up Stripe (Optional for Dev)

If you want to test billing flows:

1. Create a Stripe test mode account at https://dashboard.stripe.com
2. Create a Product and Price in the Stripe dashboard
3. Set up a webhook endpoint pointing to `http://your-domain/api/billing/webhook`
4. Copy the keys into your `.env`
5. Restart: `docker compose up -d --build`

## Troubleshooting

### Backend container keeps restarting

Check logs:

```bash
docker compose logs backend --tail=50
```

Common causes:
- Missing environment variables (check `.env`)
- Postgres not ready yet (backend waits for health check — give it 30 seconds)
- Port 3001 already in use

### "Cannot connect to database"

```bash
docker compose logs postgres --tail=20
```

Verify Postgres is healthy:

```bash
docker exec -it mtsf_postgres pg_isready -U mtsf -d mtsf
```

### Frontend shows blank page

Ensure the frontend was built before starting nginx:

```bash
cd frontend && npm run build && cd ..
docker compose restart nginx
```

### Rate limiting during development

Login/register rate limits may trigger during rapid testing. The rate limiter is automatically disabled when `MTSF_TEST_MODE=true` or `MTSF_E2E_MODE=true`.

---

## Next Steps

- [White-Label Guide](WHITE-LABEL-GUIDE.md) — Rebrand the app as your own product
- [Extending Guide](EXTENDING-GUIDE.md) — Add your domain entities and features
- [Architecture](ARCHITECTURE.md) — Understand the system design
- [Deployment Guide](DEPLOYMENT-GUIDE.md) — Go to production
