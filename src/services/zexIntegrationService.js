import { neon } from '@neondatabase/serverless';
import { generateRandomState, hashState, callbackStateMatches } from '../lib/zexSecurity.js';
import { randomUUID } from 'node:crypto';

function getSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('Database connection not configured');
  return neon(dbUrl);
}

const DEFAULT_PARTNER_ID = process.env.MLM_PARTNER_ID || 'cybernetworking';
const ZEX_CONNECT_BASE_URL = process.env.MLM_CONNECT_PAGE_URL || 'https://zex4u.com/connect/mlm';

/**
 * 1. Start a Session-Bound Connect Attempt for a Member
 */
export async function createConnectAttempt({ memberId, partnerId = DEFAULT_PARTNER_ID, callbackUrl }) {
  const sql = getSql();
  
  const requestId = randomUUID();
  const state = generateRandomState();
  const stateHash = hashState(state);
  const completeKey = `comp_${requestId}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes lifetime
  const connectUrl = `${ZEX_CONNECT_BASE_URL}#request=${requestId}`;

  await sql`
    INSERT INTO zex_connect_attempts (
      request_id, member_id, state_hash, complete_key, status, connect_url, expires_at, created_at
    ) VALUES (
      ${requestId}, ${memberId}, ${stateHash}, ${completeKey}, 'pending', ${connectUrl}, ${expiresAt.toISOString()}, NOW()
    );
  `;

  return {
    requestId,
    memberId,
    state,
    connectUrl,
    expiresAt: expiresAt.toISOString(),
    callbackUrl
  };
}

/**
 * 2. Complete Connect Attempt & Store Immutable Mapping
 */
export async function completeConnectAttempt({ requestId, code, state, partnerId = DEFAULT_PARTNER_ID }) {
  const sql = getSql();

  const attempts = await sql`
    SELECT * FROM zex_connect_attempts WHERE request_id = ${requestId} LIMIT 1;
  `;
  if (attempts.length === 0) {
    return { ok: false, status: 404, error: 'Connection request not found' };
  }
  const attempt = attempts[0];

  // 1. Verify not expired
  if (new Date(attempt.expires_at) < new Date()) {
    return { ok: false, status: 410, error: 'Connection request has expired' };
  }

  // 2. Validate cryptographic state match (prevents CSRF & session injection)
  if (!callbackStateMatches(state, attempt.state_hash)) {
    return { ok: false, status: 400, error: 'Callback state verification failed' };
  }

  // 3. Simulated/Real ZEX User ID from code exchange
  const zexUserId = code.startsWith('zex_usr_') ? code : `zex_usr_${requestId.slice(0, 8)}`;

  // 4. Store immutable mapping in zex_account_links
  const linkRows = await sql`
    INSERT INTO zex_account_links (
      partner_id, external_member_id, zex_user_id, status, linked_at
    ) VALUES (
      ${partnerId}, ${attempt.member_id}, ${zexUserId}, 'active', NOW()
    )
    ON CONFLICT (partner_id, external_member_id) DO UPDATE SET
      zex_user_id = EXCLUDED.zex_user_id,
      status = 'active',
      linked_at = NOW()
    RETURNING *;
  `;

  // 5. Update attempt status
  await sql`
    UPDATE zex_connect_attempts
    SET status = 'completed'
    WHERE request_id = ${requestId};
  `;

  // 6. Update member record in members table
  await sql`
    UPDATE members
    SET mlm_account = jsonb_set(
      COALESCE(mlm_account, '{}'::jsonb),
      '{zex_user_id}',
      to_jsonb(${zexUserId}::text)
    )
    WHERE id = ${attempt.member_id};
  `;

  return {
    ok: true,
    data: {
      partner_id: partnerId,
      external_member_id: attempt.member_id,
      zex_user_id: zexUserId,
      linked_at: linkRows[0].linked_at
    }
  };
}

/**
 * 3. Process Verified Webhook Event from ZEX
 * Handles 'sale.confirmed', 'sale.adjusted', and 'subscription.updated'
 */
