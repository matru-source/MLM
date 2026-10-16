import handler from '../api/db/sync.js';

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
  console.log('🧪 TESTING SERVERLESS /api/db/sync BRIDGE');
  console.log('==========================================');

  // Test 1: Full GET sync
  const getReq = { method: 'GET', query: {} };
  const getRes = createMockRes();
  await handler(getReq, getRes);

  if (getRes.statusCode === 200 && getRes.body.ok && getRes.body.data) {
    const { members, activations, payouts, orders, transactions } = getRes.body.data;
    console.log(`✓ 1. GET /api/db/sync succeeded with 200 OK!`);
    console.log(`     - Live Members in Neon DB: ${members.length}`);
    console.log(`     - Live Activations in Neon DB: ${activations.length}`);
    console.log(`     - Live Payout Requests in Neon DB: ${payouts.length}`);
    console.log(`     - Live Orders in Neon DB: ${orders.length}`);
    console.log(`     - Live Transactions in Neon DB: ${transactions.length}`);
  } else {
    throw new Error(`GET /api/db/sync failed: ${getRes.statusCode} ${JSON.stringify(getRes.body)}`);
  }

  // Test 2: Mutation test (Update KYC)
  const postReq = {
    method: 'POST',
    body: {
      action: 'update_kyc',
      memberId: 'mem_matru',
      kyc: { legal_name: 'Matru Prasad Panda', agreement_accepted: true, verification_status: 'verified' }
    }
  };
  const postRes = createMockRes();
  await handler(postReq, postRes);

  if (postRes.statusCode === 200 && postRes.body.ok) {
    console.log('✓ 2. POST /api/db/sync mutation (update_kyc) succeeded with 200 OK!');
  } else {
    throw new Error(`POST /api/db/sync failed: ${postRes.statusCode} ${JSON.stringify(postRes.body)}`);
  }

  console.log('==========================================');
  console.log('🎉 SERVERLESS DATABASE BRIDGE VERIFIED!');
}

run().catch(err => {
  console.error('❌ DB Sync API test failed:', err);
  process.exit(1);
});
