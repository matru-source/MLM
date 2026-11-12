import React from 'react';
import { useMlm } from '../context/MlmContext';
export default function PendingActivationView() {
  const { currentMember, openCheckout, zexLinkStatus, refreshZexStatus, logout } = useMlm();
  return <div className="pending-activation-page"><div className="pending-activation-container"><div className="pending-card">
    <h1>Welcome, {currentMember?.name || 'Partner'}</h1>
    <p>Your CyberNetworking account is waiting for a verified ZEX purchase.</p>
    <ol><li>Link your ZEX account.</li><li>Purchase the eligible plan on ZEX using that account.</li><li>Return here and wait for ZEX to confirm payment. Activation happens automatically.</li></ol>
    <p>ZEX account: {zexLinkStatus?.loading ? 'Checking…' : zexLinkStatus?.linked ? 'Linked' : 'Not linked'}</p>
    <button className="btn btn-primary" onClick={() => openCheckout('Joining')}>{zexLinkStatus?.linked ? 'Continue to ZEX purchase' : 'Link ZEX account'}</button>{' '}
    <button className="btn btn-secondary" onClick={() => { refreshZexStatus(); window.dispatchEvent(new Event('mlm:refresh')); }}>Refresh status</button>{' '}
    <button className="btn btn-secondary" onClick={logout}>Sign out</button>
    <p>Payment confirmation may take time. Contact support if it does not arrive.</p>
  </div></div></div>;
}
