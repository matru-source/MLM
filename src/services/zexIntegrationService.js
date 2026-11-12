import { sealState, unsealState } from '../../server/connectState.js';
import { applyZexPayment } from '../../server/zexPayments.js';
import { transaction } from '../../server/database.js';
import { neon } from '@neondatabase/serverless';
import { generateRandomState, hashState, callbackStateMatches } from '../lib/zexSecurity.js';
import { randomUUID } from 'node:crypto';

function getSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '') throw new Error('Database is not configured');
  try {
    return neon(dbUrl);
  } catch (err) {
    console.warn('[ZEX Integration] Failed to initialize Neon DB client:', err.message);
    throw err;
  }
}

const DEFAULT_PARTNER_ID = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
const ZEX_CONNECT_BASE_URL = process.env.MLM_CONNECT_PAGE_URL || 'https://zex4u.com/connect/mlm';

/**
 * 1. Start a Session-Bound Connect Attempt for a Member
 * Requires durable database storage
 */
export async function createConnectAttempt({ memberId, partnerId = DEFAULT_PARTNER_ID, callbackUrl, runTransaction = transaction, fetchZex = fetch }) {
  const apiBaseUrl = (process.env.ZEX_API_BASE_URL || 'https://api.zex4u.com').trim().replace(/\/$/, '');
  const partnerApiKey = (process.env.X_ZEX_PARTNER_KEY || process.env.ZEX_PARTNER_API_KEY || process.env.MLM_PARTNER_API_KEY || '').trim();
  if (!partnerApiKey || !callbackUrl) throw new Error('ZEX connection is not configured');
  const targetCallback = new URL(callbackUrl);
  const apiUrl = new URL(apiBaseUrl);
  if (targetCallback.protocol !== 'https:' || apiUrl.protocol !== 'https:') throw new Error('ZEX connection URLs must use HTTPS');
  const intent = await runTransaction(async sql => {
    const links = await sql`SELECT 1 FROM zex_account_links WHERE partner_id=${partnerId} AND external_member_id=${memberId} AND status='active'`;
    if (links.length) throw new Error('This member already has a linked ZEX account');
    await sql`UPDATE zex_connect_intents SET status='expired' WHERE partner_id=${partnerId} AND member_id=${memberId} AND status='pending' AND expires_at<=NOW()`;
    const prior = await sql`SELECT * FROM zex_connect_intents WHERE partner_id=${partnerId} AND member_id=${memberId} AND status='pending'`;
    if (prior.length) {
      if (prior[0].callback_url !== targetCallback.href) throw new Error('Existing connection request has a different callback');
      return prior[0];
    }
    const id = randomUUID();
    const state = generateRandomState();
    const createKey = 'create_' + randomUUID();
    const completeKey = 'complete_' + randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const rows = await sql`INSERT INTO zex_connect_intents(id,partner_id,member_id,state_cipher,state_hash,create_key,complete_key,callback_url,status,expires_at)
      VALUES (${id},${partnerId},${memberId},${sealState(state)},${hashState(state)},${createKey},${completeKey},${targetCallback.href},'pending',${expiresAt}) RETURNING *`;
    return rows[0];
  }, { serialize: true });
  const state = unsealState(intent.state_cipher);
  const requestBody = JSON.stringify({ external_member_id: memberId, state, callback_url: intent.callback_url });
  let response;
  let lastError;
  for (let i = 0; i < 2; i++) {
    try {
      response = await fetchZex(new URL('/api/v1/integrations/mlm/connect-sessions', apiUrl), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Zex-Partner-Key': partnerApiKey, 'Idempotency-Key': intent.create_key },
        body: requestBody, redirect: 'error', signal: AbortSignal.timeout(10000)
      });
      if (response.ok || response.status < 500) break;
      lastError = new Error('ZEX connection service unavailable');
    } catch (error) { lastError = error; }
  }
  if (!response?.ok) throw new Error(response && response.status < 500 ? 'ZEX rejected the connection request' : 'ZEX connection service unavailable', { cause: lastError });
  const session = await response.json();
  let connectUrl;
  try { connectUrl = new URL(session.connect_url); } catch { throw new Error('Invalid ZEX connection response'); }
  const expectedOrigin = new URL(process.env.MLM_CONNECT_PAGE_URL || ZEX_CONNECT_BASE_URL).origin;
  if (!session.request_id || connectUrl.protocol !== 'https:' || connectUrl.origin !== expectedOrigin || !session.expires_at || !Number.isFinite(Date.parse(session.expires_at)) || new Date(session.expires_at) <= new Date()) throw new Error('Invalid ZEX connection response');
  await runTransaction(async sql => {
    const rows = await sql`INSERT INTO zex_connect_attempts(request_id,member_id,state_hash,complete_key,status,connect_url,expires_at,created_at)
      VALUES (${session.request_id},${memberId},${intent.state_hash},${intent.complete_key},'pending',${connectUrl.href},${session.expires_at},NOW())
      ON CONFLICT (request_id) DO UPDATE SET request_id=EXCLUDED.request_id
      WHERE zex_connect_attempts.member_id=EXCLUDED.member_id AND zex_connect_attempts.state_hash=EXCLUDED.state_hash RETURNING request_id`;
    if (!rows.length) throw new Error('ZEX connection request conflict');
    await sql`UPDATE zex_connect_intents SET status='completed', state_cipher='' WHERE id=${intent.id} AND status='pending'`;
  }, { serialize: true });
  return { requestId: session.request_id, memberId, connectUrl: connectUrl.href, expiresAt: session.expires_at, callbackUrl: targetCallback.href, dbConfigured: true };
}

