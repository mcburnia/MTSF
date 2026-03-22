import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../utils/token.js';

/**
 * Route-level authentication middleware.
 * Verifies JWT from Authorization header and attaches userId + email to request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifySessionToken(token);
    if (!payload?.userId) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    (req as any).userId = payload.userId;
    (req as any).email = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
