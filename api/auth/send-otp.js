import { randomInt, randomUUID } from 'node:crypto';
import { transaction } from '../../server/database.js';
import { checkOrigin, readBody, fail, HttpError, secret } from '../../server/security.js';
import { normalizeEmail, otpHash, ensureAuthTables, rateLimit } from '../../server/verification.js';

export function createSendOtpHandler(runTransaction = transaction) {
return async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    checkOrigin(req);
    res.setHeader('Cache-Control', 'no-store');
    secret();
    const email = normalizeEmail(readBody(req).email);
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) throw new HttpError(503, 'Email delivery is not configured');
    const id = randomUUID();
    const code = String(randomInt(100000, 1000000));
    const allowed = await runTransaction(async sql => {
      await ensureAuthTables(sql);
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
      const addressAllowed = await rateLimit(sql, 'otp:' + email, 1, 60);
      const ipAllowed = await rateLimit(sql, 'otp-ip:' + ip, 20, 3600);
      if (!addressAllowed || !ipAllowed) return false;
      await sql`INSERT INTO auth_challenges (email, id, code_hash, expires_at) VALUES (${email}, ${id}, ${otpHash(id, code)}, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, verified = FALSE`;
      return true;
    });
    if (!allowed) throw new HttpError(429, 'Please wait before requesting another code');
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
        body: JSON.stringify({ sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'CyberNetworking' },
          to: [{ email }], subject: 'Your verification code', textContent: 'Your verification code is ' + code + '. It expires in 10 minutes.' }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('Email provider rejected delivery');
    } catch {
      await runTransaction(sql => sql`DELETE FROM auth_challenges WHERE email = ${email} AND id = ${id}`);
      throw new HttpError(502, 'Email could not be sent. Please try again.');
    }
    return res.status(200).json({ ok: true, success: true, message: 'Verification email sent' });
  } catch (error) { return fail(res, error); }
}

}
export default createSendOtpHandler();
