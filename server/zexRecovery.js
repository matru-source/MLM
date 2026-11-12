import { transaction } from './database.js';
import { applyZexPayment } from './zexPayments.js';
import { expireDueSubscriptions } from './zexSubscriptions.js';

// Each event is processed in its own transaction, so one bad delivery cannot
// block other members or roll back an already committed event.
export async function drainPending({ runTransaction = transaction, partner, memberId = null, limit = 50, deadline = Infinity } = {}) {
  if (!partner || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid worker configuration');
  const pending = await runTransaction(sql => sql`SELECT event_id, payload FROM zex_webhook_inbox
    WHERE partner_id=${partner} AND processed=FALSE AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      AND (${memberId}::text IS NULL OR payload->>'external_member_id'=${memberId})
    ORDER BY sequence LIMIT ${limit}`);
  let processed = 0;
  let failed = 0;
  for (const row of pending) {
    if (Date.now() >= deadline) break;
    try {
      await runTransaction(async sql => {
        await applyZexPayment(sql, row.payload);
        await sql`UPDATE zex_webhook_inbox SET last_error_code=NULL, next_attempt_at=NULL WHERE partner_id=${partner} AND event_id=${row.event_id}`;
      }, { serialize: true });
      processed++;
    } catch (error) {
      failed++;
      // Do not store event payloads, secrets, SQL, or provider responses in error logs.
      await runTransaction(sql => sql`UPDATE zex_webhook_inbox SET attempts=attempts+1,
        last_error_code='processing_failed',
        next_attempt_at=NOW() + (LEAST(3600, 15 * POWER(2, LEAST(attempts, 8))) * INTERVAL '1 second')
        WHERE partner_id=${partner} AND event_id=${row.event_id} AND processed=FALSE`);
      console.error('[ZEX worker] Event processing failed', { partner, eventId: row.event_id, errorType: error.name });
    }
  }
  return { processed, failed };
}

function validateFeedEvent(event, partner, previous) {
  if (!event || event.partner_id !== partner || event.version !== 1 ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(event.event_id || '') ||
      !Number.isSafeInteger(event.sequence) || event.sequence <= previous ||
      !['sale.confirmed', 'sale.adjusted', 'subscription.updated'].includes(event.type) ||
      !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(event.external_member_id || '') ||
      typeof event.occurred_at !== 'string' || !Number.isFinite(Date.parse(event.occurred_at)) ||
      !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) throw new Error('Invalid recovery event');
}

async function pullRecoveryPage({ runTransaction = transaction, fetchPage = fetch } = {}) {
  const partner = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
  const key = process.env.X_ZEX_PARTNER_KEY || process.env.ZEX_PARTNER_API_KEY || process.env.MLM_PARTNER_API_KEY;
  const base = process.env.ZEX_API_BASE_URL;
  if (!key || !base || new URL(base).protocol !== 'https:') throw new Error('ZEX recovery is not configured');
  const checkpoint = await runTransaction(async sql => {
    await sql`INSERT INTO zex_recovery_checkpoints(partner_id,last_cursor) VALUES (${partner},0) ON CONFLICT(partner_id) DO NOTHING`;
    return Number((await sql`SELECT last_cursor FROM zex_recovery_checkpoints WHERE partner_id=${partner}`)[0].last_cursor);
  });
  const url = new URL('/api/v1/integrations/mlm/events', base);
  url.searchParams.set('cursor', String(checkpoint)); url.searchParams.set('limit', '50');
  const response = await fetchPage(url, { headers: { 'X-Zex-Partner-Key': key }, redirect:'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('ZEX recovery request failed');
  const page = await response.json();
  if (!Array.isArray(page.events) || page.events.length > 50 || !Number.isSafeInteger(page.next_cursor) || page.next_cursor < checkpoint || typeof page.has_more !== 'boolean') throw new Error('Invalid ZEX recovery page');
  let last = checkpoint;
  for (const event of page.events) { validateFeedEvent(event, partner, last); last = event.sequence; }
  if (page.next_cursor < last || (page.has_more && page.next_cursor <= checkpoint)) throw new Error('Invalid ZEX recovery cursor');
  await runTransaction(async sql => {
    const row = await sql`SELECT last_cursor FROM zex_recovery_checkpoints WHERE partner_id=${partner} FOR UPDATE`;
    if (Number(row[0].last_cursor) !== checkpoint) throw new Error('Recovery already running; retry');
    for (const event of page.events) {
      const saved = await sql`INSERT INTO zex_webhook_inbox(partner_id,event_id,sequence,event_type,payload,processed,created_at)
        VALUES (${partner},${event.event_id},${event.sequence},${event.type},${JSON.stringify(event)},FALSE,NOW())
        ON CONFLICT (partner_id,event_id) DO UPDATE SET payload=zex_webhook_inbox.payload
        WHERE zex_webhook_inbox.payload=EXCLUDED.payload RETURNING event_id`;
      if (!saved.length) throw new Error('Conflicting ZEX event ID');
    }
    await sql`UPDATE zex_recovery_checkpoints SET last_cursor=${page.next_cursor},updated_at=NOW() WHERE partner_id=${partner}`;
  }, { serialize: true });
  return { received: page.events.length, hasMore: page.has_more };
}

export async function recoverZex({ runTransaction = transaction, fetchPage = fetch, deadline = Infinity } = {}) {
  const partner = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
  let page;
  let feedError;
  try { page = await pullRecoveryPage({ runTransaction, fetchPage }); }
  catch (error) { feedError = error; }
  // Previously accepted webhook events must not wait for an upstream feed outage.
  const { processed, failed } = await drainPending({ runTransaction, partner, deadline });
  await runTransaction(sql => expireDueSubscriptions(sql, partner), { serialize: true });
  if (feedError) throw feedError;
  return { ...page, processed, failed };
}

export async function recordZexEvent(event, runTransaction = transaction) {
  const rows = await runTransaction(sql => sql`INSERT INTO zex_webhook_inbox(partner_id,event_id,sequence,event_type,payload,processed,created_at)
    VALUES (${event.partner_id},${event.event_id},${event.sequence},${event.type},${JSON.stringify(event)},FALSE,NOW())
    ON CONFLICT(partner_id,event_id) DO UPDATE SET payload=zex_webhook_inbox.payload
    WHERE zex_webhook_inbox.payload=EXCLUDED.payload RETURNING event_id`);
  if (!rows.length) throw new Error('Conflicting ZEX event ID');
}
