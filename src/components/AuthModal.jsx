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
  Lock
} from 'lucide-react';
import { 
  sendEmailOtp, 
  verifyEmailOtp, 
  getBrevoApiKey, 
  setBrevoApiKey 
} from '../services/brevoOtpService';

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
  const [simulatedOtpHint, setSimulatedOtpHint] = useState('');
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

  // Reset steps when modal opens/closes
  useEffect(() => {
    if (!isAuthModalOpen) {
      setAuthStep('form');
      setOtpInput('');
      setOtpErrorMessage('');
      setSimulatedOtpHint('');
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

    // 5. Strict Multi-Factor Sponsor Referral Code Validation
    const cleanSponsor = (sponsorId || '').trim().toUpperCase();
    const sponsorCheck = validateReferralCode(cleanSponsor, email, mobile);
    if (!sponsorCheck.valid) {
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

        if (result.mode === 'live_brevo') {
          addToast('success', 'Real OTP Sent!', `Verification email delivered to ${email} via Brevo.`);
          setSimulatedOtpHint(result.otp || '');
        } else {
          // Preview mode fallback
          setSimulatedOtpHint(result.otp);
          addToast('info', 'OTP Generated', `Verification code sent. Code: ${result.otp}`);
        }
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

    if (result.mode === 'live_brevo') {
      addToast('success', 'OTP Resent!', `New code sent to ${email} via Brevo.`);
      setSimulatedOtpHint(result.otp || '');
    } else {
      setSimulatedOtpHint(result.otp);
      addToast('info', 'New OTP Generated', `New code is ${result.otp}`);
    }
  };

  // Handle Step 2: Verify OTP and Register
  const handleVerifyOtpAndRegister = (e) => {
    e.preventDefault();
    if (otpInput.trim().length !== 6) {
      setOtpErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    const verification = verifyEmailOtp({ email, enteredOtp: otpInput });
    if (!verification.success) {
      setOtpErrorMessage(verification.reason);
      return;
    }

    const cleanSponsor = (sponsorId || '').trim().toUpperCase();
    const sponsorCheck = validateReferralCode(cleanSponsor, email, mobile);
    const verifiedSponsor = sponsorCheck.valid ? sponsorCheck.member : null;

    // OTP Verified! Register user and advance to plan purchase
    registerUser({
      fullName: fullName.trim(),
      email: email.trim(),
      mobile: (mobile || '').replace(/\D/g, ''),
      password,
      sponsorId: cleanSponsor,
      sponsorMemberId: verifiedSponsor?.member_id || cleanSponsor,
      sponsorName: verifiedSponsor?.name || 'Authorized Partner',
      isSeller
    });

    setIsAuthModalOpen(false);
    addToast('success', 'Email Verified!', 'Account created successfully. Proceed to join with ₹2,500 plan.');
    
    // Automatically prompt to complete ₹2,500 joining plan
    setTimeout(() => {
      openCheckout('Joining');
    }, 400);
  };

  // Handle Login submission
  const handleLoginSubmit = (e) => {
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
      const result = loginUserByEmail({ email, password });
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
            {authMode === 'register' 
              ? (authStep === 'otp' ? 'Verify Email Address' : 'Create Partner Account') 
              : 'Welcome Back'}
          </h3>
          <p className="auth-subtitle">
            {authMode === 'register' 
              ? (authStep === 'otp' 
                  ? `Enter the 6-digit verification code sent to ${email}`
                  : 'Join the authorized cyber defense network and earn multi-tier commissions.')
              : 'Log in to access your partner dashboard, licenses, and payouts.'}
          </p>

          <button onClick={() => setIsAuthModalOpen(false)} className="close-checkout-btn">
            <X size={18} />
          </button>
        </div>

        {/* Brevo API Key Quick Config Bar */}
        <div className="brevo-status-bar">
          <div className="brevo-status-info">
            <span className="brevo-dot" style={{ background: getBrevoApiKey() ? '#10B981' : '#F59E0B' }} />
            <span className="brevo-status-text">
              {getBrevoApiKey() ? 'Brevo API: Live Email Delivery Active' : 'Brevo API: Ready for Key (Testing Fallback Active)'}
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setShowBrevoConfig(!showBrevoConfig)}
            className="brevo-config-link"
          >
            <Settings size={12} />
            <span>{showBrevoConfig ? 'Close' : 'Set Brevo API'}</span>
          </button>
        </div>

        {/* Brevo Config Drawer */}
        {showBrevoConfig && (
          <form onSubmit={handleSaveBrevoKey} className="brevo-config-drawer">
            <label className="text-xs font-bold text-primary">Brevo (Sendinblue) API Key</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={brevoKeyInput}
                onChange={(e) => setBrevoKeyInput(e.target.value)}
                placeholder="xkeysib-..."
                className="form-input-clean text-xs code-font flex-1"
              />
              <button type="submit" className="btn btn-primary btn-xs">
                Save Key
              </button>
            </div>
            <p className="text-muted font-xs mt-1 mb-0">
              Paste your Brevo v3 API key to dispatch real emails directly to partner inboxes.
            </p>
          </form>
        )}

        {/* Form Body */}
        <div className="auth-form-body">
          {authMode === 'register' ? (
            authStep === 'form' ? (
              /* STEP 1: Registration Form */
              <form onSubmit={handleInitiateRegister}>
                {/* Customer vs Seller toggle */}
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
                    Partner (Seller + User)
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
                  <label className="form-label-clean">Email Address (Brevo OTP Verified)</label>
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
                  <div className="flex-between items-center mb-1">
                    <label className="form-label-clean mb-0">
                      Sponsor Referral Code <span style={{ color: '#EF4444' }} className="font-bold">*</span>
                    </label>
                    {activeReferral ? (
                      <span className="badge badge-green font-2xs font-bold">
                        ✓ Auto-filled from Referral
                      </span>
                    ) : (
                      <span className="badge badge-amber font-2xs font-bold">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={sponsorId}
                    onChange={(e) => {
                      setSponsorId(e.target.value.toUpperCase().trim());
                      setSponsorError('');
                    }}
                    placeholder="Enter Sponsor Code (e.g. CS123456)"
                    className={`form-input-clean code-font font-bold ${
                      sponsorError 
                        ? 'input-border-red' 
                        : (getMemberByReferralCode(sponsorId) ? 'input-border-emerald text-emerald-400' : 'text-primary-blue')
                    }`}
                  />
                  {/* Real-time Verified Sponsor Indicator */}
                  {(() => {
                    const clean = (sponsorId || '').trim().toUpperCase();
                    if (!clean) {
                      return (
                        <div className="sponsor-required-hint mt-1">
                          <AlertCircle size={13} className="text-amber shrink-0" />
                          <span className="text-xs">
                            Sponsor code is strictly mandatory.{' '}
                            <button 
                              type="button" 
                              onClick={() => {
                                setSponsorId('CS123456');
                                setSponsorError('');
                              }}
                              className="text-cyan underline font-bold"
                            >
                              Use Head Office (CS123456)
                            </button>
                          </span>
                        </div>
                      );
                    }

                    const check = validateReferralCode ? validateReferralCode(clean, email, mobile) : null;
                    if (check && check.valid) {
                      return (
                        <div className="sponsor-verified-pill mt-1">
                          <ShieldCheck size={14} className="text-emerald shrink-0" />
                          <span className="text-xs">
                            Verified Active Sponsor: <strong className="text-white">{check.member?.name}</strong> <span className="code-font text-cyan">({check.member?.referral_code})</span>
                          </span>
                        </div>
                      );
                    }

                    if (check && check.reason === 'inactive') {
                      return (
                        <div className="sponsor-warning-pill mt-1" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '6px 10px' }}>
                          <AlertCircle size={14} className="text-amber shrink-0" />
                          <span className="text-xs text-amber">
                            Partner "{check.member?.name}" is pending plan activation and cannot sponsor new members yet.
                          </span>
                        </div>
                      );
                    }

                    if (check && check.reason === 'self_referral') {
                      return (
                        <div className="sponsor-error-pill mt-1">
                          <AlertCircle size={14} className="text-red-400 shrink-0" />
                          <span className="text-xs">
                            You cannot use your own referral code to sponsor yourself.
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div className="sponsor-error-pill mt-1">
                        <AlertCircle size={14} className="text-red-400 shrink-0" />
                        <span className="text-xs">
                          {sponsorError || check?.message || `Sponsor code "${clean}" is not recognized.`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Statutory Agreement Checkbox */}
                <label className="auth-checkbox-row">
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
                  className="btn btn-primary full-width btn-lg mt-3 flex-center gap-2"
                >
                  <Mail size={16} />
                  <span>{isSendingOtp ? 'Sending Brevo OTP...' : 'Send Verification OTP & Continue'}</span>
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

                {/* Helper hint for instant preview */}
                {simulatedOtpHint && (
                  <div className="otp-hint-banner">
                    <CheckCircle2 size={16} className="text-primary-blue flex-shrink-0" />
                    <span>
                      <strong>Instant Test Code:</strong> <code className="code-font text-primary-blue font-bold text-base">{simulatedOtpHint}</code> (Auto-generated code ready for instant verification)
                    </span>
                  </div>
                )}

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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
