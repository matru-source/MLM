import member from '../../server/auth/member.js';
import sendOtp from '../../server/auth/send-otp.js';
import verifyOtp from '../../server/auth/verify-otp.js';

const handlers = new Map([['member', member], ['send-otp', sendOtp], ['verify-otp', verifyOtp]]);

export default function handler(req, res) {
  // Dispatch from the URL path, never from a caller-supplied query parameter.
  const path = new URL(req.url, 'https://portal.invalid').pathname;
  const action = /^\/api\/auth\/([^/]+)\/?$/.exec(path)?.[1];
  const target = handlers.get(action);
  if (!target) return res.status(404).json({ ok: false, error: 'Unknown authentication endpoint' });
  return target(req, res);
}
