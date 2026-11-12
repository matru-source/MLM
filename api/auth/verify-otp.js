import { transaction } from '../../server/database.js';
import { checkOrigin, readBody, fail, signSession, setSessionCookie, HttpError } from '../../server/security.js';
import { normalizeEmail, otpHash, ensureAuthTables } from '../../server/verification.js';

export function createVerifyOtpHandler(runTransaction = transaction) {
return async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    checkOrigin(req);
    res.setHeader('Cache-Control', 'no-store');
    const { email: input, enteredOtp } = readBody(req);
    const email = normalizeEmail(input);
    const challenge = await runTransaction(async sql => {
      await ensureAuthTables(sql);
      const rows = await sql`UPDATE auth_challenges SET attempts = attempts + 1
        WHERE email = ${email} AND expires_at > NOW() AND attempts < 5 AND verified = FALSE RETURNING *`;
      const row = rows[0];
      if (!row || !/^\d{6}$/.test(String(enteredOtp)) || row.code_hash !== otpHash(row.id, enteredOtp)) return null;
      await sql`UPDATE auth_challenges SET verified = TRUE WHERE email = ${email}`;
      return row;
    });
    if (!challenge) throw new HttpError(400, 'Invalid or expired code. Request another code if necessary.');
    setSessionCookie(res, 'cs_verified', signSession({ role: 'email', sub: email, id: challenge.id }, 600), 600);
    return res.status(200).json({ ok: true, success: true });
  } catch (error) { return fail(res, error); }
}

}
export default createVerifyOtpHandler();
