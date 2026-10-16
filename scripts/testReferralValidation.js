import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set in environment!');
  process.exit(1);
}

const sql = neon(dbUrl);

async function testReferralAndValidationScenarios() {
  console.log('--- 🧪 STARTING FORENSIC TEST: Referral Validation & Edge Cases ---');

  // Fetch all members from DB
  const members = await sql`
    SELECT id, name, email, phone, referral_code, seller_status, cs_customer_id
    FROM members;
  `;
  console.log(`Found ${members.length} members in live Neon database:`);
  members.forEach(m => {
    console.log(` - ID: ${m.id} | Name: ${m.name} | Referral: ${m.referral_code} | Seller Status: ${m.seller_status}`);
  });

  // 1. Test Non-existent Referral Code
  console.log('\n[TEST 1] Testing non-existent referral code: "NONEXISTENT_999"');
  const nonExistentMatch = members.find(m => 
    (m.referral_code && m.referral_code.toUpperCase() === 'NONEXISTENT_999') ||
    (m.id && m.id.toUpperCase() === 'NONEXISTENT_999')
  );
  console.log(`Match for NONEXISTENT_999:`, nonExistentMatch ? 'FOUND (ERROR)' : 'NOT FOUND (CORRECT: Invalid Code)');

  // 2. Test Active Valid Referral Code
  console.log('\n[TEST 2] Testing valid active referral code: "CS123456"');
  const validMatch = members.find(m => 
    (m.referral_code && m.referral_code.toUpperCase() === 'CS123456') ||
    (m.id && m.id.toUpperCase() === 'CS123456')
  );
  const isMatchActive = validMatch && (validMatch.seller_status === 'active' || validMatch.id === 'mem_matru');
  console.log(`Match for CS123456:`, validMatch ? `FOUND: ${validMatch.name} (Active: ${isMatchActive})` : 'NOT FOUND');

  // 3. Insert a temporary Unpaid / Pending user to test if their referral code can be used
  console.log('\n[TEST 3] Testing referral code of an UNPAID / PENDING user');
  const tempUnpaidId = 'mem_test_unpaid_' + Date.now();
  const tempUnpaidCode = 'CS-UNPD' + Math.floor(10 + Math.random() * 89);
  
  await sql`
    INSERT INTO members (
      id, name, email, phone, rank, cs_customer_id,
      sponsor_member_id, sponsor_code, sponsor_name,
      customer_status, seller_status, referral_code,
      wallet_balance, total_earnings, created_at
    ) VALUES (
      ${tempUnpaidId}, 'Unpaid Test Partner', 'unpaid@test.com', '9999900000',
      'Partner (Pending Plan Purchase)', 'CS999001',
      'mem_matru', 'CS123456', 'Matru Prasad Panda',
      'registered', 'pending_payment', ${tempUnpaidCode},
      0, 0, NOW()
    );
  `;
  console.log(`Created temp unpaid partner: ${tempUnpaidCode} with seller_status: 'pending_payment'`);

  // Check lookup for unpaid partner
  const unpaidMember = (await sql`SELECT * FROM members WHERE id = ${tempUnpaidId}`)[0];
  const canUnpaidRefer = unpaidMember.seller_status === 'active' || unpaidMember.id === 'mem_matru';
  console.log(`Lookup for ${tempUnpaidCode}: Found: ${unpaidMember.name} | Can Sponsor: ${canUnpaidRefer} (Should be FALSE)`);

  // Cleanup temp user
  await sql`DELETE FROM members WHERE id = ${tempUnpaidId};`;
  console.log('Cleaned up temp unpaid user.');

  console.log('\n--- 🧪 TEST COMPLETE ---');
}

testReferralAndValidationScenarios().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
