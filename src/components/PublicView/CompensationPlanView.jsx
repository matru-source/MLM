import React from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR } from '../../utils/formatters';
import { ShieldCheck, Layers, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function CompensationPlanView() {
  const { commissionRules } = useMlm();
  const totalPayout = commissionRules.reduce((acc, r) => acc + (r.amount || 0), 0);

  return (
    <div className="comp-plan-container glass-panel">
      <div className="comp-header">
        <div className="comp-header-badge">
          <ShieldCheck size={14} className="text-emerald" />
          <span>Statutory 10-Level Unilevel Plan</span>
        </div>
        <h2 className="comp-title">Retail Commission Architecture</h2>
        <p className="comp-desc">
          Structured for compliance with India’s Consumer Protection (Direct Selling) Rules, 2021. 
          Priced on genuine ₹2,500 retail subscription sales. Rewards generated purely from software license distribution.
        </p>
      </div>

      <div className="comp-stats-grid">
        <div className="comp-stat-card">
          <span className="stat-label">Product Retail MRP</span>
          <div className="stat-val">{formatINR(2500)}</div>
          <span className="stat-sub">Annual ZEX Pro License</span>
        </div>
        <div className="comp-stat-card border-emerald">
          <span className="stat-label">Total Network Payout</span>
          <div className="stat-val text-emerald">{formatINR(totalPayout)}</div>
          <span className="stat-sub">Distributed Across 10 Upline Tiers</span>
        </div>
        <div className="comp-stat-card">
          <span className="stat-label">Company Fixed Base Margin</span>
          <div className="stat-val text-cyan">{formatINR(2500 - totalPayout)}</div>
          <span className="stat-sub">Statutory ₹900 Base (+ Unused Tiers to Reserve)</span>
        </div>
      </div>

      {/* 10-Level Table */}
      <div className="table-responsive">
        <table className="comp-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Beneficiary Relationship</th>
              <th>Payout / Sale</th>
              <th>Share of MRP</th>
              <th>Regulatory Rule</th>
            </tr>
          </thead>
          <tbody>
            {commissionRules.map((r) => (
              <tr key={r.level} className={r.level === 1 ? 'highlight-level-1' : ''}>
                <td>
                  <span className={`level-pill ${r.level === 1 ? 'level-1-pill' : ''}`}>
                    Level {r.level}
                  </span>
                </td>
                <td className="font-semibold text-primary">{r.name}</td>
                <td className="code-font text-emerald font-bold">{formatINR(r.amount)}</td>
                <td className="code-font text-secondary">{((r.amount / 2500) * 100).toFixed(1)}%</td>
                <td className="compliance-note">
                  {r.level === 1 
                    ? 'Direct retail seller reward (highest incentive)' 
                    : `Ancestral upline override (requires active seller KYC)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compliance Rules Summary */}
      <div className="comp-rules-grid">
        <div className="rule-card">
          <div className="rule-card-title text-emerald">
            <CheckCircle2 size={16} />
            <span>Retail Sale Requirement</span>
          </div>
          <p className="rule-card-text">
            No commissions are generated upon user registration or enrollment. 
            Rewards are triggered strictly upon confirmed payment and activation of a retail software license in ZEX.
          </p>
        </div>

        <div className="rule-card">
          <div className="rule-card-title text-amber">
            <AlertCircle size={16} />
            <span>Company Reserve Rule</span>
          </div>
          <p className="rule-card-text">
            If fewer than 10 ancestors exist in the sponsor ancestry, or if an upline is unverified/suspended, 
            the unallocated commission defaults to the Company Reserve—never jumping to unrelated accounts.
          </p>
        </div>

        <div className="rule-card">
          <div className="rule-card-title text-cyan">
            <ShieldCheck size={16} />
            <span>Cooling-Off & Clawback</span>
          </div>
          <p className="rule-card-text">
            Commissions remain pending in statutory cooling-off hold for 30 days. Customer refunds or chargebacks 
            automatically trigger an immutable clawback across all 10 upline entries.
          </p>
        </div>
      </div>
    </div>
  );
}
