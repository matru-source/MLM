// One-off, targeted production cleanup for the two confirmed pre-launch test accounts.
// It deliberately preserves mem_matru, its KYC, and ZEX recovery/monitoring records.
import fs from 'node:fs/promises';
import path from 'node:path';
import { transaction } from '../server/database.js';

const APPLY = process.argv.includes('--apply');
const HEAD_OFFICE_ID = 'mem_matru';
const TEST_MEMBER_IDS = ['mem_MVQKHJTWIRCE8', 'mem_MVQPVMGWPU5ZG'];
const TEST_TRANSACTION_IDS = ['tx_act_1793105613798_4074_1', 'tx_reserve_1793105614257_7085'];

const result = await transaction(async sql => {
  const members = await sql`SELECT id,name,email,seller_status,customer_status FROM members WHERE id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]}) ORDER BY id`;
  const headOffice = await sql`SELECT id,wallet_balance,total_earnings FROM members WHERE id = ${HEAD_OFFICE_ID}`;
  const snapshot = {
    generated_at: new Date().toISOString(),
    members,
    head_office_before: headOffice,
    account_links: await sql`SELECT partner_id,external_member_id,zex_user_id,status FROM zex_account_links WHERE external_member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`,
    activations: await sql`SELECT id,member_id,status,total_paid,payment_ref FROM activations WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`,
    orders: await sql`SELECT order_id,buyer_member_id,product_code,total_amount,payment_status FROM orders WHERE buyer_member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`,
    transactions: await sql`SELECT id,member_id,amount,type,status FROM transactions WHERE id IN (${TEST_TRANSACTION_IDS[0]}, ${TEST_TRANSACTION_IDS[1]})`,
    counts: {
      connect_attempts: (await sql`SELECT count(*)::int AS value FROM zex_connect_attempts WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`)[0].value,
      connect_intents: (await sql`SELECT count(*)::int AS value FROM zex_connect_intents WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`)[0].value,
      kyc_documents: (await sql`SELECT count(*)::int AS value FROM kyc_documents WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`)[0].value,
      payout_requests: (await sql`SELECT count(*)::int AS value FROM payout_requests WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`)[0].value,
      audit_logs: (await sql`SELECT count(*)::int AS value FROM audit_logs WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`)[0].value
    }
  };

  if (!APPLY) return { mode: 'dry-run', snapshot };
  if (members.length !== 2 || headOffice.length !== 1) throw new Error('Expected cleanup accounts are not present; no changes made.');

  // Delete records that directly belong to either test member before deleting their accounts.
  await sql`DELETE FROM zex_connect_attempts WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM zex_connect_intents WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM zex_account_links WHERE external_member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM zex_subscription_snapshots WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM zex_payment_sales WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM zex_sales WHERE external_member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM kyc_documents WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM payout_requests WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM audit_logs WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM orders WHERE buyer_member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;
  await sql`DELETE FROM activations WHERE member_id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;

  // These two ledger rows came only from the old manual test activation.
  await sql`DELETE FROM transactions WHERE id IN (${TEST_TRANSACTION_IDS[0]}, ${TEST_TRANSACTION_IDS[1]})`;
  await sql`UPDATE members SET wallet_balance = 0, total_earnings = 0 WHERE id = ${HEAD_OFFICE_ID}`;
  await sql`DELETE FROM members WHERE id IN (${TEST_MEMBER_IDS[0]}, ${TEST_MEMBER_IDS[1]})`;

  return { mode: 'applied', snapshot };
}, { serialize: true });

const snapshotPath = path.join(process.cwd(), 'backups', `prelaunch-test-cleanup-${Date.now()}.json`);
await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
await fs.writeFile(snapshotPath, JSON.stringify(result.snapshot, null, 2), { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({ mode: result.mode, snapshot: snapshotPath, removed_test_members: result.snapshot.members.map(m => m.id), head_office_before: result.snapshot.head_office_before }, null, 2));
