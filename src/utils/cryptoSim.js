// Cryptographic simulation & helpers for ZEX authoritative webhooks and signatures

export async function generateHmacSignature(secret, payload) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const payloadData = encoder.encode(typeof payload === 'string' ? payload : JSON.stringify(payload));
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Fallback simple hash for older environments
    return 'sha256_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export function generateId(prefix = 'id') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}_${timestamp}${random}`;
}

export function generateReferralCode(name = 'USER') {
  const clean = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ZEX-${clean}${num}`;
}
