import pg from 'pg';
import { APP_CONFIG } from '../config.js';

const { Pool } = pg;

// Safety guard: prevent test backend from connecting to production DB
if (APP_CONFIG.testMode) {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('mtsf_test')) {
    console.error('FATAL: MTSF_TEST_MODE is true but DATABASE_URL does not point to mtsf_test');
    process.exit(1);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

/**
 * Initialise the database schema.
 * Creates all framework tables if they don't exist.
 * Uses IF NOT EXISTS for idempotent execution.
 */
export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── Users ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
        token_expires_at TIMESTAMPTZ,
        org_id UUID,
        org_role VARCHAR(50),
        is_platform_admin BOOLEAN DEFAULT FALSE,
        preferred_language VARCHAR(10),
        suspended_at TIMESTAMPTZ,
        invited_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Organisations ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS organisations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        country VARCHAR(100),
        company_size VARCHAR(50),
        industry VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Org Billing ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS org_billing (
        org_id UUID PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'trial',
        plan VARCHAR(20) DEFAULT 'standard',
        trial_ends_at TIMESTAMPTZ,
        grace_ends_at TIMESTAMPTZ,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        seat_count INT DEFAULT 1,
        monthly_amount_cents INT DEFAULT 0,
        exempt BOOLEAN DEFAULT FALSE,
        exempt_reason TEXT,
        billing_email VARCHAR(255),
        vat_number VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── User Events (telemetry / audit) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        email VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        accept_language TEXT,
        browser_language VARCHAR(20),
        browser_timezone VARCHAR(100),
        referrer TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── API Keys ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        key_prefix VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        scopes JSONB DEFAULT '[]'::jsonb,
        created_by UUID,
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Activity Log ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID,
        action VARCHAR(100) NOT NULL,
        user_id UUID,
        before_value JSONB,
        after_value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Billing Events ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        stripe_event_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Platform Settings ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Example: Items (sample CRUD entity) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Indexes ──
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON activity_log(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_items_org_id ON items(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_billing_events_org_id ON billing_events(org_id)`);

    console.log('[DB] Schema initialised successfully');
  } finally {
    client.release();
  }
}

export default pool;
