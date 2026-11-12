import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { signSession, verifySession, hashPassword, passwordMatches, redact } from '../server/security.js';
import { authorizeSync, memberSync } from '../server/access.js';
import { transaction } from '../server/database.js';
import sync from '../api/db/sync.js';
import kyc from '../api/kyc/upload.js';
import connect from '../api/integrations/zex/connect.js';
import status from '../api/integrations/zex/status.js';
import admin from '../api/admin/auth.js';
import sendOtp from '../api/auth/send-otp.js';
import webhook from '../api/integrations/zex/webhook.js';
import { createWebhookHandler } from '../api/integrations/zex/webhook.js';
import { createPurchaseHandler } from '../api/integrations/zex/purchase.js';
import recovery from '../api/integrations/zex/recover.js';
import callback from '../api/integrations/zex/callback.js';
import { createMemberWorker } from '../api/integrations/zex/process-pending.js';
import { createHealthHandler } from '../api/integrations/zex/health.js';
import { signZexWebhook } from '../src/lib/zexSecurity.js';
import { Readable } from 'node:stream';

process.env.AUTH_SECRET = 'test-only-auth-secret-that-is-long-enough';
delete process.env.BREVO_API_KEY;
delete process.env.MLM_WEBHOOK_SECRET;
delete process.env.ZEX_WEBHOOK_SECRET;
delete process.env.PORTAL_ORIGIN;

const req = (body = {}, actor) => ({ method: 'POST', headers: { host: 'localhost', ...(actor ? { cookie: `${actor.role === 'admin' ? 'cs_admin' : 'cs_member'}=${signSession(actor)}` } : {}) }, query: {}, body });
const response = () => ({ statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, json(value) { this.body = value; return this; } });

test('sessions reject tampering, expiry and wrong roles', () => {
  const signed = signSession({ sub: 'member-a', role: 'member' });
  assert.equal(verifySession(signed, 'member').sub, 'member-a');
  assert.equal(verifySession(signed + 'x', 'member'), null);
  assert.equal(verifySession(signed, 'admin'), null);
  assert.equal(verifySession(signSession({ sub: 'a', role: 'member' }, -1), 'member'), null);
  const saved = process.env.AUTH_SECRET;
  delete process.env.AUTH_SECRET;
  assert.equal(verifySession(signed, 'member'), null);
  assert.throws(() => signSession({ sub: 'a', role: 'member' }));
  process.env.AUTH_SECRET = saved;
});

test('passwords use unique salts and legacy hashes can migrate without accepting blank hashes', () => {
  const password = 'test-password-123';
  const first = hashPassword(password);
  assert.notEqual(first, hashPassword(password));
  assert.equal(passwordMatches(password, first), true);
  assert.equal(passwordMatches('wrong', first), false);
  assert.equal(passwordMatches(password, ''), false);
  const legacy = createHash('sha256').update('cs_network_2026_v1_secure_salt_' + password).digest('hex');
  assert.equal(passwordMatches(password, legacy), true);
});

test('sensitive routes reject unauthenticated requests before accessing a database', async () => {
  for (const handler of [sync, kyc, connect, status]) {
    const res = response();
    await handler(req({ action: 'approve_activation', memberId: 'victim' }), res);
    assert.equal(res.statusCode, 401);
  }
});

test('member identity cannot authorize another account or an administrator action', () => {
  const actor = { role: 'member', sub: 'member-a' };
  assert.throws(() => authorizeSync(req({ action: 'create_payout', data: { member_id: 'member-b' } }, actor)), /Access denied/);
  assert.throws(() => authorizeSync(req({ action: 'approve_payout' }, actor)), /Administrator/);
  assert.throws(() => authorizeSync(req({ action: 'reset_test_data' }, { role: 'admin', sub: 'admin' })), /unavailable/);
  assert.throws(() => authorizeSync(req({ action: 'update_password', memberId: 'member-a' }, actor)), /unavailable/);
  assert.equal(authorizeSync(req({ action: 'create_payout', data: { member_id: 'member-a' } }, actor)).sub, 'member-a');
});

test('cross-origin mutations and mixed-owner payment submissions are rejected', () => {
  const actor = { role: 'member', sub: 'a' };
  const request = req({ action: 'create_payout', data: { member_id: 'a' } }, actor);
  request.headers.origin = 'https://attacker.example';
  assert.throws(() => authorizeSync(request), /Origin/);
  assert.throws(() => authorizeSync(req({ action: 'submit_payment', order: { buyer_member_id: 'a' }, activation: { member_id: 'b' } }, actor)), /unavailable/);
});

test('clients cannot self-approve KYC', () => {
  const request = req({ action: 'update_kyc', memberId: 'a', kyc: { verification_status: 'verified' } }, { role: 'member', sub: 'a' });
  authorizeSync(request);
  assert.equal(request.body.kyc.verification_status, 'under_review');
});

