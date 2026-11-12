import { createHmac } from 'node:crypto';
import { cookie, verifySession, secret, HttpError } from './security.js';

export async function ensureAuthTables(sql) {
  await sql`CREATE TABLE IF NOT EXISTS auth_challenges (
    email TEXT PRIMARY KEY, id TEXT NOT NULL, code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE
  )`;
  await sql`CREATE TABLE IF NOT EXISTS auth_rate_limits (
    key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
  )`;
}
export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
  return email;
}
export function otpHash(id, code) { return createHmac('sha256', secret()).update(`${id}:${code}`).digest('hex'); }
export async function rateLimit(sql, key, limit, seconds) {
  const rows = await sql`INSERT INTO auth_rate_limits (key, count, expires_at)
    VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN auth_rate_limits.expires_at <= NOW() THEN 1 ELSE auth_rate_limits.count + 1 END,
      expires_at = CASE WHEN auth_rate_limits.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE auth_rate_limits.expires_at END
    RETURNING count`;
  return rows[0].count <= limit;
}
export async function consumeVerification(sql, req, email) {
  const grant = verifySession(cookie(req, 'cs_verified'), 'email');
  if (!grant || grant.sub !== email) throw new HttpError(403, 'Verify your email first');
  const rows = await sql`DELETE FROM auth_challenges WHERE email = ${email} AND id = ${grant.id}
    AND verified = TRUE AND expires_at > NOW() RETURNING email`;
  if (!rows.length) throw new HttpError(403, 'Verification expired or already used');
}
