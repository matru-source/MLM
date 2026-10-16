import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { Lock, Shield, Eye, EyeOff, ArrowLeft, AlertCircle, Key } from 'lucide-react';

export default function AdminLoginModal() {
  const { loginAdmin, navigateToUserSite, addToast } = useMlm();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please provide both administrative username and security key.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = loginAdmin({ username: username.trim(), password });
      setIsSubmitting(false);

      if (res.ok) {
        addToast('success', 'Admin Access Granted', 'Welcome to CyberShield Executive Operations.');
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setError(res.error || 'Invalid credentials. Access denied.');
        addToast('error', 'Authentication Failed', 'Invalid administrative credentials.');
      }
    }, 400);
  };

  return (
    <div className="admin-gate-overlay">
      <div className="admin-gate-card">
        {/* Top Brand & Security Header */}
        <div className="admin-gate-head">
          <div className="admin-gate-shield-icon">
            <Lock size={26} className="text-white" />
          </div>
          <span className="badge badge-amber font-2xs font-bold mb-2">
            RESTRICTED ACCESS • EXECUTIVE CONSOLE
          </span>
          <h2 className="admin-gate-title">Admin Operations Gateway</h2>
          <p className="admin-gate-subtitle">
            This terminal requires authorized executive credentials to access banking payouts, member verifications, and cryptographic gateway controls.
          </p>
        </div>

        {error && (
          <div className="admin-gate-alert">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-gate-form">
          <div className="form-group-clean">
            <label className="form-label-clean">Administrator Identifier / Email</label>
            <input
              type="text"
              required
              autoFocus
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
            disabled={isSubmitting}
            className="btn btn-primary full-width btn-lg mt-4 flex-center gap-2"
          >
            <Key size={16} />
            <span>{isSubmitting ? 'Verifying Credentials...' : 'Authenticate & Unlock Console'}</span>
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
