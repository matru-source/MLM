import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  Globe, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Play, 
  Users, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function PublicHome() {
  const { openCheckout, setIsAuthModalOpen, setAuthMode, commissionRules, isLoggedIn, currentMember } = useMlm();

  const handleJoinClick = () => {
    if (isLoggedIn && currentMember) {
      openCheckout('Joining');
    } else {
      setAuthMode('register');
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="public-home-wrapper">
      {/* 1. HERO SECTION (Matching Screen 1) */}
      <section className="hero-section-coach">
        <div className="hero-coach-left">
          <div className="hero-coach-pill">
            <Sparkles size={14} className="text-blue" />
            <span>AI Powered Software & Direct Sales Platform</span>
          </div>

          <h1 className="hero-coach-title">
            Automate. Grow. <span className="text-primary-blue">Earn</span> <br />
            with CyberShield Security Network
          </h1>

          <p className="hero-coach-subtitle">
            Institutional AI Cyber Coach Software, Active Licenses and Direct Sales Income Opportunity through a transparent 10-level referral program.
          </p>

          {/* Feature Pills */}
          <div className="hero-feature-pills">
            <div className="pill-item">
              <Globe size={15} className="text-primary-blue" />
              <span>Cloud Software Access</span>
            </div>
            <div className="pill-item">
              <TrendingUp size={15} className="text-primary-blue" />
              <span>Multiple Income Levels</span>
            </div>
            <div className="pill-item">
              <Zap size={15} className="text-primary-blue" />
              <span>Single ₹2,500 Joining</span>
            </div>
            <div className="pill-item">
              <ShieldCheck size={15} className="text-primary-blue" />
              <span>Verified CyberShield Engine</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hero-cta-row">
            <button
              onClick={handleJoinClick}
              className="btn btn-primary btn-lg"
            >
              <span>Join Now (₹2,500)</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('plans-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-outline-blue btn-lg"
            >
              <Play size={16} fill="currentColor" />
              <span>View Joining Plan</span>
            </button>
          </div>

          {/* 10K+ Active Members Callout */}
          <div className="members-stack-card">
            <div className="avatar-group">
              <img src="/matru-avatar.jpg" alt="Member" className="avatar-stack-item" />
              <div className="avatar-stack-item avatar-placeholder bg-blue">AK</div>
              <div className="avatar-stack-item avatar-placeholder bg-emerald">RS</div>
              <div className="avatar-stack-item avatar-placeholder bg-purple">PP</div>
            </div>
            <div>
              <div className="members-count">10K+</div>
              <div className="members-sub">Active Members Worldwide</div>
            </div>
          </div>
        </div>

        {/* Hero Visual on Right (Matching Screen 1) */}
        <div className="hero-coach-right">
          <div className="hero-image-frame">
            <img 
              src="/hero-student.png" 
              alt="CyberShield Security Partner" 
              className="hero-main-photo"
            />

            {/* Floating Badge 1: Software License */}
            <div className="floating-card float-top-right">
              <div className="float-icon-box" style={{ background: 'transparent', padding: 0 }}>
                <img src="/logo.png?v=2" alt="CyberShield Software" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)' }} />
              </div>
              <div>
                <div className="float-title">CyberShield Software</div>
                <div className="float-sub">Institutional License</div>
              </div>
            </div>

            {/* Floating Badge 2: Earn Commissions */}
            <div className="floating-card float-bottom-left">
              <div className="float-icon-box bg-green-dim">
                <TrendingUp size={20} className="text-success" />
              </div>
              <div>
                <div className="float-title">Earn Commissions</div>
                <div className="float-sub">Up to ₹1,600 / sale</div>
              </div>
            </div>

            {/* Floating Badge 3: Global Community */}
            <div className="floating-card float-bottom-right">
              <div className="float-icon-box bg-purple-dim">
                <Users size={20} className="text-purple" />
              </div>
              <div>
                <div className="float-title">Global Community</div>
                <div className="float-sub">50+ Countries</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OFFICIAL JOINING PLAN (Single Pricing: ₹2,500/- for Joining) */}
      <section id="plans-section" className="plans-section-coach">
        <div className="section-head-center">
          <div className="single-plan-pill">
            <Sparkles size={14} className="text-primary-blue" />
            <span>Single Transparent Pricing • Direct Joining</span>
          </div>
          <h2 className="section-title-large">Official Joining & Partner Membership</h2>
          <p className="section-subtitle">
            Only one standard pricing for joining. Get authorized access to the CyberShield enterprise cyber defense suite and start earning multi-tier direct selling commissions.
          </p>
        </div>

        {/* Single Centered Joining Plan Card */}
        <div className="single-plan-wrapper">
          <div className="plan-card card-white single-joining-card">
            <div className="popular-ribbon">Only One Pricing • ₹2,500 For Joining</div>

            <div className="single-plan-header">
              <div className="single-plan-header-flex">
                <div className="single-plan-info">
                  <div className="plan-badge-tag">
                    <ShieldCheck size={16} className="text-primary-blue" />
                    <span>Authorized Partner License</span>
                  </div>
                  <h3 className="single-plan-title">CyberShield Partner Membership</h3>
                  <p className="single-plan-sub">
                    Complete institutional endpoint protection software suite and authorized direct selling distribution rights.
                  </p>
                </div>

                <div className="single-price-box">
                  <div className="single-price-display">
                    <span className="single-currency">₹</span>
                    <span className="single-amount">2,500</span>
                    <span className="single-term">/- For Joining</span>
                  </div>
                  <div className="single-price-subnote">
                    +18% Statutory GST (₹450) • Total ₹2,950
                  </div>
                </div>
              </div>
            </div>

            {/* Inclusions Split in 2 Distinct Columns */}
            <div className="single-plan-grid">
              <div className="plan-column-box">
                <h4 className="plan-column-heading">
                  <ShieldCheck size={18} className="text-primary-blue" />
                  <span>Enterprise Cyber Defense Software</span>
                </h4>
                <ul className="single-features-list">
                  <li>
                    <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    <span>Full CyberShield Cloud Endpoint Protection & AI Scanner</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    <span>Verified Software License Key & Continuous Updates</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    <span>Real-time Anti-Phishing & Network Defense Tools</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    <span>24/7 Priority Support & Technical Helpdesk</span>
                  </li>
                </ul>
              </div>

              <div className="plan-column-box">
                <h4 className="plan-column-heading">
                  <TrendingUp size={18} className="text-success" />
                  <span>Authorized Partner & Sales Program</span>
                </h4>
                <ul className="single-features-list">
                  <li>
                    <CheckCircle2 size={16} className="text-primary-blue flex-shrink-0" />
                    <span><strong>Authorized Direct Seller Status:</strong> Instant referral link</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className="text-primary-blue flex-shrink-0" />
                    <span><strong>10-Level Network Commissions:</strong> ₹1,000 Direct (Level 1) + override bonuses</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className="text-primary-blue flex-shrink-0" />
                    <span><strong>Partner Dashboard:</strong> Real-time genealogy tree & calculation matrix</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className="text-primary-blue flex-shrink-0" />
                    <span><strong>Manual Bank Disbursal:</strong> Admin-verified IMPS payouts with 5% TDS compliance</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Actions & Statutory Reassurance */}
            <div className="single-plan-bottom">
              <div className="single-guarantee-badges">
                <div className="guarantee-badge">
                  <CheckCircle2 size={15} className="text-success" />
                  <span>30-Day Cooling-off Period (100% Refund Guarantee)</span>
                </div>
                <div className="guarantee-badge">
                  <CheckCircle2 size={15} className="text-primary-blue" />
                  <span>Consumer Protection (Direct Selling) Rules, 2021 Compliant</span>
                </div>
                <div className="guarantee-badge">
                  <CheckCircle2 size={15} className="text-purple" />
                  <span>Zero Hidden Charges • One-Time ₹2,500 Joining Fee</span>
                </div>
              </div>

              <button
                onClick={handleJoinClick}
                className="btn btn-primary btn-lg single-join-cta-btn"
              >
                <span>Join Now for ₹2,500</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPENSATION PLAN (Matching Screen 5) */}
      <section id="compensation-section" className="comp-section-coach">
        <div className="section-head-center">
          <h2 className="section-title-large">Commission Plan</h2>
          <p className="section-subtitle">
            Earn fair and legal commissions on every qualifying purchase in your downline network.
          </p>
        </div>

        <div className="comp-layout-grid">
          {/* Left: Clean Payout Table */}
          <div className="comp-table-card card-white">
            <table className="coach-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Relationship</th>
                  <th className="text-right">Commission (₹)</th>
                </tr>
              </thead>
              <tbody>
                {commissionRules.slice(0, 10).map((r) => (
                  <tr key={r.level} className={r.level === 1 ? 'row-highlight' : ''}>
                    <td className="level-name font-semibold">Level {r.level}</td>
                    <td className="relation-name">{r.name}</td>
                    <td className="amount-cell text-right font-bold text-primary-blue">
                      ₹{r.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan="2" className="font-bold">Total Network Payout</td>
                  <td className="text-right font-bold text-primary-blue text-large">₹1,600</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right: 4 Compliance Callout Cards (Matching Screen 5) */}
          <div className="comp-callouts-list">
            <div className="callout-card callout-green">
              <div className="callout-icon-box">
                <CheckCircle2 size={20} className="text-success" />
              </div>
              <div className="callout-text">
                <div className="callout-title">Paid only on completed retail sales</div>
                <div className="callout-sub">Zero money circulation. Earnings strictly from genuine software purchases.</div>
              </div>
            </div>

            <div className="callout-card callout-blue">
              <div className="callout-icon-box">
                <ShieldCheck size={20} className="text-primary-blue" />
              </div>
              <div className="callout-text">
                <div className="callout-title">Commission after CyberShield activation and cooling-off period</div>
                <div className="callout-sub">Guarantees complete legal protection and consumer cooling-off rights.</div>
              </div>
            </div>

            <div className="callout-card callout-amber">
              <div className="callout-icon-box">
                <Zap size={20} className="text-amber" />
              </div>
              <div className="callout-text">
                <div className="callout-title">Refunds reverse commission</div>
                <div className="callout-sub">If a buyer requests a refund, corresponding upline credits are cleanly reversed.</div>
              </div>
            </div>

            <div className="callout-card callout-purple">
              <div className="callout-icon-box">
                <Award size={20} className="text-purple" />
              </div>
              <div className="callout-text">
                <div className="callout-title">Missing levels go to company reserve</div>
                <div className="callout-sub">If an upline tier is missing or unverified, funds safely stay in reserve.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAQ SECTION */}
      <section id="faq-section" className="faq-section-coach">
        <div className="section-head-center">
          <h2 className="section-title-large">Frequently Asked Questions</h2>
          <p className="section-subtitle">Common questions about software subscriptions, payments, and commission payouts.</p>
        </div>

        <div className="faq-grid-coach">
          <div className="faq-card card-white">
            <h4 className="faq-question">How do I start earning commissions?</h4>
            <p className="faq-answer">
              Sign up as an Authorized Partner, complete your simple KYC documents (PAN & Bank Account), and share your personal partner referral link. Whenever someone purchases a plan through your link, you get rewarded instantly.
            </p>
          </div>

          <div className="faq-card card-white">
            <h4 className="faq-question">How does payout withdrawal work?</h4>
            <p className="faq-answer">
              Once your available balance reaches ₹500, click "Withdraw" in your wallet. The request reaches our Finance Admin, who verifies your bank account, disburses the payout manually, and attaches a bank transfer screenshot.
            </p>
          </div>

          <div className="faq-card card-white">
            <h4 className="faq-question">What is the 30-day cooling-off guarantee?</h4>
            <p className="faq-answer">
              Every subscriber has a statutory 30-day refund window under Direct Selling Rules, 2021. If you are not satisfied, you can request a 100% refund without questions asked.
            </p>
          </div>

          <div className="faq-card card-white">
            <h4 className="faq-question">Can I use this purely as a software customer?</h4>
            <p className="faq-answer">
              Yes, absolutely! You can choose the "Customer" option and enjoy all CyberShield Security Network software tools without participating in the partner network.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
