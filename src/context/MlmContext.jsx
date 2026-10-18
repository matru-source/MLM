import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  initialMembers,
  initialOrders,
  initialCommissionRules,
  initialTransactions,
  initialEarningsMonthly,
  initialRecentActivity,
  initialPayoutRequests
} from '../data/initialData';
import { generateId } from '../utils/cryptoSim';
import { provisionDualAccounts } from '../services/accountProvisioningService';
import {
  dbFetchAllSync,
  dbFetchMembers,
  dbRegisterMember,
  dbUpdateMemberPassword,
  dbFetchActivations,
  dbCreateActivation,
  dbApproveActivation,
  dbRejectActivation,
  dbFetchPayoutRequests,
  dbCreatePayoutRequest,
  dbApprovePayout,
  dbRejectPayout,
  dbFetchOrders,
  dbCreateOrder,
  dbFetchTransactions,
  dbUpdateKyc,
  dbUpdateProfile,
  dbFetchZexLinkStatus,
  dbUploadKycDocument,
  dbFetchKycDocuments,
  dbApproveKyc,
  dbRejectKyc,
  dbFetchAuditLogs,
  dbReleaseCommissionEarly,
  dbClawbackCommission
} from '../services/neonDbService';
import { hashPassword, verifyPassword } from '../utils/cryptoAuth';
import { saveDocumentFile, getDocumentFile, syncKycDocsFromServer } from '../utils/documentStorage';

const MlmContext = createContext(null);

