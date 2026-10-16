import { completeConnectAttempt } from '../../../src/services/zexIntegrationService.js';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req, res) {
  // Handle HTTP GET (browser redirect from ZEX connect page)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { request_id, state, code, error } = req.query;
  const portalOrigin = process.env.PORTAL_ORIGIN || 'https://cybernetworking.vercel.app';

  // 1. Handle user cancellation
  if (error === 'access_denied') {
    return res.redirect(303, `${portalOrigin}/#dashboard?connection=cancelled`);
  }

  // 2. Validate mandatory parameters
  if (!request_id || !state || !code) {
    return res.status(400).send('Invalid callback parameters. Both request_id, state, and code are required.');
  }

  try {
    const result = await completeConnectAttempt({
      requestId: request_id,
      code,
      state
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
