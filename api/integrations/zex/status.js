import { getMemberZexStatus } from '../../../src/services/zexIntegrationService.js';

export default async function handler(req, res) {
  const memberId = req.query.member_id || req.body?.memberId;
  if (!memberId) {
    return res.status(400).json({ error: 'member_id query param is required' });
  }

  try {
    const status = await getMemberZexStatus(memberId);
    return res.status(200).json({ ok: true, status });
  } catch (err) {
    console.warn('[ZEX Status] Database unreachable, returning safe fallback status:', err.message);
    return res.status(200).json({ 
      ok: true, 
      status: { linked: false, dbConnected: false }, 
      warning: 'Database service is currently unconfigured or offline' 
    });
  }
}
