import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR, formatDateTime, formatDate, maskPan, maskBankAccount } from '../../utils/formatters';
import { 
  Sliders, 
  Users, 
  ShoppingBag, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  ShieldCheck, 
  Building2, 
  FileText, 
  Clock, 
  ArrowUpRight,
  Search,
  Eye,
  Filter,
  DollarSign
} from 'lucide-react';

export default function AdminDashboard() {
  const { 
    members, 
    orders, 
    commissionRules, 
    commissionEntries, 
    walletLedger, 
    payouts, 
    auditLogs, 
    companyReserve,
    reviewKyc,
    maturePendingCommissions,
    processRefund,
    approvePayoutBatch,
    updateCommissionRule
  } = useMlm();

  const [activeAdminTab, setActiveAdminTab] = useState('orders'); // 'orders' | 'kyc' | 'rules' | 'payouts' | 'fraud' | 'audit'
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRuleLevel, setEditingRuleLevel] = useState(null);
  const [newRuleAmount, setNewRuleAmount] = useState('');

  // Executive Metrics
  const totalGMV = orders.filter(o => o.payment_status === 'succeeded').reduce((acc, o) => acc + o.amount, 0);
  const totalCommissions = commissionEntries.filter(c => c.status !== 'reversed').reduce((acc, c) => acc + c.amount, 0);
  const pendingKycCount = members.filter(m => m.seller_status === 'pending_KYC').length;
  const pendingPayouts = payouts.filter(p => p.status === 'pending_review');

  return (
    <div className="admin-portal-container">
      {/* Admin Executive Header */}
      <div className="admin-header-banner glass-panel">
        <div className="admin-header-left">
          <div className="admin-badge">
            <Sliders size={14} className="text-emerald" />
            <span>MLM Platform Administration</span>
          </div>
          <h2 className="admin-title">Direct Selling Governance & Operations Center</h2>
          <p className="admin-desc">
            Enforcing compliance under Consumer Protection (Direct Selling) Rules, 2021. 
            Monitoring 10-level retail commissions, KYC authorisations, and maker-checker payout approvals.
          </p>
        </div>

        <div className="admin-header-right">
          <div className="admin-user-pill">
            <div className="avatar-admin">A</div>
            <div>
              <div className="admin-user-name">Vikram Singh</div>
              <div className="admin-user-role">Lead Compliance & Finance Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="admin-kpi-grid">
        <div className="kpi-card glass-panel">
          <span className="kpi-label">Gross Subscription GMV</span>
          <div className="kpi-val text-primary">{formatINR(totalGMV)}</div>
          <span className="kpi-sub">{orders.length} Total ZEX Orders</span>
        </div>

        <div className="kpi-card glass-panel border-emerald-card">
          <span className="kpi-label">Total Network Payout Allocated</span>
          <div className="kpi-val text-emerald">{formatINR(totalCommissions)}</div>
          <span className="kpi-sub">Across 10 Unilevel Tiers</span>
        </div>

        <div className="kpi-card glass-panel">
          <span className="kpi-label">Company Reserve & Margins</span>
          <div className="kpi-val text-cyan">{formatINR(companyReserve)}</div>
          <span className="kpi-sub">Unallocated Ancestor Buffer</span>
        </div>

        <div className="kpi-card glass-panel">
          <span className="kpi-label">Pending KYC Verifications</span>
          <div className="kpi-val text-amber">{pendingKycCount}</div>
          <span className="kpi-sub">Requires PAN / Bank Review</span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-nav-bar">
        <button
          onClick={() => setActiveAdminTab('orders')}
          className={`admin-tab-btn ${activeAdminTab === 'orders' ? 'active' : ''}`}
        >
          <ShoppingBag size={16} />
          <span>Orders & Sponsor Snapshots ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('kyc')}
          className={`admin-tab-btn ${activeAdminTab === 'kyc' ? 'active' : ''}`}
        >
          <ShieldCheck size={16} />
          <span>Members & KYC Review ({pendingKycCount} Pending)</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('payouts')}
          className={`admin-tab-btn ${activeAdminTab === 'payouts' ? 'active' : ''}`}
        >
          <DollarSign size={16} />
          <span>Maker-Checker Payout Batches ({pendingPayouts.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('rules')}
          className={`admin-tab-btn ${activeAdminTab === 'rules' ? 'active' : ''}`}
        >
          <Layers size={16} />
          <span>10-Level Commission Rules</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('fraud')}
          className={`admin-tab-btn ${activeAdminTab === 'fraud' ? 'active' : ''}`}
        >
          <AlertTriangle size={16} />
          <span>Anti-Pyramid & Fraud Alerts</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('audit')}
          className={`admin-tab-btn ${activeAdminTab === 'audit' ? 'active' : ''}`}
        >
          <FileText size={16} />
          <span>Immutable Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="admin-panel-body">
        {/* ORDERS TAB */}
        {activeAdminTab === 'orders' && (
          <div className="admin-card glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">Retail Orders & 10-Level Ancestry Ledger</h3>
                <span className="section-desc">
                  Every order carries a frozen snapshot of the 10 ancestors at the time of purchase.
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>ZEX Reference</th>
                    <th>Buyer Identity</th>
                    <th>Originating Seller</th>
                    <th>Amount</th>
                    <th>Cooling-Off Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.order_id}>
                      <td className="code-font text-cyan">{o.order_id}</td>
                      <td className="code-font text-secondary">{o.zex_order_id}</td>
                      <td>
                        <div className="font-semibold">{members.find(m => m.member_id === o.buyer_member_id)?.name || o.buyer_member_id}</div>
                      </td>
                      <td>
                        <span className="text-secondary">{members.find(m => m.member_id === o.seller_member_id)?.name || 'Direct'}</span>
                      </td>
                      <td className="code-font font-bold">{formatINR(o.amount)}</td>
                      <td>
                        <span className={`badge ${
                          o.payment_status === 'refunded' ? 'badge-rose' :
                          o.subscription_status === 'cooling_off' ? 'badge-amber' :
                          'badge-emerald'
                        }`}>
                          {o.payment_status === 'refunded' ? 'REFUNDED & CLAWED BACK' :
                           o.subscription_status === 'cooling_off' ? '7-DAY COOLING HOLD' : 'AVAILABLE (MATURED)'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-inline">
                          <button
                            onClick={() => setSelectedOrderDetails(o)}
                            className="btn btn-secondary btn-sm"
                            title="Inspect 10-level ancestor snapshot"
                          >
                            <Eye size={12} />
                            <span>Inspect Upline</span>
                          </button>

                          {o.subscription_status === 'cooling_off' && o.payment_status !== 'refunded' && (
                            <button
                              onClick={() => maturePendingCommissions(o.order_id)}
                              className="btn btn-primary btn-sm"
                              title="Clear cooling-off hold and make funds available"
                            >
                              <CheckCircle size={12} />
                              <span>Clear Hold</span>
                            </button>
                          )}

                          {o.payment_status !== 'refunded' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Initiate complete refund and reverse all 10 commission entries for Order ${o.order_id}?`)) {
                                  processRefund(o.order_id, 'Admin-initiated cooling-off refund simulation');
                                }
                              }}
                              className="btn btn-danger btn-sm"
                              title="Reverse order and claw back 10 levels"
                            >
                              <RotateCcw size={12} />
                              <span>Clawback</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal / Drawer to view frozen sponsor snapshot */}
            {selectedOrderDetails && (
              <div className="modal-overlay">
                <div className="modal-container">
                  <div className="modal-header">
                    <div className="modal-header-left">
                      <div className="zex-secure-badge">
                        <Layers size={12} />
                        <span>Frozen Ancestry Snapshot</span>
                      </div>
                      <h3 className="modal-title">Order {selectedOrderDetails.order_id}</h3>
                    </div>
                    <button onClick={() => setSelectedOrderDetails(null)} className="modal-close-btn">
                      ✕
                    </button>
                  </div>

                  <div className="modal-body">
                    <p className="modal-subtitle">
                      Historical 10-level commission allocations snapshot taken at the exact moment of payment:
                    </p>

                    <div className="table-responsive">
                      <table className="comp-table">
                        <thead>
                          <tr>
                            <th>Level</th>
                            <th>Ancestor Seller</th>
                            <th>Commission</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrderDetails.sponsor_path_snapshot.map(s => {
                            const entry = commissionEntries.find(c => c.order_id === selectedOrderDetails.order_id && c.level === s.level);
                            return (
                              <tr key={s.level}>
                                <td>
                                  <span className="badge badge-indigo">Level {s.level}</span>
                                </td>
                                <td className="font-semibold text-primary">{s.name}</td>
                                <td className="code-font text-emerald font-bold">{formatINR(s.amount)}</td>
                                <td>
                                  <span className={`badge ${
                                    entry?.status === 'reversed' ? 'badge-rose' :
                                    entry?.status === 'pending' ? 'badge-amber' :
                                    'badge-emerald'
                                  }`}>
                                    {entry ? entry.status : 'allocated'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KYC REVIEW TAB */}
        {activeAdminTab === 'kyc' && (
          <div className="admin-card glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">Members & Statutory Seller KYC Authorisation</h3>
                <span className="section-desc">
                  Under Indian Direct Selling Rules, sellers must not earn without explicit agreements and verified identity.
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Name</th>
                    <th>Customer Status</th>
                    <th>Seller Status</th>
                    <th>PAN Card</th>
                    <th>Bank Settlement</th>
                    <th>KYC Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.member_id}>
                      <td className="code-font text-cyan">{m.member_id}</td>
                      <td>
                        <div className="font-semibold">{m.name}</div>
                        <div className="code-font text-secondary font-xs">{m.referral_code}</div>
                      </td>
                      <td>
                        <span className={`badge ${m.customer_status === 'active_subscriber' ? 'badge-emerald' : 'badge-neutral'}`}>
                          {m.customer_status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          m.seller_status === 'active' ? 'badge-cyan' :
                          m.seller_status === 'pending_KYC' ? 'badge-amber' : 'badge-neutral'
                        }`}>
                          {m.seller_status}
                        </span>
                      </td>
                      <td className="code-font">{m.kyc?.pan ? maskPan(m.kyc.pan) : 'Not Provided'}</td>
                      <td>
                        {m.kyc?.bank_name ? (
                          <div className="font-xs">
                            <div>{m.kyc.bank_name}</div>
                            <div className="code-font text-secondary">{maskBankAccount(m.kyc.bank_account_number)}</div>
                          </div>
                        ) : (
                          <span className="text-secondary font-xs">None</span>
                        )}
                      </td>
                      <td>
                        {m.seller_status === 'pending_KYC' ? (
                          <div className="table-actions-inline">
                            <button
                              onClick={() => reviewKyc(m.member_id, 'verified')}
                              className="btn btn-primary btn-sm"
                            >
                              <CheckCircle size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => reviewKyc(m.member_id, 'rejected')}
                              className="btn btn-danger btn-sm"
                            >
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : m.seller_status === 'active' ? (
                          <span className="text-emerald font-xs font-semibold">✓ Verified Active Seller</span>
                        ) : (
                          <span className="text-secondary font-xs">Not Enrolled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYOUTS TAB (MAKER-CHECKER) */}
        {activeAdminTab === 'payouts' && (
          <div className="admin-card glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">Maker-Checker Payout Disbursement Batches</h3>
                <span className="section-desc">
                  Dual authorization required for banking payouts. Automatically deducts 5% statutory TDS (Section 194H).
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Payout ID</th>
                    <th>Beneficiary</th>
                    <th>Gross Amount</th>
                    <th>5% TDS Withheld</th>
                    <th>Net Payout</th>
                    <th>Maker Admin</th>
                    <th>Checker Admin</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.payout_id}>
                      <td className="code-font text-cyan">{p.payout_id}</td>
                      <td className="font-semibold text-primary">{p.member_name}</td>
                      <td className="code-font">{formatINR(p.amount)}</td>
                      <td className="code-font text-rose">-{formatINR(p.tax_deduction)}</td>
                      <td className="code-font text-emerald font-bold">{formatINR(p.net_amount)}</td>
                      <td className="text-secondary font-xs">{p.maker_admin}</td>
                      <td className="text-secondary font-xs">{p.checker_admin || 'Pending Checker'}</td>
                      <td>
                        <span className={`badge ${p.status === 'settled' ? 'badge-emerald' : 'badge-amber'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === 'pending_review' ? (
                          <button
                            onClick={() => approvePayoutBatch(p.payout_id)}
                            className="btn btn-primary btn-sm"
                          >
                            <ShieldCheck size={14} />
                            <span>Checker Approve & Disburse</span>
                          </button>
                        ) : (
                          <span className="code-font font-xs text-secondary">{p.bank_reference}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMMISSION RULES TAB */}
        {activeAdminTab === 'rules' && (
          <div className="admin-card glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">10-Level Commission Rules Engine & Versioning</h3>
                <span className="section-desc">
                  Changes create an immutable audit record and do not rewrite historical snapshots.
                </span>
              </div>
              <span className="badge badge-emerald">
                Total Network Payout: {formatINR(commissionRules.reduce((a, b) => a + b.amount, 0))}
              </span>
            </div>

            <div className="table-responsive">
              <table className="comp-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Upline Role</th>
                    <th>Configured Payout</th>
                    <th>Share of MRP (₹2500)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionRules.map(r => (
                    <tr key={r.level}>
                      <td>
                        <span className="badge badge-indigo">Level {r.level}</span>
                      </td>
                      <td className="font-semibold text-primary">{r.name}</td>
                      <td>
                        {editingRuleLevel === r.level ? (
                          <div className="table-edit-row">
                            <input
                              type="number"
                              value={newRuleAmount}
                              onChange={(e) => setNewRuleAmount(e.target.value)}
                              className="form-input code-font input-mini"
                            />
                            <button
                              onClick={() => {
                                updateCommissionRule(r.level, newRuleAmount);
                                setEditingRuleLevel(null);
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRuleLevel(null)}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="code-font text-emerald font-bold">{formatINR(r.amount)}</span>
                        )}
                      </td>
                      <td className="code-font text-secondary">
                        {((r.amount / 2500) * 100).toFixed(1)}%
                      </td>
                      <td>
                        {editingRuleLevel !== r.level && (
                          <button
                            onClick={() => {
                              setEditingRuleLevel(r.level);
                              setNewRuleAmount(r.amount.toString());
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FRAUD & RISK TAB */}
        {activeAdminTab === 'fraud' && (
          <div className="admin-card glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">Anti-Pyramid Fraud Detection & Risk Controls</h3>
                <span className="section-desc">
                  Monitors suspicious velocity, circular referrals, duplicate bank details, and cooling-off abuse.
                </span>
              </div>
            </div>

            <div className="fraud-alerts-grid">
              <div className="fraud-card glass-panel border-emerald-card">
                <div className="fraud-card-header">
                  <CheckCircle size={18} className="text-emerald" />
                  <h4 className="fraud-card-title">Direct Selling Rule Compliance</h4>
                </div>
                <p className="fraud-card-text">
                  Zero enrollment fees verified. All payouts tied strictly to completed retail subscriptions of ZEX software.
                </p>
                <div className="fraud-status text-emerald">STATUS: 100% COMPLIANT</div>
              </div>

              <div className="fraud-card glass-panel">
                <div className="fraud-card-header">
                  <ShieldCheck size={18} className="text-cyan" />
                  <h4 className="fraud-card-title">Circular & Self-Referral Prevention</h4>
                </div>
                <p className="fraud-card-text">
                  Sponsor ancestry tree verification enforces strict DAG acyclicity. A member cannot earn commissions on their own purchases.
                </p>
                <div className="fraud-status text-cyan">STATUS: ACTIVE & ENFORCED</div>
              </div>

              <div className="fraud-card glass-panel">
                <div className="fraud-card-header">
                  <AlertTriangle size={18} className="text-amber" />
                  <h4 className="fraud-card-title">Cooling-Off Refund Clawback Monitor</h4>
                </div>
                <p className="fraud-card-text">
                  Commissions remain in pending hold for 7 days. If a buyer initiates a refund, all 10 upline entries are instantaneously reversed.
                </p>
                <div className="fraud-status text-amber">STATUS: HOLD BUFFER ACTIVE</div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeAdminTab === 'audit' && (
          <div className="admin-card glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">Immutable System & Financial Audit Trail</h3>
                <span className="section-desc">
                  Every mutation, commission allocation, KYC approval, and payout has a permanent cryptographic timestamp.
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Object Reference</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(a => (
                    <tr key={a.log_id}>
                      <td className="code-font text-secondary">{a.log_id}</td>
                      <td className="code-font font-xs text-secondary">{formatDateTime(a.timestamp)}</td>
                      <td>
                        <span className="badge badge-cyan">{a.actor}</span>
                      </td>
                      <td>
                        <span className="badge badge-emerald">{a.action}</span>
                      </td>
                      <td className="code-font text-primary">{a.object_type}: {a.object_id}</td>
                      <td className="code-font font-xs text-secondary">
                        {JSON.stringify(a.after_state || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
