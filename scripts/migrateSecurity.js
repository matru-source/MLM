import { transaction } from '../server/database.js';
import { ensureAuthTables } from '../server/verification.js';
import { ensureZexPaymentSchema } from '../server/zexPaymentSchema.js';

// Run explicitly against a backed-up database. Never seeds or deletes business data.
await transaction(async sql => {
  await ensureAuthTables(sql);
  await ensureZexPaymentSchema(sql);
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_key TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS transactions_source_key_idx ON transactions(source_key)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_email_normalized_idx ON members(LOWER(email))`;
}, { serialize: true });
console.log('Security migration completed.');
