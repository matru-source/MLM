import React from 'react';
import { MlmProvider, useMlm } from './context/MlmContext';
import Navbar from './components/Navbar';
import PublicHome from './components/PublicHome';
import MemberDashboardView from './components/MemberDashboardView';
import PendingActivationView from './components/PendingActivationView';
import AdminPortalView from './components/AdminPortalView';
import AdminLoginModal from './components/AdminLoginModal';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import ReferralBanner from './components/ReferralBanner';
import Toast from './components/Toast';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';
import './App.css';

function MainApp() {
  const { 
    isAdminMode, 
    isAdminAuthenticated,
    navigateToAdmin, 
    currentPage, 
    setCurrentPage,
    currentMember,
    isLoggedIn
  } = useMlm();

  // If URL is /admin or #admin, require executive authentication before unlocking Admin Portal
  if (isAdminMode) {
    if (!isAdminAuthenticated) {
      return (
        <>
          <AdminLoginModal />
          <Toast />
        </>
      );
    }
    return (
      <>
        <AdminPortalView />
        <Toast />
      </>
    );
  }

  // Normal User Web Experience
  const isDashboardView = ['dashboard', 'network', 'wallet', 'subscriptions', 'kyc', 'profile'].includes(currentPage);

  // If not authenticated, ensure visitor stays on Public Home
  if (isDashboardView && (!isLoggedIn || !currentMember)) {
    return (
      <div className="site-wrapper">
        <Navbar />
        <main className="site-content-wrapper">
          <PublicHome />
        </main>
        <CheckoutModal />
        <AuthModal />
        <ReferralBanner />
        <Toast />
      </div>
    );
  }

  // If on Member Dashboard: Check if member is approved & active
  if (isDashboardView) {
    const isMemberActive = currentMember?.seller_status === 'active';

    // If pending admin approval or unpaid: Keep profile and referral locked, show PendingActivationView
    if (!isMemberActive) {
      return (
        <div className="site-wrapper dashboard-mode">
          <PendingActivationView />
          <CheckoutModal />
          <AuthModal />
          <ReferralBanner />
          <Toast />
        </div>
      );
    }

    return (
      <div className="site-wrapper dashboard-mode">
        <MemberDashboardView />
        <CheckoutModal />
        <AuthModal />
        <ReferralBanner />
        <Toast />
      </div>
    );
  }

  return (
    <div className="site-wrapper">
      <Navbar />

      <main className="site-content-wrapper">
        <PublicHome />
      </main>

      {/* Clean Footer with Discrete Admin Portal Link */}
      {!isDashboardView && (
        <footer className="site-footer">
          <div className="footer-container">
            <div className="footer-top-row">
              <div className="footer-brand">
                <div className="footer-logo">
                  <span className="footer-logo-z">🛡️</span>
                  <span className="footer-logo-title">CyberShield Network</span>
                </div>
                <p className="footer-desc">
                  Empowering authorized partners with enterprise cyber defense software tools, verified cloud security licenses, and transparent referral rewards.
                </p>
              </div>

              <div className="footer-col-links">
                <h4 className="footer-title">Platform</h4>
                <button onClick={() => setCurrentPage('home')} className="footer-link-btn">Home</button>
                <a href="#plans-section" className="footer-link-btn">Joining Plan (₹2,500)</a>
                <a href="#compensation-section" className="footer-link-btn">Commission Plan</a>
                <a href="#faq-section" className="footer-link-btn">FAQ</a>
              </div>

              <div className="footer-col-links">
                <h4 className="footer-title">Statutory Compliance</h4>
                <span>Consumer Protection Act, 2019</span>
                <span>Direct Selling Rules, 2021</span>
                <span>7-Day Cooling-off Guarantee</span>
                <span>Section 194H Tax Compliant</span>
              </div>

              <div className="footer-col-links">
                <h4 className="footer-title">Support & Portals</h4>
                <span>support@cybershield.network</span>
                <span>+91 80 4900 1234</span>
                <span className="text-muted font-xs">Authorized Enterprise Network</span>
              </div>
            </div>

            <div className="footer-bottom-row">
              <span>© 2026 CyberShield Network. All rights reserved.</span>
              <div className="footer-security-pills">
                <span className="badge badge-green">✓ Verified Enterprise Security Engine</span>
                <span className="badge badge-blue">100% Compliant Direct Selling</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Modals & Overlays */}
      <CheckoutModal />
      <AuthModal />
      <ReferralBanner />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <MlmProvider>
      <MainApp />
    </MlmProvider>
  );
}
