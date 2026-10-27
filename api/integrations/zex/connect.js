import { createConnectAttempt } from '../../../src/services/zexIntegrationService.js';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};

export default async function handler(req, res) {
  // Support both POST and GET (for browser links / redirects)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Robust body & query parsing
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const memberId = body?.memberId || body?.member_id || req.query?.memberId || req.query?.member_id;
  if (!memberId) {
    return res.status(400).json({ error: 'memberId is required in request body or query parameter' });
  }

  const portalOrigin = process.env.PORTAL_ORIGIN || 'https://cybernetworking.vercel.app';
  const callbackUrl = `${portalOrigin}/api/integrations/zex/callback`;

  try {
    const attempt = await createConnectAttempt({
      memberId,
      callbackUrl
    });

    // If accessed via GET in browser, redirect directly to ZEX Connect page!
    if (req.method === 'GET' && req.query?.redirect === 'true' && attempt.connectUrl) {
      return res.redirect(303, attempt.connectUrl);
    }

    return res.status(200).json({
      ok: true,
      request_id: attempt.requestId,
      connect_url: attempt.connectUrl,
      expires_at: attempt.expiresAt
    });
  } catch (err) {
    console.warn('[ZEX Connect] Error initiating connection:', err.message);
    const fallbackId = `req_${Date.now()}`;
    const connectUrl = `${process.env.MLM_CONNECT_PAGE_URL || 'https://zex4u.com/connect/mlm'}#request=${fallbackId}`;
    return res.status(200).json({
      ok: true,
      request_id: fallbackId,
      connect_url: connectUrl,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      warning: 'Operating in fallback session mode'
    });
  }
}
