import { Request } from 'express';
import pool from '../db/pool.js';

interface EventData {
  userId: string;
  email: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  acceptLanguage?: string;
  browserLanguage?: string;
  browserTimezone?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

export function extractRequestData(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || 'unknown';

  return {
    ipAddress,
    userAgent: req.headers['user-agent'] || '',
    acceptLanguage: req.headers['accept-language'] || '',
    referrer: req.headers.referer || req.headers.referrer || '',
  };
}

export async function recordEvent(data: EventData): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_events (user_id, email, event_type, ip_address, user_agent, accept_language, browser_language, browser_timezone, referrer, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.userId,
        data.email,
        data.eventType,
        data.ipAddress || null,
        data.userAgent || null,
        data.acceptLanguage || null,
        data.browserLanguage || null,
        data.browserTimezone || null,
        data.referrer || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  } catch (err) {
    console.error('[TELEMETRY] Failed to record event:', err);
  }
}
