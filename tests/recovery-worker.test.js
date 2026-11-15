import test from 'node:test';
import assert from 'node:assert/strict';
import { runRecovery } from '../operations/recovery-worker/worker.js';

test('scheduler checks recovery and health and refuses HTML or failed responses', async () => {
  const env = { CRON_SECRET: 'fixture-secret-with-at-least-32-characters' };
  const calls = [];
  await runRecovery(env, async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, `Bearer ${env.CRON_SECRET}`);
    return Response.json({ ok: true, healthy: true });
  });
  assert.equal(calls.length, 2);
  for (const response of [new Response('html'), Response.json({ok:false}), Response.json({}, {status:503})]) {
    await assert.rejects(runRecovery(env, async () => response));
  }
  await assert.rejects(runRecovery({}, async () => { throw new Error('must not send'); }), /secret missing/);
});
