# MTSF API Reference

Complete endpoint documentation for the MTSF backend API. All endpoints are prefixed with `/api`.

---

## Authentication Patterns

### Bearer Token (JWT)

Most endpoints require a JWT session token in the `Authorization` header:

```
Authorization: Bearer <session_token>
```

The token is obtained from `/api/auth/login` or `/api/auth/register` (dev mode).

### API Key

Public API endpoints accept an API key in the `X-API-Key` header:

```
X-API-Key: mtsf_abc123def456...
```

API keys are org-scoped and require the Pro plan or higher.

### Error Response Format

All errors follow this structure:

```json
{
  "error": "error_code_or_message",
  "message": "Human-readable description (optional)",
  "status": "billing_status (optional, for billing errors)",
  "requiredPlan": "pro (optional, for plan-gated features)",
  "currentPlan": "standard (optional)"
}
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Not authenticated |
| 403 | Forbidden (insufficient permissions or billing) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |

---

## Auth Endpoints

### POST /api/auth/register

Create a new user account.

**Auth:** None
**Rate limit:** 3 per hour per IP

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ss1",
  "browserLanguage": "en-GB",
  "browserTimezone": "Europe/London",
  "referrer": "https://google.com"
}
```

**Response (201 — production):**
```json
{
  "message": "Verification email sent"
}
```

**Response (201 — dev mode, `DEV_SKIP_EMAIL=true`):**
```json
{
  "message": "Account created and verified (dev mode)",
  "devMode": true,
  "session": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` — Missing email/password or weak password
- `409` — Email already exists

---

### POST /api/auth/login

Authenticate and receive a session token.

**Auth:** None
**Rate limit:** 5 per 15 minutes per IP

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ss1",
  "browserLanguage": "en-GB",
  "browserTimezone": "Europe/London"
}
```

**Response (200):**
```json
{
  "session": "eyJhbGciOiJIUzI1NiIs...",
  "email": "user@example.com"
}
```

**Errors:**
- `401` — Invalid credentials
- `403` — Email not verified, or account suspended

---

### GET /api/auth/me

Check current session and get user info.

**Auth:** Bearer token

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "orgId": "uuid or null",
    "orgRole": "admin | member | viewer | null",
    "preferredLanguage": "en | null",
    "isPlatformAdmin": false,
    "orgPlan": "standard | pro | enterprise"
  }
}
```

---

### GET /api/auth/verify-email?token=xxx

Verify email address. Redirects to frontend.

**Auth:** None
**Rate limit:** 10 per hour per IP

**Response:** `302` redirect to `FRONTEND_URL/welcome?session=xxx`

**Errors:**
- `400` — Invalid or expired token

---

### POST /api/auth/accept-invite

Accept a team invitation and set password.

**Auth:** None
**Rate limit:** 5 per hour per IP

**Request:**
```json
{
  "token": "verification_token_from_email",
  "password": "StrongP@ss1"
}
```

**Response (200):**
```json
{
  "session": "eyJhbGciOiJIUzI1NiIs...",
  "email": "invited@example.com",
  "hasOrg": true
}
```

---

## Organisation Endpoints

### POST /api/org

Create a new organisation for the current user.

**Auth:** Bearer token

**Request:**
```json
{
  "name": "Acme Ltd",
  "country": "United Kingdom",
  "companySize": "11-50",
  "industry": "Technology"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Acme Ltd"
}
```

**Errors:**
- `400` — Name required
- `409` — User already has an org

---

### GET /api/org

Get the current user's organisation.

