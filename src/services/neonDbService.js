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
export async function dbUpdateMemberPassword(memberId, passwordHash, email) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_password', memberId, passwordHash, email })
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
 * Throws an error on desync so caller can rollback optimistic UI updates
 */
export async function dbUpdateKyc(memberId, kycData) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_kyc', memberId, kyc: kycData })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    if (data.ok === false) {
      throw new Error(data.error || 'Database rejected KYC update');
    }
    return data;
  } catch (err) {
    console.error('[Neon DB Bridge] dbUpdateKyc error:', err.message);
    throw err;
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

/**
 * 17. Upload Live KYC Document (Streamed directly to Neon PostgreSQL)
 */
export async function dbUploadKycDocument(memberId, docKey, fileInfo) {
  try {
    const res = await fetch('/api/kyc/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, docKey, fileInfo })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbUploadKycDocument error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 18. Fetch Live KYC Documents from Neon PostgreSQL
 */
export async function dbFetchKycDocuments(memberId = null) {
  try {
    const url = memberId 
      ? `/api/kyc/upload?memberId=${encodeURIComponent(memberId)}` 
      : '/api/kyc/upload?all=true';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchKycDocuments error:', err.message);
    return { ok: false, error: err.message, documents: [] };
  }
}

/**
 * 19. Admin Approves Partner KYC in Neon Database & Writes Audit Log
 */
export async function dbApproveKyc(memberId, adminInfo = {}) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'approve_kyc', 
        memberId,
        adminId: adminInfo.adminId || 'ADMIN_CONSOLE',
        adminName: adminInfo.adminName || 'Compliance Admin',
        memberName: adminInfo.memberName || memberId,
        reason: adminInfo.reason || 'All statutory proofs verified in accordance with Direct Selling Rules 2021',
        details: adminInfo.details || {}
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    if (data.ok === false) throw new Error(data.error || 'Failed to approve KYC in database');
    return data;
  } catch (err) {
    console.error('[Neon DB Bridge] dbApproveKyc error:', err.message);
    throw err;
  }
}

/**
 * 20. Admin Rejects Partner KYC in Neon Database & Writes Audit Log
 */
export async function dbRejectKyc(memberId, adminInfo = {}) {
  try {
    const reasonText = typeof adminInfo === 'string' ? adminInfo : (adminInfo.reason || 'Document verification failed');
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'reject_kyc', 
        memberId,
        adminId: typeof adminInfo === 'object' ? (adminInfo.adminId || 'ADMIN_CONSOLE') : 'ADMIN_CONSOLE',
        adminName: typeof adminInfo === 'object' ? (adminInfo.adminName || 'Compliance Admin') : 'Compliance Admin',
        memberName: typeof adminInfo === 'object' ? (adminInfo.memberName || memberId) : memberId,
        reason: reasonText,
        details: typeof adminInfo === 'object' ? (adminInfo.details || {}) : {}
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    if (data.ok === false) throw new Error(data.error || 'Failed to reject KYC in database');
    return data;
  } catch (err) {
    console.error('[Neon DB Bridge] dbRejectKyc error:', err.message);
    throw err;
  }
}

/**
 * 21. Fetch Compliance Audit Logs from Neon Database
 */
export async function dbFetchAuditLogs() {
  try {
    const res = await fetch('/api/db/sync?type=audit_logs');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.ok && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchAuditLogs error:', err.message);
    return [];
  }
}

/**
 * 22. Admin Releases Pending Cooling-Off Commission Early
 */
export async function dbReleaseCommissionEarly(transactionId) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release_commission_early', transactionId })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbReleaseCommissionEarly error:', err.message);
    throw err;
  }
}

/**
480:  * 23. Admin Claws Back Commission upon Buyer Refund
481:  */
export async function dbClawbackCommission(transactionId, reason = 'Buyer Refunded') {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clawback_commission', transactionId, reason })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbClawbackCommission error:', err.message);
    throw err;
  }
}

/**
 * 24. Fetch All Learning Resources (Videos & PDF Manuals)
 */
export async function dbFetchLearningResources() {
  try {
    const res = await fetch('/api/db/sync?type=learning_resources');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Neon DB Bridge] dbFetchLearningResources error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 25. Save / Upsert Learning Resource (Admin)
 */
export async function dbSaveLearningResource(resource) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_learning_resource', data: resource })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbSaveLearningResource error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 26. Delete Learning Resource (Admin)
 */
export async function dbDeleteLearningResource(id) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_learning_resource', data: { id } })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Neon DB Bridge] dbDeleteLearningResource error:', err.message);
    return { ok: false, error: err.message };
  }
}



