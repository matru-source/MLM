// ZEX owns subscription status. A status is never proof of a paid sale.
export function subscriptionAccess(snapshot, now = Date.now()) {
  const status = String(snapshot?.status || '').toLowerCase();
  const end = snapshot?.current_period_end == null ? null : Date.parse(snapshot.current_period_end);
  if (end !== null && !Number.isFinite(end)) throw new Error('Invalid subscription period');
  if (status === 'grace' || status === 'in_grace_period') return 'active';
  if (status === 'active') return end !== null && end <= now ? 'inactive' : 'active';
  if (status === 'cancelled' || status === 'canceled') return end !== null && end > now ? 'active' : 'inactive';
  if (['expired', 'revoked', 'paused'].includes(status)) return 'inactive';
  return 'unknown';
}

export async function applySubscriptionSnapshot(sql, { partner, memberId, sequence, data }) {
  if (!data.subscription_id || !data.product_code || typeof data.status !== 'string' ||
      !['phonepe', 'play'].includes(data.source) || typeof data.auto_renew !== 'boolean' ||
      typeof data.cancel_at_period_end !== 'boolean' ||
      (data.current_period_start != null && !Number.isFinite(Date.parse(data.current_period_start)))) throw new Error('Invalid subscription update');
  const access = subscriptionAccess(data);
  const links = await sql`SELECT 1 FROM zex_account_links WHERE partner_id=${partner} AND external_member_id=${memberId} AND status='active'`;
  if (!links.length) throw new Error('Member does not have an active ZEX link');
  const existing = await sql`SELECT member_id FROM zex_subscription_snapshots WHERE partner_id=${partner} AND subscription_id=${data.subscription_id}`;
  if (existing.length && existing[0].member_id !== memberId) throw new Error('Subscription owner mismatch');
  const updated = await sql`INSERT INTO zex_subscription_snapshots(partner_id,subscription_id,member_id,sequence,snapshot)
    VALUES (${partner},${data.subscription_id},${memberId},${sequence},${JSON.stringify(data)})
    ON CONFLICT(partner_id,subscription_id) DO UPDATE SET sequence=EXCLUDED.sequence, snapshot=EXCLUDED.snapshot
    WHERE zex_subscription_snapshots.member_id=EXCLUDED.member_id AND zex_subscription_snapshots.sequence < EXCLUDED.sequence RETURNING sequence`;
  if (!updated.length || data.product_code !== process.env.ZEX_ACTIVATION_PRODUCT_CODE || access !== 'inactive') return;
  const paid = await sql`SELECT MAX(event_sequence) AS last_paid FROM zex_payment_sales WHERE partner_id=${partner} AND member_id=${memberId}
    AND subscription_id=${data.subscription_id} AND product_code=${data.product_code} AND refunded_minor < amount_minor`;
  if (paid[0]?.last_paid == null || Number(paid[0].last_paid) > sequence) return;
  const others = await sql`SELECT DISTINCT ss.snapshot FROM zex_subscription_snapshots ss
    JOIN zex_payment_sales s ON s.partner_id=ss.partner_id AND s.member_id=ss.member_id AND s.subscription_id=ss.subscription_id
    WHERE ss.partner_id=${partner} AND ss.member_id=${memberId} AND ss.subscription_id<>${data.subscription_id}
      AND ss.snapshot->>'product_code'=${data.product_code} AND s.refunded_minor < s.amount_minor`;
  if (others.some(row => subscriptionAccess(row.snapshot) !== 'inactive')) return;
  await sql`UPDATE members SET seller_status='subscription_expired', customer_status='subscription_expired'
    WHERE id=${memberId} AND seller_status='active'`;
}

export async function expireDueSubscriptions(sql, partner) {
  const rows = await sql`SELECT partner_id,member_id,sequence,snapshot FROM zex_subscription_snapshots
    WHERE partner_id=${partner} AND snapshot->>'product_code'=${process.env.ZEX_ACTIVATION_PRODUCT_CODE || ''}
      AND snapshot->>'current_period_end' IS NOT NULL`;
  for (const row of rows) {
    const data = row.snapshot;
    if (subscriptionAccess(data) !== 'inactive') continue;
    // Re-run the newest snapshot through the same decision without inventing a new sequence.
    const paid = await sql`SELECT MAX(event_sequence) AS last_paid FROM zex_payment_sales WHERE partner_id=${partner} AND member_id=${row.member_id} AND subscription_id=${data.subscription_id} AND refunded_minor < amount_minor`;
    if (paid[0]?.last_paid == null || Number(paid[0].last_paid) > Number(row.sequence)) continue;
    const others = await sql`SELECT DISTINCT ss.snapshot FROM zex_subscription_snapshots ss JOIN zex_payment_sales s
      ON s.partner_id=ss.partner_id AND s.member_id=ss.member_id AND s.subscription_id=ss.subscription_id
      WHERE ss.partner_id=${partner} AND ss.member_id=${row.member_id} AND ss.subscription_id<>${data.subscription_id}
        AND ss.snapshot->>'product_code'=${data.product_code} AND s.refunded_minor < s.amount_minor`;
    if (others.some(other => subscriptionAccess(other.snapshot) !== 'inactive')) continue;
    await sql`UPDATE members SET seller_status='subscription_expired', customer_status='subscription_expired' WHERE id=${row.member_id} AND seller_status='active'`;
  }
}
