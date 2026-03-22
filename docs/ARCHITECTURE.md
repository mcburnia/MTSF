# MTSF Architecture

Technical architecture reference for developers and AI coding assistants. This document describes how MTSF is built, how data flows, and how each subsystem works.

---

## System Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │                  Internet                    │
                    └──────────────────────┬──────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │              Nginx (port 3002)                │
                    │  ┌─────────────────────────────────────────┐ │
                    │  │  /api/*  → proxy to backend:3001        │ │
                    │  │  /*      → serve frontend/dist (SPA)    │ │
                    │  │  Security headers (CSP, HSTS, etc.)     │ │
                    │  └─────────────────────────────────────────┘ │
                    └───────────┬──────────────────┬───────────────┘
                                │                  │
                    ┌───────────▼────────┐  ┌──────▼───────────────┐
                    │  Backend (3001)     │  │  Frontend (static)   │
                    │  Express + TS       │  │  React 19 + Vite     │
                    │                     │  │  SPA in nginx html   │
                    │  ┌───────────────┐  │  └──────────────────────┘
                    │  │  Middleware    │  │
                    │  │  - Auth       │  │
                    │  │  - Billing    │  │
                    │  │  - Rate limit │  │
                    │  │  - Plan gate  │  │
                    │  └───────┬───────┘  │
                    │          │          │
                    │  ┌───────▼───────┐  │
                    │  │  Routes       │  │
                    │  │  → Services   │  │
                    │  │  → Utils      │  │
                    │  └───────┬───────┘  │
                    └──────────┼──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PostgreSQL (5432)   │
                    │  All tables scoped   │
                    │  by org_id           │
                    └─────────────────────┘
```

**Docker network:** All services communicate on `mtsf_net` (bridge). Postgres is only exposed to `127.0.0.1:5433` for local tooling.

---

## Multi-Tenancy Model

MTSF uses **organisation-scoped row-level isolation**. Every data table has an `org_id` column, and every query filters by it.

### Isolation pattern

```
User authenticates → JWT contains userId
  → Route calls getUserOrgId(userId)
    → Query: SELECT org_id FROM users WHERE id = $userId
      → All subsequent queries: WHERE org_id = $orgId
```

### Data flow

```
Request → JWT verification → userId extracted
  → users table → org_id resolved
    → All queries filtered by org_id
      → Response contains only that org's data
```

**There are no cross-org queries in the application layer.** Every route resolves `org_id` from the authenticated user and passes it to every database query.

### Tables with org_id scoping

| Table | Scoping Column | Notes |
|-------|---------------|-------|
| `users` | `org_id` | Users belong to exactly one org |
| `organisations` | `id` (is the org) | The org record itself |
| `org_billing` | `org_id` (PK) | One billing record per org |
| `items` | `org_id` | Example entity — all domain tables follow this pattern |
| `api_keys` | `org_id` | Keys scoped to org |
| `activity_log` | `org_id` | Audit trail scoped to org |
| `billing_events` | `org_id` | Billing history scoped to org |

### Tables without org scoping (platform-wide)

| Table | Reason |
|-------|--------|
| `user_events` | Telemetry — includes events before org creation |
| `platform_settings` | Global config (pricing, feature flags) |

---

## Authentication Flow

### Registration

```
POST /api/auth/register { email, password }
  │
  ├─ Validate password strength (8+ chars, upper, lower, number, special)
  ├─ Check if email exists
  │   ├─ Exists + unverified → resend verification email
  │   └─ Exists + verified → 409 Conflict
  ├─ Hash password (bcrypt, 12 rounds)
  │
  ├─ DEV_SKIP_EMAIL=true:
  │   ├─ Insert user with email_verified=TRUE
  │   ├─ Generate JWT session token
  │   └─ Return { session, devMode: true }
  │
  └─ Production:
      ├─ Generate 32-byte verification token
      ├─ Insert user with token + 24h expiry
      ├─ Send verification email via Resend
      └─ Return { message: "Verification email sent" }
```

### Email Verification

```
GET /api/auth/verify-email?token=xxx
  │
  ├─ Look up user by verification_token
  ├─ Check token not expired (24h)
  ├─ Set email_verified=TRUE, clear token
  ├─ Generate JWT session token
  └─ Redirect to FRONTEND_URL/welcome?session=xxx
```

### Login

```
POST /api/auth/login { email, password }
  │
  ├─ Find user by email
  ├─ Verify password against bcrypt hash
  ├─ Check email_verified=TRUE
  ├─ Check suspended_at IS NULL
  ├─ Generate JWT session token (7-day expiry)
  ├─ Record login event in user_events
  └─ Return { session }
```

### Session Check

```
GET /api/auth/me
  │
  ├─ Extract JWT from Authorization: Bearer header
  ├─ Verify JWT signature (HS256, HKDF-derived secret)
  ├─ Look up user in database
  ├─ Look up org billing for plan info
  └─ Return { user: { id, email, orgId, orgRole, isPlatformAdmin, orgPlan } }
```

### JWT Security

File: `backend/src/utils/token.ts`

- **Algorithm:** HS256 (pinned — prevents `alg: none` and algorithm confusion attacks)
- **Secret:** HKDF-SHA256 derived from `JWT_SECRET` env var with purpose string `mtsf-jwt-v1`
- **Expiry:** 7 days
- **No refresh tokens** — user re-authenticates after expiry

File: `backend/src/utils/key-derivation.ts`

- **HKDF salt:** `mtsf-hkdf-salt-v1` (fixed, not secret)
- **Domain separation:** JWT signing key and encryption key are derived from different purpose strings, so compromising one does not compromise the other

---

## Billing State Machine

File: `backend/src/services/billing.ts`

```
                    ┌───────────┐
                    │   trial   │ ← Created on org setup (TRIAL_DAYS duration)
                    └─────┬─────┘
                          │ Stripe checkout completed
                          ▼
                    ┌───────────┐
            ┌──────│  active    │◄──────┐
            │      └─────┬─────┘       │
            │            │ invoice.payment_failed
            │            ▼             │ Payment recovered
            │      ┌───────────┐       │
            │      │ past_due  │───────┘
            │      └─────┬─────┘
            │            │ Grace period expired (7 days)
            │            ▼
            │      ┌───────────┐
            │      │ read_only │ ← Can read data, cannot write
            │      └─────┬─────┘
            │            │ Extended non-payment
            │            ▼
            │      ┌───────────┐
            │      │ suspended │ ← Fully locked out
            │      └───────────┘
            │
            │ User cancels subscription
            ▼
      ┌───────────┐
      │ cancelled │
      └───────────┘

      ┌───────────┐
      │  exempt   │ ← Admin-set, bypasses all billing checks
      └───────────┘
```

**Trial expiry:** The scheduler (`backend/src/services/scheduler.ts`) runs hourly and sets `grace_ends_at` for expired trials. When grace expires, status moves to `read_only`.

### Middleware enforcement

File: `backend/src/middleware/requireActiveBilling.ts`

Applied globally to all `POST/PUT/DELETE` requests under `/api/*` (except `/api/auth`, `/api/billing`, `/api/admin`, `/api/health`).

| Status | GET | POST/PUT/DELETE |
|--------|-----|-----------------|
| `trial` | Allowed | Allowed |
| `active` | Allowed | Allowed |
| `past_due` | Allowed | Allowed (grace period) |
| `read_only` | Allowed | **Blocked** (403) |
| `suspended` | Allowed | **Blocked** (403) |
| `cancelled` | Allowed | **Blocked** (403) |
| `exempt` | Allowed | Allowed |

---

## Middleware Pipeline

Every API request passes through this pipeline:

```
Request
  │
  ├─ CORS (origin: FRONTEND_URL)
  ├─ JSON body parser (with rawBody capture for Stripe webhooks)
  │
  ├─ Global billing gate (POST/PUT/DELETE only)
  │   ├─ Peeks at JWT to get userId → orgId
  │   ├─ Checks org_billing.status
  │   └─ Blocks or allows based on status
  │
  ├─ Per-route middleware:
  │   ├─ requireAuth       → verifies JWT, sets req.userId
  │   ├─ requirePlan('pro') → checks org has required plan
  │   ├─ requireApiKey()   → validates X-API-Key header
  │   ├─ requirePlatformAdmin → checks is_platform_admin=TRUE in DB
  │   └─ authRateLimit()   → IP-based rate limiting
  │
  └─ Route handler
```

### Rate Limiting

File: `backend/src/middleware/authRateLimit.ts`

In-memory, IP-based. No Redis required.

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Register | 3 attempts | 1 hour |
| Verify | 10 attempts | 1 hour |
| Invite | 5 attempts | 1 hour |
| Account delete | 3 attempts | 1 hour |

Automatic cleanup of expired entries every 10 minutes. Disabled in test/E2E mode.

---

## Security Model

### Encryption

File: `backend/src/utils/encryption.ts`

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key:** HKDF-SHA256 derived from `ENCRYPTION_KEY` env var
- **Format:** `v2:iv:tag:ciphertext` (all hex-encoded)
- **IV:** 16 random bytes per encryption (never reused)

### Password Hashing

File: `backend/src/utils/password.ts`

- **Algorithm:** bcrypt
- **Salt rounds:** 12
- **No plaintext storage**

### Key Derivation

File: `backend/src/utils/key-derivation.ts`

- **Algorithm:** HKDF-SHA256 (RFC 5869)
- **Purpose separation:** Different keys derived for JWT signing vs encryption
- **Quantum-safe:** SHA-256 resists Grover's algorithm at 256-bit security

---

## Database Schema

File: `backend/src/db/pool.ts`

### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `email` | VARCHAR(255) UNIQUE | Lowercase |
| `password_hash` | TEXT | bcrypt hash |
| `email_verified` | BOOLEAN | Default FALSE |
| `verification_token` | TEXT | For email verification / invites |
| `token_expires_at` | TIMESTAMPTZ | Token expiry |
| `org_id` | UUID | FK to organisations |
| `org_role` | VARCHAR(50) | `admin`, `member`, `viewer` |
| `is_platform_admin` | BOOLEAN | Platform-wide admin access |
| `preferred_language` | VARCHAR(10) | e.g. `en`, `de` |
| `suspended_at` | TIMESTAMPTZ | Null = active |
| `invited_by` | UUID | FK to users (who invited) |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `organisations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `name` | VARCHAR(255) | Org display name |
| `country` | VARCHAR(100) | Optional |
| `company_size` | VARCHAR(50) | e.g. `1-10`, `51-200` |
| `industry` | VARCHAR(100) | Optional |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `org_billing`

| Column | Type | Description |
|--------|------|-------------|
| `org_id` | UUID (PK) | FK to organisations |
| `status` | VARCHAR(20) | `trial`, `active`, `past_due`, `read_only`, `suspended`, `cancelled` |
| `plan` | VARCHAR(20) | `standard`, `pro`, `enterprise` |
| `trial_ends_at` | TIMESTAMPTZ | End of trial period |
| `grace_ends_at` | TIMESTAMPTZ | End of grace period after trial/payment failure |
| `stripe_customer_id` | VARCHAR(255) | Stripe customer ID |
| `stripe_subscription_id` | VARCHAR(255) | Stripe subscription ID |
| `seat_count` | INT | Number of seats |
| `monthly_amount_cents` | INT | Monthly charge in cents |
| `exempt` | BOOLEAN | Exempt from billing |
| `exempt_reason` | TEXT | Why exempt |
| `billing_email` | VARCHAR(255) | Billing contact email |
| `vat_number` | VARCHAR(100) | VAT/tax ID |

### `items` (Example Entity)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `org_id` | UUID | Tenant scoping |
| `name` | VARCHAR(255) | Item name |
| `description` | TEXT | Optional |
| `status` | VARCHAR(50) | `active`, `archived`, `draft` |
| `metadata` | JSONB | Extensible key-value data |
| `created_by` | UUID | FK to users |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `api_keys`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `org_id` | UUID | Tenant scoping |
| `key_hash` | VARCHAR(255) | SHA-256 hash of full key |
| `key_prefix` | VARCHAR(20) | First 12 chars (for display) |
| `name` | VARCHAR(255) | Human-readable name |
| `scopes` | JSONB | Array of permission scopes |
| `created_by` | UUID | FK to users |
| `last_used_at` | TIMESTAMPTZ | Last API call |
| `revoked_at` | TIMESTAMPTZ | Null = active |
| `created_at` | TIMESTAMPTZ | Auto |

### `activity_log`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `org_id` | UUID | Tenant scoping |
| `entity_type` | VARCHAR(100) | e.g. `item`, `org`, `user` |
| `entity_id` | UUID | ID of the affected entity |
| `action` | VARCHAR(100) | e.g. `created`, `updated`, `deleted` |
| `user_id` | UUID | Who performed the action |
| `before_value` | JSONB | State before change |
| `after_value` | JSONB | State after change |
| `created_at` | TIMESTAMPTZ | Auto |

### `user_events`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID | FK to users |
| `email` | VARCHAR(255) | Email at time of event |
| `event_type` | VARCHAR(100) | e.g. `register`, `login`, `login_failed_bad_password` |
| `ip_address` | VARCHAR(100) | Client IP |
| `user_agent` | TEXT | Browser user agent |
| `browser_language` | VARCHAR(20) | e.g. `en-GB` |
| `browser_timezone` | VARCHAR(100) | e.g. `Europe/London` |
| `metadata` | JSONB | Extra context |
| `created_at` | TIMESTAMPTZ | Auto |

### `billing_events`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `org_id` | UUID | Tenant scoping |
| `event_type` | VARCHAR(100) | e.g. `checkout_completed`, `payment_failed` |
| `stripe_event_id` | VARCHAR(255) | Stripe event ID for deduplication |
| `metadata` | JSONB | Event details |
| `created_at` | TIMESTAMPTZ | Auto |

### `platform_settings`

| Column | Type | Description |
|--------|------|-------------|
| `key` | VARCHAR(100) (PK) | Setting name |
| `value` | JSONB | Setting value |
| `updated_at` | TIMESTAMPTZ | Auto |

---

## Next Steps

- [API Reference](API-REFERENCE.md) — Every endpoint documented
- [Extending Guide](EXTENDING-GUIDE.md) — Add your domain entities
- [Deployment Guide](DEPLOYMENT-GUIDE.md) — Go to production
