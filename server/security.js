import { createHmac, timingSafeEqual, randomBytes, scryptSync, createHash } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new HttpError(503, 'Authentication is not configured');
  return value;
}
export function signSession(claims, seconds = 7200) {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: Date.now() + seconds * 1000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function verifySession(token, role) {
  try {
    const [payload, signature, extra] = String(token || '').split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return claims.role === role && typeof claims.sub === 'string' && Number.isFinite(claims.exp) && claims.exp > Date.now() ? claims : null;
  } catch { return null; }
}
export function cookie(req, name) {
  return String(req.headers?.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);
}
export function setSessionCookie(res, name, value, seconds = 7200) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const item = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure}`;
  const previous = res.getHeader?.('Set-Cookie');
  res.setHeader('Set-Cookie', [...(previous ? (Array.isArray(previous) ? previous : [previous]) : []), item]);
}
export function principal(req) {
  return verifySession(cookie(req, 'cs_admin'), 'admin') || verifySession(cookie(req, 'cs_member'), 'member');
}
export function requireSession(req) {
  const actor = principal(req);
  if (!actor) throw new HttpError(401, 'Please sign in');
  return actor;
}
export function requireOwner(actor, memberId) {
  if (actor.role !== 'admin' && actor.sub !== memberId) throw new HttpError(403, 'Access denied');
}
export function checkOrigin(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  if (req.headers?.['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Cross-site request rejected');
  const origin = req.headers?.origin;
  if (origin) {
    const expected = process.env.PORTAL_ORIGIN || `http://${req.headers.host}`;
    if (new URL(origin).origin !== new URL(expected).origin) throw new HttpError(403, 'Origin not allowed');
  }
}
export function readBody(req) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
    return body;
  } catch { throw new HttpError(400, 'Invalid request body'); }
}
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpError(400, 'Password must contain 8–128 characters');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
export function passwordMatches(password, stored) {
  if (typeof password !== 'string' || password.length > 128 || !stored) return false;
  try {
    let actual;
    let expected;
    if (stored.startsWith('scrypt$')) {
      const [, salt, hash] = stored.split('$');
      actual = scryptSync(password, salt, 64);
      expected = Buffer.from(hash, 'hex');
    } else {
      actual = createHash('sha256').update(`cs_network_2026_v1_secure_salt_${password}`).digest();
      expected = Buffer.from(stored, 'hex');
    }
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token/i.test(key)).map(([key, val]) => [key, redact(val)]));
}
export function fail(res, error) {
  return res.status(error.status || 503).json({ ok: false, success: false, error: error.status ? error.message : 'Service unavailable. Please retry.' });
}
