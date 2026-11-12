import { randomUUID } from 'node:crypto';
import { applySubscriptionSnapshot, subscriptionAccess } from './zexSubscriptions.js';

function validateSale(data) {
  if (!data.sale_id || !data.subscription_id || !data.product_code || !['play', 'phonepe'].includes(data.source) ||
      !Number.isSafeInteger(data.amount_minor) || data.amount_minor <= 0 || data.currency !== 'INR' ||
      !Number.isFinite(Date.parse(data.paid_at)) || typeof data.commission_eligible !== 'boolean' ||
      !['acquisition', 'renewal', 'other'].includes(data.sale_kind) || !data.eligibility_reason ||
      (data.commission_eligible && (data.sale_kind !== 'acquisition' || data.eligibility_reason !== 'eligible_first_acquisition'))) {
    throw new Error('Invalid verified sale');
  }
}
export function commissionPolicy(amountMinor) {
  const raw = process.env.ZEX_COMMISSION_RATES_PAISE;
  const version = process.env.ZEX_COMMISSION_POLICY_VERSION?.trim();
  const reserve = process.env.ZEX_RESERVE_MEMBER_ID?.trim();
  if (!raw || !version || !reserve) throw new Error('Commission policy is not configured');
  const rates = raw.split(',').map(v => /^\d+$/.test(v.trim()) ? Number(v) : NaN);
  const total = rates.reduce((a, b) => a + b, 0);
  if (rates.length !== 10 || rates.some(v => !Number.isSafeInteger(v) || v < 0) || total <= 0 || total > amountMinor) throw new Error('Invalid commission policy for sale');
  return { rates, version, reserve };
}

