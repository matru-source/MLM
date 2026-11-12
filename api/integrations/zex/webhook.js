import { verifyZexWebhook } from '../../../src/lib/zexSecurity.js';
import { recordZexEvent, drainPending } from '../../../server/zexRecovery.js';
import { waitUntil } from '@vercel/functions';

export const config = {
  api: {
    bodyParser: false // Required to capture raw bytes for exact HMAC signature verification
  }
};

async function getRawBody(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let totalLength = 0;
  for await (const chunk of req) {
    totalLength += chunk.length;
    if (totalLength > maxBytes) {
      throw new Error('Webhook body too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, totalLength);
}

export function createWebhookHandler(recordEvent = recordZexEvent, schedule = waitUntil, runWorker = drainPending) {
return async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.MLM_WEBHOOK_SECRET || process.env.ZEX_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.length < 32 || webhookSecret === 'fixture-only-signing-secret-do-not-use-in-production') {
    return res.status(503).json({ error: 'Webhook verification is not configured' });
  }

  const partnerId = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  let event;
  try {
    event = verifyZexWebhook(rawBody, req.headers, webhookSecret, partnerId);
  } catch (err) {
    console.warn('[ZEX Webhook] Signature verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized', message: err.message });
  }

  try {
    // Acknowledge only after the immutable event has been durably stored.
    await recordEvent(event);
    // Vercel keeps the function alive for this work after the response. The
    // durable inbox and independent recovery scheduler remain the safety net.
    const work = Promise.resolve().then(() => runWorker({ partner: partnerId, memberId: event.external_member_id, limit: 5, deadline: Date.now() + 40000 }))
      .catch(() => console.error('[ZEX worker] Background processing could not complete'));
    try { schedule(work); } catch { console.error('[ZEX worker] Background scheduling unavailable'); }
    return res.status(200).json({ ok: true, event_id: event.event_id, accepted: true });
  } catch (err) {
    console.error('[ZEX Webhook] Processing error:', err);
    return res.status(503).json({ error: 'Internal processing error' });
  }
}
}
export default createWebhookHandler();
