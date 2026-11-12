import { timingSafeEqual } from 'node:crypto';
import { recoverZex } from '../../../server/zexRecovery.js';
import { recordRecoveryResult, zexHealth, sendRecoveryAlert } from '../../../server/zexMonitoring.js';
import { transaction } from '../../../server/database.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({ ok: false, error: 'Recovery is not configured' });
  const presented = Buffer.from(String(req.headers.authorization || ''));
  const expected = Buffer.from('Bearer ' + secret);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) return res.status(401).json({ ok: false });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false });
  const partner = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
  try {
    const totals = { received: 0, processed: 0, failed: 0, hasMore: false };
    const deadline = Date.now() + 40000;
    for (let page = 0; page < 10; page++) {
      const result = await recoverZex({ deadline });
      totals.received += result.received; totals.processed += result.processed; totals.failed += result.failed;
      totals.hasMore = result.hasMore;
      if (!result.hasMore || Date.now() >= deadline) break;
    }
    await recordRecoveryResult(partner, totals.failed === 0 && !totals.hasMore);
    const health = await transaction(sql => zexHealth(sql, partner));
    if (!health.healthy) await sendRecoveryAlert(partner, health).catch(() => console.error('[ZEX monitoring] Alert delivery failed'));
    return res.status(totals.failed || totals.hasMore ? 503 : 200).json({ ok: !totals.failed && !totals.hasMore, ...totals });
  } catch (error) {
    console.error('[ZEX recovery]', error.message);
    await recordRecoveryResult(partner, false).catch(() => {});
    await sendRecoveryAlert(partner, { pending: null, failed: null, repeatedly_failed: null }).catch(() => console.error('[ZEX monitoring] Alert delivery failed'));
    return res.status(503).json({ ok: false, error: 'ZEX recovery failed' });
  }
}