**Auth:** Bearer token

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Acme Ltd",
  "country": "United Kingdom",
  "companySize": "11-50",
  "industry": "Technology"
}
```

---

### PUT /api/org

Update organisation details. Admin only.

**Auth:** Bearer token (org admin)

**Request:**
```json
{
  "name": "Acme Corporation",
  "country": "Germany",
  "industry": "Finance"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### GET /api/org/members

List all members of the current org.

**Auth:** Bearer token

**Response (200):**
```json
{
  "members": [
    {
      "id": "uuid",
      "email": "admin@acme.com",
      "org_role": "admin",
      "is_platform_admin": false,
      "suspended_at": null,
      "created_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

---

## Billing Endpoints

### GET /api/billing/status

Get billing status for the current org.

**Auth:** Bearer token

**Response (200):**
```json
{
  "status": "trial",
  "plan": "standard",
  "trialEndsAt": "2026-04-05T10:00:00Z",
  "trialDaysRemaining": 14,
  "graceEndsAt": null,
  "seatCount": 3,
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": null,
  "exempt": false,
  "exemptReason": null,
  "billingEmail": null,
  "vatNumber": null,
  "monthlyAmountCents": 0
}
```

---

### POST /api/billing/checkout

Create a Stripe checkout session.

**Auth:** Bearer token

**Request:**
```json
{
  "plan": "standard"
}
```

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx"
}
```

---

### POST /api/billing/portal

Create a Stripe customer portal session.

**Auth:** Bearer token

**Response (200):**
```json
{
  "url": "https://billing.stripe.com/p/session/xxx"
}
```

---

### POST /api/billing/webhook

Stripe webhook endpoint. Called by Stripe, not by the frontend.

**Auth:** Stripe signature (`stripe-signature` header)

**Events handled:**
- `checkout.session.completed` — Activates subscription
- `customer.subscription.updated` — Updates status
- `customer.subscription.deleted` — Cancels subscription
- `invoice.payment_failed` — Sets past_due with grace period

**Response (200):**
```json
{
  "received": true
}
```

---

## Account Endpoints

### GET /api/account

Get current user profile.

**Auth:** Bearer token

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "orgId": "uuid",
  "orgRole": "admin",
  "preferredLanguage": "en",
  "isPlatformAdmin": false,
  "createdAt": "2026-03-22T10:00:00Z"
}
```

---

### PUT /api/account/password

Change password.

**Auth:** Bearer token

**Request:**
```json
{
  "currentPassword": "OldP@ss1",
  "newPassword": "NewStr0ng!Pass"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### PUT /api/account/preferences

Update user preferences.

**Auth:** Bearer token

**Request:**
```json
{
  "preferredLanguage": "de"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Items Endpoints (Example CRUD Entity)

### GET /api/items

List all items for the current org.

**Auth:** Bearer token

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "Widget A",
      "description": "A sample item",
      "status": "active",
      "metadata": {},
      "created_by": "uuid",
      "created_by_email": "user@example.com",
      "created_at": "2026-03-22T10:00:00Z",
      "updated_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

---

### GET /api/items/:id

Get a single item.

**Auth:** Bearer token

**Response (200):** Single item object (same shape as list items, without `created_by_email`).

---

### POST /api/items

Create an item.

**Auth:** Bearer token
**Billing gate:** Requires active billing (not read_only/suspended/cancelled)

**Request:**
```json
{
  "name": "Widget B",
  "description": "Another item",
  "status": "active",
  "metadata": { "priority": "high" }
}
```

**Response (201):** Created item object.

---

### PUT /api/items/:id

Update an item.

**Auth:** Bearer token
**Billing gate:** Active billing required

**Request:** Same fields as POST (all optional, only provided fields are updated).

**Response (200):** Updated item object.

---

### DELETE /api/items/:id

Delete an item.

**Auth:** Bearer token
**Billing gate:** Active billing required

**Response (200):**
```json
{
  "success": true
}
```

---

## Admin Endpoints

All admin endpoints require `is_platform_admin = TRUE` in the database.

### GET /api/admin/dashboard

Platform overview statistics.

**Auth:** Platform admin

**Response (200):**
```json
{
  "totalUsers": 42,
  "totalOrgs": 12,
  "billing": {
    "trial": 5,
    "active": 4,
    "past_due": 1,
    "cancelled": 2,
    "exempt": 0
  }
}
```

---

### GET /api/admin/users?filter=all&search=email

List all platform users.

**Auth:** Platform admin

**Query params:**
- `filter` — `all`, `admins`, `unverified`, `suspended`
- `search` — Email search string

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "org_id": "uuid",
      "org_name": "Acme Ltd",
      "org_role": "admin",
      "is_platform_admin": false,
      "email_verified": true,
      "suspended_at": null,
      "created_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

---

### POST /api/admin/users/invite

Invite a new user to the platform.

**Auth:** Platform admin

**Request:**
```json
{
  "email": "newuser@example.com",
  "orgId": "uuid (optional)",
  "role": "member"
}
```

**Response (201):**
```json
{
  "success": true
}
```

---

### PUT /api/admin/users/:id/suspend

Suspend or unsuspend a user.

**Auth:** Platform admin

**Request:**
```json
{
  "suspend": true
}
```

---

### PUT /api/admin/users/:id/admin

Toggle platform admin status.

**Auth:** Platform admin

**Request:**
```json
{
  "isAdmin": true
}
```

---

### GET /api/admin/orgs

List all organisations with billing info.

**Auth:** Platform admin

**Response (200):**
```json
{
  "orgs": [
    {
      "id": "uuid",
      "name": "Acme Ltd",
      "billing_status": "active",
      "plan": "standard",
      "member_count": 5,
      "exempt": false,
      "created_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

---

### PUT /api/admin/orgs/:id/billing

Admin override for org billing.

**Auth:** Platform admin

**Request:**
```json
{
  "status": "active",
  "plan": "pro",
  "exempt": true,
  "exemptReason": "Partner organisation"
}
```

---

## Health Endpoint

### GET /api/health

System health check. No authentication required.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-22T12:00:00.000Z"
}
```

**Response (503):**
```json
{
  "status": "error",
  "message": "Database unreachable"
}
```

---

## Next Steps

- [Architecture](ARCHITECTURE.md) — System design and data model
- [Extending Guide](EXTENDING-GUIDE.md) — Add your own endpoints
- [Deployment Guide](DEPLOYMENT-GUIDE.md) — Go to production
