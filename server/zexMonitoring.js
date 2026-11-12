import { transaction } from './database.js';

export function alertDeliveryConfigured() {
  if (process.env.ZEX_ALERT_WEBHOOK_URL) {
    try {
      const url = new URL(process.env.ZEX_ALERT_WEBHOOK_URL);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch { return false; }
  }
  return Boolean(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ZEX_ALERT_EMAIL || '') && process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export async function recordRecoveryResult(partner, ok, runTransaction = transaction) {
  await runTransaction(sql => sql`INSERT INTO zex_monitor_runs(partner_id,last_attempt_at,last_success_at,last_error_code)
    VALUES (${partner},NOW(),${ok ? new Date().toISOString() : null},${ok ? null : 'recovery_failed'})
    ON CONFLICT(partner_id) DO UPDATE SET last_attempt_at=NOW(),
      last_success_at=CASE WHEN ${ok} THEN NOW() ELSE zex_monitor_runs.last_success_at END,
      last_error_code=${ok ? null : 'recovery_failed'}`);
}

export async function zexHealth(sql, partner) {
  const rows = await sql`SELECT count(*)::int AS pending,
      count(*) FILTER (WHERE attempts > 0)::int AS failed,
      count(*) FILTER (WHERE attempts >= 5)::int AS repeatedly_failed,
      MIN(created_at) AS oldest_pending_at
    FROM zex_webhook_inbox WHERE partner_id=${partner} AND processed=FALSE`;
  const monitor = await sql`SELECT last_attempt_at,last_success_at,last_error_code FROM zex_monitor_runs WHERE partner_id=${partner}`;
  const checkpoint = await sql`SELECT last_cursor,updated_at FROM zex_recovery_checkpoints WHERE partner_id=${partner}`;
  const count = rows[0];
  const lastSuccess = monitor[0]?.last_success_at || null;
  const staleRecovery = !lastSuccess || Date.now() - new Date(lastSuccess).getTime() > 20 * 60 * 1000;
  const oldPending = count.oldest_pending_at && Date.now() - new Date(count.oldest_pending_at).getTime() > 20 * 60 * 1000;
  return { healthy: !staleRecovery && !oldPending && !count.repeatedly_failed && !monitor[0]?.last_error_code,
    pending: count.pending, failed: count.failed, repeatedly_failed: count.repeatedly_failed,
    oldest_pending_at: count.oldest_pending_at, last_attempt_at: monitor[0]?.last_attempt_at || null,
    last_success_at: lastSuccess, last_error_code: monitor[0]?.last_error_code || null,
    recovery_cursor: checkpoint[0]?.last_cursor || 0 };
}

// Optional operator-owned webhook: only aggregate counts and a generic message
// leave the application. Alerts are rate limited and failures remain retryable.
export async function sendRecoveryAlert(partner, health, { runTransaction = transaction, send = fetch } = {}) {
  const configured = process.env.ZEX_ALERT_WEBHOOK_URL;
  const email = process.env.ZEX_ALERT_EMAIL?.trim();
  if (!configured && !email) { console.error('[ZEX monitoring] Alert delivery is not configured'); return false; }
  let url;
  try { url = new URL(configured || 'https://api.brevo.com/v3/smtp/email'); } catch { throw new Error('Alert endpoint is invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Alert endpoint is invalid');
  if (!configured && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL)) throw new Error('Alert email is not configured');
  const rows = await runTransaction(sql => sql`UPDATE zex_monitor_runs SET last_alert_at=NOW()
    WHERE partner_id=${partner} AND (last_alert_at IS NULL OR last_alert_at < NOW() - INTERVAL '15 minutes') RETURNING partner_id`);
  if (!rows.length) return false;
  try {
    const details = `ZEX event recovery needs attention. Pending: ${health.pending ?? 'unknown'}; failed: ${health.failed ?? 'unknown'}; repeatedly failed: ${health.repeatedly_failed ?? 'unknown'}.`;
    const response = await send(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', ...(!configured ? { 'api-key': process.env.BREVO_API_KEY } : {}) },
      body: JSON.stringify(configured ? { text: details, pending: health.pending, failed: health.failed, repeatedly_failed: health.repeatedly_failed }
        : { sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'CyberNetworking' }, to: [{ email }], subject: 'ZEX integration needs attention', textContent: details }) });
    if (!response.ok) throw new Error('Alert delivery rejected');
    return true;
  } catch {
    await runTransaction(sql => sql`UPDATE zex_monitor_runs SET last_alert_at=NULL WHERE partner_id=${partner}`);
    throw new Error('Alert delivery failed');
  }
}
