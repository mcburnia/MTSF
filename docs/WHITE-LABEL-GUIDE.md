# MTSF White-Label Guide

How to rebrand MTSF as your own product. Every user-facing element — app name, colours, emails, API key prefixes — is configurable without modifying framework code.

---

## Branding Architecture

MTSF uses a two-layer configuration system:

```
Environment Variables (.env)
    └── backend/src/config.ts    ← reads env vars, provides APP_CONFIG
    └── services/email.ts        ← uses APP_CONFIG for email templates
    └── services/api-keys.ts     ← uses APP_CONFIG for key prefix

frontend/src/config.ts           ← static config (edit directly)
frontend/src/index.css           ← CSS variables for colours/fonts
frontend/index.html              ← page title, favicon
```

**Rule:** Backend branding is env-driven (change without rebuild). Frontend branding requires editing files and rebuilding.

---

## Quick Rebrand: MTSF to "YourProduct" in 10 Minutes

### 1. Backend: Set environment variables

File: `.env`

```env
APP_NAME=YourProduct
APP_TAGLINE=The best SaaS platform for your industry
APP_ACCENT_COLOR=#10b981
APP_EMAIL_FROM_NAME=YourProduct
EMAIL_FROM=hello@yourproduct.com
API_KEY_PREFIX=yp_
TRIAL_DAYS=30
```

No rebuild needed — restart the backend container:

```bash
docker compose restart backend
```

### 2. Frontend: Edit config

File: `frontend/src/config.ts`

```typescript
export const APP_CONFIG = {
  name: 'YourProduct',
  tagline: 'The best SaaS platform for your industry',
  accentClass: 'green',  // matches your CSS variable name
};
```

### 3. Frontend: Update colours

File: `frontend/src/index.css`

Change the `:root` CSS variables:

```css
:root {
  --bg: #0f1117;           /* Page background */
  --surface: #1a1d27;      /* Card/panel background */
  --border: #2a2d3a;       /* Border colour */
  --text: #e4e4e7;         /* Primary text */
  --muted: #8b8d98;        /* Secondary text */
  --accent: #10b981;       /* Primary brand colour (was blue, now green) */
  --accent-hover: #059669; /* Hover state for accent */
  --green: #22c55e;        /* Success colour */
  --amber: #f59e0b;        /* Warning colour */
  --red: #ef4444;          /* Error colour */
  --purple: #a855f7;       /* Admin/special colour */
}
```

### 4. Frontend: Update page title

File: `frontend/index.html`

```html
<title>YourProduct</title>
```

### 5. Frontend: Update mobile topbar

File: `frontend/src/layouts/AuthenticatedLayout.tsx`

Find line:
```tsx
<div className="topbar-logo">MTSF</div>
```

Change to:
```tsx
<div className="topbar-logo">YourProduct</div>
```

### 6. Rebuild and restart

```bash
cd frontend && npm run build && cd ..
docker compose up -d --build
```

Your app is now fully rebranded.

---

## Detailed Branding Reference

### Backend Branding (Environment Variables)

All backend branding is controlled via environment variables, read by:

File: `backend/src/config.ts`

| Variable | Used In | Effect |
|----------|---------|--------|
| `APP_NAME` | `config.ts` → emails, API responses | Display name everywhere |
| `APP_TAGLINE` | `config.ts` → email footers | Tagline in email templates |
| `APP_ACCENT_COLOR` | `config.ts` → email button colour | Hex colour for email CTAs |
| `APP_EMAIL_FROM_NAME` | `config.ts` → email "From" name | Sender name in emails |
| `EMAIL_FROM` | `config.ts` → email "From" address | Sender email address |
| `API_KEY_PREFIX` | `config.ts` → `services/api-keys.ts` | Prefix for API keys (e.g. `yp_abc123`) |
| `TRIAL_DAYS` | `config.ts` → `services/billing.ts` | Default free trial length |

### Frontend Branding (Static Config)

File: `frontend/src/config.ts`

```typescript
export const APP_CONFIG = {
  /** Application display name — shown in sidebar, auth pages, page titles */
  name: 'YourProduct',

  /** Tagline — shown on signup page below the logo */
  tagline: 'Your tagline here',

  /** Accent colour class — for programmatic colour references */
  accentClass: 'blue',
};
```

**Where `APP_CONFIG.name` appears:**
- Sidebar logo (`frontend/src/components/Sidebar.tsx` line 1 of return)
- Login page logo (`frontend/src/pages/public/LoginPage.tsx`)
- Signup page logo (`frontend/src/pages/public/SignupPage.tsx`)
- Invite acceptance page (`frontend/src/pages/public/AcceptInvitePage.tsx`)
- Org setup page (`frontend/src/pages/setup/OrgSetupPage.tsx`)

