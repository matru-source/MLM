import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createSyncHandler } from '../api/db/sync.js';
import { signSession } from '../server/security.js';
import { ensureZexPaymentSchema } from '../server/zexPaymentSchema.js';
import { recoverZex, recordZexEvent, drainPending } from '../server/zexRecovery.js';
import { zexHealth, recordRecoveryResult, sendRecoveryAlert } from '../server/zexMonitoring.js';
import { expireDueSubscriptions, subscriptionAccess } from '../server/zexSubscriptions.js';
import { applyWebhook, completeAttempt, createConnectAttempt, recoverCompletedLink } from '../src/services/zexIntegrationService.js';
import { hashState } from '../src/lib/zexSecurity.js';
import { ensureAuthTables, consumeVerification, rateLimit, otpHash } from '../server/verification.js';

process.env.AUTH_SECRET = 'test-only-auth-secret-that-is-long-enough';
process.env.ZEX_ACTIVATION_PRODUCT_CODE = 'TEST-PLAN';
process.env.ZEX_JOINING_PRICE_PAISE = '295000';
process.env.ZEX_RENEWAL_PRICE_PAISE = '100000';
process.env.ZEX_COMMISSION_RATES_PAISE = '100000,30000,15000,5000,2500,2500,2500,1000,1000,500';
process.env.ZEX_COMMISSION_POLICY_VERSION = 'fixture-v1';
process.env.ZEX_RESERVE_MEMBER_ID = 'mem_matru';
process.env.PAYOUT_TDS_RATE = '0.05'; // Fixture, not a tax recommendation.
delete process.env.PORTAL_ORIGIN;

