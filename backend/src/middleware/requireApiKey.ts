/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/api-keys.js';
import pool from '../db/pool.js';

export function requireApiKey(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    const result = await validateApiKey(apiKey);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    if (requiredScope && !result.scopes.includes(requiredScope)) {
      return res.status(403).json({ error: `Insufficient scope – requires ${requiredScope}` });
    }

    // Verify the org still has the required plan
    try {
      const billing = await pool.query(
        'SELECT plan, exempt FROM org_billing WHERE org_id = $1',
        [result.orgId]
      );
      const row = billing.rows[0];
      if (row && !row.exempt) {
        const plan = row.plan || 'standard';
        if (plan === 'standard') {
          return res.status(403).json({
            error: 'feature_requires_plan',
            requiredPlan: 'pro',
            currentPlan: plan,
            message: 'The API requires the Pro plan or higher.',
          });
        }
      }
    } catch (err) {
      console.error('[REQUIRE-API-KEY] Plan check error:', err);
    }

    (req as any).orgId = result.orgId;
    (req as any).apiKeyId = result.keyId;
    (req as any).apiKeyScopes = result.scopes;
    next();
  };
}
