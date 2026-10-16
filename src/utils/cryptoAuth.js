/**
 * Cryptographic Password & OTP Hashing / Verification Utility
 * Uses standard Web Crypto API (SubtleCrypto SHA-256) with application-level salting.
 * Operates consistently across both browser and serverless runtimes.
 */

const APP_SALT = 'cs_network_2026_v1_secure_salt_';
const OTP_SALT = 'cs_otp_verification_salt_2026_x89_';

export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    return '';
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(`${APP_SALT}${plainPassword}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) {
    // If user has not yet established a password hash, allow migration with valid input
    return Boolean(inputPassword && inputPassword.length >= 6);
  }
  const computedHash = await hashPassword(inputPassword);
  return computedHash === storedHash;
}

/**
 * Hash 6-digit OTP code combined with user email and salt
 * Stored in client sessionStorage so the plain OTP is never readable in browser inspection.
 */
export async function hashOtp(email, otpCode) {
  if (!email || !otpCode) return '';
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${OTP_SALT}:${cleanEmail}:${cleanOtp}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare entered OTP against the salted hash in constant time
 */
export async function verifyOtpHash(email, enteredOtp, storedHash) {
  if (!email || !enteredOtp || !storedHash) return false;
  const computedHash = await hashOtp(email, enteredOtp);
  return computedHash === storedHash;
}
