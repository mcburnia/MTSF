import pool from '../db/pool.js';

/**
 * Record an activity log entry for audit trail purposes.
 * Non-blocking — failures are logged but don't propagate.
 */
export async function logActivity(
  orgId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  userId: string | null,
  beforeValue?: Record<string, unknown>,
  afterValue?: Record<string, unknown>,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO activity_log (org_id, entity_type, entity_id, action, user_id, before_value, after_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orgId,
        entityType,
        entityId,
        action,
        userId,
        beforeValue ? JSON.stringify(beforeValue) : null,
        afterValue ? JSON.stringify(afterValue) : null,
      ]
    );
  } catch (err) {
    console.error('[ACTIVITY-LOG] Failed to log activity:', err);
  }
}
