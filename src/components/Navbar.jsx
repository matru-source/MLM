import React from 'react';
import { useMlm } from '../context/MlmContext';
import { LayoutDashboard, LogIn, UserPlus, Shield } from 'lucide-react';

export default function Navbar() {
  const { 
    currentPage, 
    setCurrentPage, 
    isLoggedIn, 
    setIsAuthModalOpen, 
    setAuthMode,
    currentMember
  } = useMlm();

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Logo */}
        <div 
          className="brand-logo" 
          onClick={() => setCurrentPage('home')} 
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-logo-icon">
            <Shield size={20} className="shield-brand-svg" />
          </div>
          <div className="brand-logo-text">
            <span className="brand-title">CyberShield</span>
            <span className="brand-subtitle">Security Network</span>
          </div>
        </div>

        {/* Public Nav Menu */}
        <nav className="header-nav">
          <button 
            onClick={() => setCurrentPage('home')} 
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
          >
            Home
          </button>
          <button 
            onClick={() => {
              setCurrentPage('home');
              const el = document.getElementById('plans-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} 
            className="nav-link"
          >
            Joining Plan (₹2,500)
          </button>
          <button 
            onClick={() => {
              setCurrentPage('home');
              const el = document.getElementById('compensation-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} 
            className="nav-link"
          >
            Compensation
          </button>
          <button 
            onClick={() => {
              setCurrentPage('home');
              const el = document.getElementById('faq-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} 
            className="nav-link"
          >
            FAQ
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="header-actions">
          {isLoggedIn ? (
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
              >
                <img 
                  src={currentMember?.avatar || '/matru-avatar.jpg'} 
                  alt="Avatar" 
                  className="user-avatar-mini"
                />
                <div className="user-mini-info">
                  <span className="user-mini-name">{currentMember?.name?.split(' ')[0] || 'Matru'}</span>
                  <span className="user-mini-rank">{currentMember?.rank || 'Silver Member'}</span>
                </div>
              </div>
            </div>
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
      </div>
    </header>
  );
}
