import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function enhance() {
  console.log('Upgrading Neon database schema to fully support all frontend features...');

  // 1. members columns
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar VARCHAR;`;

  // 2. activations columns
  await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`;

  // 3. orders columns
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cs_order_id VARCHAR;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name VARCHAR;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'INR';`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'paid';`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS activated_by VARCHAR;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS activation_date VARCHAR;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS next_renewal VARCHAR;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS account1_mlm JSONB;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS account2_software JSONB;`;

  // 4. payout_requests columns
  await sql`ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS member_email VARCHAR;`;
  await sql`ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS avatar VARCHAR;`;
  await sql`ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS bank_details JSONB;`;
  await sql`ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS admin_payment JSONB;`;

  // 5. transactions columns
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payout_id VARCHAR;`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS utr_number VARCHAR;`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;`;

  console.log('Database schema successfully upgraded with all columns!');
}

enhance().catch(console.error);
