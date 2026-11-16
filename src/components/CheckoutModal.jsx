import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';

export default function CheckoutModal() {
  const { isCheckoutOpen, setIsCheckoutOpen, currentMember, zexLinkStatus, initiateZexConnect, addToast } = useMlm();
  const [busy, setBusy] = useState(false);
  if (!isCheckoutOpen) return null;
  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!zexLinkStatus?.linked) {
        const result = await initiateZexConnect(currentMember?.member_id || currentMember?.id);
        if (!result.ok) throw new Error(result.error || 'Unable to link ZEX');
      } else {
        const response = await fetch('/api/integrations/zex/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'ZEX checkout is unavailable');
        window.location.assign(result.purchase_url);
      }
    } catch (error) { addToast('error', 'Unable to continue', error.message); }
    finally { setBusy(false); }
  };
  return <div className="modal-overlay zex-checkout-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setIsCheckoutOpen(false); }}>
    <section className="zex-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="zex-checkout-title" aria-describedby="zex-checkout-description">
      <button className="zex-checkout-close" type="button" aria-label="Close" onClick={() => setIsCheckoutOpen(false)}>×</button>
      <div className="zex-checkout-mark" aria-hidden="true">Z</div>
      <div className="zex-checkout-eyebrow">Secure checkout with ZEX</div>
      <h2 id="zex-checkout-title">{zexLinkStatus?.linked ? 'Continue to your ZEX plan' : 'Connect your ZEX account'}</h2>
      <p className="zex-checkout-lead" id="zex-checkout-description">
        {zexLinkStatus?.linked ? 'Your accounts are connected. Continue to ZEX to review the plan and complete payment.' : 'Sign in to your ZEX account, or create one there, to connect it with CyberNetworking.'}
      </p>
      <div className="zex-checkout-steps" aria-label="What happens next">
        <div><span>1</span><p><strong>{zexLinkStatus?.linked ? 'Review your plan' : 'Connect your account'}</strong><small>{zexLinkStatus?.linked ? 'ZEX securely opens your plan.' : 'Sign in or create an account on ZEX.'}</small></p></div>
        <div><span>2</span><p><strong>Pay on ZEX</strong><small>Your payment is handled by ZEX.</small></p></div>
        <div><span>3</span><p><strong>Get activated automatically</strong><small>We activate your account after ZEX confirms payment.</small></p></div>
      </div>
      <div className="zex-checkout-note">Returning to CyberNetworking alone does not confirm payment. Activation follows ZEX’s verified payment notice.</div>
      <div className="zex-checkout-actions">
        <button className="btn btn-primary" onClick={start} disabled={busy || zexLinkStatus?.loading}>{busy ? 'Connecting…' : zexLinkStatus?.linked ? 'Continue to ZEX' : 'Connect with ZEX'}</button>
        <button className="zex-checkout-cancel" type="button" onClick={() => setIsCheckoutOpen(false)}>Maybe later</button>
      </div>
      <div className="zex-checkout-security"><span aria-hidden="true">🔒</span> Payment details are entered on ZEX</div>
    </section>
  </div>;
}
