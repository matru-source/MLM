/**
 * Central Database & Backend API Service
 * Centralizes all REST API calls and database synchronization for:
 * 1. Dual Accounts Provisioning (MLM Partner Account + CyberShield License)
 * 2. Real-time Network Hierarchy (Strictly filtering active, approved partners)
 * 3. Administrative Approvals & Activations
 * 4. Commission Wallets & Payout Processing
 * 
 * Configured via .env: VITE_API_BASE_URL
 * Can also be updated in-app via setBackendApiUrl()
 */

const STORAGE_KEY_API_URL = 'cybershield_api_base_url';

export function getBackendApiUrl() {
  const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
  if (customUrl) return customUrl;
  return import.meta.env.VITE_API_BASE_URL || '';
}

export function setBackendApiUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/$/, ''));
  } else {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  }
}

/**
 * Common fetch helper with timeout and standardized error handling
 */
async function apiRequest(endpoint, options = {}) {
  const baseUrl = getBackendApiUrl();
  if (!baseUrl) {
    return { ok: false, mode: 'local_fallback', reason: 'No backend API URL configured' };
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data.message || `API Error: ${response.statusText}`,
        data
      };
    }

    return {
      ok: true,
      status: response.status,
      data
    };
  } catch (err) {
    console.warn(`[Backend API] Request to ${url} failed or timed out. Falling back to local state.`, err);
    return {
      ok: false,
      mode: 'local_fallback',
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
}

// ============================================================================
// API ENDPOINTS (Ready to link to live backend server)
// ============================================================================

/**
 * 1. Health & Server Ping
 * GET /api/v1/health
 */
export async function checkBackendHealth() {
  return await apiRequest('/api/v1/health', { method: 'GET' });
}

/**
 * 2. Provision Dual Accounts on ₹2,500 Payment
 * POST /api/v1/partners/create-mlm-account
 * POST /api/v1/software/provision-license-account
 */
export async function syncProvisionDualAccounts({ mlmAccount, softwareAccount }) {
  const results = {};

  // Account 1: Partner MLM Account
  results.mlm = await apiRequest('/api/v1/partners/create-mlm-account', {
    method: 'POST',
    body: JSON.stringify(mlmAccount)
  });

  // Account 2: CyberShield Software License
  results.software = await apiRequest('/api/v1/software/provision-license-account', {
    method: 'POST',
    body: JSON.stringify(softwareAccount)
  });

  return results;
}

/**
 * 3. Fetch Network Hierarchy for a Partner (Strictly Active Only)
 * GET /api/v1/network/hierarchy/:memberId?status=active
 * Unpaid and pending users are filtered out at the API query level.
 */
export async function fetchActiveNetworkHierarchy(memberId) {
  return await apiRequest(`/api/v1/network/hierarchy/${memberId}?status=active`, {
    method: 'GET'
  });
}

/**
 * 4. Admin Approves Partner Activation
 * POST /api/v1/admin/activations/:activationId/approve
 */
export async function apiApproveActivation(activationId, adminDetails = {}) {
  return await apiRequest(`/api/v1/admin/activations/${activationId}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      approved_at: new Date().toISOString(),
      admin_user: adminDetails.username || 'admin@cybershield.network',
      license_action: 'activate_and_dispatch_keys'
    })
  });
}

/**
 * 5. Admin Approves Withdrawal Payout (With Manual UTR & Screenshot)
 * POST /api/v1/admin/payouts/:payoutId/approve
 */
export async function apiApprovePayout(payoutId, payoutDetails) {
  return await apiRequest(`/api/v1/admin/payouts/${payoutId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payoutDetails)
  });
}
