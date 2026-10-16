// Production Initial Baseline Data for CyberShield Security Network
// Real baseline synced with Neon PostgreSQL database

export const initialCommissionRules = [
  { level: 1, name: 'Direct referring partner', amount: 1000, percentage: 40 },
  { level: 2, name: 'Referrer’s sponsor', amount: 300, percentage: 12 },
  { level: 3, name: 'Third upline', amount: 150, percentage: 6 },
  { level: 4, name: 'Fourth upline', amount: 50, percentage: 2 },
  { level: 5, name: 'Fifth upline', amount: 25, percentage: 1 },
  { level: 6, name: 'Sixth upline', amount: 25, percentage: 1 }
];

export const initialMembers = [
  {
    member_id: 'mem_matru',
    name: 'Matru Prasad Panda',
    email: 'matruprasadpanda497@gmail.com',
    phone: '+91 9876543210',
    avatar: '/matru-avatar.jpg',
    rank: 'Head Office Partner',
    cs_customer_id: 'CS20261010',
    sponsor_member_id: null,
    sponsor_code: null,
    customer_status: 'active_subscriber',
    seller_status: 'active',
    referral_code: 'CS123456',
    wallet_balance: 0,
    total_earnings: 0,
    joined_at: '2026-01-10T10:00:00Z',
    kyc: {
      legal_name: 'Matru Prasad Panda',
      pan: '',
      aadhaar: '',
      bank_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      verification_status: 'verified',
      agreement_accepted: true,
      agreement_version: 'v2026.1',
      documents: {
        aadhaar: 'Not Uploaded',
        pan: 'Not Uploaded',
        addressProof: 'Not Uploaded',
        bankAccount: 'Not Uploaded'
      }
    }
  }
];

export const initialOrders = [];

export const initialPayoutRequests = [];

export const initialTransactions = [];

export const initialEarningsMonthly = [
  { month: 'Jan', amount: 0 },
  { month: 'Feb', amount: 0 },
  { month: 'Mar', amount: 0 },
  { month: 'Apr', amount: 0 },
  { month: 'May', amount: 0 },
  { month: 'Jun', amount: 0 },
  { month: 'Jul', amount: 0 },
  { month: 'Aug', amount: 0 },
  { month: 'Sep', amount: 0 },
  { month: 'Oct', amount: 0 },
  { month: 'Nov', amount: 0 },
  { month: 'Dec', amount: 0 }
];

export const initialRecentActivity = [];
