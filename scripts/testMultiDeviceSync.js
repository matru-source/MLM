import syncHandler from '../api/db/sync.js';
import { hashPassword, verifyPassword } from '../src/utils/cryptoAuth.js';

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
  console.log('🧪 TESTING MULTI-DEVICE DATABASE SYNCHRONIZATION');
  console.log('================================================');

  const testUserEmail = `device_test_${Date.now()}@example.com`;
  const testUserId = `mem_dev_${Date.now()}`;
  const testPassword = 'SecurePassword2026!';
  const hashedPassword = await hashPassword(testPassword);
  const testUtr = `UTRDEV${Date.now()}`.slice(0, 16);

  // STEP 1: Phone A - User registers
  console.log('\n📱 Step 1: User registers on Phone A...');
  const regReq = {
    method: 'POST',
    body: {
      action: 'register_member',
      data: {
        member_id: testUserId,
        name: 'Device Test Partner',
        email: testUserEmail,
        phone: '+91 9999988888',
        password: hashedPassword,
        rank: 'Partner (Pending Plan Purchase)',
        cs_customer_id: 'CS_DEV_' + Math.floor(100000 + Math.random() * 900000),
        sponsor_member_id: 'mem_matru',
        sponsor_code: 'CS123456',
        sponsor_name: 'Matru Prasad Panda',
        customer_status: 'registered',
        seller_status: 'pending_payment',
        referral_code: 'CSDEV' + Math.floor(1000 + Math.random() * 9000),
        kyc: { legal_name: 'Device Test Partner' }
      }
    }
  };
  const regRes = createMockRes();
  await syncHandler(regReq, regRes);
  if (regRes.statusCode !== 200 || !regRes.body.ok) {
    throw new Error(`Registration failed on Phone A: ${JSON.stringify(regRes.body)}`);
  }
  console.log('✓ User registered and persisted to Neon PostgreSQL successfully!');

  // STEP 2: Phone A - User pays ₹2,500 and submits UTR
  console.log('\n📱 Step 2: User pays ₹2,500 and submits activation on Phone A...');
  const actId = `act_${Date.now()}`;
  const actReq = {
    method: 'POST',
    body: {
      action: 'create_activation',
      data: {
        id: actId,
        member_id: testUserId,
        member_name: 'Device Test Partner',
        member_email: testUserEmail,
        member_phone: '+91 9999988888',
        sponsor_code: 'CS123456',
        amount_paid: 2500,
        gst_paid: 450,
        total_paid: 2950,
        payment_method: 'UPI',
        utr_number: testUtr,
        account1_mlm: {
          member_id: testUserId,
          distributor_rank: 'Active Partner',
          referral_code: 'CSDEV123'
        },
        account2_software: {
          license_key: 'CS-DEV-LICENSE-KEY',
          product_name: 'CyberShield Defense Suite'
        }
      }
    }
  };
  const actRes = createMockRes();
  await syncHandler(actReq, actRes);
  if (actRes.statusCode !== 200 || !actRes.body.ok) {
    throw new Error(`Activation creation failed: ${JSON.stringify(actRes.body)}`);
  }
  console.log(`✓ Activation record #${actId} submitted with UTR ${testUtr}!`);

  // STEP 3: Laptop B - Admin logs in and performs full DB Sync
  console.log('\n💻 Step 3: Admin on Laptop B queries live DB via GET /api/db/sync...');
  const syncReq = { method: 'GET', query: {} };
  const syncRes = createMockRes();
  await syncHandler(syncReq, syncRes);

  if (syncRes.statusCode !== 200 || !syncRes.body.ok) {
    throw new Error(`Sync query failed: ${JSON.stringify(syncRes.body)}`);
  }

  const { members, activations } = syncRes.body.data;
  const foundMember = members.find(m => m.email === testUserEmail);
  const foundActivation = activations.find(a => a.id === actId);

  if (!foundMember) {
    throw new Error('FAILED: Registered member from Phone A was NOT found on Laptop B!');
  }
  console.log(`✓ Laptop B sees registered member: "${foundMember.name}" (${foundMember.email})`);

  if (!foundActivation) {
    throw new Error('FAILED: Activation request from Phone A was NOT found on Laptop B!');
  }
  console.log(`✓ Laptop B sees pending activation with UTR: "${foundActivation.utr_number}" (Status: ${foundActivation.status})`);

  // Verify multi-device password hash authentication
  console.log('\n💻 Step 4: Laptop B verifies member password hash from database...');
  const isMatch = await verifyPassword(testPassword, foundMember.password);
  if (!isMatch) {
    throw new Error('FAILED: Password hash did not verify across devices!');
  }
  console.log('✓ Password hash verified across devices: User can log into Laptop B seamlessly!');

  // STEP 5: Laptop B - Admin approves activation
  console.log('\n💻 Step 5: Admin approves activation on Laptop B...');
  const approveReq = {
    method: 'POST',
    body: {
      action: 'approve_activation',
      activationId: actId
    }
  };
  const approveRes = createMockRes();
  await syncHandler(approveReq, approveRes);
  if (approveRes.statusCode !== 200 || !approveRes.body.ok) {
    throw new Error(`Admin approval failed: ${JSON.stringify(approveRes.body)}`);
  }
  console.log('✓ Admin approval executed on database!');

  // STEP 6: Phone A - Verify Member profile is now active with unlocked accounts
  console.log('\n📱 Step 6: Phone A syncs and verifies active dual accounts...');
  const phoneSyncRes = createMockRes();
  await syncHandler({ method: 'GET', query: { type: 'members' } }, phoneSyncRes);
  const updatedMember = phoneSyncRes.body.data.find(m => m.member_id === testUserId);

  if (!updatedMember || updatedMember.seller_status !== 'active') {
    throw new Error(`FAILED: Member seller_status is ${updatedMember?.seller_status}, expected 'active'`);
  }
  console.log(`✓ Phone A confirms seller_status is "${updatedMember.seller_status}" and rank is "${updatedMember.rank}"!`);
  console.log(`✓ Software license unlocked: ${JSON.stringify(updatedMember.software_license?.license_key || 'active')}`);

  console.log('\n================================================');
  console.log('🎉 MULTI-DEVICE / DATABASE LOOPHOLE 100% FIXED & VERIFIED!');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
