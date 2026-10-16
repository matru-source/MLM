import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

/**
 * 1. Compute SHA-256 hash of random callback state
 */
export function hashState(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * 2. Generate random 32-byte cryptographic state string
 */
export function generateRandomState() {
  return randomBytes(32).toString('base64url');
}

/**
 * 3. Constant-time comparison between provided state and stored hash
 */
export function callbackStateMatches(provided, storedHash) {
  if (typeof provided !== 'string' || typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/.test(storedHash)) {
    return false;
  }
  const providedHash = hashState(provided);
  return timingSafeEqual(Buffer.from(providedHash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * 4. Read raw request bytes before JSON parsing (max 64KB)
 */
export async function readRawWebhook(request, maxBytes = 64 * 1024) {
  if (!request.body) throw new Error('Webhook body required');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('Webhook body too large');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

/**
 * 5. Verify ZEX Webhook HMAC-SHA256 Signature and Payload Envelope
 */
export function verifyZexWebhook(rawBody, headers, secret, expectedPartner, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length > 64 * 1024 || typeof secret !== 'string' || secret.length < 32 || !expectedPartner) {
    throw new Error('Invalid webhook configuration or body');
  }

  const getHeader = (name) => {
    if (typeof headers.get === 'function') return headers.get(name);
    return headers[name.toLowerCase()] || headers[name];
  };

  const id = getHeader('X-Zex-Webhook-Id');
  const timestamp = getHeader('X-Zex-Webhook-Timestamp');
  const signature = getHeader('X-Zex-Webhook-Signature');

  if (!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
    || !timestamp || !/^[1-9][0-9]{0,11}$/.test(timestamp)
    || !signature || !/^v1=[a-f0-9]{64}$/.test(signature)) {
    throw new Error('Invalid webhook headers');
  }

  const deliveredAt = Number(timestamp);
  if (!Number.isSafeInteger(deliveredAt) || Math.abs(nowSeconds - deliveredAt) > 300) {
    throw new Error('Webhook timestamp outside acceptance window (5 minutes)');
  }

  const expected = createHmac('sha256', secret).update(timestamp).update('.').update(rawBody).digest();
  const received = Buffer.from(signature.slice(3), 'hex');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error('Invalid webhook signature');
  }

  const event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
  if (!event || event.event_id !== id || event.partner_id !== expectedPartner || event.version !== 1
    || !Number.isSafeInteger(event.sequence) || event.sequence <= 0
    || typeof event.type !== 'string' || typeof event.external_member_id !== 'string'
    || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(event.external_member_id)
    || typeof event.occurred_at !== 'string' || !Number.isFinite(Date.parse(event.occurred_at))
    || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    throw new Error('Invalid webhook envelope');
  }

  return event;
}

/**
 * 6. Helper: Sign an Event (for integration testing and simulation)
 */
export function signZexWebhook(eventPayload, secret, timestampSeconds = Math.floor(Date.now() / 1000)) {
  const rawBody = Buffer.from(typeof eventPayload === 'string' ? eventPayload : JSON.stringify(eventPayload));
  const tsStr = String(timestampSeconds);
  const signatureHex = createHmac('sha256', secret).update(tsStr).update('.').update(rawBody).digest('hex');
  return {
    rawBody,
    headers: {
      'Content-Type': 'application/json',
      'X-Zex-Webhook-Id': eventPayload.event_id,
      'X-Zex-Webhook-Timestamp': tsStr,
      'X-Zex-Webhook-Signature': `v1=${signatureHex}`
    }
  };
}
