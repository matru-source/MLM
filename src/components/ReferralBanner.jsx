import React from 'react';
import { useMlm } from '../context/MlmContext';
import { ShieldCheck, Clock, X, ArrowRight, Sparkles } from 'lucide-react';

export default function ReferralBanner() {
  const { 
    referralBanner, 
    dismissReferralBanner, 
    setIsAuthModalOpen, 
    setAuthMode 
  } = useMlm();

  if (!referralBanner || !referralBanner.visible) {
    return null;
  }

  const { sponsorName, sponsorCode, secondsRemaining } = referralBanner;

  // Format seconds to MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage (0 to 100%)
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 120) * 100));

  const handleJoinUnderSponsor = () => {
    setAuthMode('register');
    setIsAuthModalOpen(true);
  };

  return (
    <aside 
      className="referral-banner-container"
      role="region"
      aria-label="Referral Invitation"
    >
      <div className="referral-banner-card">
        {/* Top Accent Glow / Border */}
        <div className="referral-banner-glow" />

        <div className="referral-banner-main">
          {/* Sponsor Avatar / Icon */}
          <div className="referral-avatar-wrapper">
            <div className="referral-avatar-badge">
              <ShieldCheck size={24} className="text-emerald" />
            </div>
            <span className="referral-pulse-ring" />
          </div>

          {/* Referral Text Content */}
          <div className="referral-content">
            <div className="referral-tag-row">
              <span className="referral-pill-badge">
                <Sparkles size={11} className="mr-1" />
                OFFICIAL INVITATION
              </span>
              <span className="referral-timer-pill" title="This referral notification will automatically close in 2 minutes">
                <Clock size={12} className="mr-1" />
                Auto-closes in {formattedTime}
              </span>
            </div>

            <h4 className="referral-title">
              You were referred by <strong className="referral-sponsor-name">{sponsorName}</strong>
            </h4>

            <p className="referral-subtitle">
              Sponsor Code: <span className="referral-code-highlight">{sponsorCode}</span>
              <span className="referral-dot-sep">•</span>
              <span className="referral-status-active">Verified Partner</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="referral-actions">
            <button
              onClick={handleJoinUnderSponsor}
              className="btn btn-primary btn-sm referral-cta-btn"
              title={`Create your partner account under ${sponsorName}`}
            >
              <span>Join with {sponsorName ? sponsorName.split(' ')[0] : 'Sponsor'}</span>
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
            className="referral-progress-fill" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      </div>
    </aside>
  );
}
