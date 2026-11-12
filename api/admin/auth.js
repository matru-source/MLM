import { timingSafeEqual } from 'node:crypto';
import { transaction } from '../../server/database.js';
import { checkOrigin, readBody, fail, signSession, verifySession, setSessionCookie, cookie, HttpError, secret } from '../../server/security.js';
import { ensureAuthTables, rateLimit } from '../../server/verification.js';

export function verifyAdminToken(token) { return Boolean(verifySession(token, 'admin')); }
export function createAdminHandler(runTransaction = transaction) {
return async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    checkOrigin(req);
    res.setHeader('Cache-Control', 'no-store');
    secret();
    const body = readBody(req);
    if (body.action === 'logout') {
      setSessionCookie(res, 'cs_admin', '', 0);
      return res.status(200).json({ ok: true });
    }
    if (body.action === 'verify') {
      const valid = verifyAdminToken(cookie(req, 'cs_admin'));
      return res.status(valid ? 200 : 401).json({ ok: valid, valid });
    }
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) throw new HttpError(503, 'Administrator login is not configured');
    const username = String(body.username || '').trim().toLowerCase();
    const allowed = await runTransaction(async sql => {
      await ensureAuthTables(sql);
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
      return rateLimit(sql, 'admin:' + ip, 5, 900);
    });
    if (!allowed) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
    const provided = Buffer.from(String(body.password || ''));
    const expected = Buffer.from(process.env.ADMIN_PASSWORD);
    if (username !== process.env.ADMIN_USERNAME.trim().toLowerCase() || provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new HttpError(401, 'Invalid administrator credentials');
    setSessionCookie(res, 'cs_admin', signSession({ role: 'admin', sub: username }));
    return res.status(200).json({ ok: true });
  } catch (error) { return fail(res, error); }
}

}
export default createAdminHandler();
