import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR } from '../../utils/formatters';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Building2, 
  ArrowRight,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutModal({ isOpen, onClose, initialReferralCode = 'ZEX-ALEX99' }) {
  const {
    currentMember,
    getMemberByReferral,
    processSubscriptionActivation,
    commissionRules,
    members
  } = useMlm();

  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [name, setName] = useState(currentMember?.name || '');
  const [email, setEmail] = useState(currentMember?.email || '');
  const [phone, setPhone] = useState(currentMember?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  if (!isOpen) return null;

  const referringSeller = getMemberByReferral(referralCode) || members.find(m => m.member_id === 'mem_01');

  // Preview 10-level upline payout chain
  const previewChain = [];
  let currentId = referringSeller ? referringSeller.member_id : null;
  let level = 1;

  while (currentId && level <= 10) {
    const mem = members.find(m => m.member_id === currentId);
    if (!mem) break;
    const rule = commissionRules.find(r => r.level === level) || { amount: 0 };
    previewChain.push({
      level,
      name: mem.name,
      amount: rule.amount
    });
    currentId = mem.sponsor_member_id;
    level++;
  }

  const handlePay = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const order = await processSubscriptionActivation({
        buyerName: name,
        buyerEmail: email,
        buyerPhone: phone,
        referralCode: referralCode,
        paymentMethod
      });

      setCompletedOrder(order);
      setIsSuccess(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container checkout-modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="zex-secure-badge">
              <Lock size={12} />
              <span>ZEX Authoritative Checkout</span>
            </div>
            <h2 className="modal-title">ZEX Pro Trader Membership</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {!isSuccess ? (
          <form onSubmit={handlePay} className="modal-body">
            {/* Price & Plan Banner */}
            <div className="checkout-summary-box">
              <div className="summary-row-top">
                <div>
                  <div className="plan-name">Annual Enterprise Subscription</div>
                  <div className="plan-sub">Full algorithmic trading, API access & technical signals</div>
                </div>
                <div className="plan-price-block">
                  <div className="plan-amount">{formatINR(2500)}</div>
                  <div className="plan-period">/ 1 Year Access</div>
                </div>
              </div>

              {/* Attribution info */}
              <div className="attribution-tag">
                <ShieldCheck size={14} className="text-emerald" />
                <span>
                  Originating Sales Agent: <strong>{referringSeller?.name || 'Direct Sales'}</strong> 
                  <span className="code-font ml-1">({referralCode})</span>
                </span>
              </div>
            </div>

            {/* Buyer Contact Form */}
            <div className="form-section">
              <label className="section-label">Subscriber & Account Details</label>
              <div className="form-grid-2">
                <div>
                  <label className="input-label">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="input-label">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    placeholder="+91 98000 00000"
                  />
                </div>
              </div>

              <div className="form-group-single">
                <label className="input-label">Email Address (ZEX Account Identity)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="name@example.com"
                />
              </div>

              <div className="form-group-single">
                <label className="input-label">Sponsor Referral Code</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="form-input code-font"
                  placeholder="ZEX-XXXXXX"
                />
              </div>
            </div>

            {/* Simulated Payment Method */}
            <div className="form-section">
              <label className="section-label">Select Payment Gateway Instrument</label>
              <div className="payment-options-grid">
                <label className={`payment-pill ${paymentMethod === 'UPI' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                  />
                  <QrCode size={18} />
                  <span>UPI / QR</span>
                </label>

                <label className={`payment-pill ${paymentMethod === 'CARD' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="CARD"
                    checked={paymentMethod === 'CARD'}
                    onChange={() => setPaymentMethod('CARD')}
                  />
                  <CreditCard size={18} />
                  <span>Card</span>
                </label>

                <label className={`payment-pill ${paymentMethod === 'NETBANKING' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="NETBANKING"
                    checked={paymentMethod === 'NETBANKING'}
                  />
                  <Building2 size={18} />
                  <span>NetBanking</span>
                </label>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="simulated-qr-box">
                  <div className="qr-visual">
                    <QrCode size={90} className="text-emerald" />
                  </div>
                  <div className="qr-text">
                    <div className="qr-title">Instant UPI Merchant Session</div>
                    <div className="qr-subtitle">Scan via GPay, PhonePe, Paytm, or BHIM</div>
                    <div className="qr-vpa code-font">zexmerchant@hdfcbank</div>
                  </div>
                </div>
              )}
            </div>

            {/* Frozen Sponsor Path Preview (Compliance Requirement) */}
            <div className="sponsor-preview-drawer">
              <div className="drawer-header">
                <div className="drawer-title">
                  <Layers size={14} className="text-cyan" />
                  <span>10-Level Commission Allocation Preview</span>
                </div>
                <span className="badge badge-emerald">Total Network Payout: ₹1,600</span>
              </div>
              <div className="drawer-body">
                <div className="ancestor-tags-row">
                  {previewChain.slice(0, 5).map(node => (
                    <div key={node.level} className="ancestor-mini-chip">
                      <span className="lvl-chip">L{node.level}</span>
                      <span className="name-chip">{node.name}</span>
                      <span className="amt-chip">{formatINR(node.amount)}</span>
                    </div>
                  ))}
                  {previewChain.length > 5 && (
                    <div className="ancestor-mini-chip plus-chip">
                      +{previewChain.length - 5} more uplines (Total 10)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Selling Cooling-off Disclaimer */}
            <div className="cooling-off-notice">
              <ShieldCheck size={14} className="text-amber" />
              <span>
                <strong>7-Day Statutory Cooling-Off:</strong> Full unconditional refund available within 7 days. 
                Commissions remain in hold status until cooling-off expires.
              </span>
            </div>

            {/* Actions */}
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="btn btn-primary pay-submit-btn"
              >
                {isProcessing ? (
                  <span>Processing Gateway...</span>
                ) : (
                  <>
                    <span>Pay {formatINR(2500)} & Activate</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success Screen */
          <div className="modal-body success-modal-body">
            <div className="success-icon-wrap">
              <CheckCircle2 size={56} className="text-emerald" />
            </div>
            <h3 className="success-heading">Subscription Confirmed & Activated!</h3>
            <p className="success-sub">
              ZEX Authoritative Merchant Engine has processed the ₹2,500 payment. 
              The subscription is live and server-to-server HMAC webhooks have updated the MLM commission ledger.
            </p>

            <div className="success-receipt-card">
              <div className="receipt-row">
                <span className="label">Order Reference:</span>
                <span className="val code-font">{completedOrder?.order_id}</span>
              </div>
              <div className="receipt-row">
                <span className="label">ZEX Order ID:</span>
                <span className="val code-font">{completedOrder?.zex_order_id}</span>
              </div>
              <div className="receipt-row">
                <span className="label">Subscriber:</span>
                <span className="val">{name}</span>
              </div>
              <div className="receipt-row">
                <span className="label">Direct Sales Agent:</span>
                <span className="val">{referringSeller?.name} ({referralCode})</span>
              </div>
              <div className="receipt-row">
                <span className="label">Cooling-Off Expiry:</span>
                <span className="val text-amber">7 Days (Hold Active)</span>
              </div>
            </div>

            <div className="modal-footer justify-center">
              <button onClick={onClose} className="btn btn-primary btn-lg">
                Done & View Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
