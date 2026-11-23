import { transaction } from '../../server/database.js';
import { authorizeSync, memberSync } from '../../server/access.js';
import { HttpError, fail, redact, hashPassword, signSession, setSessionCookie } from '../../server/security.js';
import { normalizeEmail, consumeVerification, ensureAuthTables } from '../../server/verification.js';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};


async function generateUniqueReferralCode(sql) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = 'CS' + Math.floor(100000 + Math.random() * 900000);
    const existing = await sql`SELECT id FROM members WHERE UPPER(referral_code) = ${candidate} LIMIT 1`;
    if (existing.length === 0) return candidate;
  }
  return 'CS' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

let isAuditTableReady = false;
async function ensureAuditTable(sql) {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        admin_id VARCHAR(100),
        admin_name VARCHAR(255),
        member_id VARCHAR(100),
        member_name VARCHAR(255),
        reason TEXT,
        details JSONB,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    isAuditTableReady = true;
  } catch (e) {
    throw e;
  }
}

let isLearningTableReady = false;
async function ensureLearningTable(sql) {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS learning_resources (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        url TEXT,
        duration VARCHAR(50),
        page_count INT,
        author VARCHAR(255),
        thumbnail_url TEXT,
        is_featured BOOLEAN DEFAULT false,
        chapters JSONB,
        notes TEXT,
        pages JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    isLearningTableReady = true;
  } catch (e) {
    throw e;
  }
}

