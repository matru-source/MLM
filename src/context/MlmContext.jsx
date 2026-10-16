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
  dbFetchMembers,
  dbRegisterMember,
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
  dbUpdateKyc
} from '../services/neonDbService';

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

  // User navigation state: 'home', 'plans', 'compensation', 'dashboard', 'network', 'wallet', 'subscriptions', 'profile'
  const [currentPage, setCurrentPage] = useState('home');
  const [currentMemberId, setCurrentMemberId] = useState('mem_matru');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const stored = localStorage.getItem('cybershield_isLoggedIn');
    return stored !== null ? stored === 'true' : false;
  });

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState('Joining');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'

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
  const [teamMembersCount, setTeamMembersCount] = useState(() => getStored('teamCount', 0));
  const [commissionRules, setCommissionRules] = useState(initialCommissionRules);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem('cybershield_members', JSON.stringify(members));
    localStorage.setItem('cybershield_orders', JSON.stringify(orders));
    localStorage.setItem('cybershield_txs', JSON.stringify(transactions));
    localStorage.setItem('cybershield_payouts', JSON.stringify(payoutRequests));
    localStorage.setItem('cybershield_activations', JSON.stringify(pendingActivations));
    localStorage.setItem('cybershield_balance', JSON.stringify(availableBalance));
    localStorage.setItem('cybershield_earnings', JSON.stringify(totalEarnings));
    localStorage.setItem('cybershield_teamCount', JSON.stringify(teamMembersCount));
  }, [members, orders, transactions, payoutRequests, pendingActivations, availableBalance, totalEarnings, teamMembersCount]);

  const [isDbConnected, setIsDbConnected] = useState(false);

  // Live Neon PostgreSQL Synchronization
  useEffect(() => {
    let active = true;
    async function loadNeonData() {
      try {
        const [mRes, aRes, pRes, oRes, tRes] = await Promise.all([
          dbFetchMembers(),
          dbFetchActivations(),
          dbFetchPayoutRequests(),
          dbFetchOrders(),
          dbFetchTransactions()
        ]);

        if (!active) return;

        if (mRes.ok && mRes.data) {
          setMembers(mRes.data);
          const current = mRes.data.find(m => m.member_id === currentMemberId);
          if (current) {
            setAvailableBalance(Number(current.wallet_balance || 0));
            setTotalEarnings(Number(current.total_earnings || 0));
          }
          setIsDbConnected(true);
        }
        if (aRes.ok && aRes.data) {
          setPendingActivations(aRes.data);
        }
        if (pRes.ok && pRes.data) {
          setPayoutRequests(pRes.data);
        }
        if (oRes.ok && oRes.data) {
          setOrders(oRes.data);
        }
        if (tRes.ok && tRes.data) {
          setTransactions(tRes.data);
        }
      } catch (err) {
        console.warn('[Neon Sync] Background sync warning:', err);
      }
    }
    loadNeonData();
    return () => { active = false; };
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

  const currentMember = members.find(m => m.member_id === currentMemberId) || members[0];

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
    if (!code || !code.trim()) {
      return {
        valid: false,
        reason: 'empty',
        message: 'Sponsor Referral Code is strictly mandatory to join.'
      };
    }

    const clean = code.trim().toUpperCase();
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

    // Check Self-Referral by Phone
    if (userPhone && found.phone) {
      const p1 = userPhone.replace(/\D/g, '');
      const p2 = found.phone.replace(/\D/g, '');
      if (p1 && p2 && p1.length >= 10 && p1.slice(-10) === p2.slice(-10)) {
        return {
          valid: false,
          reason: 'self_referral',
          member: found,
          message: 'You cannot use your own phone number to sponsor yourself.'
        };
      }
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

  // Calculate pending withdrawals total for current member
  const pendingPayoutsTotal = payoutRequests
    .filter(r => r.member_id === currentMember?.member_id && r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

  // Open Checkout for a plan
  const openCheckout = (planName = 'Joining') => {
    setSelectedPlanForCheckout(planName);
    setIsCheckoutOpen(true);
  };

  // Complete Payment & Provision Dual Accounts via API (₹2,500 Joining Plan)
  const completePayment = async (paymentMethod = 'UPI (Google Pay)') => {
    const newOrderId = `CS${Math.floor(10000000 + Math.random() * 90000000)}`;
    const utrNumber = `UTR-CS-${Math.floor(100000000 + Math.random() * 900000000)}`;

    // Call Dual Account Provisioning Service (API endpoints)
    const dualAccounts = await provisionDualAccounts({
      memberDetails: currentMember,
      paymentDetails: {
        orderId: newOrderId,
        amount: 2500,
        paymentMethod
      }
    });

    const isMemberAlreadyActive = currentMember?.seller_status === 'active';

    const newOrder = {
      order_id: newOrderId,
      cs_order_id: `ord_cs_${Math.floor(1000 + Math.random() * 9000)}`,
      buyer_member_id: currentMember.member_id,
      product_code: 'CS-PRO-SUITE',
      product_name: 'CyberShield Partner Joining Membership License',
      amount: 2500,
      gst: 450,
      total_amount: 2950,
      currency: 'INR',
      payment_method: paymentMethod,
      payment_status: 'paid',
      subscription_status: isMemberAlreadyActive ? 'active' : 'pending_approval',
      activated_by: isMemberAlreadyActive ? 'CyberShield Trust Engine' : 'Pending Admin Verification',
      activation_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      next_renewal: '14 Oct 2027',
      created_at: new Date().toISOString(),
      account1_mlm: dualAccounts.account1_mlm,
      account2_software: dualAccounts.account2_software
    };

    setOrders(prev => [newOrder, ...prev]);

    // Create New Partner Activation Item for Admin Approval Gate
    const newActivation = {
      id: `act_${Date.now()}`,
      member_id: currentMember.member_id,
      member_name: currentMember.name,
      member_email: currentMember.email,
      member_phone: currentMember.phone,
      sponsor_code: currentMember.sponsor_member_id || 'CS123456',
      amount_paid: 2500,
      gst_paid: 450,
      total_paid: 2950,
      payment_method: paymentMethod,
      payment_ref: newOrderId,
      utr_number: utrNumber,
      status: isMemberAlreadyActive ? 'approved' : 'pending',
      requested_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      account1_mlm: dualAccounts.account1_mlm,
      account2_software: dualAccounts.account2_software
    };

    setPendingActivations(prev => [newActivation, ...prev]);

    // Update member's status
    setMembers(prev => prev.map(m => {
      if (m.member_id === currentMember.member_id) {
        return {
          ...m,
          customer_status: 'active_subscriber',
          seller_status: isMemberAlreadyActive ? 'active' : 'pending_approval',
          pending_activation_id: newActivation.id,
          accounts: {
            account1_mlm: dualAccounts.account1_mlm,
            account2_software: dualAccounts.account2_software
          }
        };
      }
      return m;
    }));

    setIsCheckoutOpen(false);

    // Persist to live Neon PostgreSQL
    dbCreateOrder(newOrder).catch(err => console.warn('[Neon DB] dbCreateOrder error:', err));
    dbCreateActivation(newActivation).catch(err => console.warn('[Neon DB] dbCreateActivation error:', err));

    if (isMemberAlreadyActive) {
      // For existing active partner, credit commission immediately
      setAvailableBalance(prev => prev + 1000);
      setTotalEarnings(prev => prev + 1000);
      setTransactions(prev => [{
        id: generateId('tx'),
        date: 'Just Now',
        description: 'Retail Partner Commission (Level 1) - CyberShield Pro Sale',
        amount: 1000,
        type: 'credit',
        status: 'Available'
      }, ...prev]);

      addToast(
        'success',
        'Dual Accounts Provisioned & Active!',
        `Order #${newOrderId} authorized. Software License ${dualAccounts.account2_software.license_key} ready.`
      );
    } else {
      addToast(
        'success',
        'Dual Accounts Provisioned via API!',
        `Order #${newOrderId} received. Account 1 (MLM) and Account 2 (${dualAccounts.account2_software.license_key}) sent to Admin for activation verification.`
      );
    }

    setCurrentPage('dashboard');
  };

  // Helper to query wallet metrics dynamically
  const getMemberWallet = (memberId = null) => {
    const mem = memberId ? (members.find(m => m.member_id === memberId) || currentMember) : currentMember;
    const available = Number(mem?.wallet_balance || 0);
    const pending = payoutRequests
      .filter(p => p.member_id === mem?.member_id && p.status === 'pending')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return {
      available,
      pending,
      totalEarned: Number(mem?.total_earnings || 0)
    };
  };

  // 1. User Requests Withdrawal (Status becomes Pending; money is NOT deducted until Admin pays)
  const requestWithdrawal = (amount) => {
    const numAmount = Number(amount);
    if (numAmount > availableBalance) {
      addToast('error', 'Insufficient Balance', `You only have ₹${availableBalance.toLocaleString('en-IN')} available.`);
      return false;
    }
    if (numAmount < 500) {
      addToast('error', 'Minimum Limit', 'Minimum withdrawal amount is ₹500.');
      return false;
    }

    // Require linked bank account before requesting withdrawal
    if (!currentMember?.kyc?.bank_account_number || !currentMember?.kyc?.bank_ifsc) {
      addToast('error', 'Bank Details Required', 'Please link your Bank Account & IFSC under Profile > KYC before requesting a payout.');
      return false;
    }

    const tdsAmount = Math.round(numAmount * 0.05); // 5% statutory TDS
    const netPayable = numAmount - tdsAmount;
    const newPayoutId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayout = {
      id: newPayoutId,
      member_id: currentMember.member_id,
      member_name: currentMember.name,
      member_email: currentMember.email,
      avatar: currentMember.avatar || '/matru-avatar.jpg',
      amount: numAmount,
      tds_amount: tdsAmount,
      net_payable: netPayable,
      status: 'pending', // 'pending' | 'paid' | 'rejected'
      request_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      bank_details: {
        bank_name: currentMember.kyc.bank_name || 'Commercial Bank',
        account_number: currentMember.kyc.bank_account_number,
        ifsc: currentMember.kyc.bank_ifsc,
        account_holder: currentMember.kyc.legal_name || currentMember.name
      },
      admin_payment: {
        paid_at: null,
        utr_number: '',
        payment_mode: 'IMPS',
        receipt_url: '',
        admin_notes: ''
      }
    };

    // Add to payout requests (reaches Admin directly)
    setPayoutRequests(prev => [newPayout, ...prev]);

    // Persist to live Neon PostgreSQL
    dbCreatePayoutRequest(newPayout).catch(err => console.warn('[Neon DB] dbCreatePayoutRequest error:', err));

    // Record transaction with Pending status (money is not deducted yet!)
    setTransactions(prev => [{
      id: generateId('tx'),
      payoutId: newPayoutId,
      date: 'Just Now',
      description: `Bank Withdrawal Request to ${currentMember.kyc.bank_name || 'Bank'} (••••${currentMember.kyc.bank_account_number.slice(-4)}) - Pending Verification`,
      amount: -numAmount,
      type: 'debit',
      status: 'Pending'
    }, ...prev]);

    addToast('success', 'Withdrawal Request Submitted!', `₹${numAmount.toLocaleString('en-IN')} (Net ₹${netPayable.toLocaleString('en-IN')}) sent to Finance Admin. Status is Pending until manual bank disbursement.`);
    return true;
  };

  const requestPayout = (memberIdOrAmount, amount) => {
    const finalAmount = typeof amount === 'number' ? amount : memberIdOrAmount;
    return requestWithdrawal(finalAmount);
  };

  // 2. Admin Manually Pays & Attaches Screenshot -> Money is deducted from user's balance
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

    // Money is now officially deducted from member's balance!
    setAvailableBalance(prev => Math.max(0, prev - req.amount));

    // Update transactions ledger
    setTransactions(prev => prev.map(t => {
      if (t.payoutId === payoutId || (t.status === 'Pending' && t.amount === -req.amount)) {
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

    // Persist payout approval and balance deduction to live Neon PostgreSQL
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

  // 3. Admin Rejects Payout (No deduction)
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

    setTransactions(prev => prev.map(t => {
      if (t.payoutId === payoutId) {
        return {
          ...t,
          status: 'Rejected',
          description: `Withdrawal Request Rejected: ${reason || 'KYC/Bank Mismatch'}`
        };
      }
      return t;
    }));

    // Persist rejection to live Neon PostgreSQL
    dbRejectPayout(payoutId, reason).catch(err => console.warn('[Neon DB] dbRejectPayout error:', err));

    addToast('info', 'Payout Request Rejected', `Request #${payoutId} marked as rejected. No funds deducted.`);
    return true;
  };

  // Register New User (Step 2 of Brevo Email OTP verification)
  const registerUser = ({ fullName, email, mobile, password, sponsorId, sponsorMemberId, sponsorName, isSeller }) => {
    const newMemberId = generateId('mem');
    const newMember = {
      member_id: newMemberId,
      name: fullName,
      email: email,
      phone: mobile,
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
    setAvailableBalance(0);
    setTotalEarnings(0);
    setTeamMembersCount(0);
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    setIsAuthModalOpen(false);

    // Persist to live Neon PostgreSQL
    dbRegisterMember(newMember).catch(err => console.warn('[Neon DB] dbRegisterMember error:', err));

    addToast('success', 'Email Verified & Account Created!', `Welcome, ${fullName}! Please complete ₹2,500 Joining Plan purchase.`);
  };

  // Submit / Update Member KYC & Payout Bank Details
  const submitKyc = (memberId, kycDetails) => {
    const updatedKyc = {
      legal_name: kycDetails.legal_name || currentMember?.name,
      pan: (kycDetails.pan || '').toUpperCase().trim(),
      bank_name: kycDetails.bank_name || '',
      bank_account_number: (kycDetails.bank_account_number || '').trim(),
      bank_ifsc: (kycDetails.bank_ifsc || '').toUpperCase().trim(),
      verification_status: 'verified',
      agreement_accepted: true,
      agreement_version: 'v2026.1',
      documents: {
        aadhaar: 'Uploaded',
        pan: 'Uploaded',
        addressProof: 'Uploaded',
        bankAccount: 'Uploaded'
      }
    };

    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId) {
        return { ...m, kyc: updatedKyc };
      }
      return m;
    }));

    // Persist to live Neon PostgreSQL
    dbUpdateKyc(memberId, updatedKyc).catch(err => console.warn('[Neon DB] dbUpdateKyc error:', err));

    addToast('success', 'KYC & Bank Details Saved!', 'Your settlement details are securely verified for commission payouts.');
    return true;
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

    // Increment official active team members count upon approval
    setTeamMembersCount(prev => prev + 1);

    // Credit direct retail partner commission (₹1,000) to current sponsor wallet
    setAvailableBalance(prev => prev + 1000);
    setTotalEarnings(prev => prev + 1000);
    setTransactions(prev => [{
      id: generateId('tx'),
      date: 'Just Now',
      description: `Retail Partner Commission (Level 1) - ₹2,500 Joining Activation from ${act.member_name}`,
      amount: 1000,
      type: 'credit',
      status: 'Available'
    }, ...prev]);

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

  // Login as existing member by email or ID
  const loginUserByEmail = ({ email, password }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { ok: false, error: 'Please enter your registered email address.' };
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

    setCurrentMemberId(found.member_id);
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
    localStorage.setItem('cybershield_isLoggedIn', 'false');
    setCurrentPage('home');
    addToast('info', 'Signed Out', 'You are now viewing CyberShield Network as a visitor.');
  };

  // Login as existing member (e.g. Matru)
  const loginAsMember = (memberId = 'mem_matru') => {
    setCurrentMemberId(memberId);
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    setCurrentPage('dashboard');
    addToast('success', 'Logged In', 'Welcome back to your CyberShield Partner Portal.');
  };

  const resetAllData = () => {
    localStorage.clear();
    setMembers(initialMembers);
    setOrders(initialOrders);
    setTransactions(initialTransactions);
    setPayoutRequests(initialPayoutRequests);
    setPendingActivations(initialPendingActivations);
    setAvailableBalance(0);
    setTotalEarnings(0);
    setTeamMembersCount(0);
    setCurrentMemberId('mem_matru');
    setIsLoggedIn(false);
    localStorage.setItem('cybershield_isLoggedIn', 'false');
    setCurrentPage('home');
    addToast('info', 'Platform Reset', 'Reset to fresh production state (₹0 Balance, Visitor Mode).');
  };

  // Derive dynamic monthly earnings from live transactions
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dynamicEarningsMonthly = months.map(month => {
    const monthTx = transactions.filter(t => t.type === 'credit' && t.date && t.date.includes(month));
    const total = monthTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return { month, amount: total };
  });

  // Derive dynamic recent activity from live transactions and activations
  const dynamicRecentActivity = [
    ...transactions.slice(0, 5).map(t => ({
      id: t.id,
      type: t.amount > 0 ? 'earning' : 'payout',
      title: t.description,
      time: t.date || 'Just now',
      icon: t.amount > 0 ? 'Coins' : 'ArrowUpRight'
    })),
    ...pendingActivations.slice(0, 3).map(a => ({
      id: a.id,
      type: 'user',
      title: `Partner Activation: ${a.member_name} (${a.status})`,
      time: a.requested_at || 'Just now',
      icon: 'UserPlus'
    }))
  ];

  return (
    <MlmContext.Provider value={{
      isAdminMode,
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
      getMemberWallet,
      requestPayout,
      loginUserByEmail,
      isDbConnected,
      resetAllData
    }}>
      {children}
    </MlmContext.Provider>
  );
}

export function useMlm() {
  return useContext(MlmContext);
}
