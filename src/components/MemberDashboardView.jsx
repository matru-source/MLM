import React, { useState, useEffect } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  LayoutDashboard, 
  GitBranch, 
  Coins, 
  Wallet, 
  ShoppingBag, 
  CreditCard, 
  UserCheck, 
  HelpCircle, 
  ArrowLeft,
  Users,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Download,
  ShieldCheck,
  FileText,
  AlertCircle,
  User,
  Receipt,
  MoreHorizontal,
  X,
  Plus,
  Calculator,
  Share2,
  Copy,
  Check,
  Shield,
  ExternalLink,
  Link2,
  Zap,
  RefreshCw
} from 'lucide-react';
import { downloadTaxInvoice, downloadForm16A } from '../utils/downloadHelpers';

export default function MemberDashboardView() {
  const { 
    currentMember, 
    currentPage,
    setCurrentPage, 
    totalEarnings, 
    teamMembersCount, 
    availableBalance, 
    earningsMonthly, 
    recentActivity,
    transactions,
    orders,
    members = [],
    payoutRequests,
    pendingPayoutsTotal,
    requestWithdrawal,
    isDbConnected,
    logout,
    addToast,
    zexLinkStatus = { linked: false, loading: false },
    refreshZexStatus,
    initiateZexConnect
  } = useMlm();

  // Active subview inside dashboard: 'overview', 'network', 'wallet', 'subscriptions', 'kyc'
  const [activeTab, setActiveTab] = useState('overview');
  const [connectingZex, setConnectingZex] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletTab, setWalletTab] = useState('history'); // 'history' | 'requests'
  const [kycTab, setKycTab] = useState('documents'); // 'personal' | 'documents' | 'tax' | 'agreement'
  const [isDirectReferralsModalOpen, setIsDirectReferralsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);

  useEffect(() => {
    if (currentPage === 'profile' || currentPage === 'kyc') {
      setActiveTab('kyc');
    } else if (['network', 'wallet', 'subscriptions'].includes(currentPage)) {
      setActiveTab(currentPage);
    } else if (currentPage === 'dashboard') {
      setActiveTab('overview');
    }
  }, [currentPage]);

  const handleWithdraw = (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (requestWithdrawal(amount)) {
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
    }
  };

  return (
    <div className="member-app-layout">
      {/* 1. DARK NAVY SIDEBAR (Desktop) */}
      <aside className="member-sidebar desktop-sidebar">
        <div className="sidebar-brand-box">
          <div className="sidebar-logo-icon">
            <Shield size={20} />
          </div>
          <div>
            <div className="sidebar-logo-title">CyberShield</div>
            <div className="sidebar-logo-sub">Security Network</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            onClick={() => setActiveTab('overview')}
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`sidebar-item ${activeTab === 'network' ? 'active' : ''}`}
          >
            <GitBranch size={18} />
            <span>My Network</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`sidebar-item ${activeTab === 'wallet' ? 'active' : ''}`}
          >
            <Wallet size={18} />
            <span>Wallet & Payouts</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`sidebar-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
          >
            <CreditCard size={18} />
            <span>My Subscriptions</span>
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`sidebar-item ${activeTab === 'kyc' ? 'active' : ''}`}
          >
            <UserCheck size={18} />
            <span>Profile & KYC</span>
          </button>
        </nav>

        {/* Back to website and Sign out button at bottom of sidebar */}
        <div className="sidebar-footer">
          <button
            onClick={() => setCurrentPage('home')}
            className="sidebar-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Back to Website</span>
          </button>

          <button
            onClick={logout}
            className="sidebar-logout-btn mt-2"
            title="Sign out to visitor mode"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="member-main-content">
        {/* Mobile Top Header */}
        <div className="mobile-dash-topbar">
          <div className="mobile-dash-brand" onClick={() => setCurrentPage('home')}>
            <div className="sidebar-logo-icon-sm">
              <Shield size={16} />
            </div>
            <span className="mobile-dash-title">CyberShield</span>
          </div>

          <div className="mobile-dash-actions">
            <button
              onClick={() => setCurrentPage('home')}
              className="mobile-dash-btn"
              title="Return to Public Website"
            >
              <ArrowLeft size={13} />
              <span>Website</span>
            </button>
            <button
              onClick={logout}
              className="mobile-dash-btn text-rose"
              title="Sign Out"
            >
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Desktop Top Header Bar */}
        <header className="member-topbar desktop-only-topbar">
          <div className="topbar-welcome">
            <h2 className="welcome-name">Welcome Back, {currentMember?.name?.split(' ')[0] || 'Matru'}!</h2>
            <p className="welcome-sub">Authorized Cyber Security & Partner Network</p>
          </div>

          <div className="topbar-user-badge">
            <img 
              src={currentMember?.avatar || '/matru-avatar.jpg'} 
              alt="Avatar" 
              className="topbar-avatar"
            />
            <div className="topbar-user-meta">
              <span className="topbar-name">{currentMember?.name || 'Matru Prasad Panda'}</span>
              <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                <span className="badge badge-amber">{currentMember?.rank || 'Silver Partner'}</span>
                {isDbConnected && (
                  <span className="badge badge-green font-xs flex-center gap-1" style={{ padding: '2px 6px', fontSize: '10px' }} title="Connected to live Neon PostgreSQL database">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                    Neon Live
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* SUBVIEW 1: DASHBOARD OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="dash-overview-view">
            {/* PENDING ADMIN APPROVAL BANNER IF USER JUST PURCHASED PLAN */}
            {currentMember?.seller_status === 'pending_approval' && (
              <div className="pending-activation-banner card-white mb-4">
                <div className="pending-banner-left">
                  <div className="pending-banner-icon">
                    <Clock size={24} className="text-amber" />
                  </div>
                  <div>
                    <h4 className="pending-banner-title">Joining Payment Verified • Dual Accounts Awaiting Admin Activation</h4>
                    <p className="pending-banner-desc">
                      Your ₹2,500 Joining Fee (Total ₹2,950 incl. 18% GST) has been successfully recorded. Account 1 (Partner MLM Account) and Account 2 (Enterprise Software License) have been provisioned via API and queued for Admin verification. Full features and referral links unlock immediately upon admin approval.
                    </p>
                    <div className="pending-banner-dual-info mt-2">
                      <span className="code-font text-primary-blue mr-3">Partner ID: {currentMember.member_id}</span>
                      <span className="code-font text-success">License Key: {currentMember.accounts?.account2_software?.license_key || 'CS-PRO-XXXX-XXXX'}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    window.location.hash = '#admin';
                    window.location.reload();
                  }}
                  className="btn btn-secondary btn-sm flex-center gap-1"
                  title="Open Admin to test instant approval"
                >
                  <span>Admin Desk</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            )}

            {/* 4 Top KPI Cards */}
            {(() => {
              const directActiveCount = (members || []).filter(m => 
                (m.sponsor_member_id === currentMember?.member_id || 
                 m.sponsor_code === currentMember?.referral_code ||
                 m.sponsor_member_id === currentMember?.referral_code) && 
                m.seller_status === 'active'
              ).length;
              const isAccountActive = currentMember?.seller_status === 'active';
              const maxMonthlyEarning = Math.max(...earningsMonthly.map(e => e.amount), 1000);

              return (
                <>
                  <div className="dash-kpi-grid">
                    {/* Card 1: Total Earnings */}
                    <div className="dash-kpi-card card-white">
                      <div className="kpi-icon-row">
                        <div className="kpi-icon-box bg-purple-dim">
                          <Coins size={20} className="text-purple" />
                        </div>
                        <span className="badge badge-green font-xs">Verified</span>
                      </div>
                      <div className="kpi-value text-primary">₹{totalEarnings.toLocaleString('en-IN')}</div>
                      <div className="kpi-label">Total Earnings</div>
                    </div>

                    {/* Card 2: Team Members */}
                    <div className="dash-kpi-card card-white">
                      <div className="kpi-icon-row">
                        <div className="kpi-icon-box bg-blue-dim">
                          <Users size={20} className="text-primary-blue" />
                        </div>
                      </div>
                      <div className="kpi-value text-primary">{teamMembersCount}</div>
                      <div className="kpi-label">Team Members</div>
                    </div>

                    {/* Card 3: Direct Retail Sales */}
                    <div className="dash-kpi-card card-white">
                      <div className="kpi-icon-row">
                        <div className="kpi-icon-box bg-green-dim">
                          <ShoppingBag size={20} className="text-success" />
                        </div>
                        <span className="badge badge-green font-xs">Direct Active</span>
                      </div>
                      <div className="kpi-value text-primary">{directActiveCount}</div>
                      <div className="kpi-label">Direct Retail Sales</div>
                    </div>

                    {/* Card 4: Active Subscriber */}
                    <div className="dash-kpi-card card-white">
                      <div className="kpi-icon-row">
                        <div className="kpi-icon-box bg-amber-dim">
                          <Award size={20} className="text-amber" />
                        </div>
                        <span className="badge badge-blue font-xs">CyberShield Pro</span>
                      </div>
                      <div className={`kpi-value ${isAccountActive ? 'text-success' : 'text-amber'}`}>
                        {isAccountActive ? 'Active' : currentMember?.seller_status === 'pending_approval' ? 'Pending Approval' : 'Unpaid'}
                      </div>
                      <div className="kpi-label">Subscriber Status</div>
                    </div>
                  </div>

                  {/* Middle Grid: Earnings Overview Chart + Recent Activity */}
                  <div className="dash-middle-grid">
                    {/* Left: Earnings Overview Bar Chart */}
                    <div className="dash-chart-card card-white">
                      <div className="card-head-between">
                        <div>
                          <h3 className="chart-card-title">Earnings Overview</h3>
                          <p className="chart-card-sub">Monthly commission growth (Jan - Dec)</p>
                        </div>
                        <span className="badge badge-blue">Last 12 Months</span>
                      </div>

                      {/* Bar Chart Bars */}
                      <div className="chart-bars-container">
                        {earningsMonthly.map((item, idx) => (
                          <div key={idx} className="chart-bar-col">
                            <div className="bar-track">
                              <div 
                                className="bar-fill" 
                                style={{ height: `${item.amount > 0 ? Math.min(100, (item.amount / maxMonthlyEarning) * 100) : 4}%` }}
                                title={`₹${item.amount.toLocaleString('en-IN')}`}
                              />
                            </div>
                            <span className="bar-month-label">{item.month}</span>
                          </div>
                        ))}
                      </div>
                      {totalEarnings === 0 && (
                        <div className="text-center text-muted text-xs mt-3">
                          Zero commission earnings. Commission bars will populate upon partner sales.
                        </div>
                      )}
                    </div>

                    {/* Right: Recent Activity Feed */}
                    <div className="dash-activity-card card-white">
                      <h3 className="chart-card-title">Recent Activity</h3>
                      <div className="activity-list">
                        {recentActivity.length === 0 ? (
                          <div className="text-center text-muted text-xs p-6">
                            No recent activity yet. Live notifications will appear here as your team members register and purchase plans.
                          </div>
                        ) : (
                          recentActivity.map((act) => (
                            <div key={act.id} className="activity-item">
                              <div className="activity-dot bg-blue-dim">
                                <CheckCircle2 size={16} className="text-primary-blue" />
                              </div>
                              <div className="activity-info">
                                <div className="activity-title">{act.title}</div>
                                <div className="activity-time">{act.time}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Quick Referral Link Banner */}
            <div className="referral-share-card card-white">
              <div className="ref-share-left">
                <h4 className="ref-share-title">Your Personal Referral Link</h4>
                <p className="ref-share-sub">Share this link to earn instant commissions on qualifying subscriptions:</p>
                <div className="ref-copy-box">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`}
                    className="ref-input-clean code-font"
                  />
                  <div className="ref-actions-flex">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`);
                        addToast('success', 'Copied!', 'Referral link copied to clipboard.');
                      }}
                      className="btn btn-primary btn-sm flex-center gap-1"
                    >
                      <Copy size={14} />
                      <span>Copy Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="btn btn-outline-blue btn-sm flex-center gap-1 share-trigger-btn"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="ref-badge-callout">
                <span className="badge badge-green">Sponsor Code: {currentMember?.referral_code || 'CS123456'}</span>
              </div>
            </div>

            {/* ZEX Cloud Platform Integration Card */}
            <div className="zex-integration-card card-white mt-4">
              <div className="card-head-between">
                <div className="flex-align gap-3">
                  <div className="kpi-icon-box bg-purple-dim">
                    <Zap size={22} className="text-purple" />
                  </div>
                  <div>
                    <div className="flex-align gap-2">
                      <h3 className="chart-card-title m-0">ZEX Cloud Platform Integration</h3>
                      <span className="badge badge-purple font-xs">Official API</span>
                    </div>
                    <p className="chart-card-sub m-0 mt-1">
                      Session-bound cryptographic link for real-time 6-tier unilevel commission distribution
                    </p>
                  </div>
                </div>

                <div className="flex-align gap-2">
                  {zexLinkStatus?.linked ? (
                    <span className="badge badge-green flex-align gap-1 font-xs">
                      <CheckCircle2 size={13} />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="badge badge-amber flex-align gap-1 font-xs">
                      <AlertCircle size={13} />
                      <span>Not Linked</span>
                    </span>
                  )}
                  <button
                    type="button"
                    title="Refresh connection status"
                    onClick={() => refreshZexStatus(currentMember?.member_id)}
                    className="btn btn-secondary btn-sm p-1"
                    style={{ minWidth: '32px', height: '32px' }}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              <div className="zex-card-content mt-3">
                {zexLinkStatus?.linked ? (
                  <div className="zex-linked-details">
                    <div className="zex-stats-grid">
                      <div className="zex-stat-box">
                        <div className="text-xs text-muted mb-1">Linked ZEX User ID</div>
                        <div className="code-font font-sm text-primary-blue font-bold">
                          {zexLinkStatus.data?.zex_user_id || 'zex_usr_active'}
                        </div>
                      </div>
                      <div className="zex-stat-box">
                        <div className="text-xs text-muted mb-1">Partner Identifier</div>
                        <div className="code-font font-sm text-primary">
                          {zexLinkStatus.data?.partner_id || 'cybernetworking'}
                        </div>
                      </div>
                      <div className="zex-stat-box">
                        <div className="text-xs text-muted mb-1">External Member ID</div>
                        <div className="code-font font-sm text-primary">
                          {currentMember?.member_id}
                        </div>
                      </div>
                      <div className="zex-stat-box">
                        <div className="text-xs text-muted mb-1">Real-Time Commission Hook</div>
                        <div className="text-success font-sm font-bold flex-align gap-1">
                          <CheckCircle2 size={14} />
                          <span>Active (6-Tier Payouts)</span>
                        </div>
                      </div>
                    </div>
                    <div className="zex-live-stream-note mt-3 p-2 bg-card-alt border-rounded text-xs text-muted flex-between">
                      <span>⚡ Webhook stream active at <code className="code-font">/api/integrations/zex/webhook</code>. Qualifying subscription sales trigger instant credits across upline tiers (₹1000 / ₹300 / ₹150 / ₹50 / ₹25 / ₹25).</span>
                      <span className="text-success font-bold">100% Synced</span>
                    </div>
                  </div>
                ) : (
                  <div className="zex-unlinked-cta flex-between flex-wrap gap-3 p-3 bg-card-alt border-rounded">
                    <div style={{ maxWidth: '640px' }}>
                      <h4 className="font-sm font-bold text-primary mb-1">Connect Your ZEX Platform Account</h4>
                      <p className="text-xs text-muted m-0">
                        Link your ZEX account to automatically synchronize multi-tier referral commissions, purchase tracking, and verified partner payouts directly into your Neon PostgreSQL wallet.
                      </p>
                    </div>
                    <div className="flex-align gap-2">
                      <button
                        type="button"
                        disabled={connectingZex}
                        onClick={async () => {
                          setConnectingZex(true);
                          await initiateZexConnect(currentMember?.member_id);
                          setConnectingZex(false);
                        }}
                        className="btn btn-primary btn-sm flex-center gap-1"
                      >
                        <Link2 size={14} />
                        <span>{connectingZex ? 'Connecting...' : 'Connect ZEX Account'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW 2: MY NETWORK (Dynamic 6-Tier Unilevel Tree + Real-Time Calculation Column) */}
        {activeTab === 'network' && (() => {
          // Compute real 6-level network hierarchy dynamically from active members in Neon DB
          const activeMembers = (members || []).filter(m => m.seller_status === 'active');
          const rootId = currentMember?.member_id;
          const rootRefCode = currentMember?.referral_code;

          const rates = [
            { level: 1, rate: 1000, label: 'Direct Referrals (Level 1)' },
            { level: 2, rate: 300, label: '2nd Generation' },
            { level: 3, rate: 150, label: '3rd Generation' },
            { level: 4, rate: 50, label: '4th Generation' },
            { level: 5, rate: 25, label: '5th Generation' },
            { level: 6, rate: 25, label: '6th Generation' }
          ];

          const networkLevelData = [];
          let currentUplines = [currentMember];
          const visited = new Set([rootId, rootRefCode]);

          for (let lvl = 1; lvl <= 6; lvl++) {
            const uplineIds = new Set(currentUplines.map(u => u.member_id || u.id).filter(Boolean));
            const uplineCodes = new Set(currentUplines.map(u => u.referral_code).filter(Boolean));

            // Find all active members whose sponsor is in this tier
            const tierDownlines = activeMembers.filter(m => {
              const id = m.member_id || m.id;
              if (visited.has(id)) return false;
              return uplineIds.has(m.sponsor_member_id) || 
                     uplineCodes.has(m.sponsor_code) ||
                     uplineCodes.has(m.sponsor_member_id);
            });

            tierDownlines.forEach(d => visited.add(d.member_id || d.id));

            const rateInfo = rates[lvl - 1];
            networkLevelData.push({
              level: lvl,
              rate: rateInfo.rate,
              label: rateInfo.label,
              count: tierDownlines.length,
              members: tierDownlines.map(m => ({
                id: m.member_id || m.id,
                name: m.name,
                email: m.email,
                initials: m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
                rank: m.rank || 'Active Partner',
                date: new Date(m.joined_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                commission: rateInfo.rate,
                status: 'Active'
              }))
            });

            currentUplines = tierDownlines;
          }

          const directReferralsList = networkLevelData[0].members;

          // Any members who registered via this sponsor but have NOT completed payment or are awaiting Admin approval
          const pendingOrUnpaidReferrals = (members || []).filter(m => 
            (m.sponsor_member_id === rootId || 
             m.sponsor_member_id === rootRefCode || 
             m.sponsor_code === rootRefCode) &&
            m.seller_status !== 'active' &&
            m.member_id !== rootId
          );

          const totalNetworkEarnings = networkLevelData.reduce((acc, curr) => acc + (curr.count * curr.rate), 0);
          const totalNetworkMembers = networkLevelData.reduce((acc, curr) => acc + curr.count, 0);

          return (
            <div className="dash-network-view card-white">
              <div className="network-head">
                <div>
                  <h3 className="section-title-large">My Network</h3>
                  <p className="section-subtitle">
                    6-Level Unilevel tree with real-time retail sales calculation matrix ({totalNetworkMembers} active partners)
                  </p>
                </div>
                <div className="network-head-badges">
                  <span className="badge badge-green">Direct Selling Compliant</span>
                  <span className="badge badge-blue">Active Members Only</span>
                </div>
              </div>

              {/* Informational Callout: Unpaid / Pending Referrals Barred from Hierarchy */}
              {pendingOrUnpaidReferrals.length > 0 && (
                <div className="pending-referrals-excluded-card mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-amber shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm text-amber-900">
                        {pendingOrUnpaidReferrals.length} Pending Referral(s) Excluded from Active Hierarchy
                      </div>
                      <p className="text-xs text-amber-800 mb-0">
                        Under Direct Selling rules, referrals who have not completed their ₹2,500 plan payment or are pending Admin approval are strictly barred from your level genealogy, team count, and commission earnings.
                      </p>
                      <div className="pending-ref-chips-row mt-2">
                        {pendingOrUnpaidReferrals.map(p => (
                          <span key={p.member_id} className="pending-ref-chip">
                            ⏳ {p.name} ({p.seller_status === 'pending_payment' ? 'Awaiting Payment' : 'Pending Admin Verification'})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="network-split-layout">
                {/* LEFT COLUMN: Visual Unilevel Tree */}
                <div className="network-tree-panel">
                  <div className="tree-panel-header">
                    <GitBranch size={18} className="text-primary-blue" />
                    <h4>Unilevel Sponsor Genealogy</h4>
                  </div>

                  <div className="tree-visual-container">
                    {/* Level 0: You */}
                    <div className="tree-tier tier-root">
                      <div className="tree-circle-node node-you">
                        <img src={currentMember?.avatar || '/matru-avatar.jpg'} alt="You" className="node-avatar-img" />
                        <div className="node-label">You</div>
                        <div className="node-sub">Root Sponsor</div>
                      </div>
                    </div>

                    <div className="tree-connector-line" />

                    {/* Level 1: 4 Direct Referrals + "... More" Button */}
                    <div className="tree-tier-box">
                      <div className="tier-header-label">Level 1 • Direct Active Partners ({Math.min(4, directReferralsList.length)} of {directReferralsList.length} shown)</div>
                      <div className="tree-tier tier-level-1">
                        {directReferralsList.length === 0 ? (
                          <div style={{ padding: '16px 20px', background: 'rgba(241, 245, 249, 0.7)', borderRadius: '12px', border: '1px dashed #CBD5E1', textAlign: 'center', width: '100%', maxWidth: '340px', margin: '0 auto' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block', fontWeight: 600 }}>
                              No direct partners yet
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                              Share your referral link to sponsor members and earn ₹1,000 Level 1 bonuses.
                            </span>
                          </div>
                        ) : (
                          directReferralsList.slice(0, 4).map(member => (
                            <div key={member.id} className="tree-circle-node node-l1">
                              <div className="node-inner-avatar">{member.initials}</div>
                              <div className="node-label">{member.name.split(' ')[0]} {member.name.split(' ')[1]?.[0]}.</div>
                              <div className="node-sub">Active Partner</div>
                            </div>
                          ))
                        )}

                        {/* The "... More" Button */}
                        {directReferralsList.length > 4 && (
                          <button 
                            type="button"
                            onClick={() => setIsDirectReferralsModalOpen(true)}
                            className="tree-circle-node node-l1 tree-more-btn"
                            title="View all directly referred active partners"
                          >
                            <div className="more-btn-circle">
                              <MoreHorizontal size={22} />
                            </div>
                            <div className="node-label text-primary-blue">+{directReferralsList.length - 4} More</div>
                            <div className="node-sub">View All ({directReferralsList.length})</div>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="tree-connector-line" />

                    {/* Levels 2 to 6: Numbers Only (No Profile Icons) */}
                    <div className="numeric-tiers-column">
                      {networkLevelData.slice(1).map(tier => (
                        <React.Fragment key={tier.level}>
                          <div className="numeric-tier-card">
                            <div className="numeric-tier-badge">Level {tier.level}</div>
                            <div className="numeric-tier-info">
                              <span className="numeric-tier-count">{tier.count}</span>
                              <span className="numeric-tier-lbl">Members</span>
                            </div>
                          </div>
                          {tier.level < 6 && <div className="tree-connector-line mini-line" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Real-Time Level Calculation Column */}
                <div className="network-calc-panel">
                  <div className="calc-panel-header">
                    <div className="calc-header-title">
                      <Calculator size={18} className="text-primary-blue" />
                      <h4>Level-Wise Commission Calculation</h4>
                    </div>
                    <span className="calc-header-tag">Real-Time</span>
                  </div>

                  <div className="calc-rows-container">
                    {networkLevelData.map((tier, idx) => {
                      const subtotal = tier.count * tier.rate;
                      return (
                        <React.Fragment key={tier.level}>
                          <div className="calc-level-row">
                            <div className="calc-level-badge">Level {tier.level}</div>

                            <div className="calc-math-equation">
                              <div className="math-item">
                                <span className="math-val">{tier.count}</span>
                                <span className="math-lbl">persons</span>
                              </div>

                              <span className="math-operator">×</span>

                              <div className="math-item">
                                <span className="math-val text-primary-blue">₹{tier.rate.toLocaleString('en-IN')}</span>
                                <span className="math-lbl">per sale</span>
                              </div>

                              <span className="math-operator">=</span>

                              <div className="math-item subtotal-box">
                                <span className="math-subtotal">₹{subtotal.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          {/* + Plus icon between levels */}
                          {idx < networkLevelData.length - 1 && (
                            <div className="calc-plus-connector">
                              <div className="plus-badge">
                                <Plus size={14} />
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Total Value Row at the very bottom */}
                  <div className="calc-total-card">
                    <div className="total-meta-info">
                      <span className="total-label-main">Total Network Commission</span>
                      <span className="total-sub-note">Cumulative retail earnings across all 6 levels</span>
                    </div>
                    <div className="total-amount-display">
                      ₹{totalNetworkEarnings.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* DIRECT REFERRALS MODAL (Opened by "... More") */}
              {isDirectReferralsModalOpen && (
                <div className="custom-modal-backdrop" onClick={() => setIsDirectReferralsModalOpen(false)}>
                  <div className="direct-referrals-modal card-white" onClick={e => e.stopPropagation()}>
                    <div className="direct-modal-header">
                      <div>
                        <h3 className="modal-title-bold">Direct Referrals ({directReferralsList.length})</h3>
                        <p className="modal-sub-clean">All members who enrolled directly through your referral link ({currentMember?.referral_code || 'CS123456'})</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsDirectReferralsModalOpen(false)}
                        className="close-modal-btn"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="direct-referrals-table-wrapper">
                      <table className="coach-table">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Joined Date</th>
                            <th>Status</th>
                            <th className="text-right">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {directReferralsList.map(member => (
                            <tr key={member.id}>
                              <td>
                                <div className="ref-table-member">
                                  <div className="member-avatar-mini-circle">{member.initials}</div>
                                  <div>
                                    <div className="font-bold text-sm">{member.name}</div>
                                    <div className="text-muted font-xs">{member.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${member.rank === 'Active Seller' ? 'badge-blue' : 'badge-neutral'}`}>
                                {member.rank}
                                </span>
                              </td>
                              <td className="text-muted font-xs">{member.date}</td>
                              <td>
                                <span className="badge badge-green">{member.status}</span>
                              </td>
                              <td className="text-right font-bold text-success">
                                +₹{member.commission.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="direct-modal-footer">
                      <div className="text-xs text-muted">
                        Direct retail sales qualify for Level 1 payout (₹1,000 / 40%) under Direct Selling Rules, 2021.
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsDirectReferralsModalOpen(false)}
                        className="btn btn-secondary btn-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* SUBVIEW 3: WALLET & PAYOUTS */}
        {activeTab === 'wallet' && (
          <div className="dash-wallet-view">
            {/* Top Balance Card */}
            <div className="wallet-balance-banner card-white">
              <div className="balance-info-left">
                <span className="balance-label-small">Available Balance</span>
                <div className="balance-amount-big">₹{availableBalance.toLocaleString('en-IN')}</div>
                {pendingPayoutsTotal > 0 && (
                  <div className="pending-balance-callout">
                    <Clock size={13} className="text-amber" />
                    <span><strong>₹{pendingPayoutsTotal.toLocaleString('en-IN')}</strong> in pending admin payout verification (deducted upon transfer)</span>
                  </div>
                )}
              </div>

              <div className="balance-actions-right">
                <button
                  type="button"
                  onClick={() => setWithdrawModalOpen(true)}
                  className="btn btn-primary"
                >
                  <ArrowUpRight size={16} />
                  <span>Withdraw Payout</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const hasBank = currentMember?.kyc?.bank_account_number;
                    addToast(
                      hasBank ? 'info' : 'warning',
                      hasBank ? 'Verified Bank Details' : 'Bank Not Linked',
                      hasBank 
                        ? `Bank: ${currentMember.kyc.bank_name || 'Bank'} • A/C: ••••${currentMember.kyc.bank_account_number.slice(-4)} • IFSC: ${currentMember.kyc.bank_ifsc}`
                        : 'No settlement bank account linked. Please update your details in Profile > KYC.'
                    );
                  }}
                  className="btn btn-secondary"
                >
                  View Bank Details
                </button>
              </div>
            </div>

            {/* Tabs: Transaction History vs Withdrawal Requests */}
            <div className="wallet-tabs-section card-white">
              <div className="wallet-tabs-bar">
                <button
                  type="button"
                  onClick={() => setWalletTab('history')}
                  className={`wallet-tab-btn ${walletTab === 'history' ? 'active' : ''}`}
                >
                  Transaction History
                </button>
                <button
                  type="button"
                  onClick={() => setWalletTab('requests')}
                  className={`wallet-tab-btn ${walletTab === 'requests' ? 'active' : ''}`}
                >
                  Withdrawal Requests ({payoutRequests.length})
                  {payoutRequests.some(r => r.status === 'pending') && (
                    <span className="tab-pending-dot" title="Pending requests" />
                  )}
                </button>
              </div>

              {/* TAB 1: Transactions Table */}
              {walletTab === 'history' && (
                <div className="table-responsive">
                  <table className="coach-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Status</th>
                        <th className="text-right">Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const myTransactions = transactions.filter(tx => tx.member_id === currentMember?.member_id);
                        if (myTransactions.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-muted" style={{ padding: '32px 16px' }}>
                                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  No Transactions Recorded Yet
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                  Share your distributor referral link to start earning multi-tier commission payouts.
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return myTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="text-muted font-xs">{tx.date}</td>
                          <td className="font-semibold">{tx.description}</td>
                          <td className={`text-right font-bold ${tx.amount > 0 ? 'text-success' : 'text-primary-blue'}`}>
                            {tx.amount > 0 ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                          </td>
                          <td className="text-right">
                            <span className={`badge ${tx.status === 'Available' || tx.status === 'Paid' ? 'badge-green' : tx.status === 'Pending' ? 'badge-amber' : 'badge-neutral'}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="text-right">
                            {tx.status === 'Paid' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const req = payoutRequests.find(p => p.id === tx.payoutId) || {
                                    id: tx.payoutId || 'PAY-REF',
                                    amount: Math.abs(tx.amount),
                                    net_payable: Math.abs(tx.amount),
                                    admin_payment: {
                                      utr_number: tx.utr_number || 'UTR-CS-881920',
                                      receipt_url: tx.receipt_url || '',
                                      paid_at: tx.date
                                    },
                                    bank_details: {
                                      bank_name: currentMember?.kyc?.bank_name || 'Bank',
                                      account_number: currentMember?.kyc?.bank_account_number || '',
                                      ifsc: currentMember?.kyc?.bank_ifsc || '',
                                      account_holder: currentMember?.kyc?.legal_name || currentMember?.name
                                    }
                                  };
                                  setSelectedReceiptModal(req);
                                }}
                                className="btn btn-outline-blue btn-xs flex-center gap-1"
                              >
                                <Receipt size={12} />
                                <span>Proof</span>
                              </button>
                            ) : tx.status === 'Pending' ? (
                              <span className="text-muted font-xs">In Process</span>
                            ) : (
                              <span className="text-muted font-xs">—</span>
                            )}
                          </td>
                        </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Live Withdrawal Requests Tracker */}
              {walletTab === 'requests' && (
                <div className="table-responsive">
                  <table className="coach-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Request Date</th>
                        <th>Gross Amount</th>
                        <th>5% TDS</th>
                        <th>Net Payable</th>
                        <th>Bank Account</th>
                        <th>Status</th>
                        <th className="text-right">Action / Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-6 text-muted">
                            No withdrawal requests yet. Click "Withdraw Payout" to initiate.
                          </td>
                        </tr>
                      ) : (
                        payoutRequests.map((req) => (
                          <tr key={req.id}>
                            <td className="code-font font-bold text-primary-blue">#{req.id}</td>
                            <td className="text-muted font-xs">{req.request_date}</td>
                            <td className="font-bold">₹{req.amount.toLocaleString('en-IN')}</td>
                            <td className="text-rose font-semibold">-₹{req.tds_amount.toLocaleString('en-IN')}</td>
                            <td className="text-success font-bold">₹{req.net_payable.toLocaleString('en-IN')}</td>
                            <td>
                              <div>{req.bank_details?.bank_name || 'Bank'}</div>
                              <div className="text-muted font-xs">A/C: ••••{req.bank_details?.account_number ? req.bank_details.account_number.slice(-4) : '----'}</div>
                            </td>
                            <td>
                              <span className={`badge ${req.status === 'paid' ? 'badge-green' : req.status === 'pending' ? 'badge-amber' : 'badge-neutral'}`}>
                                {req.status === 'paid' ? 'Paid & Disbursed' : req.status === 'pending' ? 'Pending Admin Disbursal' : 'Rejected'}
                              </span>
                            </td>
                            <td className="text-right">
                              {req.status === 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptModal(req)}
                                  className="btn btn-outline-blue btn-xs flex-center gap-1"
                                >
                                  <Receipt size={12} />
                                  <span>View Screenshot</span>
                                </button>
                              ) : req.status === 'pending' ? (
                                <span className="text-muted font-xs">Awaiting Admin Transfer</span>
                              ) : (
                                <span className="text-rose font-xs">Rejected</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* FIXED ELEGANT WITHDRAWAL MODAL (Fixing Image 3 completely) */}
            {withdrawModalOpen && (
              <div className="custom-modal-backdrop" onClick={() => setWithdrawModalOpen(false)}>
                <div className="withdraw-modal-clean card-white" onClick={e => e.stopPropagation()}>
                  <div className="withdraw-modal-header">
                    <div>
                      <h3 className="modal-title-bold">Request Bank Payout</h3>
                      <p className="modal-sub-clean">
                        Disbursed manually to your verified KYC bank account by Finance Admin.
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setWithdrawModalOpen(false)} 
                      className="close-modal-btn"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleWithdraw} className="withdraw-modal-body">
                    {/* Verified Bank Badge Card */}
                    <div className="verified-bank-box">
                      <div className="bank-box-left">
                        <div className="bank-avatar-shield">
                          <ShieldCheck size={22} className="text-primary-blue" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-primary">
                            {currentMember?.kyc?.bank_account_number 
                              ? `${currentMember.kyc.bank_name || 'Bank'} ••••${currentMember.kyc.bank_account_number.slice(-4)}`
                              : 'Bank Account Not Linked'}
                          </div>
                          <div className="text-muted font-xs">
                            {currentMember?.kyc?.bank_account_number 
                              ? `IFSC: ${currentMember.kyc.bank_ifsc} • Beneficiary: ${currentMember.kyc.legal_name || currentMember.name}`
                              : 'Please link your settlement bank account in KYC before requesting a payout.'}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${currentMember?.kyc?.bank_account_number ? 'badge-green' : 'badge-amber'} font-xs`}>
                        {currentMember?.kyc?.bank_account_number ? 'KYC Verified ✓' : 'Action Required'}
                      </span>
                    </div>

                    {/* Available Balance Callout & Quick Chips */}
                    <div className="withdraw-balance-row">
                      <span className="text-sm text-muted">
                        Available to Withdraw: <strong className="text-primary font-bold">₹{availableBalance.toLocaleString('en-IN')}</strong>
                      </span>
                      <div className="quick-amount-chips">
                        {[500, 1000, 2000, availableBalance].filter(amt => amt <= availableBalance && amt >= 500).map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setWithdrawAmount(amt.toString())}
                            className="chip-btn"
                          >
                            ₹{amt.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input */}
                    <div className="form-group-clean">
                      <label className="form-label-clean">Withdrawal Amount (INR)</label>
                      <div className="currency-input-wrapper">
                        <span className="currency-symbol-tag">₹</span>
                        <input
                          type="number"
                          min="500"
                          max={availableBalance}
                          required
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Enter amount (min ₹500)"
                          className="currency-input-field"
                        />
                      </div>
                    </div>

                    {/* Statutory Calculation Breakdown */}
                    {Number(withdrawAmount) >= 500 && (
                      <div className="payout-tax-breakdown-card">
                        <div className="tax-row">
                          <span className="text-muted">Gross Amount Requested</span>
                          <span className="font-bold">₹{Number(withdrawAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="tax-row">
                          <span className="text-muted">5% Statutory TDS (Direct Selling Rules)</span>
                          <span className="text-rose font-semibold">-₹{Math.round(Number(withdrawAmount) * 0.05).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="tax-divider" />
                        <div className="tax-row net-row">
                          <span className="font-bold text-primary">Net Bank Deposit (Estimated)</span>
                          <span className="font-extrabold text-success text-base">
                            ₹{(Number(withdrawAmount) - Math.round(Number(withdrawAmount) * 0.05)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="withdraw-notice-box">
                      <AlertCircle size={15} className="text-amber flex-shrink-0" />
                      <p className="font-xs text-muted mb-0">
                        <strong>Pending Approval Process:</strong> When submitted, your request will appear in the Admin Finance Portal. The Admin will verify your bank details, perform a manual transfer, and attach a payment screenshot. Your available balance will be deducted only upon Admin confirmation.
                      </p>
                    </div>

                    <div className="withdraw-modal-footer">
                      <button 
                        type="button" 
                        onClick={() => setWithdrawModalOpen(false)} 
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary flex-center gap-1"
                      >
                        <ArrowUpRight size={15} />
                        <span>Confirm Withdrawal</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 4: MY SUBSCRIPTIONS & ORDERS */}
        {activeTab === 'subscriptions' && (() => {
          const myLatestOrder = orders.find(o => o.buyer_member_id === currentMember?.member_id) || orders[0];
          const orderNum = myLatestOrder?.order_id || (currentMember?.cs_customer_id ? `CS${currentMember.cs_customer_id}` : 'CS-ACTIVE');
          const orderDate = myLatestOrder?.activation_date || new Date(currentMember?.joined_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const renewalDate = myLatestOrder?.next_renewal || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          return (
            <div className="dash-sub-view">
              {/* Active Subscription Card */}
              <div className="active-sub-card card-white">
                <div className="sub-card-header">
                  <div>
                    <span className={`badge ${currentMember?.seller_status === 'active' ? 'badge-green' : 'badge-amber'} mb-2`}>
                      {currentMember?.seller_status === 'active' ? 'Active' : 'Pending Activation'}
                    </span>
                    <h3 className="sub-title-bold">CyberShield Partner Joining Membership</h3>
                    <p className="text-muted text-sm">Official Authorized Member License • ₹2,500 Joining Plan</p>
                  </div>
                  <div className="sub-price-callout">
                    <span className="text-muted text-xs">Amount Paid</span>
                    <div className="text-primary-blue text-large font-bold">
                      ₹{(myLatestOrder?.total_amount || 2950).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="sub-dates-row">
                  <div className="date-item">
                    <span className="text-muted text-xs">Start Date</span>
                    <span className="font-semibold">{orderDate}</span>
                  </div>
                  <div className="date-item">
                    <span className="text-muted text-xs">Next Renewal</span>
                    <span className="font-semibold">{renewalDate}</span>
                  </div>
                  <div className="date-item">
                    <span className="text-muted text-xs">Official Activation</span>
                    <span className="text-success font-semibold">
                      {currentMember?.seller_status === 'active' ? 'CyberShield Defense Engine (Active)' : 'Pending Verification'}
                    </span>
                  </div>
                </div>

                <div className="sub-actions-row">
                  <button 
                    onClick={() => {
                      downloadTaxInvoice({ order: myLatestOrder, member: currentMember });
                      addToast('info', 'Invoice Downloaded', `Invoice #${orderNum} downloaded.`);
                    }} 
                    className="btn btn-secondary btn-sm"
                  >
                    <Download size={14} />
                    <span>View / Download Invoice</span>
                  </button>
                  <button 
                    onClick={() => addToast('info', 'Subscription Status', currentMember?.seller_status === 'active' ? 'Your license is actively protecting endpoints.' : 'Pending activation.')} 
                    className="btn btn-secondary btn-sm"
                  >
                    Manage
                  </button>
                  <button 
                    onClick={() => addToast('warning', 'Cancellation policy', 'Cooling-off refund can be filed via support within 7 days.')} 
                    className="btn btn-secondary btn-sm text-rose"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Order Details & CyberShield Activation Status */}
              <div className="order-details-card card-white">
                <h3 className="chart-card-title mb-4">Latest Order & Activation Details</h3>
                
                <div className="order-specs-grid">
                  <div className="spec-row">
                    <span className="spec-label">Order Number:</span>
                    <span className="spec-val font-semibold code-font">#{orderNum}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Order Date:</span>
                    <span className="spec-val">{orderDate}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Payment Method:</span>
                    <span className="spec-val">{myLatestOrder?.payment_method || 'UPI (Google Pay / PhonePe)'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Amount Paid:</span>
                    <span className="spec-val font-bold">₹{(myLatestOrder?.total_amount || 2950).toLocaleString('en-IN')} (₹2,500 + 18% GST)</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Payment Status:</span>
                    <span className={`badge ${currentMember?.seller_status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                      {myLatestOrder?.payment_status ? (myLatestOrder.payment_status.charAt(0).toUpperCase() + myLatestOrder.payment_status.slice(1)) : (currentMember?.seller_status === 'active' ? 'Paid' : 'Pending')}
                    </span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Subscription Status:</span>
                    <span className={`badge ${currentMember?.seller_status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                      {currentMember?.seller_status === 'active' ? 'Active (Enterprise Cloud Protected)' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <button 
                    onClick={() => {
                      downloadTaxInvoice({ order: myLatestOrder, member: currentMember });
                      addToast('success', 'Invoice Downloaded', `CyberShield GST Tax Invoice #${orderNum} downloaded.`);
                    }} 
                    className="btn btn-primary btn-sm"
                  >
                    <Download size={14} />
                    <span>Download Official Tax Invoice</span>
                  </button>
                </div>
              </div>

            {/* DUAL ACCOUNTS PROVISIONED VIA API CARD */}
            <div className="dual-accounts-showcase-card card-white mt-4 p-5">
              <div className="card-head-between mb-4">
                <div>
                  <h3 className="chart-card-title mb-1">Dual Accounts Provisioned via API</h3>
                  <p className="text-muted text-sm">
                    Two independent enterprise accounts generated upon ₹2,500 joining fee completion.
                  </p>
                </div>
                <span className="badge badge-green font-xs">2 Accounts Active ✓</span>
              </div>

              <div className="dual-accounts-container">
                {/* Account 1 */}
                <div className="dual-account-box mlm-account-box">
                  <div className="account-box-badge">
                    <span>Account 1: Partner MLM Account</span>
                  </div>
                  <div className="account-specs-compact">
                    <div className="spec-item-compact">
                      <span className="spec-k">Member / Partner ID:</span>
                      <span className="spec-v code-font">{currentMember.member_id}</span>
                    </div>
                    <div className="spec-item-compact">
                      <span className="spec-k">Distributor Referral Code:</span>
                      <span className="spec-v code-font font-bold text-primary-blue">{currentMember.referral_code}</span>
                    </div>
                    <div className="spec-item-compact">
                      <span className="spec-k">Commission Wallet:</span>
                      <span className="spec-v code-font">{currentMember.accounts?.account1_mlm?.commission_wallet_id || `WAL-${currentMember.referral_code || currentMember.member_id}`}</span>
                    </div>
                    <div className="spec-item-compact">
                      <span className="spec-k">Tier Hierarchy:</span>
                      <span className="spec-v">6-Tier Matrix Operational</span>
                    </div>
                  </div>
                </div>

                {/* Account 2 */}
                <div className="dual-account-box software-account-box">
                  <div className="account-box-badge software-badge">
                    <span>Account 2: Enterprise Cyber Defense License</span>
                  </div>
                  <div className="account-specs-compact">
                    <div className="spec-item-compact">
                      <span className="spec-k">Software License Key:</span>
                      <span className="spec-v code-font font-bold text-success">
                        {currentMember.software_license?.license_key || currentMember.accounts?.account2_software?.license_key || (currentMember.seller_status === 'active' ? `CS-PRO-${currentMember.referral_code || 'ACTIVE'}` : 'Awaiting Admin Verification')}
                      </span>
                    </div>
                    <div className="spec-item-compact">
                      <span className="spec-k">Endpoint Device Seats:</span>
                      <span className="spec-v font-bold">5 Protected Devices</span>
                    </div>
                    <div className="spec-item-compact">
                      <span className="spec-k">Software Suite:</span>
                      <span className="spec-v">CyberShield Pro Enterprise Suite</span>
                    </div>
                    <div className="spec-item-compact">
                      <span className="spec-k">Client Portal Access:</span>
                      <span className="spec-v">{currentMember.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

        {/* SUBVIEW 5: PROFILE & KYC (Matching Screen 8) */}
        {activeTab === 'kyc' && (
          <div className="dash-kyc-view card-white">
            <div className="kyc-header-tabs">
              <button 
                type="button"
                onClick={() => setKycTab('personal')} 
                className={`kyc-tab-btn ${kycTab === 'personal' ? 'active' : ''}`}
              >
                <User size={16} />
                <span>Personal Details</span>
              </button>
              <button 
                type="button"
                onClick={() => setKycTab('documents')} 
                className={`kyc-tab-btn ${kycTab === 'documents' ? 'active' : ''}`}
              >
                <FileText size={16} />
                <span>KYC Documents</span>
              </button>
              <button 
                type="button"
                onClick={() => setKycTab('tax')} 
                className={`kyc-tab-btn ${kycTab === 'tax' ? 'active' : ''}`}
              >
                <Receipt size={16} />
                <span>Tax Details</span>
              </button>
              <button 
                type="button"
                onClick={() => setKycTab('agreement')} 
                className={`kyc-tab-btn ${kycTab === 'agreement' ? 'active' : ''}`}
              >
                <ShieldCheck size={16} />
                <span>Agreement</span>
              </button>
            </div>

            {/* Profile Avatar Header */}
            <div className="kyc-user-card">
              <img 
                src={currentMember?.avatar || '/matru-avatar.jpg'} 
                alt="Avatar" 
                className="kyc-large-avatar"
              />
              <div>
                <h3 className="kyc-user-name">{currentMember?.name || 'Matru Prasad Panda'}</h3>
                <span className="badge badge-amber">{currentMember?.rank || 'Silver Member'}</span>
                <span className="badge badge-green ml-2">KYC Verified ✓</span>
              </div>
            </div>

            {/* TAB 1: PERSONAL DETAILS */}
            {kycTab === 'personal' && (
              <div className="tab-pane-content">
                <h4 className="tab-pane-title">Personal Information</h4>
                <p className="tab-pane-sub">Manage your account profile and contact details.</p>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  addToast('success', 'Profile Updated!', 'Personal details saved successfully.');
                }} className="kyc-form-grid">
                  <div className="form-group-clean">
                    <label className="form-label-clean">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue={currentMember?.name || ''} 
                      placeholder="Enter legal full name"
                      className="form-input-clean" 
                      required 
                    />
                  </div>

                  <div className="form-group-clean">
                    <label className="form-label-clean">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue={currentMember?.email || ''} 
                      placeholder="name@example.com"
                      className="form-input-clean" 
                      required 
                    />
                  </div>

                  <div className="form-group-clean">
                    <label className="form-label-clean">Mobile Number</label>
                    <input 
                      type="tel" 
                      defaultValue={currentMember?.phone || ''} 
                      placeholder="10-digit mobile number"
                      className="form-input-clean" 
                      required 
                    />
                  </div>

                  <div className="form-group-clean">
                    <label className="form-label-clean">Date of Birth</label>
                    <input 
                      type="text" 
                      defaultValue={currentMember?.dob || ''} 
                      placeholder="DD/MM/YYYY"
                      className="form-input-clean" 
                    />
                  </div>

                  <div className="form-group-clean">
                    <label className="form-label-clean">Gender</label>
                    <select defaultValue={currentMember?.gender || 'Male'} className="form-input-clean">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group-clean">
                    <label className="form-label-clean">City & State</label>
                    <input 
                      type="text" 
                      defaultValue={currentMember?.city || ''} 
                      placeholder="e.g. City, State"
                      className="form-input-clean" 
                    />
                  </div>

                  <div className="form-group-clean full-grid-width">
                    <label className="form-label-clean">Residential Address</label>
                    <input 
                      type="text" 
                      defaultValue={currentMember?.address || ''} 
                      placeholder="Enter flat / house no., street, PIN code"
                      className="form-input-clean" 
                    />
                  </div>

                  <div className="full-grid-width mt-2">
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: KYC DOCUMENTS (Matching Screen 8) */}
            {kycTab === 'documents' && (
              <div className="tab-pane-content">
                <h4 className="tab-pane-title">Statutory Identity & Banking Documents</h4>
                <p className="tab-pane-sub">Required by Direct Selling Rules, 2021 before commission withdrawal.</p>

                <div className="documents-upload-grid">
                  {/* Doc 1: Aadhaar */}
                  <div className="doc-item-card">
                    <div className="doc-info">
                      <FileText size={20} className="text-primary-blue" />
                      <div>
                        <div className="doc-title">Aadhaar Card</div>
                        <div className="doc-sub">Identity & Address verification (••••{currentMember?.kyc?.aadhaar ? currentMember.kyc.aadhaar.slice(-4) : '----'})</div>
                      </div>
                    </div>
                    <div className="doc-actions-pill">
                      <span className={`badge ${currentMember?.kyc?.aadhaar ? 'badge-green' : 'badge-neutral'}`}>
                        {currentMember?.kyc?.aadhaar ? 'Uploaded ✓' : 'Pending'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => addToast('info', 'Aadhaar Status', currentMember?.kyc?.aadhaar ? 'Aadhaar verified via DigiLocker token.' : 'Please upload your Aadhaar in KYC.')}
                        className="btn-link-action"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {/* Doc 2: PAN */}
                  <div className="doc-item-card">
                    <div className="doc-info">
                      <FileText size={20} className="text-primary-blue" />
                      <div>
                        <div className="doc-title">PAN Card</div>
                        <div className="doc-sub">Tax ID for commission payouts ({currentMember?.kyc?.pan || 'Not Submitted'})</div>
                      </div>
                    </div>
                    <div className="doc-actions-pill">
                      <span className={`badge ${currentMember?.kyc?.pan ? 'badge-green' : 'badge-neutral'}`}>
                        {currentMember?.kyc?.pan ? 'Uploaded ✓' : 'Pending'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => addToast('info', 'PAN Status', currentMember?.kyc?.pan ? `PAN ${currentMember.kyc.pan} validated with NSDL database.` : 'Please upload your PAN card.')}
                        className="btn-link-action"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {/* Doc 3: Address Proof */}
                  <div className="doc-item-card">
                    <div className="doc-info">
                      <FileText size={20} className="text-primary-blue" />
                      <div>
                        <div className="doc-title">Address Proof</div>
                        <div className="doc-sub">Electricity bill / Bank statement</div>
                      </div>
                    </div>
                    <div className="doc-actions-pill">
                      <span className={`badge ${currentMember?.kyc?.documents?.addressProof === 'Uploaded' ? 'badge-green' : 'badge-neutral'}`}>
                        {currentMember?.kyc?.documents?.addressProof === 'Uploaded' ? 'Uploaded ✓' : 'Pending'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => addToast('info', 'Address Verified', currentMember?.kyc?.documents?.addressProof === 'Uploaded' ? 'Address matching partner record.' : 'Please upload your address proof document.')}
                        className="btn-link-action"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {/* Doc 4: Bank Account */}
                  <div className="doc-item-card">
                    <div className="doc-info">
                      <FileText size={20} className="text-primary-blue" />
                      <div>
                        <div className="doc-title">Bank Account (Passbook / Cancelled Cheque)</div>
                        <div className="doc-sub">
                          {currentMember?.kyc?.bank_account_number 
                            ? `${currentMember.kyc.bank_name || 'Bank'} ••••${currentMember.kyc.bank_account_number.slice(-4)} (Verified for instant payouts)`
                            : 'Bank Account Not Linked'}
                        </div>
                      </div>
                    </div>
                    <div className="doc-actions-pill">
                      <span className={`badge ${currentMember?.kyc?.bank_account_number ? 'badge-green' : 'badge-amber'}`}>
                        {currentMember?.kyc?.bank_account_number ? 'Uploaded ✓' : 'Pending'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => addToast('info', 'Bank Status', currentMember?.kyc?.bank_account_number ? 'Penny-drop verification confirmed.' : 'Please link your bank account.')}
                        className="btn-link-action"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TAX DETAILS */}
            {kycTab === 'tax' && (
              <div className="tab-pane-content">
                <h4 className="tab-pane-title">Tax Details & TDS Compliance</h4>
                <p className="tab-pane-sub">Income tax withholdings as per Section 194H of the Indian Income Tax Act.</p>

                <div className="tax-details-grid">
                  <div className="tax-stat-box card-white p-4">
                    <span className="text-muted text-xs">Permanent Account Number (PAN)</span>
                    <div className="font-bold text-lg code-font mt-1">{currentMember?.kyc?.pan || 'Not Submitted'}</div>
                    <span className={`badge ${currentMember?.kyc?.pan ? 'badge-green' : 'badge-amber'} font-xs mt-2`}>
                      {currentMember?.kyc?.pan ? 'Verified with ITD' : 'Pending Submission'}
                    </span>
                  </div>

                  <div className="tax-stat-box card-white p-4">
                    <span className="text-muted text-xs">Statutory TDS Rate (Sec 194H)</span>
                    <div className="font-bold text-lg text-primary-blue mt-1">5.0%</div>
                    <span className="text-muted text-xs mt-2 block">Deducted automatically on payouts</span>
                  </div>

                  <div className="tax-stat-box card-white p-4">
                    <span className="text-muted text-xs">GST Registration Status</span>
                    <div className="font-bold text-lg text-secondary mt-1">Unregistered</div>
                    <span className="text-muted text-xs mt-2 block">Turnover below ₹20 Lakh threshold</span>
                  </div>
                </div>

                <div className="tax-certificates-card card-white p-5 mt-4">
                  <h5 className="font-bold text-base mb-2">Withholding Tax Certificates (Form 16A)</h5>
                  <p className="text-muted text-xs mb-4">Download quarterly tax deduction certificates for annual income tax filing.</p>
                  
                  {payoutRequests.some(p => p.status === 'paid' && p.tds_amount > 0) ? (
                    <div className="tax-cert-row">
                      <div>
                        <span className="font-semibold text-sm">FY 2026-27 (Quarter 2 - Jul to Sep)</span>
                        <div className="text-muted text-xs">
                          TDS Deducted: ₹{payoutRequests.filter(p => p.status === 'paid').reduce((s, p) => s + p.tds_amount, 0).toLocaleString('en-IN')} • Statutory Sec 194H
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const tds = payoutRequests.filter(p => p.status === 'paid').reduce((s, p) => s + p.tds_amount, 0) || 50;
                          downloadForm16A({ member: currentMember, tdsAmount: tds });
                          addToast('success', 'Form 16A Downloaded', 'Statutory TDS Certificate (Form 16A) downloaded.');
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Download size={14} />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-card-alt border-rounded text-xs text-muted">
                      No statutory TDS deductions recorded yet. Quarterly Form 16A certificates are generated upon payout disbursals.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: AGREEMENT */}
            {kycTab === 'agreement' && (
              <div className="tab-pane-content">
                <h4 className="tab-pane-title">Direct Seller Agreement & Code of Ethics</h4>
                <p className="tab-pane-sub">Statutory direct selling contract under Ministry of Consumer Affairs guidelines.</p>

                <div className="agreement-summary-box card-white p-5">
                  <div className="agreement-badge-row mb-3">
                    <span className="badge badge-green">Status: Signed & Legally Binding</span>
                    <span className="badge badge-blue">Agreement Version: v2026.1</span>
                  </div>

                  <h5 className="font-bold text-base mb-2">Direct Seller Contract Confirmation</h5>
                  <p className="text-muted text-sm leading-relaxed mb-4">
                    Executed electronically between <strong>{currentMember?.name || 'Authorized Member'}</strong> and <strong>CyberShield Network Direct Selling Entity</strong> on <strong>{currentMember?.joined_at ? new Date(currentMember.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Registration Date'}</strong>.
                  </p>

                  <div className="agreement-clauses-list">
                    <div className="clause-item">
                      <CheckCircle2 size={16} className="text-success" />
                      <span><strong>Retail Sales Commission:</strong> Earnings are paid solely upon verified retail subscription sales of CyberShield enterprise software licenses.</span>
                    </div>
                    <div className="clause-item">
                      <CheckCircle2 size={16} className="text-success" />
                      <span><strong>Zero Joining Fee:</strong> No compulsory purchase or enrollment fee required for participation.</span>
                    </div>
                    <div className="clause-item">
                      <CheckCircle2 size={16} className="text-success" />
                      <span><strong>7-Day Cooling-off Period:</strong> Full refund rights respected; cancelled purchases reverse unearned commissions.</span>
                    </div>
                    <div className="clause-item">
                      <CheckCircle2 size={16} className="text-success" />
                      <span><strong>Ethical Marketing:</strong> Strict prohibition on misleading income claims or guaranteed return promises.</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => addToast('success', 'Contract Downloaded', 'Direct Seller Agreement v2026.1 (Signed PDF) downloaded.')}
                      className="btn btn-primary btn-sm"
                    >
                      <Download size={14} />
                      <span>Download Signed Copy (PDF)</span>
                    </button>

                    <button 
                      onClick={() => addToast('info', 'Code of Conduct', 'Viewing official Direct Selling Code of Conduct.')}
                      className="btn btn-secondary btn-sm"
                    >
                      View Code of Ethics
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SHARE REFERRAL MODAL */}
      {isShareModalOpen && (
        <div className="custom-modal-backdrop" onClick={() => setIsShareModalOpen(false)}>
          <div className="share-modal card-white" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <div>
                <h3 className="modal-title-bold">Share Referral Link</h3>
                <p className="modal-sub-clean">Invite partners and earn retail software commissions on qualifying activations.</p>
              </div>
              <button type="button" onClick={() => setIsShareModalOpen(false)} className="close-modal-btn">
                <X size={18} />
              </button>
            </div>

            <div className="share-modal-body">
              <div className="share-link-input-group">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`}
                  className="form-input-clean code-font"
                />
                <button 
                  type="button" 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`);
                    addToast('success', 'Copied!', 'Referral link copied to clipboard.');
                  }}
                  className="btn btn-primary btn-sm flex-center gap-1"
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
              </div>

              <div className="share-channels-grid">
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`;
                    const text = `Join CyberShield Network with my verified partner link to access enterprise cybersecurity software and earn direct sales commissions: ${url}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="share-channel-btn whatsapp-channel"
                >
                  <span className="channel-icon">💬</span>
                  <span className="channel-title">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`;
                    const text = `Join CyberShield Network with my verified partner link: ${url}`;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="share-channel-btn telegram-channel"
                >
                  <span className="channel-icon">✈️</span>
                  <span className="channel-title">Telegram</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`;
                    const text = `Get enterprise cyber defense software with transparent affiliate rewards on CyberShield Network: ${url}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="share-channel-btn twitter-channel"
                >
                  <span className="channel-icon">🐦</span>
                  <span className="channel-title">Twitter / X</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?ref=${currentMember?.referral_code || 'CS123456'}`;
                    const subject = `Join CyberShield Network - Authorized Security Software Partner`;
                    const body = `Hi,\n\nI invite you to join CyberShield Network. Use my partner link to sign up:\n${url}\n\nBest regards,\n${currentMember?.name}`;
                    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                  }}
                  className="share-channel-btn email-channel"
                >
                  <span className="channel-icon">✉️</span>
                  <span className="channel-title">Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISBURSEMENT RECEIPT / SCREENSHOT VIEWER MODAL */}
      {selectedReceiptModal && (
        <div className="custom-modal-backdrop" onClick={() => setSelectedReceiptModal(null)}>
          <div className="receipt-viewer-modal card-white" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <div className="flex-center gap-2">
                <CheckCircle2 size={22} className="text-success" />
                <div>
                  <h4 className="modal-title-bold">Disbursement Receipt & Proof</h4>
                  <p className="modal-sub-clean">Bank transfer confirmation uploaded by Finance Admin</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedReceiptModal(null)} className="close-modal-btn">
                <X size={18} />
              </button>
            </div>

            <div className="receipt-modal-body">
              <div className="receipt-meta-grid">
                <div className="meta-box">
                  <span className="meta-lbl">Request ID</span>
                  <span className="meta-val code-font">{selectedReceiptModal.id}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Bank UTR Reference</span>
                  <span className="meta-val code-font text-primary-blue">{selectedReceiptModal.admin_payment?.utr_number || 'UTR-CS-9918237'}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Net Disbursed</span>
                  <span className="meta-val font-bold text-success">₹{(selectedReceiptModal.net_payable || selectedReceiptModal.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Disbursement Date</span>
                  <span className="meta-val">{selectedReceiptModal.admin_payment?.paid_at || '12 Oct 2026'}</span>
                </div>
              </div>

              {/* Screenshot Image or Verified Bank IMPS Graphic */}
              <div className="receipt-screenshot-container">
                <div className="screenshot-tag">Transfer Screenshot Proof</div>
                {selectedReceiptModal.admin_payment?.receipt_url ? (
                  <img 
                    src={selectedReceiptModal.admin_payment.receipt_url} 
                    alt="Payment Screenshot" 
                    className="receipt-attached-img"
                  />
                ) : (
                  <div className="simulated-bank-receipt">
                    <div className="receipt-bank-header">
                      <ShieldCheck size={32} className="text-success" />
                      <div className="font-extrabold text-base text-primary">HDFC BANK IMPS CONFIRMATION</div>
                      <div className="badge badge-green font-xs">TRANSACTION SUCCESSFUL</div>
                    </div>
                    <div className="receipt-details-list">
                      <div className="detail-line">
                        <span>Beneficiary Name:</span>
                        <strong>{selectedReceiptModal.bank_details?.account_holder || selectedReceiptModal.member_name}</strong>
                      </div>
                      <div className="detail-line">
                        <span>Account Number:</span>
                        <strong className="code-font">{selectedReceiptModal.bank_details?.account_number ? '••••' + selectedReceiptModal.bank_details.account_number.slice(-4) : '••••----'}</strong>
                      </div>
                      <div className="detail-line">
                        <span>IFSC Code:</span>
                        <strong className="code-font">{selectedReceiptModal.bank_details?.ifsc || 'N/A'}</strong>
                      </div>
                      <div className="detail-line">
                        <span>Amount Disbursed:</span>
                        <strong className="text-success font-bold">₹{(selectedReceiptModal.net_payable || selectedReceiptModal.amount).toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="detail-line">
                        <span>Payment Mode:</span>
                        <span>{selectedReceiptModal.admin_payment?.payment_mode || 'IMPS / Corporate Bank Transfer'}</span>
                      </div>
                      <div className="detail-line">
                        <span>UTR / Bank Ref:</span>
                        <strong className="code-font text-primary">{selectedReceiptModal.admin_payment?.utr_number || 'UTR-CS-9918237'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="receipt-modal-footer">
              <button type="button" onClick={() => setSelectedReceiptModal(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom on phones) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`bottom-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <LayoutDashboard size={19} />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`bottom-nav-item ${activeTab === 'network' ? 'active' : ''}`}
        >
          <GitBranch size={19} />
          <span>Network</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`bottom-nav-item ${activeTab === 'wallet' ? 'active' : ''}`}
        >
          <Wallet size={19} />
          <span>Wallet</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`bottom-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
        >
          <CreditCard size={19} />
          <span>License</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kyc')}
          className={`bottom-nav-item ${activeTab === 'kyc' ? 'active' : ''}`}
        >
          <UserCheck size={19} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