let isTransactionColumnsReady = false;
async function ensureTransactionColumns(sql) {
  if (!sql) return;
  try {
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;`;
    isTransactionColumnsReady = true;
  } catch (e) {
    throw e;
  }
}

async function autoSettleMaturedCommissions(sql) {
  if (!sql) return;
  try {
    const matured = await sql`
      UPDATE transactions
      SET status = 'Available', settled_at = NOW()
      WHERE status = 'Pending' 
        AND type = 'credit' 
        AND available_at IS NOT NULL 
        AND available_at <= NOW()
      RETURNING member_id, amount::numeric as amount;
    `;
    if (matured && matured.length > 0) {
      const totals = {};
      for (const row of matured) {
        totals[row.member_id] = (totals[row.member_id] || 0) + Number(row.amount);
      }
      for (const [memId, amt] of Object.entries(totals)) {
        await sql`
          UPDATE members
          SET wallet_balance = COALESCE(wallet_balance, 0) + ${amt}
          WHERE id = ${memId};
        `;
      }
    }
  } catch (e) {
    throw e;
  }
}

async function ensureZexLinksSync(sql) {
  if (!sql) return;
  try {
    // 1. Sync zex_user_id from zex_account_links into members table
    await sql`
      UPDATE members m
      SET 
        mlm_account = jsonb_set(COALESCE(m.mlm_account, '{}'::jsonb), '{zex_user_id}', to_jsonb(zal.zex_user_id::text)),
        software_license = jsonb_set(COALESCE(m.software_license, '{}'::jsonb), '{zex_user_id}', to_jsonb(zal.zex_user_id::text))
      FROM zex_account_links zal
      WHERE (m.id = zal.external_member_id OR m.mlm_account->>'partner_id' = zal.external_member_id)
        AND zal.zex_user_id IS NOT NULL;
    `;

    // 2. Sync zex_user_id into activations table
    await sql`
      UPDATE activations a
      SET account2_software = jsonb_set(COALESCE(a.account2_software, '{}'::jsonb), '{zex_user_id}', to_jsonb(zal.zex_user_id::text))
      FROM zex_account_links zal
      LEFT JOIN members m ON (m.id = zal.external_member_id OR m.mlm_account->>'partner_id' = zal.external_member_id)
      WHERE (
        a.member_id = zal.external_member_id 
        OR a.member_id = m.id 
        OR a.member_id = m.mlm_account->>'partner_id' 
        OR (a.member_email IS NOT NULL AND a.member_email = m.email)
      ) AND zal.zex_user_id IS NOT NULL;
    `;
  } catch (e) {
    throw e;
  }
}

export async function executeSync(req, res, sql) {

  if (!sql) {
    return res.status(503).json({
      ok: false,
      error: 'Database connection not configured (DATABASE_URL missing)'
    });
  }

  // =========================================================================
  // 1. GET: Fetch Live Synced Platform Data from Neon PostgreSQL
  // =========================================================================
  if (req.method === 'GET') {
    try {
      await ensureTransactionColumns(sql);
      await autoSettleMaturedCommissions(sql);
      await ensureZexLinksSync(sql);
      const type = req.query?.type;

      // Audit Logs resource query
      if (type === 'audit_logs') {
        await ensureAuditTable(sql);
        const rows = await sql`
          SELECT 
            id, action, admin_id, admin_name, member_id, member_name,
            reason, details, ip_address, user_agent, created_at
          FROM audit_logs ORDER BY created_at DESC LIMIT 200;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      // Learning Resources query
      if (type === 'learning_resources') {
        await ensureLearningTable(sql);
        const rows = await sql`
          SELECT 
            id, type, title, category, description, url as "videoUrl", url,
            duration, page_count as "pageCount", author, thumbnail_url as thumbnail,
            is_featured as "isFeatured", chapters, notes, pages, created_at, updated_at
          FROM learning_resources ORDER BY created_at ASC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      // Single resource query
      if (type === 'members') {
        const rows = await sql`
          SELECT 
            m.id as member_id, m.id, m.name, m.email, m.phone, m.avatar, m.rank,
            m.cs_customer_id, m.sponsor_member_id, m.sponsor_code, m.sponsor_name,
            m.customer_status, m.seller_status, m.referral_code,
            COALESCE(m.wallet_balance, 0)::numeric as wallet_balance,
            COALESCE(m.total_earnings, 0)::numeric as total_earnings,
            m.kyc_data as kyc, m.software_license, m.mlm_account, m.created_at as joined_at,
            COALESCE(zal.zex_user_id, m.mlm_account->>'zex_user_id', m.software_license->>'zex_user_id') as zex_user_id,
            zal.linked_at as zex_linked_at,
            CASE WHEN zal.zex_user_id IS NOT NULL OR m.mlm_account->>'zex_user_id' IS NOT NULL THEN TRUE ELSE FALSE END as is_zex_linked
          FROM members m
          LEFT JOIN zex_account_links zal ON (
            m.id = zal.external_member_id OR 
            m.mlm_account->>'partner_id' = zal.external_member_id OR 
            zal.external_member_id = m.id
          )
          ORDER BY m.created_at ASC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      if (type === 'activations') {
        const rows = await sql`
          SELECT 
            a.id, a.member_id, a.member_name, a.member_email, a.member_phone, a.sponsor_code,
            a.amount_paid::numeric, a.gst_paid::numeric, a.total_paid::numeric,
            a.payment_method, a.payment_ref, a.utr_number, a.status, a.rejection_reason,
            a.account1_mlm, a.account2_software, a.requested_at, a.approved_at,
            COALESCE(zal.zex_user_id, a.account2_software->>'zex_user_id', m.mlm_account->>'zex_user_id') as zex_user_id,
            CASE WHEN zal.zex_user_id IS NOT NULL OR a.account2_software->>'zex_user_id' IS NOT NULL THEN TRUE ELSE FALSE END as is_zex_linked
          FROM activations a
          LEFT JOIN members m ON (a.member_id = m.id OR a.member_id = m.mlm_account->>'partner_id' OR (a.member_email IS NOT NULL AND a.member_email = m.email))
          LEFT JOIN zex_account_links zal ON (
            a.member_id = zal.external_member_id OR 
            m.id = zal.external_member_id OR 
            m.mlm_account->>'partner_id' = zal.external_member_id
          )
          ORDER BY a.requested_at DESC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      if (type === 'payouts') {
        const rows = await sql`
          SELECT 
            id, member_id, member_name, member_email, avatar,
            amount::numeric, tds_amount::numeric, net_amount::numeric as net_payable,
            bank_name, bank_account, bank_ifsc, status, utr_number, screenshot_url,
            bank_details, admin_payment, requested_at, processed_at
          FROM payout_requests ORDER BY requested_at DESC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      if (type === 'orders') {
        const rows = await sql`
          SELECT 
            o.order_id, o.cs_order_id, o.buyer_member_id,
            COALESCE(m.name, o.buyer_member_id) as buyer_name,
            COALESCE(m.email, '') as buyer_email,
            o.product_code, o.product_name, o.amount::numeric, o.gst::numeric, o.total_amount::numeric,
            o.currency, o.payment_method, o.payment_ref as utr_number, o.payment_status, o.subscription_status,
            o.activated_by, o.activation_date, o.next_renewal, o.account1_mlm, o.account2_software, o.created_at
          FROM orders o
          LEFT JOIN members m ON o.buyer_member_id = m.id
          ORDER BY o.created_at DESC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      if (type === 'transactions') {
        const rows = await sql`
          SELECT 
            id, member_id, description, amount::numeric, type, status,
            payout_id, utr_number, receipt_url, available_at, settled_at, created_at
          FROM transactions ORDER BY created_at DESC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      if (type === 'check_utr') {
        const utr = (req.query?.utr || '').trim().toUpperCase();
        if (!utr) return res.status(200).json({ ok: true, exists: false });
        const rows = await sql`
          SELECT id FROM (
            SELECT id, utr_number FROM activations
            UNION ALL
            SELECT order_id as id, payment_ref as utr_number FROM orders
          ) combined
          WHERE UPPER(utr_number) = ${utr}
          LIMIT 1;
        `;
        return res.status(200).json({ ok: true, exists: rows.length > 0 });
      }

      // Default: Comprehensive full sync for all devices
      await ensureAuditTable(sql);
      await ensureLearningTable(sql);
      const [members, activations, payouts, orders, transactions, kycDocs, auditLogs, learningResources] = await Promise.all([
        sql`
          SELECT 
            m.id as member_id, m.id, m.name, m.email, m.phone, m.avatar, m.rank,
            m.cs_customer_id, m.sponsor_member_id, m.sponsor_code, m.sponsor_name,
            m.customer_status, m.seller_status, m.referral_code,
            COALESCE(m.wallet_balance, 0)::numeric as wallet_balance,
            COALESCE(m.total_earnings, 0)::numeric as total_earnings,
            m.kyc_data as kyc, m.software_license, m.mlm_account, m.created_at as joined_at,
            COALESCE(zal.zex_user_id, m.mlm_account->>'zex_user_id', m.software_license->>'zex_user_id') as zex_user_id,
            zal.linked_at as zex_linked_at,
            CASE WHEN zal.zex_user_id IS NOT NULL OR m.mlm_account->>'zex_user_id' IS NOT NULL THEN TRUE ELSE FALSE END as is_zex_linked
          FROM members m
          LEFT JOIN zex_account_links zal ON (
            m.id = zal.external_member_id OR 
            m.mlm_account->>'partner_id' = zal.external_member_id OR 
            zal.external_member_id = m.id
          )
          ORDER BY m.created_at ASC;
        `,
        sql`
          SELECT 
            a.id, a.member_id, a.member_name, a.member_email, a.member_phone, a.sponsor_code,
            a.amount_paid::numeric, a.gst_paid::numeric, a.total_paid::numeric,
            a.payment_method, a.payment_ref, a.utr_number, a.status, a.rejection_reason,
            a.account1_mlm, a.account2_software, a.requested_at, a.approved_at,
            COALESCE(zal.zex_user_id, a.account2_software->>'zex_user_id', m.mlm_account->>'zex_user_id') as zex_user_id,
            CASE WHEN zal.zex_user_id IS NOT NULL OR a.account2_software->>'zex_user_id' IS NOT NULL THEN TRUE ELSE FALSE END as is_zex_linked
          FROM activations a
          LEFT JOIN members m ON (a.member_id = m.id OR a.member_id = m.mlm_account->>'partner_id' OR (a.member_email IS NOT NULL AND a.member_email = m.email))
          LEFT JOIN zex_account_links zal ON (
            a.member_id = zal.external_member_id OR 
            m.id = zal.external_member_id OR 
            m.mlm_account->>'partner_id' = zal.external_member_id
          )
          ORDER BY a.requested_at DESC;
        `,
        sql`
          SELECT 
            id, member_id, member_name, member_email, avatar,
            amount::numeric, tds_amount::numeric, net_amount::numeric as net_payable,
            bank_name, bank_account, bank_ifsc, status, utr_number, screenshot_url,
            bank_details, admin_payment, requested_at, processed_at
          FROM payout_requests ORDER BY requested_at DESC;
        `,
        sql`
          SELECT 
            o.order_id, o.cs_order_id, o.buyer_member_id,
            COALESCE(m.name, o.buyer_member_id) as buyer_name,
            COALESCE(m.email, '') as buyer_email,
            o.product_code, o.product_name, o.amount::numeric, o.gst::numeric, o.total_amount::numeric,
            o.currency, o.payment_method, o.payment_ref as utr_number, o.payment_status, o.subscription_status,
            o.activated_by, o.activation_date, o.next_renewal, o.account1_mlm, o.account2_software, o.created_at
          FROM orders o
          LEFT JOIN members m ON o.buyer_member_id = m.id
          ORDER BY o.created_at DESC;
        `,
        sql`
          SELECT 
            id, member_id, description, amount::numeric, type, status,
            payout_id, utr_number, receipt_url, available_at, settled_at, created_at
          FROM transactions ORDER BY created_at DESC;
        `,
        sql`
          SELECT 
            id, member_id, doc_key, file_name, file_type, file_size, data_url, status, updated_at
          FROM kyc_documents ORDER BY updated_at DESC;
        `,
        sql`
          SELECT 
            id, action, admin_id, admin_name, member_id, member_name,
            reason, details, ip_address, user_agent, created_at
          FROM audit_logs ORDER BY created_at DESC LIMIT 100;
        `,
        sql`
          SELECT 
            id, type, title, category, description, url as "videoUrl", url,
            duration, page_count as "pageCount", author, thumbnail_url as thumbnail,
            is_featured as "isFeatured", chapters, notes, pages, created_at, updated_at
          FROM learning_resources ORDER BY created_at ASC;
        `
      ]);

      const formattedMembers = members.map(r => ({
        ...r,
        id: r.member_id || r.id,
        member_id: r.member_id || r.id,
        payout_tds_rate: process.env.PAYOUT_TDS_RATE ? Number(process.env.PAYOUT_TDS_RATE) : null,
        wallet_balance: Number(r.wallet_balance || 0),
        total_earnings: Number(r.total_earnings || 0),
        avatar: r.avatar || '/matru-avatar.jpg',
        kyc: r.kyc || {},
        software_license: r.software_license || null,
        mlm_account: r.mlm_account || null
      }));

      return res.status(200).json({
        ok: true,
        data: {
          members: formattedMembers,
          kyc_documents: Array.isArray(kycDocs) ? kycDocs : [],
          audit_logs: Array.isArray(auditLogs) ? auditLogs : [],
          learning_resources: Array.isArray(learningResources) ? learningResources : [],
          activations: activations.map(a => ({
            ...a,
            amount_paid: Number(a.amount_paid || 0),
            gst_paid: Number(a.gst_paid || 0),
            total_paid: Number(a.total_paid || 0)
          })),
          payouts: payouts.map(p => ({
            ...p,
            amount: Number(p.amount || 0),
            tds_amount: Number(p.tds_amount || 0),
            net_payable: Number(p.net_payable || 0),
            bank_details: p.bank_details || {
              bank_name: p.bank_name || 'Bank',
              account_number: p.bank_account,
              ifsc: p.bank_ifsc,
              account_holder: p.member_name
            },
            admin_payment: p.admin_payment || {
              paid_at: p.processed_at,
              utr_number: p.utr_number || '',
              receipt_url: p.screenshot_url || '',
              payment_mode: 'IMPS'
            }
          })),
          orders: orders.map(o => ({
            ...o,
            amount: Number(o.amount || 0),
            gst: Number(o.gst || 0),
            total_amount: Number(o.total_amount || 0)
          })),
          transactions: transactions.map(t => ({
            ...t,
            amount: Number(t.amount || 0)
          }))
        }
      });
    } catch (err) {
      throw err;
    }
  }

  // =========================================================================
  // 2. POST: Execute Atomic Database Mutations
  // =========================================================================
  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const payload = { ...(body || {}), ...(body.data || {}) };
    const action = body.action || payload.action;
    const data = payload;

    try {
      // 2a. Register New Member
      if (action === 'register_member') {
        const email = normalizeEmail(data?.email);
        await ensureAuthTables(sql);
        await consumeVerification(sql, req, email);
        if (!data?.member_id || !/^[A-Za-z0-9_-]{1,100}$/.test(data.member_id) || !data.name?.trim() || !/^\d{10}$/.test(data.phone || '')) throw new HttpError(400, 'Invalid registration details');
        if (!data?.sponsor_code?.trim()) throw new HttpError(400, 'Sponsor referral code is strictly mandatory');
        const sponsorRows = await sql`SELECT id, name, referral_code FROM members WHERE (UPPER(referral_code) = UPPER(${data.sponsor_code.trim()}) OR id = ${data.sponsor_member_id || ''}) AND seller_status = 'active' LIMIT 1`;
        if (!sponsorRows.length) throw new HttpError(400, 'Invalid or inactive sponsor referral code');
        const sponsor = sponsorRows[0];
        const referralCode = await generateUniqueReferralCode(sql);
        const mem = { ...data, email, password: hashPassword(data.password), seller_status: 'pending_payment', customer_status: 'registered', kyc: {}, sponsor_member_id: sponsor.id, sponsor_code: sponsor.referral_code, sponsor_name: sponsor.name };
        const rows = await sql`
          INSERT INTO members (
            id, name, email, phone, avatar, password, rank, 
            cs_customer_id, sponsor_member_id, sponsor_code, sponsor_name,
            customer_status, seller_status, referral_code, 
            wallet_balance, total_earnings, kyc_data, created_at
          ) VALUES (
            ${mem.member_id},
            ${mem.name},
            ${mem.email},
            ${mem.phone || ''},
            ${mem.avatar || '/matru-avatar.jpg'},
            ${mem.password || ''},
            ${mem.rank || 'Partner (Pending Plan Purchase)'},
            ${mem.cs_customer_id || 'CS' + Math.floor(10000000 + Math.random() * 90000000)},
            ${mem.sponsor_member_id || 'CS123456'},
            ${mem.sponsor_code || 'CS123456'},
            ${mem.sponsor_name || 'Authorized Partner'},
            ${mem.customer_status || 'registered'},
            ${mem.seller_status || 'pending_payment'},
            ${referralCode},
            0,
            0,
            ${JSON.stringify(mem.kyc || {})},
            NOW()
          )
          RETURNING *;
        `;
        return res.status(200).json({ ok: true, data: rows[0] });
      }

      // 2a-1. Admin Direct Activate Member (Payment Bypass)
      if (action === 'admin_direct_activate') {
        const memberId = data?.member_id;
        if (!memberId) throw new HttpError(400, 'Member ID is required for direct activation');
        const membersList = await sql`SELECT * FROM members WHERE id = ${memberId} LIMIT 1`;
        if (!membersList.length) throw new HttpError(404, 'Member not found');
        const buyer = membersList[0];

        const updatedRows = await sql`
          UPDATE members
          SET seller_status = 'active',
              customer_status = 'active_subscriber',
              rank = CASE WHEN rank LIKE '%Pending%' THEN 'Active Partner' ELSE rank END
          WHERE id = ${memberId}
          RETURNING *;
        `;

        const orderId = 'CS-BYPASS-' + Math.floor(100000 + Math.random() * 900000);
        const orderRows = await sql`
          INSERT INTO orders (
            order_id, cs_order_id, buyer_member_id, product_code, product_name,
            amount, gst, total_amount, currency, payment_method, payment_ref,
            payment_status, subscription_status, activated_by, activation_date, created_at
          ) VALUES (
            ${orderId},
            ${orderId},
            ${memberId},
            'CYBER-PRO-JOIN',
            'CyberNetworking Pro Enterprise (Joining Plan)',
            2500,
            450,
            2950,
            'INR',
            'Admin Manual Clearance (Bypass)',
            ${data?.reference_note || 'ADMIN-BYPASS'},
            'verified',
            'active',
            ${data?.actor_name || 'Super Admin'},
            NOW(),
            NOW()
          )
          RETURNING *;
        `;

        await ensureAuditTable(sql);
        const auditId = `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await sql`
          INSERT INTO audit_logs (
            id, action, admin_id, admin_name, member_id, member_name, reason, details, created_at
          ) VALUES (
            ${auditId},
            'ADMIN_PAYMENT_BYPASS_ACTIVATION',
            ${data?.actor_id || 'admin'},
            ${data?.actor_name || 'Super Admin'},
            ${memberId},
            ${buyer.name},
            ${data?.reason || 'Direct Authorization'},
            ${JSON.stringify({ note: 'Direct partner activation authorized via admin desk. Ref: ' + (data?.reference_note || 'None') })},
            NOW()
          );
        `;

        return res.status(200).json({ ok: true, member: updatedRows[0], order: orderRows[0] });
      }

      // 2a-2. Admin Direct Partner Onboarding (Supports Root Partner #1)
      if (action === 'admin_create_partner') {
        const email = normalizeEmail(data?.email);
        await ensureAuthTables(sql);
        if (!data?.name?.trim() || !email || !data?.phone) {
          throw new HttpError(400, 'Name, email, and mobile phone number are required');
        }

        const cleanMobile = String(data.phone).replace(/\D/g, '');
        if (cleanMobile.length !== 10) {
          throw new HttpError(400, 'Mobile phone must be a valid 10-digit number');
        }

        const existing = await sql`SELECT id FROM members WHERE LOWER(email) = ${email} LIMIT 1`;
        if (existing.length) {
          throw new HttpError(400, `An account with email ${email} is already registered`);
        }

        let sponsorMemberId = 'ROOT';
        let sponsorCode = 'ROOT';
        let sponsorName = 'CyberNetworking Head Office';

        if (!data?.isRoot) {
          if (!data?.sponsorCode?.trim()) {
            throw new HttpError(400, 'Sponsor referral code is required when not registering Root Partner');
          }
          const sponsorRows = await sql`
            SELECT id, name, referral_code FROM members 
            WHERE (UPPER(referral_code) = UPPER(${data.sponsorCode.trim()}) OR id = ${data.sponsorCode.trim()})
            LIMIT 1
          `;
          if (!sponsorRows.length) {
            throw new HttpError(400, `Sponsor referral code "${data.sponsorCode}" was not found in active partner directory`);
          }
          sponsorMemberId = sponsorRows[0].id;
          sponsorCode = sponsorRows[0].referral_code;
          sponsorName = sponsorRows[0].name;
        }

        const newMemberId = 'mem_' + Math.random().toString(36).substr(2, 9);
        const referralCode = await generateUniqueReferralCode(sql);
        const autoActivate = Boolean(data?.autoActivate);
        const passwordHash = hashPassword(data?.password || 'Partner@2026');

        const newMemRows = await sql`
          INSERT INTO members (
            id, name, email, phone, avatar, password, rank,
            cs_customer_id, sponsor_member_id, sponsor_code, sponsor_name,
            customer_status, seller_status, referral_code,
            wallet_balance, total_earnings, kyc_data, created_at
          ) VALUES (
            ${newMemberId},
            ${data.name.trim()},
            ${email},
            ${cleanMobile},
            '/matru-avatar.jpg',
            ${passwordHash},
            ${autoActivate ? 'Active Partner' : 'Partner (Pending Plan Purchase)'},
            ${'CS' + Math.floor(10000000 + Math.random() * 90000000)},
            ${sponsorMemberId},
            ${sponsorCode},
            ${sponsorName},
            ${autoActivate ? 'active_subscriber' : 'registered'},
            ${autoActivate ? 'active' : 'pending_payment'},
            ${referralCode},
            0,
            0,
            ${JSON.stringify({ legal_name: data.name.trim(), verification_status: autoActivate ? 'verified' : 'unverified' })},
            NOW()
          )
          RETURNING *;
        `;

        let orderRow = null;
        if (autoActivate) {
          const orderId = 'CS-BYPASS-' + Math.floor(100000 + Math.random() * 900000);
          const oRows = await sql`
            INSERT INTO orders (
              order_id, cs_order_id, buyer_member_id, product_code, product_name,
              amount, gst, total_amount, currency, payment_method, payment_ref,
              payment_status, subscription_status, activated_by, activation_date, created_at
            ) VALUES (
              ${orderId},
              ${orderId},
              ${newMemberId},
              'CYBER-PRO-JOIN',
              'CyberNetworking Pro Enterprise (Joining Plan)',
              2500,
              450,
              2950,
              'INR',
              'Admin Manual Clearance (Direct Onboard)',
              ${data?.bypassRef || 'ADMIN-ONBOARD'},
              'verified',
              'active',
              ${data?.actor_name || 'Super Admin'},
              NOW(),
              NOW()
            )
            RETURNING *;
          `;
          orderRow = oRows[0];
        }

        await ensureAuditTable(sql);
        const auditId = `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await sql`
          INSERT INTO audit_logs (
            id, action, admin_id, admin_name, member_id, member_name, reason, details, created_at
          ) VALUES (
            ${auditId},
            'ADMIN_DIRECT_PARTNER_CREATION',
            ${data?.actor_id || 'admin'},
            ${data?.actor_name || 'Super Admin'},
            ${newMemberId},
            ${data.name.trim()},
            ${data?.isRoot ? 'Root Partner Creation' : 'Direct Desk Onboard'},
            ${JSON.stringify({ referral_code: referralCode, auto_active: autoActivate, is_root: Boolean(data?.isRoot) })},
            NOW()
          );
        `;

        return res.status(200).json({ ok: true, member: newMemRows[0], order: orderRow });
      }

      // 2f. Create Withdrawal / Payout Request
      if (action === 'create_payout') {
        const amount = Number(data?.amount);
        if (!Number.isFinite(amount) || amount < 500 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) throw new HttpError(400, 'Enter a valid withdrawal amount of at least 500');
        const owners = await sql`SELECT * FROM members WHERE id = ${data.member_id} FOR UPDATE`;
        const owner = owners[0];
        if (!owner || !['active', 'subscription_expired'].includes(owner.seller_status) || owner.kyc_data?.verification_status !== 'verified') throw new HttpError(400, 'Verified KYC and a member account are required');
        if (Number(owner.wallet_balance) < amount) throw new HttpError(400, 'Insufficient available balance');
        const tdsRate = Number(process.env.PAYOUT_TDS_RATE);
        if (!process.env.PAYOUT_TDS_RATE || !Number.isFinite(tdsRate) || tdsRate < 0 || tdsRate > 1) throw new HttpError(503, 'Payout deduction rate is not configured');
        const tds = Math.round(amount * tdsRate * 100) / 100;
        const bank = owner.kyc_data;
        if (!bank.bank_account_number || !bank.bank_ifsc) throw new HttpError(400, 'Verified bank details required');
        const p = { ...data, amount, member_name: owner.name, member_email: owner.email, tds_amount: tds, net_payable: amount - tds, admin_payment: {}, bank_details: { bank_name: bank.bank_name, account_number: bank.bank_account_number, ifsc: bank.bank_ifsc, account_holder: bank.legal_name || owner.name } };
        await sql`
          INSERT INTO payout_requests (
            id, member_id, member_name, member_email, avatar,
            amount, tds_amount, net_amount, bank_name, bank_account, bank_ifsc,
            status, requested_at, bank_details, admin_payment
          ) VALUES (
            ${p.id},
            ${p.member_id},
            ${p.member_name},
            ${p.member_email || ''},
            ${p.avatar || '/matru-avatar.jpg'},
            ${p.amount},
            ${p.tds_amount || 0},
            ${p.net_payable ?? p.amount},
            ${p.bank_details?.bank_name || 'Bank'},
            ${p.bank_details?.account_number || ''},
            ${p.bank_details?.ifsc || ''},
            'pending',
            NOW(),
            ${JSON.stringify(p.bank_details || {})},
            ${JSON.stringify(p.admin_payment || {})}
          );
        `;

        // Atomically lock funds from member wallet
        await sql`
          UPDATE members
          SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - ${p.amount})
          WHERE id = ${p.member_id};
        `;

        // Record transaction
        const txId = `tx_payout_${Date.now()}`;
        await sql`
          INSERT INTO transactions (
            id, member_id, description, amount, type, status, payout_id, created_at
          ) VALUES (
            ${txId},
            ${p.member_id},
            ${`Bank Withdrawal Request to ${p.bank_details?.bank_name || 'Bank'} - Funds Reserved`},
            ${-p.amount},
            'debit',
            'Reserved',
            ${p.id},
            NOW()
          );
        `;

        return res.status(200).json({ ok: true });
      }

      // 2g. Admin Approves Payout
      if (action === 'approve_payout') {
        const { payoutId, details = {} } = body;
        const pending = await sql`SELECT id FROM payout_requests WHERE id = ${payoutId} AND status = 'pending'`;
        if (!pending.length) throw new HttpError(409, 'Payout already processed');
        const utr = String(details.utrNumber || '').trim();
        if (!utr) throw new HttpError(400, 'Payment reference is required');

        await sql`
          UPDATE payout_requests
          SET 
            status = 'paid',
            utr_number = ${utr},
            screenshot_url = ${details.screenshotUrl || ''},
            processed_at = NOW(),
            admin_payment = ${JSON.stringify({
              paid_at: new Date().toISOString(),
              utr_number: utr,
              receipt_url: details.screenshotUrl || '',
              payment_mode: details.paymentMode || 'IMPS',
              admin_notes: details.adminNotes || 'Disbursed manually via verified banking gateway.'
            })}
          WHERE id = ${payoutId};
        `;

        await sql`
          UPDATE transactions
          SET 
            status = 'Paid',
            utr_number = ${utr},
            receipt_url = ${details.screenshotUrl || ''}
          WHERE payout_id = ${payoutId};
        `;

        return res.status(200).json({ ok: true });
      }

      // 2h. Admin Rejects Payout & Restores Balance
      if (action === 'reject_payout') {
        const { payoutId, reason } = body;
        const pRows = await sql`
          SELECT member_id, amount FROM payout_requests WHERE id = ${payoutId} AND status = 'pending' LIMIT 1;
        `;
        if (!pRows.length) throw new HttpError(409, 'Payout already processed');
        if (pRows.length > 0) {
          const req = pRows[0];

          await sql`
            UPDATE payout_requests
            SET 
              status = 'rejected',
              processed_at = NOW(),
              admin_payment = ${JSON.stringify({ admin_notes: reason || 'Bank details mismatch' })}
            WHERE id = ${payoutId};
          `;

          // Restore balance back to member
          await sql`
            UPDATE members
            SET wallet_balance = COALESCE(wallet_balance, 0) + ${req.amount}
            WHERE id = ${req.member_id};
          `;

          const txId = `tx_rest_${Date.now()}`;
          await sql`
            INSERT INTO transactions (
              id, member_id, description, amount, type, status, payout_id, created_at
            ) VALUES (
              ${txId},
              ${req.member_id},
              ${`Withdrawal Request #${payoutId} Rejected - ₹${req.amount} Restored to Balance`},
              ${req.amount},
              'credit',
              'Available',
              ${payoutId},
              NOW()
            );
          `;
        }
        return res.status(200).json({ ok: true });
      }

      // 2i. Update Member KYC
      if (action === 'update_kyc') {
        const { memberId, kyc } = body;
        await sql`
          UPDATE members
          SET kyc_data = ${JSON.stringify(kyc || {})}
          WHERE id = ${memberId} 
             OR id = LOWER(${memberId}) 
             OR referral_code = ${memberId}
             OR cs_customer_id = ${memberId};
        `;
        return res.status(200).json({ ok: true });
      }

      // 2i-2. Upload Live KYC Document (Streamed directly to Neon PostgreSQL)
      if (action === 'upload_kyc_doc') {
        const { memberId, docKey, fileInfo } = body;
        if (!memberId || !docKey || !fileInfo || !fileInfo.dataUrl) {
          return res.status(400).json({ ok: false, error: 'Missing parameters' });
        }
        const cleanMemId = String(memberId).trim().toLowerCase();
        const cleanDocKey = String(docKey).trim();
        const docId = `kyc_${cleanMemId}_${cleanDocKey}`;

        const inserted = await sql`
          INSERT INTO kyc_documents (
            id, member_id, doc_key, file_name, file_type, file_size, data_url, status, updated_at
          ) VALUES (
            ${docId}, ${cleanMemId}, ${cleanDocKey}, ${fileInfo.name || `${cleanDocKey}_document`},
            ${fileInfo.type || 'image/jpeg'}, ${fileInfo.size || '150 KB'}, ${fileInfo.dataUrl}, 'under_review', NOW()
          )
          ON CONFLICT (member_id, doc_key) DO UPDATE SET
            file_name = EXCLUDED.file_name,
            file_type = EXCLUDED.file_type,
            file_size = EXCLUDED.file_size,
            data_url = EXCLUDED.data_url,
            status = 'under_review',
            updated_at = NOW()
          RETURNING id, member_id, doc_key, file_name, file_type, file_size, status, updated_at;
        `;
        return res.status(200).json({ ok: true, document: inserted[0] });
      }

      // 2i-3. Approve Partner KYC in Neon Database & Log Audit Trail
      if (action === 'approve_kyc') {
        await ensureAuditTable(sql);
        const { memberId, adminId, adminName, memberName, reason, details } = body;
        const cleanMemId = String(memberId).trim().toLowerCase();
        
        await sql`
          UPDATE kyc_documents
          SET status = 'verified', updated_at = NOW()
          WHERE LOWER(member_id) = ${cleanMemId};
        `;

        const clientIp = (
          req.headers['x-forwarded-for']?.split(',')[0] || 
          req.headers['x-real-ip'] || 
          req.socket?.remoteAddress || 
          '127.0.0.1'
        ).trim();
        const userAgent = req.headers['user-agent'] || 'Web Admin Console';

        const auditId = `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await sql`
          INSERT INTO audit_logs (
            id, action, admin_id, admin_name, member_id, member_name, reason, details, ip_address, user_agent, created_at
          ) VALUES (
            ${auditId},
            'kyc_approved',
            ${adminId || 'ADMIN_CONSOLE'},
            ${adminName || 'Compliance Admin'},
            ${cleanMemId},
            ${memberName || cleanMemId},
            ${reason || 'All statutory proofs verified in accordance with Direct Selling Rules 2021'},
            ${JSON.stringify(details || {})},
            ${clientIp},
            ${userAgent},
            NOW()
          );
        `;

        return res.status(200).json({ ok: true, auditId });
      }

      // 2i-4. Reject Partner KYC in Neon Database & Log Audit Trail
      if (action === 'reject_kyc') {
        await ensureAuditTable(sql);
        const { memberId, adminId, adminName, memberName, reason, details } = body;
        const cleanMemId = String(memberId).trim().toLowerCase();

        await sql`
          UPDATE kyc_documents
          SET status = 'rejected', updated_at = NOW()
          WHERE LOWER(member_id) = ${cleanMemId};
        `;

        const clientIp = (
          req.headers['x-forwarded-for']?.split(',')[0] || 
          req.headers['x-real-ip'] || 
          req.socket?.remoteAddress || 
          '127.0.0.1'
        ).trim();
        const userAgent = req.headers['user-agent'] || 'Web Admin Console';

        const auditId = `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await sql`
          INSERT INTO audit_logs (
            id, action, admin_id, admin_name, member_id, member_name, reason, details, ip_address, user_agent, created_at
          ) VALUES (
            ${auditId},
            'kyc_rejected',
            ${adminId || 'ADMIN_CONSOLE'},
            ${adminName || 'Compliance Admin'},
            ${cleanMemId},
            ${memberName || cleanMemId},
            ${reason || 'KYC document verification failed'},
            ${JSON.stringify(details || {})},
            ${clientIp},
            ${userAgent},
            NOW()
          );
        `;

        return res.status(200).json({ ok: true, auditId });
      }

      // 2i-5. Generic Audit Log Recorder
      if (action === 'log_audit') {
        await ensureAuditTable(sql);
        const { auditAction, adminId, adminName, memberId, memberName, reason, details } = body;
        const clientIp = (
          req.headers['x-forwarded-for']?.split(',')[0] || 
          req.headers['x-real-ip'] || 
          req.socket?.remoteAddress || 
          '127.0.0.1'
        ).trim();
        const userAgent = req.headers['user-agent'] || 'Web Admin Console';

        const auditId = `audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await sql`
          INSERT INTO audit_logs (
            id, action, admin_id, admin_name, member_id, member_name, reason, details, ip_address, user_agent, created_at
          ) VALUES (
            ${auditId},
            ${auditAction || 'generic_event'},
            ${adminId || 'ADMIN_CONSOLE'},
            ${adminName || 'Compliance Admin'},
            ${memberId || ''},
            ${memberName || ''},
            ${reason || ''},
            ${JSON.stringify(details || {})},
            ${clientIp},
            ${userAgent},
            NOW()
          );
        `;

        return res.status(200).json({ ok: true, auditId });
      }

      // 2j. Update Member Password
      if (action === 'update_password') {
        const { memberId, email, passwordHash } = body;
        const cleanEmail = (email || '').trim().toLowerCase();
        await sql`
          UPDATE members
          SET password = ${passwordHash}
          WHERE (id IS NOT NULL AND id = ${memberId || ''})
             OR (email IS NOT NULL AND LOWER(email) = LOWER(${cleanEmail}));
        `;
        return res.status(200).json({ ok: true });
      }

      // 2k. Update Member Profile Information
      if (action === 'update_profile') {
        const { memberId, profile = {} } = body;
        await sql`
          UPDATE members
          SET 
            name = COALESCE(${profile.name || null}, name),
            phone = COALESCE(${profile.phone || null}, phone)
          WHERE id = ${memberId};
        `;
        return res.status(200).json({ ok: true });
      }

      // 2l. Admin Releases Pending Cooling-Off Commission Early
      if (action === 'release_commission_early') {
        const { transactionId } = body;
        const txRows = await sql`
          SELECT id, member_id, amount::numeric as amount, status FROM transactions WHERE id = ${transactionId} LIMIT 1;
        `;
        if (txRows.length > 0 && txRows[0].status === 'Pending') {
          const tx = txRows[0];
          await sql`
            UPDATE transactions
            SET status = 'Available', settled_at = NOW()
            WHERE id = ${transactionId};
          `;
          await sql`
            UPDATE members
            SET wallet_balance = COALESCE(wallet_balance, 0) + ${tx.amount}
            WHERE id = ${tx.member_id};
          `;
          return res.status(200).json({ ok: true });
        }
        return res.status(400).json({ ok: false, error: 'Transaction not found or already released' });
      }

      // 2m. Admin Claws Back / Cancels Commission on Buyer Refund
      if (action === 'clawback_commission') {
        const { transactionId, reason } = body;
        const txRows = await sql`
          SELECT id, member_id, amount::numeric as amount, status FROM transactions WHERE id = ${transactionId} LIMIT 1;
        `;
        if (txRows.length > 0) {
          const tx = txRows[0];
          if (!['Pending', 'Available'].includes(tx.status)) throw new HttpError(409, 'Commission already reversed');
          await sql`
            UPDATE transactions
            SET status = 'Clawed Back', description = description || ${` [Refund Clawback: ${reason || 'Buyer Cancelled'}]`}
            WHERE id = ${transactionId};
          `;
          if (tx.status === 'Available') {
            await sql`
              UPDATE members
              SET wallet_balance = COALESCE(wallet_balance, 0) - ${tx.amount},
                  total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - ${tx.amount})
              WHERE id = ${tx.member_id};
            `;
          } else {
            await sql`
              UPDATE members
              SET total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - ${tx.amount})
              WHERE id = ${tx.member_id};
            `;
          }
          return res.status(200).json({ ok: true });
        }
        return res.status(400).json({ ok: false, error: 'Transaction not found' });
      }

      // 2n. Save / Upsert Learning Resource (Admin)
      if (action === 'save_learning_resource') {
        await ensureLearningTable(sql);
        const item = data || {};
        const itemId = item.id || `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const rows = await sql`
          INSERT INTO learning_resources (
            id, type, title, category, description, url, duration, page_count,
            author, thumbnail_url, is_featured, chapters, notes, pages, updated_at
          ) VALUES (
            ${itemId},
            ${item.type || 'video'},
            ${item.title || 'Untitled Resource'},
            ${item.category || 'General'},
            ${item.description || ''},
            ${item.videoUrl || item.url || ''},
            ${item.duration || ''},
            ${Number(item.pageCount || 0)},
            ${item.author || 'CyberNetworking Desk'},
            ${item.thumbnail || item.thumbnail_url || ''},
            ${Boolean(item.isFeatured)},
            ${JSON.stringify(item.chapters || [])},
            ${item.notes || ''},
            ${JSON.stringify(item.pages || [])},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            url = EXCLUDED.url,
            duration = EXCLUDED.duration,
            page_count = EXCLUDED.page_count,
            author = EXCLUDED.author,
            thumbnail_url = EXCLUDED.thumbnail_url,
            is_featured = EXCLUDED.is_featured,
            chapters = EXCLUDED.chapters,
            notes = EXCLUDED.notes,
            pages = EXCLUDED.pages,
            updated_at = NOW()
          RETURNING *;
        `;
        return res.status(200).json({ ok: true, data: rows[0] });
      }

      // 2o. Delete Learning Resource (Admin)
      if (action === 'delete_learning_resource') {
        await ensureLearningTable(sql);
        const resId = data?.id || body?.id;
        await sql`DELETE FROM learning_resources WHERE id = ${resId};`;
        return res.status(200).json({ ok: true, deletedId: resId });
      }

      return res.status(400).json({ ok: false, error: `Unrecognized action: ${action}` });
    } catch (err) {
      throw err;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export function createSyncHandler(runTransaction = transaction) {
return async function handler(req, res) {
  try {
    const actor = authorizeSync(req);
    res.setHeader('Cache-Control', 'no-store');
    const result = await runTransaction(async sql => {
      if (req.method === 'GET' && req.query?.type === 'referral') {
        const code = String(req.query.code || '').trim().toUpperCase();
        if (!code || code.length > 100) throw new HttpError(400, 'Enter a referral code');
        const rows = await sql`SELECT id, id AS member_id, name, referral_code, seller_status FROM members WHERE UPPER(referral_code) = ${code} AND seller_status = 'active' LIMIT 1`;
        return { ok: true, data: rows[0] || null };
      }
      if (req.method === 'GET' && actor.role !== 'admin') {
        await ensureTransactionColumns(sql);
        await autoSettleMaturedCommissions(sql);
        await ensureLearningTable(sql);
        return { ok: true, data: await memberSync(sql, actor, req.query?.type) };
      }
      if (req.method === 'POST' && req.body.action === 'update_kyc' && actor.role !== 'admin') {
        const previous = await sql`SELECT kyc_data FROM members WHERE id = ${actor.sub}`;
        const allowed = ['legal_name', 'pan', 'aadhaar', 'bank_name', 'bank_account_number', 'bank_ifsc', 'address', 'city', 'state', 'pincode', 'agreement_accepted', 'agreement_version'];
        req.body.kyc = { ...(previous[0]?.kyc_data || {}), ...Object.fromEntries(Object.entries(req.body.kyc || {}).filter(([key]) => allowed.includes(key))), verification_status: 'under_review', verified_at: null };
      }
      let response;
      const buffered = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) {
        if (this.statusCode >= 400) throw new HttpError(this.statusCode, value.error || 'Request failed');
        response = value; return value;
      } };
      await executeSync(req, buffered, sql);
      if (!response) throw new Error('Missing database response');
      return redact(response);
    }, { serialize: true });
    if (req.method === 'POST' && req.body.action === 'register_member') {
      setSessionCookie(res, 'cs_member', signSession({ role: 'member', sub: result.data.id }));
      setSessionCookie(res, 'cs_verified', '', 0);
    }
    return res.status(200).json(result);
  } catch (error) { return fail(res, error); }
}
}
export default createSyncHandler();
