import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
const sql = neon(match[1].trim());

async function run() {
  const members = await sql`SELECT id, name, email, sponsor_member_id, sponsor_code, referral_code, seller_status, wallet_balance, total_earnings FROM members;`;
  console.log('--- MEMBERS (' + members.length + ') ---');
  console.table(members);

  const txs = await sql`SELECT id, member_id, description, amount, type, created_at FROM transactions ORDER BY created_at DESC LIMIT 10;`;
  console.log('--- TRANSACTIONS (' + txs.length + ') ---');
  console.table(txs);
}

run().catch(console.error);
