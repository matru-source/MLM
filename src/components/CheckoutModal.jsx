import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Building2, 
  Wallet,
  Lock,
  Copy,
  Check,
  ArrowRight,
  Download,
  FileText,
  UserCheck,
  AlertCircle,
  Sparkles,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { downloadTaxInvoice } from '../utils/downloadHelpers';

export default function CheckoutModal() {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    selectedPlanForCheckout, 
    completePayment,
    currentMember,
    isLoggedIn,
    setIsAuthModalOpen,
    setAuthMode,
    setCurrentPage,
    addToast
  } = useMlm();

  const [step, setStep] = useState('payment'); // 'payment' | 'confirmed'
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Net banking state
  const [selectedBank, setSelectedBank] = useState('State Bank of India');

  if (!isCheckoutOpen) return null;

  // Handle Close
  const handleClose = () => {
    setIsCheckoutOpen(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep('payment');
      setUtrNumber('');
      setUtrError('');
      setPaymentResult(null);
    }, 300);
  };

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    navigator.clipboard.writeText('cybershield.pay@icici');
    setCopiedUpi(true);
    addToast('success', 'UPI ID Copied', 'cybershield.pay@icici copied to clipboard.');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Process payment submission
  const handlePay = async (e) => {
    if (e) e.preventDefault();

    if (!isLoggedIn || !currentMember) {
      setIsCheckoutOpen(false);
      setAuthMode('register');
      setIsAuthModalOpen(true);
      addToast('warning', 'Registration Required', 'Please register your partner account before paying.');
      return;
    }

    const cleanUtr = (utrNumber || '').trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setUtrError('Please enter the 12-digit UPI Transaction Reference Number (UTR) from your payment app.');
      return;
    }

    setIsProcessing(true);
    setUtrError('');

    try {
      const result = await completePayment({
        paymentMethod: selectedMethod === 'UPI' ? 'UPI (Google Pay / PhonePe)' : selectedMethod,
        utrNumber: cleanUtr
      });

      if (result && result.ok) {
        setPaymentResult(result);
        setStep('confirmed');
        addToast('success', 'Payment Submitted for Verification', '₹2,950 Joining application submitted. Awaiting Admin bank statement check.');
      } else {
        const errorMsg = result?.error || 'Could not verify transaction reference.';
        setUtrError(errorMsg);
        addToast('error', 'Payment Submission Failed', errorMsg);
      }
    } catch (err) {
      setUtrError(err.message);
      addToast('error', 'Transaction Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download payment acknowledgment receipt
  const handleDownloadInvoice = () => {
    downloadTaxInvoice({ order: paymentResult?.order, member: currentMember });
    const orderId = paymentResult?.order?.order_id || 'CS20261010';
    addToast('info', 'Payment Acknowledgment Downloaded', `Provisional payment submission receipt #${orderId} generated & downloaded. Official GST Tax Invoice is issued upon Admin clearance.`);
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-box checkout-modal-width" 
        style={{ 
          maxWidth: '960px', 
          width: '94vw', 
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        
        {/* Top Header */}
        <div className="checkout-top-header" style={{ position: 'relative' }}>
          <div className="brand-logo-text-small">
            <span className="brand-title">CyberShield</span>
            <span className="brand-subtitle">Security Network</span>
          </div>

          <div className="secure-badge-pill">
            <ShieldCheck size={16} className="text-success" />
            <span>Secure 256-Bit SSL Checkout</span>
          </div>

          <button onClick={handleClose} className="auth-modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* If user is not logged in, prompt to register first */}
        {!isLoggedIn || !currentMember ? (
          <div className="p-6 text-center">
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <UserCheck size={32} style={{ color: '#2563EB' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Partner Registration Required</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 24px' }}>
              Please create or log into your CyberShield partner account first so that your official software license and 6-tier commission wallet are provisioned in your name.
            </p>
            <div className="flex-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setAuthMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="btn btn-primary btn-lg"
              >
                <span>Create Partner Account</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="btn btn-secondary btn-lg"
              >
                Log In
              </button>
            </div>
          </div>
        ) : step === 'payment' ? (
          /* ========================================================
             STEP 1: PAYMENT CHECKOUT & VERIFICATION
             ======================================================== */
          <div className="checkout-grid-container">
            {/* Left Column: Order Summary & Payer Details */}
            <div className="checkout-summary-column">
              <h3 className="checkout-column-title">Order Summary</h3>

              {/* Payer Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Registering Partner
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                  {currentMember.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {currentMember.email} • {currentMember.phone || 'Verified'}
                </div>
              </div>

              {/* Product Card */}
              <div className="order-item-card">
                <div className="order-item-icon bg-blue-dim">
                  <span className="order-icon-letter">🛡️</span>
                </div>
                <div>
                  <h4 className="order-item-name">CyberShield Partner Joining Membership</h4>
                  <p className="order-item-sub">One-Time Joining Fee • Enterprise Security Suite License</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="order-cost-breakdown">
                <div className="cost-row">
                  <span>Membership Joining Fee</span>
                  <span className="font-semibold">₹2,500</span>
                </div>
                <div className="cost-row">
                  <span>Statutory GST (18%)</span>
                  <span className="font-semibold">₹450</span>
                </div>
                <div className="cost-row total-row">
                  <span className="font-bold">Total Payable</span>
                  <span className="font-bold text-primary-blue text-large">₹2,950</span>
                </div>
              </div>

              {/* Trust Points */}
              <div className="checkout-trust-points">
                <div className="trust-point-item">
                  <CheckCircle2 size={16} className="text-success" />
                  <span>Dual Accounts Provisioned via Official API</span>
                </div>
                <div className="trust-point-item">
                  <CheckCircle2 size={16} className="text-success" />
                  <span>Instant 6-Level Direct Selling Authorization</span>
                </div>
                <div className="trust-point-item">
                  <CheckCircle2 size={16} className="text-success" />
                  <span>Consumer Protection (Direct Selling) Rules, 2021 Compliant</span>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Options & UTR Input */}
            <div className="checkout-methods-column">
              <h3 className="checkout-column-title">Select Payment Method</h3>

              <div className="payment-options-list">
                {/* Option 1: UPI */}
                <label className={`payment-method-row ${selectedMethod === 'UPI' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="UPI"
                    checked={selectedMethod === 'UPI'}
                    onChange={() => setSelectedMethod('UPI')}
                  />
                  <div className="method-details">
                    <div className="method-name font-bold">UPI (Google Pay, PhonePe, Paytm, BHIM)</div>
                    <div className="method-icons-preview">
                      <span className="app-pill">GPay</span>
                      <span className="app-pill">PhonePe</span>
                      <span className="app-pill">Paytm</span>
                      <span className="app-pill">BHIM</span>
                    </div>
                  </div>
                </label>

                {/* UPI Instructions & QR Screen */}
                {selectedMethod === 'UPI' && (
                  <div style={{ background: '#F8FAFC', border: '1.5px solid #DBEAFE', borderRadius: '12px', padding: '14px', marginTop: '8px' }}>
                    
                    {/* Official UPI ID Box */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Official Corporate UPI ID</span>
                        <div className="code-font font-bold text-primary-blue" style={{ fontSize: '0.95rem' }}>
                          cybershield.pay@icici
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px' }}
                      >
                        {copiedUpi ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* QR Code Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '90px', height: '90px', background: '#0F172A', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0, padding: '6px', textAlign: 'center' }}>
                        <QrCode size={48} style={{ color: '#38BDF8' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', marginTop: '2px' }}>SCAN & PAY</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                        <strong style={{ color: '#0F172A' }}>Scan via any UPI App</strong>
                        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                          Transfer exactly <strong style={{ color: '#2563EB' }}>₹2,950</strong> to the UPI ID above or scan the QR.
                        </p>
                        <span className="badge badge-green font-2xs mt-1">Verified Merchant</span>
                      </div>
                    </div>

                    {/* 12-Digit UTR Number Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                        12-Digit UPI Reference / UTR Number <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => {
                          setUtrNumber(e.target.value.replace(/\s+/g, ''));
                          setUtrError('');
                        }}
                        placeholder="e.g. 428910293812"
                        className={`form-input-clean code-font font-bold ${utrError ? 'input-border-red' : ''}`}
                        style={{ background: '#FFFFFF' }}
                        maxLength={20}
                      />
                      {utrError ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>
                          <AlertCircle size={13} />
                          <span>{utrError}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '3px' }}>
                          Enter the 12-digit UTR / Ref No. found in your Google Pay, PhonePe, or Paytm receipt.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Option 2: Cards */}
                <label className={`payment-method-row ${selectedMethod === 'CARD' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="CARD"
                    checked={selectedMethod === 'CARD'}
                    onChange={() => setSelectedMethod('CARD')}
                  />
                  <div className="method-details">
                    <div className="method-name font-bold">Credit / Debit Card</div>
                    <div className="method-icons-preview">
                      <span className="card-brand">VISA</span>
                      <span className="card-brand">Mastercard</span>
                      <span className="card-brand">RuPay</span>
                    </div>
                  </div>
                </label>

                {selectedMethod === 'CARD' && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px', marginTop: '6px' }}>
                    <div className="form-group-clean mb-2">
                      <label className="form-label-clean" style={{ fontSize: '0.75rem' }}>Card Number</label>
                      <input
                        type="text"
                        placeholder="4532 •••• •••• 8892"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="form-input-clean code-font"
                        style={{ background: '#FFFFFF' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group-clean mb-0">
                        <label className="form-label-clean" style={{ fontSize: '0.75rem' }}>Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="form-input-clean code-font"
                          style={{ background: '#FFFFFF' }}
                        />
                      </div>
                      <div className="form-group-clean mb-0">
                        <label className="form-label-clean" style={{ fontSize: '0.75rem' }}>CVV</label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="form-input-clean code-font"
                          style={{ background: '#FFFFFF' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 3: Net Banking */}
                <label className={`payment-method-row ${selectedMethod === 'NETBANKING' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="NETBANKING"
                    checked={selectedMethod === 'NETBANKING'}
                    onChange={() => setSelectedMethod('NETBANKING')}
                  />
                  <div className="method-details">
                    <div className="method-name font-bold">Net Banking</div>
                    <div className="method-sub-text">All major Indian banks supported</div>
                  </div>
                </label>

                {selectedMethod === 'NETBANKING' && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px', marginTop: '6px' }}>
                    <label className="form-label-clean" style={{ fontSize: '0.75rem' }}>Select Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="form-input-clean"
                      style={{ background: '#FFFFFF' }}
                    >
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                    </select>
                  </div>
                )}

                {/* Option 4: Wallets */}
                <label className={`payment-method-row ${selectedMethod === 'WALLETS' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="WALLETS"
                    checked={selectedMethod === 'WALLETS'}
                    onChange={() => setSelectedMethod('WALLETS')}
                  />
                  <div className="method-details">
                    <div className="method-name font-bold">Wallets (Paytm, Amazon Pay, etc.)</div>
                    <div className="method-sub-text">Instant mobile wallet checkout</div>
                  </div>
                </label>
              </div>

              {/* Submit Payment CTA */}
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing}
                className="btn btn-primary full-width btn-lg mt-4"
                style={{ padding: '14px', fontSize: '1rem', fontWeight: 700 }}
              >
                <Lock size={16} />
                <span>
                  {isProcessing 
                    ? 'Verifying & Provisioning Accounts...' 
                    : 'Verify & Submit Payment (₹2,950)'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             STEP 2: PAYMENT CONFIRMATION RECEIPT & TAX INVOICE
             ======================================================== */
          <div style={{ padding: '20px 28px' }}>
            {/* Header Box */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Clock size={28} style={{ color: '#D97706' }} />
              </div>
              <span className="badge badge-amber font-xs font-bold mb-1" style={{ display: 'inline-block' }}>Awaiting Admin Bank Verification</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 4px' }}>
                Payment Reference Submitted!
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.84rem', maxWidth: '780px', margin: '0 auto', lineHeight: '1.45' }}>
                Your payment submission for <strong>₹2,950</strong> has been received with UTR reference <strong>{paymentResult?.order?.utr_number}</strong>. Our accounts desk verifies incoming bank credits before activating full distributor privileges.
              </p>
            </div>

            {/* Official Order Receipt Card */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 18px', marginBottom: '14px' }}>
              <div className="flex-between items-center mb-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} className="text-primary-blue" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Provisional Payment Acknowledgment</span>
                </div>
                <span className="badge badge-amber font-xs font-bold">AWAITING ADMIN CLEARANCE ⏳</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Order Reference</span>
                  <span className="code-font font-bold text-primary-blue" style={{ fontSize: '0.88rem' }}>
                    #{paymentResult?.order?.order_id || 'CS-PENDING'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Payment Method</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {paymentResult?.order?.payment_method || 'UPI (Google Pay / PhonePe)'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>UTR / Reference No.</span>
                  <span className="code-font font-semibold" style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                    {paymentResult?.order?.utr_number || 'UTR-CS-PENDING'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Amount Paid (incl. 18% GST)</span>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                    ₹2,950
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Accounts Provisioned Box */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Dual Accounts Pre-Configured via Official API
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Account 1: MLM Account */}
                <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '12px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Account 1: Partner MLM Account
                  </div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ color: '#64748B' }}>Member ID: </span>
                    <strong className="code-font">{currentMember?.member_id || 'mem_pending'}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ color: '#64748B' }}>Distributor Code: </span>
                    <strong className="code-font text-primary-blue">{currentMember?.referral_code || 'CS-PENDING'}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748B' }}>Status: </span>
                    <strong className="text-amber font-semibold">Pending Admin Verification ⏳</strong>
                  </div>
                </div>

                {/* Account 2: Software License */}
                <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Account 2: Cyber Defense License
                  </div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ color: '#64748B' }}>License Key: </span>
                    <strong className="code-font text-muted" style={{ fontSize: '0.75rem' }}>
                      Locked (Unlocks Upon Bank Verification)
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ color: '#64748B' }}>Device Seats: </span>
                    <strong>5 Protected Devices</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748B' }}>Endpoint Suite: </span>
                    <strong className="text-primary-blue">CyberShield Pro</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '11px 18px', fontSize: '0.88rem' }}
              >
                <Download size={16} />
                <span>Download Payment Acknowledgment (PDF)</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setCurrentPage('dashboard');
                }}
                className="btn btn-primary"
                style={{ flex: 1.2, padding: '11px 22px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                <span>Track Verification Status</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
