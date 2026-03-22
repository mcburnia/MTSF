import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/health
router.get('/', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unreachable' });
  }
});

export default router;
