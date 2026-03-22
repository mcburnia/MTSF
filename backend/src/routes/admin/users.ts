import { Router, Request, Response } from 'express';
import pool from '../../db/pool.js';
import { requirePlatformAdmin } from '../../middleware/requirePlatformAdmin.js';
import { generateVerificationToken } from '../../utils/token.js';
import { sendInviteEmail } from '../../services/email.js';

const router = Router();

// GET /api/admin/users — List all users
router.get('/', requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { filter, search } = req.query;

    let query = `
      SELECT u.id, u.email, u.org_id, u.org_role, u.is_platform_admin,
             u.email_verified, u.suspended_at, u.created_at,
             o.name AS org_name
      FROM users u
      LEFT JOIN organisations o ON o.id = u.org_id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search && typeof search === 'string') {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`LOWER(u.email) LIKE $${params.length}`);
    }

    if (filter === 'admins') conditions.push('u.is_platform_admin = TRUE');
    else if (filter === 'unverified') conditions.push('u.email_verified = FALSE');
    else if (filter === 'suspended') conditions.push('u.suspended_at IS NOT NULL');

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY u.created_at DESC LIMIT 200';

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /api/admin/users/invite — Invite a new user
router.post('/invite', requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { email, orgId, role } = req.body;
    const inviterId = (req as any).userId;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO users (email, verification_token, token_expires_at, org_id, org_role, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [email.toLowerCase(), token, expiresAt, orgId || null, role || 'member', inviterId]
    );

    const inviterResult = await pool.query('SELECT email FROM users WHERE id = $1', [inviterId]);
    const inviterEmail = inviterResult.rows[0]?.email || 'admin';

    await sendInviteEmail(email.toLowerCase(), token, inviterEmail);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Admin invite error:', err);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// PUT /api/admin/users/:id/suspend — Suspend/unsuspend a user
router.put('/:id/suspend', requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { suspend } = req.body;
    await pool.query(
      'UPDATE users SET suspended_at = $1, updated_at = NOW() WHERE id = $2',
      [suspend ? new Date() : null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin suspend error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/admin/users/:id/admin — Toggle platform admin
router.put('/:id/admin', requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { isAdmin } = req.body;
    const targetId = req.params.id;
    const currentUserId = (req as any).userId;

    if (targetId === currentUserId) {
      res.status(400).json({ error: 'Cannot change your own admin status' });
      return;
    }

    await pool.query(
      'UPDATE users SET is_platform_admin = $1, updated_at = NOW() WHERE id = $2',
      [!!isAdmin, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin toggle error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
