import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
const sql = neon(databaseUrl);

async function checkStatus() {
  const members = await sql`
    SELECT id, name, email, rank, referral_code, wallet_balance, total_earnings, customer_status, seller_status 
    FROM members
    ORDER BY created_at ASC;
  `;
  console.log(`\n=== NEON POSTGRESQL LIVE MEMBERS (${members.length}) ===`);
  console.table(members);

  const activations = await sql`
    SELECT id, member_name, member_email, amount_paid, payment_method, status, requested_at, approved_at
    FROM activations
    ORDER BY requested_at DESC;
  `;
  console.log(`\n=== NEON POSTGRESQL LIVE ACTIVATIONS (${activations.length}) ===`);
  console.table(activations);

  const payouts = await sql`
    SELECT id, member_name, amount, net_amount, status, utr_number, requested_at, processed_at
    FROM payout_requests
    ORDER BY requested_at DESC;
  `;
  console.log(`\n=== NEON POSTGRESQL LIVE PAYOUTS (${payouts.length}) ===`);
  console.table(payouts);
}

checkStatus().catch(console.error);
