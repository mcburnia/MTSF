/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import express from 'express';
import cors from 'cors';
import { initDb } from './db/pool.js';
import { requireActiveBilling } from './middleware/requireActiveBilling.js';
import { startScheduler } from './services/scheduler.js';
import { logger } from './utils/logger.js';

// Routes
import authRoutes from './routes/auth.js';
import orgRoutes from './routes/org.js';
import billingRoutes from './routes/billing.js';
import accountRoutes from './routes/account.js';
import healthRoutes from './routes/health.js';
import itemRoutes from './routes/items.js';
import adminDashboardRoutes from './routes/admin/dashboard.js';
import adminUserRoutes from './routes/admin/users.js';
import adminOrgRoutes from './routes/admin/orgs.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true,
}));

// ── Body parsing ──
// Capture raw body for Stripe webhook verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

// ── Global billing gate for write operations ──
// Skips: GET requests, auth, billing, admin, health
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') { next(); return; }

  const path = req.path.toLowerCase();
  if (
    path.startsWith('/auth') ||
    path.startsWith('/billing') ||
    path.startsWith('/admin') ||
    path.startsWith('/health')
  ) {
    next();
    return;
  }

  requireActiveBilling(req, res, next);
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/items', itemRoutes);

// Admin routes
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orgs', adminOrgRoutes);

// ── Start ──
async function start() {
  try {
    await initDb();
    logger.info('[DB] Database initialised');

    startScheduler();

    app.listen(PORT, () => {
      logger.info(`[SERVER] MTSF backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('[SERVER] SIGTERM received, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[SERVER] SIGINT received, shutting down');
  process.exit(0);
});
