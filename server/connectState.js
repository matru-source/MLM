import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { secret } from './security.js';

function key() { return createHash('sha256').update('zex-connect-intent-v1:').update(secret()).digest(); }
export function sealState(state) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(state, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(part => part.toString('base64url')).join('.');
}
export function unsealState(value) {
  const parts = String(value || '').split('.').map(part => Buffer.from(part, 'base64url'));
  if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16) throw new Error('Invalid connection state');
  const decipher = createDecipheriv('aes-256-gcm', key(), parts[0]);
  decipher.setAuthTag(parts[1]);
  return Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString('utf8');
}
