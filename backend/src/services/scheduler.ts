import { checkExpiredTrials, checkExpiredGrace } from './billing.js';
import { logger } from '../utils/logger.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background scheduler.
 * Runs billing checks every hour.
 */
export function startScheduler(): void {
  if (intervalId) return;

  logger.info('[SCHEDULER] Starting background jobs (1h interval)');

  // Run immediately on startup
  runJobs();

  // Then every hour
  intervalId = setInterval(runJobs, 60 * 60 * 1000);
  if (intervalId.unref) intervalId.unref();
}

async function runJobs(): Promise<void> {
  try {
    await checkExpiredTrials();
    await checkExpiredGrace();
    logger.debug('[SCHEDULER] Billing checks completed');
  } catch (err) {
    logger.error('[SCHEDULER] Error running jobs:', err);
  }
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
