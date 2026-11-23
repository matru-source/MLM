import { randomInt, randomUUID } from 'node:crypto';
import { transaction } from '../database.js';
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
        body: JSON.stringify({ 
          sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'CyberNetworking' },
          to: [{ email }], 
          subject: `${code} is your CyberNetworking verification code`, 
          textContent: 'Your verification code is ' + code + '. It expires in 10 minutes.',
          htmlContent: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:28px 24px;border:1px solid #E2E8F0;border-radius:12px;background:#ffffff">
            <h2 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 12px 0">CyberNetworking Security Verification</h2>
            <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 20px 0">Use the 6-digit verification code below to verify your email address and continue:</p>
            <div style="background:#F1F5F9;border:1px solid #E2E8F0;padding:16px 20px;border-radius:8px;font-size:32px;font-weight:800;letter-spacing:6px;color:#2563EB;text-align:center;font-family:monospace;margin:0 0 20px 0">${code}</div>
            <p style="color:#64748B;font-size:12px;line-height:1.5;margin:0">This code expires in 10 minutes. If you did not request this verification, you can safely ignore this email.</p>
          </div>`
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('Email provider rejected delivery');
    } catch (error) {
      await runTransaction(sql => sql`DELETE FROM auth_challenges WHERE email = ${email} AND id = ${id}`);
      // Log only provider status/class, never the API key, OTP, or recipient address.
      console.error('[OTP email delivery failed]', error?.statusCode || error?.status || error?.name || 'provider_error');
      throw new HttpError(502, 'Email could not be sent. Please try again.');
    }
    return res.status(200).json({ ok: true, success: true, message: 'Verification email sent' });
  } catch (error) { return fail(res, error); }
}

}
export default createSendOtpHandler();
