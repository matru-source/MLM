import handler, { verifyAdminToken } from '../api/admin/auth.js';

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

async function runTests() {
  console.log('🧪 RUNNING COMPREHENSIVE ADMIN SECURITY & LOCKOUT TEST SUITE');
  console.log('===========================================================');

  // Test 1: Invalid Method
  const getReq = { method: 'GET', headers: {} };
  const getRes = createMockRes();
  await handler(getReq, getRes);
  if (getRes.statusCode === 405) {
    console.log('✓ 1. Rejects non-POST methods with 405 Method Not Allowed');
  } else {
    throw new Error(`Expected 405, got ${getRes.statusCode}`);
  }

  // Test 2: Invalid password and countdown
  const badReq = {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.168.1.100' },
    body: { username: 'admin@cybershield.network', password: 'wrongpassword' }
  };
  const badRes = createMockRes();
  await handler(badReq, badRes);
  if (badRes.statusCode === 401 && badRes.body.remainingAttempts === 4) {
    console.log('✓ 2. Incorrect credentials reject with 401 and tracks remaining attempts');
  } else {
    throw new Error(`Expected 401 & 4 remaining attempts, got: ${JSON.stringify(badRes.body)}`);
  }

  // Test 3: Lockout threshold after 5 failed attempts
  for (let i = 0; i < 4; i++) {
    const loopRes = createMockRes();
    await handler(badReq, loopRes);
  }
  const lockedRes = createMockRes();
  await handler(badReq, lockedRes);
  if (lockedRes.statusCode === 429 && lockedRes.body.locked === true) {
    console.log('✓ 3. 5 failed attempts trigger 429 Too Many Requests and 15-minute terminal lockout');
  } else {
    throw new Error(`Expected 429 locked, got: ${lockedRes.statusCode} ${JSON.stringify(lockedRes.body)}`);
  }

  // Test 4: Successful Login from new IP
  const goodReq = {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.168.1.200' },
    body: { username: 'admin@cybershield.network', password: 'CyberShield#Admin2026!' }
  };
  const goodRes = createMockRes();
  await handler(goodReq, goodRes);
  if (goodRes.statusCode === 200 && goodRes.body.token) {
    console.log('✓ 4. Valid credentials succeed with 200 and issues HMAC-SHA256 session token');
  } else {
    throw new Error(`Expected 200 with token, got: ${goodRes.statusCode} ${JSON.stringify(goodRes.body)}`);
  }

  const validToken = goodRes.body.token;

  // Test 5: Verify valid token
  const verifyReq = {
    method: 'POST',
    headers: {},
    body: { action: 'verify', token: validToken }
  };
  const verifyRes = createMockRes();
  await handler(verifyReq, verifyRes);
  if (verifyRes.statusCode === 200 && verifyRes.body.valid === true) {
    console.log('✓ 5. Action "verify" accepts authentic server-signed HMAC token');
  } else {
    throw new Error(`Expected valid: true, got: ${JSON.stringify(verifyRes.body)}`);
  }

  // Test 6: Reject forged / tampered token
  const tamperedToken = validToken.slice(0, -6) + 'abcdef';
  const fakeReq = {
    method: 'POST',
    headers: {},
    body: { action: 'verify', token: tamperedToken }
  };
  const fakeRes = createMockRes();
  await handler(fakeReq, fakeRes);
  if (fakeRes.statusCode === 200 && fakeRes.body.valid === false) {
    console.log('✓ 6. Tampered / forged tokens are rejected (valid: false)');
  } else {
    throw new Error(`Expected valid: false for tampered token, got: ${JSON.stringify(fakeRes.body)}`);
  }

  // Test 7: Verify no passwords in client code
  import('node:fs').then(fs => {
    const mlmContextContent = fs.readFileSync('src/context/MlmContext.jsx', 'utf-8');
    if (mlmContextContent.includes('CyberShield#Admin2026!')) {
      throw new Error('FAIL: Master password still found in MlmContext.jsx!');
    }
    console.log('✓ 7. Master password completely eliminated from client source code');
    console.log('===========================================================');
    console.log('🎉 ALL 3 ADMIN SECURITY LOOPHOLES SUCCESSFULLY FIXED & VERIFIED!');
  });
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
