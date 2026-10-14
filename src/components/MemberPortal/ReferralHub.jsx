import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function ReferralHub({ member }) {
  const { addToast } = useMlm();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const referralUrl = `${window.location.origin}/?ref=${member.referral_code}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      addToast('success', 'Referral Link Copied', 'Share this link with potential retail subscribers.');
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      addToast('success', 'Referral Code Copied', 'Your referral code has been copied.');
    }
  };

  return (
    <div className="referral-hub-container">
      <div className="hub-grid">
        {/* Referral Link & Code Box */}
        <div className="hub-main-card glass-panel">
          <div className="card-badge-row">
            <span className="badge badge-emerald">Active Seller Affiliate Link</span>
            <span className="badge badge-neutral">Direct Selling Rules 2021</span>
          </div>

          <h3 className="hub-title">Your Unique Sales Referral Hub</h3>
          <p className="hub-desc">
            Share this link to earn direct ₹1,000 retail sales commission on every annual ZEX Pro subscription. 
            All sales are verified and billed directly through ZEX Authoritative Merchant Gateways.
          </p>

          {/* Referral Code Box */}
          <div className="code-display-wrap">
            <div className="code-label">Your Referral Code</div>
            <div className="code-field-group">
              <span className="code-large code-font">{member.referral_code}</span>
              <button
                onClick={() => copyToClipboard(member.referral_code, 'code')}
                className="btn btn-secondary btn-sm"
              >
                {copiedCode ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Full Link Copy Box */}
          <div className="link-input-group">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="form-input code-font ref-url-input"
            />
            <button
              onClick={() => copyToClipboard(referralUrl, 'link')}
              className="btn btn-primary"
            >
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Full URL'}</span>
            </button>
          </div>

          {/* Marketing Compliance Notice */}
          <div className="marketing-compliance-box">
            <ShieldCheck size={18} className="text-amber" />
            <div className="marketing-compliance-text">
              <strong>Approved Marketing Guidelines:</strong> You must always present ZEX as genuine 
              algorithmic trading software. Guaranteed returns or income promises are strictly prohibited under Indian law.
            </div>
          </div>
        </div>

        {/* Dynamic QR Code Card */}
        <div className="hub-qr-card glass-panel">
          <div className="qr-card-header">
            <QrCode size={18} className="text-cyan" />
            <h4>Instant Scan QR Code</h4>
          </div>

          <div className="qr-card-canvas">
            {/* High visual fidelity QR representation */}
            <div className="qr-visual-box">
              <svg viewBox="0 0 100 100" className="qr-svg" width="160" height="160">
                <rect width="100" height="100" fill="#FFFFFF" rx="8" />
                {/* QR corner 1 */}
                <rect x="10" y="10" width="24" height="24" fill="#0A0F1D" rx="4" />
                <rect x="14" y="14" width="16" height="16" fill="#FFFFFF" rx="2" />
                <rect x="18" y="18" width="8" height="8" fill="#10B981" />
                {/* QR corner 2 */}
                <rect x="66" y="10" width="24" height="24" fill="#0A0F1D" rx="4" />
                <rect x="70" y="14" width="16" height="16" fill="#FFFFFF" rx="2" />
                <rect x="74" y="18" width="8" height="8" fill="#10B981" />
                {/* QR corner 3 */}
                <rect x="10" y="66" width="24" height="24" fill="#0A0F1D" rx="4" />
                <rect x="14" y="70" width="16" height="16" fill="#FFFFFF" rx="2" />
                <rect x="18" y="74" width="8" height="8" fill="#10B981" />
                {/* QR data matrix bits */}
                <rect x="42" y="14" width="6" height="6" fill="#0A0F1D" />
                <rect x="52" y="22" width="6" height="6" fill="#0A0F1D" />
                <rect x="42" y="32" width="6" height="6" fill="#06B6D4" />
                <rect x="52" y="42" width="6" height="6" fill="#0A0F1D" />
                <rect x="22" y="44" width="6" height="6" fill="#0A0F1D" />
                <rect x="32" y="52" width="6" height="6" fill="#0A0F1D" />
                <rect x="42" y="64" width="6" height="6" fill="#0A0F1D" />
                <rect x="52" y="74" width="6" height="6" fill="#10B981" />
                <rect x="64" y="42" width="6" height="6" fill="#0A0F1D" />
                <rect x="74" y="52" width="6" height="6" fill="#0A0F1D" />
                <rect x="64" y="64" width="6" height="6" fill="#0A0F1D" />
                <rect x="74" y="74" width="6" height="6" fill="#06B6D4" />
                <rect x="84" y="44" width="6" height="6" fill="#0A0F1D" />
              </svg>
            </div>
            <div className="qr-seller-label code-font">{member.referral_code}</div>
          </div>

          <div className="qr-card-footer">
            <span className="qr-footer-hint">Customers can scan to checkout immediately</span>
          </div>
        </div>
      </div>
    </div>
  );
}
