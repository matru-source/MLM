/**
 * Comprehensive Automated Test Suite: All Backend APIs
 * Directly tests every serverless endpoint in /api/
 * 1. /api/auth/send-otp
 * 2. /api/integrations/zex/status
 * 3. /api/integrations/zex/connect
 * 4. /api/integrations/zex/callback
 * 5. /api/integrations/zex/webhook
 */
import assert from 'assert';
import sendOtpHandler from '../api/auth/send-otp.js';
import statusHandler from '../api/integrations/zex/status.js';
import connectHandler from '../api/integrations/zex/connect.js';
import callbackHandler from '../api/integrations/zex/callback.js';
import webhookHandler from '../api/integrations/zex/webhook.js';
import { signZexWebhook } from '../src/lib/zexSecurity.js';

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE BACKEND API TEST SUITE');
console.log('====================================================\n');

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(text) {
      this.body = text;
      return this;
    },
    redirect(code, url) {
      this.statusCode = code;
      this.redirectUrl = url;
      return this;
    }
  };
  return res;
}

// ----------------------------------------------------
// 1. Test /api/auth/send-otp
// ----------------------------------------------------
console.log('1. Testing /api/auth/send-otp...');

// 1.A: Method not allowed
{
  const req = { method: 'GET' };
  const res = createMockResponse();
  await sendOtpHandler(req, res);
  assert.strictEqual(res.statusCode, 405, 'GET must return 405 Method Not Allowed');
}

// 1.B: Missing or invalid email
{
  const req = { method: 'POST', body: { email: 'invalid-email' } };
  const res = createMockResponse();
  await sendOtpHandler(req, res);
  assert.strictEqual(res.statusCode, 400, 'Invalid email must return 400 Bad Request');
}

// 1.C: Valid OTP request
{
  const req = { method: 'POST', body: { email: 'partner@cybershield.net', fullName: 'Test Partner' } };
  const res = createMockResponse();
  await sendOtpHandler(req, res);
  assert.strictEqual(res.statusCode, 200, 'Valid request must return 200 OK');
  assert.strictEqual(res.body.success, true, 'Response must confirm success: true');
  assert.strictEqual(res.body.otp, undefined, 'Must NEVER leak plaintext OTP in response');
  console.log('  ✓ /api/auth/send-otp passed all checks (405, 400, 200, no OTP leakage)');
}

// ----------------------------------------------------
// 2. Test /api/integrations/zex/status
// ----------------------------------------------------
console.log('\n2. Testing /api/integrations/zex/status...');

// 2.A: Missing member_id
{
  const req = { query: {} };
  const res = createMockResponse();
  await statusHandler(req, res);
  assert.strictEqual(res.statusCode, 400, 'Missing member_id must return 400');
}

// 2.B: Valid member_id
{
  const req = { query: { member_id: 'MEM_TEST_101' } };
  const res = createMockResponse();
  await statusHandler(req, res);
  assert.strictEqual(res.statusCode, 200, 'Valid member_id must return 200 OK');
  assert.strictEqual(res.body.ok, true, 'Must return ok: true');
  console.log('  ✓ /api/integrations/zex/status passed all checks (400, 200)');
}

// ----------------------------------------------------
// 3. Test /api/integrations/zex/connect
// ----------------------------------------------------
console.log('\n3. Testing /api/integrations/zex/connect...');

// 3.A: Method not allowed
{
  const req = { method: 'GET' };
  const res = createMockResponse();
  await connectHandler(req, res);
  assert.strictEqual(res.statusCode, 405, 'GET must return 405 Method Not Allowed');
}

// 3.B: Missing memberId
{
  const req = { method: 'POST', body: {} };
  const res = createMockResponse();
  await connectHandler(req, res);
  assert.strictEqual(res.statusCode, 400, 'Missing memberId must return 400');
}

// 3.C: Valid memberId
{
  const req = { method: 'POST', body: { memberId: 'MEM_TEST_101' } };
  const res = createMockResponse();
  await connectHandler(req, res);
  assert.strictEqual(res.statusCode, 200, 'Valid request must return 200 OK');
  assert.ok(res.body.connect_url, 'Must return a valid connect_url');
  console.log('  ✓ /api/integrations/zex/connect passed all checks (405, 400, 200 with connect_url)');
}

// ----------------------------------------------------
// 4. Test /api/integrations/zex/callback
// ----------------------------------------------------
console.log('\n4. Testing /api/integrations/zex/callback...');

// 4.A: Method not allowed
{
  const req = { method: 'POST' };
  const res = createMockResponse();
  await callbackHandler(req, res);
  assert.strictEqual(res.statusCode, 405, 'POST must return 405');
}

// 4.B: User cancellation
{
  const req = { method: 'GET', query: { error: 'access_denied' } };
  const res = createMockResponse();
  await callbackHandler(req, res);
  assert.strictEqual(res.statusCode, 303, 'Must redirect on user cancellation');
  assert.ok(res.redirectUrl.includes('connection=cancelled'), 'Redirect must include connection=cancelled');
}

// 4.C: Missing query parameters
{
  const req = { method: 'GET', query: {} };
  const res = createMockResponse();
  await callbackHandler(req, res);
  assert.strictEqual(res.statusCode, 400, 'Missing params must return 400');
  console.log('  ✓ /api/integrations/zex/callback passed all checks (405, 303 cancellation, 400 params)');
}

// ----------------------------------------------------
// 5. Test /api/integrations/zex/webhook
// ----------------------------------------------------
console.log('\n5. Testing /api/integrations/zex/webhook...');

// 5.A: Insecure secret detection
{
  process.env.MLM_WEBHOOK_SECRET = 'fixture-only-signing-secret-do-not-use-in-production';
  const req = { method: 'POST' };
  const res = createMockResponse();
  await webhookHandler(req, res);
  assert.strictEqual(res.statusCode, 503, 'Insecure secret must be rejected with 503 Service Unavailable');
}

// 5.B: Valid HMAC signed payload
{
  const privateSecret = 'a-very-secure-32-byte-secret-key-for-cybershield-2026';
  process.env.MLM_WEBHOOK_SECRET = privateSecret;
  process.env.MLM_PARTNER_ID = 'cybernetworking';

  const sampleEvent = {
    event_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    partner_id: 'cybernetworking',
    sequence: 2,
    type: 'sale.confirmed',
    external_member_id: 'MEM_TEST_101',
    occurred_at: new Date().toISOString(),
    version: 1,
    data: {
      sale_id: 'sale_automated_test_1',
      commission_eligible: false,
      amount_minor: 295000
    }
  };

  const rawBuffer = Buffer.from(JSON.stringify(sampleEvent), 'utf8');
  const { headers: signedHeaders } = signZexWebhook(sampleEvent, privateSecret);

  // Mock readable stream for bodyParser: false
  async function* generateStream() {
    yield rawBuffer;
  }
  const streamReq = generateStream();
  streamReq.method = 'POST';
  streamReq.headers = signedHeaders;

  const res = createMockResponse();
  await webhookHandler(streamReq, res);
  assert.strictEqual(res.statusCode, 200, 'HMAC signature must verify and return 200 OK');
  assert.strictEqual(res.body.ok, true, 'Response must confirm ok: true');
  console.log('  ✓ /api/integrations/zex/webhook passed all security checks (503 insecure secret, 200 HMAC verified)');
}

console.log('\n====================================================');
console.log('🎉 100% OF ALL BACKEND SERVERLESS APIS VERIFIED!');
console.log('====================================================\n');
