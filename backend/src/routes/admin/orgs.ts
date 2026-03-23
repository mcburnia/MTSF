/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { Router, Request, Response } from 'express';
import pool from '../../db/pool.js';
import { requirePlatformAdmin } from '../../middleware/requirePlatformAdmin.js';

const router = Router();

// GET /api/admin/orgs — List all organisations
router.get('/', requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT o.*, b.status AS billing_status, b.plan, b.exempt, b.seat_count,
             (SELECT COUNT(*) FROM users WHERE org_id = o.id) AS member_count
      FROM organisations o
      LEFT JOIN org_billing b ON b.org_id = o.id
      ORDER BY o.created_at DESC
    `);

    res.json({ orgs: result.rows });
  } catch (err) {
    console.error('Admin list orgs error:', err);
    res.status(500).json({ error: 'Failed to list organisations' });
  }
});

// PUT /api/admin/orgs/:id/billing — Update org billing (admin override)
router.put('/:id/billing', requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { status, plan, exempt, exemptReason } = req.body;

    await pool.query(
      `UPDATE org_billing SET
        status = COALESCE($1, status),
        plan = COALESCE($2, plan),
        exempt = COALESCE($3, exempt),
        exempt_reason = COALESCE($4, exempt_reason),
        updated_at = NOW()
      WHERE org_id = $5`,
      [status, plan, exempt, exemptReason, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Admin update billing error:', err);
    res.status(500).json({ error: 'Failed to update billing' });
  }
});

export default router;
