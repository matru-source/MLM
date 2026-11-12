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
  return <div className="modal-overlay"><div className="modal-box" role="dialog" aria-modal="true" aria-label="Continue to ZEX">
    <h2>Continue with ZEX</h2>
    <p>{zexLinkStatus?.linked ? 'Your ZEX account is linked. Continue to ZEX to view the plan and pay securely.' : 'First link your ZEX account. You can sign in or create one on ZEX.'}</p>
    <p>Your CyberNetworking account activates after ZEX confirms an eligible product payment. Returning from checkout does not confirm payment.</p>
    <button className="btn btn-primary" onClick={start} disabled={busy || zexLinkStatus?.loading}>{busy ? 'Please wait…' : zexLinkStatus?.linked ? 'Continue to ZEX purchase' : 'Link ZEX account'}</button>
    <button className="btn btn-secondary" onClick={() => setIsCheckoutOpen(false)}>Close</button>
  </div></div>;
}
