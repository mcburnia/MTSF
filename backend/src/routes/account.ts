import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const router = Router();

// GET /api/account — Get current user profile
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const result = await pool.query(
      'SELECT id, email, org_id, org_role, preferred_language, is_platform_admin, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      orgId: user.org_id,
      orgRole: user.org_role,
      preferredLanguage: user.preferred_language,
      isPlatformAdmin: user.is_platform_admin,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Get account error:', err);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// PUT /api/account/password — Change password
router.put('/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new passwords are required' });
      return;
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Validate new password strength
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isLongEnough = newPassword.length >= 8;

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial || !isLongEnough) {
      res.status(400).json({ error: 'New password does not meet strength requirements' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// PUT /api/account/preferences — Update preferences
router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { preferredLanguage } = req.body;

    await pool.query(
      'UPDATE users SET preferred_language = $1, updated_at = NOW() WHERE id = $2',
      [preferredLanguage || null, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
