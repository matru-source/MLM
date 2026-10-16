/**
 * Test Suite: Backend & API Issues (P2)
 * 1. Serverless Database Dependency: Ensure ZEX integration never crashes with 500 when DATABASE_URL is missing in Vercel.
 * 2. Guessable Webhook Secret: Ensure API rejects missing webhook secrets and public fixture passwords.
 */
import assert from 'assert';
import { 
  createConnectAttempt, 
  completeConnectAttempt, 
  getMemberZexStatus, 
  processVerifiedWebhook 
} from '../src/services/zexIntegrationService.js';
import { signZexWebhook, verifyZexWebhook } from '../src/lib/zexSecurity.js';
import webhookHandler from '../api/integrations/zex/webhook.js';
import statusHandler from '../api/integrations/zex/status.js';
import connectHandler from '../api/integrations/zex/connect.js';

console.log('====================================================');
console.log('🧪 RUNNING TEST SUITE: BACKEND & API ISSUES (P2)');
console.log('====================================================\n');

// -------------------------------------------------------------------
// TEST 1: Serverless Database Dependency (DATABASE_URL missing)
// -------------------------------------------------------------------
console.log('TEST 1: Serverless Database Resilience (DATABASE_URL Missing)');

// Save real DATABASE_URL and deliberately unset it
const originalDbUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;

assert.strictEqual(process.env.DATABASE_URL, undefined, 'DATABASE_URL is confirmed unset');

// 1.A: Status check with missing DATABASE_URL
async function testStatusWithoutDb() {
  const req = { query: { member_id: 'test_member_123' } };
  let statusResult = null;
  const res = {
    status(code) {
      assert.strictEqual(code, 200, 'Status endpoint must return 200, NOT 500 when DATABASE_URL is missing');
      return {
        json(data) {
          statusResult = data;
        }
      };
    }
  };
  await statusHandler(req, res);
  assert.ok(statusResult.ok, 'Response must be ok: true');
  assert.strictEqual(statusResult.status.linked, false, 'Reports unlinked cleanly');
  console.log('  ✓ Verified /api/integrations/zex/status returns 200 (not 500) without DATABASE_URL');
}

// 1.B: Connect attempt with missing DATABASE_URL
async function testConnectWithoutDb() {
  const req = { method: 'POST', body: { memberId: 'test_member_123' } };
  let connectResult = null;
  const res = {
    status(code) {
      assert.strictEqual(code, 200, 'Connect endpoint must return 200, NOT 500 when DATABASE_URL is missing');
      return {
        json(data) {
          connectResult = data;
        }
      };
    }
  };
  await connectHandler(req, res);
  assert.ok(connectResult.ok, 'Response must be ok: true');
  assert.ok(connectResult.connect_url, 'Connect URL must be returned');
  assert.ok(connectResult.request_id, 'Request ID must be returned');
  console.log('  ✓ Verified /api/integrations/zex/connect returns 200 (not 500) without DATABASE_URL');
  return connectResult;
}

// 1.C: Connect service roundtrip in fallback mode
async function testConnectRoundtripWithoutDb() {
  const attempt = await createConnectAttempt({
    memberId: 'mem_fallback_user',
    callbackUrl: 'https://cybernetworking.vercel.app/api/integrations/zex/callback'
  });
  assert.ok(attempt.requestId, 'Generated requestId in fallback mode');
  assert.ok(attempt.connectUrl, 'Generated connectUrl in fallback mode');

  const complete = await completeConnectAttempt({
    requestId: attempt.requestId,
    code: 'zex_auth_code_999',
    state: attempt.state
  });
  assert.ok(complete.ok, 'Completed connection in fallback mode without 500');

  const status = await getMemberZexStatus('mem_fallback_user');
  assert.strictEqual(status.linked, true, 'Member status correctly retrieved from fallback store');
  console.log('  ✓ Verified full ZEX connection flow succeeds gracefully in fallback mode without DATABASE_URL');
}

// 1.D: Webhook processing without DATABASE_URL
async function testWebhookWithoutDb() {
  const sampleEvent = {
    event_id: '11111111-2222-3333-4444-555555555555',
    partner_id: 'cybernetworking',
    sequence: 1,
    type: 'sale.confirmed',
    external_member_id: 'mem_fallback_user',
    occurred_at: new Date().toISOString(),
    version: 1,
    data: { sale_id: 'sale_1', commission_eligible: true, amount_minor: 250000 }
  };

  const outcome = await processVerifiedWebhook(sampleEvent);
  assert.ok(outcome.ok, 'Webhook processed/buffered successfully without crashing');
  console.log('  ✓ Verified processVerifiedWebhook safely acknowledges webhook without DATABASE_URL');
}

await testStatusWithoutDb();
await testConnectWithoutDb();
await testConnectRoundtripWithoutDb();
await testWebhookWithoutDb();

