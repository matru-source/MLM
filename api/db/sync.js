import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'nodejs'
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
      const type = req.query?.type;

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
            payout_id, utr_number, receipt_url, created_at
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
      const [members, activations, payouts, orders, transactions] = await Promise.all([
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
            payout_id, utr_number, receipt_url, created_at
          FROM transactions ORDER BY created_at DESC;
        `
      ]);

      const formattedMembers = members.map(r => ({
        ...r,
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
            ${o.product_name || 'CyberShield Partner Joining Membership License'},
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

        // 4. Credit Level-1 sponsor (₹1,000)
        // Check the member row first to get the official registered sponsor
        const memberRows = await sql`
          SELECT sponsor_member_id, sponsor_code FROM members WHERE id = ${act.member_id} LIMIT 1;
        `;
        const registeredMem = memberRows[0] || {};
        const sponsorRef = registeredMem.sponsor_member_id || registeredMem.sponsor_code || act.sponsor_code || 'CS123456';

        const sponsorRows = await sql`
          SELECT id, name FROM members 
          WHERE UPPER(referral_code) = UPPER(${sponsorRef}) 
             OR id = ${sponsorRef} 
             OR cs_customer_id = ${sponsorRef}
          LIMIT 1;
        `;

        if (sponsorRows.length > 0) {
          const sponsor = sponsorRows[0];
          await sql`
            UPDATE members
            SET 
              wallet_balance = COALESCE(wallet_balance, 0) + 1000,
              total_earnings = COALESCE(total_earnings, 0) + 1000
            WHERE id = ${sponsor.id};
          `;

          const txId = `tx_act_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await sql`
            INSERT INTO transactions (
              id, member_id, description, amount, type, status, created_at
            ) VALUES (
              ${txId},
              ${sponsor.id},
              ${`Retail Partner Commission (Level 1) - ₹2,500 Joining Activation from ${act.member_name}`},
              1000,
              'credit',
              'Available',
              NOW()
            );
          `;
        }

        return res.status(200).json({ ok: true });
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
          WHERE id = ${memberId};
        `;
        return res.status(200).json({ ok: true });
      }

      // 2j. Update Member Password
      if (action === 'update_password') {
        const { memberId, passwordHash } = body;
        await sql`
          UPDATE members
          SET password = ${passwordHash}
          WHERE id = ${memberId};
        `;
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: `Unrecognized action: ${action}` });
    } catch (err) {
      console.error('[DB Sync POST Error]:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
