import { timingSafeEqual } from 'node:crypto';
import { transaction } from '../../../server/database.js';
import { cookie, verifySession } from '../../../server/security.js';
import { zexHealth } from '../../../server/zexMonitoring.js';

export function createHealthHandler(runTransaction = transaction) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ ok: false });
    const admin = verifySession(cookie(req, 'cs_admin'), 'admin');
    const secret = process.env.CRON_SECRET;
    const actual = Buffer.from(String(req.headers.authorization || ''));
    const expected = Buffer.from('Bearer ' + (secret || ''));
    const monitorAuthorized = secret && secret.length >= 32 && actual.length === expected.length && timingSafeEqual(actual, expected);
    if (!admin && !monitorAuthorized) return res.status(401).json({ ok: false });
    try {
      const partner = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
      const result = await runTransaction(sql => zexHealth(sql, partner));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(result.healthy ? 200 : 503).json({ ok: result.healthy, ...result });
    } catch { return res.status(503).json({ ok: false, error: 'Health check unavailable' }); }
  };
}
export default createHealthHandler();
