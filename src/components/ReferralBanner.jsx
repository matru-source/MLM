import React from 'react';
import { useMlm } from '../context/MlmContext';
import { ShieldCheck, AlertCircle, Clock, X, ArrowRight, Sparkles } from 'lucide-react';

export default function ReferralBanner() {
  const { 
    referralBanner, 
    dismissReferralBanner, 
    setIsAuthModalOpen, 
    setAuthMode,
    setActiveReferral,
    isLoggedIn
  } = useMlm();

  if (!referralBanner || !referralBanner.visible || isLoggedIn) {
    return null;
  }

  const { sponsorName, sponsorCode, secondsRemaining, isValid, statusMessage, errorReason } = referralBanner;

  // Format seconds to MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage (0 to 100%)
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 120) * 100));

  const handleJoinUnderSponsor = () => {
    setAuthMode('register');
    if (isValid) {
      setActiveReferral(sponsorCode);
    } else {
      setActiveReferral('CS123456');
    }
    setIsAuthModalOpen(true);
  };

  return (
    <aside 
      className="referral-banner-container"
      role="region"
      aria-label="Referral Invitation"
    >
      <div className={`referral-banner-card ${isValid ? '' : 'referral-card-warning'}`}>
        {/* Top Accent Glow / Border */}
        <div className={`referral-banner-glow ${isValid ? '' : 'glow-amber'}`} />

        <div className="referral-banner-main">
          {/* Sponsor Avatar / Icon */}
          <div className="referral-avatar-wrapper">
            <div className={`referral-avatar-badge ${isValid ? '' : 'badge-amber-bg'}`}>
              {isValid ? (
                <ShieldCheck size={24} className="text-emerald" />
              ) : (
                <AlertCircle size={24} className="text-amber" />
              )}
            </div>
            <span className={`referral-pulse-ring ${isValid ? '' : 'pulse-amber'}`} />
          </div>

          {/* Referral Text Content */}
          <div className="referral-content">
            <div className="referral-tag-row">
              <span className={`referral-pill-badge ${isValid ? '' : 'pill-amber'}`}>
                <Sparkles size={11} className="mr-1" />
                {isValid ? 'OFFICIAL INVITATION' : 'REFERRAL NOTICE'}
              </span>
              <span className="referral-timer-pill" title="This referral notification will automatically close in 2 minutes">
                <Clock size={12} className="mr-1" />
                Auto-closes in {formattedTime}
              </span>
            </div>

            <h4 className="referral-title">
              {isValid ? (
                <>You were referred by <strong className="referral-sponsor-name">{sponsorName}</strong></>
              ) : errorReason === 'inactive' ? (
                <>Partner <strong className="text-amber">{sponsorName}</strong> is Pending Activation</>
              ) : (
                <>Referral Code <span className="code-font text-amber">"{sponsorCode}"</span> is Invalid</>
              )}
            </h4>

            <p className="referral-subtitle">
              {isValid ? (
                <>
                  Sponsor Code: <span className="referral-code-highlight">{sponsorCode}</span>
                  <span className="referral-dot-sep">•</span>
                  <span className="referral-status-active">Verified Partner ✓</span>
                </>
              ) : (
                <span className="text-amber">
                  {statusMessage || 'Referral code not recognized. You may continue with Head Office (CS123456).'}
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="referral-actions">
            <button
              onClick={handleJoinUnderSponsor}
              className={`btn btn-sm referral-cta-btn ${isValid ? 'btn-primary' : 'btn-warning-clean'}`}
              title={isValid ? `Create your partner account under ${sponsorName}` : 'Register with Authorized Head Office (CS123456)'}
            >
              <span>{isValid ? `Join with ${sponsorName ? sponsorName.split(' ')[0] : 'Sponsor'}` : 'Join with Head Office'}</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={dismissReferralBanner}
              className="referral-close-btn"
              title="Dismiss notification"
              aria-label="Dismiss referral banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 120-Second Depleting Progress Bar */}
        <div className="referral-progress-track">
          <div 
            className={`referral-progress-fill ${isValid ? '' : 'fill-amber'}`}
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      </div>
    </aside>
  );
}
