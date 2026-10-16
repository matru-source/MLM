import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR } from '../../utils/formatters';
import CompensationPlanView from './CompensationPlanView';
import CheckoutModal from '../Modals/CheckoutModal';
import { 
  ShieldCheck, 
  Zap, 
  Lock, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle, 
  Award, 
  Sparkles,
  Users,
  QrCode,
  Globe
} from 'lucide-react';

export default function PublicLanding() {
  const { 
    activeReferralCode, 
    setActiveReferralCode, 
    getMemberByReferral,
    setActivePortal,
    setCurrentMemberId
  } = useMlm();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('product'); // 'product' | 'plan'

  const sponsor = getMemberByReferral(activeReferralCode);

  return (
    <div className="public-landing-container">
      {/* Referral Attribution Bar */}
      <div className="referral-attribution-bar">
        <div className="referral-bar-inner">
          <div className="referral-bar-left">
            <span className="badge badge-emerald">Referral Activated</span>
            <span>
              Shopping via Authorized Direct Seller: <strong>{sponsor ? sponsor.name : 'ZEX Corporate Direct'}</strong>
            </span>
            <span className="code-font sponsor-code-pill">({activeReferralCode})</span>
          </div>

          <div className="referral-bar-right">
            <span className="change-code-label">Change Code:</span>
            <input
              type="text"
              value={activeReferralCode}
              onChange={(e) => setActiveReferralCode(e.target.value.toUpperCase())}
              className="ref-input-mini code-font"
              placeholder="ZEX-XXXXXX"
            />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} className="text-emerald" />
            <span>Authorized ZEX Direct Selling Platform</span>
          </div>

          <h1 className="hero-heading">
            Enterprise Cyber Defense Suite. <br />
            <span className="gradient-text">Transparent Direct Sales Network.</span>
          </h1>

          <p className="hero-subheading">
            Access CyberShield Pro’s enterprise endpoint protection, real-time threat intelligence & monitoring, 
            and proprietary security defense tools. Backed by India’s most compliant direct sales rewards architecture.
          </p>

          <div className="hero-cta-group">
            <button
              id="btn-buy-subscription"
              onClick={() => setIsCheckoutOpen(true)}
              className="btn btn-primary btn-lg glow-btn"
            >
              <span>Get Annual Access — {formatINR(2500)}</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className="btn btn-secondary btn-lg"
            >
              <span>Explore 10-Level Plan</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="trust-grid">
            <div className="trust-item">
              <ShieldCheck size={18} className="text-emerald" />
              <span>7-Day Cooling-Off Guarantee</span>
            </div>
            <div className="trust-item">
              <Lock size={18} className="text-cyan" />
              <span>Authoritative ZEX Merchant Engine</span>
            </div>
            <div className="trust-item">
              <CheckCircle size={18} className="text-amber" />
              <span>Zero Recruitment Fee (Retail Sales Only)</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Card */}
        <div className="hero-card-wrap">
          <div className="product-showcase-card glass-panel">
            <div className="showcase-header">
              <div>
                <span className="badge badge-cyan">Flagship Retail License</span>
                <h3 className="showcase-title">CyberShield Pro Enterprise Defense</h3>
              </div>
              <div className="showcase-price-tag">
                <span className="amount">{formatINR(2500)}</span>
                <span className="period">/ 365 days</span>
              </div>
            </div>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon-box">
                  <ShieldCheck size={16} className="text-emerald" />
                </div>
                <div>
                  <div className="feature-title">AI Threat Intelligence Engine</div>
                  <div className="feature-desc">24/7 automated threat detection & endpoint vulnerability shield</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <Zap size={16} className="text-cyan" />
                </div>
                <div>
                  <div className="feature-title">Direct Webhook API & WebSockets</div>
                  <div className="feature-desc">Instant sub-millisecond automated order dispatch</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <Users size={16} className="text-indigo" />
                </div>
                <div>
                  <div className="feature-title">Optional Seller Affiliate Rights</div>
                  <div className="feature-desc">Earn up to ₹1,000 direct commission upon verified KYC</div>
                </div>
              </div>
            </div>

            <div className="showcase-footer">
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="btn btn-primary full-width"
              >
                <span>Subscribe via {sponsor?.name || 'Authorized Seller'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs: Product Overview vs Compensation Architecture */}
      <section className="landing-tabs-section">
        <div className="section-tabs-bar">
          <button
            onClick={() => setActiveTab('product')}
            className={`section-tab-btn ${activeTab === 'product' ? 'active' : ''}`}
          >
            Software Capabilities & Features
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`section-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
          >
            Direct Selling Compensation Plan (₹1,600 / 10 Tiers)
          </button>
        </div>

        {activeTab === 'product' ? (
          <div className="product-details-grid">
            <div className="detail-card glass-panel">
              <div className="detail-icon bg-emerald-dim">
                <ShieldCheck size={24} className="text-emerald" />
              </div>
              <h3 className="detail-title">Cyber Threat Defense Engine</h3>
              <p className="detail-desc">
                Deploy enterprise endpoint security with real-time zero-day intrusion detection, automated firewall protection, and vulnerability scanning.
              </p>
            </div>

            <div className="detail-card glass-panel">
              <div className="detail-icon bg-cyan-dim">
                <Lock size={24} className="text-cyan" />
              </div>
              <h3 className="detail-title">Independent Authoritative Core</h3>
              <p className="detail-desc">
                ZEX operates as the authoritative Merchant of Record, issuing GST tax invoices, managing renewals, and securing user credentials.
              </p>
            </div>

            <div className="detail-card glass-panel">
              <div className="detail-icon bg-indigo-dim">
                <Globe size={24} className="text-indigo" />
              </div>
              <h3 className="detail-title">Direct Selling Compliance</h3>
              <p className="detail-desc">
                Built strictly around consumer protection standards. Customers can subscribe without ever joining the network as a seller.
              </p>
            </div>
          </div>
        ) : (
          <CompensationPlanView />
        )}
      </section>

      {/* Statutory Income Disclaimer (Mandatory Regulatory Requirement) */}
      <section className="statutory-disclaimer-box">
        <div className="disclaimer-header">
          <ShieldCheck size={18} className="text-amber" />
          <h4>Mandatory Regulatory Disclosure & Income Disclaimer</h4>
        </div>
        <p>
          In accordance with the <strong>Consumer Protection (Direct Selling) Rules, 2021</strong> issued by the Ministry of Consumer Affairs, Government of India: 
          ZEX and its authorized sales agency do NOT guarantee any income, earnings, or profits. 
          Earnings are solely dependent on individual skill, effort, and actual retail software subscriptions sold to genuine end-users. 
          Participation as a Direct Seller is entirely voluntary with <strong>zero mandatory joining fees</strong> or compulsory inventory loading. 
          All subscribers are entitled to an unconditional <strong>7-Day Cooling-Off refund policy</strong>.
        </p>
      </section>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        initialReferralCode={activeReferralCode}
      />
    </div>
  );
}
