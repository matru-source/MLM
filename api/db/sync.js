import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

function getSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '') return null;
  try {
    return neon(dbUrl);
  } catch (err) {
    console.warn('[DB Serverless] Failed to initialize Neon connection:', err.message);
    return null;
  }
}

let isAuditTableReady = false;
async function ensureAuditTable(sql) {
  if (isAuditTableReady || !sql) return;
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
    // Non-fatal if table already exists or permission issues
  }
}

let isLearningTableReady = false;
async function ensureLearningTable(sql) {
  if (isLearningTableReady || !sql) return;
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
    // Non-fatal
  }
}

let isTransactionColumnsReady = false;
async function ensureTransactionColumns(sql) {
  if (isTransactionColumnsReady || !sql) return;
  try {
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;`;
    isTransactionColumnsReady = true;
  } catch (e) {
    // Non-fatal
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
    // Non-fatal
  }
}

export default async function handler(req, res) {
  const sql = getSql();

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
      const type = req.query?.type;

      // Audit Logs resource query
      if (type === 'audit_logs') {
        await ensureAuditTable(sql);
        const rows = await sql`
          SELECT 
            id, action, admin_id, admin_name, member_id, member_name,
            reason, details, ip_address, user_agent, created_at
          FROM audit_logs ORDER BY created_at DESC LIMIT 200;
        `.catch(() => []);
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
        `.catch(() => []);
        return res.status(200).json({ ok: true, data: rows });
      }

      // Single resource query
      if (type === 'members') {
        const rows = await sql`
          SELECT 
            id as member_id, name, email, phone, avatar, password, rank,
            cs_customer_id, sponsor_member_id, sponsor_code, sponsor_name,
            customer_status, seller_status, referral_code,
            COALESCE(wallet_balance, 0)::numeric as wallet_balance,
            COALESCE(total_earnings, 0)::numeric as total_earnings,
            kyc_data as kyc, software_license, mlm_account, created_at as joined_at
          FROM members ORDER BY created_at ASC;
        `;
        return res.status(200).json({ ok: true, data: rows });
      }

      if (type === 'activations') {
        const rows = await sql`
          SELECT 
            id, member_id, member_name, member_email, member_phone, sponsor_code,
            amount_paid::numeric, gst_paid::numeric, total_paid::numeric,
            payment_method, payment_ref, utr_number, status, rejection_reason,
            account1_mlm, account2_software, requested_at, approved_at
          FROM activations ORDER BY requested_at DESC;
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
            id as member_id, name, email, phone, avatar, password, rank,
            cs_customer_id, sponsor_member_id, sponsor_code, sponsor_name,
            customer_status, seller_status, referral_code,
            COALESCE(wallet_balance, 0)::numeric as wallet_balance,
            COALESCE(total_earnings, 0)::numeric as total_earnings,
            kyc_data as kyc, software_license, mlm_account, created_at as joined_at
          FROM members ORDER BY created_at ASC;
        `,
        sql`
          SELECT 
            id, member_id, member_name, member_email, member_phone, sponsor_code,
            amount_paid::numeric, gst_paid::numeric, total_paid::numeric,
            payment_method, payment_ref, utr_number, status, rejection_reason,
            account1_mlm, account2_software, requested_at, approved_at
          FROM activations ORDER BY requested_at DESC;
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
        `.catch(() => []),
        sql`
          SELECT 
            id, action, admin_id, admin_name, member_id, member_name,
            reason, details, ip_address, user_agent, created_at
          FROM audit_logs ORDER BY created_at DESC LIMIT 100;
        `.catch(() => []),
        sql`
          SELECT 
            id, type, title, category, description, url as "videoUrl", url,
            duration, page_count as "pageCount", author, thumbnail_url as thumbnail,
            is_featured as "isFeatured", chapters, notes, pages, created_at, updated_at
          FROM learning_resources ORDER BY created_at ASC;
        `.catch(() => [])
      ]);

      const formattedMembers = members.map(r => ({
        ...r,
        id: r.member_id || r.id,
        member_id: r.member_id || r.id,
        password: r.password || '',
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
      console.error('[DB Sync GET Error]:', err);
      return res.status(500).json({ ok: false, error: err.message });
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

    const { action, data } = body;

    try {
      // 2-0. Reset / Clean Test Data
      if (action === 'reset_test_data') {
        try { await sql`DELETE FROM activations;`; } catch (e) {}
        try { await sql`DELETE FROM transactions;`; } catch (e) {}
        try { await sql`DELETE FROM payout_requests;`; } catch (e) {}
        try { await sql`DELETE FROM payouts;`; } catch (e) {}
        try { await sql`DELETE FROM orders;`; } catch (e) {}
        try { await sql`DELETE FROM zex_sales;`; } catch (e) {}
        try { await sql`DELETE FROM zex_account_links;`; } catch (e) {}
        try { await sql`DELETE FROM zex_connect_attempts;`; } catch (e) {}
        try { await sql`DELETE FROM zex_webhook_inbox;`; } catch (e) {}
        try { await sql`DELETE FROM audit_logs;`; } catch (e) {}
        await sql`DELETE FROM members WHERE id != 'mem_matru';`;
        await sql`
          UPDATE members
          SET 
            name = 'CyberNetworking Head Office',
            email = 'admin@cybernetworking.in',
            phone = '+91 9876543210',
            rank = 'Executive Director',
            customer_status = 'active_subscriber',
            seller_status = 'active',
            referral_code = 'CS123456',
            wallet_balance = 0,
            total_earnings = 0
          WHERE id = 'mem_matru';
        `;
        return res.status(200).json({ ok: true, message: 'Test data cleared successfully' });
      }

      // 2a. Register New Member
      if (action === 'register_member') {
        const mem = data;
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
            ${mem.referral_code || 'CS' + Math.floor(100000 + Math.random() * 900000)},
            0,
            0,
            ${JSON.stringify(mem.kyc || {})},
            NOW()
          )
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            seller_status = EXCLUDED.seller_status
          RETURNING *;
        `;
        return res.status(200).json({ ok: true, data: rows[0] });
      }

      // 2b. Create Order
      if (action === 'create_order') {
        const o = data;
        await sql`
          INSERT INTO orders (
            order_id, cs_order_id, buyer_member_id,
            product_code, product_name, amount, gst, total_amount, currency,
            payment_method, payment_ref, payment_status, subscription_status,
            activated_by, activation_date, next_renewal, account1_mlm, account2_software, created_at
          ) VALUES (
            ${o.order_id},
            ${o.cs_order_id || 'ord_' + o.order_id},
            ${o.buyer_member_id},
            ${o.product_code || 'CS-PRO-SUITE'},
            ${o.product_name || 'CyberNetworking Partner Joining Membership License'},
            ${o.amount || 2500},
            ${o.gst || 450},
            ${o.total_amount || 2950},
            ${o.currency || 'INR'},
            ${o.payment_method || 'UPI'},
            ${o.utr_number || o.payment_ref || ''},
            ${o.payment_status || 'pending_verification'},
            ${o.subscription_status || 'pending_approval'},
            ${o.activated_by || 'Awaiting Admin Bank Credit Verification'},
            ${o.activation_date || new Date().toISOString()},
            ${o.next_renewal || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()},
            ${JSON.stringify(o.account1_mlm || {})},
            ${JSON.stringify(o.account2_software || {})},
            NOW()
          )
          ON CONFLICT (order_id) DO UPDATE SET
            payment_ref = EXCLUDED.payment_ref,
            payment_status = EXCLUDED.payment_status;
        `;
        return res.status(200).json({ ok: true });
      }

      // 2c. Create Activation Request
      if (action === 'create_activation') {
        const act = data;

        // Prevent duplicate UTR submission
        if (act.utr_number && act.utr_number.trim()) {
          const cleanUtr = act.utr_number.trim().toUpperCase();
          const dupCheck = await sql`
            SELECT id FROM (
              SELECT id, utr_number FROM activations WHERE id != ${act.id}
              UNION ALL
              SELECT order_id as id, payment_ref as utr_number FROM orders WHERE order_id != ${act.payment_ref || ''}
            ) combined
            WHERE UPPER(utr_number) = ${cleanUtr}
            LIMIT 1;
          `;
          if (dupCheck.length > 0) {
            return res.status(400).json({ 
              ok: false, 
              error: `Duplicate UTR Error: Transaction reference "${cleanUtr}" has already been submitted.` 
            });
          }
        }

        await sql`
          INSERT INTO activations (
            id, member_id, member_name, member_email, member_phone, sponsor_code,
            amount_paid, gst_paid, total_paid, payment_method, payment_ref, utr_number,
            status, account1_mlm, account2_software, requested_at
          ) VALUES (
            ${act.id},
            ${act.member_id},
            ${act.member_name},
            ${act.member_email},
            ${act.member_phone || ''},
            ${act.sponsor_code || 'CS123456'},
            ${act.amount_paid || 2500},
            ${act.gst_paid || 450},
            ${act.total_paid || 2950},
            ${act.payment_method || 'UPI'},
            ${act.payment_ref || act.id},
            ${act.utr_number},
            'pending',
            ${JSON.stringify(act.account1_mlm || {})},
            ${JSON.stringify(act.account2_software || {})},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            utr_number = EXCLUDED.utr_number,
            status = 'pending';
        `;

        // Update member seller_status to pending_approval
        await sql`
          UPDATE members
          SET 
            seller_status = 'pending_approval',
            rank = 'Partner (Pending Admin Approval)'
          WHERE id = ${act.member_id};
        `;

        return res.status(200).json({ ok: true });
      }

      // 2d. Admin Approves Partner Activation & Software License
      if (action === 'approve_activation') {
        const { activationId } = body;
        const actRows = await sql`
          SELECT * FROM activations WHERE id = ${activationId} LIMIT 1;
        `;
        if (actRows.length === 0) {
          return res.status(404).json({ ok: false, error: 'Activation not found' });
        }
        const act = actRows[0];

        // 1. Mark activation approved
        await sql`
          UPDATE activations
          SET status = 'approved', approved_at = NOW()
          WHERE id = ${activationId};
        `;

        // 2. Unlock member accounts & licenses
        await sql`
          UPDATE members
          SET 
            seller_status = 'active',
            rank = 'Active Partner',
            customer_status = 'active_subscriber',
            software_license = ${JSON.stringify(act.account2_software || {})},
            mlm_account = ${JSON.stringify(act.account1_mlm || {})}
          WHERE id = ${act.member_id};
        `;

        // 3. Mark orders subscription active
        await sql`
          UPDATE orders
          SET 
            subscription_status = 'active',
            payment_status = 'verified',
            activated_by = 'Admin Approved'
          WHERE buyer_member_id = ${act.member_id} OR order_id = ${act.payment_ref};
        `;

        // 4. Credit multi-tier upline partners across all 10 levels (Total: ₹1,600 / 64% of ₹2,500)
        const allDbMembers = await sql`SELECT id, referral_code, cs_customer_id, sponsor_member_id, sponsor_code FROM members;`;
        const rates = [1000, 300, 150, 50, 25, 25, 25, 10, 10, 5];

        let currentUplineId = act.member_id;
        const visited = new Set([act.member_id]);
        const paidLevels = [];
        let totalPaidToNetwork = 0;

        for (let level = 1; level <= 10; level++) {
          const currentMem = allDbMembers.find(m => m.id === currentUplineId);
          if (!currentMem && level > 1) break;

          const sponsorRef = (
            (currentMem ? (currentMem.sponsor_member_id || currentMem.sponsor_code) : null) ||
            (level === 1 ? act.sponsor_code : null) ||
            ''
          ).trim().toUpperCase();

          if (!sponsorRef) break;

          const sponsor = allDbMembers.find(m =>
            (m.id && m.id.toUpperCase() === sponsorRef) ||
            (m.referral_code && m.referral_code.toUpperCase() === sponsorRef) ||
            (m.cs_customer_id && m.cs_customer_id.toUpperCase() === sponsorRef)
          );

          if (!sponsor) break;
          if (visited.has(sponsor.id)) break;
          visited.add(sponsor.id);

          const rate = rates[level - 1];
          paidLevels.push(level);
          totalPaidToNetwork += rate;

          // 15–30 Day Statutory Cooling-Off Period (Default: 30 Days):
          // Funds remain in 'Pending' escrow hold until 30-day refund window elapses.
          // total_earnings increments immediately so partners see live commission performance.
          // wallet_balance remains untouched until 30-day cooling-off window completes.
          await sql`
            UPDATE members
            SET 
              total_earnings = COALESCE(total_earnings, 0) + ${rate}
            WHERE id = ${sponsor.id};
          `;

          const txId = `tx_act_${Date.now()}_${Math.floor(Math.random() * 10000)}_${level}`;
          const availableAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await sql`
            INSERT INTO transactions (
              id, member_id, description, amount, type, status, available_at, created_at
            ) VALUES (
              ${txId},
              ${sponsor.id},
              ${`Retail Partner Commission (Level ${level}) - ₹2,500 Joining Activation from ${act.member_name}`},
              ${rate},
              'credit',
              'Pending',
              ${availableAt},
              NOW()
            );
          `;

          currentUplineId = sponsor.id;
        }

        // 5. Statutory Company Reserve Allocation for Unused / Unallocated Levels
        // Total network allocation is ₹1,600. If fewer than 10 levels exist in ancestry,
        // all remaining unused commissions are credited to the Company Reserve Fund (Head Office: mem_matru)
        const unusedCommission = 1600 - totalPaidToNetwork;
        if (unusedCommission > 0) {
          const unusedLevels = [];
          for (let lvl = 1; lvl <= 10; lvl++) {
            if (!paidLevels.includes(lvl)) unusedLevels.push(lvl);
          }

          // Credit CyberNetworking Head Office Reserve Account
          await sql`
            UPDATE members
            SET 
              wallet_balance = COALESCE(wallet_balance, 0) + ${unusedCommission},
              total_earnings = COALESCE(total_earnings, 0) + ${unusedCommission}
            WHERE id = 'mem_matru' OR referral_code = 'CS123456';
          `;

          const txReserveId = `tx_reserve_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          await sql`
            INSERT INTO transactions (
              id, member_id, description, amount, type, status, created_at
            ) VALUES (
              ${txReserveId},
              'mem_matru',
              ${`Company Reserve Fund (Unused Levels ${unusedLevels.join(', ')}) - ₹${unusedCommission} from ${act.member_name} Activation`},
              ${unusedCommission},
              'company_reserve',
              'Available',
              NOW()
            );
          `;
        }

        return res.status(200).json({ ok: true, unusedCommission });
      }

      // 2e. Admin Rejects Partner Activation
      if (action === 'reject_activation') {
        const { activationId, reason } = body;
        await sql`
          UPDATE activations
          SET status = 'rejected', rejection_reason = ${reason || 'Payment verification failed'}
          WHERE id = ${activationId};
        `;
        const actRows = await sql`SELECT member_id FROM activations WHERE id = ${activationId} LIMIT 1;`;
        if (actRows.length > 0) {
          await sql`
            UPDATE members
            SET seller_status = 'rejected'
            WHERE id = ${actRows[0].member_id};
          `;
        }
        return res.status(200).json({ ok: true });
      }

      // 2f. Create Withdrawal / Payout Request
      if (action === 'create_payout') {
        const p = data;
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
            ${p.net_payable || p.amount},
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
        const utr = details.utrNumber || `UTR-CS-${Math.floor(100000000 + Math.random() * 900000000)}`;

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
          SELECT member_id, amount FROM payout_requests WHERE id = ${payoutId} LIMIT 1;
        `;
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
          await sql`
            UPDATE transactions
            SET status = 'Clawed Back', description = description || ${` [Refund Clawback: ${reason || 'Buyer Cancelled'}]`}
            WHERE id = ${transactionId};
          `;
          if (tx.status === 'Available') {
            await sql`
              UPDATE members
              SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - ${tx.amount}),
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
      console.error('[DB Sync POST Error]:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
