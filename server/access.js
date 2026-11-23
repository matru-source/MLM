import { HttpError, requireSession, requireOwner, readBody, checkOrigin, redact } from './security.js';

const memberActions = new Set(['create_payout', 'update_kyc', 'upload_kyc_doc', 'update_profile']);
const adminActions = new Set([
  'approve_payout', 
  'reject_payout', 
  'approve_kyc', 
  'reject_kyc', 
  'log_audit', 
  'release_commission_early', 
  'clawback_commission', 
  'save_learning_resource', 
  'delete_learning_resource',
  'admin_direct_activate',
  'admin_create_partner'
]);

export function authorizeSync(req) {
  checkOrigin(req);
  if (!['GET', 'POST'].includes(req.method)) throw new HttpError(405, 'Method not allowed');
  req.body = readBody(req);
  if (req.method === 'GET' && req.query?.type === 'referral') return null;
  if (req.method === 'POST' && req.body.action === 'register_member') return null;
  const actor = requireSession(req);
  if (req.method === 'POST') {
    const { action, data } = req.body;
    if (!memberActions.has(action) && !adminActions.has(action)) throw new HttpError(403, 'Action unavailable');
    if (adminActions.has(action) && actor.role !== 'admin') throw new HttpError(403, 'Administrator access required');
    if (memberActions.has(action)) {
      requireOwner(actor, data?.buyer_member_id || data?.member_id || req.body.memberId);
      if (action === 'upload_kyc_doc') throw new HttpError(400, 'Use the document upload endpoint');
      if (action === 'update_kyc' && actor.role !== 'admin') {
        req.body.kyc = { ...req.body.kyc, verification_status: 'under_review', verified_at: null };
      }
    }
  }
  return actor;
}

export async function memberSync(sql, actor, type) {
  const id = actor.sub;
  const members = await sql`SELECT id, id AS member_id, name, email, phone, avatar, rank, cs_customer_id,
    sponsor_member_id, sponsor_code, sponsor_name, customer_status, seller_status, referral_code,
    wallet_balance, total_earnings, kyc_data AS kyc, software_license, mlm_account, created_at AS joined_at
    FROM members WHERE id = ${id}`;
  const network = await sql`WITH RECURSIVE downline AS (
    SELECT id, name, referral_code, cs_customer_id, sponsor_member_id, sponsor_code, seller_status, rank, created_at, ARRAY[id::text] AS path
    FROM members WHERE sponsor_member_id = ${id} OR sponsor_code = (SELECT referral_code FROM members WHERE id = ${id})
    UNION ALL
    SELECT m.id, m.name, m.referral_code, m.cs_customer_id, m.sponsor_member_id, m.sponsor_code, m.seller_status, m.rank, m.created_at, d.path || m.id::text
    FROM members m JOIN downline d ON m.sponsor_member_id = d.id OR m.sponsor_code = d.referral_code
    WHERE NOT m.id::text = ANY(d.path) AND cardinality(d.path) < 10
  ) SELECT DISTINCT id, id AS member_id, name, referral_code, cs_customer_id, sponsor_member_id, sponsor_code, seller_status, rank, created_at AS joined_at FROM downline WHERE id <> ${id}`;
  for (const member of members) member.payout_tds_rate = process.env.PAYOUT_TDS_RATE ? Number(process.env.PAYOUT_TDS_RATE) : null;
  const data = { members: [...members, ...network], audit_logs: [] };
  // Each query is scoped before any sensitive rows leave the database.
  data.activations = await sql`SELECT * FROM activations WHERE member_id = ${id} ORDER BY requested_at DESC`;
  data.payouts = await sql`SELECT *, net_amount AS net_payable FROM payout_requests WHERE member_id = ${id} ORDER BY requested_at DESC`;
  data.orders = await sql`SELECT * FROM orders WHERE buyer_member_id = ${id} ORDER BY created_at DESC`;
  data.transactions = await sql`SELECT * FROM transactions WHERE member_id = ${id} ORDER BY created_at DESC`;
  data.kyc_documents = await sql`SELECT * FROM kyc_documents WHERE member_id = ${id}`;
  data.learning_resources = await sql`SELECT *, url AS "videoUrl", page_count AS "pageCount", thumbnail_url AS thumbnail, is_featured AS "isFeatured" FROM learning_resources ORDER BY created_at`;
  if (type && !(type in data)) throw new HttpError(403, 'Resource unavailable');
  const amounts = ['amount', 'amount_paid', 'gst_paid', 'total_paid', 'gst', 'total_amount', 'wallet_balance', 'total_earnings', 'tds_amount', 'net_amount', 'net_payable'];
  for (const rows of Object.values(data)) for (const row of rows) for (const key of amounts) if (row[key] != null) row[key] = Number(row[key]);
  return redact(type ? data[type] : data);
}
