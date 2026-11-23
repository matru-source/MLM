// Read-only checks. Never prints credentials, customer data or event payloads.
import { transaction } from '../server/database.js';

const origin = new URL(process.env.PORTAL_ORIGIN);
if (origin.protocol !== 'https:') throw new Error('HTTPS portal origin required');
const partner = process.env.MLM_PARTNER_ID || 'cybernetworking';
const report = {};
try {
  const res = await fetch(new URL('/api/integrations/zex/health', origin), {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, redirect: 'error', signal: AbortSignal.timeout(20000)
  });
  report.liveHealthStatus = res.status;
  if (res.headers.get('content-type')?.includes('application/json')) report.liveHealth = await res.json();
} catch { report.liveHealthError = 'Request failed'; }
try {
  const base = new URL(process.env.ZEX_API_BASE_URL);
  if (base.protocol !== 'https:') throw new Error('HTTPS required');
  const res = await fetch(new URL('/api/v1/integrations/mlm/events?cursor=0&limit=1', base), {
    headers: { 'X-Zex-Partner-Key': process.env.X_ZEX_PARTNER_KEY || process.env.ZEX_PARTNER_API_KEY || process.env.MLM_PARTNER_API_KEY },
    redirect: 'error', signal: AbortSignal.timeout(20000)
  });
  report.zexFeedStatus = res.status;
  if (res.ok) {
    const page = await res.json();
    report.zexFeedShapeValid = Array.isArray(page.events) && Number.isSafeInteger(page.next_cursor) && typeof page.has_more === 'boolean';
  }
} catch { report.zexFeedError = 'Request failed'; }
try {
  report.database = await transaction(async sql => {
    const reserve = await sql`SELECT count(*)::int AS count FROM members WHERE id=${process.env.ZEX_RESERVE_MEMBER_ID}`;
    const linked = await sql`SELECT count(*)::int AS count FROM zex_account_links WHERE partner_id=${partner} AND status='active'`;
    const tables = await sql`SELECT to_regclass('public.zex_payment_sales') IS NOT NULL AS sales,
      to_regclass('public.zex_monitor_runs') IS NOT NULL AS monitoring,
      to_regclass('public.zex_subscription_snapshots') IS NOT NULL AS subscriptions`;
    return { reserveExists: reserve[0].count === 1, activeLinks: linked[0].count, tables: tables[0] };
  });
} catch { report.databaseError = 'Read-only check failed'; }
console.log(JSON.stringify(report, null, 2));
