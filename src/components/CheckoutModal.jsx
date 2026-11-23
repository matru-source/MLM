import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { ShieldCheck, ExternalLink, X, RefreshCw } from 'lucide-react';

export default function CheckoutModal() {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    currentMember, 
    initiateZexConnect, 
    zexLinkStatus, 
    refreshZexStatus,
    addToast 
  } = useMlm();
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isCheckoutOpen) return null;

  const handleProceed = async () => {
    setIsRedirecting(true);
    try {
      const memberId = currentMember?.member_id || currentMember?.id;
      if (!memberId) {
        addToast('error', 'Authentication Error', 'No active partner session found. Please register or sign in first.');
        setIsRedirecting(false);
        return;
      }
      const res = await initiateZexConnect(memberId);
      if (!res?.ok) {
        addToast('error', 'Connection Error', res?.error || 'Unable to redirect to ZEX platform.');
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('[CheckoutModal] Redirect error:', err);
      addToast('error', 'Redirect Error', err.message);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={() => setIsCheckoutOpen(false)}>
      <div className="admin-modal-card" style={{ maxWidth: '480px', width: '92%', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header flex-between items-center p-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} className="text-primary-blue" />
            </div>
            <div>
              <h3 className="font-bold text-base text-main" style={{ margin: 0 }}>License Activation via ZEX</h3>
              <p className="text-xs text-muted" style={{ margin: 0 }}>Official ZEX 4U Security Gateway</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsCheckoutOpen(false)}
            className="btn-icon-close"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-col gap-3">
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
              CyberNetworking partners activate their direct selling license and enterprise cyber defense software suite directly via <strong>ZEX 4U</strong>.
            </p>
            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748B' }}>
              <div>• <strong>Joining Plan:</strong> ₹2,500 (+ 18% GST = ₹2,950)</div>
              <div>• <strong>Includes:</strong> 5-Device Software License + 10-Tier Commission Wallet</div>
              <div>• <strong>ZEX Account Status:</strong> {zexLinkStatus?.linked ? '✓ Linked' : '⏳ Pending Connection'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={handleProceed}
              disabled={isRedirecting}
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '12px 18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)'
              }}
            >
              <ExternalLink size={16} />
              <span>{isRedirecting ? 'Connecting to ZEX...' : 'Proceed to ZEX Platform ➔'}</span>
            </button>
            <button
              type="button"
              onClick={() => { refreshZexStatus(); window.dispatchEvent(new Event('mlm:refresh')); }}
              className="btn btn-secondary"
              title="Refresh ZEX connection status"
              style={{ padding: '12px' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
            🔒 All transactions are secured with 256-bit encryption. Zero internal UPI forms.
          </p>
        </div>
      </div>
    </div>
  );
}
