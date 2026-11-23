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
  if (!actor) {
    if (req.headers?.accept?.includes('text/html')) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="3;url=${portalOrigin}/?relogin=true">
            <title>Session Expired • CyberNetworking</title>
            <style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0B1120; color: #F8FAFC; text-align: center; } .box { background: #1E293B; padding: 32px 40px; border-radius: 16px; border: 1px solid #334155; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); } a { color: #38BDF8; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 16px; }</style>
          </head>
          <body>
            <div class="box">
              <h2 style="margin-top:0;">Session Expired During ZEX Link</h2>
              <p style="color: #94A3B8; font-size: 14px;">Your browser session was paused. Redirecting to CyberNetworking in 3 seconds...</p>
              <a href="${portalOrigin}/">Click here to return to sign in ➔</a>
            </div>
          </body>
        </html>
      `);
    }
    return res.status(401).send('Please sign in and start linking again.');
  }
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