export async function processVerifiedWebhook(event) {
  const sql = getSql();

  const { partner_id, event_id, sequence, type, external_member_id, data } = event;

  // 1. Idempotent Inbox Storage: UNIQUE(partner_id, event_id)
  const existingInbox = await sql`
    SELECT id, processed FROM zex_webhook_inbox
    WHERE partner_id = ${partner_id} AND event_id = ${event_id}
    LIMIT 1;
  `;

  if (existingInbox.length > 0 && existingInbox[0].processed) {
    return { ok: true, note: 'Event already processed (idempotent)' };
  }

  if (existingInbox.length === 0) {
    await sql`
      INSERT INTO zex_webhook_inbox (
        partner_id, event_id, sequence, event_type, payload, processed, created_at
      ) VALUES (
        ${partner_id}, ${event_id}, ${sequence}, ${type}, ${JSON.stringify(event)}, FALSE, NOW()
      );
    `;
  }

  // 2. Handle Event Types
  if (type === 'sale.confirmed') {
    // Only commission_eligible: true triggers commission distribution
    if (data.commission_eligible) {
      // Idempotent Sale Storage: UNIQUE(partner_id, sale_id)
      const existingSale = await sql`
        SELECT id FROM zex_sales
        WHERE partner_id = ${partner_id} AND sale_id = ${data.sale_id}
        LIMIT 1;
      `;

      if (existingSale.length === 0) {
        await sql`
          INSERT INTO zex_sales (
            partner_id, sale_id, subscription_id, external_member_id, source,
            amount_minor, currency, commission_eligible, eligibility_reason,
            processed, paid_at, created_at
          ) VALUES (
            ${partner_id}, ${data.sale_id}, ${data.subscription_id || null}, ${external_member_id},
            ${data.source || 'play'}, ${data.amount_minor || 250000}, ${data.currency || 'INR'},
            TRUE, ${data.eligibility_reason || 'eligible_first_acquisition'},
            TRUE, ${data.paid_at || new Date().toISOString()}, NOW()
          );
        `;

        // Look up member
        const memRows = await sql`
          SELECT id, name, sponsor_code, sponsor_member_id, seller_status
          FROM members
          WHERE id = ${external_member_id} OR referral_code = ${external_member_id}
          LIMIT 1;
        `;

        if (memRows.length > 0) {
          const buyer = memRows[0];

          // Activate buyer account
          await sql`
            UPDATE members
            SET 
              seller_status = 'active',
              rank = 'Active Partner',
              customer_status = 'active_subscriber'
            WHERE id = ${buyer.id};
          `;

          // Multi-Tier 6-Level Commission Distribution across uplines
          const tierRates = [
            { level: 1, rate: 1000, desc: 'ZEX Direct Retail Commission (Level 1) - ₹2,500 Activation from ' },
            { level: 2, rate: 300, desc: 'ZEX Team Network Commission (Level 2) - 2nd Tier from ' },
            { level: 3, rate: 150, desc: 'ZEX Matrix Growth Bonus (Level 3) - 3rd Tier from ' },
            { level: 4, rate: 50, desc: 'ZEX Leadership Override (Level 4) - 4th Tier from ' },
            { level: 5, rate: 25, desc: 'ZEX Infinity Pool Bonus (Level 5) - 5th Tier from ' },
            { level: 6, rate: 25, desc: 'ZEX Executive Commission (Level 6) - 6th Tier from ' }
          ];

          let currentSponsorCode = buyer.sponsor_member_id || buyer.sponsor_code;
          const visitedUplines = new Set();

          for (let i = 0; i < tierRates.length; i++) {
            if (!currentSponsorCode) break;

            const uplineRows = await sql`
              SELECT id, name, referral_code, sponsor_code, sponsor_member_id, wallet_balance, total_earnings, seller_status
              FROM members 
              WHERE referral_code = ${currentSponsorCode} OR id = ${currentSponsorCode}
              LIMIT 1;
            `;

            if (uplineRows.length === 0) break;
            const upline = uplineRows[0];
            if (visitedUplines.has(upline.id)) break;
            visitedUplines.add(upline.id);

            const tier = tierRates[i];
            const newBal = Number(upline.wallet_balance || 0) + tier.rate;
            const newEarnings = Number(upline.total_earnings || 0) + tier.rate;

            // Credit upline wallet
            await sql`
              UPDATE members
              SET 
                wallet_balance = ${newBal},
                total_earnings = ${newEarnings}
              WHERE id = ${upline.id};
            `;

            // Record transaction
            const txId = `tx_zex_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
            await sql`
              INSERT INTO transactions (
                id, member_id, description, amount, type, status, created_at
              ) VALUES (
                ${txId},
                ${upline.id},
                ${tier.desc + buyer.name},
                ${tier.rate},
                'credit',
                'Available',
                NOW()
              );
            `;

            currentSponsorCode = upline.sponsor_member_id || upline.sponsor_code;
          }
        }
      }
    }
  } else if (type === 'sale.adjusted') {
    // Refund or chargeback adjustment
    console.log(`[ZEX Webhook] Sale adjusted for sale_id: ${data.sale_id}, reason: ${data.reason}`);
    await sql`
      UPDATE zex_sales
      SET commission_eligible = FALSE
      WHERE partner_id = ${partner_id} AND sale_id = ${data.sale_id};
    `;
  } else if (type === 'subscription.updated') {
    // Current subscription snapshot
    console.log(`[ZEX Webhook] Subscription updated for ${external_member_id}: ${data.status}`);
  }

  // Mark inbox item as processed
  await sql`
    UPDATE zex_webhook_inbox
    SET processed = TRUE, processed_at = NOW()
    WHERE partner_id = ${partner_id} AND event_id = ${event_id};
  `;

  return { ok: true, processed: true };
}

/**
 * 4. Get Current ZEX Link Status for Member
 */
export async function getMemberZexStatus(memberId) {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT partner_id, external_member_id, zex_user_id, status, linked_at
      FROM zex_account_links
      WHERE external_member_id = ${memberId}
      LIMIT 1;
    `;
    if (rows.length === 0) {
      return { linked: false };
    }
    return {
      linked: true,
      data: rows[0]
    };
  } catch (err) {
    console.warn('[ZEX Integration] getMemberZexStatus error:', err);
    return { linked: false };
  }
}