/**
 * 2. Complete Connect Attempt & Store Immutable Mapping
 * Requires durable database storage
 */
async function readVerifiedAttempt(sql, { requestId, state, memberId, partnerId = DEFAULT_PARTNER_ID }, { allowExpired = false } = {}) {
  const rows = await sql`SELECT * FROM zex_connect_attempts WHERE request_id=${requestId} LIMIT 1`;
  const attempt = rows[0];
  if (!attempt) return { ok:false,status:404,error:'Connection request not found' };
  if (!memberId || attempt.member_id !== memberId) throw new Error('Connection request owner mismatch');
  if (!callbackStateMatches(state, attempt.state_hash)) return { ok:false,status:400,error:'Callback state verification failed' };
  if (attempt.status === 'completed') {
    const links = await sql`SELECT partner_id,external_member_id,zex_user_id,linked_at FROM zex_account_links WHERE partner_id=${partnerId} AND external_member_id=${memberId} AND status='active'`;
    if (!links.length) throw new Error('Completed connection requires reconciliation');
    return { ok:true,completed:true,data:links[0] };
  }
  if (attempt.status !== 'pending') throw new Error('Connection is not pending');
  if (!allowExpired && new Date(attempt.expires_at) < new Date()) return { ok:false,status:410,error:'Connection request has expired' };
  return { ok:true,attempt };
}
async function exchangeConnectCode(input, attempt, fetchZex = fetch) {
  const { requestId, code, partnerId = DEFAULT_PARTNER_ID } = input;
  const apiBaseUrl = (process.env.ZEX_API_BASE_URL || 'https://api.zex4u.com').trim().replace(/\/$/, '');
  const partnerApiKey = (process.env.X_ZEX_PARTNER_KEY || process.env.ZEX_PARTNER_API_KEY || process.env.MLM_PARTNER_API_KEY || '').trim();
  if (!partnerApiKey || new URL(apiBaseUrl).protocol !== 'https:' || !attempt.complete_key) throw new Error('ZEX connection is not configured');
  const completeUrl = new URL('/api/v1/integrations/mlm/connect-sessions/' + encodeURIComponent(requestId) + '/complete', apiBaseUrl);
  let response;
  for (let i=0;i<2;i++) {
    try {
      response = await fetchZex(completeUrl, { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Zex-Partner-Key':partnerApiKey, 'Idempotency-Key':attempt.complete_key },
        body:JSON.stringify({code}), redirect:'error', cache:'no-store', signal:AbortSignal.timeout(10000) });
      if (response.ok || response.status < 500) break;
    } catch { response = null; }
  }
  if (!response?.ok) {
    const error = new Error('ZEX account exchange failed');
    error.uncertain = !response || response.status >= 500;
    throw error;
  }
  const link = await response.json();
  if (!link?.zex_user_id || link.partner_id !== partnerId || link.external_member_id !== attempt.member_id || !Number.isFinite(Date.parse(link.linked_at))) throw new Error('Invalid ZEX account exchange');
  return link;
}
export async function recoverCompletedLink(input, attempt, fetchZex = fetch) {
  const { memberId, partnerId = DEFAULT_PARTNER_ID } = input;
  const base = process.env.ZEX_API_BASE_URL || 'https://api.zex4u.com';
  const partnerApiKey = (process.env.X_ZEX_PARTNER_KEY || process.env.ZEX_PARTNER_API_KEY || process.env.MLM_PARTNER_API_KEY || '').trim();
  if (!partnerApiKey || new URL(base).protocol !== 'https:') throw new Error('ZEX connection is not configured');
  const url = new URL('/api/v1/integrations/mlm/members/' + encodeURIComponent(memberId), base);
  const response = await fetchZex(url, { headers:{'X-Zex-Partner-Key':partnerApiKey}, redirect:'error', cache:'no-store', signal:AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('ZEX account recovery failed');
  const status = await response.json();
  const link = status.link;
  if (!Number.isFinite(new Date(attempt.created_at).getTime()) || status.connected !== true || status.external_member_id !== memberId || link?.external_member_id !== memberId ||
      link?.partner_id !== partnerId || !link?.zex_user_id || !Number.isFinite(Date.parse(link.linked_at)) ||
      Date.parse(link.linked_at) < new Date(attempt.created_at).getTime()) throw new Error('ZEX account recovery could not be confirmed');
  return link;
}
async function exchangeOrRecover(input, attempt) {
  try { return await exchangeConnectCode(input, attempt); }
  catch (error) { if (error.uncertain) return recoverCompletedLink(input, attempt); throw error; }
}
async function saveVerifiedLink(sql, input, link) {
  const { requestId, memberId, partnerId = DEFAULT_PARTNER_ID } = input;
  const current = await readVerifiedAttempt(sql, input, { allowExpired:true });
  if (!current.ok || current.completed) return current;
  const linkRows = await sql`INSERT INTO zex_account_links(partner_id,external_member_id,zex_user_id,status,linked_at)
    VALUES (${partnerId},${memberId},${link.zex_user_id},'active',${link.linked_at})
    ON CONFLICT (partner_id,external_member_id) DO UPDATE SET status='active'
    WHERE zex_account_links.zex_user_id=EXCLUDED.zex_user_id RETURNING *`;
  if (!linkRows.length) throw new Error('Member already linked to another ZEX account');
  await sql`UPDATE zex_connect_attempts SET status='completed' WHERE request_id=${requestId} AND member_id=${memberId}`;
  await sql`UPDATE members SET mlm_account=jsonb_set(COALESCE(mlm_account,'{}'::jsonb),'{zex_user_id}',to_jsonb(${link.zex_user_id}::text)),
    software_license=jsonb_set(COALESCE(software_license,'{}'::jsonb),'{zex_user_id}',to_jsonb(${link.zex_user_id}::text)) WHERE id=${memberId}`;
  await sql`UPDATE activations SET account2_software=jsonb_set(COALESCE(account2_software,'{}'::jsonb),'{zex_user_id}',to_jsonb(${link.zex_user_id}::text)) WHERE member_id=${memberId}`;
  return { ok:true,data:{partner_id:partnerId,external_member_id:memberId,zex_user_id:link.zex_user_id,linked_at:linkRows[0].linked_at} };
}
// Test helper; the production entry point keeps the remote request outside DB transactions.
export async function completeAttempt(sql, input) {
  const current = await readVerifiedAttempt(sql, input);
  if (!current.ok || current.completed) return current;
  const link = await exchangeOrRecover(input, current.attempt);
  return saveVerifiedLink(sql, input, link);
}
export async function completeConnectAttempt(input) {
  const current = await transaction(sql => readVerifiedAttempt(sql, input));
  if (!current.ok || current.completed) return current;
  const link = await exchangeOrRecover(input, current.attempt);
  return transaction(sql => saveVerifiedLink(sql, input, link), { serialize:true });
}
export async function cancelConnectAttempt(input) {
  return transaction(async sql => {
    const current = await readVerifiedAttempt(sql, input);
    if (!current.ok || current.completed) return { ok:false };
    const rows = await sql`UPDATE zex_connect_attempts SET status='cancelled'
      WHERE request_id=${input.requestId} AND member_id=${input.memberId} AND status='pending' RETURNING request_id`;
    return { ok:rows.length === 1 };
  }, { serialize:true });
}

/**
 * 3. Process Verified Webhook Event from ZEX
 * Handles 'sale.confirmed', 'sale.adjusted', and 'subscription.updated'
 * Database failures propagate for delivery retry
 */
export const applyWebhook = applyZexPayment;

export async function processVerifiedWebhook(event) {
  return transaction(sql => applyWebhook(sql, event), { serialize: true });
}

/**
 * 4. Get Current ZEX Link Status for Member
 * Returns a failure if database access is unavailable
 */
export async function getMemberZexStatus(memberId) {
  try {
    const sql = getSql();
    if (sql) {
      const rows = await sql`
        SELECT zal.partner_id, zal.external_member_id, zal.zex_user_id, zal.status, zal.linked_at
        FROM zex_account_links zal
        LEFT JOIN members m ON (m.id = zal.external_member_id OR m.mlm_account->>'partner_id' = zal.external_member_id)
        WHERE zal.partner_id = ${DEFAULT_PARTNER_ID} AND zal.status = 'active' AND zal.external_member_id = ${memberId}
        ORDER BY zal.linked_at DESC
        LIMIT 1;
      `;
      if (rows.length > 0) {
        return {
          linked: true,
          data: rows[0],
          dbConnected: true
        };
      }
    }


    return { linked: false, dbConnected: Boolean(sql) };
  } catch (err) {
    console.warn('[ZEX Integration] getMemberZexStatus handled gracefully:', err.message);
    throw err;
  }
}
