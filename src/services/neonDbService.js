/**
 * Live Neon PostgreSQL Bridge Service
 * 
 * Routes database operations securely through the serverless /api/db/sync endpoint.
 * This guarantees:
 * 1. Zero database credentials exposed in public client bundles.
 * 2. Instant multi-device synchronization: When a user registers or pays on Phone A,
 *    the Admin on Laptop B immediately sees them in real-time.
 * 3. Graceful fallback when working offline.
 */

// Backwards-compatibility stub
export const sql = null;

/**
 * 0. Fetch Full Platform Sync (Members, Activations, Payouts, Orders, Transactions)
 * Retrieves all core database entities in a single atomic network roundtrip.
 */
export async function dbFetchAllSync() {
  try {
    const res = await fetch('/api/db/sync');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchAllSync failed:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 1. Fetch All Members
 */
export async function dbFetchMembers() {
  try {
    const res = await fetch('/api/db/sync?type=members');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchMembers error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 2. Save / Register a New Member
 */
export async function dbRegisterMember(member) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register_member', data: member })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbRegisterMember error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 2b. Update Member Password Hash
 */
export async function dbUpdateMemberPassword(memberId, passwordHash) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_password', memberId, passwordHash })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbUpdateMemberPassword error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 3. Fetch All Pending Activations
 */
export async function dbFetchActivations() {
  try {
    const res = await fetch('/api/db/sync?type=activations');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchActivations error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 4. Create an Activation Record upon ₹2,500 Payment
 */
export async function dbCreateActivation(act) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_activation', data: act })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbCreateActivation error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 5. Admin Approves Member Activation & Software License
 */
export async function dbApproveActivation(activationId) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_activation', activationId })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbApproveActivation error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 6. Admin Rejects Partner Activation
 */
export async function dbRejectActivation(activationId, reason = 'Payment verification failed') {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_activation', activationId, reason })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbRejectActivation error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 7. Fetch Payout / Withdrawal Requests
 */
export async function dbFetchPayoutRequests() {
  try {
    const res = await fetch('/api/db/sync?type=payouts');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchPayoutRequests error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 8. Create a New Payout / Withdrawal Request
 */
export async function dbCreatePayoutRequest(payout) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_payout', data: payout })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbCreatePayoutRequest error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 9. Admin Approves Payout Disbursement
 */
export async function dbApprovePayout(payoutId, details = {}) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_payout', payoutId, details })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbApprovePayout error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 10. Admin Rejects Payout & Restores Balance
 */
export async function dbRejectPayout(payoutId, reason = 'KYC/Bank Mismatch') {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_payout', payoutId, reason })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbRejectPayout error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 10b. Check if UTR already exists in DB
 */
export async function dbCheckUtrExists(utr) {
  if (!utr || !utr.trim()) return false;
  try {
    const res = await fetch(`/api/db/sync?type=check_utr&utr=${encodeURIComponent(utr.trim())}`);
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json.exists);
  } catch (err) {
    console.warn('[Neon DB Bridge] dbCheckUtrExists error:', err.message);
    return false;
  }
}

/**
 * 11. Fetch Orders from Database
 */
export async function dbFetchOrders() {
  try {
    const res = await fetch('/api/db/sync?type=orders');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchOrders error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 12. Create Order in Database
 */
export async function dbCreateOrder(order) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_order', data: order })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbCreateOrder error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 13. Fetch Financial Transactions Ledger
 */
export async function dbFetchTransactions(memberId = null) {
  try {
    const url = memberId 
      ? `/api/db/sync?type=transactions&memberId=${encodeURIComponent(memberId)}` 
      : '/api/db/sync?type=transactions';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchTransactions error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 14. Update Member KYC & Bank Details
 */
export async function dbUpdateKyc(memberId, kycData) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_kyc', memberId, kyc: kycData })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbUpdateKyc error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 15. Fetch ZEX Cloud Account Link Status
 */
export async function dbFetchZexLinkStatus(memberId) {
  try {
    const res = await fetch(`/api/integrations/zex/status?member_id=${encodeURIComponent(memberId)}`);
    if (!res.ok) return { ok: true, linked: false };
    return await res.json();
  } catch (err) {
    return { ok: true, linked: false };
  }
}

/**
 * 16. Update Member Profile Info (Name, Phone, etc.)
 */
export async function dbUpdateProfile(memberId, profile) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_profile', memberId, profile })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbUpdateProfile error:', err.message);
    return { ok: false, error: err.message };
  }
}

