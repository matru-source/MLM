import React, { useState, useEffect } from 'react';
import { useMlm } from '../context/MlmContext';
import { Lock, Shield, Eye, EyeOff, ArrowLeft, AlertCircle, Key, Clock } from 'lucide-react';

export default function AdminLoginModal() {
  const { loginAdmin, navigateToUserSite, addToast } = useMlm();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(() => {
    try {
      const stored = localStorage.getItem('cybershield_admin_lockout_until');
      if (stored) {
        const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  });

  // Live countdown timer for lockout
  useEffect(() => {
    let timer = null;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev <= 1) {
            localStorage.removeItem('cybershield_admin_lockout_until');
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockoutSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (lockoutSeconds > 0) {
      setError(`Terminal locked. Please wait ${Math.ceil(lockoutSeconds / 60)} minutes (${lockoutSeconds}s) before trying again.`);
      return;
    }

    if (!username.trim() || !password) {
      setError('Please provide both administrative username and security key.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginAdmin({ username: username.trim(), password });
    setIsSubmitting(false);

    if (res.ok) {
      localStorage.removeItem('cybershield_admin_lockout_until');
      addToast('success', 'Admin Access Granted', 'Welcome to CyberNetworking Executive Operations.');
    } else {
      if (res.locked) {
        const secs = res.remainingSeconds || 900;
        setLockoutSeconds(secs);
        localStorage.setItem('cybershield_admin_lockout_until', (Date.now() + secs * 1000).toString());
        setError(res.error || `Too many failed attempts. Terminal locked for ${Math.ceil(secs / 60)} minutes.`);
        addToast('error', 'Terminal Locked', 'Security threshold exceeded. 15-minute lockout enforced.');
      } else {
        const attemptsMsg = res.remainingAttempts !== undefined ? ` (${res.remainingAttempts} attempts remaining before lockout)` : '';
        setError((res.error || 'Invalid credentials. Access denied.') + attemptsMsg);
        addToast('error', 'Authentication Failed', 'Invalid administrative credentials.');
      }
    }
  };

  return (
    <div className="admin-gate-overlay">
      <div className="admin-gate-card">
        {/* Top Brand & Security Header */}
        <div className="admin-gate-head">
          <div className="admin-gate-shield-icon" style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
            <img src="/logo.png?v=2" alt="CyberNetworking Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 24px rgba(6, 182, 212, 0.35)' }} />
          </div>
          <span className="badge badge-amber font-2xs font-bold mb-2">
            RESTRICTED ACCESS • EXECUTIVE CONSOLE
          </span>
          <h2 className="admin-gate-title">Admin Operations Gateway</h2>
          <p className="admin-gate-subtitle">
            This terminal requires authorized executive credentials to access banking payouts, member verifications, and cryptographic gateway controls.
          </p>
        </div>

        {lockoutSeconds > 0 ? (
          <div className="admin-gate-alert" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444', color: '#EF4444' }}>
            <Clock size={16} className="shrink-0" />
            <span>
              <strong>Terminal Locked for Security:</strong> Too many consecutive failed attempts. Please wait <strong>{Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s</strong> before attempting to unlock again.
            </span>
          </div>
        ) : error ? (
          <div className="admin-gate-alert">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="admin-gate-form">
          <div className="form-group-clean">
            <label className="form-label-clean">Administrator Identifier / Email</label>
            <input
              type="text"
              required
              autoFocus
              disabled={lockoutSeconds > 0}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@cybershield.network"
              className="form-input-clean"
            />
          </div>

          <div className="form-group-clean">
            <div className="flex-between items-center">
              <label className="form-label-clean mb-0">Master Executive Security Passphrase</label>
            </div>
            <div className="relative-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={lockoutSeconds > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master admin passphrase"
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
            disabled={isSubmitting || lockoutSeconds > 0}
            className="btn btn-primary full-width btn-lg mt-4 flex-center gap-2"
          >
            <Key size={16} />
            <span>
              {lockoutSeconds > 0 
                ? `Terminal Locked (${Math.floor(lockoutSeconds / 60)}m ${lockoutSeconds % 60}s)` 
                : isSubmitting 
                  ? 'Verifying Credentials...' 
                  : 'Authenticate & Unlock Console'}
            </span>
          </button>

          <div className="admin-gate-footer mt-4 flex-between items-center text-xs text-muted">
            <button
              type="button"
              onClick={navigateToUserSite}
              className="btn btn-secondary btn-sm flex-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Return to Public Site</span>
            </button>
            <span className="code-font text-2xs">Port: 443 (SSL/TLS 1.3)</span>
          </div>
        </form>
      </div>
    </div>
  );
}
