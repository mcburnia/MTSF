/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
/**
 * Auth Rate Limiting Middleware
 *
 * In-memory IP-based rate limiting for authentication endpoints.
 * Prevents brute-force attacks on login, registration, and verification.
 */

import { Request, Response, NextFunction } from 'express';
import { APP_CONFIG } from '../config.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export const AUTH_RATE_LIMITS: Record<string, RateLimitConfig> = {
  login:          { maxAttempts: 5,  windowMs: 15 * 60 * 1000 },
  register:       { maxAttempts: 3,  windowMs: 60 * 60 * 1000 },
  verify:         { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  invite:         { maxAttempts: 5,  windowMs: 60 * 60 * 1000 },
  account_delete: { maxAttempts: 3,  windowMs: 60 * 60 * 1000 },
};

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const category = key.split(':')[0];
      const config = AUTH_RATE_LIMITS[category];
      if (config && now - entry.windowStart > config.windowMs) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function authRateLimit(category: string) {
  const config = AUTH_RATE_LIMITS[category];
  if (!config) {
    throw new Error(`Unknown auth rate limit category: ${category}`);
  }

  ensureCleanup();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting in test mode
    if (APP_CONFIG.testMode || APP_CONFIG.e2eMode) {
      next();
      return;
    }

    const ip = getClientIp(req);
    const key = `${category}:${ip}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now - entry.windowStart > config.windowMs) {
      store.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (entry.count >= config.maxAttempts) {
      res.status(429).json({
        error: 'Too many attempts. Please try again later.',
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

export function clearAuthRateLimits(): void {
  store.clear();
}
