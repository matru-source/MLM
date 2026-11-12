import { checkOrigin, readBody, requireSession, requireOwner, fail } from '../../../server/security.js';
import { getMemberZexStatus } from '../../../src/services/zexIntegrationService.js';

export default async function handler(req, res) {
  try {
    checkOrigin(req);
    req.body = readBody(req);
    const actor = requireSession(req);
    const target = req.body.memberId || req.body.member_id || req.query?.memberId || req.query?.member_id;
    requireOwner(actor, target);
    res.setHeader('Cache-Control', 'no-store');
  } catch (error) { return fail(res, error); }
  const memberId = req.query.member_id || req.body?.memberId;
  if (!memberId) {
    return res.status(400).json({ error: 'member_id query param is required' });
  }

  try {
    const status = await getMemberZexStatus(memberId);
    return res.status(200).json({ 
      ok: true, 
      linked: Boolean(status?.linked), 
      data: status?.data || null, 
      status 
    });
  } catch (err) {
    console.warn('[ZEX Status] Database unreachable, returning safe fallback status:', err.message);
    return res.status(503).json({ ok: false, error: 'Unable to check account link. Please retry.' });
  }
}
