import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hashState(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function callbackStateMatches(provided, storedHash) {
  if (typeof provided !== "string" || typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashState(provided), "hex"), Buffer.from(storedHash, "hex"));
}

// Use before request.json(), middleware JSON parsing or body reserialization.
export async function readRawWebhook(request, maxBytes = 64 * 1024) {
  if (!request.body) throw new Error("Webhook body required");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Webhook body too large"); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

export function verifyZexWebhook(rawBody, headers, secret, expectedPartner, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length > 64 * 1024 || typeof secret !== "string" || secret.length < 32 || !expectedPartner) throw new Error("Invalid webhook configuration or body");
  const id = headers.get("X-Zex-Webhook-Id");
  const timestamp = headers.get("X-Zex-Webhook-Timestamp");
  const signature = headers.get("X-Zex-Webhook-Signature");
  if (!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
    || !timestamp || !/^[1-9][0-9]{0,11}$/.test(timestamp)
    || !signature || !/^v1=[a-f0-9]{64}$/.test(signature)) throw new Error("Invalid webhook headers");
  const deliveredAt = Number(timestamp);
  if (!Number.isSafeInteger(deliveredAt) || Math.abs(nowSeconds - deliveredAt) > 300) throw new Error("Webhook timestamp outside acceptance window");
  const expected = createHmac("sha256", secret).update(timestamp).update(".").update(rawBody).digest();
  const received = Buffer.from(signature.slice(3), "hex");
  if (!timingSafeEqual(expected, received)) throw new Error("Invalid webhook signature");
  const event = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
  if (!event || event.event_id !== id || event.partner_id !== expectedPartner || event.version !== 1
    || !Number.isSafeInteger(event.sequence) || event.sequence <= 0
    || typeof event.type !== "string" || typeof event.external_member_id !== "string"
    || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(event.external_member_id)
    || typeof event.occurred_at !== "string" || !Number.isFinite(Date.parse(event.occurred_at))
    || !event.data || typeof event.data !== "object" || Array.isArray(event.data)) throw new Error("Invalid webhook envelope");
  // Validate the event-specific data against openapi.yaml before processing.
  return event;
}
