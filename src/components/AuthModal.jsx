import React, { useState, useEffect } from 'react';
import { useMlm } from '../context/MlmContext';
import { lookupReferral } from '../services/sessionService';
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
  EyeOff,
  Zap
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
    initiateZexConnect,
    activeReferral,
    getMemberByReferralCode,
    validateReferralCode,
    loginUserByEmail,
    resetUserPassword,
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
  const [liveSponsorInfo, setLiveSponsorInfo] = useState(null);
  const [isVerifyingSponsor, setIsVerifyingSponsor] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  // Sync sponsorId when activeReferral is captured or modal opens
  useEffect(() => {
    if (activeReferral) {
      setSponsorId(activeReferral);
      setSponsorError('');
    }
  }, [activeReferral, isAuthModalOpen]);

  // Live real-time server verification of sponsor code (works for public visitors without logging in)
  useEffect(() => {
    let active = true;
    const clean = (sponsorId || '').trim().toUpperCase();
    if (!clean) {
      setLiveSponsorInfo(null);
      setIsVerifyingSponsor(false);
      return;
    }

    if (clean === 'CS123456' || clean === 'ROOT' || clean === 'HEAD') {
      setLiveSponsorInfo({
        name: 'CyberNetworking Head Office',
        referral_code: 'CS123456',
        valid: true
      });
      setIsVerifyingSponsor(false);
      return;
    }

    setIsVerifyingSponsor(true);
    const timeout = setTimeout(async () => {
      try {
        const check = await lookupReferral(clean);
        if (!active) return;
        setIsVerifyingSponsor(false);
        if (check.valid && check.member) {
          setLiveSponsorInfo({
            name: check.member.name,
            referral_code: check.member.referral_code || clean,
            member_id: check.member.id || check.member.member_id,
            valid: true
          });
          setSponsorError('');
        } else {
          setLiveSponsorInfo({
            valid: false,
            message: check.message || 'Sponsor code not found'
          });
        }
      } catch (e) {
        if (!active) return;
        setIsVerifyingSponsor(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [sponsorId]);

  // OTP Verification State
  const [authStep, setAuthStep] = useState('form'); // 'form' | 'otp'
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');

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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
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
      setFormErrorMessage('');
      setIsSendingOtp(false);
      setIsVerifyingOtp(false);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  // Handle Step 1: Send OTP via Brevo API
  const handleInitiateRegister = async (e) => {
    e.preventDefault();
    if (isSendingOtp) return; // Prevent double invocation

    setFormErrorMessage('');
    setSponsorError('');

    // 1. Full Name Validation
    if (!fullName || fullName.trim().length < 2) {
      setFormErrorMessage('Please enter your full legal name (minimum 2 characters).');
      addToast('error', 'Full Name Required', 'Please enter your full legal name (minimum 2 characters).');
      return;
    }

    // 2. Email Format & Duplicate Account Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setFormErrorMessage('Please enter a valid email address (e.g., name@example.com) to receive OTP.');
      addToast('error', 'Invalid Email', 'Please enter a valid email address to receive OTP.');
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
      setFormErrorMessage('Please enter a valid 10-digit mobile number.');
      addToast('error', 'Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // 4. Password Strength Validation
    if (!password || password.length < 6) {
      setFormErrorMessage('Password must be at least 6 characters long.');
      addToast('error', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    // 5. Sponsor Referral Code (Strictly Mandatory - Server Verified)
    const cleanSponsor = (sponsorId || '').trim().toUpperCase();
    if (!cleanSponsor) {
      setSponsorError('Sponsor referral code is strictly mandatory to join CyberNetworking.');
      setFormErrorMessage('Sponsor referral code is strictly mandatory to join CyberNetworking.');
      addToast('error', 'Sponsor Code Required', 'Please enter a valid sponsor referral code to continue.');
      return;
    }

    // Lock button immediately to show spinner and buffer
    setIsSendingOtp(true);

    try {
      let verifiedSponsor = null;
      if (cleanSponsor === 'CS123456' || cleanSponsor === 'ROOT' || cleanSponsor === 'HEAD') {
        verifiedSponsor = {
          member_id: 'mem_matru',
          id: 'mem_matru',
          name: 'CyberNetworking Head Office',
          referral_code: 'CS123456',
          seller_status: 'active'
        };
      } else if (liveSponsorInfo?.valid && (liveSponsorInfo.referral_code?.toUpperCase() === cleanSponsor || liveSponsorInfo.name)) {
        // Fast path: sponsor already validated in state
        verifiedSponsor = liveSponsorInfo;
      } else {
        const serverCheck = await lookupReferral(cleanSponsor);
        if (!serverCheck.valid) {
          const errorMsg = serverCheck.message || `Sponsor code "${cleanSponsor}" does not exist in our authorized partner network.`;
          setSponsorError(errorMsg);
          setFormErrorMessage(errorMsg);
          addToast('error', 'Sponsor Verification Failed', errorMsg);
          setIsSendingOtp(false);
          return;
        }
        verifiedSponsor = serverCheck.member;
      }

      // Check self-referral
      if (verifiedSponsor?.email && verifiedSponsor.email.toLowerCase() === cleanEmail) {
        const selfMsg = 'You cannot use your own referral code to sponsor yourself.';
        setSponsorError(selfMsg);
        setFormErrorMessage(selfMsg);
        addToast('error', 'Self-Referral Blocked', selfMsg);
        setIsSendingOtp(false);
        return;
      }

      setSponsorError('');
      setFormErrorMessage('');
      setOtpErrorMessage('');

      const result = await sendEmailOtp({ email: cleanEmail, fullName: fullName.trim() });
      setIsSendingOtp(false);

      if (result.success) {
        setAuthStep('otp');
        setOtpCountdown(60);
        setCanResend(false);
        addToast('success', 'Verification Code Sent!', `Verification email delivered to ${cleanEmail}. Check your inbox.`);
      } else {
        const failMsg = result.error || 'Failed to send verification code. Please retry.';
        setFormErrorMessage(failMsg);
        addToast('error', 'OTP Delivery Failed', failMsg);
      }
    } catch (err) {
      setIsSendingOtp(false);
      const errMsg = err?.message || 'Failed to send verification code. Please wait 60s and try again.';
      setFormErrorMessage(errMsg);
      addToast('error', 'Verification Failed', errMsg);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpErrorMessage('');

    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const result = await sendEmailOtp({ email: cleanEmail, fullName: fullName.trim() });
      setIsSendingOtp(false);
      setOtpCountdown(60);
      setCanResend(false);

      if (result.success) {
        addToast('success', 'OTP Resent!', `New verification code delivered to ${cleanEmail}. Check your inbox.`);
      } else {
        setOtpErrorMessage(result.error || 'Failed to resend code. Please retry.');
      }
    } catch (err) {
      setIsSendingOtp(false);
      setOtpErrorMessage(err?.message || 'Failed to resend verification code. Please wait 60s.');
    }
  };

  // Handle Step 2: Verify OTP and Register
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    if (isVerifyingOtp) return; // Prevent multi-click race condition and duplicate consumption

    const cleanDigits = (otpInput || '').trim().replace(/\D/g, '');
    if (cleanDigits.length !== 6) {
      setOtpErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpErrorMessage('');

    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const verification = await verifyEmailOtp({ email: cleanEmail, enteredOtp: cleanDigits });
      if (!verification.success) {
        setIsVerifyingOtp(false);
        setOtpErrorMessage(verification.reason || 'Invalid or expired verification code. Please request a new code.');
        return;
      }

      const cleanSponsor = (sponsorId || '').trim().toUpperCase();
      if (!cleanSponsor) {
        setIsVerifyingOtp(false);
        setOtpErrorMessage('Sponsor referral code is strictly mandatory.');
        return;
      }

      let verifiedSponsor = null;
      if (cleanSponsor === 'CS123456' || cleanSponsor === 'ROOT' || cleanSponsor === 'HEAD') {
        verifiedSponsor = {
          member_id: 'mem_matru',
          id: 'mem_matru',
          name: 'CyberNetworking Head Office',
          referral_code: 'CS123456'
        };
      } else if (liveSponsorInfo?.valid && (liveSponsorInfo.referral_code?.toUpperCase() === cleanSponsor || liveSponsorInfo.name)) {
        verifiedSponsor = liveSponsorInfo;
      } else {
        const serverCheck = await lookupReferral(cleanSponsor);
        if (!serverCheck.valid) {
          setIsVerifyingOtp(false);
          setOtpErrorMessage(serverCheck.message || 'Sponsor verification failed');
          return;
        }
        verifiedSponsor = serverCheck.member;
      }

      // OTP Verified! Register user and advance directly to ZEX connect
      const registration = await registerUser({
        fullName: fullName.trim(),
        email: cleanEmail,
        mobile: (mobile || '').replace(/\D/g, ''),
        password,
        sponsorId: cleanSponsor,
        sponsorMemberId: verifiedSponsor?.member_id || verifiedSponsor?.id || cleanSponsor,
        sponsorName: verifiedSponsor?.name || 'CyberNetworking Partner',
        isSeller
      });

      if (registration && !registration.ok) {
        setIsVerifyingOtp(false);
        setOtpErrorMessage(registration.error || 'Registration failed to save. Please try logging in.');
        return;
      }

      setIsAuthModalOpen(false);
      setIsVerifyingOtp(false);
      addToast('success', 'Email Verified!', 'Account created successfully. Redirecting to ZEX for license activation...');

      const targetMemberId = registration?.member_id || registration?.data?.id;
      if (targetMemberId && initiateZexConnect) {
        try {
          await initiateZexConnect(targetMemberId);
        } catch (e) {
          console.warn('[Post-OTP ZEX Handshake] Warning:', e);
        }
      }
    } catch (err) {
      setIsVerifyingOtp(false);
      setOtpErrorMessage(err?.message || 'Verification failed. Please try again.');
    }
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
    addToast('success', 'Email Gateway Configured', 'Email gateway key saved. Real transactional verification emails will be dispatched.');
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

    setIsResettingPassword(true);
    try {
      const resetRes = await resetUserPassword({ email: cleanEmail, newPassword });
      if (!resetRes || !resetRes.ok) {
        setForgotError(resetRes?.error || 'Failed to update password.');
        return;
      }

      addToast('success', 'Password Reset Successful!', 'Your password has been updated. Please sign in with your new credentials.');
      setPassword(newPassword); // Pre-fill new password for 1-click smooth login!
      setLoginErrorMessage('');
      setAuthMode('login');
      setForgotStep('request');
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setForgotError(err.message || 'Error updating password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-box ${authMode === 'register' && authStep === 'form' ? 'auth-modal-wide' : 'auth-modal-width'}`}>
        {/* Header */}
        <div className="auth-modal-header" style={{ position: 'relative' }}>
          <div className="brand-logo-text-small mb-1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png?v=2" alt="CyberNetworking Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 2px 8px rgba(6, 182, 212, 0.25)' }} />
            <div>
              <span className="brand-title">CyberNetworking</span>
            </div>
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
                        Sponsor Referral Code <span style={{ color: '#EF4444' }}>*</span>
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
                        <span className="badge badge-rose font-2xs font-bold">
                          Mandatory
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
                      placeholder="e.g. CS743498 (Mandatory)"
                      required
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
                          <div className="sponsor-direct-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.35 }}>
                              <strong>Sponsor Code Required:</strong> Enter a valid referral code from the partner who invited you.
                            </span>
                          </div>
                        );
                      }

                      if (isVerifyingSponsor) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <RotateCcw size={15} className="spin text-primary-blue" />
                            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              Verifying sponsor code with server...
                            </span>
                          </div>
                        );
                      }

                      if (liveSponsorInfo?.valid) {
                        return (
                          <div className="sponsor-verified-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <ShieldCheck size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#065F46', lineHeight: 1.35 }}>
                              Active Sponsor: <strong style={{ color: '#0F172A' }}>{liveSponsorInfo.name}</strong> <span className="code-font" style={{ color: '#2563EB', fontWeight: 'bold' }}>({liveSponsorInfo.referral_code})</span>
                            </span>
                          </div>
                        );
                      }

                      if (liveSponsorInfo && !liveSponsorInfo.valid) {
                        return (
                          <div className="sponsor-error-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '9px 12px', minHeight: '44px' }}>
                            <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.35 }}>
                              {liveSponsorInfo.message || `Sponsor code "${clean}" not recognized.`}
                            </span>
                          </div>
                        );
                      }

                      return null;
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

                {formErrorMessage && (
                  <div className="otp-error-banner mb-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 12px', color: '#B91C1C', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <AlertCircle size={16} className="text-rose flex-shrink-0" />
                    <span>{formErrorMessage}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSendingOtp}
                  className="btn btn-primary full-width btn-lg flex-center gap-2"
                  style={{ marginTop: '4px', cursor: isSendingOtp ? 'not-allowed' : 'pointer', opacity: isSendingOtp ? 0.75 : 1 }}
                >
                  {isSendingOtp ? (
                    <>
                      <RotateCcw size={16} className="spin" />
                      <span>Verifying & Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Verification OTP & Continue</span>
                      <ArrowRight size={16} />
                    </>
                  )}
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
                    onClick={() => {
                      setAuthStep('form');
                      setOtpErrorMessage('');
                    }}
                    className="btn btn-secondary btn-xs ml-auto"
                  >
                    Change Email
                  </button>
                </div>

                {otpErrorMessage && (
                  <div className="otp-error-banner" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 12px', color: '#B91C1C', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      <RotateCcw size={13} className={isSendingOtp ? 'spin' : ''} />
                      <span>{isSendingOtp ? 'Sending...' : 'Resend Verification Code'}</span>
                    </button>
                  ) : (
                    <span className="text-muted text-xs">
                      Resend code in <strong>{otpCountdown}s</strong>
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                  className="btn btn-primary full-width btn-lg mt-4 flex-center gap-2"
                  style={{ cursor: (isVerifyingOtp || otpInput.trim().length !== 6) ? 'not-allowed' : 'pointer', opacity: (isVerifyingOtp || otpInput.trim().length !== 6) ? 0.75 : 1 }}
                >
                  {isVerifyingOtp ? (
                    <>
                      <RotateCcw size={18} className="spin" />
                      <span>Verifying OTP & Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Verify OTP & Create Account</span>
                    </>
                  )}
                </button>

                {/* ZEX Auth Guidance Note */}
                <div style={{ marginTop: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  <Zap size={15} style={{ flexShrink: 0, color: '#2563EB', marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#0F172A' }}>Next Step (ZEX Link):</strong> If you are new to ZEX, select <strong>Phone (SMS OTP)</strong> or <strong>Continue with Google</strong> on ZEX for instant 1-click verification.
                  </div>
                </div>

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
                  disabled={isResettingPassword}
                  className="btn btn-primary full-width btn-lg mt-2 flex-center gap-2"
                >
                  <Key size={16} />
                  <span>{isResettingPassword ? 'Updating Password...' : 'Reset & Update Password'}</span>
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