test('financial operations against an isolated PostgreSQL database', async t => {
  const db = new PGlite();
  try {
    // Read DDL only: never execute the repository scripts or load .env/live data.
    for (const file of ['scripts/initDb.js', 'scripts/enhanceSchema.js', 'scripts/enhanceZexIntegrationSchema.js', 'scripts/createKycDocsTable.js']) {
      const source = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
      for (const match of source.matchAll(/(?:await )?sql`([\s\S]*?)`/g)) {
        if (/^\s*(CREATE TABLE|ALTER TABLE)/.test(match[1]) && !match[1].includes('${')) await db.exec(match[1]);
      }
    }
    await db.exec('ALTER TABLE transactions ADD COLUMN available_at TIMESTAMPTZ; ALTER TABLE transactions ADD COLUMN settled_at TIMESTAMPTZ; ALTER TABLE transactions ADD COLUMN source_key TEXT;');
    const makeSql = (client, injectFailure = false) => async (parts, ...values) => {
      const text = parts.reduce((s, part, i) => s + (i ? '$' + i : '') + part, '');
      if (injectFailure && /INSERT INTO transactions/.test(text)) throw new Error('injected ledger failure');
      return (await client.query(text, values)).rows;
    };
    const run = (work, injectFailure = false) => db.transaction(client => work(makeSql(client, injectFailure)));
    await run(sql => ensureZexPaymentSchema(sql));
    const handler = createSyncHandler(work => run(work));
    const brokenHandler = createSyncHandler(work => run(work, true));
    const request = async (body, role = 'admin', sub = 'admin', chosen = handler, query) => {
      const res = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, json(value) { this.body = value; return this; } };
      await chosen({ method: query ? 'GET' : 'POST', body, query: query || {}, headers: { host: 'localhost', cookie: `${role === 'admin' ? 'cs_admin' : 'cs_member'}=${signSession({ role, sub })}` } }, res);
      return res;
    };
    const kyc = JSON.stringify({ verification_status: 'verified', legal_name: 'Root', bank_name: 'Fixture Bank', bank_account_number: '123456789', bank_ifsc: 'TEST0000001' });
    await db.query(`INSERT INTO members (id,name,email,referral_code,seller_status,wallet_balance,total_earnings,kyc_data) VALUES ('mem_matru','Root','root@example.test','CS123456','active',2000,2000,$1)`, [kyc]);
    await db.exec(`INSERT INTO members (id,name,email,referral_code,seller_status,sponsor_member_id,sponsor_code) VALUES ('buyer','Buyer','buyer@example.test','CSBUYER','pending_payment','mem_matru','CS123456');`);
    await db.exec("INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at) VALUES ('fixture','buyer','zex-buyer','active',NOW() - INTERVAL '1 day')");
    const balance = async () => Number((await db.query("SELECT wallet_balance FROM members WHERE id='mem_matru'")).rows[0].wallet_balance);

    await t.test('connection creation retries use the same key and state across requests', async () => {
      process.env.ZEX_API_BASE_URL = 'https://zex.example.test';
      process.env.ZEX_PARTNER_API_KEY = 'fixture-key';
      const attempts = [];
      const options = { memberId:'connect-user',partnerId:'fixture',callbackUrl:'https://portal.example.test/api/integrations/zex/callback',runTransaction:work=>run(work) };
      const failing = async (_url, request) => { attempts.push({ key:request.headers['Idempotency-Key'], body:request.body }); throw new Error('timeout'); };
      await assert.rejects(createConnectAttempt({ ...options, fetchZex:failing }), /unavailable/);
      const success = async (_url, request) => { attempts.push({ key:request.headers['Idempotency-Key'], body:request.body }); return { ok:true,json:async()=>({ request_id:'request-retried',connect_url:'https://zex4u.com/connect/mlm#request=fixture',expires_at:new Date(Date.now()+60000).toISOString() }) }; };
      const result = await createConnectAttempt({ ...options, fetchZex:success });
      assert.equal(result.requestId,'request-retried');
      assert.equal(new Set(attempts.map(a=>a.key)).size,1);
      assert.equal(new Set(attempts.map(a=>a.body)).size,1);
      const stored=(await db.query("SELECT state_cipher FROM zex_connect_intents WHERE member_id='connect-user'")).rows[0];
      assert.notEqual(stored.state_cipher,JSON.parse(attempts[0].body).state);
      delete process.env.ZEX_API_BASE_URL; delete process.env.ZEX_PARTNER_API_KEY;
    });

    await t.test('account linking checks the initiating member, callback state, and immutable mapping', async () => {
      process.env.ZEX_API_BASE_URL = 'https://zex.example.test';
      process.env.ZEX_PARTNER_API_KEY = 'fixture-key';
      await db.query("INSERT INTO zex_connect_attempts(request_id,member_id,state_hash,complete_key,status,expires_at) VALUES ('attempt','buyer',$1,'key','pending',NOW() + INTERVAL '5 minutes')", [hashState('state')]);
      const input = { requestId:'attempt', code:'test-code', state:'state', memberId:'buyer', partnerId:'fixture' };
      await assert.rejects(run(sql => completeAttempt(sql, { ...input, memberId:'other' })), /owner mismatch/);
      const wrongState = await run(sql => completeAttempt(sql, { ...input, state:'wrong' }));
      assert.equal(wrongState.ok, false);
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => ({ ok:true, json:async () => ({ partner_id:'fixture', external_member_id:'buyer', zex_user_id:'different-zex',linked_at:new Date().toISOString() }) });
        await assert.rejects(run(sql => completeAttempt(sql, input)), /already linked/);
        assert.equal((await db.query("SELECT zex_user_id FROM zex_account_links WHERE external_member_id='buyer'")).rows[0].zex_user_id, 'zex-buyer');
        globalThis.fetch = async () => ({ ok:true, json:async () => ({ partner_id:'fixture', external_member_id:'buyer', zex_user_id:'zex-buyer',linked_at:new Date().toISOString() }) });
        assert.equal((await run(sql => completeAttempt(sql, input))).ok, true);
      } finally { globalThis.fetch = originalFetch; delete process.env.ZEX_API_BASE_URL; delete process.env.ZEX_PARTNER_API_KEY; }
    });

    await t.test('connection recovery accepts only the same member and a link created during the attempt', async () => {
      process.env.ZEX_API_BASE_URL='https://zex.example.test';process.env.ZEX_PARTNER_API_KEY='fixture-key';
      const input={ memberId:'buyer',partnerId:'fixture' };
      const attempt={ created_at:new Date(Date.now()-60000).toISOString() };
      const link={ partner_id:'fixture',external_member_id:'buyer',zex_user_id:'zex-buyer',linked_at:new Date().toISOString() };
      const reply=linkData=>async()=>({ok:true,json:async()=>({connected:true,external_member_id:'buyer',link:linkData})});
      assert.equal((await recoverCompletedLink(input,attempt,reply(link))).zex_user_id,'zex-buyer');
      await assert.rejects(recoverCompletedLink(input,attempt,reply({...link,external_member_id:'other'})),/could not be confirmed/);
      await assert.rejects(recoverCompletedLink(input,attempt,reply({...link,linked_at:'2000-01-01T00:00:00Z'})),/could not be confirmed/);
      delete process.env.ZEX_API_BASE_URL;delete process.env.ZEX_PARTNER_API_KEY;
    });

    await t.test('reject negative, non-finite, excessive and unverified withdrawals without changing balances', async () => {
      for (const amount of [-500, 0, 499, 500.001, 99999, 'not money']) {
        const res = await request({ action: 'create_payout', data: { id: 'bad', member_id: 'mem_matru', amount } }, 'member', 'mem_matru');
        assert.equal(res.statusCode, 400, JSON.stringify(res.body));
      }
      const res = await request({ action: 'create_payout', data: { id: 'bad', member_id: 'buyer', amount: 500 } }, 'member', 'buyer');
      assert.equal(res.statusCode, 400);
      assert.equal(await balance(), 2000);
      assert.equal((await db.query('SELECT * FROM payout_requests')).rows.length, 0);
    });

    await t.test('ledger failure rolls back payout insertion and wallet deduction', async () => {
      const res = await request({ action: 'create_payout', data: { id: 'rollback', member_id: 'mem_matru', amount: 500 } }, 'member', 'mem_matru', brokenHandler);
      assert.equal(res.statusCode, 503);
      assert.equal(await balance(), 2000);
      assert.equal((await db.query("SELECT * FROM payout_requests WHERE id='rollback'")).rows.length, 0);
    });

    await t.test('payout reserves money once; rejection restores once; paid payout cannot be rejected', async () => {
      const body = { action: 'create_payout', data: { id: 'pay1', member_id: 'mem_matru', amount: 500, tds_amount: -100, net_payable: 100000 } };
      assert.equal((await request(body, 'member', 'mem_matru')).statusCode, 200);
      assert.equal(await balance(), 1500);
      const stored = (await db.query("SELECT * FROM payout_requests WHERE id='pay1'")).rows[0];
      assert.equal(Number(stored.net_amount), 475);
      assert.notEqual((await request(body, 'member', 'mem_matru')).statusCode, 200);
      assert.equal(await balance(), 1500);
      assert.equal((await request({ action: 'reject_payout', payoutId: 'pay1' })).statusCode, 200);
      assert.equal((await request({ action: 'reject_payout', payoutId: 'pay1' })).statusCode, 409);
      assert.equal(await balance(), 2000);
      body.data.id = 'pay2';
      assert.equal((await request(body, 'member', 'mem_matru')).statusCode, 200);
      assert.equal((await request({ action: 'approve_payout', payoutId: 'pay2', details: {} })).statusCode, 400);
      assert.equal((await request({ action: 'approve_payout', payoutId: 'pay2', details: { utrNumber: 'TEST12345678' } })).statusCode, 200);
      assert.equal((await request({ action: 'reject_payout', payoutId: 'pay2' })).statusCode, 409);
      assert.equal(await balance(), 1500);
    });

    await t.test('manual payment and activation actions are blocked', async () => {
      for (const action of ['submit_payment', 'create_order', 'create_activation', 'approve_activation', 'reject_activation']) {
        assert.equal((await request({ action }, 'admin', 'admin')).statusCode, 403);
      }
      await db.exec("INSERT INTO transactions(id,member_id,description,amount,type,status,created_at) VALUES ('fixture-credit','mem_matru','fixture',1000,'credit','Pending',NOW())");
    });

    await t.test('commission release and clawback are safe to retry', async () => {
      const tx = (await db.query("SELECT id FROM transactions WHERE status='Pending' LIMIT 1")).rows[0];
      const before = await balance();
      assert.equal((await request({ action: 'release_commission_early', transactionId: tx.id })).statusCode, 200);
      assert.notEqual((await request({ action: 'release_commission_early', transactionId: tx.id })).statusCode, 200);
      assert.equal(await balance(), before + 1000);
      assert.equal((await request({ action: 'clawback_commission', transactionId: tx.id })).statusCode, 200);
      assert.equal((await request({ action: 'clawback_commission', transactionId: tx.id })).statusCode, 409);
      assert.equal(await balance(), before);
    });

    await t.test('member GET does not leak other accounts and admin timestamps remain usable', async () => {
      const res = await request({}, 'member', 'buyer', handler, {});
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.members.length, 1);
      assert.equal(res.body.data.members[0].email, 'buyer@example.test');
      const adminRes = await request({}, 'admin', 'admin', handler, {});
      assert.equal(adminRes.statusCode, 200, JSON.stringify(adminRes.body));
      assert.equal(typeof adminRes.body.data.members[0].joined_at, 'string');
      assert.equal('password' in adminRes.body.data.members[0], false);
    });

    await t.test('ZEX verified sales activate once and partial adjustments reverse proportionally', async () => {
      const event = { partner_id: 'fixture', event_id: 'event1', sequence: 1, type: 'sale.confirmed', external_member_id: 'buyer', data: { sale_id: 'sale1', subscription_id: 'sub1', product_code: 'TEST-PLAN', source: 'play', currency: 'INR', paid_at: new Date().toISOString(), sale_kind: 'acquisition', eligibility_reason: 'eligible_first_acquisition', commission_eligible: true, amount_minor: 295000 } };
      await assert.rejects(run(sql => applyWebhook(sql, event), true), /injected ledger failure/);
      assert.equal((await db.query('SELECT * FROM zex_webhook_inbox')).rows.length, 0);
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='buyer'")).rows[0].seller_status, 'pending_payment');
      await run(sql => applyWebhook(sql, event));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='buyer'")).rows[0].seller_status, 'active');
      const count = (await db.query('SELECT COUNT(*)::int AS count FROM transactions')).rows[0].count;
      await run(sql => applyWebhook(sql, event));
      await run(sql => applyWebhook(sql, { ...event, event_id: 'event2' }));
      assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM transactions')).rows[0].count, count);
      const adjustment = { ...event, event_id: 'refund1', type: 'sale.adjusted', data: { sale_id: 'sale1', adjustment_id: 'adj1', reason: 'refund', amount_minor: 147500, currency: 'INR', adjusted_at: null } };
      await run(sql => applyWebhook(sql, adjustment));
      const first = await balance();
      await run(sql => applyWebhook(sql, { ...adjustment, event_id: 'refund2' }));
      assert.equal(await balance(), first);
      const grant = (await db.query("SELECT original_minor,reversed_minor FROM zex_commission_grants WHERE sale_id='sale1' LIMIT 1")).rows[0];
      assert.equal(Number(grant.reversed_minor), Number(grant.original_minor) / 2);
      await run(sql => applyWebhook(sql, { ...adjustment, event_id: 'refund3', data: { ...adjustment.data, adjustment_id: 'adj2' } }));
      assert.equal((await db.query("SELECT * FROM transactions WHERE source_key='fixture:sale1' AND status <> 'Clawed Back'")).rows.length, 0);
    });
    await t.test('unlinked, wrong product, pre-link, noneligible sales and configuration are handled safely', async () => {
      await db.exec("INSERT INTO members (id,name,email,referral_code,seller_status) VALUES ('other','Other','other@example.test','OTHER','pending_payment')");
      const base = { partner_id: 'fixture', event_id: 'x1', sequence: 2, type: 'sale.confirmed', external_member_id: 'other', data: { sale_id: 'sale2', subscription_id: 'sub2', product_code: 'TEST-PLAN', source: 'play', currency: 'INR', paid_at: new Date().toISOString(), sale_kind: 'other', eligibility_reason: 'initial_payment_not_verified', commission_eligible: false, amount_minor: 295000 } };
      await assert.rejects(run(sql => applyWebhook(sql, base)), /active ZEX link/);
      await db.exec("INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at) VALUES ('fixture','other','zex-other','active',NOW() - INTERVAL '1 day')");
      await run(sql => applyWebhook(sql, { ...base, event_id:'x2', data:{ ...base.data, product_code:'OTHER' } }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='other'")).rows[0].seller_status, 'pending_payment');
      await run(sql => applyWebhook(sql, { ...base, event_id:'x3', data:{ ...base.data, sale_id:'sale3', paid_at:'2000-01-01T00:00:00Z' } }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='other'")).rows[0].seller_status, 'pending_payment');
      await run(sql => applyWebhook(sql, { ...base, event_id:'x4', data:{ ...base.data, sale_id:'sale4' } }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='other'")).rows[0].seller_status, 'active');
      assert.equal((await db.query("SELECT * FROM zex_commission_grants WHERE sale_id='sale4'")).rows.length, 0);
      const config = process.env.ZEX_ACTIVATION_PRODUCT_CODE; delete process.env.ZEX_ACTIVATION_PRODUCT_CODE;
      await assert.rejects(run(sql => applyWebhook(sql, { ...base, event_id:'x5', data:{ ...base.data, sale_id:'sale5' } })), /not configured/);
      process.env.ZEX_ACTIVATION_PRODUCT_CODE = config;
    });

    await t.test('a renewal or underpriced sale does not activate a new member', async () => {
      await db.exec("INSERT INTO members (id,name,email,referral_code,seller_status) VALUES ('renewal-user','Renewal User','renewal@example.test','RENEW','pending_payment')");
      await db.exec("INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at) VALUES ('fixture','renewal-user','renewal-zex','active',NOW() - INTERVAL '1 day')");
      const event = { partner_id:'fixture',event_id:'renewal-event',sequence:3,type:'sale.confirmed',external_member_id:'renewal-user',data:{sale_id:'renewal-sale',subscription_id:'renewal-sub',product_code:'TEST-PLAN',source:'phonepe',currency:'INR',paid_at:new Date().toISOString(),sale_kind:'renewal',eligibility_reason:'existing_subscription_history',commission_eligible:false,amount_minor:100000} };
      await run(sql => applyWebhook(sql,event));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='renewal-user'")).rows[0].seller_status,'pending_payment');
      assert.equal((await db.query("SELECT * FROM zex_commission_grants WHERE sale_id='renewal-sale'")).rows.length,0);
      await run(sql => applyWebhook(sql,{ ...event,event_id:'underpaid-event',data:{ ...event.data,sale_id:'underpaid-sale',sale_kind:'other',amount_minor:294999 } }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='renewal-user'")).rows[0].seller_status,'pending_payment');
      await run(sql => applyWebhook(sql,{ ...event,event_id:'inactive-event',data:{ ...event.data,sale_id:'inactive-sale',sale_kind:'other',amount_minor:295000,eligibility_reason:'subscription_not_active' } }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='renewal-user'")).rows[0].seller_status,'pending_payment');
    });

    await t.test('recovery durably saves out-of-order events and retries a pending adjustment', async () => {
      process.env.MLM_PARTNER_ID = 'fixture';
      process.env.ZEX_API_BASE_URL = 'https://zex.example.test';
      process.env.ZEX_PARTNER_API_KEY = 'fixture-key';
      const common = { partner_id: 'fixture', version: 1, external_member_id: 'other', occurred_at: new Date().toISOString() };
      const refund = { ...common, event_id:'11111111-1111-4111-8111-111111111111', sequence:10, type:'sale.adjusted', data:{ sale_id:'late-sale', adjustment_id:'late-refund', reason:'refund', amount_minor:10000, currency:'INR', adjusted_at:null } };
      const sale = { ...common, event_id:'22222222-2222-4222-8222-222222222222', sequence:11, type:'sale.confirmed', data:{ sale_id:'late-sale', subscription_id:'late-sub', product_code:'TEST-PLAN', source:'play', currency:'INR', paid_at:new Date().toISOString(), sale_kind:'other', eligibility_reason:'initial_payment_not_verified', commission_eligible:false, amount_minor:295000 } };
      let calls = 0;
      const fetchPage = async () => ({ ok: true, json: async () => ++calls === 1 ? { events:[refund,sale], next_cursor:11, has_more:false } : { events:[], next_cursor:11, has_more:false } });
      const first = await recoverZex({ runTransaction: work => run(work), fetchPage });
      assert.equal(first.failed, 1);
      assert.equal(first.processed, 1);
      assert.equal(Number((await db.query("SELECT last_cursor FROM zex_recovery_checkpoints WHERE partner_id='fixture'")).rows[0].last_cursor), 11);
      const retry = (await db.query("SELECT attempts,last_error_code FROM zex_webhook_inbox WHERE event_id='11111111-1111-4111-8111-111111111111'")).rows[0];
      assert.equal(retry.attempts, 1);
      assert.equal(retry.last_error_code, 'processing_failed');
      await db.exec("UPDATE zex_webhook_inbox SET next_attempt_at=NOW() - INTERVAL '1 second' WHERE event_id='11111111-1111-4111-8111-111111111111'");
      const second = await recoverZex({ runTransaction: work => run(work), fetchPage });
      assert.equal(second.failed, 0);
      assert.equal(second.processed, 1);
      assert.equal((await db.query("SELECT * FROM zex_payment_adjustments WHERE adjustment_id='late-refund'")).rows.length, 1);
      delete process.env.MLM_PARTNER_ID; delete process.env.ZEX_API_BASE_URL; delete process.env.ZEX_PARTNER_API_KEY;
    });

    await t.test('subscription cancellation and renewal preserve wallet access without duplicate commission', async () => {
      await db.query("INSERT INTO members (id,name,email,referral_code,seller_status,wallet_balance,kyc_data) VALUES ('life','Life','life@example.test','LIFE','pending_payment',800,$1)", [kyc]);
      await db.exec("INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at) VALUES ('fixture','life','zex-life','active',NOW() - INTERVAL '1 day')");
      const e = { partner_id:'fixture',event_id:'life-sale',sequence:10,type:'sale.confirmed',external_member_id:'life',data:{ sale_id:'life-sale',subscription_id:'life-sub',product_code:'TEST-PLAN',source:'phonepe',currency:'INR',paid_at:new Date().toISOString(),sale_kind:'other',eligibility_reason:'initial_payment_not_verified',commission_eligible:false,amount_minor:295000 } };
      await run(sql=>applyWebhook(sql,e));
      const future = new Date(Date.now()+86400000).toISOString();
      const update = { ...e,event_id:'life-cancel',sequence:11,type:'subscription.updated',data:{ subscription_id:'life-sub',product_code:'TEST-PLAN',source:'phonepe',status:'cancelled',current_period_start:null,current_period_end:future,auto_renew:false,cancel_at_period_end:true } };
      await run(sql=>applyWebhook(sql,update));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='life'")).rows[0].seller_status,'active');
      await run(sql=>applyWebhook(sql,{ ...update,event_id:'life-expire',sequence:12,data:{ ...update.data,status:'expired',current_period_end:new Date(Date.now()-1000).toISOString() } }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='life'")).rows[0].seller_status,'subscription_expired');
      const payout=await request({ action:'create_payout',data:{id:'life-payout',member_id:'life',amount:500} },'member','life');
      assert.equal(payout.statusCode,200,JSON.stringify(payout.body));
      const renewal={ ...e,event_id:'life-renewal',sequence:13,data:{ ...e.data,sale_id:'life-renewal',sale_kind:'renewal',eligibility_reason:'existing_subscription_history',amount_minor:100000 } };
      await run(sql=>applyWebhook(sql,renewal));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='life'")).rows[0].seller_status,'active');
      assert.equal((await db.query("SELECT * FROM zex_commission_grants WHERE sale_id='life-renewal'")).rows.length,0);
      await run(sql=>applyWebhook(sql,{ ...update,event_id:'life-stale',sequence:11,data:{...update.data,status:'expired'} }));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='life'")).rows[0].seller_status,'active');
    });

    await t.test('expiry runs on schedule, grace and unknown statuses do not grant new access', async () => {
      assert.equal(subscriptionAccess({status:'grace',current_period_end:new Date(Date.now()-1000).toISOString()}),'active');
      assert.equal(subscriptionAccess({status:'future_provider_status',current_period_end:null}),'unknown');
      const old = new Date(Date.now()-3600000).toISOString();
      await db.query("UPDATE zex_subscription_snapshots SET sequence=20,snapshot=$1 WHERE partner_id='fixture' AND subscription_id='life-sub'", [JSON.stringify({ subscription_id:'life-sub',product_code:'TEST-PLAN',source:'phonepe',status:'active',current_period_start:null,current_period_end:old,auto_renew:false,cancel_at_period_end:true })]);
      await run(sql=>expireDueSubscriptions(sql,'fixture'));
      assert.equal((await db.query("SELECT seller_status FROM members WHERE id='life'")).rows[0].seller_status,'subscription_expired');
      assert.equal((await request({},'member','life',handler,{type:'referral',code:'LIFE'})).body.data,null);
      await db.exec("INSERT INTO members (id,name,email,referral_code,seller_status,sponsor_member_id) VALUES ('expired-child','Child','child@example.test','CHILD','pending_payment','life')");
      await db.exec("INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at) VALUES ('fixture','expired-child','zex-child','active',NOW() - INTERVAL '1 day')");
      const childSale={partner_id:'fixture',event_id:'child-event',sequence:21,type:'sale.confirmed',external_member_id:'expired-child',data:{sale_id:'child-sale',subscription_id:'child-sub',product_code:'TEST-PLAN',source:'phonepe',currency:'INR',paid_at:new Date().toISOString(),sale_kind:'acquisition',eligibility_reason:'eligible_first_acquisition',commission_eligible:true,amount_minor:295000}};
      await run(sql=>applyWebhook(sql,childSale));
      assert.equal((await db.query("SELECT * FROM zex_commission_grants WHERE sale_id='child-sale' AND member_id='life'")).rows.length,0);
      assert.equal((await db.query("SELECT * FROM zex_commission_grants WHERE sale_id='child-sale' AND member_id='mem_matru'")).rows.length,1);
    });

    await t.test('event identity conflicts and outage recovery do not lose queued events', async () => {
      const event = { partner_id:'fixture',event_id:'queue-event',sequence:25,version:1,type:'subscription.updated',external_member_id:'life',occurred_at:new Date().toISOString(),data:{subscription_id:'life-sub',product_code:'TEST-PLAN',source:'phonepe',status:'expired',current_period_start:null,current_period_end:null,auto_renew:false,cancel_at_period_end:false} };
      await recordZexEvent(event, work=>run(work));
      await recordZexEvent(event, work=>run(work));
      await assert.rejects(recordZexEvent({ ...event, data:{...event.data,status:'active'} },work=>run(work)), /Conflicting/);
      process.env.MLM_PARTNER_ID='fixture';process.env.ZEX_API_BASE_URL='https://zex.example.test';process.env.ZEX_PARTNER_API_KEY='fixture-key';
      await assert.rejects(recoverZex({runTransaction:work=>run(work),fetchPage:async()=>{throw new Error('upstream outage')}}), /upstream outage/);
      assert.equal((await db.query("SELECT processed FROM zex_webhook_inbox WHERE event_id='queue-event'")).rows[0].processed,true);
      delete process.env.MLM_PARTNER_ID;delete process.env.ZEX_API_BASE_URL;delete process.env.ZEX_PARTNER_API_KEY;
    });

    await t.test('monitor reports failed events and sends throttled aggregate alerts', async () => {
      await recordRecoveryResult('fixture',false,work=>run(work));
      const health = await run(sql=>zexHealth(sql,'fixture'));
      assert.equal(health.healthy,false);
      assert.equal(health.last_error_code,'recovery_failed');
      process.env.ZEX_ALERT_WEBHOOK_URL='https://alerts.example.test/fixture';
      let calls=0;
      const send=async (_url,options)=>{ calls++; const body=JSON.parse(options.body); assert.equal('member_id' in body,false); return {ok:true}; };
      await assert.rejects(sendRecoveryAlert('fixture',health,{runTransaction:work=>run(work),send:async()=>({ok:false})}),/Alert delivery failed/);
      assert.equal(await sendRecoveryAlert('fixture',health,{runTransaction:work=>run(work),send}),true);
      assert.equal(await sendRecoveryAlert('fixture',health,{runTransaction:work=>run(work),send}),false);
      assert.equal(calls,1);
      await recordRecoveryResult('fixture',true,work=>run(work));
      assert.equal((await run(sql=>zexHealth(sql,'fixture'))).healthy,true);
      delete process.env.ZEX_ALERT_WEBHOOK_URL;
    });

    await t.test('historical manual activation cannot earn the same acquisition commission again', async () => {
      await db.exec("INSERT INTO members (id,name,email,referral_code,seller_status,sponsor_member_id) VALUES ('legacy','Legacy','legacy@example.test','LEGACY','active','mem_matru')");
      await db.exec("INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at) VALUES ('fixture','legacy','zex-legacy','active',NOW() - INTERVAL '1 day')");
      await db.exec("INSERT INTO activations(id,member_id,status) VALUES ('legacy-activation','legacy','approved')");
      const sale = { partner_id:'fixture', event_id:'legacy-event', sequence:4, type:'sale.confirmed', external_member_id:'legacy', data:{ sale_id:'legacy-new-sale', subscription_id:'legacy-sub', product_code:'TEST-PLAN', source:'play', currency:'INR', paid_at:new Date().toISOString(), sale_kind:'acquisition', eligibility_reason:'eligible_first_acquisition', commission_eligible:true, amount_minor:295000 } };
      await run(sql => applyWebhook(sql, sale));
      assert.equal((await db.query("SELECT * FROM zex_commission_grants WHERE sale_id='legacy-new-sale'")).rows.length, 0);
      assert.equal((await db.query("SELECT commission_eligible FROM zex_payment_sales WHERE sale_id='legacy-new-sale'")).rows[0].commission_eligible, true);
    });

    await t.test('verification grants are single-use and rate limits persist', async () => {
      await run(async sql => {
        await ensureAuthTables(sql);
        assert.equal(await rateLimit(sql, 'fixture', 1, 60), true);
        assert.equal(await rateLimit(sql, 'fixture', 1, 60), false);
        await sql`INSERT INTO auth_challenges (email,id,code_hash,expires_at,verified) VALUES ('new@example.test','grant',${otpHash('grant', '123456')},NOW() + INTERVAL '5 minutes',TRUE)`;
      });
      const req = { headers: { cookie: 'cs_verified=' + signSession({ role: 'email', sub: 'new@example.test', id: 'grant' }) } };
      await run(sql => consumeVerification(sql, req, 'new@example.test'));
      await assert.rejects(run(sql => consumeVerification(sql, req, 'new@example.test')), /already used/);
    });

    await t.test('registration requires a verified email and ignores supplied privileged status', async () => {
      const body = { action: 'register_member', data: { member_id: 'new-user', name: 'New User', email: 'new@example.test', phone: '9876543210', password: 'new-password-123', sponsor_code: 'CS123456', seller_status: 'active', kyc: { verification_status: 'verified' } } };
      assert.equal((await request(body, 'member', 'buyer')).statusCode, 403);
      await run(sql => sql`INSERT INTO auth_challenges (email,id,code_hash,expires_at,verified) VALUES ('new@example.test','registration',${otpHash('registration','123456')},NOW() + INTERVAL '5 minutes',TRUE)`);
      const response = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, setHeader(k,v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, json(body) { this.body = body; return this; } };
      await handler({ method: 'POST', body, query: {}, headers: { host: 'localhost', cookie: 'cs_verified=' + signSession({ role: 'email', sub: 'new@example.test', id: 'registration' }) } }, response);
      assert.equal(response.statusCode, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.seller_status, 'pending_payment');
      assert.equal('password' in response.body.data, false);
      assert.ok(response.headers['Set-Cookie'].some(value => value.startsWith('cs_member=')));
      const row = (await db.query("SELECT password, kyc_data FROM members WHERE id='new-user'")).rows[0];
      assert.ok(row.password.startsWith('scrypt$'));
      assert.notEqual(row.kyc_data.verification_status, 'verified');
    });
  } finally { await db.close(); }
});
