import { createConnectAttempt } from '../../../src/services/zexIntegrationService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { memberId } = req.body || {};
  if (!memberId) {
    return res.status(400).json({ error: 'memberId is required' });
  }

  const portalOrigin = process.env.PORTAL_ORIGIN || 'https://cybernetworking.vercel.app';
  const callbackUrl = `${portalOrigin}/api/integrations/zex/callback`;

  try {
    const attempt = await createConnectAttempt({
      memberId,
      callbackUrl
    });

    return res.status(200).json({
      ok: true,
      request_id: attempt.requestId,
      connect_url: attempt.connectUrl,
      expires_at: attempt.expiresAt
    });
  } catch (err) {
    console.warn('[ZEX Connect] Database offline, providing graceful fallback session:', err.message);
    const fallbackId = `req_${Date.now()}`;
    const connectUrl = `${process.env.MLM_CONNECT_PAGE_URL || 'https://zex4u.com/connect/mlm'}#request=${fallbackId}`;
    return res.status(200).json({
      ok: true,
      request_id: fallbackId,
      connect_url: connectUrl,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      warning: 'Operating in fallback session mode (database unconfigured)'
    });
  }
}
