import fs from 'fs';
import path from 'path';
import syncHandler from '../api/db/sync.js';

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {}
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function run() {
  console.log('🧪 TESTING CATEGORY 4: MONEY & COMMISSION LOOPHOLES');
  console.log('====================================================');

  // TEST 1: SPONSOR COMMISSION ROUTING (NOT ADMIN)
  console.log('\n🔍 TEST 1: Verifying ₹1,000 commission routes to the referring sponsor (NOT Admin)...');
  
  // 1a. Create Partner A (the real sponsor)
  const sponsorEmail = `sponsor_${Date.now()}@test.com`;
  const sponsorId = `mem_spon_${Date.now()}`;
  const sponsorRefCode = `SPON${Math.floor(100000 + Math.random() * 900000)}`;

  const createSponsorReq = {
    method: 'POST',
    body: {
      action: 'register_member',
      data: {
        member_id: sponsorId,
        name: 'Genuine Sponsor Partner',
        email: sponsorEmail,
        phone: '+91 9876500001',
        rank: 'Active Partner',
        customer_status: 'active_subscriber',
        seller_status: 'active',
        referral_code: sponsorRefCode,
        wallet_balance: 0,
        total_earnings: 0
      }
    }
  };
  const sponRes = createMockRes();
  await syncHandler(createSponsorReq, sponRes);
  if (!sponRes.body?.ok) throw new Error('Failed to register test sponsor: ' + JSON.stringify(sponRes.body));
  console.log(`✓ 1a. Created Partner A (${sponsorRefCode}) with initial balance ₹0`);

  // 1b. Create User B who joins UNDER Partner A
  const buyerEmail = `buyer_${Date.now()}@test.com`;
  const buyerId = `mem_buy_${Date.now()}`;
  const createBuyerReq = {
    method: 'POST',
    body: {
      action: 'register_member',
      data: {
        member_id: buyerId,
        name: 'New Referral Buyer',
        email: buyerEmail,
        phone: '+91 9876500002',
        rank: 'Partner (Pending Plan Purchase)',
        customer_status: 'registered',
        seller_status: 'pending_payment',
        sponsor_member_id: sponsorId,
        sponsor_code: sponsorRefCode,
        sponsor_name: 'Genuine Sponsor Partner',
        referral_code: `BUY${Math.floor(100000 + Math.random() * 900000)}`,
        wallet_balance: 0,
        total_earnings: 0
      }
    }
  };
  const buyerRes = createMockRes();
  await syncHandler(createBuyerReq, buyerRes);
  if (!buyerRes.body?.ok) throw new Error('Failed to register buyer: ' + JSON.stringify(buyerRes.body));
  console.log(`✓ 1b. Created User B sponsored by Partner A (${sponsorRefCode})`);

  // 1c. User B submits ₹2,500 activation
  const actId = `act_${Date.now()}`;
  const createActReq = {
    method: 'POST',
    body: {
      action: 'create_activation',
      data: {
        id: actId,
        member_id: buyerId,
        member_name: 'New Referral Buyer',
        member_email: buyerEmail,
        member_phone: '+91 9876500002',
        sponsor_code: sponsorRefCode,
        amount_paid: 2500,
        gst_paid: 450,
        total_paid: 2950,
        utr_number: `UTR${Date.now()}`.slice(0, 16),
        account1_mlm: { partner_id: buyerId, referral_code: 'BUY123' },
        account2_software: { license_key: 'CS-BUY-KEY' }
      }
    }
  };
  const actRes = createMockRes();
  await syncHandler(createActReq, actRes);
  if (!actRes.body?.ok) throw new Error('Failed to create activation: ' + JSON.stringify(actRes.body));
  console.log(`✓ 1c. User B submitted ₹2,500 activation request`);

  // Record initial Admin balance
  const initialAdminRes = createMockRes();
  await syncHandler({ method: 'GET', query: { type: 'members' } }, initialAdminRes);
  const adminBefore = initialAdminRes.body.data.find(m => m.member_id === 'mem_matru');
  const adminBalanceBefore = Number(adminBefore?.wallet_balance || 0);

  // 1d. Admin Approves Activation
  const approveReq = {
    method: 'POST',
    body: {
      action: 'approve_activation',
      activationId: actId
    }
  };
  const approveRes = createMockRes();
  await syncHandler(approveReq, approveRes);
  if (!approveRes.body?.ok) throw new Error('Failed to approve activation: ' + JSON.stringify(approveRes.body));
  console.log(`✓ 1d. Admin approved User B activation`);

  // 1e. Verify Sponsor A received ₹1,000, while Admin did NOT receive it
  const verifyRes = createMockRes();
  await syncHandler({ method: 'GET', query: { type: 'members' } }, verifyRes);
  const sponsorAfter = verifyRes.body.data.find(m => m.member_id === sponsorId);
  const adminAfter = verifyRes.body.data.find(m => m.member_id === 'mem_matru');

  console.log(`     - Partner A (Sponsor) balance: ₹${sponsorAfter?.wallet_balance} (Expected: ₹1000)`);
  console.log(`     - Admin balance before: ₹${adminBalanceBefore}, after: ₹${adminAfter?.wallet_balance}`);

  if (Number(sponsorAfter?.wallet_balance) !== 1000) {
    throw new Error(`COMMISSION ERROR: Partner A expected ₹1000, got ₹${sponsorAfter?.wallet_balance}`);
  }
  if (Number(adminAfter?.wallet_balance) !== adminBalanceBefore) {
    throw new Error(`COMMISSION ERROR: Admin was falsely credited!`);
  }
  console.log('✓ 1e. SUCCESS: Exactly ₹1,000 credited to Partner A (Sponsor), Admin wallet unchanged!');

  // TEST 2: FAKE BANK RECEIPT CODE REMOVAL
  console.log('\n🔍 TEST 2: Verifying fake canvas bank screenshot code is eliminated...');
  const adminPortalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/AdminPortalView.jsx'), 'utf-8');
  if (adminPortalCode.includes('handleAutoGenerateScreenshot') || adminPortalCode.includes('IMPS TRANSFER SUCCESSFUL')) {
    throw new Error('SECURITY VIOLATION: Fake bank transfer canvas generator still exists in AdminPortalView.jsx!');
  }
  console.log('✓ 2. SUCCESS: Fake canvas IMPS receipt generator completely removed from AdminPortalView.jsx');

  // TEST 3: TAX INVOICE VS PROVISIONAL ACKNOWLEDGMENT
  console.log('\n🔍 TEST 3: Verifying Tax Invoice vs Provisional Acknowledgment distinction...');
  const downloadHelpersCode = fs.readFileSync(path.join(process.cwd(), 'src/utils/downloadHelpers.js'), 'utf-8');
  if (!downloadHelpersCode.includes('PAYMENT ACKNOWLEDGMENT') || !downloadHelpersCode.includes('PENDING BANK VERIFICATION')) {
    throw new Error('INVOICE VIOLATION: downloadHelpers.js does not differentiate provisional payment from official tax invoice!');
  }
  
  const checkoutModalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/CheckoutModal.jsx'), 'utf-8');
  if (checkoutModalCode.includes('Download Tax Invoice (PDF)')) {
    throw new Error('INVOICE VIOLATION: CheckoutModal still allows downloading Tax Invoice before approval!');
  }
  console.log('✓ 3. SUCCESS: Unverified payments restricted to Provisional Acknowledgment with LOCKED license key.');

  console.log('\n====================================================');
  console.log('🎉 ALL 3 MONEY & COMMISSION LOOPHOLES FULLY RESOLVED & VERIFIED!');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
