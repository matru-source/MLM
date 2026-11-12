import { completeConnectAttempt, cancelConnectAttempt } from '../../../src/services/zexIntegrationService.js';
import { cookie, verifySession } from '../../../server/security.js';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Handle HTTP GET (browser redirect from ZEX connect page)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { request_id, state, code, error } = req.query;
  const portalOrigin = process.env.PORTAL_ORIGIN || 'https://cybernetworking.vercel.app';
  const actor = verifySession(cookie(req, 'cs_member'), 'member');
  if (!actor) return res.status(401).send('Please sign in and start linking again.');
  if ([request_id, state, code, error].some(value => value !== undefined && typeof value !== 'string')) return res.status(400).send('Invalid callback parameters.');
  if (req.url) {
    const query = new URL(req.url, portalOrigin).searchParams;
    if (['request_id', 'state', 'code', 'error'].some(key => query.getAll(key).length > 1)) return res.status(400).send('Invalid callback parameters.');
  }

  // 1. Handle user cancellation
  if (error === 'access_denied') {
    if (!request_id || !state || code) return res.status(400).send('Invalid callback parameters.');
    try {
      const outcome = await cancelConnectAttempt({ requestId: request_id, state, memberId: actor.sub });
      if (!outcome.ok) return res.status(400).send('Invalid connection request.');
    } catch { return res.status(400).send('Invalid connection request.'); }
    return res.redirect(303, `${portalOrigin}/#dashboard?connection=cancelled`);
  }

  // 2. Validate mandatory parameters
  if (!request_id || !state || !code || error) {
    return res.status(400).send('Invalid callback parameters. Both request_id, state, and code are required.');
  }

  try {
    const result = await completeConnectAttempt({
      requestId: request_id,
      code,
      state,
      memberId: actor.sub
    });

    if (!result.ok) {
      console.warn('[ZEX Callback] Verification failed:', result.error);
      return res.redirect(303, `${portalOrigin}/#dashboard?connection=failed&reason=${encodeURIComponent(result.error)}`);
    }

    // Success! Redirect to clean dashboard URL
    return res.redirect(303, `${portalOrigin}/#dashboard?connection=connected`);
  } catch (err) {
    console.error('[ZEX Callback] Internal error:', err);
    return res.redirect(303, `${portalOrigin}/#dashboard?connection=error`);
  }
}
