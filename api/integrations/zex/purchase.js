import { transaction } from '../../../server/database.js';
import { cookie, verifySession, checkOrigin, fail, HttpError } from '../../../server/security.js';
import { commissionPolicy, joiningPriceMinor } from '../../../server/zexPayments.js';
import { alertDeliveryConfigured, zexHealth } from '../../../server/zexMonitoring.js';

export function createPurchaseHandler(runTransaction = transaction) {
  return async function handler(req, res) {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
      checkOrigin(req);
      const actor = verifySession(cookie(req, 'cs_member'), 'member');
      if (!actor) throw new HttpError(401, 'Sign in as a member');
      const product = process.env.ZEX_ACTIVATION_PRODUCT_CODE?.trim();
      const webhookSecret = process.env.MLM_WEBHOOK_SECRET || process.env.ZEX_WEBHOOK_SECRET;
      const partnerKey = process.env.X_ZEX_PARTNER_KEY || process.env.ZEX_PARTNER_API_KEY || process.env.MLM_PARTNER_API_KEY;
      let policy;
      try { policy = commissionPolicy(joiningPriceMinor()); }
      catch { throw new HttpError(503, 'ZEX purchase is not configured'); }
      if (!partnerKey || !webhookSecret || webhookSecret.length < 32 || webhookSecret === 'fixture-only-signing-secret-do-not-use-in-production') throw new HttpError(503, 'ZEX purchase is not configured');
      if (process.env.NODE_ENV === 'production' && (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32 || !alertDeliveryConfigured())) {
        throw new HttpError(503, 'ZEX purchase monitoring is not configured');
      }
      let destination;
      try { destination = new URL(process.env.ZEX_PURCHASE_URL); } catch { throw new HttpError(503, 'ZEX checkout is not configured'); }
      if (destination.protocol !== 'https:' || destination.username || destination.password || !product) throw new HttpError(503, 'ZEX checkout is not configured');
      const partner = process.env.MLM_PARTNER_ID || process.env.ZEX_PARTNER_ID || 'cybernetworking';
      const result = await runTransaction(async sql => {
        const linked = await sql`SELECT 1 FROM zex_account_links WHERE partner_id = ${partner} AND external_member_id = ${actor.sub} AND status = 'active'`;
        const reserve = await sql`SELECT 1 FROM members WHERE id = ${policy.reserve}`;
        const schema = await sql`SELECT to_regclass('public.zex_payment_sales') AS sales, to_regclass('public.zex_payment_adjustments') AS adjustments,
          to_regclass('public.zex_commission_grants') AS grants, to_regclass('public.zex_webhook_inbox') AS inbox,
          to_regclass('public.zex_recovery_checkpoints') AS checkpoints, to_regclass('public.zex_subscription_snapshots') AS snapshots,
          to_regclass('public.zex_connect_intents') AS intents, to_regclass('public.zex_monitor_runs') AS monitoring`;
        const columns = await sql`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND
          ((table_name='zex_webhook_inbox' AND column_name IN ('attempts','next_attempt_at','last_error_code')) OR
           (table_name='zex_payment_sales' AND column_name IN ('event_sequence','sale_kind')) OR
           (table_name='zex_monitor_runs' AND column_name='last_alert_at'))`;
        return { linked: linked.length > 0, reserve: reserve.length > 0, ready: Object.values(schema[0] || {}).length === 8 && Object.values(schema[0]).every(Boolean) && columns[0]?.count === 6 };
      });
      if (!result.linked) throw new HttpError(403, 'Link your ZEX account before purchasing');
      if (!result.reserve) throw new HttpError(503, 'ZEX purchase is not configured');
      if (!result.ready) throw new HttpError(503, 'ZEX payment storage is not ready');
      if (process.env.NODE_ENV === 'production') {
        const health = await runTransaction(sql => zexHealth(sql, partner));
        if (!health.healthy) throw new HttpError(503, 'ZEX payment processing is temporarily unavailable');
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, purchase_url: destination.href });
    } catch (error) { return fail(res, error); }
  };
}
export default createPurchaseHandler();
