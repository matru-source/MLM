import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}
const sql = neon(match[1].trim());

async function resetCleanSlate() {
  console.log('🔄 STARTING COMPLETE DATABASE CLEAN SLATE RESET...');
  console.log('=================================================');

  // 1. Delete all activations
  try {
    const actRes = await sql`DELETE FROM activations;`;
    console.log('✓ Cleared all activations');
  } catch (err) {
    console.warn('Activations cleanup error:', err.message);
  }

  // 2. Delete all payout requests
  try {
    const payRes = await sql`DELETE FROM payout_requests;`;
    console.log('✓ Cleared all payout requests');
  } catch (err) {
    console.warn('Payout requests cleanup error:', err.message);
  }

  // 3. Delete all orders
  try {
    const ordRes = await sql`DELETE FROM orders;`;
    console.log('✓ Cleared all orders');
  } catch (err) {
    console.warn('Orders cleanup error:', err.message);
  }

  // 4. Delete all transactions
  try {
    const txRes = await sql`DELETE FROM transactions;`;
    console.log('✓ Cleared all transactions');
  } catch (err) {
    console.warn('Transactions cleanup error:', err.message);
  }

  // 5. Delete all registered members except the root genesis Head Office partner
  try {
    const memRes = await sql`DELETE FROM members WHERE id != 'mem_matru';`;
    console.log('✓ Deleted all registered members (test accounts, buyers, sponsors)');
  } catch (err) {
    console.warn('Members cleanup error:', err.message);
  }

  // 6. Reset or insert Head Office partner with clean system email (headoffice@cybershield.in)
  // so matruprasadpanda497@gmail.com and any user email is 100% free for new registration
  const headOffice = await sql`SELECT id FROM members WHERE id = 'mem_matru' LIMIT 1;`;
  if (headOffice.length > 0) {
    await sql`
      UPDATE members 
      SET 
        name = 'CyberShield Head Office',
        email = 'headoffice@cybershield.in',
        referral_code = 'CS123456',
        sponsor_member_id = NULL,
        sponsor_code = NULL,
        wallet_balance = 0,
        total_earnings = 0,
        seller_status = 'active',
        customer_status = 'active_subscriber',
        kyc_data = ${JSON.stringify({
          legal_name: 'CyberShield Head Office',
          pan: '',
          aadhaar: '',
          bank_name: '',
          bank_account_number: '',
          bank_ifsc: '',
          verification_status: 'verified',
          agreement_accepted: true,
          agreement_version: 'v2026.1',
          documents: {
            aadhaar: 'Verified',
            pan: 'Verified',
            addressProof: 'Verified',
            bankAccount: 'Verified'
          }
        })}
      WHERE id = 'mem_matru';
    `;
    console.log('✓ Reset Head Office partner (CS123456) with email headoffice@cybershield.in');
  } else {
    await sql`
      INSERT INTO members (
        id, name, email, phone, rank, cs_customer_id, 
        customer_status, seller_status, referral_code, 
        wallet_balance, total_earnings, kyc_data
      ) VALUES (
        'mem_matru', 'CyberShield Head Office', 'headoffice@cybershield.in', '+91 9876543210',
        'Head Office Partner', 'CS20261010',
        'active_subscriber', 'active', 'CS123456',
        0, 0,
        ${JSON.stringify({
          legal_name: 'CyberShield Head Office',
          pan: '',
          aadhaar: '',
          bank_name: '',
          bank_account_number: '',
          bank_ifsc: '',
          verification_status: 'verified',
          agreement_accepted: true,
          agreement_version: 'v2026.1',
          documents: {
            aadhaar: 'Verified',
            pan: 'Verified',
            addressProof: 'Verified',
            bankAccount: 'Verified'
          }
        })}
      );
    `;
    console.log('✓ Inserted fresh Head Office partner (CS123456) with email headoffice@cybershield.in');
  }

  console.log('\n=================================================');
  console.log('📊 DATABASE STATUS AFTER CLEAN SLATE RESET:');
  const remainingMembers = await sql`SELECT id, name, email, referral_code, seller_status, wallet_balance FROM members;`;
  console.table(remainingMembers);

  const remainingActivations = await sql`SELECT COUNT(*) FROM activations;`;
  console.log('Activations count:', remainingActivations[0].count);

  const remainingOrders = await sql`SELECT COUNT(*) FROM orders;`;
  console.log('Orders count:', remainingOrders[0].count);

  const remainingTransactions = await sql`SELECT COUNT(*) FROM transactions;`;
  console.log('Transactions count:', remainingTransactions[0].count);

  console.log('\n🎉 ALL REGISTERED EMAILS CLEARED! READY FOR FRESH REGISTRATION!');
}

resetCleanSlate().catch(console.error);
