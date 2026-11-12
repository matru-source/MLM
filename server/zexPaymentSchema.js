export async function ensureZexPaymentSchema(sql) {
  await sql`ALTER TABLE zex_webhook_inbox ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE zex_webhook_inbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ`;
  await sql`ALTER TABLE zex_webhook_inbox ADD COLUMN IF NOT EXISTS last_error_code TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS zex_webhook_pending_idx ON zex_webhook_inbox(partner_id, next_attempt_at, sequence) WHERE processed=FALSE`;
  await sql`CREATE TABLE IF NOT EXISTS zex_payment_sales (
    partner_id TEXT NOT NULL, sale_id TEXT NOT NULL, member_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL, product_code TEXT NOT NULL, amount_minor BIGINT NOT NULL,
    refunded_minor BIGINT NOT NULL DEFAULT 0, currency TEXT NOT NULL, paid_at TIMESTAMPTZ NOT NULL,
    commission_eligible BOOLEAN NOT NULL, policy_version TEXT, PRIMARY KEY (partner_id, sale_id))`;
  await sql`ALTER TABLE zex_payment_sales ADD COLUMN IF NOT EXISTS event_sequence BIGINT`;
  await sql`ALTER TABLE zex_payment_sales ADD COLUMN IF NOT EXISTS sale_kind TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS zex_one_acquisition_per_member ON zex_payment_sales(partner_id, member_id) WHERE commission_eligible`;
  await sql`CREATE TABLE IF NOT EXISTS zex_payment_adjustments (
    partner_id TEXT NOT NULL, adjustment_id TEXT NOT NULL, sale_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL, reason TEXT NOT NULL, adjusted_at TIMESTAMPTZ,
    PRIMARY KEY (partner_id, adjustment_id))`;
  await sql`CREATE TABLE IF NOT EXISTS zex_commission_grants (
    partner_id TEXT NOT NULL, sale_id TEXT NOT NULL, transaction_id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL, original_minor BIGINT NOT NULL, reversed_minor BIGINT NOT NULL DEFAULT 0)`;
  await sql`CREATE TABLE IF NOT EXISTS zex_subscription_snapshots (
    partner_id TEXT NOT NULL, subscription_id TEXT NOT NULL, member_id TEXT NOT NULL,
    sequence BIGINT NOT NULL, snapshot JSONB NOT NULL, PRIMARY KEY(partner_id, subscription_id))`;
  await sql`CREATE TABLE IF NOT EXISTS zex_monitor_runs (
    partner_id TEXT PRIMARY KEY, last_attempt_at TIMESTAMPTZ NOT NULL,
    last_success_at TIMESTAMPTZ, last_error_code TEXT)`;
  await sql`ALTER TABLE zex_monitor_runs ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMPTZ`;
  await sql`CREATE TABLE IF NOT EXISTS zex_connect_intents (
    id TEXT PRIMARY KEY, partner_id TEXT NOT NULL, member_id TEXT NOT NULL,
    state_cipher TEXT NOT NULL, state_hash TEXT NOT NULL, create_key TEXT NOT NULL,
    complete_key TEXT NOT NULL, callback_url TEXT NOT NULL, status TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS zex_one_pending_connect_intent
    ON zex_connect_intents(partner_id,member_id) WHERE status='pending'`;
}
