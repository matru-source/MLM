import { transaction } from '../../server/database.js';
import { checkOrigin, readBody, fail, signSession, setSessionCookie, HttpError, passwordMatches, hashPassword, redact, cookie, verifySession } from '../../server/security.js';
import { normalizeEmail, ensureAuthTables, rateLimit, consumeVerification } from '../../server/verification.js';

export function createMemberHandler(runTransaction = transaction) {
return async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    checkOrigin(req);
    res.setHeader('Cache-Control', 'no-store');
    const body = readBody(req);
    if (body.action === 'logout') {
      setSessionCookie(res, 'cs_member', '', 0);
      return res.status(200).json({ ok: true });
    }
    if (body.action === 'session') {
      const actor = verifySession(cookie(req, 'cs_member'), 'member');
      if (!actor) throw new HttpError(401, 'Please sign in');
      return res.status(200).json({ ok: true, memberId: actor.sub });
    }
    const email = normalizeEmail(body.email);
    const outcome = await runTransaction(async sql => {
      await ensureAuthTables(sql);
      if (!await rateLimit(sql, `login:${email}`, 10, 900)) return { limited: true };
      if (body.action === 'reset_password') {
        await consumeVerification(sql, req, email);
        const password = hashPassword(body.newPassword);
        const rows = await sql`UPDATE members SET password = ${password} WHERE LOWER(email) = ${email} RETURNING id`;
        if (!rows.length) throw new HttpError(400, 'Unable to reset this account');
        return { reset: true };
      }
      if (body.action !== 'login') throw new HttpError(400, 'Unknown action');
      const rows = await sql`SELECT * FROM members WHERE LOWER(email) = ${email} LIMIT 1`;
      const member = rows[0];
      if (!member || !passwordMatches(body.password, member.password)) return { invalid: true };
      if (!member.password.startsWith('scrypt$') && body.password.length >= 8) {
        await sql`UPDATE members SET password = ${hashPassword(body.password)} WHERE id = ${member.id}`;
      }
      return { member: redact({ ...member, member_id: member.id, kyc: member.kyc_data }) };
    });
    if (outcome.limited) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
    if (outcome.invalid) throw new HttpError(401, 'Incorrect email or password');
    if (outcome.reset) {
      setSessionCookie(res, 'cs_verified', '', 0);
      setSessionCookie(res, 'cs_member', '', 0);
    } else {
      setSessionCookie(res, 'cs_member', signSession({ role: 'member', sub: outcome.member.id }));
    }
    return res.status(200).json({ ok: true, member: outcome.member });
  } catch (error) { return fail(res, error); }
}

}
export default createMemberHandler();
