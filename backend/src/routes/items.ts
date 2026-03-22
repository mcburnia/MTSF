/**
 * Example CRUD entity: Items
 *
 * This is a sample route demonstrating the standard MTSF pattern for
 * org-scoped CRUD operations. Replace or extend this for your domain.
 */

import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logActivity } from '../services/activity-log.js';

const router = Router();

async function getUserOrgId(userId: string): Promise<string | null> {
  const result = await pool.query('SELECT org_id FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.org_id || null;
}

// GET /api/items — List items for the current org
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = await getUserOrgId((req as any).userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const result = await pool.query(
      `SELECT i.*, u.email AS created_by_email
       FROM items i
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.org_id = $1
       ORDER BY i.created_at DESC`,
      [orgId]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('List items error:', err);
    res.status(500).json({ error: 'Failed to list items' });
  }
});

// GET /api/items/:id — Get a single item
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = await getUserOrgId((req as any).userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const result = await pool.query(
      'SELECT * FROM items WHERE id = $1 AND org_id = $2',
      [req.params.id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/items — Create a new item
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const { name, description, status, metadata } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO items (org_id, name, description, status, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [orgId, name, description || null, status || 'active', metadata ? JSON.stringify(metadata) : '{}', userId]
    );

    await logActivity(orgId, 'item', result.rows[0].id, 'created', userId, undefined, { name, status: status || 'active' });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id — Update an item
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const { name, description, status, metadata } = req.body;

    // Fetch existing for audit trail
    const existing = await pool.query(
      'SELECT * FROM items WHERE id = $1 AND org_id = $2',
      [req.params.id, orgId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const result = await pool.query(
      `UPDATE items SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        metadata = COALESCE($4, metadata),
        updated_at = NOW()
      WHERE id = $5 AND org_id = $6 RETURNING *`,
      [name, description, status, metadata ? JSON.stringify(metadata) : null, req.params.id, orgId]
    );

    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await logActivity(orgId, 'item', itemId, 'updated', userId,
      { name: existing.rows[0].name, status: existing.rows[0].status },
      { name: result.rows[0].name, status: result.rows[0].status }
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id — Delete an item
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) { res.status(404).json({ error: 'No organisation found' }); return; }

    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 AND org_id = $2 RETURNING id, name',
      [req.params.id, orgId]
    );

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const deletedItemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await logActivity(orgId, 'item', deletedItemId, 'deleted', userId, { name: result.rows[0].name });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
