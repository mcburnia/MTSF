# MTSF Extending Guide

How to add your own domain entities, pages, and features to MTSF. This guide uses a concrete example — adding a "Projects" entity — to demonstrate every step.

---

## Philosophy

MTSF ships with an example entity called **Items** (`backend/src/routes/items.ts` + `frontend/src/pages/items/`). Every new domain entity should follow the same pattern:

1. **Database table** with `org_id` for tenant isolation
2. **Backend route** with `requireAuth` middleware and `getUserOrgId()` helper
3. **Frontend page(s)** with list view and detail view
4. **Router entry** in `frontend/src/router.tsx`
5. **Sidebar entry** in `frontend/src/components/Sidebar.tsx`

---

## Step-by-Step: Adding a "Projects" Entity

### 1. Add the database table

File: `backend/src/db/pool.ts`

Add inside the `initDb()` function, after the existing table creation statements:

```typescript
    // ── Projects ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add index
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id)`);
```

### 2. Create the backend route

File: `backend/src/routes/projects.ts` (new file)

Copy `backend/src/routes/items.ts` as a starting template, then adapt:

```typescript
import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logActivity } from '../services/activity-log.js';

const router = Router();

async function getUserOrgId(userId: string): Promise<string | null> {
  const result = await pool.query('SELECT org_id FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.org_id || null;
}

// GET /api/projects
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = await getUserOrgId((req as any).userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const result = await pool.query(
      `SELECT p.*, u.email AS created_by_email
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.org_id = $1
       ORDER BY p.created_at DESC`,
      [orgId]
    );

    res.json({ projects: result.rows });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// POST /api/projects
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const { name, description, priority, due_date } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

    const result = await pool.query(
      `INSERT INTO projects (org_id, name, description, priority, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [orgId, name, description || null, priority || 'medium', due_date || null, userId]
    );

    await logActivity(orgId, 'project', result.rows[0].id, 'created', userId);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ... GET /:id, PUT /:id, DELETE /:id follow the same pattern as items.ts

export default router;
```

### 3. Register the route

File: `backend/src/index.ts`

Add the import and route registration:

```typescript
import projectRoutes from './routes/projects.js';

// In the routes section:
app.use('/api/projects', projectRoutes);
```

### 4. Create the frontend pages

File: `frontend/src/pages/projects/ProjectsPage.tsx` (new file)

Copy `frontend/src/pages/items/ItemsPage.tsx` as a template. Change:
- API endpoint from `/api/items` to `/api/projects`
- Component name from `ItemsPage` to `ProjectsPage`
- Table columns to match your entity fields
- Links from `/items/:id` to `/projects/:id`

File: `frontend/src/pages/projects/ProjectDetailPage.tsx` (new file)

Copy `frontend/src/pages/items/ItemDetailPage.tsx` and adapt similarly.

### 5. Add the route to the router

File: `frontend/src/router.tsx`

Import the new pages and add routes inside the authenticated layout children:

```typescript
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';

// Inside the AuthenticatedLayout children array:
{ path: '/projects', element: <ProjectsPage /> },
{ path: '/projects/:id', element: <ProjectDetailPage /> },
```

### 6. Add sidebar navigation

File: `frontend/src/components/Sidebar.tsx`

Import the icon and add to `navSections`:

```typescript
import { FolderKanban } from 'lucide-react';  // Add to imports

// In navSections, add to the 'Data' section (or create a new section):
{
  label: 'Data',
  items: [
    { to: '/items', icon: Package, label: 'Items' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },  // ← Add
  ],
},
```

### 7. Rebuild

```bash
cd frontend && npm run build && cd ..
docker compose up -d --build
```

---

## Adding Plan-Gated Features

To restrict a route to Pro plan or higher:

File: `backend/src/routes/projects.ts`

```typescript
import { requirePlan } from '../middleware/requirePlan.js';

// This endpoint requires Pro plan
router.post('/export', requireAuth, requirePlan('pro'), async (req, res) => {
  // Only accessible to orgs on Pro or Enterprise plan
});
```

Available plans (in order): `standard`, `pro`, `enterprise`.

---

## Adding API Key Authentication

For public API endpoints that use API keys instead of JWT:

File: `backend/src/routes/projects.ts`

```typescript
import { requireApiKey } from '../middleware/requireApiKey.js';

// Public API endpoint using X-API-Key header
router.get('/v1/projects', requireApiKey('read'), async (req, res) => {
  const orgId = (req as any).orgId;  // Set by requireApiKey middleware
  // ... query projects by orgId
});
```

---

## Adding Admin Pages

### Backend

File: `backend/src/routes/admin/projects.ts` (new file)

```typescript
import { Router } from 'express';
import pool from '../../db/pool.js';
import { requirePlatformAdmin } from '../../middleware/requirePlatformAdmin.js';

const router = Router();

router.get('/', requirePlatformAdmin, async (_req, res) => {
  const result = await pool.query(`
    SELECT p.*, o.name AS org_name
    FROM projects p
    LEFT JOIN organisations o ON o.id = p.org_id
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
  res.json({ projects: result.rows });
});

export default router;
```

Register in `backend/src/index.ts`:

```typescript
import adminProjectRoutes from './routes/admin/projects.js';
app.use('/api/admin/projects', adminProjectRoutes);
```

### Frontend

Create `frontend/src/pages/admin/AdminProjectsPage.tsx`, add to router under AdminLayout, and add to the `adminNavSections` in `frontend/src/layouts/AdminLayout.tsx`.

---

## Adding Email Templates

File: `backend/src/services/email.ts`

Add a new export function following the existing pattern:

```typescript
export async function sendProjectInviteEmail(to: string, projectName: string): Promise<void> {
  const accent = APP_CONFIG.accentColor;

  await resend.emails.send({
    from: `${APP_CONFIG.emailFromName} <${APP_CONFIG.emailFrom}>`,
    to,
    subject: `You've been added to ${projectName} on ${APP_CONFIG.name}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 1.5rem; color: #e4e4e7;">
          <span style="color: ${accent};">${APP_CONFIG.name}</span>
        </h1>
        <p style="color: #8b8d98;">You've been added to the project "${projectName}".</p>
        <hr style="border: none; border-top: 1px solid #2a2d3a; margin: 2rem 0;" />
        <p style="color: #8b8d98; font-size: 0.75rem;">${APP_CONFIG.name} — ${APP_CONFIG.tagline}</p>
      </div>
    `,
  });
}
```

---

## Adding Background Jobs

File: `backend/src/services/scheduler.ts`

Add your job to the `runJobs()` function:

```typescript
import { checkStaleProjects } from './project-maintenance.js';

async function runJobs(): Promise<void> {
  try {
    await checkExpiredTrials();
    await checkExpiredGrace();
    await checkStaleProjects();  // ← Add your job
    logger.debug('[SCHEDULER] All jobs completed');
  } catch (err) {
    logger.error('[SCHEDULER] Error running jobs:', err);
  }
}
```

---

## Adding New Billing Plans

### Backend

File: `backend/src/middleware/requirePlan.ts`

The plan hierarchy is defined in `TIER_RANK`:

```typescript
const TIER_RANK: Record<string, number> = { standard: 1, pro: 2, enterprise: 3 };
```

To add a new plan (e.g. `starter`), insert it with the appropriate rank:

```typescript
const TIER_RANK: Record<string, number> = { starter: 0, standard: 1, pro: 2, enterprise: 3 };
```

### Stripe

Create corresponding Products and Prices in your Stripe dashboard, then reference the price IDs in your checkout flow.

---

## Checklist: New Entity

- [ ] Add table to `backend/src/db/pool.ts` with `org_id` column
- [ ] Add index on `org_id`
- [ ] Create route file in `backend/src/routes/`
- [ ] Register route in `backend/src/index.ts`
- [ ] Create list page in `frontend/src/pages/`
- [ ] Create detail page in `frontend/src/pages/`
- [ ] Add routes to `frontend/src/router.tsx`
- [ ] Add sidebar item to `frontend/src/components/Sidebar.tsx`
- [ ] Rebuild: `cd frontend && npm run build && cd .. && docker compose up -d --build`

---

## Next Steps

- [API Reference](API-REFERENCE.md) — Endpoint documentation
- [Architecture](ARCHITECTURE.md) — System design details
- [Deployment Guide](DEPLOYMENT-GUIDE.md) — Go to production
