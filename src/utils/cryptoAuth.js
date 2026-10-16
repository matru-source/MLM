/**
 * Cryptographic Password Hashing & Verification Utility
 * Uses standard Web Crypto API (SubtleCrypto SHA-256) with application-level salting.
 * Operates consistently across both browser and serverless runtimes.
 */

const APP_SALT = 'cs_network_2026_v1_secure_salt_';

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
