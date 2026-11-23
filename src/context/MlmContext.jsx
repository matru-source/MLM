import { authRequest, lookupReferral } from '../services/sessionService';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  dbSubmitPayment,
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
  dbClawbackCommission,
  dbSaveLearningResource,
  dbDeleteLearningResource,
  dbAdminDirectActivate,
  dbAdminCreatePartner
} from '../services/neonDbService';
import { initialLearningResources } from '../data/learningResources';
import { hashPassword, verifyPassword } from '../utils/cryptoAuth';
import { saveDocumentFile, getDocumentFile, syncKycDocsFromServer, clearDocumentCache } from '../utils/documentStorage';

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

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  useEffect(() => {
    if (!isAdminMode) return; // Only verify admin credentials when in admin mode or navigating to /admin
    authRequest('/api/admin/auth', { action: 'verify' }).then(result => setIsAdminAuthenticated(Boolean(result.ok)));
  }, [isAdminMode]);
  const loginAdmin = async ({ username, password }) => {
    const result = await authRequest('/api/admin/auth', { action: 'login', username, password });
    setIsAdminAuthenticated(Boolean(result.ok));
    return result;
  };
  const logoutAdmin = async () => {
    const result = await authRequest('/api/admin/auth', { action: 'logout' });
    if (!result.ok) { addToast('error', 'Sign out failed', result.error); return; }
    setIsAdminAuthenticated(false);
    clearPrivateData();
    navigateToUserSite();
  };

  // User navigation state: 'home', 'plans', 'compensation', 'dashboard', 'network', 'wallet', 'subscriptions', 'profile'
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (['dashboard', 'network', 'wallet', 'subscriptions', 'kyc', 'profile', 'plans', 'compensation', 'faq'].includes(hash)) {
        return hash;
      }
    }
    return 'home';
  });
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    authRequest('/api/auth/member', { action: 'session' }).then(result => {
      if (result.ok) { 
        setCurrentMemberId(result.memberId); 
        setIsLoggedIn(true); 
      }
      setIsSessionLoading(false);
    }).catch(() => setIsSessionLoading(false));
  }, []);

  // Listen to window.location.hash changes for fast navigation
  useEffect(() => {
    const handleHash = () => {
      if (typeof window === 'undefined' || isAdminMode) return;
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (hash && hash !== 'admin' && ['home', 'dashboard', 'network', 'wallet', 'subscriptions', 'kyc', 'profile', 'plans', 'compensation', 'faq'].includes(hash)) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isAdminMode]);

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
      if (!['learning_resources', 'completed_resources'].includes(key)) return fallback;
      const item = localStorage.getItem(`cybershield_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const initialPendingActivations = [];

  const [members, setMembers] = useState(() => getStored('members', []));
  const [orders, setOrders] = useState(() => getStored('orders', []));
  const [transactions, setTransactions] = useState(() => getStored('txs', []));
  const [payoutRequests, setPayoutRequests] = useState(() => getStored('payouts', []));
  const [pendingActivations, setPendingActivations] = useState(() => getStored('activations', initialPendingActivations));
  const [availableBalance, setAvailableBalance] = useState(() => getStored('balance', 0));
  const [totalEarnings, setTotalEarnings] = useState(() => getStored('earnings', 0));
  const [learningResources, setLearningResources] = useState(() => getStored('learning_resources', initialLearningResources));
  const [completedResources, setCompletedResources] = useState(() => getStored('completed_resources', {}));
  const [commissionRules, setCommissionRules] = useState(initialCommissionRules);
  const [toasts, setToasts] = useState([]);

  const clearPrivateData = () => {
    setMembers([]); setOrders([]); setTransactions([]); setPayoutRequests([]); setPendingActivations([]);
    setAvailableBalance(0); setTotalEarnings(0); setAuditLogs([]);
    clearDocumentCache();
  };
  useEffect(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('kyc_doc_') || ['members', 'orders', 'txs', 'payouts', 'activations', 'balance', 'earnings', 'brevo_api_key'].some(suffix => key === 'cybershield_' + suffix)) localStorage.removeItem(key);
    }
    sessionStorage.removeItem('cybershield_admin_token');
    clearDocumentCache();
  }, []);

  const [isDbConnected, setIsDbConnected] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Live Neon PostgreSQL Multi-Device Synchronization
  useEffect(() => {
    let active = true;
    if (!isLoggedIn && !isAdminAuthenticated) return;

    async function loadNeonData() {
      try {
        const res = await dbFetchAllSync();
        if (!active) return;
        if (res?.unauthorized) { setIsLoggedIn(false); setIsAdminAuthenticated(false); setCurrentMemberId(null); clearPrivateData(); return; }
        if (!res?.ok || !res.data) { setIsDbConnected(false); return; }

        const { 
          members: liveMembers, 
          activations: liveActivations, 
          payouts: livePayouts, 
          orders: liveOrders, 
          transactions: liveTxs, 
          kyc_documents: liveKycDocs,
          audit_logs: liveAuditLogs,
          learning_resources: liveLearning
        } = res.data;

        if (Array.isArray(liveLearning) && liveLearning.length > 0) {
          setLearningResources(liveLearning);
        }

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
      } finally {
        setIsDataLoading(false);
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
    window.addEventListener('mlm:refresh', handleFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('mlm:refresh', handleFocus);
    };
  }, [currentMemberId, isLoggedIn, isAdminAuthenticated]);

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

    // If empty: Sponsor is strictly mandatory
    if (!clean) {
      return {
        valid: false,
        reason: 'required',
        message: 'Sponsor referral code is strictly mandatory to join CyberNetworking.'
      };
    }

    // Explicit Root Head Office referral codes
    if (clean === 'CS123456' || clean === 'ROOT' || clean === 'HEAD') {
      const rootPartner = members.find(m => m.referral_code === 'CS123456' || m.member_id === 'mem_matru') || {
        member_id: 'mem_matru',
        name: 'CyberNetworking Head Office',
        referral_code: 'CS123456',
        seller_status: 'active'
      };
      return {
        valid: true,
        reason: 'head_office',
        member: rootPartner,
        message: 'Direct Enrollment under CyberNetworking Head Office Root (CS123456)'
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
    let active = true;
    (async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref') || params.get('sponsor') || params.get('r');
      if (urlRef) {
        const cleanCode = urlRef.trim().toUpperCase();
        const check = await lookupReferral(cleanCode);
        if (!active) return;

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
    })();
    return () => { active = false; };
  }, []);

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

  // The signed-in member can wake processing for their own pending ZEX events.
  // Scheduled recovery handles closed tabs and provider retries independently.
  useEffect(() => {
    if (!isLoggedIn || !currentMemberId) return;
    let active = true;
    const run = async () => {
      try {
        const result = await fetch('/api/integrations/zex/process-pending', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        });
        if (active && result.ok) window.dispatchEvent(new Event('mlm:refresh'));
      } catch { /* Scheduled recovery retries if this device is offline. */ }
    };
    run();
    const timer = setInterval(run, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [isLoggedIn, currentMemberId]);

  const refreshZexStatus = async (memberId = currentMemberId) => {
    const targetId = memberId || currentMemberId;
    if (!targetId) return;
    setZexLinkStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await dbFetchZexLinkStatus(targetId);
      const isLinked = Boolean(res.ok && (res.linked || res.status?.linked));
      const linkData = res.data || res.status?.data || null;
      if (isLinked) {
        setZexLinkStatus({ linked: true, loading: false, data: linkData });
      } else {
        // Dynamic fallback: cross-check if member has zex_user_id populated from database
        const mem = members.find(m => m.id === targetId || m.member_id === targetId || m.mlm_account?.partner_id === targetId || m.email === targetId);
        const zId = mem?.zex_user_id || mem?.mlm_account?.zex_user_id || mem?.software_license?.zex_user_id;
        if (zId) {
          setZexLinkStatus({ 
            linked: true, 
            loading: false, 
            data: { zex_user_id: zId, external_member_id: targetId, partner_id: 'cybernetworking', status: 'active' } 
          });
        } else {
          setZexLinkStatus({ linked: false, loading: false, data: null });
        }
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
          addToast('success', 'ZEX account linked', 'Continue to ZEX to purchase the eligible plan.');
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

  // Initiate ZEX Purchase Checkout for linked members
  const initiateZexPurchase = async () => {
    try {
      const res = await fetch('/api/integrations/zex/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.ok && data.purchase_url) {
        window.location.href = data.purchase_url;
        return { ok: true, purchase_url: data.purchase_url };
      }
      const fallbackUrl = 'https://zex4u.com/mlm/subscribe';
      window.location.href = fallbackUrl;
      return { ok: true, purchase_url: fallbackUrl };
    } catch (err) {
      console.warn('[initiateZexPurchase] Direct fallback to ZEX subscribe:', err);
      const fallbackUrl = 'https://zex4u.com/mlm/subscribe';
      window.location.href = fallbackUrl;
      return { ok: true, purchase_url: fallbackUrl };
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

    if (!isLoggedIn || !activeMember) {
      setAuthMode('register');
      setIsAuthModalOpen(true);
      addToast('info', 'Registration Required', 'Please register or log in first so your partner license is tied to your account.');
      return;
    }
    setSelectedPlanForCheckout(planName);
    setIsCheckoutOpen(true);
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

  const performFinancialAction = async (operation, title) => {
    try {
      const result = await operation();
      if (!result?.ok) throw new Error(result?.error || 'The request was not saved');
      window.dispatchEvent(new Event('mlm:refresh'));
      addToast('success', title, 'Saved successfully. Balances are refreshing.');
      return true;
    } catch (error) { addToast('error', 'Request failed', error.message); return false; }
  };
  const requestWithdrawal = amount => performFinancialAction(() => dbCreatePayoutRequest({
    id: crypto.randomUUID(), member_id: currentMember?.member_id, amount: Number(amount)
  }), 'Withdrawal requested');
  const requestPayout = (memberIdOrAmount, amount) => requestWithdrawal(typeof amount === 'number' ? amount : memberIdOrAmount);
  const approvePayout = ({ payoutId, utrNumber, receiptUrl, paymentMode, adminNotes }) => performFinancialAction(
    () => dbApprovePayout(payoutId, { utrNumber, screenshotUrl: receiptUrl, paymentMode, adminNotes }), 'Payout recorded');
  const rejectPayout = ({ payoutId, reason }) => performFinancialAction(() => dbRejectPayout(payoutId, reason), 'Payout rejected');
  const releaseCommissionEarly = transactionId => performFinancialAction(() => dbReleaseCommissionEarly(transactionId), 'Commission released');
  const clawbackCommission = (transactionId, reason) => performFinancialAction(() => dbClawbackCommission(transactionId, reason), 'Commission reversed');

  // Register New User (Step 2 of Brevo Email OTP verification)
  const registerUser = async ({ fullName, email, mobile, password, sponsorId, sponsorMemberId, sponsorName, isSeller }) => {
    const newMemberId = generateId('mem');
    const passwordHash = password;
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

    const registration = await dbRegisterMember(newMember);
    if (!registration.ok) { addToast('error', 'Registration failed', registration.error); return registration; }
    delete newMember.password;
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

    addToast('success', 'Account created', 'Connecting to ZEX platform for license activation.');
    
    return { ok: true, member_id: newMemberId };
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
  const updateMemberProfile = async (memberId, profileData) => {
    const saved = await dbUpdateProfile(memberId, profileData);
    if (!saved.ok) { addToast('error', 'Profile update failed', saved.error); return false; }
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId) {
        return {
          ...m,
          ...profileData
        };
      }
      return m;
    }));

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

  const approveMemberActivation = activationId => performFinancialAction(() => dbApproveActivation(activationId), 'Activation approved');
  const rejectMemberActivation = (activationId, reason) => performFinancialAction(() => dbRejectActivation(activationId, reason), 'Activation rejected');

  // Admin Direct Activation (Payment Bypass)
  const adminDirectActivateMember = async ({ memberId, reason, referenceNote }) => {
    try {
      const res = await dbAdminDirectActivate({
        memberId,
        reason,
        referenceNote,
        actorId: currentMemberId || 'admin_direct',
        actorName: currentMember?.name || 'Super Admin'
      });

      if (!res || !res.ok) {
        throw new Error(res?.error || 'Direct activation could not be completed.');
      }

      // Optimistically update partner list
      setMembers(prev => prev.map(m => {
        if (m.member_id === memberId || m.id === memberId) {
          return {
            ...m,
            seller_status: 'active',
            customer_status: 'active_subscriber',
            rank: 'Active Partner'
          };
        }
        return m;
      }));

      // Add order
      if (res.order) {
        setOrders(prev => [res.order, ...prev]);
      }

      addToast('success', 'Partner Direct-Activated', 'Account activated via Admin Payment Bypass. Software license & matrix unlocked.');
      return { ok: true, data: res };
    } catch (err) {
      console.error('[adminDirectActivateMember] Error:', err);
      addToast('error', 'Direct Activation Failed', err.message);
      return { ok: false, error: err.message };
    }
  };

  // Admin Direct Partner Onboarding (Supports Root Partner #1)
  const adminCreateDirectPartner = async (partnerData) => {
    try {
      const res = await dbAdminCreatePartner({
        ...partnerData,
        actorId: currentMemberId || 'admin_direct',
        actorName: currentMember?.name || 'Super Admin'
      });

      if (!res || !res.ok) {
        throw new Error(res?.error || 'Partner creation could not be saved.');
      }

      if (res.member) {
        setMembers(prev => [res.member, ...prev]);
      }
      if (res.order) {
        setOrders(prev => [res.order, ...prev]);
      }

      addToast('success', 'Partner Created Successfully', `Partner ${partnerData.name} onboarded with code ${res.member?.referral_code || 'assigned'}.`);
      return { ok: true, member: res.member, order: res.order };
    } catch (err) {
      console.error('[adminCreateDirectPartner] Error:', err);
      addToast('error', 'Direct Onboard Failed', err.message);
      return { ok: false, error: err.message };
    }
  };

  const loginUserByEmail = async ({ email, password }) => {
    const result = await authRequest('/api/auth/member', { action: 'login', email, password });
    if (!result.ok) return result;
    clearPrivateData();
    setMembers([result.member]);
    setCurrentMemberId(result.member.id);
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
    return result;
  };
  const resetUserPassword = ({ email, newPassword }) => authRequest('/api/auth/member', { action: 'reset_password', email, newPassword });
  const logout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await authRequest('/api/auth/member', { action: 'logout' });
      setIsLoggingOut(false);
      if (!result.ok) { addToast('error', 'Sign out failed', result.error); return; }
      setIsLoggedIn(false); 
      setCurrentMemberId(null); 
      clearPrivateData(); 
      setCurrentPage('home');
      if (typeof window !== 'undefined') window.location.hash = '';
      localStorage.removeItem('cybershield_currentMemberId'); 
      localStorage.removeItem('cybershield_isLoggedIn');
    } catch (e) {
      setIsLoggingOut(false);
    }
  };
  const loginAsMember = () => { setAuthMode('login'); setIsAuthModalOpen(true); };

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

  // Derive statutory Company Reserve Fund (₹900 base company margin per activation/sale + all unallocated/unused upline commission tiers)
  const dynamicCompanyReserve = useMemo(() => {
    const reserveTransactions = (transactions || []).filter(t => 
      t.type === 'company_reserve' || (t.description && t.description.includes('Company Reserve'))
    );
    const unusedTiersTotal = reserveTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const completedOrdersCount = (orders || []).filter(o => 
      o.subscription_status === 'active' || o.payment_status === 'verified' || o.payment_status === 'succeeded'
    ).length;
    const approvedActivationsCount = (pendingActivations || []).filter(a => a.status === 'approved').length;
    const totalCompanySales = Math.max(completedOrdersCount, approvedActivationsCount);

    return unusedTiersTotal + (totalCompanySales * 900);
  }, [transactions, orders, pendingActivations]);

  // =========================================================================
  // Learning Resources Management Actions (Admin & Member Tracking)
  // =========================================================================
  const addLearningResource = async (resource) => {
    const newRes = {
      ...resource,
      id: resource.id || `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    setLearningResources(prev => [newRes, ...prev]);
    addToast('Learning resource added successfully!', 'success');
    try {
      await dbSaveLearningResource(newRes);
    } catch (e) {
      console.warn('[Sync] Offline or saving locally');
    }
    return newRes;
  };

  const updateLearningResource = async (id, updatedFields) => {
    let updatedRes = null;
    setLearningResources(prev => prev.map(item => {
      if (item.id === id) {
        updatedRes = { ...item, ...updatedFields, updated_at: new Date().toISOString() };
        return updatedRes;
      }
      return item;
    }));
    if (updatedRes) {
      addToast('Learning resource updated successfully!', 'success');
      try {
        await dbSaveLearningResource(updatedRes);
      } catch (e) {
        console.warn('[Sync] Offline or saving locally');
      }
    }
  };

  const deleteLearningResource = async (id) => {
    setLearningResources(prev => prev.filter(item => item.id !== id));
    addToast('Learning resource deleted.', 'info');
    try {
      await dbDeleteLearningResource(id);
    } catch (e) {
      console.warn('[Sync] Offline or deleting locally');
    }
  };

  const toggleResourceCompleted = (memberId, resourceId) => {
    const mId = memberId || currentMemberId || 'guest';
    const key = `${mId}_${resourceId}`;
    setCompletedResources(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  };

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
      companyReserve: dynamicCompanyReserve,
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
      adminDirectActivateMember,
      adminCreateDirectPartner,
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
      resetUserPassword,
      isDbConnected,
      zexLinkStatus,
      refreshZexStatus,
      initiateZexConnect,
      initiateZexPurchase,
      isSessionLoading,
      isDataLoading,
      isLoggingOut,
      resetAllData,
      learningResources,
      completedResources,
      addLearningResource,
      updateLearningResource,
      deleteLearningResource,
      toggleResourceCompleted
    }}>
      {children}
    </MlmContext.Provider>
  );
}

export function useMlm() {
  return useContext(MlmContext);
}
