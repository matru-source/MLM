async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.error || 'Verification failed. Please retry.');
  return result;
}
export const getBrevoApiKey = () => '';
export const setBrevoApiKey = () => { throw new Error('Email credentials must be configured on the server'); };
export const getBrevoSenderEmail = () => '';
export const setBrevoSenderEmail = setBrevoApiKey;
export async function sendEmailOtp({ email }) { return post('/api/auth/send-otp', { email }); }
export async function verifyEmailOtp({ email, enteredOtp }) {
  try { return await post('/api/auth/verify-otp', { email, enteredOtp }); }
  catch (error) { return { success: false, reason: error.message }; }
}
