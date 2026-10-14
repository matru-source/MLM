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
    window.location.hash = '#admin';
    setIsAdminMode(true);
  };

  const navigateToUserSite = () => {
    window.location.hash = '';
    setIsAdminMode(false);
  };

  // User navigation state: 'home', 'plans', 'compensation', 'dashboard', 'network', 'wallet', 'subscriptions', 'profile'
  const [currentPage, setCurrentPage] = useState('home');
  const [currentMemberId, setCurrentMemberId] = useState('mem_matru');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const stored = localStorage.getItem('cybershield_isLoggedIn');
    return stored !== null ? stored === 'true' : true;
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

  const initialPendingActivations = [
    {
      id: 'act_cs_01',
      member_id: 'mem_rahul',
      member_name: 'Rahul Sharma',
      member_email: 'rahul.s@example.com',
      member_phone: '+91 98111 22334',
      sponsor_code: 'CS123456',
      amount_paid: 2500,
      gst_paid: 450,
      total_paid: 2950,
      payment_method: 'UPI (PhonePe)',
      payment_ref: 'CS20261011',
      utr_number: 'UTR-CS-492019482',
      status: 'pending',
      requested_at: '14 Oct 2026, 05:45 PM',
      account1_mlm: {
        partner_id: 'mem_rahul',
        full_name: 'Rahul Sharma',
        email: 'rahul.s@example.com',
        phone: '+91 98111 22334',
        sponsor_code: 'CS123456',
        referral_code: 'CS-RAHU01',
        commission_wallet_id: 'WAL-CS-892144',
        membership_plan: 'CyberShield Partner Membership (₹2,500)',
        joining_fee_paid: 2500,
        total_order_amount: 2950,
        status: 'pending_admin_verification'
      },
      account2_software: {
        license_id: 'LIC-7749102',
        software_suite: 'CyberShield Pro Enterprise Security Suite',
        license_key: 'CS-PRO-8K92-MN34-X781',
        client_portal_username: 'rahul.s@example.com',
        endpoint_protection_seats: 5,
        activation_status: 'ready_for_admin_activation'
      }
    }
  ];

  const [members, setMembers] = useState(() => getStored('members', initialMembers));
  const [orders, setOrders] = useState(() => getStored('orders', initialOrders));
  const [transactions, setTransactions] = useState(() => getStored('txs', initialTransactions));
  const [payoutRequests, setPayoutRequests] = useState(() => getStored('payouts', initialPayoutRequests));
  const [pendingActivations, setPendingActivations] = useState(() => getStored('activations', initialPendingActivations));
  const [availableBalance, setAvailableBalance] = useState(() => getStored('balance', 4320));
  const [totalEarnings, setTotalEarnings] = useState(() => getStored('earnings', 25680));
  const [teamMembersCount, setTeamMembersCount] = useState(() => getStored('teamCount', 86));
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
        bank_name: currentMember.kyc?.bank_name || 'HDFC Bank',
        account_number: currentMember.kyc?.bank_account_number || '501004928172',
        ifsc: currentMember.kyc?.bank_ifsc || 'HDFC0001234',
        account_holder: currentMember.kyc?.legal_name || currentMember.name
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

    // Record transaction with Pending status (money is not deducted yet!)
    setTransactions(prev => [{
      id: generateId('tx'),
      payoutId: newPayoutId,
      date: 'Just Now',
      description: `Bank Withdrawal Request to ${currentMember.kyc?.bank_name || 'HDFC Bank'} (Pending Admin Verification)`,
      amount: -numAmount,
      type: 'debit',
      status: 'Pending'
    }, ...prev]);

    addToast('success', 'Withdrawal Request Submitted!', `₹${numAmount.toLocaleString('en-IN')} (Net ₹${netPayable.toLocaleString('en-IN')}) sent to Finance Admin. Status is Pending until manual bank disbursement.`);
    return true;
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

    addToast('info', 'Payout Request Rejected', `Request #${payoutId} marked as rejected. No funds deducted.`);
    return true;
  };

  // Register New User (Step 2 of Brevo Email OTP verification)
  const registerUser = ({ fullName, email, mobile, password, sponsorId, isSeller }) => {
    const newMemberId = generateId('mem');
    const newMember = {
      member_id: newMemberId,
      name: fullName,
      email: email,
      phone: mobile,
      avatar: '/matru-avatar.jpg',
      rank: isSeller ? 'Partner (Pending Plan Purchase)' : 'Customer',
      cs_customer_id: `CS${Math.floor(10000000 + Math.random() * 90000000)}`,
      sponsor_member_id: sponsorId || 'CS123456',
      customer_status: 'registered',
      seller_status: 'pending_payment',
      referral_code: `CS${Math.floor(100000 + Math.random() * 900000)}`,
      joined_at: new Date().toISOString(),
      email_verified: true,
      kyc: {
        legal_name: fullName,
        pan: 'ABCDE1234F',
        aadhaar: 'XXXX-XXXX-9012',
        bank_name: 'HDFC Bank',
        bank_account_number: '501004928172',
        bank_ifsc: 'HDFC0001234',
        verification_status: 'verified',
        agreement_accepted: true,
        agreement_version: 'v2026.1',
        documents: {
          aadhaar: 'Uploaded',
          pan: 'Uploaded',
          addressProof: 'Uploaded',
          bankAccount: 'Uploaded'
        }
      }
    };

    setMembers(prev => [...prev, newMember]);
    setCurrentMemberId(newMemberId);
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    setIsAuthModalOpen(false);
    setTeamMembersCount(prev => prev + 1);

    addToast('success', 'Email Verified & Account Created!', `Welcome, ${fullName}! Please complete ₹2,500 Joining Plan purchase.`);
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

    addToast('warning', 'Activation Rejected', `Partner activation rejected: ${reason}`);
    return true;
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
    setAvailableBalance(4320);
    setTotalEarnings(25680);
    setTeamMembersCount(86);
    setCurrentMemberId('mem_matru');
    setIsLoggedIn(true);
    localStorage.setItem('cybershield_isLoggedIn', 'true');
    setCurrentPage('home');
    addToast('info', 'Demo Reset', 'Reset to initial CyberShield Network state.');
  };

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
      earningsMonthly: initialEarningsMonthly,
      recentActivity: initialRecentActivity,
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
      resetAllData
    }}>
      {children}
    </MlmContext.Provider>
  );
}

export function useMlm() {
  return useContext(MlmContext);
}
