import React from 'react';
import { ShieldAlert, RefreshCw, Home, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

/**
 * Enterprise React Error Boundary
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error, and renders a fallback UI instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary Captured Error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleResetAndRecover = () => {
    try {
      sessionStorage.clear();
      // Keep essential tokens but clear potentially corrupted state
      const referred = localStorage.getItem('cybershield_referred_code');
      localStorage.clear();
      if (referred) localStorage.setItem('cybershield_referred_code', referred);
    } catch (e) {
      console.warn('Storage reset warning:', e);
    }
    window.location.href = '/';
  };

  handleCopyDetails = () => {
    const errorDetails = `Error: ${this.state.error?.toString()}\n\nStack:\n${this.state.error?.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b132b',
          padding: '24px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#f8fafc'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#1c2541',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '36px 32px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            {/* Top Shield Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '20px'
            }}>
              <ShieldAlert size={15} />
              <span>Safety Shield Active • Error Recovered</span>
            </div>

            {/* Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <AlertCircle size={32} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px', color: '#ffffff' }}>
              Something went wrong, but your data is safe.
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 24px' }}>
              The application encountered an unexpected display issue. The CyberShield Resilience Shield caught it to prevent data loss. You can reload or return to the dashboard safely.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Home size={14} />
                <span>Return to Home</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndRecover}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  fontWeight: 500,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Reset Session Cache
              </button>
            </div>

            {/* Collapsible Technical Error Details */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{this.state.showDetails ? 'Hide Diagnostic Details' : 'Show Diagnostic Details'}</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div style={{
                  marginTop: '12px',
                  textAlign: 'left',
                  backgroundColor: '#0a0f1d',
                  borderRadius: '8px',
                  padding: '14px',
                  border: '1px solid #1e293b',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#e2e8f0',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  position: 'relative'
                }}>
                  <button
                    type="button"
                    onClick={this.handleCopyDetails}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {this.state.copied ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
                    <span>{this.state.copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <strong style={{ color: '#f87171' }}>{this.state.error?.toString()}</strong>
                  <div style={{ marginTop: '8px', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                    {this.state.errorInfo?.componentStack || this.state.error?.stack || 'No stack available'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
