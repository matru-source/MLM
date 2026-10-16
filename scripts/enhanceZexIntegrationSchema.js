import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set!');
  process.exit(1);
}

const sql = neon(dbUrl);

async function createZexTables() {
  console.log('--- 🚀 CREATING ZEX INTEGRATION TABLES IN NEON POSTGRESQL ---');

  // 1. zex_connect_attempts
  await sql`
    CREATE TABLE IF NOT EXISTS zex_connect_attempts (
      request_id VARCHAR(128) PRIMARY KEY,
      member_id VARCHAR(128) NOT NULL,
      state_hash VARCHAR(128) NOT NULL,
      complete_key VARCHAR(128) NOT NULL,
      status VARCHAR(32) DEFAULT 'pending',
      connect_url TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('✓ Created zex_connect_attempts table');

  // 2. zex_account_links
  await sql`
    CREATE TABLE IF NOT EXISTS zex_account_links (
      id SERIAL PRIMARY KEY,
      partner_id VARCHAR(64) NOT NULL DEFAULT 'cybernetworking',
      external_member_id VARCHAR(128) NOT NULL,
      zex_user_id VARCHAR(128) NOT NULL,
      linked_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(32) DEFAULT 'active',
      CONSTRAINT uq_partner_member UNIQUE (partner_id, external_member_id),
      CONSTRAINT uq_partner_zex_user UNIQUE (partner_id, zex_user_id)
    );
  `;
  console.log('✓ Created zex_account_links table');

  // 3. zex_webhook_inbox
  await sql`
    CREATE TABLE IF NOT EXISTS zex_webhook_inbox (
      id SERIAL PRIMARY KEY,
      partner_id VARCHAR(64) NOT NULL,
      event_id VARCHAR(128) NOT NULL,
      sequence BIGINT NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      payload JSONB NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_partner_event UNIQUE (partner_id, event_id)
    );
  `;
  console.log('✓ Created zex_webhook_inbox table');

  // 4. zex_sales
  await sql`
    CREATE TABLE IF NOT EXISTS zex_sales (
      id SERIAL PRIMARY KEY,
      partner_id VARCHAR(64) NOT NULL,
      sale_id VARCHAR(128) NOT NULL,
      subscription_id VARCHAR(128),
      external_member_id VARCHAR(128) NOT NULL,
      source VARCHAR(32) NOT NULL,
      amount_minor BIGINT NOT NULL,
      currency VARCHAR(8) DEFAULT 'INR',
      commission_eligible BOOLEAN DEFAULT FALSE,
      eligibility_reason VARCHAR(64),
      processed BOOLEAN DEFAULT FALSE,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_partner_sale UNIQUE (partner_id, sale_id)
    );
  `;
  console.log('✓ Created zex_sales table');

  // 5. zex_recovery_checkpoints
  await sql`
    CREATE TABLE IF NOT EXISTS zex_recovery_checkpoints (
      partner_id VARCHAR(64) PRIMARY KEY,
      last_cursor BIGINT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('✓ Created zex_recovery_checkpoints table');

  console.log('--- ✅ ZEX INTEGRATION DATABASE SCHEMA UPGRADE COMPLETE ---');
}

createZexTables().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
