# MTSF Deployment Guide

How to deploy MTSF to production. Covers HTTPS, Stripe, email, backups, monitoring, and security hardening.

---

## Production Checklist

Before going live, verify every item:

- [ ] `DEV_SKIP_EMAIL=false` (require real email verification)
- [ ] `MTSF_E2E_MODE=false`
- [ ] `LOG_LEVEL=warn` or `info`
- [ ] `JWT_SECRET` is a unique, randomly generated 64-char hex string
- [ ] `ENCRYPTION_KEY` is a unique, randomly generated 64-char hex string (different from JWT_SECRET)
- [ ] `POSTGRES_PASSWORD` is a strong, unique password
- [ ] `STRIPE_SECRET_KEY` is a live key (`sk_live_...`), not test
- [ ] `STRIPE_WEBHOOK_SECRET` matches the live webhook endpoint
- [ ] `RESEND_API_KEY` is configured with a verified domain
- [ ] `EMAIL_FROM` uses your verified domain (e.g. `noreply@yourproduct.com`)
- [ ] `FRONTEND_URL` is set to your public domain (e.g. `https://app.yourproduct.com`)
- [ ] HTTPS is configured (see below)
- [ ] Database backups are automated
- [ ] `.env` is NOT in version control

---

## HTTPS Setup

MTSF's nginx container listens on HTTP (port 80 internally). You need a TLS termination layer in front of it.

### Option 1: Cloudflare Tunnel (Recommended for simplicity)

No port forwarding, no certificate management. Cloudflare handles TLS.

```bash
# Install cloudflared
# See https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

# Create tunnel
cloudflared tunnel create yourproduct

# Configure tunnel (cloudflared config.yml)
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: app.yourproduct.com
    service: http://localhost:3002
  - service: http_status:404

# Run as systemd service
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

Set in `.env`:
```env
FRONTEND_URL=https://app.yourproduct.com
```

### Option 2: Caddy (Automatic HTTPS)

Caddy auto-provisions Let's Encrypt certificates.

```Caddyfile
app.yourproduct.com {
    reverse_proxy localhost:3002
}
```

```bash
caddy start
```

### Option 3: Traefik

Add Traefik as a Docker service with Let's Encrypt integration. See Traefik documentation for Docker Compose setup.

---

## Stripe Production Setup

### 1. Switch to live mode

In the Stripe dashboard, toggle from "Test mode" to "Live mode".

### 2. Create your product and price

```
Stripe Dashboard → Products → Add product
  Name: YourProduct Subscription
  Pricing: Recurring, per seat, monthly
```

Copy the Product ID (`prod_...`) and Price ID (`price_...`) into `.env`.

### 3. Set up the webhook endpoint

```
Stripe Dashboard → Developers → Webhooks → Add endpoint
  URL: https://app.yourproduct.com/api/billing/webhook
  Events to listen for:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_failed
    - invoice.paid
```

Copy the Signing Secret (`whsec_...`) into `.env` as `STRIPE_WEBHOOK_SECRET`.

### 4. Update environment

File: `.env`

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRODUCT_ID=prod_...
STRIPE_PRICE_ID=price_...
```

---

## Email Production Setup (Resend)

### 1. Verify your domain

```
Resend Dashboard → Domains → Add domain
  Domain: yourproduct.com
  Add the DNS records shown (SPF, DKIM, DMARC)
```

### 2. Create API key

```
Resend Dashboard → API Keys → Create API Key
  Name: MTSF Production
  Permission: Sending access
  Domain: yourproduct.com
```

### 3. Update environment

File: `.env`

```env
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourproduct.com
APP_EMAIL_FROM_NAME=YourProduct
```

---

## Database Backups

### Automated daily backups

File: `scripts/backup-databases.sh`

Set up a cron job:

```bash
crontab -e
```

Add:
```
0 3 * * * /path/to/mtsf/scripts/backup-databases.sh >> /var/log/mtsf-backup.log 2>&1
```

