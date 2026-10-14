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
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutModal() {
  const { isCheckoutOpen, setIsCheckoutOpen, selectedPlanForCheckout, completePayment } = useMlm();
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isCheckoutOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      completePayment(selectedMethod === 'UPI' ? 'UPI (Google Pay)' : selectedMethod);
      setIsProcessing(false);
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 }
      });
    }, 1000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box checkout-modal-width">
        {/* Top Header Matching Screen 4 */}
        <div className="checkout-top-header">
          <div className="brand-logo-text-small">
            <span className="brand-title">CyberShield</span>
            <span className="brand-subtitle">Security Network</span>
          </div>

          <div className="secure-badge-pill">
            <ShieldCheck size={16} className="text-success" />
            <span>Secure 256-Bit SSL Checkout</span>
          </div>

          <button onClick={() => setIsCheckoutOpen(false)} className="close-checkout-btn">
            <X size={18} />
          </button>
        </div>

        {/* 2-Column Checkout Layout Matching Screen 4 */}
        <div className="checkout-grid-container">
          {/* Left Column: Order Summary */}
          <div className="checkout-summary-column">
            <h3 className="checkout-column-title">Order Summary</h3>

            <div className="order-item-card">
              <div className="order-item-icon bg-blue-dim">
                <span className="order-icon-letter">🛡️</span>
              </div>
              <div>
                <h4 className="order-item-name">CyberShield {selectedPlanForCheckout} Plan</h4>
                <p className="order-item-sub">Enterprise Cyber Security Suite</p>
              </div>
            </div>

            <div className="order-cost-breakdown">
              <div className="cost-row">
                <span>Subtotal</span>
                <span className="font-semibold">₹2,500</span>
              </div>
              <div className="cost-row">
                <span>GST (18%)</span>
                <span className="font-semibold">₹450</span>
              </div>
              <div className="cost-row total-row">
                <span className="font-bold">Total</span>
                <span className="font-bold text-primary-blue text-large">₹2,950</span>
              </div>
            </div>

            {/* 4 Trust Points (Matching Screen 4) */}
            <div className="checkout-trust-points">
              <div className="trust-point-item">
                <CheckCircle2 size={16} className="text-success" />
                <span>Secure Payment (Razorpay/Stripe)</span>
              </div>
              <div className="trust-point-item">
                <CheckCircle2 size={16} className="text-success" />
                <span>Payment processed in ZEX account</span>
              </div>
              <div className="trust-point-item">
                <CheckCircle2 size={16} className="text-success" />
                <span>Instant subscription activation</span>
              </div>
              <div className="trust-point-item">
                <CheckCircle2 size={16} className="text-success" />
                <span>Eligible for MLM commissions</span>
              </div>
            </div>
          </div>

          {/* Right Column: Select Payment Method */}
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
                  <div className="method-name">UPI (Google Pay, PhonePe, etc.)</div>
                  <div className="method-icons-preview">
                    <span className="app-pill">GPay</span>
                    <span className="app-pill">PhonePe</span>
                    <span className="app-pill">Paytm</span>
                  </div>
                </div>
              </label>

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
                  <div className="method-name">Credit / Debit Card</div>
                  <div className="method-icons-preview">
                    <span className="card-brand">VISA</span>
                    <span className="card-brand">Mastercard</span>
                    <span className="card-brand">RuPay</span>
                  </div>
                </div>
              </label>

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
                  <div className="method-name">Net Banking</div>
                  <div className="method-sub-text">All major Indian banks supported</div>
                </div>
              </label>

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
                  <div className="method-name">Wallets (Paytm, Amazon Pay, etc.)</div>
                  <div className="method-sub-text">Instant mobile wallet checkout</div>
                </div>
              </label>
            </div>

            {/* Submit Button (Matching Screen 4) */}
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="btn btn-primary full-width btn-lg mt-4"
            >
              <Lock size={16} />
              <span>{isProcessing ? 'Processing Payment...' : 'Pay ₹2,950 Securely'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
