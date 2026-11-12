import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/auth/dispatch.js';

test('shared authentication function preserves routes and rejects query overrides', async () => {
  for (const path of ['member', 'send-otp', 'verify-otp', 'unknown']) {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method: 'GET', url: `/api/auth/${path}?action=member`, query: { action: 'member' } }, res);
    assert.equal(res.code, path === 'unknown' ? 404 : 405);
    assert.equal(typeof res.body, 'object');
  }
});
