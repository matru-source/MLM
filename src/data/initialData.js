// Production Initial Baseline Data for CyberShield Security Network
// Real baseline synced with Neon PostgreSQL database
import { 
  corporateAadhaarMcaSvg, 
  corporatePanSvg, 
  corporateOfficeLeaseSvg, 
  corporateBankCertificateSvg 
} from './corporateDocuments';

export const initialCommissionRules = [
  { level: 1, name: 'Direct referring seller', amount: 1000, percentage: 40 },
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
    name: 'CyberShield Head Office',
    email: 'headoffice@cybershield.in',
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
      legal_name: 'CyberShield Enterprise Head Office',
      pan: 'AAACC1234F',
      aadhaar: 'XXXX-XXXX-0001',
      bank_name: 'HDFC Corporate Bank',
      bank_account_number: '50200012345678',
      bank_ifsc: 'HDFC0000001',
      verification_status: 'verified',
      agreement_accepted: true,
      agreement_version: 'v2026.1',
      documents: {
        aadhaar: 'Master Corporate Identity (MCA Certificate)',
        aadhaarName: 'Certificate_of_Incorporation_MCA.pdf',
        aadhaarType: 'image/svg+xml',
        aadhaarSize: '240 KB',
        aadhaarStatus: 'verified',
        aadhaarFile: corporateAadhaarMcaSvg,
        pan: 'Corporate Tax Assessment (PAN: AAACC1234F)',
        panName: 'Corporate_PAN_CyberShield.pdf',
        panType: 'image/svg+xml',
        panSize: '180 KB',
        panStatus: 'verified',
        panFile: corporatePanSvg,
        addressProof: 'Corporate Registered Office Deed',
        addressProofName: 'Registered_Office_Lease_Agreement.pdf',
        addressProofType: 'image/svg+xml',
        addressProofSize: '320 KB',
        addressProofStatus: 'verified',
        addressProofFile: corporateOfficeLeaseSvg,
        bankAccount: 'HDFC Corporate Escrow Settlement Account',
        bankAccountName: 'HDFC_Corporate_Bank_Certificate.pdf',
        bankAccountType: 'image/svg+xml',
        bankAccountSize: '190 KB',
        bankAccountStatus: 'verified',
        bankAccountFile: corporateBankCertificateSvg
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
