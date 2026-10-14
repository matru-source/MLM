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
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Logged in as Matru by default to show member dashboard easily

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

  const [members, setMembers] = useState(() => getStored('members', initialMembers));
  const [orders, setOrders] = useState(() => getStored('orders', initialOrders));
  const [transactions, setTransactions] = useState(() => getStored('txs', initialTransactions));
  const [payoutRequests, setPayoutRequests] = useState(() => getStored('payouts', initialPayoutRequests));
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
    localStorage.setItem('cybershield_balance', JSON.stringify(availableBalance));
    localStorage.setItem('cybershield_earnings', JSON.stringify(totalEarnings));
    localStorage.setItem('cybershield_teamCount', JSON.stringify(teamMembersCount));
  }, [members, orders, transactions, payoutRequests, availableBalance, totalEarnings, teamMembersCount]);

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

  // Complete Payment (CyberShield Engine)
  const completePayment = (paymentMethod = 'UPI (Google Pay)') => {
    const newOrderId = `CS${Math.floor(10000000 + Math.random() * 90000000)}`;
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
      subscription_status: 'active',
      activated_by: 'CyberShield Trust Engine',
      activation_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      next_renewal: '10 Nov 2026',
      created_at: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    setIsCheckoutOpen(false);

    // Credit retail direct commission to wallet
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

    addToast('success', 'Software Subscription Activated!', `Order #${newOrderId} authorized successfully via CyberShield Merchant Gateway.`);
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

  // Register New User
  const registerUser = ({ fullName, email, mobile, password, sponsorId, isSeller }) => {
    const newMemberId = generateId('mem');
    const newMember = {
      member_id: newMemberId,
      name: fullName,
      email: email,
      phone: mobile,
      avatar: '/matru-avatar.jpg',
      rank: isSeller ? 'Active Partner' : 'Customer',
      cs_customer_id: `CS${Math.floor(10000000 + Math.random() * 90000000)}`,
      sponsor_member_id: 'mem_matru',
      customer_status: 'active_subscriber',
      seller_status: isSeller ? 'active' : 'not_enrolled',
      referral_code: `CS${Math.floor(100000 + Math.random() * 900000)}`,
      joined_at: new Date().toISOString(),
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
    setIsAuthModalOpen(false);
    setTeamMembersCount(prev => prev + 1);

    addToast('success', 'Account Created!', `Welcome to CyberShield Network, ${fullName}!`);
    setCurrentPage('dashboard');
  };

  const resetAllData = () => {
    localStorage.clear();
    setMembers(initialMembers);
    setOrders(initialOrders);
    setTransactions(initialTransactions);
    setPayoutRequests(initialPayoutRequests);
    setAvailableBalance(4320);
    setTotalEarnings(25680);
    setTeamMembersCount(86);
    setCurrentMemberId('mem_matru');
    setIsLoggedIn(true);
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
      members,
      orders,
      transactions,
      payoutRequests,
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
