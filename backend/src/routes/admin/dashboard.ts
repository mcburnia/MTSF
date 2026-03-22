import { Router, Request, Response } from 'express';
import pool from '../../db/pool.js';
import { requirePlatformAdmin } from '../../middleware/requirePlatformAdmin.js';

const router = Router();

// GET /api/admin/dashboard — Platform admin overview
router.get('/', requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const [users, orgs, billing] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM organisations'),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'trial') AS trial,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'past_due') AS past_due,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          COUNT(*) FILTER (WHERE exempt = TRUE) AS exempt
        FROM org_billing
      `),
    ]);

    res.json({
      totalUsers: parseInt(users.rows[0].count, 10),
      totalOrgs: parseInt(orgs.rows[0].count, 10),
      billing: billing.rows[0],
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
