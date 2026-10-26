import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { LayoutDashboard, LogIn, UserPlus, Shield, LogOut, Clock, Menu, X, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const { 
    currentPage, 
    setCurrentPage, 
    isLoggedIn, 
    setIsAuthModalOpen, 
    setAuthMode,
    currentMember,
    logout
  } = useMlm();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (pageId, sectionId) => {
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Brand Logo */}
        <div 
          className="brand-logo" 
          onClick={() => handleNavClick('home')} 
          style={{ cursor: 'pointer' }}
        >
          <img src="/logo.png?v=2" alt="CyberNetworking Logo" className="brand-logo-img" />
          <div className="brand-logo-text">
            <span className="brand-title">CyberNetworking</span>
          </div>
        </div>

        {/* Desktop Public Nav Menu */}
        <nav className="header-nav desktop-only-nav">
          <button 
            onClick={() => handleNavClick('home')} 
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
          >
            Home
          </button>
          <button 
            onClick={() => handleNavClick('home', 'plans-section')} 
            className="nav-link"
          >
            Joining Plan (₹2,500)
          </button>
          <button 
            onClick={() => handleNavClick('home', 'compensation-section')} 
            className="nav-link"
          >
            Compensation
          </button>
          <button 
            onClick={() => handleNavClick('home', 'faq-section')} 
            className="nav-link"
          >
            FAQ
          </button>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="header-actions desktop-only-actions">
          {isLoggedIn ? (
            currentMember?.seller_status === 'active' ? (
              <div className="user-logged-group">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`btn btn-primary btn-sm ${currentPage === 'dashboard' ? 'active-dash' : ''}`}
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </button>

                <div 
                  className="user-pill-mini"
                  onClick={() => setCurrentPage('profile')}
                  style={{ cursor: 'pointer' }}
                  title="View Partner Profile & KYC"
                >
                  <img 
                    src={currentMember?.avatar || '/matru-avatar.jpg'} 
                    alt="Avatar" 
                    className="user-avatar-mini"
                  />
                  <div className="user-mini-info">
                    <span className="user-mini-name">{currentMember?.name?.split(' ')[0] || 'Partner'}</span>
                    <span className="user-mini-rank">{currentMember?.rank || 'Partner'}</span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="btn btn-secondary btn-sm sign-out-btn"
                  title="Sign Out to Visitor Mode"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="user-logged-group">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="btn btn-outline-warning btn-sm flex-center gap-1"
                  title="Awaiting Admin Approval"
                >
                  <Clock size={14} className="text-amber" />
                  <span>Activation Pending</span>
                </button>

                <button
                  onClick={logout}
                  className="btn btn-secondary btn-sm sign-out-btn"
                  title="Sign Out to Visitor Mode"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )
          ) : (
            <div className="auth-buttons-group">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="btn btn-secondary btn-sm"
              >
                <LogIn size={15} />
                <span>Login</span>
              </button>

              <button
                onClick={() => {
                  setAuthMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <UserPlus size={15} />
                <span>Join Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="mobile-header-controls">
          {isLoggedIn && (
            <div 
              className="user-avatar-touch-btn"
              onClick={() => setCurrentPage('profile')}
              title="Profile"
            >
              <img 
                src={currentMember?.avatar || '/matru-avatar.jpg'} 
                alt="Avatar" 
                className="user-avatar-mini"
              />
            </div>
          )}

          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer / Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-drawer-content">
            <div className="mobile-drawer-links">
              <button 
                onClick={() => handleNavClick('home')}
                className={`mobile-nav-item ${currentPage === 'home' ? 'active' : ''}`}
              >
                Home
              </button>
              <button 
                onClick={() => handleNavClick('home', 'plans-section')}
                className="mobile-nav-item"
              >
                Joining Plan (₹2,500)
              </button>
              <button 
                onClick={() => handleNavClick('home', 'compensation-section')}
                className="mobile-nav-item"
              >
                Compensation Plan
              </button>
              <button 
                onClick={() => handleNavClick('home', 'faq-section')}
                className="mobile-nav-item"
              >
                FAQ & Support
              </button>
            </div>

            <div className="mobile-drawer-actions">
              {isLoggedIn ? (
                currentMember?.seller_status === 'active' ? (
                  <>
                    <div className="mobile-user-profile-card" onClick={() => handleNavClick('profile')}>
                      <img 
                        src={currentMember?.avatar || '/matru-avatar.jpg'} 
                        alt="Avatar" 
                        className="user-avatar-mini"
                      />
                      <div>
                        <div className="font-bold text-sm">{currentMember?.name}</div>
                        <div className="text-muted font-xs">{currentMember?.rank} • {currentMember?.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavClick('dashboard')}
                      className="btn btn-primary full-width"
                    >
                      <LayoutDashboard size={16} />
                      <span>Open Partner Dashboard</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="btn btn-secondary full-width text-rose"
                    >
                      <LogOut size={16} />
                      <span>Sign Out (Visitor Mode)</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mobile-user-pending-card">
                      <Clock size={20} className="text-amber" />
                      <div>
                        <div className="font-bold text-sm text-white">Activation In Progress</div>
                        <div className="text-amber font-xs">Profile & Referral locked awaiting Admin approval</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavClick('dashboard')}
                      className="btn btn-outline-warning full-width"
                    >
                      <Clock size={16} />
                      <span>View Activation Status</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="btn btn-secondary full-width text-rose"
                    >
                      <LogOut size={16} />
                      <span>Sign Out (Visitor Mode)</span>
                    </button>
                  </>
                )
              ) : (
                <div className="mobile-auth-grid">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setIsAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="btn btn-secondary full-width"
                  >
                    <LogIn size={16} />
                    <span>Login</span>
                  </button>

                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setIsAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="btn btn-primary full-width"
                  >
                    <UserPlus size={16} />
                    <span>Join Now (₹2,500)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
