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

  // Guessable Webhook Secret Fix:
  // Strictly require a private 32+ character webhook secret and reject public default fixture secret
  const INSECURE_DEFAULT_SECRET = 'fixture-only-signing-secret-do-not-use-in-production';
  const webhookSecret = process.env.MLM_WEBHOOK_SECRET || process.env.ZEX_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[ZEX Webhook] Secure webhook secret (MLM_WEBHOOK_SECRET) is not configured.');
    return res.status(503).json({
      error: 'Configuration Error',
      message: 'MLM_WEBHOOK_SECRET is not configured in server environment. Webhooks are disabled for security.'
    });
  }

  if (webhookSecret === INSECURE_DEFAULT_SECRET) {
    console.error('[ZEX Webhook] Insecure public test secret detected. Refusing to accept webhooks with guessable secret.');
    return res.status(503).json({
      error: 'Security Error',
      message: 'Public test fixture secret is not permitted. Configure a unique, private cryptographic secret.'
    });
  }

  if (webhookSecret.length < 32) {
    console.error('[ZEX Webhook] Secret key too short (minimum 32 characters required).');
    return res.status(503).json({
      error: 'Security Error',
      message: 'MLM_WEBHOOK_SECRET must be at least 32 characters long.'
    });
  }

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
