export async function authRequest(path, body) {
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    return { ...result, ok: response.ok && result.ok };
  } catch { return { ok: false, error: 'Unable to reach the server. Please retry.' }; }
}
export async function lookupReferral(code) {
  try {
    const response = await fetch('/api/db/sync?type=referral&code=' + encodeURIComponent(code));
    const result = await response.json();
    return result.ok && result.data ? { valid: true, member: result.data } : { valid: false, message: 'Sponsor not found or inactive' };
  } catch { return { valid: false, message: 'Unable to verify sponsor. Please retry.' }; }
}
export async function checkEmailExists(email) {
  try {
    const response = await fetch('/api/db/sync?type=check_email&email=' + encodeURIComponent(email));
    const result = await response.json();
    return Boolean(result.ok && result.exists);
  } catch { return false; }
}
