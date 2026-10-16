import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
const sql = neon(match[1].trim());

async function check() {
  const members = await sql`SELECT id, name, email, referral_code, sponsor_member_id, seller_status FROM members ORDER BY id;`;
  console.log(`--- ALL MEMBERS IN DB (${members.length}) ---`);
  console.table(members);

  const activations = await sql`SELECT id, member_id, member_name, status, utr_number FROM activations;`;
  console.log(`--- ALL ACTIVATIONS IN DB (${activations.length}) ---`);
  console.table(activations);

  const orders = await sql`SELECT id, order_number, buyer_name, buyer_email, amount, status FROM orders;`;
  console.log(`--- ALL ORDERS IN DB (${orders.length}) ---`);
  console.table(orders);
}

check().catch(console.error);
