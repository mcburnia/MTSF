/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getOrCreateBilling } from '../services/billing.js';

const router = Router();

/** Helper: get the org_id for a user. */
async function getUserOrgId(userId: string): Promise<string | null> {
  const result = await pool.query('SELECT org_id FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.org_id || null;
}

// POST /api/org — Create organisation
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, country, companySize, industry } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Organisation name is required' });
      return;
    }

    // Check user doesn't already have an org
    const existingOrg = await getUserOrgId(userId);
    if (existingOrg) {
      res.status(409).json({ error: 'You already belong to an organisation' });
      return;
    }

    // Create org in Postgres
    const orgResult = await pool.query(
      `INSERT INTO organisations (name, country, company_size, industry)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, country || null, companySize || null, industry || null]
    );
    const orgId = orgResult.rows[0].id;

    // Link user to org as admin
    await pool.query(
      'UPDATE users SET org_id = $1, org_role = $2, updated_at = NOW() WHERE id = $3',
      [orgId, 'admin', userId]
    );

    // Initialise billing record
    await getOrCreateBilling(orgId);

    res.status(201).json({ id: orgId, name });
  } catch (err) {
    console.error('Create org error:', err);
    res.status(500).json({ error: 'Failed to create organisation' });
  }
});

// GET /api/org — Get current user's organisation
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);

    if (!orgId) {
      res.status(404).json({ error: 'No organisation found' });
      return;
    }

    const result = await pool.query('SELECT * FROM organisations WHERE id = $1', [orgId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Organisation not found' });
      return;
    }

    const org = result.rows[0];
    res.json({
      id: org.id,
      name: org.name,
      country: org.country,
      companySize: org.company_size,
      industry: org.industry,
    });
  } catch (err) {
    console.error('Get org error:', err);
    res.status(500).json({ error: 'Failed to fetch organisation' });
  }
});

// PUT /api/org — Update organisation
router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);

    if (!orgId) {
      res.status(404).json({ error: 'No organisation found' });
      return;
    }

    // Only admins can update
    const userResult = await pool.query('SELECT org_role FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.org_role !== 'admin') {
      res.status(403).json({ error: 'Only organisation admins can update settings' });
      return;
    }

    const { name, country, companySize, industry } = req.body;

    await pool.query(
      `UPDATE organisations SET
        name = COALESCE($1, name),
        country = COALESCE($2, country),
        company_size = COALESCE($3, company_size),
        industry = COALESCE($4, industry),
        updated_at = NOW()
      WHERE id = $5`,
      [name, country, companySize, industry, orgId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update org error:', err);
    res.status(500).json({ error: 'Failed to update organisation' });
  }
});

// GET /api/org/members — List org members
router.get('/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);

    if (!orgId) {
      res.status(404).json({ error: 'No organisation found' });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, org_role, is_platform_admin, suspended_at, created_at
       FROM users WHERE org_id = $1 ORDER BY created_at ASC`,
      [orgId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

export default router;
