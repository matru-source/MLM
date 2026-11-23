import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  ShieldCheck, 
  Key, 
  Users, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export default function PendingActivationView() {
  const { 
    currentMember, 
    initiateZexConnect,
    initiateZexPurchase, 
    zexLinkStatus, 
    refreshZexStatus, 
    logout,
    addToast 
  } = useMlm();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isZexLinked = Boolean(
    zexLinkStatus?.linked || 
    currentMember?.mlm_account?.zex_user_id || 
    currentMember?.zex_user_id
  );
  const zexUserId = zexLinkStatus?.data?.zex_user_id || currentMember?.mlm_account?.zex_user_id || currentMember?.zex_user_id;

  const handleProceedToZex = async () => {
    setIsRedirecting(true);
    try {
      const activeMemberId = currentMember?.member_id || currentMember?.id;
      if (!activeMemberId) {
        addToast('error', 'Authentication Error', 'No active member session found. Please register or log in first.');
        setIsRedirecting(false);
        return;
      }

      // If already linked, proceed directly to ZEX Payment checkout!
      if (isZexLinked) {
        addToast('info', 'Opening ZEX Checkout...', 'Redirecting to official ZEX platform to complete software license payment.');
        await initiateZexPurchase();
        return;
      }

      // Step 1: Not linked yet -> Initiate ZEX Connect Handshake
      addToast('info', 'Connecting to ZEX 4U...', 'Redirecting you to official ZEX authentication page to complete your software license activation.');
      const res = await initiateZexConnect(activeMemberId);
      if (!res?.ok) {
        addToast('error', 'Connection Error', res?.error || 'Failed to start ZEX connection session.');
        setIsRedirecting(false);
      }
    } catch (err) {
      addToast('error', 'Error', err.message);
      setIsRedirecting(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    addToast('info', 'Checking Status...', 'Verifying license activation status with the server.');
    try {
      await fetch('/api/integrations/zex/process-pending', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      }).catch(() => {});
      await refreshZexStatus();
      window.dispatchEvent(new Event('mlm:refresh'));
      setTimeout(() => {
        setIsRefreshing(false);
        const active = ['active', 'subscription_expired'].includes(currentMember?.seller_status);
        if (active) {
          addToast('success', 'Account Activated!', 'Software license payment confirmed. Unlocking partner dashboard...');
        } else {
          addToast('info', 'Verification Update', 'Your ZEX account is linked. Complete payment on ZEX to activate, or refresh once paid.');
        }
      }, 750);
    } catch (err) {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="pending-activation-page" style={{ minHeight: '100vh', background: '#F8FAFC', padding: '40px 16px' }}>
      <div className="pending-activation-container" style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Top Header Card */}
        <div className="card-white" style={{ borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px' }}>
                <Clock size={13} />
                <span>STEP 2 OF 2 • ZEX LICENSE PURCHASE REQUIRED</span>
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                Activate Your CyberNetworking Partner Account
              </h1>
              <p style={{ fontSize: '0.92rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Welcome, <strong>{currentMember?.name || 'Partner'}</strong>! Your partner profile has been created. Complete your enterprise cyber defense software license purchase on <strong>ZEX 4U</strong> to unlock your distributor matrix and referral link.
              </p>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Primary Action Box */}
          <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(6,182,212,0.06) 100%)', border: '1.5px solid #BFDBFE', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E3A8A', margin: '0 0 4px 0' }}>
                  {isZexLinked ? 'ZEX Account Linked — Complete Joining Plan Payment' : 'Connect Your ZEX Platform Account'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#3B82F6', margin: 0 }}>
                  ₹2,500 (+ 18% GST = ₹2,950) includes 5 protected device endpoint seats & 10-tier commission distribution.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleProceedToZex}
                  disabled={isRedirecting}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ExternalLink size={16} />
                  <span>{isRedirecting ? 'Connecting...' : (isZexLinked ? 'Complete Payment on ZEX ➔' : 'Proceed to ZEX Platform ➔')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="btn btn-secondary"
                  title="Refresh verification status"
                  style={{ padding: '12px', cursor: isRefreshing ? 'wait' : 'pointer' }}
                >
                  <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Provisioned Accounts Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          {/* Account 1 Card */}
          <div className="card-white" style={{ borderRadius: '14px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} className="text-primary-blue" />
              </div>
              <span className="badge badge-amber font-xs font-bold">
                Pending Plan Activation
              </span>
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Account 1: Partner MLM Account
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Direct selling distributor seat, 10-tier matrix tree placement, and automated commission wallet.
            </p>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Applicant Name:</span>
                <strong style={{ color: '#0F172A' }}>{currentMember?.name || 'Registered Partner'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Sponsor ID:</span>
                <strong className="code-font" style={{ color: '#2563EB' }}>
                  {currentMember?.sponsor_code || currentMember?.sponsor_member_id || 'CS123456'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Plan Fee:</span>
                <strong style={{ color: '#DC2626' }}>₹2,500 (+ 18% GST Unpaid)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Referral Link:</span>
                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>🔒 Unlocks after ZEX Confirmation</span>
              </div>
            </div>
          </div>

          {/* Account 2 Card */}
          <div className="card-white" style={{ borderRadius: '14px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={22} className="text-emerald" />
              </div>
              <span className={`badge ${isZexLinked ? 'badge-green' : 'badge-amber'} font-xs font-bold`}>
                {isZexLinked ? '✓ ZEX Account Linked' : '⏳ Action Required'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Account 2: Cyber Defense License
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Enterprise cybersecurity software suite with 5 multi-device endpoint protection seats.
            </p>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Software Suite:</span>
                <strong style={{ color: '#0F172A' }}>CyberNetworking Pro Enterprise</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Device Seats:</span>
                <strong style={{ color: '#2563EB' }}>5 Protected Devices</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>ZEX Identity Link:</span>
                <strong className={isZexLinked ? 'text-success' : 'text-amber'}>
                  {isZexLinked ? `✓ Linked (${zexUserId})` : '⏳ Not Linked Yet'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>License Key:</span>
                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>🔒 Issued upon ZEX Payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Compliance Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px', color: '#94A3B8', fontSize: '0.78rem' }}>
          <p style={{ margin: 0 }}>
            🔒 Direct Selling Rules 2021 & Consumer Protection Act compliant. All license purchases are provisioned via ZEX Security Cloud.
          </p>
        </div>

      </div>
    </div>
  );
}