// Restore DATABASE_URL
process.env.DATABASE_URL = originalDbUrl;


// -------------------------------------------------------------------
// TEST 2: Guessable Webhook Secret Protection
// -------------------------------------------------------------------
console.log('\nTEST 2: Guessable Webhook Secret Protection');

const PUBLIC_FIXTURE_SECRET = 'fixture-only-signing-secret-do-not-use-in-production';
const SECURE_TEST_SECRET = '9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef';

function mockReq(bodyBuffer, headers) {
  // Async iterator for getRawBody
  return {
    method: 'POST',
    headers,
    async *[Symbol.asyncIterator]() {
      yield bodyBuffer;
    }
  };
}

// 2.A: Request rejected when secret is missing
async function testMissingSecret() {
  delete process.env.MLM_WEBHOOK_SECRET;
  delete process.env.ZEX_WEBHOOK_SECRET;

  const req = { method: 'POST', headers: {} };
  let statusCode = null;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(data) {
          responseData = data;
        }
      };
    }
  };

  await webhookHandler(req, res);
  assert.strictEqual(statusCode, 503, 'Must return 503 when MLM_WEBHOOK_SECRET is missing');
  assert.strictEqual(responseData.error, 'Configuration Error');
  console.log('  ✓ Verified webhook endpoint refuses requests when secret is missing (503)');
}

// 2.B: Request rejected when secret is the public fixture string
async function testPublicFixtureSecretRejected() {
  process.env.MLM_WEBHOOK_SECRET = PUBLIC_FIXTURE_SECRET;

  const req = { method: 'POST', headers: {} };
  let statusCode = null;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(data) {
          responseData = data;
        }
      };
    }
  };

  await webhookHandler(req, res);
  assert.strictEqual(statusCode, 503, 'Must return 503 when MLM_WEBHOOK_SECRET is set to guessable public fixture');
  assert.strictEqual(responseData.error, 'Security Error');
  console.log('  ✓ Verified webhook endpoint refuses requests when guessable fixture secret is configured (503)');
}

// 2.C: Signature signed with old public fixture secret fails when a secure secret is configured
async function testForgedSignatureRejected() {
  process.env.MLM_WEBHOOK_SECRET = SECURE_TEST_SECRET;

  const eventPayload = {
    event_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    partner_id: 'cybernetworking',
    sequence: 1,
    type: 'sale.confirmed',
    external_member_id: 'mem_attacker',
    occurred_at: new Date().toISOString(),
    version: 1,
    data: { sale_id: 'forged_sale_999', commission_eligible: true, amount_minor: 9999999 }
  };
  const rawBody = Buffer.from(JSON.stringify(eventPayload));

  // Attacker signs using the leaked/guessable public fixture secret
  const { headers: forgedHeaders } = signZexWebhook(eventPayload, PUBLIC_FIXTURE_SECRET);

  const req = mockReq(rawBody, forgedHeaders);
  let statusCode = null;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(data) {
          responseData = data;
        }
      };
    }
  };

  await webhookHandler(req, res);
  assert.strictEqual(statusCode, 401, 'Must reject forged webhook signed with guessable secret (401 Unauthorized)');
  assert.strictEqual(responseData.error, 'Unauthorized');
  console.log('  ✓ Verified attacker signing with old public fixture secret is rejected (401)');
}

// 2.D: Legitimate signature signed with private secure secret succeeds
async function testAuthenticSignatureAccepted() {
  process.env.MLM_WEBHOOK_SECRET = SECURE_TEST_SECRET;

  const eventPayload = {
    event_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    partner_id: 'cybernetworking',
    sequence: 2,
    type: 'sale.confirmed',
    external_member_id: 'mem_valid_partner',
    occurred_at: new Date().toISOString(),
    version: 1,
    data: { sale_id: 'real_sale_101', commission_eligible: false, amount_minor: 250000 }
  };
  const rawBody = Buffer.from(JSON.stringify(eventPayload));

  // Authentic ZEX server signs with matching secure secret
  const { headers: validHeaders } = signZexWebhook(eventPayload, SECURE_TEST_SECRET);

  const req = mockReq(rawBody, validHeaders);
  let statusCode = null;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(data) {
          responseData = data;
        }
      };
    }
  };

  await webhookHandler(req, res);
  assert.strictEqual(statusCode, 200, 'Authentic webhook signed with secure secret must succeed (200 OK)');
  assert.strictEqual(responseData.ok, true);
  console.log('  ✓ Verified authentic webhook signed with private 256-bit secret is accepted (200 OK)');
}

await testMissingSecret();
await testPublicFixtureSecretRejected();
await testForgedSignatureRejected();
await testAuthenticSignatureAccepted();

console.log('\n====================================================');
console.log('🎉 ALL P2 BACKEND & API ISSUE TESTS PASSED!');
console.log('====================================================');
