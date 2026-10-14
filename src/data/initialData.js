// Initial State for CyberShield Network (Authorized Cyber Security & Partner Distribution Platform)

export const initialCommissionRules = [
  { level: 1, name: 'Direct referring partner', amount: 1000, percentage: 40 },
  { level: 2, name: 'Referrer’s sponsor', amount: 300, percentage: 12 },
  { level: 3, name: 'Third upline', amount: 150, percentage: 6 },
  { level: 4, name: 'Fourth upline', amount: 50, percentage: 2 },
  { level: 5, name: 'Fifth upline', amount: 25, percentage: 1 },
  { level: 6, name: 'Sixth upline', amount: 25, percentage: 1 },
  { level: 7, name: 'Seventh upline', amount: 25, percentage: 1 },
  { level: 8, name: 'Eighth upline', amount: 10, percentage: 0.4 },
  { level: 9, name: 'Ninth upline', amount: 10, percentage: 0.4 },
  { level: 10, name: 'Tenth upline', amount: 5, percentage: 0.2 }
];

export const initialMembers = [
  {
    member_id: 'mem_matru',
    name: 'Matru Prasad Panda',
    email: 'matru@gmail.com',
    phone: '+91 9876543210',
    avatar: '/matru-avatar.jpg',
    rank: 'Silver Partner',
    cs_customer_id: 'CS20261010',
    sponsor_member_id: null,
    customer_status: 'active_subscriber',
    seller_status: 'active',
    referral_code: 'CS123456',
    joined_at: '2026-01-10T10:00:00Z',
    kyc: {
      legal_name: 'Matru Prasad Panda',
      pan: 'ABCDE1234F',
      aadhaar: 'XXXX-XXXX-9012',
      bank_name: 'HDFC Bank',
      bank_account_number: '501004928172',
      bank_ifsc: 'HDFC0001234',
      bank_details_token: 'tok_hdfc_9981',
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
  },
  {
    member_id: 'mem_rahul',
    name: 'Rahul Sharma',
    email: 'rahul.s@example.com',
    phone: '+91 98111 22334',
    rank: 'Active Partner',
    cs_customer_id: 'CS20261011',
    sponsor_member_id: 'mem_matru',
    customer_status: 'active_subscriber',
    seller_status: 'active',
    referral_code: 'CS-RAHU01',
    joined_at: '2026-02-12T11:00:00Z'
  },
  {
    member_id: 'mem_priya',
    name: 'Priya Patel',
    email: 'priya.p@example.com',
    phone: '+91 98222 33445',
    rank: 'Active Partner',
    cs_customer_id: 'CS20261012',
    sponsor_member_id: 'mem_matru',
    customer_status: 'active_subscriber',
    seller_status: 'active',
    referral_code: 'CS-PRIY02',
    joined_at: '2026-02-18T14:30:00Z'
  },
  {
    member_id: 'mem_amit',
    name: 'Amit Kumar',
    email: 'amit.k@example.com',
    phone: '+91 98333 44556',
    rank: 'Active Partner',
    cs_customer_id: 'CS20261013',
    sponsor_member_id: 'mem_matru',
    customer_status: 'active_subscriber',
    seller_status: 'active',
    referral_code: 'CS-AMIT03',
    joined_at: '2026-03-01T09:15:00Z'
  },
  {
    member_id: 'mem_ananya',
    name: 'Ananya Roy',
    email: 'ananya@example.com',
    phone: '+91 98444 55667',
    rank: 'Active Partner',
    cs_customer_id: 'CS20261014',
    sponsor_member_id: 'mem_rahul',
    customer_status: 'active_subscriber',
    seller_status: 'active',
    referral_code: 'CS-ANAN04',
    joined_at: '2026-03-05T16:20:00Z'
  }
];

export const initialOrders = [
  {
    order_id: 'CS20261010',
    cs_order_id: 'ord_cs_9910',
    buyer_member_id: 'mem_matru',
    seller_member_id: null,
    product_code: 'CS-PRO-SUITE',
    product_name: 'CyberShield Pro Enterprise Security Suite',
    amount: 2500,
    gst: 450,
    total_amount: 2950,
    currency: 'INR',
    payment_method: 'UPI (Google Pay)',
    payment_status: 'paid',
    subscription_status: 'active',
    activated_by: 'CyberShield Trust Engine',
    activation_date: '10 Oct 2026, 11:30 AM',
    next_renewal: '10 Nov 2026',
    created_at: '2026-10-10T11:30:00Z'
  }
];

export const initialPayoutRequests = [
  {
    id: 'PAY-8921',
    member_id: 'mem_matru',
    member_name: 'Matru Prasad Panda',
    member_email: 'matru@gmail.com',
    avatar: '/matru-avatar.jpg',
    amount: 1000,
    tds_amount: 50,
    net_payable: 950,
    status: 'pending', // 'pending' | 'paid' | 'rejected'
    request_date: '12 Oct 2026, 04:30 PM',
    bank_details: {
      bank_name: 'HDFC Bank',
      account_number: '501004928172',
      ifsc: 'HDFC0001234',
      account_holder: 'Matru Prasad Panda'
    },
    admin_payment: {
      paid_at: null,
      utr_number: '',
      payment_mode: 'IMPS / Bank Transfer',
      receipt_url: '',
      admin_notes: ''
    }
  }
];

export const initialTransactions = [
  { id: 'tx_1', date: '10 Oct 2026', description: 'Commission (Level 1) - Direct Partner Sale', amount: 250, type: 'credit', status: 'Available' },
  { id: 'tx_2', date: '08 Oct 2026', description: 'Commission (Level 2) - Downline Partner Sale', amount: 75, type: 'credit', status: 'Available' },
  { id: 'tx_3', date: '05 Oct 2026', description: 'Retail Subscription Sale (Level 1)', amount: 1000, type: 'credit', status: 'Available' },
  { id: 'tx_4', date: '12 Oct 2026', description: 'Bank Withdrawal Request (Pending Admin Verification)', amount: -1000, type: 'debit', status: 'Pending', payoutId: 'PAY-8921' },
  { id: 'tx_5', date: '28 Sep 2026', description: 'Commission (Level 1) - Direct Partner Sale', amount: 250, type: 'credit', status: 'Available' },
  { id: 'tx_6', date: '22 Sep 2026', description: 'Commission (Level 3) - 3rd Tier Volume', amount: 150, type: 'credit', status: 'Available' }
];

export const initialEarningsMonthly = [
  { month: 'Jan', amount: 80 },
  { month: 'Feb', amount: 140 },
  { month: 'Mar', amount: 110 },
  { month: 'Apr', amount: 190 },
  { month: 'May', amount: 150 },
  { month: 'Jun', amount: 220 },
  { month: 'Jul', amount: 180 },
  { month: 'Aug', amount: 260 },
  { month: 'Sep', amount: 210 },
  { month: 'Oct', amount: 320 },
  { month: 'Nov', amount: 290 },
  { month: 'Dec', amount: 350 }
];

export const initialRecentActivity = [
  { id: 'act_1', type: 'user', title: 'New partner joined', time: '2 hrs ago', icon: 'UserPlus' },
  { id: 'act_2', type: 'earning', title: 'Commission earned +₹250', time: '5 hrs ago', icon: 'Coins' },
  { id: 'act_3', type: 'subscription', title: 'Software license sale +₹1,000', time: '1 day ago', icon: 'ShoppingBag' },
  { id: 'act_4', type: 'payout', title: 'Withdrawal request pending admin review', time: '2 days ago', icon: 'Clock' }
];