test('client tokens cannot bypass administrator cookie verification', async () => {
  const res = response();
  await admin(req({ action: 'verify', token: signSession({ role: 'admin', sub: 'admin' }) }), res);
  assert.equal(res.statusCode, 401);
});

test('a member cannot combine their own ID with the KYC all-documents flag', async () => {
  const request = req({}, { role: 'member', sub: 'a' });
  request.method = 'GET';
  request.query = { memberId: 'a', all: 'true' };
  const res = response();
  await kyc(request, res);
  assert.equal(res.statusCode, 403);
});

test('ZEX callback and recovery cannot be invoked without their credentials', async () => {
  const callbackRes = response(); callbackRes.send = function (value) { this.body = value; return this; };
  await callback({ method: 'GET', headers: {}, query: { request_id:'a', state:'b', code:'c' } }, callbackRes);
  assert.equal(callbackRes.statusCode, 401);
  process.env.CRON_SECRET = 'fixture-recovery-secret-at-least-32-characters';
  const cronRes = response();
  await recovery({ method:'GET', headers:{} }, cronRes);
  assert.equal(cronRes.statusCode, 401);
  delete process.env.CRON_SECRET;
});

test('member worker processes only the signed-in member and monitoring requires authorization', async () => {
  let target;
  const worker = createMemberWorker(async args => { target = args.memberId; }, work => work(async () => [{ count:1 }]));
  const request = req({ memberId: 'victim' }, { role: 'member', sub: 'owner' });
  const workerRes = response();
  await worker(request, workerRes);
  assert.equal(workerRes.statusCode, 200);
  assert.equal(target, 'owner');
  const anonymous = response();
  await worker(req(), anonymous);
  assert.equal(anonymous.statusCode, 401);
  const health = createHealthHandler(async () => { throw new Error('must not reach database'); });
  const healthRes = response();
  await health({ method:'GET', headers:{} }, healthRes);
  assert.equal(healthRes.statusCode, 401);
});

test('missing email and webhook configuration fail honestly', async () => {
  const emailRes = response();
  await sendOtp(req({ email: 'user@example.test', otp: '111111' }), emailRes);
  assert.equal(emailRes.statusCode, 503);
  assert.equal(emailRes.body.success, false);
  const hookRes = response();
  await webhook(req(), hookRes);
  assert.equal(hookRes.statusCode, 503);
});

test('purchase requires a linked signed-in member and uses only the configured HTTPS URL', async () => {
  process.env.ZEX_ACTIVATION_PRODUCT_CODE = 'test-plan';
  process.env.ZEX_JOINING_PRICE_PAISE = '295000';
  process.env.ZEX_PURCHASE_URL = 'https://checkout.example.test/buy';
  process.env.ZEX_PARTNER_API_KEY = 'fixture-key';
  process.env.MLM_WEBHOOK_SECRET = 'fixture-webhook-secret-at-least-32-characters';
  process.env.ZEX_COMMISSION_RATES_PAISE = '1,1,1,1,1,1,1,1,1,1';
  process.env.ZEX_COMMISSION_POLICY_VERSION = 'v1';
  process.env.ZEX_RESERVE_MEMBER_ID = 'reserve';
  const request = req({ purchase_url: 'https://attacker.example.test/' }, { role: 'member', sub: 'a' });
  let seenMember;
  const handler = createPurchaseHandler(work => work(async (parts, ...values) => {
    const statement = parts.join('');
    if (statement.includes('zex_account_links')) seenMember = values[1];
    if (statement.includes('to_regclass')) return [{ sales:'sales', adjustments:'adjustments', grants:'grants', inbox:'inbox', checkpoints:'checkpoints', snapshots:'snapshots', intents:'intents', monitoring:'monitoring' }];
    if (statement.includes('information_schema.columns')) return [{ count:6 }];
    if (statement.includes('count(*) FILTER')) return [{ pending:0, failed:0, repeatedly_failed:0, oldest_pending_at:null }];
    if (statement.includes('FROM zex_monitor_runs')) return [{ last_success_at:new Date().toISOString(), last_error_code:null }];
    if (statement.includes('FROM zex_recovery_checkpoints')) return [{ last_cursor:0 }];
    return [{}];
  }));
  const success = response();
  await handler(request, success);
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.purchase_url, 'https://checkout.example.test/buy');
  assert.equal(seenMember, 'a');
  const unlinked = response();
  await createPurchaseHandler(work => work(async () => []))(request, unlinked);
  assert.equal(unlinked.statusCode, 403);
  const unmigrated = response();
  await createPurchaseHandler(work => work(async parts => parts.join('').includes('to_regclass') ? [{ sales:null, adjustments:null, grants:null, inbox:null, checkpoints:null }] : [{}]))(request, unmigrated);
  assert.equal(unmigrated.statusCode, 503);
  process.env.ZEX_COMMISSION_RATES_PAISE = '300000,1,1,1,1,1,1,1,1,1';
  const overBudget = response();
  await handler(request, overBudget);
  assert.equal(overBudget.statusCode, 503);
  process.env.ZEX_COMMISSION_RATES_PAISE = '1,1,1,1,1,1,1,1,1,1';
  const originalMode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const unmonitored = response();
  await handler(request, unmonitored);
  assert.equal(unmonitored.statusCode, 503);
  process.env.CRON_SECRET = 'fixture-cron-secret-at-least-32-characters';
  process.env.ZEX_ALERT_WEBHOOK_URL = 'https://alerts.example.test/test';
  const monitored = response();
  await handler(request, monitored);
  assert.equal(monitored.statusCode, 200);
  if (originalMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalMode;
  delete process.env.CRON_SECRET; delete process.env.ZEX_ALERT_WEBHOOK_URL;
  const anonymous = response();
  await handler(req(), anonymous);
  assert.equal(anonymous.statusCode, 401);
  process.env.ZEX_PURCHASE_URL = 'http://checkout.example.test/buy';
  const insecure = response();
  await handler(request, insecure);
  assert.equal(insecure.statusCode, 503);
  delete process.env.ZEX_PURCHASE_URL;
  delete process.env.ZEX_ACTIVATION_PRODUCT_CODE;
  delete process.env.ZEX_JOINING_PRICE_PAISE;
  delete process.env.ZEX_PARTNER_API_KEY; delete process.env.MLM_WEBHOOK_SECRET;
  delete process.env.ZEX_COMMISSION_RATES_PAISE; delete process.env.ZEX_COMMISSION_POLICY_VERSION; delete process.env.ZEX_RESERVE_MEMBER_ID;
});

