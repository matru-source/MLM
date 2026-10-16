import React, { useState, useEffect } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  X, 
  ShieldCheck, 
  ArrowRight, 
  Mail, 
  Key, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle,
  Settings,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  sendEmailOtp, 
  verifyEmailOtp, 
  getBrevoApiKey, 
  setBrevoApiKey 
} from '../services/brevoOtpService';
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
    openCheckout,
    activeReferral,
    getMemberByReferralCode,
    validateReferralCode,
    loginUserByEmail,
    members,
    addToast
  } = useMlm();
  
  // Registration Form Fields - Blank defaults with clean placeholders
  const [isSeller, setIsSeller] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Mandatory Sponsor Code: Auto-fills from URL referral, otherwise requires user to enter valid sponsor
  const [sponsorId, setSponsorId] = useState(() => activeReferral || '');
  const [sponsorError, setSponsorError] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  // Sync sponsorId when activeReferral is captured or modal opens
  useEffect(() => {
    if (activeReferral) {
      setSponsorId(activeReferral);
      setSponsorError('');
    }
  }, [activeReferral, isAuthModalOpen]);

  // OTP Verification State
  const [authStep, setAuthStep] = useState('form'); // 'form' | 'otp'
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState('');

  // Brevo API Key Configuration Modal/Section
  const [showBrevoConfig, setShowBrevoConfig] = useState(false);
  const [brevoKeyInput, setBrevoKeyInput] = useState(getBrevoApiKey());

  // Countdown timer for OTP
  useEffect(() => {
    let timer;
    if (authStep === 'otp' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, otpCountdown]);

  // Forgot Password State & Timer
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(60);
  const [canResendReset, setCanResendReset] = useState(false);

  useEffect(() => {
    let timer;
    if (authMode === 'forgot' && forgotStep === 'verify' && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown(prev => {
          if (prev <= 1) {
            setCanResendReset(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authMode, forgotStep, resetCountdown]);

  // Reset steps when modal opens/closes
  useEffect(() => {
    if (!isAuthModalOpen) {
      setAuthStep('form');
      setOtpInput('');
      setOtpErrorMessage('');
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  // Handle Step 1: Send OTP via Brevo API
  const handleInitiateRegister = async (e) => {
    e.preventDefault();

    // 1. Full Name Validation
    if (!fullName || fullName.trim().length < 2) {
      addToast('error', 'Full Name Required', 'Please enter your full legal name (minimum 2 characters).');
      return;
    }

    // 2. Email Format & Duplicate Account Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      addToast('error', 'Invalid Email', 'Please enter a valid email address (e.g., name@example.com) to receive OTP.');
      return;
    }

    const isAlreadyRegistered = (members || []).some(m => m.email && m.email.toLowerCase() === cleanEmail);
    if (isAlreadyRegistered) {
      addToast('warning', 'Account Already Exists', `An account with ${cleanEmail} is already registered. Switching to Log In.`);
      setAuthMode('login');
      return;
    }

    // 3. 10-Digit Mobile Number Validation
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      addToast('error', 'Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // 4. Password Strength Validation
    if (!password || password.length < 6) {
      addToast('error', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    // 5. Sponsor Referral Code (Defaults to Head Office Root CS123456 if left empty)
    const cleanSponsor = (sponsorId || '').trim().toUpperCase() || 'CS123456';
    const sponsorCheck = validateReferralCode(cleanSponsor, email, mobile);
    if (!sponsorCheck.valid && cleanSponsor !== 'CS123456') {
      setSponsorError(sponsorCheck.message);
      addToast('error', 'Sponsor Verification Failed', sponsorCheck.message);
      return;
    }

    setSponsorError('');
    setIsSendingOtp(true);
    setOtpErrorMessage('');

    try {
      const result = await sendEmailOtp({ email, fullName });
      setIsSendingOtp(false);

      if (result.success) {
        setAuthStep('otp');
        setOtpCountdown(60);
        setCanResend(false);
        addToast('success', 'Verification Code Sent!', `Verification email delivered to ${email}. Check your inbox.`);
      }
    } catch (err) {
      setIsSendingOtp(false);
      setOtpErrorMessage('Failed to send verification code. Please try again.');
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsSendingOtp(true);
    setOtpErrorMessage('');

    const result = await sendEmailOtp({ email, fullName });
    setIsSendingOtp(false);
    setOtpCountdown(60);
    setCanResend(false);

    if (result.success) {
      addToast('success', 'OTP Resent!', `New verification code delivered to ${email}. Check your inbox.`);
    }
  };

  // Handle Step 2: Verify OTP and Register
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    if (otpInput.trim().length !== 6) {
      setOtpErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    const verification = await verifyEmailOtp({ email, enteredOtp: otpInput });
    if (!verification.success) {
      setOtpErrorMessage(verification.reason);
      return;
    }

    const cleanSponsor = (sponsorId || '').trim().toUpperCase() || 'CS123456';
    const sponsorCheck = validateReferralCode(cleanSponsor, email, mobile);
    const verifiedSponsor = sponsorCheck.valid ? sponsorCheck.member : null;

    // OTP Verified! Register user and advance to plan purchase
    await registerUser({
      fullName: fullName.trim(),
      email: email.trim(),
      mobile: (mobile || '').replace(/\D/g, ''),
      password,
      sponsorId: cleanSponsor,
      sponsorMemberId: verifiedSponsor?.member_id || cleanSponsor,
      sponsorName: verifiedSponsor?.name || 'CyberShield Head Office',
      isSeller
    });

    setIsAuthModalOpen(false);
    addToast('success', 'Email Verified!', 'Account created successfully. Proceed to join with ₹2,500 plan.');
    
    // Automatically prompt to complete ₹2,500 joining plan
    setTimeout(() => {
      openCheckout('Joining');
    }, 400);
  };

  // Handle Login submission with Cryptographic Password Verification
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginErrorMessage('');

    if (!email || !email.includes('@')) {
      setLoginErrorMessage('Please enter a valid registered email address.');
      return;
    }

    if (!password) {
      setLoginErrorMessage('Please enter your account password.');
      return;
    }

    if (loginUserByEmail) {
      const result = await loginUserByEmail({ email, password });
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
  };

  // Save Brevo API Key
  const handleSaveBrevoKey = (e) => {
    e.preventDefault();
    setBrevoApiKey(brevoKeyInput);
    setShowBrevoConfig(false);
    addToast('success', 'Brevo API Configured', 'Brevo API key saved. Real transactional emails will be dispatched.');
  };

  // Forgot Password: Step 1 - Send OTP to registered email
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setForgotError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setForgotError('Please enter a valid registered email address.');
      return;
    }

    const foundMember = (members || []).find(m => m.email && m.email.toLowerCase() === cleanEmail);
    if (!foundMember) {
      setForgotError(`No registered partner account found with email "${cleanEmail}".`);
      return;
    }

    setIsSendingResetOtp(true);
    try {
      const res = await sendEmailOtp({ email: cleanEmail, fullName: foundMember.name });
      if (!res.success) {
        setForgotError(res.message || 'Failed to dispatch password reset code.');
        return;
      }
      setForgotStep('verify');
      setResetCountdown(60);
      setCanResendReset(false);
      addToast('success', 'Reset Code Dispatched', `A 6-digit verification code has been sent to ${cleanEmail}`);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  // Forgot Password: Step 2 - Verify OTP & Set New Password
  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!resetOtp || resetOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit verification code sent to your email.');
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

    const cleanEmail = email.trim().toLowerCase();
    const verification = await verifyEmailOtp({ email: cleanEmail, enteredOtp: resetOtp.trim() });
    if (!verification.success) {
      setForgotError(verification.reason || 'Invalid verification code.');
      return;
    }

    const foundMember = (members || []).find(m => m.email && m.email.toLowerCase() === cleanEmail);
    if (!foundMember) {
      setForgotError('Account not found.');
      return;
    }

    const newHash = await hashPassword(newPassword);
    foundMember.password = newHash;
    dbUpdateMemberPassword(foundMember.member_id, newHash).catch(err => console.warn('dbUpdateMemberPassword error:', err));

    addToast('success', 'Password Reset Successful!', 'Your password has been updated. Please sign in with your new credentials.');
    setPassword('');
    setAuthMode('login');
    setForgotStep('request');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-box ${authMode === 'register' && authStep === 'form' ? 'auth-modal-wide' : 'auth-modal-width'}`}>
        {/* Header */}
        <div className="auth-modal-header" style={{ position: 'relative' }}>
          <div className="brand-logo-text-small mb-1">
            <span className="brand-title">CyberShield</span>
            <span className="brand-subtitle">Security Network</span>
          </div>

          <h3 className="auth-title">
            {authMode === 'register' 
              ? (authStep === 'otp' ? 'Verify Email Address' : 'Create Partner Account') 
              : authMode === 'forgot'
                ? (forgotStep === 'verify' ? 'Set New Password' : 'Reset Account Password')
                : 'Welcome Back'}
          </h3>
          <p className="auth-subtitle">
            {authMode === 'register' 
              ? (authStep === 'otp' 
                  ? `Enter the 6-digit verification code sent to ${email}`
                  : 'Join the authorized cyber defense network and earn multi-tier commissions.')
              : authMode === 'forgot'
                ? (forgotStep === 'verify'
                    ? `Enter the 6-digit code sent to ${email} and choose your new password.`
                    : 'Enter your registered email to receive a password reset verification code.')
                : 'Log in to access your partner dashboard, licenses, and payouts.'}
          </p>

          <button onClick={() => setIsAuthModalOpen(false)} className="auth-modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="auth-form-body">
          {authMode === 'register' ? (
            authStep === 'form' ? (
              /* STEP 1: Registration Form */
              <form onSubmit={handleInitiateRegister}>
                {/* 2-Column Responsive Input Grid */}
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
                    <label className="form-label-clean">Email Address (OTP Verified)</label>
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
                </div>

                {/* 2-Column Sponsor Section & Live Status Indicator */}
                <div className="auth-sponsor-grid">
                  <div className="form-group-clean mb-0">
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

                  <div className="sponsor-indicator-col">
                    {(() => {
                      const clean = (sponsorId || '').trim().toUpperCase();
                      if (!clean) {
                        return (
                          <div className="sponsor-direct-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <ShieldCheck size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#1E40AF', lineHeight: 1.35 }}>
                              <strong>Direct Enrollment:</strong> Registered under <strong>Head Office Root (CS123456)</strong> with full partner rights.
                            </span>
                          </div>
                        );
                      }

                      const check = validateReferralCode ? validateReferralCode(clean, email, mobile) : null;
                      if (check && check.valid) {
                        return (
                          <div className="sponsor-verified-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <ShieldCheck size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#065F46', lineHeight: 1.35 }}>
                              Active Sponsor: <strong style={{ color: '#0F172A' }}>{check.member?.name}</strong> <span className="code-font" style={{ color: '#2563EB', fontWeight: 'bold' }}>({check.member?.referral_code})</span>
                            </span>
                          </div>
                        );
                      }

                      if (check && check.reason === 'inactive') {
                        return (
                          <div className="sponsor-warning-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <AlertCircle size={16} className="text-amber shrink-0" />
                            <span style={{ fontSize: '0.78rem', color: '#B45309', lineHeight: 1.35 }}>
                              Partner "{check.member?.name}" is pending plan activation.
                            </span>
                          </div>
                        );
                      }

                      if (check && check.reason === 'self_referral') {
                        return (
                          <div className="sponsor-error-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.35 }}>
                              Cannot use your own referral code.
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div className="sponsor-error-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                          <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.35 }}>
                            {sponsorError || check?.message || `Sponsor code "${clean}" not recognized.`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
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
                  disabled={isSendingOtp}
                  className="btn btn-primary full-width btn-lg flex-center gap-2"
                  style={{ marginTop: '4px' }}
                >
                  <Mail size={16} />
                  <span>{isSendingOtp ? 'Sending Brevo OTP...' : 'Send Verification OTP & Continue'}</span>
                  <ArrowRight size={16} />
                </button>

                <div className="auth-switch-row" style={{ marginTop: '10px' }}>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="auth-switch-link"
                  >
                    Log In
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Dedicated OTP Verification Screen */
              <form onSubmit={handleVerifyOtpAndRegister} className="otp-verification-screen">
                <div className="otp-target-card">
                  <Mail size={24} className="text-primary-blue" />
                  <div>
                    <div className="font-bold text-sm text-primary">Verification Code Sent</div>
                    <div className="text-muted font-xs">{email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthStep('form')}
                    className="btn btn-secondary btn-xs ml-auto"
                  >
                    Change Email
                  </button>
                </div>


                {otpErrorMessage && (
                  <div className="otp-error-banner">
                    <AlertCircle size={16} className="text-rose flex-shrink-0" />
                    <span>{otpErrorMessage}</span>
                  </div>
                )}

                <div className="form-group-clean mt-3">
                  <label className="form-label-clean text-center block">Enter 6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otpInput}
                    onChange={(e) => {
                      setOtpInput(e.target.value.replace(/\D/g, ''));
                      setOtpErrorMessage('');
                    }}
                    placeholder="• • • • • •"
                    className="form-input-clean otp-digits-input text-center font-extrabold text-2xl tracking-widest code-font"
                  />
                </div>

                <div className="otp-resend-row">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSendingOtp}
                      className="btn-link-action font-semibold text-primary-blue flex-center gap-1"
                    >
                      <RotateCcw size={13} />
                      <span>Resend Verification Code</span>
                    </button>
                  ) : (
                    <span className="text-muted text-xs">
                      Resend code in <strong>{otpCountdown}s</strong>
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary full-width btn-lg mt-4 flex-center gap-2"
                >
                  <ShieldCheck size={18} />
                  <span>Verify OTP & Create Account</span>
                </button>

                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => setAuthStep('form')}
                    className="text-muted text-xs bg-transparent border-0 cursor-pointer hover:underline"
                  >
                    ← Back to Registration Details
                  </button>
                </div>
              </form>
            )
          ) : authMode === 'login' ? (
            /* Login Mode */
            <form onSubmit={handleLoginSubmit}>
              {loginErrorMessage && (
                <div className="otp-error-banner mb-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '6px', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{loginErrorMessage}</span>
                </div>
              )}
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
                <div className="flex-between items-center mb-1">
                  <label className="form-label-clean mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotStep('request');
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
                    onChange={(e) => setPassword(e.target.value)}
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

              <button type="submit" className="btn btn-primary full-width btn-lg mt-3 flex-center gap-2">
                <Lock size={16} />
                <span>Log In</span>
                <ArrowRight size={16} />
              </button>

              <div className="auth-switch-row">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthStep('form');
                  }}
                  className="auth-switch-link"
                >
                  Join Now
                </button>
              </div>
            </form>
          ) : (
            /* Forgot Password Mode */
            forgotStep === 'request' ? (
              <form onSubmit={handleSendResetCode}>
                {forgotError && (
                  <div className="otp-error-banner mb-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '6px', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div className="form-group-clean">
                  <label className="form-label-clean">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email"
                    className="form-input-clean"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSendingResetOtp}
                  className="btn btn-primary full-width btn-lg mt-4 flex-center gap-2"
                >
                  {isSendingResetOtp ? (
                    <>
                      <RotateCcw size={16} className="animate-spin" />
                      <span>Sending Reset Code...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Password Reset Code</span>
                    </>
                  )}
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
            ) : (
              <form onSubmit={handleConfirmResetPassword}>
                {forgotError && (
                  <div className="otp-error-banner mb-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 12px', borderRadius: '6px', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div className="form-group-clean">
                  <label className="form-label-clean">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="form-input-clean code-font text-center font-bold"
                    style={{ letterSpacing: '4px', fontSize: '1.1rem' }}
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

                <div className="flex-between items-center mt-2 mb-3">
                  {canResendReset ? (
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      className="text-xs text-primary-blue bg-transparent border-0 cursor-pointer hover:underline flex-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Resend Code</span>
                    </button>
                  ) : (
                    <span className="text-muted text-xs">
                      Resend code in <strong>{resetCountdown}s</strong>
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary full-width btn-lg mt-2 flex-center gap-2"
                >
                  <Key size={16} />
                  <span>Reset & Update Password</span>
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
                    ← Cancel & Back to Sign In
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
