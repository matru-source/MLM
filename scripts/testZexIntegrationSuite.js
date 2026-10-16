import fs from 'node:fs';

// Load .env if present
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { 
  hashState, 
  generateRandomState, 
  callbackStateMatches, 
  verifyZexWebhook, 
  signZexWebhook 
} from '../src/lib/zexSecurity.js';

import {
  createConnectAttempt,
  completeConnectAttempt,
  processVerifiedWebhook,
  getMemberZexStatus
} from '../src/services/zexIntegrationService.js';

import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

const sql = neon(process.env.DATABASE_URL);
const PARTNER_ID = process.env.MLM_PARTNER_ID || 'cybernetworking';
const WEBHOOK_SECRET = process.env.MLM_WEBHOOK_SECRET || 'fixture-only-signing-secret-do-not-use-in-production';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [${totalTests}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS [${totalTests}]: ${message}`);
}

async function runSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING ZEX <-> MLM INTEGRATION VERIFICATION SUITE');
  console.log('====================================================\n');

  // --- TEST 1: Cryptographic State Hashing ---
  console.log('--- TEST 1: State Generation & Constant-Time Validation ---');
  const rawState = generateRandomState();
  const hashed = hashState(rawState);
  assert(typeof rawState === 'string' && rawState.length > 20, 'Generated random state is sufficiently long');
  assert(hashed.length === 64, 'SHA-256 state hash is 64 hex characters');
  assert(callbackStateMatches(rawState, hashed), 'State matches its hash in constant time');
  assert(!callbackStateMatches(rawState + 'tampered', hashed), 'Tampered state correctly rejected');
  assert(!callbackStateMatches(rawState, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'), 'Random hash correctly rejected');

  // --- TEST 2: Connect Attempt Creation ---
  console.log('\n--- TEST 2: Start Connect Attempt in Neon Database ---');
  const testMemberId = 'mem_matru';
  const callbackUrl = 'https://cybernetworking.vercel.app/api/integrations/zex/callback';
  
  const attempt = await createConnectAttempt({
    memberId: testMemberId,
    callbackUrl
  });

  assert(attempt.requestId && attempt.requestId.length > 10, 'Connect attempt created with unique request_id');
  assert(attempt.connectUrl.includes(attempt.requestId), 'Connect URL embeds the request_id hash fragment');
  assert(new Date(attempt.expiresAt) > new Date(), 'Attempt expiry is in future (10m window)');

  const [dbAttempt] = await sql`
    SELECT * FROM zex_connect_attempts WHERE request_id = ${attempt.requestId} LIMIT 1;
  `;
  assert(dbAttempt !== undefined, 'Attempt row successfully persisted in zex_connect_attempts table');
  assert(dbAttempt.status === 'pending', 'Attempt initial status is "pending"');

  // --- TEST 3: CSRF State Mismatch Handling ---
  console.log('\n--- TEST 3: Callback Tampering / CSRF Rejection ---');
  const csrfResult = await completeConnectAttempt({
    requestId: attempt.requestId,
    code: 'zex_usr_attacker',
    state: 'invalid-csrf-token'
  });
  assert(!csrfResult.ok && csrfResult.status === 400, 'Invalid callback state rejected with 400');

  // --- TEST 4: Valid Callback Handshake & Immutable Link ---
  console.log('\n--- TEST 4: Valid Callback Handshake & Link Creation ---');
  const completeResult = await completeConnectAttempt({
    requestId: attempt.requestId,
    code: 'zex_usr_test_partner_001',
    state: attempt.state
  });
  assert(completeResult.ok === true, 'Valid callback handshake completes successfully');
  assert(completeResult.data.zex_user_id === 'zex_usr_test_partner_001', 'ZEX User ID stored in link result');

  const [updatedAttempt] = await sql`
    SELECT status FROM zex_connect_attempts WHERE request_id = ${attempt.requestId};
  `;
  assert(updatedAttempt.status === 'completed', 'Connect attempt status updated to "completed"');

  const statusCheck = await getMemberZexStatus(testMemberId);
  assert(statusCheck.linked === true, 'Member status query reflects linked: true');
  assert(statusCheck.data.zex_user_id === 'zex_usr_test_partner_001', 'Member status query returns matching zex_user_id');

  // --- TEST 5: Webhook HMAC-SHA256 Signature Verification ---
  console.log('\n--- TEST 5: Webhook Signature Verification ---');
  const sampleEvent = {
    event_id: randomUUID(),
    partner_id: PARTNER_ID,
    version: 1,
    sequence: 101,
    type: 'sale.confirmed',
    external_member_id: testMemberId,
    occurred_at: new Date().toISOString(),
    data: {
      sale_id: `sale_${randomUUID().slice(0, 8)}`,
      subscription_id: `sub_${randomUUID().slice(0, 8)}`,
      source: 'play',
      amount_minor: 250000,
      currency: 'INR',
      commission_eligible: true,
      eligibility_reason: 'eligible_first_acquisition',
      paid_at: new Date().toISOString()
    }
  };

  const signed = signZexWebhook(sampleEvent, WEBHOOK_SECRET);
  assert(signed.headers['X-Zex-Webhook-Signature'].startsWith('v1='), 'Signed webhook includes v1= HMAC signature');

  const verifiedEvent = verifyZexWebhook(signed.rawBody, signed.headers, WEBHOOK_SECRET, PARTNER_ID);
  assert(verifiedEvent.event_id === sampleEvent.event_id, 'Webhook signature successfully verified');

  // Tampered payload verification
  let tamperedCaught = false;
  try {
    const tamperedBody = Buffer.from(signed.rawBody.toString('utf8').replace('250000', '999999'));
    verifyZexWebhook(tamperedBody, signed.headers, WEBHOOK_SECRET, PARTNER_ID);
  } catch (err) {
    tamperedCaught = true;
  }
  assert(tamperedCaught === true, 'Tampered webhook payload rejected with signature mismatch');

  // Expired timestamp verification
  let expiredCaught = false;
  try {
    const oldHeaders = {
      ...signed.headers,
      'X-Zex-Webhook-Timestamp': String(Math.floor(Date.now() / 1000) - 600) // 10 minutes ago
    };
    verifyZexWebhook(signed.rawBody, oldHeaders, WEBHOOK_SECRET, PARTNER_ID);
  } catch (err) {
    expiredCaught = true;
  }
  assert(expiredCaught === true, 'Expired webhook timestamp (>300s) rejected');

  // --- TEST 6: Webhook Processing & Multi-Tier Upline Commission Distribution ---
  console.log('\n--- TEST 6: Webhook Processing & Commission Payout ---');
  // First, check initial wallet balance of sponsor
  const [buyerBefore] = await sql`SELECT sponsor_member_id, sponsor_code FROM members WHERE id = ${testMemberId} LIMIT 1;`;
  const sponsorCode = buyerBefore?.sponsor_member_id || buyerBefore?.sponsor_code;

  let sponsorInitialBalance = 0;
  if (sponsorCode) {
    const [sp] = await sql`SELECT wallet_balance FROM members WHERE referral_code = ${sponsorCode} OR id = ${sponsorCode} LIMIT 1;`;
    sponsorInitialBalance = Number(sp?.wallet_balance || 0);
  }

  const webhookResult = await processVerifiedWebhook(sampleEvent);
  assert(webhookResult.ok === true, 'processVerifiedWebhook succeeded');

  // Check zex_sales table
  const [recordedSale] = await sql`
    SELECT * FROM zex_sales WHERE partner_id = ${PARTNER_ID} AND sale_id = ${sampleEvent.data.sale_id};
  `;
  assert(recordedSale !== undefined, 'Sale record saved in zex_sales table');
  assert(recordedSale.commission_eligible === true, 'Sale marked commission_eligible: true');

  // Check sponsor commission credit
  if (sponsorCode) {
    const [spAfter] = await sql`SELECT wallet_balance FROM members WHERE referral_code = ${sponsorCode} OR id = ${sponsorCode} LIMIT 1;`;
    const sponsorAfterBalance = Number(spAfter?.wallet_balance || 0);
    assert(sponsorAfterBalance === sponsorInitialBalance + 1000, `Direct sponsor wallet credited ₹1,000 (Before: ₹${sponsorInitialBalance}, After: ₹${sponsorAfterBalance})`);
  }

  // --- TEST 7: Idempotency (Duplicate Event Delivery) ---
  console.log('\n--- TEST 7: Idempotent Handling of Duplicate Webhook Delivery ---');
  const duplicateResult = await processVerifiedWebhook(sampleEvent);
  assert(duplicateResult.ok === true && duplicateResult.note?.includes('already processed'), 'Duplicate webhook safely ignored via idempotent inbox');

  // Verify wallet did NOT get credited twice
  if (sponsorCode) {
    const [spFinal] = await sql`SELECT wallet_balance FROM members WHERE referral_code = ${sponsorCode} OR id = ${sponsorCode} LIMIT 1;`;
    const sponsorFinalBalance = Number(spFinal?.wallet_balance || 0);
    assert(sponsorFinalBalance === sponsorInitialBalance + 1000, 'Duplicate webhook did NOT credit commission a second time');
  }

  // --- TEST 8: Sale Adjusted (Refund/Chargeback) ---
  console.log('\n--- TEST 8: Sale Adjusted Event (Refund Handling) ---');
  const adjustmentEvent = {
    event_id: randomUUID(),
    partner_id: PARTNER_ID,
    version: 1,
    sequence: 102,
    type: 'sale.adjusted',
    external_member_id: testMemberId,
    occurred_at: new Date().toISOString(),
    data: {
      sale_id: sampleEvent.data.sale_id,
      reason: 'refund_full'
    }
  };

  const adjResult = await processVerifiedWebhook(adjustmentEvent);
  assert(adjResult.ok === true, 'sale.adjusted event processed');

  const [adjustedSale] = await sql`
    SELECT commission_eligible FROM zex_sales WHERE partner_id = ${PARTNER_ID} AND sale_id = ${sampleEvent.data.sale_id};
  `;
  assert(adjustedSale.commission_eligible === false, 'Sale record updated to commission_eligible: false after refund adjustment');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:\n', err);
  process.exit(1);
});
