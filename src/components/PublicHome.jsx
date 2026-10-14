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
  const { openCheckout, setIsAuthModalOpen, setAuthMode, commissionRules } = useMlm();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

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
            Institutional AI Cyber Coach Software, Active Licenses and Direct Sales Income Opportunity through a transparent 6-level referral program.
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
              <span>Flexible Subscription</span>
            </div>
            <div className="pill-item">
              <ShieldCheck size={15} className="text-primary-blue" />
              <span>Verified CyberShield Engine</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hero-cta-row">
            <button
              onClick={() => {
                setAuthMode('register');
                setIsAuthModalOpen(true);
              }}
              className="btn btn-primary btn-lg"
            >
              <span>Join Now</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => openCheckout('Pro')}
              className="btn btn-outline-blue btn-lg"
            >
              <Play size={16} fill="currentColor" />
              <span>Watch Video</span>
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
              <div className="float-icon-box bg-blue-dim">
                <ShieldCheck size={20} className="text-primary-blue" />
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

      {/* 2. PRODUCTS / MEMBERSHIP PLANS (Matching Screen 2) */}
      <section id="plans-section" className="plans-section-coach">
        <div className="section-head-center">
          <h2 className="section-title-large">Choose Your Subscription Plan</h2>
          <p className="section-subtitle">
            Access institutional AI Cyber Coach software tools and community. Earn commissions on every qualifying subscription sale in your network.
          </p>

          {/* Billing Toggle */}
          <div className="billing-toggle-container">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`toggle-option ${billingCycle === 'yearly' ? 'active' : ''}`}
            >
              Yearly <span className="discount-pill">Save 20%</span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="pricing-cards-grid">
          {/* Card 1: Starter */}
          <div className="plan-card card-white">
            <div className="plan-header">
              <h3 className="plan-title">Starter</h3>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="price-num">{billingCycle === 'monthly' ? '499' : '4,790'}</span>
                <span className="cycle">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </div>
            </div>

            <ul className="plan-features-list">
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Core AI Cyber trading tools</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Community access</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Email support</li>
            </ul>

            <button
              onClick={() => openCheckout('Starter')}
              className="btn btn-secondary full-width"
            >
              Get Started
            </button>
          </div>

          {/* Card 2: Pro (Most Popular) */}
          <div className="plan-card card-white plan-card-popular">
            <div className="popular-ribbon">Most Popular</div>
            <div className="plan-header">
              <h3 className="plan-title text-primary-blue">Pro</h3>
              <div className="plan-price">
                <span className="currency text-primary-blue">₹</span>
                <span className="price-num text-primary-blue">{billingCycle === 'monthly' ? '999' : '2,500'}</span>
                <span className="cycle">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </div>
            </div>

            <ul className="plan-features-list">
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Full institutional software suite</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Verified Software License</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Priority technical support</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> <strong>Direct Selling commissions (6–10 levels)</strong></li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Automated AI risk analysis tools</li>
            </ul>

            <button
              onClick={() => openCheckout('Pro')}
              className="btn btn-primary full-width"
            >
              Get Started
            </button>
          </div>

          {/* Card 3: Premium */}
          <div className="plan-card card-white">
            <div className="plan-header">
              <h3 className="plan-title">Premium</h3>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="price-num">{billingCycle === 'monthly' ? '1,999' : '18,990'}</span>
                <span className="cycle">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </div>
            </div>

            <ul className="plan-features-list">
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Everything in Pro</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> 1:1 strategy & setup onboarding</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Advanced algorithmic execution tools</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Direct API integration access</li>
              <li><CheckCircle2 size={16} className="text-primary-blue" /> Higher sales volume incentives</li>
            </ul>

            <button
              onClick={() => openCheckout('Premium')}
              className="btn btn-secondary full-width"
            >
              Get Started
            </button>
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
            <h4 className="faq-question">What is the 7-day cooling-off guarantee?</h4>
            <p className="faq-answer">
              Every subscriber has an unconditional 7-day refund right. If you are not satisfied, you can request a 100% refund without questions asked.
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
