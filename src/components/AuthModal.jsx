import React, { useState, useEffect } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  X, 
  ShieldCheck, 
  ArrowRight, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Phone
} from 'lucide-react';
import { hashPassword } from '../utils/cryptoAuth';
import { dbUpdateMemberPassword } from '../services/neonDbService';

export default function AuthModal() {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authMode, 
    setAuthMode, 
    registerUser, 
    setIsLoggedIn,
    activeReferral,
    getMemberByReferralCode,
    validateReferralCode,
    loginUserByEmail,
    members,
    addToast
  } = useMlm();
  
  // Registration Form Fields
  const [isSeller, setIsSeller] = useState(true);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sponsorId, setSponsorId] = useState(() => activeReferral || '');
  const [sponsorError, setSponsorError] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login & Forgot Password Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  // Forgot Password specific fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Sync sponsorId when activeReferral is captured or modal opens
  useEffect(() => {
    if (activeReferral) {
      setSponsorId(activeReferral);
      setSponsorError('');
    }
  }, [activeReferral, isAuthModalOpen]);

  // Reset errors when modal mode changes
  useEffect(() => {
    setLoginErrorMessage('');
    setForgotError('');
    setSponsorError('');
  }, [authMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  // Direct 1-Click Registration (No Email / No OTP Required)
  const handleDirectRegister = async (e) => {
    e.preventDefault();

    // 1. Full Legal Name Validation
    if (!fullName || fullName.trim().length < 2) {
      addToast('error', 'Full Name Required', 'Please enter your full legal name (minimum 2 characters).');
      return;
    }

    // 2. 10-Digit Mobile Number Validation
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      addToast('error', 'Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // Check for duplicate registered mobile number
    const isAlreadyRegistered = (members || []).some(m => {
      if (!m.phone) return false;
      const memDigits = m.phone.replace(/\D/g, '');
      return memDigits.length >= 10 && memDigits.slice(-10) === cleanMobile;
    });

    if (isAlreadyRegistered) {
      addToast('warning', 'Mobile Already Registered', `An account with mobile number ${cleanMobile} already exists. Switching to Log In.`);
      setLoginIdentifier(cleanMobile);
      setAuthMode('login');
      return;
    }

    // 3. Password Validation
    if (!password || password.length < 6) {
      addToast('error', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    // 4. Sponsor Referral Code (Defaults to Head Office Root CS123456 if left empty)
    const cleanSponsor = (sponsorId || '').trim().toUpperCase() || 'CS123456';
    const sponsorCheck = validateReferralCode(cleanSponsor, null, cleanMobile);
    if (!sponsorCheck.valid && cleanSponsor !== 'CS123456') {
      setSponsorError(sponsorCheck.message);
      addToast('error', 'Sponsor Verification Failed', sponsorCheck.message);
      return;
    }

    // 5. Statutory Direct Seller Agreement
    if (!agreed) {
      addToast('error', 'Agreement Required', 'Please accept the Direct Seller Agreement to proceed.');
      return;
    }

    setSponsorError('');
    setIsSubmitting(true);

    try {
      const verifiedSponsor = sponsorCheck.valid ? sponsorCheck.member : null;
      await registerUser({
        fullName: fullName.trim(),
        email: `${cleanMobile}@cybershield.net`,
        mobile: cleanMobile,
        password,
        sponsorId: cleanSponsor,
        sponsorMemberId: verifiedSponsor?.member_id || cleanSponsor,
        sponsorName: verifiedSponsor?.name || 'CyberShield Head Office',
        isSeller
      });

      // Clear state and close
      setFullName('');
      setMobile('');
      setPassword('');
      setIsAuthModalOpen(false);
    } catch (err) {
      addToast('error', 'Registration Failed', err.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login Submission (Mobile Number or Partner ID + Password)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginErrorMessage('');

    const cleanId = (loginIdentifier || '').trim();
    if (!cleanId) {
      setLoginErrorMessage('Please enter your 10-digit mobile number or Partner ID.');
      return;
    }

    if (!password) {
      setLoginErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (loginUserByEmail) {
        const result = await loginUserByEmail({ identifier: cleanId, password });
        if (!result || !result.ok) {
          const errorMsg = result?.error || 'Invalid credentials or account not found.';
          setLoginErrorMessage(errorMsg);
          addToast('error', 'Login Failed', errorMsg);
          return;
        }
      } else {
        setIsLoggedIn(true);
        addToast('success', 'Welcome Back!', 'Logged in as Partner.');
      }
      setIsAuthModalOpen(false);
      setPassword('');
      setLoginIdentifier('');
    } catch (err) {
      setLoginErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Password Reset (Mobile Number / Partner ID + New Password)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');

    const cleanId = (loginIdentifier || '').trim();
    if (!cleanId) {
      setForgotError('Please enter your registered 10-digit mobile number or Partner ID.');
      return;
    }

    const cleanDigits = cleanId.replace(/\D/g, '');
    const cleanLower = cleanId.toLowerCase();

    const foundMember = (members || []).find(m => {
      if (cleanDigits.length >= 10 && m.phone) {
        const memDigits = m.phone.replace(/\D/g, '');
        if (memDigits.length >= 10 && memDigits.slice(-10) === cleanDigits.slice(-10)) return true;
      }
      if (m.phone && m.phone.trim() === cleanId) return true;
      if (m.member_id && m.member_id.toLowerCase() === cleanLower) return true;
      if (m.id && m.id.toLowerCase() === cleanLower) return true;
      if (m.referral_code && m.referral_code.toLowerCase() === cleanLower) return true;
      if (m.cs_customer_id && m.cs_customer_id.toLowerCase() === cleanLower) return true;
      return false;
    });

    if (!foundMember) {
      setForgotError(`No registered partner account found with mobile number or ID "${cleanId}".`);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match. Please verify and re-type.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newHash = await hashPassword(newPassword);
      foundMember.password = newHash;
      dbUpdateMemberPassword(foundMember.member_id, newHash).catch(err => console.warn('dbUpdateMemberPassword error:', err));

      addToast('success', 'Password Updated Successfully!', 'Your password has been changed. Please sign in with your new password.');
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setAuthMode('login');
    } catch (err) {
      setForgotError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-box ${authMode === 'register' ? 'auth-modal-wide' : 'auth-modal-width'}`}>
        {/* Header */}
        <div className="auth-modal-header" style={{ position: 'relative' }}>
          <div className="brand-logo-text-small mb-1">
            <span className="brand-title">CyberShield</span>
            <span className="brand-subtitle">Security Network</span>
          </div>

          <h3 className="auth-title">
            {authMode === 'register' 
              ? 'Create Partner Account' 
              : authMode === 'forgot'
                ? 'Reset Account Password'
                : 'Welcome Back'}
          </h3>
          <p className="auth-subtitle">
            {authMode === 'register' 
              ? 'Join the authorized cyber defense network and earn multi-tier commissions.'
              : authMode === 'forgot'
                ? 'Enter your registered Mobile Number or Partner ID and set a new password.'
                : 'Log in with your Mobile Number or Partner ID to access your dashboard.'}
          </p>

          <button onClick={() => setIsAuthModalOpen(false)} className="auth-modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="auth-form-body">
          {authMode === 'register' ? (
            /* ========================================================
               REGISTRATION FORM (Direct 1-Step, No Email, No OTP)
               ======================================================== */
            <form onSubmit={handleDirectRegister}>
              <div className="auth-form-grid">
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
                  <label className="form-label-clean">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="form-input-clean"
                  />
                </div>

                <div className="form-group-clean">
                  <label className="form-label-clean">Create Password</label>
                  <div className="relative-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password (min 6 chars)"
                      className="form-input-clean pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="input-eye-btn"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group-clean">
                  <div className="flex-between items-center mb-1">
                    <label className="form-label-clean mb-0">
                      Sponsor Referral Code
                    </label>
                    {activeReferral ? (
                      <span className="badge badge-green font-2xs font-bold">
                        ✓ Auto-filled
                      </span>
                    ) : (sponsorId && sponsorId.trim()) ? (
                      <span className="badge badge-blue font-2xs font-bold">
                        Specified
                      </span>
                    ) : (
                      <span className="badge font-2xs" style={{ background: '#F1F5F9', color: '#64748B' }}>
                        Optional (Head Office)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sponsorId}
                    onChange={(e) => {
                      setSponsorId(e.target.value.toUpperCase().trim());
                      setSponsorError('');
                    }}
                    placeholder="Enter Sponsor Code or leave empty"
                    className={`form-input-clean code-font font-bold ${
                      sponsorError 
                        ? 'input-border-red' 
                        : (getMemberByReferralCode(sponsorId) ? 'input-border-emerald text-emerald-400' : 'text-primary-blue')
                    }`}
                  />
                </div>
              </div>

              {/* Sponsor Status Indicator Banner */}
              <div style={{ marginBottom: '10px' }}>
                {(() => {
                  const clean = (sponsorId || '').trim().toUpperCase();
                  if (!clean) {
                    return (
                      <div className="sponsor-direct-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '8px', padding: '9px 12px', minHeight: '40px' }}>
                        <ShieldCheck size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: '#1E40AF', lineHeight: 1.35 }}>
                          <strong>Direct Enrollment:</strong> Registered under <strong>Head Office Root (CS123456)</strong> with full partner rights.
                        </span>
                      </div>
                    );
                  }

                  const check = validateReferralCode ? validateReferralCode(clean, null, mobile) : null;
                  if (check && check.valid) {
                    return (
                      <div className="sponsor-verified-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '40px' }}>
                        <ShieldCheck size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: '#065F46', lineHeight: 1.35 }}>
                          Active Sponsor: <strong style={{ color: '#0F172A' }}>{check.member?.name}</strong> <span className="code-font" style={{ color: '#2563EB', fontWeight: 'bold' }}>({check.member?.referral_code})</span>
                        </span>
                      </div>
                    );
                  }

                  if (check && check.reason === 'inactive') {
                    return (
                      <div className="sponsor-warning-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '40px' }}>
                        <AlertCircle size={16} className="text-amber shrink-0" />
                        <span style={{ fontSize: '0.78rem', color: '#B45309', lineHeight: 1.35 }}>
                          Partner "{check.member?.name}" is pending plan activation.
                        </span>
                      </div>
                    );
                  }

                  if (check && check.reason === 'self_referral') {
                    return (
                      <div className="sponsor-error-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '40px' }}>
                        <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.35 }}>
                          Cannot use your own referral code.
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="sponsor-error-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '40px' }}>
                      <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.35 }}>
                        {sponsorError || check?.message || `Sponsor code "${clean}" not recognized.`}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Statutory Agreement Checkbox */}
              <label className="auth-checkbox-row" style={{ margin: '8px 0 10px 0' }}>
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="checkbox-label-text">
                  I agree to the <strong>Direct Seller Agreement, Terms & Conditions</strong> and statutory Section 194H TDS rules.
                </span>
              </label>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn btn-primary full-width btn-lg flex-center gap-2"
                style={{ marginTop: '4px' }}
              >
                <ShieldCheck size={18} />
                <span>{isSubmitting ? 'Creating Account...' : 'Create Partner Account & Continue'}</span>
                <ArrowRight size={16} />
              </button>

              <div className="auth-switch-row" style={{ marginTop: '12px' }}>
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLoginErrorMessage('');
                  }}
                  className="auth-switch-link"
                >
                  Log In
                </button>
              </div>
            </form>
          ) : authMode === 'login' ? (
            /* ========================================================
               LOGIN FORM (Mobile Number or Partner ID + Password)
               ======================================================== */
            <form onSubmit={handleLoginSubmit}>
              {loginErrorMessage && (
                <div className="otp-error-banner mb-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '6px', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{loginErrorMessage}</span>
                </div>
              )}

              <div className="form-group-clean">
                <label className="form-label-clean">Mobile Number / Partner ID</label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setLoginErrorMessage('');
                  }}
                  placeholder="Enter 10-digit mobile number or Partner ID (e.g. CS123456)"
                  className="form-input-clean"
                  autoFocus
                />
              </div>

              <div className="form-group-clean">
                <div className="flex-between items-center mb-1">
                  <label className="form-label-clean mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotError('');
                    }}
                    className="text-xs text-primary-blue bg-transparent border-0 cursor-pointer hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginErrorMessage('');
                    }}
                    placeholder="Enter password"
                    className="form-input-clean pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-eye-btn"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn btn-primary full-width btn-lg mt-3 flex-center gap-2"
              >
                <Lock size={16} />
                <span>{isSubmitting ? 'Logging In...' : 'Log In'}</span>
                <ArrowRight size={16} />
              </button>

              <div className="auth-switch-row">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLoginErrorMessage('');
                  }}
                  className="auth-switch-link"
                >
                  Join Now
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
               FORGOT PASSWORD FORM (Direct Mobile / ID Reset)
               ======================================================== */
            <form onSubmit={handleResetPassword}>
              {forgotError && (
                <div className="otp-error-banner mb-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '6px', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <div className="form-group-clean">
                <label className="form-label-clean">Mobile Number / Partner ID</label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setForgotError('');
                  }}
                  placeholder="Enter registered mobile number or Partner ID"
                  className="form-input-clean"
                  autoFocus
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">New Password</label>
                <div className="relative-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="form-input-clean pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="input-eye-btn"
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="form-input-clean"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn btn-primary full-width btn-lg mt-4 flex-center gap-2"
              >
                <Key size={16} />
                <span>{isSubmitting ? 'Updating Password...' : 'Reset & Update Password'}</span>
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotError('');
                  }}
                  className="text-muted text-xs bg-transparent border-0 cursor-pointer hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
