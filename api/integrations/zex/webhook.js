import { verifyZexWebhook } from '../../../src/lib/zexSecurity.js';
import { processVerifiedWebhook } from '../../../src/services/zexIntegrationService.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.MLM_WEBHOOK_SECRET || process.env.ZEX_WEBHOOK_SECRET || 'fixture-only-signing-secret-do-not-use-in-production';
  const partnerId = process.env.MLM_PARTNER_ID || 'cybernetworking';

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
    // Process event and distribute commissions
    const outcome = await processVerifiedWebhook(event);
    return res.status(200).json({ ok: true, event_id: event.event_id, outcome });
  } catch (err) {
    console.error('[ZEX Webhook] Processing error:', err);
    return res.status(500).json({ error: 'Internal processing error' });
  }
}
