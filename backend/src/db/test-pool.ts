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
