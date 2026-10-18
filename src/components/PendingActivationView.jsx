import React from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  Clock, 
  Lock, 
  ArrowLeft, 
  CreditCard, 
  Key, 
  Users,
  LogOut,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function PendingActivationView() {
  const { 
    currentMember, 
    setCurrentPage, 
    logout,
    openCheckout,
    pendingActivations = []
  } = useMlm();

  // Find strictly this member's activation record; NEVER fall back to another customer's record
  const activationRecord = pendingActivations.find(a => 
    (a.member_id && a.member_id === currentMember?.member_id) || 
    (a.member_email && a.member_email === currentMember?.email)
  );

  const isRejected = currentMember?.seller_status === 'rejected' || activationRecord?.status === 'rejected';
  const isPending = (currentMember?.seller_status === 'pending_approval' || (activationRecord && activationRecord.status === 'pending')) && !isRejected;
  const hasSubmittedPayment = isPending;
  const utrNumber = activationRecord?.utr_number;
  const rejectionReason = activationRecord?.rejection_reason || 'Payment credit could not be matched with our bank statement. Please verify your UTR and re-submit.';

  return (
    <div className="pending-activation-page">
      <div className="pending-activation-container">
        {/* Top Header Card */}
        <div className="pending-card pending-header-card">
          <div className="pending-header-icon-box">
            {isRejected ? (
              <AlertCircle size={36} className="text-rose" />
            ) : hasSubmittedPayment ? (
              <Clock size={36} className="text-amber animate-pulse" />
            ) : (
              <CreditCard size={36} className="text-primary-blue" />
            )}
            <span className="pending-header-glow" />
          </div>

          <div className="pending-header-info">
            <div className="pending-status-pill">
              <span className="pending-dot-pulse" />
              <span>
                {isRejected 
                  ? 'ACTION REQUIRED • PAYMENT VERIFICATION REJECTED' 
                  : hasSubmittedPayment 
                    ? 'STEP 2 OF 2 • AWAITING ADMIN APPROVAL' 
                    : 'STEP 1 OF 2 • PLAN PAYMENT REQUIRED'}
              </span>
            </div>
            <h2 className="pending-main-title">
              {isRejected 
                ? 'Payment Verification Rejected' 
                : hasSubmittedPayment 
                  ? 'Payment Submitted • Awaiting Verification' 
                  : 'Complete Joining Plan Purchase'}
            </h2>
            <p className="pending-main-sub">
              {isRejected ? (
                <>Welcome, <strong>{currentMember?.name || 'Partner'}</strong>. Your previous payment submission was rejected: <span className="text-rose font-semibold">{rejectionReason}</span>. Please click below to re-submit your valid UTR reference.</>
              ) : hasSubmittedPayment ? (
                <>Welcome, <strong>{currentMember?.name || 'Partner'}</strong>! Your joining application and payment {utrNumber ? `(UTR: ${utrNumber})` : ''} have been submitted to CyberShield Administration for verification.</>
              ) : (
                <>Welcome, <strong>{currentMember?.name || 'Partner'}</strong>! Your partner profile has been created. Please complete the ₹2,500 (+ 18% GST) plan purchase to unlock your license and distributor link.</>
              )}
            </p>
          </div>

          <div className="pending-header-actions">
            {(!hasSubmittedPayment || isRejected) && (
              <button
                onClick={() => openCheckout('Joining')}
                className="btn btn-primary btn-sm flex-center gap-1"
                style={{ fontWeight: 700 }}
              >
                <Zap size={14} />
                <span>{isRejected ? 'Re-Submit Payment (₹2,950)' : 'Pay ₹2,950 Now'}</span>
              </button>
            )}
            <button
              onClick={() => setCurrentPage('home')}
              className="btn btn-secondary btn-sm flex-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Home</span>
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

        {/* Action Callout for Rejected Users */}
        {isRejected ? (
          <div className="locked-feature-banner" style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3' }}>
            <div className="locked-icon-badge" style={{ background: '#FFE4E6', color: '#E11D48' }}>
              <AlertCircle size={22} />
            </div>
            <div className="locked-text-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
              <div>
                <h4 className="locked-banner-title" style={{ color: '#BE123C' }}>
                  ⚠️ Rejection Notice: {rejectionReason}
                </h4>
                <p className="locked-banner-desc" style={{ color: '#9F1239' }}>
                  If you made the payment, please double-check your bank UTR / transaction ID and re-submit it. If you have not paid yet, please complete payment to activate both accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCheckout('Joining')}
                className="btn btn-primary btn-md flex-center gap-2"
                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 700 }}
              >
                <Zap size={16} />
                <span>Re-Submit Payment Reference</span>
              </button>
            </div>
          </div>
        ) : !hasSubmittedPayment ? (
          /* Action Callout for Unpaid Users */
          <div className="locked-feature-banner" style={{ background: '#EFF6FF', border: '1.5px solid #93C5FD' }}>
            <div className="locked-icon-badge" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
              <CreditCard size={22} />
            </div>
            <div className="locked-text-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
              <div>
                <h4 className="locked-banner-title" style={{ color: '#1E40AF' }}>
                  💳 Action Required: Complete ₹2,500 Joining Plan Payment
                </h4>
                <p className="locked-banner-desc" style={{ color: '#1E3A8A' }}>
                  Your account is registered but inactive. Complete your ₹2,500 (+ 18% GST) payment via UPI / QR to submit your activation request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCheckout('Joining')}
                className="btn btn-primary btn-md flex-center gap-2"
                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 700 }}
              >
                <Zap size={16} />
                <span>Complete Payment Now (₹2,950)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Locked Profile & Referral Banner Alert for Paid Users */
          <div className="locked-feature-banner">
            <div className="locked-icon-badge">
              <Lock size={22} className="text-amber" />
            </div>
            <div className="locked-text-content">
              <h4 className="locked-banner-title">
                🔒 Member Profile & Personal Referral Link are Currently Locked
              </h4>
              <p className="locked-banner-desc">
                Under Direct Selling compliance guidelines, your distributor referral code and 10-tier hierarchy will be <strong>unlocked automatically</strong> once CyberShield Administration verifies your bank credit.
              </p>
            </div>
          </div>
        )}

        {/* 2 Provisioned Accounts Status Grid */}
        <div className="pending-accounts-grid">
          {/* Account 1 Card */}
          <div className="pending-account-card">
            <div className="pending-ac-top">
              <div className="pending-ac-icon bg-blue-dim">
                <Users size={22} className="text-primary-blue" />
              </div>
              <div className={`pending-ac-status badge ${hasSubmittedPayment ? 'badge-amber' : 'badge-rose'}`}>
                <Clock size={12} className="mr-1" />
                {hasSubmittedPayment ? 'Pending Admin Approval' : 'Payment Required'}
              </div>
            </div>

            <h3 className="pending-ac-title">Account 1: Partner MLM Account</h3>
            <p className="pending-ac-desc">
              Direct selling license, 10-tier matrix placement, and commission wallet.
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
                <span className={`spec-val font-bold ${hasSubmittedPayment ? 'text-amber' : 'text-rose'}`}>
                  {hasSubmittedPayment ? '₹2,500 (+ 18% GST Submitted)' : '₹2,500 (+ 18% GST Unpaid)'}
                </span>
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
              <div className={`pending-ac-status badge ${hasSubmittedPayment ? 'badge-amber' : 'badge-rose'}`}>
                <Clock size={12} className="mr-1" />
                {hasSubmittedPayment ? 'Queued for Generation' : 'Pending Payment'}
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
      </div>
    </div>
  );
}
