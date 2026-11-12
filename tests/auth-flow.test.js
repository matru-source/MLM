import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createSendOtpHandler } from '../api/auth/send-otp.js';
import { createVerifyOtpHandler } from '../api/auth/verify-otp.js';
import { createMemberHandler } from '../api/auth/member.js';
import { createAdminHandler } from '../api/admin/auth.js';
import { hashPassword } from '../server/security.js';

test('email verification, password reset and login use server-owned state', async () => {
  process.env.AUTH_SECRET = 'test-only-auth-secret-that-is-long-enough';
  process.env.BREVO_API_KEY = 'fixture-email-key';
  process.env.BREVO_SENDER_EMAIL = 'sender@example.test';
  process.env.ADMIN_USERNAME = 'fixture-admin';
  process.env.ADMIN_PASSWORD = 'fixture-admin-password';
  delete process.env.PORTAL_ORIGIN;
  const db = new PGlite();
  const originalFetch = globalThis.fetch;
  try {
    const run = work => db.transaction(tx => work(async (parts, ...values) => {
      const text = parts.reduce((s, part, i) => s + (i ? '$' + i : '') + part, '');
      return (await tx.query(text, values)).rows;
    }));
    await db.exec('CREATE TABLE members (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, password TEXT, kyc_data JSONB)');
    await db.query('INSERT INTO members (id,email,name,password) VALUES ($1,$2,$3,$4)', ['a', 'a@example.test', 'A', hashPassword('original-password')]);
    const send = createSendOtpHandler(run);
    const verify = createVerifyOtpHandler(run);
    const member = createMemberHandler(run);
    const admin = createAdminHandler(run);
    const cookies = {};
    const call = async (handler, body) => {
      const res = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, setHeader(k,v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, json(body) { this.body = body; return this; } };
      await handler({ method: 'POST', headers: { host: 'localhost', cookie: Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ') }, body }, res);
      for (const entry of res.headers['Set-Cookie'] || []) { const [name, value] = entry.split(';')[0].split('='); cookies[name] = value; }
      return res;
    };
    assert.equal((await call(member, { action: 'login', email: 'a@example.test', password: 'wrong' })).statusCode, 401);
    assert.equal((await call(member, { action: 'reset_password', email: 'a@example.test', newPassword: 'new-password-123' })).statusCode, 403);
    let sentCode;
    globalThis.fetch = async (_url, options) => {
      sentCode = JSON.parse(options.body).textContent.match(/\d{6}/)[0];
      return { ok: true };
    };
    assert.equal((await call(send, { email: 'a@example.test', otp: 'chosen-by-client' })).statusCode, 200);
    assert.match(sentCode, /^\d{6}$/);
    assert.equal((await call(send, { email: 'a@example.test' })).statusCode, 429);
    assert.equal((await call(verify, { email: 'a@example.test', enteredOtp: 'wrong' })).statusCode, 400);
    assert.equal((await call(verify, { email: 'a@example.test', enteredOtp: sentCode })).statusCode, 200);
    assert.equal((await call(member, { action: 'reset_password', email: 'a@example.test', newPassword: 'new-password-123' })).statusCode, 200);
    assert.equal((await call(member, { action: 'reset_password', email: 'a@example.test', newPassword: 'another-password' })).statusCode, 403);
    const login = await call(member, { action: 'login', email: 'a@example.test', password: 'new-password-123' });
    assert.equal(login.statusCode, 200);
    assert.equal('password' in login.body.member, false);
    assert.ok(login.headers['Set-Cookie'].every(value => value.includes('HttpOnly')));
    assert.equal((await call(member, { action: 'session' })).statusCode, 200);
    assert.equal((await call(member, { action: 'logout' })).statusCode, 200);
    assert.equal((await call(member, { action: 'session' })).statusCode, 401);

    globalThis.fetch = async () => ({ ok: false });
    assert.equal((await call(send, { email: 'failed@example.test' })).statusCode, 502);
    assert.equal((await db.query("SELECT * FROM auth_challenges WHERE email='failed@example.test'")).rows.length, 0);
    assert.equal((await call(admin, { action: 'login', username: 'fixture-admin', password: 'wrong' })).statusCode, 401);
    assert.equal((await call(admin, { action: 'login', username: 'fixture-admin', password: 'fixture-admin-password' })).statusCode, 200);
    assert.equal((await call(admin, { action: 'verify' })).statusCode, 200);
    await call(admin, { action: 'logout' });
    assert.equal((await call(admin, { action: 'verify' })).statusCode, 401);
  } finally { globalThis.fetch = originalFetch; await db.close(); }
});
