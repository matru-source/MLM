import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR, formatDate, maskPan, maskBankAccount } from '../../utils/formatters';
import NetworkTree from './NetworkTree';
import WalletLedger from './WalletLedger';
import ReferralHub from './ReferralHub';
import KycModal from '../Modals/KycModal';
import GrievanceModal from '../Modals/GrievanceModal';
import { 
  ShieldCheck, 
  Wallet, 
  Users, 
  Share2, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';

export default function MemberDashboard() {
  const { currentMember, getMemberWallet, members, grievances, orders } = useMlm();
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'wallet' | 'referrals' | 'kyc' | 'grievances'
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);

  if (!currentMember) return null;

  const wallet = getMemberWallet(currentMember.member_id);
  const directDownlines = members.filter(m => m.sponsor_member_id === currentMember.member_id);
  const memberGrievances = grievances.filter(g => g.member_id === currentMember.member_id);

  // Compute days left in annual license (mock calculation for demo)
  const daysLeft = 328;

  return (
    <div className="member-dashboard-container">
      {/* Member Profile & Status Bar */}
      <div className="member-hero-banner glass-panel">
        <div className="member-hero-left">
          <div className="member-avatar-box">
            {currentMember.name.charAt(0)}
          </div>
          <div>
            <div className="member-title-row">
              <h2 className="member-name">{currentMember.name}</h2>
              <span className={`badge ${currentMember.customer_status === 'active_subscriber' ? 'badge-emerald' : 'badge-neutral'}`}>
                {currentMember.customer_status === 'active_subscriber' ? 'Active ZEX Subscriber' : 'Registered User'}
              </span>
              <span className={`badge ${currentMember.seller_status === 'active' ? 'badge-cyan' : currentMember.seller_status === 'pending_KYC' ? 'badge-amber' : 'badge-neutral'}`}>
                {currentMember.seller_status === 'active' ? 'Verified Direct Seller' : currentMember.seller_status === 'pending_KYC' ? 'KYC Under Review' : 'Customer (Non-Seller)'}
              </span>
            </div>

            <div className="member-meta-row">
              <span>Identity ID: <strong className="code-font">{currentMember.zex_customer_id}</strong></span>
              <span>•</span>
              <span>Referral: <strong className="code-font text-cyan">{currentMember.referral_code}</strong></span>
              <span>•</span>
              <span>Joined: <strong>{formatDate(currentMember.joined_at)}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="member-hero-right">
          {currentMember.seller_status !== 'active' && (
            <button
              onClick={() => setIsKycModalOpen(true)}
              className="btn btn-primary"
            >
              <ShieldCheck size={16} />
              <span>{currentMember.seller_status === 'pending_KYC' ? 'Update KYC' : 'Complete Seller KYC'}</span>
            </button>
          )}

          <button
            onClick={() => setIsGrievanceModalOpen(true)}
            className="btn btn-secondary"
          >
            <RotateCcw size={16} />
            <span>Cooling-Off / Grievance</span>
          </button>
        </div>
      </div>

      {/* Authoritative ZEX Subscription Card */}
      <div className="zex-subscription-card glass-panel">
        <div className="sub-card-left">
          <div className="sub-badge-row">
            <span className="badge badge-cyan">Authoritative Merchant: ZEX Technologies Ltd</span>
            <span className="badge badge-emerald">Subscription Active</span>
          </div>
          <h3 className="sub-product-name">CyberShield Pro Enterprise Cyber Defense License</h3>
          <p className="sub-license-desc">
            Authorized direct sales partner attribution. Full enterprise endpoint security enabled.
          </p>
        </div>

        <div className="sub-card-meta">
          <div className="sub-meta-item">
            <span className="sub-meta-label">Validity</span>
            <span className="sub-meta-val text-emerald">{daysLeft} Days Remaining</span>
          </div>
          <div className="sub-meta-item">
            <span className="sub-meta-label">Renewal MRP</span>
            <span className="sub-meta-val code-font">{formatINR(2500)} / yr</span>
          </div>
          <div className="sub-meta-item">
            <span className="sub-meta-label">Statutory Cooling-Off</span>
            <span className="sub-meta-val text-amber">Protected</span>
          </div>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Available for Payout</span>
            <Wallet size={16} className="text-emerald" />
          </div>
          <div className="metric-value text-emerald">{formatINR(wallet.available)}</div>
          <span className="metric-hint">Ready for instant bank settlement</span>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Pending Cooling-Off Hold</span>
            <Clock size={16} className="text-amber" />
          </div>
          <div className="metric-value text-amber">{formatINR(wallet.pending)}</div>
          <span className="metric-hint">Clears after 7-day buyer guarantee</span>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Direct Retail Downlines</span>
            <Users size={16} className="text-cyan" />
          </div>
          <div className="metric-value text-cyan">{directDownlines.length}</div>
          <span className="metric-hint">Personal direct child members</span>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-label">Cumulative Earnings</span>
            <Sparkles size={16} className="text-indigo" />
          </div>
          <div className="metric-value text-indigo">{formatINR(wallet.totalEarned)}</div>
          <span className="metric-hint">Across all 10 unilevel tiers</span>
        </div>
      </div>

      {/* Dashboard Sub-Tabs Navigation */}
      <div className="dashboard-tabs-bar">
        <button
          onClick={() => setActiveTab('tree')}
          className={`dash-tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
        >
          <Layers size={16} />
          <span>Unilevel Sponsor Tree</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`dash-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
        >
          <Wallet size={16} />
          <span>Financial Wallet & Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`dash-tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
        >
          <Share2 size={16} />
          <span>Referral Hub & QR Code</span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`dash-tab-btn ${activeTab === 'kyc' ? 'active' : ''}`}
        >
          <ShieldCheck size={16} />
          <span>KYC & Direct Selling Agreement</span>
        </button>

        <button
          onClick={() => setActiveTab('grievances')}
          className={`dash-tab-btn ${activeTab === 'grievances' ? 'active' : ''}`}
        >
          <RotateCcw size={16} />
          <span>Grievances & Cooling-Off ({memberGrievances.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="dashboard-content-body">
        {activeTab === 'tree' && <NetworkTree memberId={currentMember.member_id} />}
        {activeTab === 'wallet' && <WalletLedger memberId={currentMember.member_id} />}
        {activeTab === 'referrals' && <ReferralHub member={currentMember} />}

        {/* KYC Tab */}
        {activeTab === 'kyc' && (
          <div className="kyc-details-view glass-panel">
            <div className="kyc-view-header">
              <div>
                <h3 className="section-title">Seller Verification & Compliance Status</h3>
                <p className="section-desc">
                  Required by India’s Consumer Protection (Direct Selling) Rules, 2021 before commission disbursement.
                </p>
              </div>
              <span className={`badge ${currentMember.kyc?.verification_status === 'verified' ? 'badge-emerald' : 'badge-amber'}`}>
                {currentMember.kyc?.verification_status === 'verified' ? 'Verified Compliant Seller' : 'Verification Pending'}
              </span>
            </div>

            <div className="kyc-info-grid">
              <div className="kyc-info-box">
                <span className="label">Legal Name</span>
                <span className="val">{currentMember.kyc?.legal_name || currentMember.name}</span>
              </div>
              <div className="kyc-info-box">
                <span className="label">Tax Identity (PAN)</span>
                <span className="val code-font">{maskPan(currentMember.kyc?.pan)}</span>
              </div>
              <div className="kyc-info-box">
                <span className="label">Settlement Bank</span>
                <span className="val">{currentMember.kyc?.bank_name || 'Not Provided'}</span>
              </div>
              <div className="kyc-info-box">
                <span className="label">Bank Account Token</span>
                <span className="val code-font">{currentMember.kyc?.bank_details_token || 'tok_pending'}</span>
              </div>
              <div className="kyc-info-box">
                <span className="label">Direct Seller Agreement</span>
                <span className="val text-emerald">Accepted ({currentMember.kyc?.agreement_version || 'v2026.1'})</span>
              </div>
              <div className="kyc-info-box">
                <span className="label">Recruitment Incentive Fee</span>
                <span className="val text-emerald">₹0 (Strictly Prohibited Under Law)</span>
              </div>
            </div>

            <div className="kyc-actions-row">
              <button
                onClick={() => setIsKycModalOpen(true)}
                className="btn btn-secondary"
              >
                <FileText size={16} />
                <span>Update / Review KYC Details</span>
              </button>
            </div>
          </div>
        )}

        {/* Grievances Tab */}
        {activeTab === 'grievances' && (
          <div className="grievances-view glass-panel">
            <div className="grievance-header-row">
              <div>
                <h3 className="section-title">Statutory Grievance & Cooling-Off Redressal</h3>
                <p className="section-desc">
                  Every direct selling entity must maintain a grievance redressal mechanism with mandatory resolution timelines.
                </p>
              </div>
              <button
                onClick={() => setIsGrievanceModalOpen(true)}
                className="btn btn-primary"
              >
                <RotateCcw size={16} />
                <span>Submit Grievance / Refund</span>
              </button>
            </div>

            {memberGrievances.length > 0 ? (
              <div className="table-responsive">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Category</th>
                      <th>Subject</th>
                      <th>Date Filed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberGrievances.map(g => (
                      <tr key={g.ticket_id}>
                        <td className="code-font text-cyan">{g.ticket_id}</td>
                        <td>
                          <span className="badge badge-amber">{g.category}</span>
                        </td>
                        <td className="font-semibold text-primary">{g.subject}</td>
                        <td className="text-secondary font-xs">{formatDate(g.created_at)}</td>
                        <td>
                          <span className={`badge ${g.status === 'resolved' ? 'badge-emerald' : 'badge-amber'}`}>
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-sub-notice">
                No active grievance or cooling-off refund tickets submitted.
              </div>
            )}
          </div>
        )}
      </div>

      {/* KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        member={currentMember}
      />

      {/* Grievance Modal */}
      <GrievanceModal
        isOpen={isGrievanceModalOpen}
        onClose={() => setIsGrievanceModalOpen(false)}
        member={currentMember}
      />
    </div>
  );
}
