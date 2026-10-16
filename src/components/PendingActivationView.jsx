import React from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Lock, 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  CreditCard, 
  Key, 
  Users,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function PendingActivationView() {
  const { 
    currentMember, 
    setCurrentPage, 
    navigateToAdmin, 
    logout,
    pendingActivations = []
  } = useMlm();

  // Find any activation record for this member
  const activationRecord = pendingActivations.find(a => 
    a.member_id === currentMember?.member_id || 
    a.member_email === currentMember?.email
  ) || pendingActivations[0];

  return (
    <div className="pending-activation-page">
      <div className="pending-activation-container">
        {/* Top Header Card */}
        <div className="pending-card pending-header-card">
          <div className="pending-header-icon-box">
            <Clock size={36} className="text-amber animate-pulse" />
            <span className="pending-header-glow" />
          </div>

          <div className="pending-header-info">
            <div className="pending-status-pill">
              <span className="pending-dot-pulse" />
              <span>AWAITING ADMIN APPROVAL</span>
            </div>
            <h2 className="pending-main-title">
              Account Activation in Progress
            </h2>
            <p className="pending-main-sub">
              Welcome, <strong>{currentMember?.name || 'Partner'}</strong>! Your joining application and ₹2,500 plan payment have been submitted to CyberShield Administration for verification.
            </p>
          </div>

          <div className="pending-header-actions">
            <button
              onClick={() => setCurrentPage('home')}
              className="btn btn-secondary btn-sm flex-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            <button
              onClick={logout}
              className="btn btn-outline-danger btn-sm flex-center gap-1"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Locked Profile & Referral Banner Alert */}
        <div className="locked-feature-banner">
          <div className="locked-icon-badge">
            <Lock size={22} className="text-amber" />
          </div>
          <div className="locked-text-content">
            <h4 className="locked-banner-title">
              🔒 Member Profile & Personal Referral Link are Currently Locked
            </h4>
            <p className="locked-banner-desc">
              Under Direct Selling guidelines, your personal member profile, distributor referral code, and team commission hierarchy will be <strong>unlocked automatically</strong> once CyberShield Administration approves your ₹2,500 joining activation.
            </p>
          </div>
        </div>

        {/* 2 Provisioned Accounts Status Grid */}
        <div className="pending-accounts-grid">
          {/* Account 1 Card */}
          <div className="pending-account-card">
            <div className="pending-ac-top">
              <div className="pending-ac-icon bg-blue-dim">
                <Users size={22} className="text-primary-blue" />
              </div>
              <div className="pending-ac-status badge badge-amber">
                <Clock size={12} className="mr-1" />
                Pending Activation
              </div>
            </div>

            <h3 className="pending-ac-title">Account 1: Partner MLM Account</h3>
            <p className="pending-ac-desc">
              Direct selling license, 6-tier matrix placement, and commission wallet.
            </p>

            <div className="pending-ac-specs">
              <div className="pending-spec-row">
                <span className="spec-label">Applicant Name:</span>
                <span className="spec-val font-bold">{currentMember?.name || 'Authorized Partner'}</span>
              </div>
              <div className="pending-spec-row">
                <span className="spec-label">Sponsor ID:</span>
                <span className="spec-val code-font text-cyan">{currentMember?.sponsor_member_id || currentMember?.sponsor_code || 'CS123456'}</span>
              </div>
              <div className="pending-spec-row">
                <span className="spec-label">Joining Plan Fee:</span>
                <span className="spec-val font-bold text-emerald">₹2,500 (+ 18% GST Paid)</span>
              </div>
              <div className="pending-spec-row">
                <span className="spec-label">Personal Referral Link:</span>
                <span className="spec-val text-muted italic">🔒 Unlocks after Admin Approval</span>
              </div>
            </div>
          </div>

          {/* Account 2 Card */}
          <div className="pending-account-card">
            <div className="pending-ac-top">
              <div className="pending-ac-icon bg-emerald-dim">
                <Key size={22} className="text-emerald" />
              </div>
              <div className="pending-ac-status badge badge-amber">
                <Clock size={12} className="mr-1" />
                Queued for Generation
              </div>
            </div>

            <h3 className="pending-ac-title">Account 2: Cyber Defense License</h3>
            <p className="pending-ac-desc">
              Enterprise security software suite with 5 multi-device endpoint protection seats.
            </p>

            <div className="pending-ac-specs">
              <div className="pending-spec-row">
                <span className="spec-label">Software Suite:</span>
                <span className="spec-val font-bold">CyberShield Pro Enterprise</span>
              </div>
              <div className="pending-spec-row">
                <span className="spec-label">Endpoint Device Seats:</span>
                <span className="spec-val font-bold text-primary-blue">5 Protected Devices</span>
              </div>
              <div className="pending-spec-row">
                <span className="spec-label">Portal Account:</span>
                <span className="spec-val">{currentMember?.email || 'Registered User'}</span>
              </div>
              <div className="pending-spec-row">
                <span className="spec-label">License Key:</span>
                <span className="spec-val text-muted italic">🔒 Issued upon Admin Approval</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Testing Helper Callout */}
        <div className="admin-approval-test-box">
          <div className="test-box-left">
            <Sparkles size={20} className="text-primary-blue" />
            <div>
              <div className="font-bold text-sm text-primary">Testing Admin Approval?</div>
              <div className="text-muted text-xs">
                Open the Admin Portal to review and click "Approve & Activate Both Accounts" to instantly unlock this profile and referral link.
              </div>
            </div>
          </div>

          <button
            onClick={navigateToAdmin}
            className="btn btn-primary btn-sm flex-center gap-1"
            title="Open Admin Portal to approve this partner"
          >
            <Lock size={13} />
            <span>Open Admin Portal</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
