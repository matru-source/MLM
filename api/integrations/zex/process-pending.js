import { checkOrigin, cookie, verifySession, fail, HttpError } from '../../../server/security.js';
import { drainPending } from '../../../server/zexRecovery.js';
import { transaction } from '../../../server/database.js';
import { rateLimit } from '../../../server/verification.js';

export function createMemberWorker(runWorker = drainPending, runTransaction = transaction) {
  return async function handler(req, res) {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
      checkOrigin(req);
      const actor = verifySession(cookie(req, 'cs_member'), 'member');
      if (!actor) throw new HttpError(401, 'Please sign in');
      const allowed = await runTransaction(sql => rateLimit(sql, `zex-worker:${actor.sub}`, 8, 60));
      if (!allowed) throw new HttpError(429, 'Please wait before checking again');
      const partner = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
      await runWorker({ partner, memberId: actor.sub, limit: 5 });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true });
    } catch (error) { return fail(res, error); }
  };
}
export default createMemberWorker();