test('webhook stores only signed events and acknowledges durable receipt before processing', async () => {
  process.env.MLM_WEBHOOK_SECRET = 'fixture-webhook-secret-at-least-32-characters';
  process.env.MLM_PARTNER_ID = 'fixture';
  const event = { event_id: '65bf8735-bdaf-44c1-8979-635d06d48bf5', sequence: 1, version: 1, partner_id: 'fixture', external_member_id: 'a', occurred_at: new Date().toISOString(), type: 'sale.confirmed', data: {} };
  const signed = signZexWebhook(event, process.env.MLM_WEBHOOK_SECRET);
  const scheduled = [];
  const worked = [];
  const call = async (bytes, headers, recordEvent) => {
    const request = Readable.from([bytes]); request.method = 'POST'; request.headers = Object.fromEntries(Object.entries(headers).map(([k,v]) => [k.toLowerCase(),v]));
    const res = response(); await createWebhookHandler(recordEvent, work => scheduled.push(work), async options => worked.push(options))(request, res); return res;
  };
  let stored = 0;
  assert.equal((await call(signed.rawBody, signed.headers, async () => { stored++; })).statusCode, 200);
  assert.equal((await call(Buffer.concat([signed.rawBody, Buffer.from(' ')]), signed.headers, async () => { stored++; })).statusCode, 401);
  assert.equal(stored, 1);
  assert.equal((await call(signed.rawBody, signed.headers, async () => { throw new Error('storage unavailable'); })).statusCode, 503);
  await Promise.all(scheduled);
  assert.equal(worked.length, 1);
  assert.equal(worked[0].partner, 'fixture');
  assert.equal(worked[0].memberId, 'a');
  delete process.env.MLM_WEBHOOK_SECRET; delete process.env.MLM_PARTNER_ID;
});

test('secrets are recursively stripped from API responses', () => {
  assert.deepEqual(redact({ password: 'hash', account: { password_hash: 'hash', token: 'x', name: 'A' } }), { account: { name: 'A' } });
});

test('member sync scopes every private table to the authenticated identity', async () => {
  const seen = [];
  await memberSync(async (parts, ...values) => { seen.push({ text: parts.join('?'), values }); return []; }, { sub: 'a' });
  for (const query of seen.filter(q => !q.text.includes('learning_resources'))) {
    assert.ok(query.text.includes('WHERE'));
    assert.ok(query.values.includes('a'));
  }
});

test('transaction commits only after success and rolls back/releases after errors', async () => {
  for (const shouldFail of [false, true]) {
    const calls = [];
    const poolFactory = () => ({ connect: async () => ({ query: async text => { calls.push(text); return { rows: [] }; }, release: () => calls.push('release') }), end: async () => calls.push('end') });
    const work = async sql => { await sql`SELECT ${1}`; if (shouldFail) throw new Error('injected failure'); return 'saved'; };
    if (shouldFail) await assert.rejects(transaction(work, { poolFactory, serialize: true }), /injected failure/);
    else assert.equal(await transaction(work, { poolFactory, serialize: true }), 'saved');
    assert.ok(calls.includes('SELECT pg_advisory_xact_lock(739201)'));
    assert.ok(calls.includes(shouldFail ? 'ROLLBACK' : 'COMMIT'));
    assert.ok(!calls.includes(shouldFail ? 'COMMIT' : 'ROLLBACK'));
    assert.deepEqual(calls.slice(-2), ['release', 'end']);
  }
});
