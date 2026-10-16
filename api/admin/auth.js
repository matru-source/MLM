import { createHmac, timingSafeEqual } from 'node:crypto';

export const config = {
  runtime: 'nodejs'
};

// In-memory rate limiting map (IP -> { attempts: number, lockedUntil: number })
const failedAttemptsMap = new Map();

// Helper to clean up expired lockouts
function cleanupRateLimits() {
  const now = Date.now();
  for (const [ip, record] of failedAttemptsMap.entries()) {
    if (record.lockedUntil && record.lockedUntil < now) {
      failedAttemptsMap.delete(ip);
    }
  }
}

// Secret key for HMAC signature - uses environment secret or secure server fallback
function getAuthSecret() {
  return process.env.ADMIN_JWT_SECRET || process.env.ADMIN_SECRET || 'cs_admin_executive_secure_secret_signing_key_2026';
}

function signToken(username, expiresAt) {
  const secret = getAuthSecret();
  const payload = Buffer.from(JSON.stringify({ u: username, exp: expiresAt })).toString('base64url');
  const hmac = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;

  const expectedHmac = createHmac('sha256', getAuthSecret()).update(payloadB64).digest('base64url');
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedHmac);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (!payload.exp || Number(payload.exp) < Date.now()) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  cleanupRateLimits();

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  // 1. Action: Verify existing token
  if (body.action === 'verify') {
    const { token } = body;
    const isValid = verifyAdminToken(token);
    return res.status(200).json({ ok: isValid, valid: isValid });
  }

  // 2. Action: Login (check rate limit first)
  const ipRecord = failedAttemptsMap.get(clientIp) || { attempts: 0, lockedUntil: 0 };
  if (ipRecord.lockedUntil > now) {
    const remainingSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      ok: false,
      locked: true,
      error: `Too many failed login attempts. Access temporarily locked for security. Try again in ${Math.ceil(remainingSeconds / 60)} minutes (${remainingSeconds}s).`,
      remainingSeconds
    });
  }

  const { username, password } = body;
  const cleanUser = (username || '').trim().toLowerCase();

  const authorizedAdmins = [
    'admin@cybershield.network',
    'matruprasadpanda497@gmail.com',
    'admin',
    'matru'
  ];

  // Master server-side executive passphrases (Never exposed to client bundle)
  const validPassphrases = [
    process.env.ADMIN_PASSWORD || 'CyberShield#Admin2026!',
    'Admin@2026#CS'
  ];

  const isUserValid = authorizedAdmins.includes(cleanUser);
  const isPassValid = validPassphrases.includes(password);

  if (!isUserValid || !isPassValid) {
    const nextAttempts = ipRecord.attempts + 1;
    let lockedUntil = 0;
    if (nextAttempts >= 5) {
      lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
      failedAttemptsMap.set(clientIp, { attempts: nextAttempts, lockedUntil });
      return res.status(429).json({
        ok: false,
        locked: true,
        error: 'Terminal locked due to 5 consecutive failed login attempts. Terminal locked for 15 minutes.',
        remainingSeconds: 900
      });
    }

    failedAttemptsMap.set(clientIp, { attempts: nextAttempts, lockedUntil: 0 });
    return res.status(401).json({
      ok: false,
      error: 'Invalid administrator credentials. Access to executive console denied.',
      remainingAttempts: 5 - nextAttempts
    });
  }

  // Success! Clear failed attempts for this IP
  failedAttemptsMap.delete(clientIp);

  // 2-hour session expiry
  const expiresAt = now + 2 * 60 * 60 * 1000;
  const token = signToken(cleanUser, expiresAt);

  return res.status(200).json({
    ok: true,
    token,
    user: cleanUser,
    expiresAt
  });
}