**Where `APP_CONFIG.tagline` appears:**
- Signup page subtitle (`frontend/src/pages/public/SignupPage.tsx`)

### CSS Variable Theming

File: `frontend/src/index.css`

The entire visual theme is controlled by CSS custom properties:

| Variable | Default | Used For |
|----------|---------|----------|
| `--bg` | `#0f1117` | Page background |
| `--surface` | `#1a1d27` | Cards, panels, sidebar |
| `--border` | `#2a2d3a` | Borders, dividers |
| `--text` | `#e4e4e7` | Primary text colour |
| `--muted` | `#8b8d98` | Secondary/helper text |
| `--accent` | `#3b82f6` | Primary brand colour — buttons, links, active states |
| `--accent-hover` | `#2563eb` | Hover state for accent-coloured elements |
| `--green` | `#22c55e` | Success states, active badges |
| `--amber` | `#f59e0b` | Warning states, trial badges |
| `--red` | `#ef4444` | Error states, danger actions |
| `--purple` | `#a855f7` | Admin panel accent |

**To create a light theme**, invert the background/text values:

```css
:root {
  --bg: #ffffff;
  --surface: #f8f9fa;
  --border: #e2e8f0;
  --text: #1a202c;
  --muted: #718096;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
}
```

### Email Template Branding

File: `backend/src/services/email.ts`

Email templates use `APP_CONFIG` values from `backend/src/config.ts`:

- **Sender name:** `APP_CONFIG.emailFromName` → e.g. `"YourProduct <hello@yourproduct.com>"`
- **Subject lines:** Include `APP_CONFIG.name` → e.g. `"Verify your YourProduct account"`
- **Button colour:** `APP_CONFIG.accentColor` → inline CSS `background: #10b981`
- **Footer text:** `APP_CONFIG.name` + `APP_CONFIG.tagline`

To customise email HTML structure, edit the template strings in:
- `sendVerificationEmail()` — Registration verification
- `sendInviteEmail()` — Team member invitations

### Sidebar Navigation

File: `frontend/src/components/Sidebar.tsx`

Navigation is data-driven via the `navSections` array:

```typescript
const navSections = [
  {
    label: 'Overview',           // Section header
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Data',               // Rename this for your domain
    items: [
      { to: '/items', icon: Package, label: 'Items' },  // Replace with your entities
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/billing', icon: CreditCard, label: 'Billing' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];
```

To add navigation items:
1. Import the icon from `lucide-react`
2. Add an entry to the appropriate section's `items` array
3. Ensure the route exists in `frontend/src/router.tsx`

### Favicon and Meta Tags

File: `frontend/index.html`

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="YourProduct — your tagline here" />
  <title>YourProduct</title>
</head>
```

Place your favicon at `frontend/public/favicon.svg` (or `.ico`, `.png`).

### Docker Container Names

File: `docker-compose.yml`

Container names default to `mtsf_*`. To rebrand:

```yaml
services:
  nginx:
    container_name: yourproduct_nginx
  backend:
    container_name: yourproduct_backend
  postgres:
    container_name: yourproduct_postgres
```

Also update the network and volume names:

```yaml
volumes:
  yourproduct_pg_data:

networks:
  yourproduct_net:
    driver: bridge
```

---

## Branding Checklist

Use this checklist when rebranding MTSF for a new project:

- [ ] Set `APP_NAME`, `APP_TAGLINE`, `APP_ACCENT_COLOR` in `.env`
- [ ] Set `EMAIL_FROM`, `APP_EMAIL_FROM_NAME` in `.env`
- [ ] Set `API_KEY_PREFIX` in `.env` (e.g. `yp_`)
- [ ] Set `TRIAL_DAYS` in `.env`
- [ ] Edit `frontend/src/config.ts` with app name and tagline
- [ ] Edit `frontend/src/index.css` CSS variables for your colour scheme
- [ ] Edit `frontend/index.html` page title and meta description
- [ ] Edit `frontend/src/layouts/AuthenticatedLayout.tsx` mobile topbar logo
- [ ] Add favicon to `frontend/public/`
- [ ] Optionally rename Docker containers/volumes/network in `docker-compose.yml`
- [ ] Rebuild: `cd frontend && npm run build && cd .. && docker compose up -d --build`

---

## Next Steps

- [Extending Guide](EXTENDING-GUIDE.md) — Add your domain entities
- [Deployment Guide](DEPLOYMENT-GUIDE.md) — Go to production
- [Architecture](ARCHITECTURE.md) — Understand the system design