This runs at 3 AM daily and maintains:
- 7 daily backups
- 4 weekly backups (Sundays)
- 3 monthly backups (1st of month)

### Manual backup

```bash
./scripts/backup-databases.sh
```

### Restore from backup

```bash
./scripts/restore-databases.sh backups/daily/mtsf_20260322_030000.sql.gz
```

**Warning:** This drops and recreates the database. Always back up first.

### Off-site backup

Copy backups to an off-site location:

```bash
rsync -avz backups/ user@backup-server:/backups/mtsf/
```

Or use S3-compatible storage:

```bash
aws s3 sync backups/ s3://your-bucket/mtsf-backups/
```

---

## Monitoring and Health Checks

### Health endpoint

```bash
curl https://app.yourproduct.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Uptime monitoring

Set up an external monitor (e.g. UptimeRobot, Better Stack, Checkly) to poll:
- `GET https://app.yourproduct.com/api/health` — every 1 minute
- Alert on non-200 response or timeout > 5 seconds

### Docker health checks

Postgres has a built-in health check in `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 5s
  timeout: 3s
  retries: 20
```

### Log monitoring

```bash
# View backend logs
docker compose logs backend --tail=100 -f

# View nginx access logs
docker compose logs nginx --tail=100 -f

# View only errors
docker compose logs backend --tail=100 2>&1 | grep -i error
```

---

## Scaling Considerations

### Vertical scaling

The default Docker Compose resource limits:

| Service | Memory Limit | Purpose |
|---------|-------------|---------|
| Nginx | 64 MB | Sufficient for reverse proxy |
| Backend | 512 MB | Increase for heavy API traffic |
| Postgres | 1 GB | Increase for large datasets |

Adjust in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 1G  # Increase as needed
```

### Horizontal scaling

For multi-instance backend:

1. Move session state to database (already done — JWT is stateless)
2. Move rate limiting to Redis (currently in-memory)
3. Use a load balancer in front of multiple backend containers
4. Ensure Postgres can handle the connection count (`max` in pool config)

### Database scaling

For large datasets:

1. Add indexes for your domain-specific queries
2. Consider table partitioning by `org_id` for very large tenants
3. Set up read replicas for reporting queries
4. Tune Postgres config in `docker-compose.yml` command

---

## Security Hardening Checklist

- [ ] **HTTPS only** — no HTTP access in production
- [ ] **Strong secrets** — JWT_SECRET and ENCRYPTION_KEY are unique, 64-char hex
- [ ] **Database not exposed** — Postgres binds to `127.0.0.1:5433` only
- [ ] **No `.env` in git** — verified in `.gitignore`
- [ ] **Rate limiting active** — `MTSF_TEST_MODE` and `MTSF_E2E_MODE` are `false`
- [ ] **CSP headers** — configured in `nginx/default.conf` (review for your domain)
- [ ] **HSTS enabled** — set in nginx security headers
- [ ] **Stripe webhook verified** — webhook secret configured and signature checked
- [ ] **Email verification required** — `DEV_SKIP_EMAIL=false`
- [ ] **Platform admin audited** — only trusted users have `is_platform_admin=TRUE`
- [ ] **Backups tested** — restore has been verified on a test database
- [ ] **Container resource limits** — set in docker-compose.yml to prevent OOM
- [ ] **Log level appropriate** — `warn` or `info` in production, not `debug`

---

## Updating MTSF

To pull framework updates (if tracking the upstream):

```bash
git remote add mtsf https://github.com/mcburnia/MTSF.git
git fetch mtsf
git merge mtsf/main --no-commit
# Resolve conflicts, test, then commit
```

---

## Next Steps

- [Architecture](ARCHITECTURE.md) — System design reference
- [API Reference](API-REFERENCE.md) — Endpoint documentation
- [White-Label Guide](WHITE-LABEL-GUIDE.md) — Branding customisation
