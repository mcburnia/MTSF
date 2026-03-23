/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { Request, Response } from 'express';
import pool from '../db/pool.js';
import { verifySessionToken } from '../utils/token.js';

/**
 * Global billing gate middleware for write operations.
 * Extracts JWT from Authorization header to identify the user/org,
 * then checks billing status. Blocks POST/PUT/DELETE when org is
 * in read_only, suspended, or cancelled state.
 *
 * Runs BEFORE per-route auth, so it peeks at the JWT independently.
 * Fails open on any error (doesn't block users due to billing check failures).
 */
export async function requireActiveBilling(req: Request, res: Response, next: Function) {
  let userId = (req as any).userId;

  if (!userId) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }
    try {
      const token = authHeader.split(' ')[1];
      const payload = verifySessionToken(token);
      if (payload?.userId) {
        userId = payload.userId;
      }
    } catch {
      next();
      return;
    }
  }

  if (!userId) {
    next();
    return;
  }

  try {
    const userResult = await pool.query('SELECT org_id FROM users WHERE id = $1', [userId]);
    const orgId = userResult.rows[0]?.org_id;
    if (!orgId) {
      next();
      return;
    }

    const billing = await pool.query(
      'SELECT status, exempt FROM org_billing WHERE org_id = $1',
      [orgId]
    );
    const row = billing.rows[0];

    if (!row || row.exempt) {
      next();
      return;
    }

    const status = row.status;

    if (['trial', 'active', 'past_due'].includes(status)) {
      next();
      return;
    }

    if (status === 'read_only') {
      res.status(403).json({
        error: 'billing_restricted',
        status: 'read_only',
        message: 'Your account is in read-only mode due to a billing issue. Please update your payment method to restore full access.',
      });
      return;
    }

    if (status === 'suspended') {
      res.status(403).json({
        error: 'billing_restricted',
        status: 'suspended',
        message: 'Your account has been suspended due to non-payment. Please contact support or update your payment method.',
      });
      return;
    }

    if (status === 'cancelled') {
      res.status(403).json({
        error: 'billing_restricted',
        status: 'cancelled',
        message: 'Your subscription has been cancelled. Please resubscribe to restore access.',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[BILLING GATE] Error checking billing status:', err);
    next();
  }
}

export default requireActiveBilling;
