// Read-only production inventory. It never changes or prints secrets.
import { transaction } from '../server/database.js';

const inventory = await transaction(async sql => ({
  members: await sql`SELECT id,name,email,seller_status,customer_status,wallet_balance,total_earnings,created_at FROM members ORDER BY created_at`,
  links: await sql`SELECT partner_id,external_member_id,zex_user_id,status,linked_at FROM zex_account_links ORDER BY linked_at`,
  sales: await sql`SELECT partner_id,sale_id,member_id,product_code,amount_minor,paid_at,sale_kind FROM zex_payment_sales ORDER BY paid_at`,
  inbox: await sql`SELECT partner_id,event_id,event_type,processed,attempts,created_at FROM zex_webhook_inbox ORDER BY created_at`,
  orders: await sql`SELECT order_id,buyer_member_id,product_code,total_amount,payment_status,created_at FROM orders ORDER BY created_at`,
  commissions: await sql`SELECT partner_id,sale_id,member_id,original_minor,reversed_minor FROM zex_commission_grants`,
  transactions: await sql`SELECT id,member_id,description,amount,type,status,created_at FROM transactions ORDER BY created_at`,
  extraColumns: await sql`SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('activations','zex_sales','payout_requests','kyc_documents','auth_challenges','zex_connect_intents')
    ORDER BY table_name,ordinal_position`,
  activationRecords: await sql`SELECT id,member_id,status,amount_paid,total_paid,payment_ref,requested_at,approved_at FROM activations ORDER BY requested_at`,
  legacyZexSales: await sql`SELECT sale_id,external_member_id,amount_minor,processed,paid_at FROM zex_sales ORDER BY created_at`,
  payoutRecords: await sql`SELECT id,member_id,amount,status,requested_at,processed_at FROM payout_requests ORDER BY requested_at`,
  kycDocuments: await sql`SELECT member_id,doc_key,status,created_at FROM kyc_documents ORDER BY created_at`,
  zexConnectAttempts: await sql`SELECT member_id,status,expires_at,created_at FROM zex_connect_attempts ORDER BY created_at`,
  auditLogCount: await sql`SELECT count(*)::int AS count FROM audit_logs`,
  challengeCount: await sql`SELECT count(*)::int AS count FROM auth_challenges`,
  connectIntents: await sql`SELECT id,member_id,status,expires_at,created_at FROM zex_connect_intents ORDER BY created_at`,
  subscriptions: await sql`SELECT partner_id,subscription_id,member_id,sequence FROM zex_subscription_snapshots`,
  checkpoint: await sql`SELECT partner_id,last_cursor,updated_at FROM zex_recovery_checkpoints`,
  monitoring: await sql`SELECT partner_id,last_attempt_at,last_success_at,last_error_code FROM zex_monitor_runs`,
  tables: await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
}));

console.log(JSON.stringify(inventory, null, 2));
