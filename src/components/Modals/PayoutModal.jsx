import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR } from '../../utils/formatters';
import { X, Wallet, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function PayoutModal({ isOpen, onClose, member }) {
  const { getMemberWallet, requestPayout } = useMlm();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  const wallet = getMemberWallet(member.member_id);
  const numAmount = Number(amount) || 0;
  const tds = Math.round(numAmount * 0.05); // 5% TDS
  const netAmount = Math.max(0, numAmount - tds);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (numAmount < 500) {
      setError('Minimum withdrawal request is ₹500.');
      return;
    }
    if (numAmount > wallet.available) {
      setError(`Requested amount exceeds available balance of ${formatINR(wallet.available)}.`);
      return;
    }

    const success = requestPayout(member.member_id, numAmount);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="zex-secure-badge">
              <Wallet size={12} />
              <span>Section 194H Compliant Payout</span>
            </div>
            <h2 className="modal-title">Request Commission Payout</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Balance card */}
          <div className="payout-balance-card">
            <div className="balance-info">
              <span className="balance-label">Available for Withdrawal</span>
              <div className="balance-val text-emerald">{formatINR(wallet.available)}</div>
            </div>
            <div className="pending-badge-wrap">
              <span className="badge badge-amber">{formatINR(wallet.pending)} in Cooling-Off Hold</span>
            </div>
          </div>

          {error && (
            <div className="form-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-section">
            <label className="input-label">Withdrawal Amount (INR)</label>
            <div className="input-with-max">
              <input
                type="number"
                min="500"
                max={wallet.available}
                step="50"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input code-font"
                placeholder="Enter amount (min ₹500)"
              />
              <button
                type="button"
                onClick={() => setAmount(wallet.available.toString())}
                className="btn-max"
              >
                Max
              </button>
            </div>
          </div>

          {/* Tax breakdown */}
          {numAmount > 0 && (
            <div className="tax-breakdown-card">
              <div className="tax-row">
                <span>Gross Withdrawal:</span>
                <span className="code-font">{formatINR(numAmount)}</span>
              </div>
              <div className="tax-row">
                <span>Tax Deducted at Source (TDS 5% under Sec 194H):</span>
                <span className="code-font text-rose">-{formatINR(tds)}</span>
              </div>
              <div className="tax-row net-payout-row">
                <span>Net Credited to Verified Bank Account:</span>
                <span className="code-font text-emerald font-bold">{formatINR(netAmount)}</span>
              </div>
            </div>
          )}

          {/* Bank target */}
          <div className="settlement-target-box">
            <ShieldCheck size={16} className="text-emerald" />
            <div>
              <div className="target-title">Settlement Destination</div>
              <div className="target-sub">
                {member.kyc?.bank_name} • Account ending in {member.kyc?.bank_account_number?.slice(-4) || 'XXXX'}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={numAmount < 500 || numAmount > wallet.available}
              className="btn btn-primary"
            >
              <span>Submit Withdrawal Request</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
