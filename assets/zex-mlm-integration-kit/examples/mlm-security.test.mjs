import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { callbackStateMatches, hashState, readRawWebhook, verifyZexWebhook } from "./mlm-security.mjs";

const secret = "fixture-only-signing-secret-do-not-use-in-production";
const now = 1_800_000_000;
const event = { event_id: "65bf8735-bdaf-44c1-8979-635d06d48bf5", sequence: 1, version: 1, partner_id: "test-partner", external_member_id: "MEMBER-42", occurred_at: "2026-10-15T12:00:00Z", type: "subscription.updated", data: {} };
const raw = Buffer.from(JSON.stringify(event));
function headers(body = raw, timestamp = String(now)) {
  return new Headers({ "X-Zex-Webhook-Id": event.event_id, "X-Zex-Webhook-Timestamp": timestamp, "X-Zex-Webhook-Signature": "v1=" + createHmac("sha256", secret).update(timestamp).update(".").update(body).digest("hex") });
}

test("accepts an exact signed body for the configured partner", () => {
  assert.deepEqual(verifyZexWebhook(raw, headers(), secret, "test-partner", now), event);
});
test("rejects changed bytes and a wrong partner", () => {
  assert.throws(() => verifyZexWebhook(Buffer.concat([raw, Buffer.from(" ")]), headers(), secret, "test-partner", now));
  assert.throws(() => verifyZexWebhook(raw, headers(), secret, "different-partner", now));
});
test("rejects a stale delivery timestamp and a changed header event ID", () => {
  assert.throws(() => verifyZexWebhook(raw, headers(raw, String(now - 301)), secret, "test-partner", now));
  const changed = headers(); changed.set("X-Zex-Webhook-Id", "11bf8735-bdaf-44c1-8979-635d06d48bf5");
  assert.throws(() => verifyZexWebhook(raw, changed, secret, "test-partner", now));
});
test("matches callback state hashes without accepting another session's state", () => {
  assert.equal(callbackStateMatches("browser-session-state", hashState("browser-session-state")), true);
  assert.equal(callbackStateMatches("another-state", hashState("browser-session-state")), false);
});
test("reads the original request bytes and rejects excessive body sizes", async () => {
  const request = () => new Request("https://portal.example.invalid/webhook", { method: "POST", body: raw });
  assert.deepEqual(await readRawWebhook(request()), raw);
  await assert.rejects(readRawWebhook(request(), 1));
});