export function joiningPriceMinor() {
  const raw = process.env.ZEX_JOINING_PRICE_PAISE;
  const amount = Number(raw);
  if (!raw || !/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Joining price is not configured');
  return amount;
}
export function renewalPriceMinor() {
  const raw = process.env.ZEX_RENEWAL_PRICE_PAISE;
  const amount = Number(raw);
  if (!raw || !/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Renewal price is not configured');
  return amount;
}

async function credit(sql, partner, sale, memberId, amountMinor, description, pending = true) {
  if (!amountMinor) return;
  const id = 'zex_' + randomUUID();
  const availableAt = pending ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
  const status = pending ? 'Pending' : 'Available';
  const type = pending ? 'credit' : 'company_reserve';
  const amount = amountMinor / 100;
  const sourceKey = partner + ':' + sale;
  const updated = await sql`UPDATE members SET total_earnings = COALESCE(total_earnings, 0) + ${amount}, wallet_balance = COALESCE(wallet_balance, 0) + ${pending ? 0 : amount} WHERE id = ${memberId} RETURNING id`;
  if (!updated.length) throw new Error('Commission recipient not found');
  await sql`INSERT INTO transactions (id,member_id,description,amount,type,status,available_at,source_key,created_at)
    VALUES (${id},${memberId},${description},${amount},${type},${status},${availableAt},${sourceKey},NOW())`;
  await sql`INSERT INTO zex_commission_grants (partner_id,sale_id,transaction_id,member_id,original_minor) VALUES (${partner},${sale},${id},${memberId},${amountMinor})`;
}

export async function applyZexPayment(sql, event) {
  const { partner_id: partner, event_id: eventId, sequence, type, external_member_id: memberId, data } = event;
  const existing = await sql`SELECT processed FROM zex_webhook_inbox WHERE partner_id = ${partner} AND event_id = ${eventId}`;
  if (existing[0]?.processed) return { ok: true, duplicate: true };
  if (!existing.length) await sql`INSERT INTO zex_webhook_inbox(partner_id,event_id,sequence,event_type,payload,processed,created_at) VALUES (${partner},${eventId},${sequence},${type},${JSON.stringify(event)},FALSE,NOW())`;
  if (type === 'sale.confirmed') {
    validateSale(data);
    const product = process.env.ZEX_ACTIVATION_PRODUCT_CODE?.trim();
    if (!product) throw new Error('Activation product is not configured');
    const joiningPrice = joiningPriceMinor();
    const links = await sql`SELECT zex_user_id, linked_at FROM zex_account_links WHERE partner_id = ${partner} AND external_member_id = ${memberId} AND status = 'active'`;
    if (!links.length) throw new Error('Member does not have an active ZEX link');
    const previous = await sql`SELECT * FROM zex_payment_sales WHERE partner_id = ${partner} AND sale_id = ${data.sale_id}`;
    if (previous.length) {
      if (previous[0].member_id !== memberId || previous[0].product_code !== data.product_code || Number(previous[0].amount_minor) !== data.amount_minor) throw new Error('Sale does not match prior event');
    } else {
      const relevant = data.product_code === product && Date.parse(data.paid_at) >= new Date(links[0].linked_at).getTime();
      const priorJoining = data.sale_kind === 'renewal' ? await sql`SELECT 1 FROM zex_payment_sales
        WHERE partner_id=${partner} AND member_id=${memberId} AND product_code=${product} AND sale_kind<>'renewal'
          AND amount_minor >= ${joiningPrice} AND refunded_minor < amount_minor LIMIT 1` : [];
      const paidJoining = data.sale_kind !== 'renewal' && data.amount_minor >= joiningPrice;
      const paidRenewal = data.sale_kind === 'renewal' && priorJoining.length > 0 && data.amount_minor >= renewalPriceMinor();
      const latestSnapshot = await sql`SELECT sequence,snapshot FROM zex_subscription_snapshots WHERE partner_id=${partner} AND subscription_id=${data.subscription_id} AND member_id=${memberId}`;
      const newerInactive = latestSnapshot.length && Number(latestSnapshot[0].sequence) > sequence && subscriptionAccess(latestSnapshot[0].snapshot) !== 'active';
      const qualifiesForActivation = relevant && (paidJoining || paidRenewal) && !newerInactive && data.eligibility_reason !== 'subscription_not_active';
      const legacySale = await sql`SELECT id FROM zex_sales WHERE partner_id = ${partner} AND sale_id = ${data.sale_id}`;
      if (legacySale.length) throw new Error('Historical sale requires reconciliation before processing');
      const manual = await sql`SELECT id FROM activations WHERE member_id = ${memberId} AND status = 'approved' LIMIT 1`;
      const priorZex = await sql`SELECT id FROM zex_sales WHERE partner_id = ${partner} AND external_member_id = ${memberId} AND commission_eligible = TRUE LIMIT 1`;
      const policy = qualifiesForActivation && data.sale_kind !== 'renewal' && data.commission_eligible && !manual.length && !priorZex.length ? commissionPolicy(data.amount_minor) : null;
      await sql`INSERT INTO zex_payment_sales(partner_id,sale_id,member_id,subscription_id,product_code,amount_minor,currency,paid_at,commission_eligible,policy_version,event_sequence,sale_kind)
        VALUES (${partner},${data.sale_id},${memberId},${data.subscription_id},${data.product_code},${data.amount_minor},${data.currency},${data.paid_at},${data.commission_eligible},${policy?.version || null},${sequence},${data.sale_kind})`;
      if (relevant) {
        const buyers = await sql`SELECT id,name,sponsor_member_id,sponsor_code FROM members WHERE id = ${memberId}`;
        if (!buyers.length) throw new Error('Member not found');
        const buyer = buyers[0];
        if (qualifiesForActivation) await sql`UPDATE members SET seller_status = 'active', rank = 'Active Partner', customer_status = 'active_subscriber' WHERE id = ${memberId}`;
        const orderId = 'zex_' + partner + '_' + data.sale_id;
        await sql`INSERT INTO orders(order_id,cs_order_id,buyer_member_id,product_code,product_name,amount,gst,total_amount,currency,payment_method,payment_ref,payment_status,subscription_status,activated_by,activation_date,created_at)
          VALUES (${orderId},${orderId},${memberId},${data.product_code},${'ZEX purchase'},${data.amount_minor / 100},${null},${data.amount_minor / 100},${data.currency},${data.source},${data.sale_id},${'verified'},${'payment_confirmed'},${'ZEX verified payment'},${data.paid_at},NOW())`;
        if (policy) {
          const visited = new Set([memberId]);
          let sponsor = buyer.sponsor_member_id || buyer.sponsor_code;
          let allocated = 0;
          for (let level = 0; level < policy.rates.length && sponsor; level++) {
            const rows = await sql`SELECT id,sponsor_member_id,sponsor_code,seller_status FROM members WHERE id = ${sponsor} OR referral_code = ${sponsor} LIMIT 1`;
            const upline = rows[0];
            if (!upline || visited.has(upline.id)) break;
            visited.add(upline.id);
            const amount = policy.rates[level];
            if (upline.seller_status === 'active') {
              await credit(sql, partner, data.sale_id, upline.id, amount, `ZEX acquisition commission level ${level + 1}`);
              allocated += amount;
            }
            sponsor = upline.sponsor_member_id || upline.sponsor_code;
          }
          await credit(sql, partner, data.sale_id, policy.reserve, policy.rates.reduce((a, b) => a + b, 0) - allocated, 'ZEX unallocated commission reserve', false);
        }
      }
    }
  } else if (type === 'sale.adjusted') {
    if (!data.sale_id || !data.adjustment_id || !['refund', 'chargeback'].includes(data.reason) || data.currency !== 'INR' || !Number.isSafeInteger(data.amount_minor) || data.amount_minor <= 0 || (data.adjusted_at != null && !Number.isFinite(Date.parse(data.adjusted_at)))) throw new Error('Invalid sale adjustment');
    const prior = await sql`SELECT * FROM zex_payment_adjustments WHERE partner_id = ${partner} AND adjustment_id = ${data.adjustment_id}`;
    if (prior.length) {
      if (prior[0].sale_id !== data.sale_id || Number(prior[0].amount_minor) !== data.amount_minor) throw new Error('Adjustment conflicts with previous event');
    } else {
      const rows = await sql`SELECT * FROM zex_payment_sales WHERE partner_id = ${partner} AND sale_id = ${data.sale_id} FOR UPDATE`;
      const sale = rows[0];
      if (!sale || sale.member_id !== memberId) throw new Error('Original sale unavailable; retry later');
      const refunded = Number(sale.refunded_minor) + data.amount_minor;
      if (refunded > Number(sale.amount_minor)) throw new Error('Adjustment exceeds original sale');
      const grants = await sql`SELECT g.*,t.status FROM zex_commission_grants g JOIN transactions t ON t.id=g.transaction_id WHERE g.partner_id=${partner} AND g.sale_id=${data.sale_id}`;
      if (sale.policy_version && !grants.length) throw new Error('Sale needs manual reconciliation');
      for (const grant of grants) {
        const target = Number(BigInt(grant.original_minor) * BigInt(refunded) / BigInt(sale.amount_minor));
        const delta = target - Number(grant.reversed_minor);
        if (delta > 0 && ['Pending', 'Available'].includes(grant.status)) {
          const amount = delta / 100;
          await sql`UPDATE members SET total_earnings = COALESCE(total_earnings,0) - ${amount}, wallet_balance = COALESCE(wallet_balance,0) - ${grant.status === 'Available' ? amount : 0} WHERE id=${grant.member_id}`;
          await sql`UPDATE transactions SET amount = amount - ${amount}, status = CASE WHEN amount - ${amount} = 0 THEN 'Clawed Back' ELSE status END WHERE id=${grant.transaction_id}`;
        }
        await sql`UPDATE zex_commission_grants SET reversed_minor=${target} WHERE transaction_id=${grant.transaction_id}`;
      }
      await sql`INSERT INTO zex_payment_adjustments(partner_id,adjustment_id,sale_id,amount_minor,reason,adjusted_at) VALUES (${partner},${data.adjustment_id},${data.sale_id},${data.amount_minor},${data.reason},${data.adjusted_at || null})`;
      await sql`UPDATE zex_payment_sales SET refunded_minor=${refunded} WHERE partner_id=${partner} AND sale_id=${data.sale_id}`;
    }
  } else if (type === 'subscription.updated') {
    await applySubscriptionSnapshot(sql, { partner, memberId, sequence, data });
  } else {
    throw new Error('Unknown ZEX event type');
  }
  await sql`UPDATE zex_webhook_inbox SET processed=TRUE,processed_at=NOW() WHERE partner_id=${partner} AND event_id=${eventId}`;
  return { ok: true, processed: true };
}
