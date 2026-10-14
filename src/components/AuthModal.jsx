import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { X, ShieldCheck, ArrowRight } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode, registerUser, setIsLoggedIn } = useMlm();
  
  const [isSeller, setIsSeller] = useState(true); // Customer vs Customer + Seller toggle
  const [fullName, setFullName] = useState('Matru Prasad Panda');
  const [email, setEmail] = useState('matru@gmail.com');
  const [mobile, setMobile] = useState('+91 9876543210');
  const [password, setPassword] = useState('••••••••••••');
  const [sponsorId, setSponsorId] = useState('ZEX123456');
  const [agreed, setAgreed] = useState(true);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (authMode === 'register') {
      registerUser({
        fullName,
        email,
        mobile,
        password,
        sponsorId,
        isSeller
      });
    } else {
      setIsLoggedIn(true);
      setIsAuthModalOpen(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box auth-modal-width">
        {/* Header */}
        <div className="auth-modal-header">
          <div className="brand-logo-text-small mb-2">
            <span className="brand-title">CyberShield</span>
            <span className="brand-subtitle">Security Network</span>
          </div>

          <h3 className="auth-title">
            {authMode === 'register' ? 'Create Your Account' : 'Welcome Back'}
          </h3>
          <p className="auth-subtitle">
            {authMode === 'register' 
              ? 'Join as a customer or become a seller and earn.'
              : 'Log in to access your dashboard, software subscriptions and earnings.'}
          </p>

          <button onClick={() => setIsAuthModalOpen(false)} className="close-checkout-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-body">
          {authMode === 'register' ? (
            <>
              {/* Customer vs Customer + Seller Toggle (Matching Screen 3) */}
              <div className="customer-seller-toggle">
                <button
                  type="button"
                  onClick={() => setIsSeller(false)}
                  className={`toggle-role-btn ${!isSeller ? 'active' : ''}`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsSeller(true)}
                  className={`toggle-role-btn ${isSeller ? 'active' : ''}`}
                >
                  Customer + Seller
                </button>
              </div>

              {/* Input Fields */}
              <div className="form-group-clean">
                <label className="form-label-clean">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="form-input-clean"
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="form-input-clean"
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className="form-input-clean"
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Create Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="form-input-clean"
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Sponsor ID (Optional)</label>
                <input
                  type="text"
                  value={sponsorId}
                  onChange={(e) => setSponsorId(e.target.value.toUpperCase())}
                  placeholder="ZEX123456"
                  className="form-input-clean code-font text-primary-blue"
                />
              </div>

              {/* Statutory Agreement Checkbox (Matching Screen 3) */}
              <label className="auth-checkbox-row">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="checkbox-label-text">
                  I agree to the <strong>Terms, Seller Agreement, Compensation Policy and Privacy Policy</strong>.
                </span>
              </label>

              <button type="submit" className="btn btn-primary full-width btn-lg mt-3">
                <span>Create Account</span>
                <ArrowRight size={16} />
              </button>

              <div className="auth-switch-row">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="auth-switch-link"
                >
                  Log In
                </button>
              </div>
            </>
          ) : (
            /* Login Mode */
            <>
              <div className="form-group-clean">
                <label className="form-label-clean">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="matru@gmail.com"
                  className="form-input-clean"
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="form-input-clean"
                />
              </div>

              <button type="submit" className="btn btn-primary full-width btn-lg mt-3">
                <span>Log In</span>
                <ArrowRight size={16} />
              </button>

              <div className="auth-switch-row">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="auth-switch-link"
                >
                  Join Now
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
