/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import pg from 'pg';

const { Pool } = pg;

let testPool: pg.Pool | null = null;

export function getTestPool(): pg.Pool {
  if (!testPool) {
    testPool = new Pool({
      connectionString: process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/mtsf_test'),
      max: 3,
    });
  }
  return testPool;
}
