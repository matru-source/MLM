import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  CheckCircle, 
  Filter, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import PayoutModal from '../Modals/PayoutModal';

export default function WalletLedger({ memberId }) {
  const { currentMember, getMemberWallet, walletLedger = [], transactions = [] } = useMlm();
  const [filterType, setFilterType] = useState('ALL');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const wallet = getMemberWallet ? getMemberWallet(memberId) : { available: 0, pending: 0, paid: 0, totalEarned: 0 };
  const rawLedger = Array.isArray(walletLedger) && walletLedger.length > 0 
    ? walletLedger 
    : (Array.isArray(transactions) ? transactions.map(t => ({
        ledger_id: t.id,
        member_id: t.member_id || memberId,
        created_at: t.created_at || new Date().toISOString(),
        transaction_type: t.type === 'credit' ? 'COMMISSION_CREDIT' : 'PAYOUT_DEBIT',
        reference_id: t.payoutId || t.utr_number || t.id,
        description: t.description || 'Transaction',
        balance_effect: t.amount >= 0 ? 'CREDIT' : 'DEBIT',
        amount: t.amount || 0
      })) : []);

  const memberEntries = rawLedger.filter(l => l.member_id === memberId || !l.member_id || l.member_id === currentMember?.member_id);

  const filteredEntries = memberEntries.filter(entry => {
    if (filterType === 'ALL') return true;
    if (filterType === 'COMMISSION') return entry.transaction_type.startsWith('COMMISSION');
    if (filterType === 'PAYOUT') return entry.transaction_type.startsWith('PAYOUT');
    if (filterType === 'CLAWBACK') return entry.transaction_type === 'REFUND_CLAWBACK';
    return true;
  });

  return (
    <div className="wallet-ledger-container">
      {/* Wallet Balance Cards Grid */}
      <div className="wallet-cards-grid">
        {/* Available Balance */}
        <div className="balance-summary-card glass-panel border-emerald-card">
          <div className="card-top-row">
            <span className="card-title">Available for Payout</span>
            <div className="card-icon-wrap bg-emerald-dim">
              <Wallet size={18} className="text-emerald" />
            </div>
          </div>
          <div className="card-amount-large text-emerald">
            {formatINR(wallet.available)}
          </div>
          <div className="card-footer-action">
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={wallet.available < 500}
              className="btn btn-primary btn-sm full-width"
            >
              <span>Request Withdrawal</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Pending (30-Day Cooling-off Hold) */}
        <div className="balance-summary-card glass-panel">
          <div className="card-top-row">
            <span className="card-title">Pending (30-Day Cooling-Off)</span>
            <div className="card-icon-wrap bg-amber-dim">
              <Clock size={18} className="text-amber" />
            </div>
          </div>
          <div className="card-amount-large text-amber">
            {formatINR(wallet.coolingOff !== undefined ? wallet.coolingOff : wallet.pending)}
          </div>
          <p className="card-caption">
            Statutory 30-day refund/cooling-off period protection. Automatically unlocks and moves to available balance once the 30-day window elapses.
          </p>
        </div>

        {/* Total Disbursed */}
        <div className="balance-summary-card glass-panel">
          <div className="card-top-row">
            <span className="card-title">Disbursed to Bank</span>
            <div className="card-icon-wrap bg-cyan-dim">
              <CheckCircle size={18} className="text-cyan" />
            </div>
          </div>
          <div className="card-amount-large text-cyan">
            {formatINR(wallet.paid)}
          </div>
          <p className="card-caption">
            Settled after 5% statutory TDS deduction under Section 194H.
          </p>
        </div>

        {/* Reversals / Clawbacks */}
        <div className="balance-summary-card glass-panel">
          <div className="card-top-row">
            <span className="card-title">Refund Clawbacks</span>
            <div className="card-icon-wrap bg-rose-dim">
              <RotateCcw size={18} className="text-rose" />
            </div>
          </div>
          <div className="card-amount-large text-rose">
            {formatINR(wallet.reversed)}
          </div>
          <p className="card-caption">
            Automatically reversed on customer cancellation or chargeback.
          </p>
        </div>
      </div>

      {/* Append-Only Ledger History */}
      <div className="ledger-table-section glass-panel">
        <div className="ledger-header-row">
          <div>
            <h3 className="ledger-title">Append-Only Financial Ledger</h3>
            <span className="ledger-subtitle">
              Immutable audit trail. Every credit, hold, clawback, and bank disbursement is recorded.
            </span>
          </div>

          <div className="ledger-filter-wrap">
            <Filter size={14} className="text-secondary" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="ledger-filter-select"
            >
              <option value="ALL">All Transactions ({memberEntries.length})</option>
              <option value="COMMISSION">Commissions Only</option>
              <option value="PAYOUT">Payouts & Disbursements</option>
              <option value="CLAWBACK">Refund Clawbacks</option>
            </select>
          </div>
        </div>

        {filteredEntries.length > 0 ? (
          <div className="table-responsive">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Transaction Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Balance Effect</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => {
                  const isPositive = entry.amount > 0;
                  const isNegative = entry.amount < 0;

                  return (
                    <tr key={entry.ledger_id}>
                      <td className="code-font text-secondary font-xs">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td>
                        <span className={`badge ${
                          entry.transaction_type.includes('PENDING') ? 'badge-amber' :
                          entry.transaction_type.includes('CLAWBACK') ? 'badge-rose' :
                          entry.transaction_type.includes('PAYOUT') ? 'badge-cyan' :
                          'badge-emerald'
                        }`}>
                          {entry.transaction_type}
                        </span>
                      </td>
                      <td className="code-font text-cyan">{entry.reference_id}</td>
                      <td className="entry-desc">{entry.description}</td>
                      <td>
                        <span className="badge badge-neutral uppercase font-xs">
                          {entry.balance_effect}
                        </span>
                      </td>
                      <td className={`text-right code-font font-bold ${
                        isNegative ? 'text-rose' : isPositive ? 'text-emerald' : 'text-secondary'
                      }`}>
                        {isPositive ? `+${formatINR(entry.amount)}` : formatINR(entry.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-ledger-box">
            No financial transactions found for the selected filter.
          </div>
        )}
      </div>

      {/* Payout Modal */}
      <PayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        member={currentMember}
      />
    </div>
  );
}