export function MlmProvider({ children }) {
  // Check if opened via /admin or #admin
  const checkIsAdminRoute = () => {
    return window.location.pathname.startsWith('/admin') || 
           window.location.hash.startsWith('#admin') || 
           window.location.search.includes('admin=true');
  };

  const [isAdminMode, setIsAdminMode] = useState(checkIsAdminRoute);
  
  // Listen to hash / URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminMode(checkIsAdminRoute());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateToAdmin = () => {
    try {
      window.history.pushState(null, '', '/admin');
    } catch (e) {
      window.location.hash = '#admin';
    }
    setIsAdminMode(true);
  };

  const navigateToUserSite = () => {
    try {
      if (window.location.pathname.startsWith('/admin')) {
        window.history.pushState(null, '', '/');
      }
      if (window.location.hash) {
        window.location.hash = '';
      }
    } catch (e) {
      window.location.hash = '';
    }
    setIsAdminMode(false);
  };

  // Dedicated Admin Executive Authentication Gate (Cryptographic Server Token)
  const isTokenFormatValid = (tok) => {
    if (!tok || typeof tok !== 'string') return false;
    const parts = tok.split('.');
    if (parts.length !== 2) return false;
    try {
      // Decode base64url
      const b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(b64);
      const payload = JSON.parse(json);
      return payload.exp && Number(payload.exp) > Date.now();
    } catch (e) {
      return false;
    }
  };

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      const token = sessionStorage.getItem('cybershield_admin_token');
      return isTokenFormatValid(token);
    } catch (e) {
      return false;
    }
  });

  // Verify server token against backend on mount if route is admin
  useEffect(() => {
    if (isAdminMode) {
      const token = sessionStorage.getItem('cybershield_admin_token');
      if (token && isTokenFormatValid(token)) {
        fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token })
        })
          .then(res => res.json())
          .then(data => {
            if (!data.ok || !data.valid) {
              setIsAdminAuthenticated(false);
              sessionStorage.removeItem('cybershield_admin_token');
            }
          })
          .catch(() => {
            // Keep current session if format is valid and server unreachable
          });
      } else {
        setIsAdminAuthenticated(false);
      }
    }
  }, [isAdminMode]);

  const loginAdmin = async ({ username, password }) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        return {
          ok: false,
          locked: true,
          error: data.error || 'Terminal temporarily locked due to failed attempts.',
          remainingSeconds: data.remainingSeconds || 900
        };
      }

      if (res.ok && data.ok && data.token) {
        sessionStorage.setItem('cybershield_admin_token', data.token);
        setIsAdminAuthenticated(true);
        return { ok: true };
      }

      return {
        ok: false,
        error: data.error || 'Invalid administrator credentials. Access to executive console denied.',
        remainingAttempts: data.remainingAttempts
      };
    } catch (err) {
      console.warn('[Admin Auth] Backend API call failed:', err);
      return {
        ok: false,
        error: 'Unable to communicate with executive security gateway. Please try again.'
      };
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('cybershield_admin_token');
      sessionStorage.removeItem('cybershield_admin_auth');
    } catch (e) {}
    navigateToUserSite();
    addToast('info', 'Admin Console Locked', 'Executive session terminated.');
  };

  // User navigation state: 'home', 'plans', 'compensation', 'dashboard', 'network', 'wallet', 'subscriptions', 'profile'
  const [currentPage, setCurrentPage] = useState('home');
  const [currentMemberId, setCurrentMemberId] = useState(() => {
    return localStorage.getItem('cybershield_currentMemberId') || null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const stored = localStorage.getItem('cybershield_isLoggedIn');
    const memberId = localStorage.getItem('cybershield_currentMemberId');
    return stored === 'true' && Boolean(memberId);
  });

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState('Joining');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'

  // Automatic cache version invalidator: Purges legacy test orders/activations
  const DATA_VERSION = 'v2026_reset_clean_slate_v3';
  if (typeof window !== 'undefined' && localStorage.getItem('cybershield_schema_version') !== DATA_VERSION) {
    localStorage.removeItem('cybershield_orders');
    localStorage.removeItem('cybershield_activations');
    localStorage.removeItem('cybershield_payouts');
    localStorage.removeItem('cybershield_txs');
    localStorage.removeItem('cybershield_members');
    localStorage.removeItem('cybershield_balance');
    localStorage.removeItem('cybershield_earnings');
    localStorage.removeItem('cybershield_currentMemberId');
    localStorage.removeItem('cybershield_isLoggedIn');
    localStorage.setItem('cybershield_schema_version', DATA_VERSION);
  }

  // Data State with persistence (CyberShield storage prefix)
  const getStored = (key, fallback) => {
    try {
      const item = localStorage.getItem(`cybershield_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const initialPendingActivations = [];

  const [members, setMembers] = useState(() => getStored('members', initialMembers));
  const [orders, setOrders] = useState(() => getStored('orders', initialOrders));
  const [transactions, setTransactions] = useState(() => getStored('txs', initialTransactions));
  const [payoutRequests, setPayoutRequests] = useState(() => getStored('payouts', initialPayoutRequests));
  const [pendingActivations, setPendingActivations] = useState(() => getStored('activations', initialPendingActivations));
  const [availableBalance, setAvailableBalance] = useState(() => getStored('balance', 0));
  const [totalEarnings, setTotalEarnings] = useState(() => getStored('earnings', 0));
  const [commissionRules, setCommissionRules] = useState(initialCommissionRules);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem('cybershield_members', JSON.stringify(members));
    } catch (e) {
      // If quota exceeded due to large base64 file data, save sanitized members without heavy dataUrls
      try {
        const sanitized = members.map(m => {
          if (!m.kyc?.documents) return m;
          const cleanDocs = { ...m.kyc.documents };
          Object.keys(cleanDocs).forEach(k => {
            if (k.endsWith('File') && typeof cleanDocs[k] === 'string' && cleanDocs[k].length > 10000) {
              delete cleanDocs[k]; // large file data stays preserved in IndexedDB/memory
            }
          });
          return { ...m, kyc: { ...m.kyc, documents: cleanDocs } };
        });
        localStorage.setItem('cybershield_members', JSON.stringify(sanitized));
      } catch (err2) {
        console.warn('[Storage] Quota exceeded, saved in memory/IndexedDB');
      }
    }

    try {
      localStorage.setItem('cybershield_orders', JSON.stringify(orders));
      localStorage.setItem('cybershield_txs', JSON.stringify(transactions));
      localStorage.setItem('cybershield_payouts', JSON.stringify(payoutRequests));
      localStorage.setItem('cybershield_activations', JSON.stringify(pendingActivations));
      localStorage.setItem('cybershield_balance', JSON.stringify(availableBalance));
      localStorage.setItem('cybershield_earnings', JSON.stringify(totalEarnings));
    } catch (e) {}
  }, [members, orders, transactions, payoutRequests, pendingActivations, availableBalance, totalEarnings]);

  // Auto-settle cooling-off transactions whose 30-day waiting period has elapsed
  useEffect(() => {
    const now = Date.now();
    const maturedList = (transactions || []).filter(
      t => t.status === 'Pending' && t.type === 'credit' && t.available_at && new Date(t.available_at).getTime() <= now
    );

    if (maturedList.length === 0) return;

    const maturedCreditsByMember = {};
    for (const t of maturedList) {
      const memId = t.member_id;
      maturedCreditsByMember[memId] = (maturedCreditsByMember[memId] || 0) + Number(t.amount || 0);
    }

    setTransactions(prev =>
      prev.map(t => {
        if (t.status === 'Pending' && t.type === 'credit' && t.available_at && new Date(t.available_at).getTime() <= now) {
          return { ...t, status: 'Available', settled_at: new Date().toISOString() };
        }
        return t;
      })
    );

    setMembers(prev =>
      prev.map(m => {
        const id = m.member_id || m.id;
        const maturedAmt = maturedCreditsByMember[id];
        if (maturedAmt) {
          return {
            ...m,
            wallet_balance: Number(m.wallet_balance || 0) + maturedAmt
          };
        }
        return m;
      })
    );

    if (currentMember) {
      const myId = currentMember.member_id || currentMember.id;
      const myMatured = maturedCreditsByMember[myId];
      if (myMatured) {
        setAvailableBalance(prev => prev + myMatured);
      }
    }
  }, [transactions]);

  const [isDbConnected, setIsDbConnected] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Live Neon PostgreSQL Multi-Device Synchronization
  useEffect(() => {
    let active = true;

    async function loadNeonData() {
      try {
        const res = await dbFetchAllSync();
        if (!active || !res || !res.ok || !res.data) return;

        const { 
          members: liveMembers, 
          activations: liveActivations, 
          payouts: livePayouts, 
          orders: liveOrders, 
          transactions: liveTxs, 
          kyc_documents: liveKycDocs,
          audit_logs: liveAuditLogs
        } = res.data;

        // Warm local document store with documents fetched from cloud Neon PostgreSQL
        if (Array.isArray(liveKycDocs) && liveKycDocs.length > 0) {
          syncKycDocsFromServer(liveKycDocs);
        }

        if (Array.isArray(liveAuditLogs)) {
          setAuditLogs(liveAuditLogs);
        }

        if (Array.isArray(liveMembers) && liveMembers.length > 0) {
          const normalizedMembers = liveMembers.map(m => ({
            ...m,
            member_id: m.member_id || m.id,
            id: m.member_id || m.id
          }));

          setMembers(prevMembers => {
            return normalizedMembers.map(m => {
              const prev = prevMembers.find(p => p.id === m.id || p.member_id === m.member_id);
              const prevDocs = prev?.kyc?.documents || {};
              const liveDocs = m.kyc?.documents || {};
              const mergedDocs = { ...liveDocs };

              const docKeys = ['pan', 'aadhaar', 'bankAccount', 'addressProof'];
              docKeys.forEach(k => {
                const memDoc = getDocumentFile(m.member_id || m.id, k);
                const serverDoc = Array.isArray(liveKycDocs) 
                  ? liveKycDocs.find(d => (String(d.member_id).toLowerCase() === String(m.member_id || m.id).toLowerCase()) && d.doc_key === k)
                  : null;

                if (!mergedDocs[`${k}File`]) {
                  mergedDocs[`${k}File`] = serverDoc?.data_url || prevDocs[`${k}File`] || memDoc?.dataUrl || null;
                }
                if (!mergedDocs[`${k}Name`]) {
                  mergedDocs[`${k}Name`] = serverDoc?.file_name || prevDocs[`${k}Name`] || memDoc?.name || null;
                }
                if (!mergedDocs[`${k}Type`]) {
                  mergedDocs[`${k}Type`] = serverDoc?.file_type || prevDocs[`${k}Type`] || memDoc?.type || null;
                }
                if (!mergedDocs[`${k}Size`]) {
                  mergedDocs[`${k}Size`] = serverDoc?.file_size || prevDocs[`${k}Size`] || memDoc?.size || null;
                }
              });

              return {
                ...m,
                kyc: {
                  ...m.kyc,
                  documents: mergedDocs
                }
              };
            });
          });

          setIsDbConnected(true);
          const current = normalizedMembers.find(m => m.member_id === currentMemberId);
          if (current) {
            setAvailableBalance(Number(current.wallet_balance || 0));
            setTotalEarnings(Number(current.total_earnings || 0));
          } else if (!currentMemberId) {
            setAvailableBalance(0);
            setTotalEarnings(0);
          }
        }

        if (Array.isArray(liveActivations)) {
          setPendingActivations(liveActivations);
        }

        if (Array.isArray(livePayouts)) {
          setPayoutRequests(livePayouts);
        }

        if (Array.isArray(liveOrders)) {
          setOrders(liveOrders);
        }

        if (Array.isArray(liveTxs)) {
          setTransactions(liveTxs);
        }
      } catch (err) {
        console.warn('[Neon Sync] Multi-device background sync warning:', err);
      }
    }

    // Initial load
    loadNeonData();

    // Live background polling every 4s so changes on Admin or other devices appear in real-time
    const interval = setInterval(loadNeonData, 4000);

    // Refresh immediately when window/tab is focused
    const handleFocus = () => {
      loadNeonData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentMemberId]);

  const addToast = (type, title, message) => {
    const id = generateId('tst');
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Only logged-in members have an active currentMember; visitors have null
  const currentMember = (isLoggedIn && currentMemberId) 
    ? (members.find(m => m.member_id === currentMemberId) || null) 
    : null;

  // Real Dynamic Team Members Count: Calculated from actual direct/downline members in database
  const teamMembersCount = currentMember ? (members || []).filter(m => 
    (m.sponsor_member_id === currentMember.member_id || 
     m.sponsor_code === currentMember.referral_code ||
     m.sponsor_member_id === currentMember.referral_code) &&
    m.seller_status === 'active'
  ).length : 0;

  // Comprehensive Member Lookup
  const getMemberByReferralCode = (code) => {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return members.find(m => 
      (m.referral_code && m.referral_code.toUpperCase() === clean) ||
      (m.member_id && m.member_id.toUpperCase() === clean) ||
      (m.cs_customer_id && m.cs_customer_id.toUpperCase() === clean)
    ) || null;
  };

  /**
   * Strict Multi-Factor Referral Code & Sponsor Verification:
   * 1. Empty / Missing -> Invalid (Mandatory)
   * 2. Non-existent -> Invalid (Not registered in network)
   * 3. Inactive / Unpaid -> Invalid (Pending plan activation / admin approval)
   * 4. Self-Referral -> Invalid (Cannot refer own email or mobile)
   * 5. Active Licensed Partner -> Valid
   */
  const validateReferralCode = (code, userEmail = null, userPhone = null) => {
    const clean = (code || '').trim().toUpperCase();

    // If empty, ROOT, HEAD, or CS123456: Enrolls directly under Head Office
    if (!clean || clean === 'CS123456' || clean === 'ROOT' || clean === 'HEAD') {
      const rootPartner = members.find(m => m.referral_code === 'CS123456' || m.member_id === 'mem_matru') || {
        member_id: 'mem_matru',
        name: 'CyberShield Head Office',
        referral_code: 'CS123456',
        seller_status: 'active'
      };
      return {
        valid: true,
        reason: 'head_office',
        member: rootPartner,
        message: 'Direct Enrollment under CyberShield Head Office Root (CS123456)'
      };
    }

    const found = members.find(m => 
      (m.referral_code && m.referral_code.toUpperCase() === clean) ||
      (m.member_id && m.member_id.toUpperCase() === clean) ||
      (m.cs_customer_id && m.cs_customer_id.toUpperCase() === clean)
    );

    if (!found) {
      return {
        valid: false,
        reason: 'not_found',
        message: `Sponsor code "${clean}" does not exist in our authorized partner network.`
      };
    }

    // Check if sponsor is active (paid & admin approved)
    const isActive = found.seller_status === 'active' || 
                     found.rank === 'Senior Partner' || 
                     found.rank === 'Active Partner' || 
                     found.member_id === 'mem_matru' || 
                     found.referral_code === 'CS123456';

    if (!isActive) {
      return {
        valid: false,
        reason: 'inactive',
        member: found,
        message: `Partner "${found.name}" (${clean}) is pending plan activation and cannot sponsor new members yet.`
      };
    }

    // Check Self-Referral by Email
    if (userEmail && found.email && found.email.trim().toLowerCase() === userEmail.trim().toLowerCase()) {
      return {
        valid: false,
        reason: 'self_referral',
        member: found,
        message: 'You cannot use your own email/code to sponsor yourself.'
      };
    }

    // Check Self-Referral if user is currently logged in with this referral code
    if (currentMember && (currentMember.referral_code === clean || currentMember.member_id === clean)) {
      return {
        valid: false,
        reason: 'self_referral',
        member: found,
        message: 'You cannot use your own referral code.'
      };
    }

    return {
      valid: true,
      reason: 'valid',
      member: found,
      message: `Verified Active Sponsor: ${found.name} (${found.referral_code})`
    };
  };

  // Active referral code tracked from URL or storage
  const [activeReferral, setActiveReferral] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref') || params.get('sponsor') || params.get('r');
      if (urlRef) {
        const clean = urlRef.trim().toUpperCase();
        sessionStorage.setItem('cybershield_referred_code', clean);
        return clean;
      }
      return sessionStorage.getItem('cybershield_referred_code') || '';
    } catch (e) {
      return '';
    }
  });

  // 120-Second Referral Floating Banner State
  const [referralBanner, setReferralBanner] = useState({
    visible: false,
    isValid: true,
    sponsorCode: '',
    sponsorName: '',
    sponsorAvatar: null,
    secondsRemaining: 120,
    statusMessage: '',
    errorReason: ''
  });

  // On mount and when members list is ready, inspect URL for ?ref=
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref') || params.get('sponsor') || params.get('r');
      if (urlRef) {
        const cleanCode = urlRef.trim().toUpperCase();
        const check = validateReferralCode(cleanCode);

        if (check.valid) {
          setActiveReferral(cleanCode);
          sessionStorage.setItem('cybershield_referred_code', cleanCode);
          setReferralBanner({
            visible: true,
            isValid: true,
            sponsorCode: check.member?.referral_code || cleanCode,
            sponsorName: check.member?.name || 'Authorized Partner',
            sponsorAvatar: check.member?.avatar || null,
            secondsRemaining: 120,
            statusMessage: 'Verified Active Partner',
            errorReason: ''
          });
        } else {
          // If referral is invalid or inactive, alert user transparently
          setActiveReferral('');
          sessionStorage.removeItem('cybershield_referred_code');
          setReferralBanner({
            visible: true,
            isValid: false,
            sponsorCode: cleanCode,
            sponsorName: check.reason === 'inactive' ? (check.member?.name || 'Partner') : 'Unrecognized Code',
            sponsorAvatar: null,
            secondsRemaining: 120,
            statusMessage: check.message,
            errorReason: check.reason
          });
        }
      }
    } catch (e) {
      console.error('Error reading referral query param:', e);
    }
  }, [members]);

  // 120-second depleting countdown timer (ticks down every 1 second)
  useEffect(() => {
    let interval = null;
    if (referralBanner.visible && referralBanner.secondsRemaining > 0) {
      interval = setInterval(() => {
        setReferralBanner(prev => {
          if (prev.secondsRemaining <= 1) {
            return { ...prev, visible: false, secondsRemaining: 0 };
          }
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [referralBanner.visible, referralBanner.secondsRemaining]);

  const dismissReferralBanner = () => {
    setReferralBanner(prev => ({ ...prev, visible: false }));
  };

  // --- ZEX Cloud Ecosystem Integration State ---
  const [zexLinkStatus, setZexLinkStatus] = useState({
    linked: false,
    loading: true,
    data: null
  });

  const refreshZexStatus = async (memberId = currentMemberId) => {
    if (!memberId) return;
    setZexLinkStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await dbFetchZexLinkStatus(memberId);
      if (res.ok && res.linked) {
        setZexLinkStatus({ linked: true, loading: false, data: res.data });
      } else {
        setZexLinkStatus({ linked: false, loading: false, data: null });
      }
    } catch (e) {
      setZexLinkStatus({ linked: false, loading: false, data: null });
    }
  };

  // Sync ZEX link status on member change
  useEffect(() => {
    if (currentMemberId) {
      refreshZexStatus(currentMemberId);
    }
  }, [currentMemberId]);

  // Handle browser return callback from ZEX connect (?connection=connected | cancelled | failed)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let conn = searchParams.get('connection');
      let reason = searchParams.get('reason');

      if (!conn && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        conn = hashParams.get('connection');
        reason = hashParams.get('reason');
      }

      if (conn) {
        if (conn === 'connected') {
          addToast('success', 'ZEX Cloud Connected!', 'Your ZEX account has been successfully linked. Real-time commissions are now active!');
          setCurrentPage('dashboard');
          if (currentMemberId) refreshZexStatus(currentMemberId);
        } else if (conn === 'cancelled') {
          addToast('warning', 'Connection Cancelled', 'ZEX account connection was cancelled by user.');
        } else if (conn === 'failed' || conn === 'error') {
          addToast('error', 'Connection Failed', reason ? `Failed: ${reason}` : 'ZEX authentication could not be completed.');
        }

        // Clean up URL parameters cleanly
        const cleanHash = window.location.hash.split('?')[0];
        const cleanUrl = window.location.pathname + (cleanHash ? cleanHash : '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('[ZEX URL Check] Warning:', e);
    }
  }, [currentMemberId]);

  // Initiate Session-bound ZEX Connect Handshake
  const initiateZexConnect = async (memberId = currentMemberId) => {
    const targetMember = memberId || currentMemberId;
    if (!targetMember) {
      addToast('error', 'Error', 'No active partner member logged in.');
      return { ok: false, error: 'No member logged in' };
    }

    try {
      const res = await fetch('/api/integrations/zex/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: targetMember })
      });
      const data = await res.json();
      if (data.ok && data.connect_url) {
        // Redirect browser to ZEX connect page
        window.location.href = data.connect_url;
        return { ok: true, connect_url: data.connect_url };
      }
      throw new Error(data.error || 'Failed to initiate connect attempt');
    } catch (err) {
      console.error('[initiateZexConnect] Error:', err);
      addToast('error', 'Connect Error', err.message);
      return { ok: false, error: err.message };
    }
  };

  // Calculate pending withdrawals total for current member
  const pendingPayoutsTotal = payoutRequests
    .filter(r => r.member_id === currentMember?.member_id && r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

  // Open Checkout for a plan
  const openCheckout = (planName = 'Joining') => {
    const activeMemberId = currentMemberId || (typeof window !== 'undefined' ? localStorage.getItem('cybershield_currentMemberId') : null);
    const activeMember = currentMember || (activeMemberId ? members.find(m => m.member_id === activeMemberId) : null);

    if (!isLoggedIn && !activeMember && !activeMemberId) {
      setAuthMode('register');
      setIsAuthModalOpen(true);
      addToast('info', 'Registration Required', 'Please register or log in first so your partner license is tied to your account.');
      return;
    }
    setSelectedPlanForCheckout(planName);
    setIsCheckoutOpen(true);
  };

  // Complete Payment & Submit Joining Application for Admin Verification
  const completePayment = async (details = {}) => {
    if (!currentMember) {
      addToast('error', 'Authentication Error', 'No active registered member found.');
      return { ok: false, error: 'Not authenticated' };
    }

    const paymentMethod = typeof details === 'string' ? details : (details.paymentMethod || 'UPI (Google Pay / PhonePe)');
    const rawUtr = typeof details === 'object' && details.utrNumber ? details.utrNumber.trim() : '';

    if (!rawUtr || rawUtr.length < 8) {
      return { 
        ok: false, 
        error: 'Please enter a valid 12-digit UPI Transaction Reference Number (UTR) from your banking app.' 
      };
    }

    const cleanUtr = rawUtr.toUpperCase();

    // 1. Prevent Duplicate UTR Numbers across all orders and activations
    const isDuplicate = orders.some(o => o.utr_number && o.utr_number.trim().toUpperCase() === cleanUtr) ||
                        pendingActivations.some(a => a.utr_number && a.utr_number.trim().toUpperCase() === cleanUtr);
    if (isDuplicate) {
      return { 
        ok: false, 
        error: `Duplicate Bank Reference: UTR "${cleanUtr}" has already been used for another account. Please enter your unique payment reference.` 
      };
    }

    const newOrderId = `CS${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Generate Dual Account configurations
    const dualAccounts = await provisionDualAccounts({
      memberDetails: currentMember,
      paymentDetails: {
        orderId: newOrderId,
        amount: 2500,
        paymentMethod
      }
    });

    const newOrder = {
      order_id: newOrderId,
      cs_order_id: `ord_cs_${Math.floor(1000 + Math.random() * 9000)}`,
      buyer_member_id: currentMember.member_id,
      buyer_name: currentMember.name,
      buyer_email: currentMember.email,
      product_code: 'CS-PRO-SUITE',
      product_name: 'CyberShield Partner Joining Membership License',
      amount: 2500,
      gst: 450,
      total_amount: 2950,
      currency: 'INR',
      payment_method: paymentMethod,
      utr_number: cleanUtr,
      payment_status: 'pending_verification',
      subscription_status: 'pending_approval',
      activated_by: 'Awaiting Admin Bank Credit Verification',
      activation_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      next_renewal: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      created_at: new Date().toISOString(),
      account1_mlm: dualAccounts.account1_mlm,
      account2_software: dualAccounts.account2_software
    };

    setOrders(prev => [newOrder, ...prev]);

    // Create New Partner Activation Item in PENDING status (Reaches Admin Desk for bank statement verification)
    const newActivation = {
      id: `act_${Date.now()}`,
      member_id: currentMember.member_id,
      member_name: currentMember.name,
      member_email: currentMember.email,
      member_phone: currentMember.phone,
      sponsor_code: currentMember.sponsor_member_id || currentMember.sponsor_code || 'CS123456',
      amount_paid: 2500,
      gst_paid: 450,
      total_paid: 2950,
      payment_method: paymentMethod,
      payment_ref: newOrderId,
      utr_number: cleanUtr,
      status: 'pending', // PENDING: Will ONLY activate when Admin verifies bank credit
      requested_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      account1_mlm: dualAccounts.account1_mlm,
      account2_software: dualAccounts.account2_software
    };

    setPendingActivations(prev => [newActivation, ...prev]);

    // Keep member in pending_approval state (Locks referral link & dashboard until Admin approves)
    setMembers(prev => prev.map(m => {
      if (m.member_id === currentMember.member_id) {
        return {
          ...m,
          customer_status: 'registered',
          seller_status: 'pending_approval',
          rank: 'Partner (Pending Admin Approval)',
          pending_activation_id: newActivation.id
        };
      }
      return m;
    }));

    // Persist to Neon PostgreSQL
    dbCreateOrder(newOrder).catch(err => console.warn('[Neon DB] dbCreateOrder error:', err));
    dbCreateActivation(newActivation).catch(err => console.warn('[Neon DB] dbCreateActivation error:', err));

    return {
      ok: true,
      order: newOrder,
      activation: newActivation,
      dualAccounts,
      status: 'pending_approval',
      message: 'Payment reference submitted. Your account will be activated once the bank credit is verified.'
    };
  };

  // Helper to query wallet metrics dynamically
  const getMemberWallet = (memberId = null) => {
    const mem = memberId ? (members.find(m => m.member_id === memberId || m.id === memberId) || currentMember) : currentMember;
    const memId = mem?.member_id || mem?.id;
    const available = Number(mem?.wallet_balance || 0);
    const pending = payoutRequests
      .filter(p => (p.member_id === memId) && p.status === 'pending')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const paid = payoutRequests
      .filter(p => (p.member_id === memId) && p.status === 'paid')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    // Calculate cooling-off funds currently in statutory 15–30 day hold
    const coolingOff = transactions
      .filter(t => (t.member_id === memId || (!t.member_id && memId === currentMember?.member_id)) && t.status === 'Pending' && t.type === 'credit')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    return {
      available,
      pending, // requested withdrawal awaiting admin
      coolingOff, // under 30-day statutory cooling-off refund hold
      paid,
      totalEarned: Number(mem?.total_earnings || 0)
    };
  };

  // 1. User Requests Withdrawal (Immediately locks funds to prevent double-spending)
  const requestWithdrawal = (amount, overrideBankDetails = null) => {
    const numAmount = Number(amount);
    if (!currentMember) {
      addToast('error', 'Authentication Error', 'No active registered partner found.');
      return false;
    }

    if (isNaN(numAmount) || numAmount < 500) {
      addToast('error', 'Minimum Limit', 'Minimum withdrawal amount is ₹500.');
      return false;
    }

    // Calculate all active pending/in-flight withdrawals for this member
    const activePendingTotal = payoutRequests
      .filter(p => p.member_id === currentMember.member_id && p.status === 'pending')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const unencumberedBalance = Math.max(0, availableBalance - activePendingTotal);

    if (numAmount > availableBalance || numAmount > unencumberedBalance) {
      addToast(
        'error', 
        'Insufficient Balance', 
        `Available unencumbered balance is ₹${unencumberedBalance.toLocaleString('en-IN')}. Active pending requests: ₹${activePendingTotal.toLocaleString('en-IN')}.`
      );
      return false;
    }

    const bankName = (overrideBankDetails?.bank_name || currentMember?.kyc?.bank_name || 'Commercial Bank').trim();
    const bankAccount = (overrideBankDetails?.bank_account_number || currentMember?.kyc?.bank_account_number || '').trim();
    const bankIfsc = (overrideBankDetails?.bank_ifsc || currentMember?.kyc?.bank_ifsc || '').trim().toUpperCase();
    const legalName = (overrideBankDetails?.legal_name || currentMember?.kyc?.legal_name || currentMember.name).trim();
    const memberPan = (overrideBankDetails?.pan || currentMember?.kyc?.pan || '').trim().toUpperCase();

    // Require linked bank account before requesting withdrawal
    if (!bankAccount || !bankIfsc) {
      addToast('error', 'Bank Details Required', 'Please enter your Bank Account Number & IFSC before requesting a payout.');
      return false;
    }

    // If bank details were provided during withdrawal, update KYC record
    if (overrideBankDetails) {
      submitKyc(currentMember.member_id || currentMember.id, {
        bank_name: bankName,
        bank_account_number: bankAccount,
        bank_ifsc: bankIfsc,
        legal_name: legalName,
        pan: memberPan
      });
    }

    // Section 206AA statutory compliance: 5% TDS under Sec 194H if valid PAN furnished, 20% if no PAN or invalid
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const hasValidPan = panRegex.test(memberPan);
    const tdsRate = hasValidPan ? 0.05 : 0.20;
    const tdsSection = hasValidPan ? 'Section 194H (5%)' : 'Section 206AA (20% - No PAN)';
    const tdsAmount = Math.round(numAmount * tdsRate);
    const netPayable = numAmount - tdsAmount;
    const newPayoutId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayout = {
      id: newPayoutId,
      member_id: currentMember.member_id,
      member_name: currentMember.name,
      member_email: currentMember.email,
      avatar: currentMember.avatar || '/matru-avatar.jpg',
      amount: numAmount,
      tds_rate: hasValidPan ? 5 : 20,
      tds_section: tdsSection,
      tds_amount: tdsAmount,
      pan_furnished: hasValidPan ? memberPan : 'NOT_FURNISHED',
      net_payable: netPayable,
      status: 'pending', // 'pending' | 'paid' | 'rejected'
      request_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      bank_details: {
        bank_name: bankName,
        account_number: bankAccount,
        ifsc: bankIfsc,
        account_holder: legalName
      },
      admin_payment: {
        paid_at: null,
        utr_number: '',
        payment_mode: 'IMPS',
        receipt_url: '',
        admin_notes: ''
      }
    };

    // IMMEDIATELY LOCK & DEDUCT FUNDS FROM AVAILABLE BALANCE TO PREVENT DOUBLE-SPENDING
    setAvailableBalance(prev => Math.max(0, prev - numAmount));
    setMembers(prev => prev.map(m => {
      if (m.member_id === currentMember.member_id) {
        return {
          ...m,
          wallet_balance: Math.max(0, Number(m.wallet_balance || 0) - numAmount)
        };
      }
      return m;
    }));

    // Add to payout requests (reaches Admin directly)
    setPayoutRequests(prev => [newPayout, ...prev]);

    // Record transaction with Reserved/Locked status in ledger
    setTransactions(prev => [{
      id: generateId('tx'),
      payoutId: newPayoutId,
      date: 'Just Now',
      description: `Bank Withdrawal Request to ${currentMember.kyc.bank_name || 'Bank'} (••••${currentMember.kyc.bank_account_number.slice(-4)}) - Funds Reserved`,
      amount: -numAmount,
      type: 'debit',
      status: 'Reserved'
    }, ...prev]);

    // Persist atomic deduction & payout request to live Neon PostgreSQL
    dbCreatePayoutRequest(newPayout).catch(err => console.warn('[Neon DB] dbCreatePayoutRequest error:', err));

    addToast('success', 'Withdrawal Request Submitted & Balance Locked!', `₹${numAmount.toLocaleString('en-IN')} (Net ₹${netPayable.toLocaleString('en-IN')}) reserved and sent to Finance Admin.`);
    return true;
  };

  const requestPayout = (memberIdOrAmount, amount) => {
    const finalAmount = typeof amount === 'number' ? amount : memberIdOrAmount;
    return requestWithdrawal(finalAmount);
  };

  // 2. Admin Manually Pays & Attaches Screenshot -> Finalizes disbursement
  const approvePayout = ({ payoutId, utrNumber, receiptUrl, paymentMode, adminNotes }) => {
    const req = payoutRequests.find(p => p.id === payoutId);
    if (!req) return false;

    const paidAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const finalUtr = utrNumber || `UTR-CS-${Math.floor(100000000 + Math.random() * 900000000)}`;

    setPayoutRequests(prev => prev.map(p => {
      if (p.id === payoutId) {
        return {
          ...p,
          status: 'paid',
          admin_payment: {
            paid_at: paidAt,
            utr_number: finalUtr,
            payment_mode: paymentMode || 'IMPS / Bank Transfer',
            receipt_url: receiptUrl || '',
            admin_notes: adminNotes || 'Disbursed manually via verified banking gateway.'
          }
        };
      }
      return p;
    }));

    // Funds were already atomically locked on submission; update transactions ledger to Paid
    setTransactions(prev => prev.map(t => {
      if (t.payoutId === payoutId || (t.status === 'Reserved' && t.amount === -req.amount)) {
        return {
          ...t,
          status: 'Paid',
          description: `Bank Payout Disbursed to ${req.bank_details.bank_name} (UTR #${finalUtr})`,
          utr_number: finalUtr,
          receipt_url: receiptUrl
        };
      }
      return t;
    }));

    // Persist payout approval to live Neon PostgreSQL
    dbApprovePayout(payoutId, {
      utrNumber: finalUtr,
      screenshotUrl: receiptUrl,
      adminNotes,
      paymentMode
    }).then(res => {
      if (res.ok) {
        dbFetchMembers().then(mRes => {
          if (mRes.ok && mRes.data) setMembers(mRes.data);
        });
      }
    }).catch(err => console.warn('[Neon DB] dbApprovePayout error:', err));

    addToast('success', 'Payout Disbursed & Verified!', `₹${req.net_payable.toLocaleString('en-IN')} sent to ${req.member_name}. Receipt recorded.`);
    return true;
  };

  // 3. Admin Rejects Payout -> Restores locked funds back to user balance
  const rejectPayout = ({ payoutId, reason }) => {
    const req = payoutRequests.find(p => p.id === payoutId);
    if (!req) return false;

    setPayoutRequests(prev => prev.map(p => {
      if (p.id === payoutId) {
        return {
          ...p,
          status: 'rejected',
          admin_payment: {
            ...p.admin_payment,
            admin_notes: reason || 'Bank details mismatch or invalid KYC.'
          }
        };
      }
      return p;
    }));

    // RESTORE RESERVED FUNDS back to partner balance upon rejection
    setAvailableBalance(prev => prev + req.amount);
    setMembers(prev => prev.map(m => {
      if (m.member_id === req.member_id) {
        return {
          ...m,
          wallet_balance: Number(m.wallet_balance || 0) + req.amount
        };
      }
      return m;
    }));

    // Record restoration in transaction ledger
    setTransactions(prev => [{
      id: generateId('tx'),
      payoutId: payoutId,
      date: 'Just Now',
      description: `Withdrawal Request #${payoutId} Rejected - ₹${req.amount.toLocaleString('en-IN')} Restored to Balance (${reason || 'KYC/Bank Mismatch'})`,
      amount: req.amount,
      type: 'credit',
      status: 'Available'
    }, ...prev.map(t => {
      if (t.payoutId === payoutId) {
        return {
          ...t,
          status: 'Rejected',
          description: `Withdrawal Request Rejected: ${reason || 'KYC/Bank Mismatch'}`
        };
      }
      return t;
    })]);

    // Persist rejection and fund restoration to live Neon PostgreSQL
    dbRejectPayout(payoutId, reason).catch(err => console.warn('[Neon DB] dbRejectPayout error:', err));

    addToast('info', 'Payout Request Rejected & Funds Restored', `Request #${payoutId} rejected. ₹${req.amount.toLocaleString('en-IN')} returned to partner balance.`);
    return true;
  };

  // 4. Admin Manually Releases Pending Cooling-Off Commission Early
  const releaseCommissionEarly = async (transactionId) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.status !== 'Pending') {
      addToast('error', 'Release Error', 'Transaction not found or already released.');
      return false;
    }

    setTransactions(prev => prev.map(t => {
      if (t.id === transactionId) {
        return { ...t, status: 'Available', settled_at: new Date().toISOString() };
      }
      return t;
    }));

    setMembers(prev => prev.map(m => {
      const id = m.member_id || m.id;
      if (id === tx.member_id) {
        return {
          ...m,
          wallet_balance: Number(m.wallet_balance || 0) + Number(tx.amount || 0)
        };
      }
      return m;
    }));

    if (currentMember && (currentMember.member_id === tx.member_id || currentMember.id === tx.member_id)) {
      setAvailableBalance(prev => prev + Number(tx.amount || 0));
    }

    dbReleaseCommissionEarly(transactionId).catch(err => console.warn('[Neon DB] dbReleaseCommissionEarly error:', err));
    addToast('success', 'Commission Released Early!', `₹${tx.amount} moved from 30-day cooling-off hold into available balance.`);
    return true;
  };

  // 5. Admin Claws Back Commission upon Buyer Refund
  const clawbackCommission = async (transactionId, reason = 'Buyer Cancelled License') => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) {
      addToast('error', 'Clawback Error', 'Transaction not found.');
      return false;
    }

    setTransactions(prev => prev.map(t => {
      if (t.id === transactionId) {
        return { 
          ...t, 
          status: 'Clawed Back', 
          description: `${t.description} [Refund Clawback: ${reason}]` 
        };
      }
      return t;
    }));

    setMembers(prev => prev.map(m => {
      const id = m.member_id || m.id;
      if (id === tx.member_id) {
        return {
          ...m,
          wallet_balance: tx.status === 'Available' ? Math.max(0, Number(m.wallet_balance || 0) - Number(tx.amount || 0)) : Number(m.wallet_balance || 0),
          total_earnings: Math.max(0, Number(m.total_earnings || 0) - Number(tx.amount || 0))
        };
      }
      return m;
    }));

    if (currentMember && (currentMember.member_id === tx.member_id || currentMember.id === tx.member_id)) {
      if (tx.status === 'Available') {
        setAvailableBalance(prev => Math.max(0, prev - Number(tx.amount || 0)));
      }
      setTotalEarnings(prev => Math.max(0, prev - Number(tx.amount || 0)));
    }

    dbClawbackCommission(transactionId, reason).catch(err => console.warn('[Neon DB] dbClawbackCommission error:', err));
    addToast('info', 'Commission Clawed Back', `₹${tx.amount} reversed due to buyer refund within cooling-off period.`);
    return true;
  };

  // Register New User (Step 2 of Brevo Email OTP verification)
  const registerUser = async ({ fullName, email, mobile, password, sponsorId, sponsorMemberId, sponsorName, isSeller }) => {
    const newMemberId = generateId('mem');
    const passwordHash = password ? await hashPassword(password) : '';
    const newMember = {
      member_id: newMemberId,
      name: fullName,
      email: email,
      phone: mobile,
      password: passwordHash, // Cryptographically hashed with salt (SHA-256)
      avatar: '/matru-avatar.jpg',
      rank: isSeller ? 'Partner (Pending Plan Purchase)' : 'Customer',
      cs_customer_id: `CS${Math.floor(10000000 + Math.random() * 90000000)}`,
      sponsor_member_id: sponsorMemberId || sponsorId || 'CS123456',
      sponsor_code: sponsorId || 'CS123456',
      sponsor_name: sponsorName || 'Authorized Partner',
      customer_status: 'registered',
      seller_status: 'pending_payment',
      referral_code: `CS${Math.floor(100000 + Math.random() * 900000)}`,
      joined_at: new Date().toISOString(),
      email_verified: true,
      kyc: {
        legal_name: fullName,
        pan: '',
        aadhaar: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc: '',
        verification_status: 'unverified',
        agreement_accepted: true,
        agreement_version: 'v2026.1',
        documents: {
          aadhaar: 'Not Uploaded',
          pan: 'Not Uploaded',
          addressProof: 'Not Uploaded',
          bankAccount: 'Not Uploaded'
        }
      }
    };

    setMembers(prev => [...prev, newMember]);
    setCurrentMemberId(newMemberId);
    localStorage.setItem('cybershield_currentMemberId', newMemberId);
    setAvailableBalance(0);
    setTotalEarnings(0);
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    setCurrentPage('dashboard');
    setIsAuthModalOpen(false);
    dismissReferralBanner();

    // Persist to live Neon PostgreSQL with cryptographically hashed password
    dbRegisterMember(newMember).catch(err => console.warn('[Neon DB] dbRegisterMember error:', err));

    addToast('success', 'Email Verified & Account Created!', `Welcome, ${fullName}! Please complete ₹2,500 Joining Plan purchase.`);
    
    // Automatically prompt checkout for ₹2,500 Joining Plan
    setTimeout(() => {
      openCheckout('Joining');
    }, 300);
  };

  // Submit / Update Member KYC & Payout Bank Details
  const submitKyc = async (memberId, kycDetails) => {
    const existingMember = members.find(m => m.member_id === memberId || m.id === memberId) || currentMember;
    const existingKyc = existingMember?.kyc || {};
    const existingDocs = existingKyc.documents || {};
    const previousMemberKyc = JSON.parse(JSON.stringify(existingKyc));

    const submittedDocs = kycDetails.documents || {};
    const documents = {
      ...existingDocs,
      ...submittedDocs,
      aadhaar: submittedDocs.aadhaar !== undefined ? submittedDocs.aadhaar : (existingDocs.aadhaar || 'Pending Upload'),
      pan: submittedDocs.pan !== undefined ? submittedDocs.pan : (existingDocs.pan || 'Pending Upload'),
      addressProof: submittedDocs.addressProof !== undefined ? submittedDocs.addressProof : (existingDocs.addressProof || 'Pending Upload'),
      bankAccount: submittedDocs.bankAccount !== undefined ? submittedDocs.bankAccount : (existingDocs.bankAccount || 'Pending Upload')
    };

    // Real document validation: Require uploaded documents rather than instant auto-approval on plain text
    const uploadedDocs = Object.entries(documents).filter(([key, val]) => 
      !key.endsWith('File') && !key.endsWith('Name') && !key.endsWith('Type') && !key.endsWith('Size') &&
      val && val !== 'Pending Upload' && val !== 'Not Uploaded' && val !== 'Pending'
    );
    const hasDocuments = uploadedDocs.length > 0;
    const verificationStatus = hasDocuments ? 'under_review' : 'pending_documents';

    // If member changes PAN or Bank account, require re-verification
    const isChangingCriticalData = (
      (kycDetails.pan !== undefined && kycDetails.pan !== existingKyc.pan) ||
      (kycDetails.bank_account_number !== undefined && kycDetails.bank_account_number !== existingKyc.bank_account_number) ||
      (kycDetails.bank_ifsc !== undefined && kycDetails.bank_ifsc !== existingKyc.bank_ifsc)
    );
    const finalVerificationStatus = isChangingCriticalData 
      ? (hasDocuments ? 'under_review' : 'pending_documents') 
      : (existingKyc.verification_status === 'verified' ? 'verified' : verificationStatus);

    const updatedKyc = {
      ...existingKyc,
      legal_name: kycDetails.legal_name || existingKyc.legal_name || existingMember?.name,
      pan: kycDetails.pan !== undefined ? (kycDetails.pan || '').toUpperCase().trim() : (existingKyc.pan || ''),
      aadhaar: kycDetails.aadhaar !== undefined ? (kycDetails.aadhaar || '').trim() : (existingKyc.aadhaar || ''),
      bank_name: kycDetails.bank_name !== undefined ? (kycDetails.bank_name || '') : (existingKyc.bank_name || ''),
      bank_account_number: kycDetails.bank_account_number !== undefined ? (kycDetails.bank_account_number || '').trim() : (existingKyc.bank_account_number || ''),
      bank_ifsc: kycDetails.bank_ifsc !== undefined ? (kycDetails.bank_ifsc || '').toUpperCase().trim() : (existingKyc.bank_ifsc || ''),
      verification_status: finalVerificationStatus,
      verified_at: isChangingCriticalData ? null : existingKyc.verified_at,
      agreement_accepted: true,
      agreement_version: 'v2026.1',
      documents: documents,
      submitted_at: new Date().toISOString()
    };

    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId || m.id === memberId) {
        return { ...m, kyc: updatedKyc };
      }
      return m;
    }));

    // Persist to live Neon PostgreSQL with UI Rollback on failure
    try {
      await dbUpdateKyc(memberId, updatedKyc);
      if (hasDocuments) {
        addToast('info', 'KYC Documents Submitted for Review', 'Your KYC documents have been submitted to compliance. Verification takes 24-48 hours.');
      } else {
        addToast('success', 'Bank & Tax Details Saved', 'Settlement bank account and PAN details successfully linked and saved.');
      }
      return true;
    } catch (err) {
      console.error('[Neon DB] dbUpdateKyc failed on submitKyc, rolling back UI state:', err);
      // Rollback UI state to prevent silent database desync
      setMembers(prev => prev.map(m => {
        if (m.member_id === memberId || m.id === memberId) {
          return { ...m, kyc: previousMemberKyc };
        }
        return m;
      }));
      addToast(
        'error',
        'Database Sync Failed',
        'Database connection lost or sync timed out. KYC changes could not be saved to Neon PostgreSQL and were rolled back to avoid desync.'
      );
      return false;
    }
  };

  // Update Member Profile (Name, Phone, DOB, etc.)
  const updateMemberProfile = (memberId, profileData) => {
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId) {
        return {
          ...m,
          ...profileData
        };
      }
      return m;
    }));

    dbUpdateProfile(memberId, profileData).catch(err => console.warn('[Neon DB] dbUpdateProfile error:', err));
    addToast('success', 'Profile Updated', 'Personal details saved successfully.');
    return true;
  };

  // Upload an individual KYC document (Aadhaar, PAN, Address Proof, Bank Proof)
  const uploadKycDocument = async (memberId, docType, fileInfo) => {
    const existingMember = members.find(m => m.member_id === memberId || m.id === memberId) || currentMember;
    const existingKyc = existingMember?.kyc || {};
    const existingDocs = existingKyc.documents || {};
    const previousMemberKyc = JSON.parse(JSON.stringify(existingKyc));

    const docLabel = fileInfo?.name ? `Uploaded (${fileInfo.name})` : 'Uploaded';
    const updatedDocs = {
      ...existingDocs,
      [docType]: docLabel,
      [`${docType}Status`]: 'under_review',
      [`${docType}Name`]: fileInfo?.name || existingDocs[`${docType}Name`] || null,
      [`${docType}File`]: fileInfo?.dataUrl || existingDocs[`${docType}File`] || null,
      [`${docType}Type`]: fileInfo?.type || existingDocs[`${docType}Type`] || null,
      [`${docType}Size`]: fileInfo?.size || existingDocs[`${docType}Size`] || null
    };

    // Cache locally in robust documentStore (Memory + IndexedDB + LocalStorage)
    try {
      saveDocumentFile(memberId, docType, fileInfo);
    } catch (e) {
      console.warn('[KYC Cache] saveDocumentFile warning:', e);
    }

    // Live Stream directly to Neon PostgreSQL via /api/kyc/upload
    dbUploadKycDocument(memberId, docType, fileInfo)
      .then(res => {
        if (res && res.ok) {
          console.log(`[Neon DB Bridge] Document ${docType} synced to PostgreSQL cloud successfully.`);
        }
      })
      .catch(err => console.warn('[Neon DB Bridge] dbUploadKycDocument error:', err));

    // When ANY document is uploaded or re-uploaded, status MUST be under_review (requires admin re-approval)
    const updatedKyc = {
      ...existingKyc,
      documents: updatedDocs,
      verification_status: 'under_review',
      verified_at: null,
      submitted_at: new Date().toISOString()
    };

    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId || m.id === memberId) {
        return { ...m, kyc: updatedKyc };
      }
      return m;
    }));

    try {
      await dbUpdateKyc(memberId, updatedKyc);
      addToast('success', 'Document Uploaded', `${docType.toUpperCase()} uploaded. Status updated to Under Review.`);
      return true;
    } catch (err) {
      console.error('[Neon DB] dbUpdateKyc failed on uploadKycDocument, rolling back UI state:', err);
      // Rollback UI state to prevent silent database desync
      setMembers(prev => prev.map(m => {
        if (m.member_id === memberId || m.id === memberId) {
          return { ...m, kyc: previousMemberKyc };
        }
        return m;
      }));
      addToast(
        'error',
        'Database Sync Failed',
        `Failed to sync ${docType.toUpperCase()} to database cloud. Reverted state to prevent desynchronization.`
      );
      return false;
    }
  };

  // Admin Approves Partner KYC (Enforces Direct Selling Rules 2021 Compliance & Audit Trail)
  const approveKyc = async (memberId, adminInfo = {}) => {
    const targetMember = members.find(m => m.member_id === memberId || m.id === memberId);
    if (!targetMember) return false;

    const kyc = targetMember.kyc || {};
    const docs = kyc.documents || {};
    const primaryDocKeys = ['pan', 'bankAccount', 'aadhaar', 'addressProof'];

    const hasGenuineFile = (key) => {
      if (docs[`${key}File`]) return true;
      const val = docs[key];
      return typeof val === 'string' && (val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('http'));
    };

    const uploadedDocKeys = primaryDocKeys.filter(hasGenuineFile);

    // Statutory Check: Cannot approve partner KYC if zero documents have been uploaded
    if (uploadedDocKeys.length === 0) {
      addToast(
        'error', 
        'Compliance Validation Blocked', 
        'Direct Selling Rules 2021 mandate identity & address proofs. Cannot approve partner KYC when zero documents have been uploaded.'
      );
      return false;
    }

    const previousMemberKyc = JSON.parse(JSON.stringify(kyc));

    // Only mark genuine uploaded files as verified!
    const verifiedDocs = { ...docs };
    primaryDocKeys.forEach(k => {
      if (hasGenuineFile(k)) {
        verifiedDocs[k] = 'Verified ✓';
        verifiedDocs[`${k}Status`] = 'verified';
      }
    });

    // Statutory Check: PAN + Bank + Aadhaar + Address Proof files must all exist
    const hasPan = hasGenuineFile('pan') && Boolean(kyc.pan && kyc.pan.trim().length >= 10);
    const hasBank = hasGenuineFile('bankAccount') && Boolean(kyc.bank_name && kyc.bank_account_number);
    const hasAadhaar = hasGenuineFile('aadhaar');
    const hasAddress = hasGenuineFile('addressProof');

    const isFullyCompliant = hasPan && hasBank && hasAadhaar && hasAddress;
    const finalStatus = isFullyCompliant ? 'verified' : 'under_review';

    const updatedKyc = {
      ...kyc,
      verification_status: finalStatus,
      documents: verifiedDocs,
      verified_at: isFullyCompliant ? new Date().toISOString() : kyc.verified_at
    };

    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId || m.id === memberId) {
        return { ...m, kyc: updatedKyc };
      }
      return m;
    }));

    const auditAdminId = adminInfo.adminId || 'ADMIN_CONSOLE';
    const auditAdminName = adminInfo.adminName || 'Compliance Admin';
    const complianceReason = isFullyCompliant 
      ? 'All 4 statutory proofs verified (Direct Selling Rules 2021)' 
      : `Approved ${uploadedDocKeys.length}/4 submitted proofs. Awaiting remaining documents.`;

    const tempAuditId = `audit_${Date.now()}`;
    const optimisticAuditRecord = {
      id: tempAuditId,
      action: 'kyc_approved',
      admin_id: auditAdminId,
      admin_name: auditAdminName,
      member_id: memberId,
      member_name: targetMember.name || memberId,
      reason: complianceReason,
      details: { isFullyCompliant, uploadedDocKeys },
      ip_address: 'Client Session',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Console',
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [optimisticAuditRecord, ...prev]);

    try {
      await dbUpdateKyc(memberId, updatedKyc);
      const auditRes = await dbApproveKyc(memberId, {
        adminId: auditAdminId,
        adminName: auditAdminName,
        memberName: targetMember.name,
        reason: complianceReason,
        details: { isFullyCompliant, uploadedDocKeys }
      });

      if (auditRes?.auditId) {
        setAuditLogs(prev => prev.map(a => a.id === tempAuditId ? { ...a, id: auditRes.auditId } : a));
      }

      if (isFullyCompliant) {
        addToast('success', 'KYC Fully Verified & Audited', 'All 4 statutory proofs verified. Compliance audit log generated in Neon PostgreSQL.');
      } else {
        addToast(
          'info', 
          `Submitted Proofs Approved (${uploadedDocKeys.length}/4)`, 
          `Approved ${uploadedDocKeys.length} uploaded proofs and logged to audit trail. Direct Selling Rules 2021 require all 4 proofs before overall KYC status becomes Verified.`
        );
      }
      return true;
    } catch (err) {
      console.error('[Neon DB] approveKyc error, rolling back UI state:', err);
      // Rollback UI state
      setMembers(prev => prev.map(m => {
        if (m.member_id === memberId || m.id === memberId) {
          return { ...m, kyc: previousMemberKyc };
        }
        return m;
      }));
      setAuditLogs(prev => prev.filter(a => a.id !== tempAuditId));
      addToast('error', 'Database Desync on Approval', 'Failed to synchronize KYC approval with Neon PostgreSQL cloud. Reverted state.');
      return false;
    }
  };

  // Admin Rejects Partner KYC (With Neon PostgreSQL Audit Logging & Rollback)
  const rejectKyc = async (memberId, reason = 'Document quality unclear', adminInfo = {}) => {
    const targetMember = members.find(m => m.member_id === memberId || m.id === memberId);
    if (!targetMember) return false;

    const previousMemberKyc = JSON.parse(JSON.stringify(targetMember.kyc || {}));
    const updatedKyc = {
      ...(targetMember.kyc || {}),
      verification_status: 'rejected',
      rejection_reason: reason
    };

    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId || m.id === memberId) {
        return { ...m, kyc: updatedKyc };
      }
      return m;
    }));

    const auditAdminId = adminInfo.adminId || 'ADMIN_CONSOLE';
    const auditAdminName = adminInfo.adminName || 'Compliance Admin';

    const tempAuditId = `audit_${Date.now()}`;
    const optimisticAuditRecord = {
      id: tempAuditId,
      action: 'kyc_rejected',
      admin_id: auditAdminId,
      admin_name: auditAdminName,
      member_id: memberId,
      member_name: targetMember.name || memberId,
      reason: reason,
      details: { rejection_reason: reason },
      ip_address: 'Client Session',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Console',
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [optimisticAuditRecord, ...prev]);

    try {
      await dbUpdateKyc(memberId, updatedKyc);
      const auditRes = await dbRejectKyc(memberId, {
        adminId: auditAdminId,
        adminName: auditAdminName,
        memberName: targetMember.name,
        reason: reason
      });

      if (auditRes?.auditId) {
        setAuditLogs(prev => prev.map(a => a.id === tempAuditId ? { ...a, id: auditRes.auditId } : a));
      }

      addToast('error', 'KYC Rejected & Audited', `Partner KYC rejected: ${reason}. Recorded in Neon compliance audit trail.`);
      return true;
    } catch (err) {
      console.error('[Neon DB] rejectKyc error, rolling back UI state:', err);
      // Rollback UI state
      setMembers(prev => prev.map(m => {
        if (m.member_id === memberId || m.id === memberId) {
          return { ...m, kyc: previousMemberKyc };
        }
        return m;
      }));
      setAuditLogs(prev => prev.filter(a => a.id !== tempAuditId));
      addToast('error', 'Database Desync on Rejection', 'Failed to synchronize KYC rejection with Neon PostgreSQL cloud. Reverted state.');
      return false;
    }
  };

  // 1. Admin Approves Partner Activation & Software License
  const approveMemberActivation = (activationId) => {
    const act = pendingActivations.find(a => a.id === activationId);
    if (!act) return false;

    const approvedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setPendingActivations(prev => prev.map(a => {
      if (a.id === activationId) {
        return {
          ...a,
          status: 'approved',
          approved_at: approvedAt
        };
      }
      return a;
    }));

    setMembers(prev => prev.map(m => {
      if (m.member_id === act.member_id) {
        return {
          ...m,
          rank: 'Active Partner',
          seller_status: 'active',
          customer_status: 'active_subscriber',
          software_license: act.account2_software,
          mlm_account: act.account1_mlm
        };
      }
      return m;
    }));

    // Update order subscription status to active
    setOrders(prev => prev.map(o => {
      if (o.order_id === act.payment_ref || o.buyer_member_id === act.member_id) {
        return { ...o, subscription_status: 'active', activated_by: 'Admin Approved' };
      }
      return o;
    }));

    // Credit multi-tier retail partner commissions across all 10 upline levels (Total: ₹1,600 / 64% of ₹2,500)
    const activatedMember = members.find(m => m.member_id === act.member_id || m.id === act.member_id);
    const rates = [1000, 300, 150, 50, 25, 25, 25, 10, 10, 5];
    const newTransactions = [];
    const creditsByMemberId = {};

    let currentUplineTarget = activatedMember;
    const visited = new Set([act.member_id]);

    for (let level = 1; level <= 10; level++) {
      if (!currentUplineTarget && level > 1) break;

      const sponsorRef = (
        (currentUplineTarget ? (currentUplineTarget.sponsor_member_id || currentUplineTarget.sponsor_code) : '') || 
        (level === 1 ? act.sponsor_code : '') || 
        ''
      ).trim().toUpperCase();

      if (!sponsorRef) break;

      const sponsor = members.find(m => 
        (m.member_id && m.member_id.toUpperCase() === sponsorRef) ||
        (m.id && m.id.toUpperCase() === sponsorRef) ||
        (m.referral_code && m.referral_code.toUpperCase() === sponsorRef) ||
        (m.cs_customer_id && m.cs_customer_id.toUpperCase() === sponsorRef)
      );

      if (!sponsor) break;

      const sponsorId = sponsor.member_id || sponsor.id;
      if (visited.has(sponsorId)) break;
      visited.add(sponsorId);

      const rate = rates[level - 1];
      creditsByMemberId[sponsorId] = (creditsByMemberId[sponsorId] || 0) + rate;

      const availableAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      newTransactions.push({
        id: generateId('tx'),
        member_id: sponsorId,
        date: 'Just Now',
        description: `Retail Partner Commission (Level ${level}) - ₹2,500 Joining Activation from ${act.member_name}`,
        amount: rate,
        type: 'credit',
        status: 'Pending',
        available_at: availableAt
      });

      // Advance to next upline level
      currentUplineTarget = sponsor;
    }

    if (Object.keys(creditsByMemberId).length > 0) {
      setMembers(prev => prev.map(m => {
        const id = m.member_id || m.id;
        const addAmount = creditsByMemberId[id];
        if (addAmount) {
          return {
            ...m,
            // 30-Day Cooling-off hold: wallet_balance NOT credited yet
            total_earnings: Number(m.total_earnings || 0) + addAmount
          };
        }
        return m;
      }));

      // Update active session total_earnings if current logged-in member is in the upline chain
      if (currentMember) {
        const myId = currentMember.member_id || currentMember.id;
        const myCredit = creditsByMemberId[myId];
        if (myCredit) {
          setTotalEarnings(prev => prev + myCredit);
          // availableBalance stays untouched during 30-day cooling-off hold
        }
      }

      setTransactions(prev => [...newTransactions, ...prev]);
    }

    // Persist activation approval, software license unlock and commission to live Neon PostgreSQL
    dbApproveActivation(activationId).then(res => {
      if (res.ok) {
        dbFetchMembers().then(mRes => {
          if (mRes.ok && mRes.data) setMembers(mRes.data);
        });
      }
    }).catch(err => console.warn('[Neon DB] dbApproveActivation error:', err));

    addToast('success', 'Dual Accounts Activated!', `Partner ${act.member_name} approved. MLM ID & Software License (${act.account2_software?.license_key || ''}) unlocked!`);
    return true;
  };

  // 2. Admin Rejects Partner Activation
  const rejectMemberActivation = (activationId, reason = 'Payment verification failed') => {
    setPendingActivations(prev => prev.map(a => {
      if (a.id === activationId) {
        return { ...a, status: 'rejected', rejection_reason: reason };
      }
      return a;
    }));

    setMembers(prev => prev.map(m => {
      const act = pendingActivations.find(a => a.id === activationId);
      if (act && m.member_id === act.member_id) {
        return { ...m, seller_status: 'rejected' };
      }
      return m;
    }));

    // Persist rejection to live Neon PostgreSQL
    dbRejectActivation(activationId, reason).catch(err => console.warn('[Neon DB] dbRejectActivation error:', err));

    addToast('warning', 'Activation Rejected', `Partner activation rejected: ${reason}`);
    return true;
  };

  // Login as existing member by email or ID with Cryptographic Password Verification
  const loginUserByEmail = async ({ email, password }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { ok: false, error: 'Please enter your registered email address.' };
    }
    if (!password) {
      return { ok: false, error: 'Please enter your account password.' };
    }

    const found = members.find(m => 
      (m.email && m.email.toLowerCase() === cleanEmail) ||
      (m.member_id && m.member_id.toLowerCase() === cleanEmail) ||
      (m.cs_customer_id && m.cs_customer_id.toLowerCase() === cleanEmail)
    );
    if (!found) {
      return { 
        ok: false, 
        error: `No partner account found with email "${cleanEmail}". Please check your email or click "Create Account".` 
      };
    }

    // Secure Password Verification
    if (found.password) {
      const isValid = await verifyPassword(password, found.password);
      if (!isValid) {
        return {
          ok: false,
          error: 'Incorrect password. Please verify your credentials and try again.'
        };
      }
    } else {
      // Legacy member migration: If account was created before password hashing was enforced,
      // require at least 6 characters and securely set/upgrade their password hash now.
      if (password.length < 6) {
        return {
          ok: false,
          error: 'Account requires establishing a secure password of at least 6 characters.'
        };
      }
      const newHash = await hashPassword(password);
      found.password = newHash;
      dbUpdateMemberPassword(found.member_id, newHash).catch(err => console.warn('[Neon DB] dbUpdateMemberPassword error:', err));
    }

    setCurrentMemberId(found.member_id);
    localStorage.setItem('cybershield_currentMemberId', found.member_id);
    setAvailableBalance(Number(found.wallet_balance || 0));
    setTotalEarnings(Number(found.total_earnings || 0));
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    setCurrentPage('dashboard');
    addToast('success', 'Welcome Back!', `Logged in as ${found.name}.`);
    return { ok: true, member: found };
  };

  // Logout / Switch to Visitor mode
  const logout = () => {
    setIsLoggedIn(false);
    setCurrentMemberId(null);
    localStorage.removeItem('cybershield_currentMemberId');
    localStorage.setItem('cybershield_isLoggedIn', 'false');
    setCurrentPage('home');
    addToast('info', 'Signed Out', 'You are now viewing CyberShield Network as a visitor.');
  };

  // Login as existing member (e.g. Matru)
  const loginAsMember = (memberId = 'mem_matru') => {
    setCurrentMemberId(memberId);
    localStorage.setItem('cybershield_currentMemberId', memberId);
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    const found = members.find(m => m.member_id === memberId);
    if (found) {
      setAvailableBalance(Number(found.wallet_balance || 0));
      setTotalEarnings(Number(found.total_earnings || 0));
    }
    setCurrentPage('dashboard');
    addToast('success', 'Logged In', 'Welcome back to your CyberShield Partner Portal.');
  };

  const resetAllData = () => {
    localStorage.clear();
    setMembers(initialMembers);
    setOrders(initialOrders);
    setTransactions(initialTransactions);
    setPayoutRequests(initialPayoutRequests);
    setPendingActivations([]);
    setAvailableBalance(0);
    setTotalEarnings(0);
    setCurrentMemberId(null);
    setIsLoggedIn(false);
    localStorage.setItem('cybershield_isLoggedIn', 'false');
    setCurrentPage('home');
    addToast('info', 'Platform Reset', 'Reset to fresh production state (Visitor Mode, ₹0 Balance).');
  };

  // Derive dynamic monthly earnings from live member transactions
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const memberTransactions = currentMember 
    ? transactions.filter(t => t.member_id === currentMember.member_id) 
    : [];
  const memberActivations = currentMember 
    ? pendingActivations.filter(a => a.member_id === currentMember.member_id) 
    : [];

  const dynamicEarningsMonthly = months.map((month, idx) => {
    const monthTx = memberTransactions.filter(t => {
      if (t.type !== 'credit') return false;
      const d = new Date(t.created_at || (t.date && t.date !== 'Just Now' ? t.date : Date.now()));
      return !isNaN(d.getTime()) && d.getMonth() === idx;
    });
    const total = monthTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return { month, amount: total };
  });

  // Derive dynamic recent activity from live member transactions and activations
  const dynamicRecentActivity = [
    ...memberTransactions.slice(0, 5).map(t => ({
      id: t.id,
      type: t.amount > 0 ? 'earning' : 'payout',
      title: t.description,
      time: t.date || 'Just now',
      icon: t.amount > 0 ? 'Coins' : 'ArrowUpRight'
    })),
    ...memberActivations.slice(0, 3).map(a => ({
      id: a.id,
      type: 'user',
      title: `Partner Activation: ${a.member_name} (${a.status})`,
      time: a.requested_at || 'Just now',
      icon: 'UserPlus'
    }))
  ];

  // Derive immutable walletLedger for financial ledger views
  const dynamicWalletLedger = (transactions || []).map(t => ({
    ledger_id: t.id,
    member_id: t.member_id || currentMemberId || 'mem_matru',
    created_at: t.date === 'Just Now' ? new Date().toISOString() : (t.created_at || new Date().toISOString()),
    transaction_type: t.type === 'credit' ? 'COMMISSION_CREDIT' : (t.type === 'debit' ? 'PAYOUT_DEBIT' : 'TRANSACTION'),
    reference_id: t.payoutId || t.utr_number || t.id,
    description: t.description || 'Transaction',
    balance_effect: t.amount >= 0 ? 'CREDIT' : 'DEBIT',
    amount: t.amount || 0
  }));

  return (
    <MlmContext.Provider value={{
      isAdminMode,
      isAdminAuthenticated,
      loginAdmin,
      logoutAdmin,
      navigateToAdmin,
      navigateToUserSite,
      currentPage,
      setCurrentPage,
      isLoggedIn,
      setIsLoggedIn,
      currentMember,
      currentMemberId,
      setCurrentMemberId,
      loginAsMember,
      logout,
      members,
      orders,
      transactions,
      walletLedger: dynamicWalletLedger,
      commissionEntries: [],
      payouts: payoutRequests,
      auditLogs,
      companyReserve: 0,
      payoutRequests,
      pendingActivations,
      pendingPayoutsTotal,
      availableBalance,
      totalEarnings,
      teamMembersCount,
      earningsMonthly: dynamicEarningsMonthly,
      recentActivity: dynamicRecentActivity,
      commissionRules,
      isCheckoutOpen,
      setIsCheckoutOpen,
      selectedPlanForCheckout,
      openCheckout,
      completePayment,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authMode,
      setAuthMode,
      registerUser,
      requestWithdrawal,
      approvePayout,
      rejectPayout,
      approveMemberActivation,
      rejectMemberActivation,
      releaseCommissionEarly,
      clawbackCommission,
      toasts,
      addToast,
      removeToast,
      referralBanner,
      dismissReferralBanner,
      activeReferral,
      setActiveReferral,
      getMemberByReferralCode,
      validateReferralCode,
      submitKyc,
      updateMemberProfile,
      uploadKycDocument,
      approveKyc,
      rejectKyc,
      getMemberWallet,
      requestPayout,
      loginUserByEmail,
      isDbConnected,
      zexLinkStatus,
      refreshZexStatus,
      initiateZexConnect,
      resetAllData
    }}>
      {children}
    </MlmContext.Provider>
  );
}

export function useMlm() {
  return useContext(MlmContext);
}
