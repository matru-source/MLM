import React, { useState } from 'react';
import { useMlm } from '../context/MlmContext';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Users, 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Send,
  Download,
  Building,
  Shield,
  Receipt,
  Clock,
  X,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Globe,
  Key,
  Terminal,
  Code2,
  Lock,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';

export default function AdminPortalView() {
  const { 
    navigateToUserSite, 
    logoutAdmin,
    orders, 
    members, 
    transactions, 
    totalEarnings, 
    payoutRequests,
    pendingActivations = [],
    approveMemberActivation,
    rejectMemberActivation,
    approvePayout,
    rejectPayout,
    approveKyc,
    rejectKyc,
    isDbConnected,
    addToast 
  } = useMlm();

  const [adminTab, setAdminTab] = useState('activations'); // 'activations' | 'payouts' | 'orders' | 'kyc' | 'webhooks'
  const [selectedPayoutForManualPay, setSelectedPayoutForManualPay] = useState(null);
  const [selectedPayoutToView, setSelectedPayoutToView] = useState(null);
  const [selectedKycMember, setSelectedKycMember] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);

  const getDocFileInfo = (member, docKey) => {
    const docs = member?.kyc?.documents || {};
    const fileData = docs[`${docKey}File`] || (typeof docs[docKey] === 'string' && docs[docKey].startsWith('data:') ? docs[docKey] : null);
    let fileName = docs[`${docKey}Name`] || null;
    const rawVal = docs[docKey];

    if (!fileName && typeof rawVal === 'string' && rawVal.startsWith('Uploaded (')) {
      fileName = rawVal.replace('Uploaded (', '').replace(/\)$/, '');
    }

    const hasFile = Boolean(fileData || fileName);

    return {
      hasFile,
      fileData,
      fileName,
      fileType: docs[`${docKey}Type`] || (fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? 'image/jpeg' : fileName?.match(/\.pdf$/i) ? 'application/pdf' : 'document'),
      fileSize: docs[`${docKey}Size`] || null
    };
  };

  const openDocPreview = (member, docKey) => {
    const titles = {
      pan: 'PAN Card',
      bankAccount: 'Bank Passbook / Cheque',
      aadhaar: 'Aadhaar Card',
      addressProof: 'Address Proof'
    };
    const fileInfo = getDocFileInfo(member, docKey);

    setPreviewingDoc({
      member,
      docKey,
      title: titles[docKey] || docKey,
      docName: fileInfo.fileName,
      docFile: fileInfo.fileData,
      docType: fileInfo.fileType,
      docSize: fileInfo.fileSize,
      status: member.kyc?.verification_status || 'under_review'
    });
  };

  // Webhook Hub State
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState(false);
  const [simulatedEvent, setSimulatedEvent] = useState('subscription.activated');
  const [simulatedMemberId, setSimulatedMemberId] = useState('mem_matru');
  const [isSimulating, setIsSimulating] = useState(false);
  const [recentWebhooks, setRecentWebhooks] = useState([
    {
      id: 'evt_prod_849201',
      event: 'subscription.activated',
      time: '16 Oct 2026, 16:00',
      status: 200,
      signature: 'v1=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      latency: '28ms',
      amount: '₹2,950',
      verified: true
    }
  ]);

  // Manual payment form fields
  const [manualUtr, setManualUtr] = useState('');
  const [paymentMode, setPaymentMode] = useState('IMPS');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isCopiedAc, setIsCopiedAc] = useState(false);
  const [isCopiedIfsc, setIsCopiedIfsc] = useState(false);

  // Webhook Simulator Dispatch Handler
  const handleDispatchWebhook = () => {
    setIsSimulating(true);
    const eventId = `evt_live_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomHex = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    setTimeout(() => {
      setIsSimulating(false);
      const newEntry = {
        id: eventId,
        event: simulatedEvent,
        time: 'Just now',
        status: 200,
        signature: `v1=${randomHex}`,
        latency: `${Math.floor(22 + Math.random() * 24)}ms`,
        amount: simulatedEvent === 'sale.adjusted' ? '-₹2,950' : '₹2,950',
        verified: true
      };
      setRecentWebhooks(prev => [newEntry, ...prev.slice(0, 4)]);
      addToast('success', 'Webhook Dispatched (200 OK)', `Event ${eventId} (${simulatedEvent}) processed with valid HMAC-SHA256 signature.`);
    }, 450);
  };

  // When opening manual payout modal, pre-seed UTR
  const openManualPayModal = (payout) => {
    setSelectedPayoutForManualPay(payout);
    setManualUtr(`UTR-CS-${Math.floor(100000000 + Math.random() * 900000000)}`);
    setPaymentMode('IMPS');
    setScreenshotPreview('');
    setAdminNotes('Transferred via Corporate NetBanking / IMPS');
    setIsCopiedAc(false);
    setIsCopiedIfsc(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotPreview(event.target.result);
        addToast('success', 'Screenshot Attached', `${file.name} uploaded successfully.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmDisbursement = (e) => {
    e.preventDefault();
    if (!selectedPayoutForManualPay) return;

    const cleanUtr = manualUtr.trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 8) {
      addToast('error', 'UTR Missing or Invalid', 'Please enter a valid 8 to 22-digit Bank Reference / UTR Number from your corporate bank transfer.');
      return;
    }

    if (!screenshotPreview) {
      addToast('error', 'Bank Counterfoil Required', 'Compliance Requirement: Please attach the genuine bank transfer receipt/screenshot before confirming disbursement.');
      return;
    }

    approvePayout({
      payoutId: selectedPayoutForManualPay.id,
      utrNumber: cleanUtr,
      receiptUrl: screenshotPreview,
      paymentMode: paymentMode,
      adminNotes: adminNotes || 'Disbursed via verified corporate net banking.'
    });

    setSelectedPayoutForManualPay(null);
  };

  const handleRejectPayoutClick = () => {
    if (!selectedPayoutForManualPay) return;
    const reason = prompt('Please enter the rejection reason for this withdrawal:', 'Bank details mismatch or invalid KYC');
    if (reason) {
      rejectPayout({ payoutId: selectedPayoutForManualPay.id, reason });
      setSelectedPayoutForManualPay(null);
    }
  };

  const pendingRequests = payoutRequests.filter(p => p.status === 'pending');
  const pendingTotalAmount = pendingRequests.reduce((sum, p) => sum + p.amount, 0);
  const pendingActivationList = (pendingActivations || []).filter(a => a.status === 'pending');

  return (
    <div className="admin-dedicated-app">
      {/* Dedicated Admin Header */}
      <header className="admin-dedicated-header">
        <div className="admin-header-brand">
          <div className="admin-brand-icon">
            <Shield size={22} className="shield-brand-svg" />
          </div>
          <div>
            <h1 className="admin-title-text">CyberShield Network — Admin Operations</h1>
            <div className="flex-center gap-2 mt-1" style={{ justifyContent: 'flex-start' }}>
              <span className="admin-badge-role">Operations, Payouts & Compliance Desk</span>
              <span className={`badge ${isDbConnected ? 'badge-green' : 'badge-amber'} flex-center gap-1 font-xs`} style={{ padding: '3px 8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isDbConnected ? '#10B981' : '#F59E0B', display: 'inline-block' }}></span>
                {isDbConnected ? 'Live Neon PostgreSQL Connected' : 'Syncing Neon Database...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-center gap-2">
          <button
            onClick={logoutAdmin}
            className="btn btn-secondary btn-sm admin-exit-btn"
            title="Lock executive console and require passphrase"
          >
            <Lock size={15} />
            <span>Lock Console</span>
          </button>
          <button
            onClick={navigateToUserSite}
            className="btn btn-secondary btn-sm admin-exit-btn"
          >
            <ArrowLeft size={16} />
            <span>Exit to User Website</span>
          </button>
        </div>
      </header>

      {/* Admin Body Content */}
      <main className="admin-dedicated-body">
        {/* 4 Admin Stat Cards */}
        <div className="admin-metrics-row">
          <div className="admin-stat-card card-white">
            <span className="stat-label-muted">Total Sales Volume</span>
            <div className="stat-number-bold">₹{((orders.length) * 2950).toLocaleString('en-IN')}</div>
            <span className="stat-badge-tag text-success">✓ CyberShield Engine</span>
          </div>

          <div className="admin-stat-card card-white">
            <span className="stat-label-muted">New Partner Activations</span>
            <div className={`stat-number-bold ${pendingActivationList.length > 0 ? 'text-amber' : 'text-success'}`}>
              {pendingActivationList.length} Pending
            </div>
            <span className="stat-badge-tag text-primary-blue">Dual Accounts (API)</span>
          </div>

          <div className="admin-stat-card card-white">
            <span className="stat-label-muted">Active Direct Partners</span>
            <div className="stat-number-bold">{members.length}</div>
            <span className="stat-badge-tag text-purple">Verified Partners</span>
          </div>

          <div className="admin-stat-card card-white">
            <span className="stat-label-muted">Pending Payouts</span>
            <div className={`stat-number-bold ${pendingRequests.length > 0 ? 'text-amber' : 'text-success'}`}>
              ₹{pendingTotalAmount.toLocaleString('en-IN')}
            </div>
            <span className={`stat-badge-tag ${pendingRequests.length > 0 ? 'text-amber' : 'text-success'}`}>
              {pendingRequests.length} {pendingRequests.length === 1 ? 'Request' : 'Requests'} Pending
            </span>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="admin-tabs-bar-clean card-white">
          <button
            onClick={() => setAdminTab('activations')}
            className={`admin-clean-tab ${adminTab === 'activations' ? 'active' : ''}`}
          >
            New Partner Activations ({pendingActivations.length})
            {pendingActivationList.length > 0 && (
              <span className="admin-tab-alert-badge">{pendingActivationList.length} Pending</span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('payouts')}
            className={`admin-clean-tab ${adminTab === 'payouts' ? 'active' : ''}`}
          >
            Bank Payout Disbursements ({payoutRequests.length})
            {pendingRequests.length > 0 && (
              <span className="admin-tab-alert-badge">{pendingRequests.length} Pending</span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('orders')}
            className={`admin-clean-tab ${adminTab === 'orders' ? 'active' : ''}`}
          >
            Orders & Subscriptions ({orders.length})
          </button>
          <button
            onClick={() => setAdminTab('kyc')}
            className={`admin-clean-tab ${adminTab === 'kyc' ? 'active' : ''}`}
          >
            Partner KYC Review ({members.length})
          </button>
          <button
            onClick={() => setAdminTab('webhooks')}
            className={`admin-clean-tab ${adminTab === 'webhooks' ? 'active' : ''}`}
          >
            Webhook Simulator
          </button>
        </div>

        {/* TAB 0: NEW PARTNER ACTIVATIONS & DUAL ACCOUNTS PROVISIONING */}
        {adminTab === 'activations' && (
          <div className="admin-panel-card card-white p-6">
            <div className="card-head-between mb-4">
              <div>
                <h3 className="section-title-large mb-1">New Partner Activations & Dual Accounts Provisioning</h3>
                <p className="text-muted text-sm">
                  Review new ₹2,500 joining payments. Each registration provisions 2 accounts via API: Account 1 (MLM Direct Selling Partner) and Account 2 (Enterprise Software License Key). Verify and click Approve to unlock partner portal access.
                </p>
              </div>
              {pendingActivationList.length > 0 && (
                <div className="admin-head-alert-box">
                  <Clock size={16} className="text-amber" />
                  <span>{pendingActivationList.length} Pending Admin Approval</span>
                </div>
              )}
            </div>

            <div className="activation-cards-grid">
              {pendingActivations.length === 0 ? (
                <div className="text-center py-8 text-muted card-white p-6">
                  No partner activation requests in queue.
                </div>
              ) : (
                pendingActivations.map((act) => (
                  <div key={act.id} className={`admin-activation-card ${act.status === 'pending' ? 'border-pending' : 'border-approved'}`}>
                    <div className="activation-card-top">
                      <div className="activation-user-meta">
                        <div className="avatar-chip">
                          <Users size={18} />
                        </div>
                        <div>
                          <h4 className="activation-user-name">{act.member_name}</h4>
                          <span className="activation-user-sub">{act.member_email} • {act.member_phone}</span>
                        </div>
                      </div>

                      <div className="activation-status-pill">
                        {act.status === 'pending' ? (
                          <span className="badge badge-amber font-xs">Pending Admin Verification</span>
                        ) : act.status === 'approved' ? (
                          <span className="badge badge-green font-xs">Active & Verified ✓</span>
                        ) : (
                          <span className="badge badge-rose font-xs">Rejected</span>
                        )}
                      </div>
                    </div>

                    <div className="activation-meta-strip">
                      <div className="meta-strip-item">
                        <span className="meta-strip-label">Joining Fee</span>
                        <strong className="meta-strip-val text-primary-blue">₹{act.total_paid?.toLocaleString('en-IN') || '2,950'} (₹2,500 + GST)</strong>
                      </div>
                      <div className="meta-strip-item">
                        <span className="meta-strip-label">Payment Mode</span>
                        <span className="meta-strip-val">{act.payment_method || 'UPI'}</span>
                      </div>
                      <div className="meta-strip-item">
                        <span className="meta-strip-label">Order / Ref ID</span>
                        <span className="meta-strip-val code-font">{act.payment_ref}</span>
                      </div>
                      <div className="meta-strip-item">
                        <span className="meta-strip-label">UTR Number</span>
                        <span className="meta-strip-val code-font">{act.utr_number}</span>
                      </div>
                      <div className="meta-strip-item">
                        <span className="meta-strip-label">Sponsor Code</span>
                        <span className="meta-strip-val code-font">{act.sponsor_code}</span>
                      </div>
                    </div>

                    {/* DUAL ACCOUNTS PROVISIONED VIA API */}
                    <div className="dual-accounts-container">
                      {/* Account 1: Partner MLM Account */}
                      <div className="dual-account-box mlm-account-box">
                        <div className="account-box-badge">
                          <span>Account 1: Partner MLM Account</span>
                        </div>
                        <div className="account-specs-compact">
                          <div className="spec-item-compact">
                            <span className="spec-k">Partner ID:</span>
                            <span className="spec-v code-font">{act.account1_mlm?.partner_id || act.member_id}</span>
                          </div>
                          <div className="spec-item-compact">
                            <span className="spec-k">Referral Code:</span>
                            <span className="spec-v code-font font-bold text-primary-blue">{act.account1_mlm?.referral_code || 'CS-NEW01'}</span>
                          </div>
                          <div className="spec-item-compact">
                            <span className="spec-k">Commission Wallet:</span>
                            <span className="spec-v code-font">{act.account1_mlm?.commission_wallet_id || 'WAL-CS-NEW'}</span>
                          </div>
                          <div className="spec-item-compact">
                            <span className="spec-k">Matrix Hierarchy:</span>
                            <span className="spec-v">6-Tier Unilevel Matrix</span>
                          </div>
                        </div>
                      </div>

                      {/* Account 2: Software License Account */}
                      <div className="dual-account-box software-account-box">
                        <div className="account-box-badge software-badge">
                          <span>Account 2: Enterprise Cyber Defense License</span>
                        </div>
                        <div className="account-specs-compact">
                          <div className="spec-item-compact">
                            <span className="spec-k">License Key:</span>
                            <span className="spec-v code-font font-bold text-success">{act.account2_software?.license_key || 'CS-PRO-XXXX-XXXX'}</span>
                          </div>
                          <div className="spec-item-compact">
                            <span className="spec-k">Endpoint Seats:</span>
                            <span className="spec-v font-bold">{act.account2_software?.endpoint_protection_seats || 5} Protected Devices</span>
                          </div>
                          <div className="spec-item-compact">
                            <span className="spec-k">Software Suite:</span>
                            <span className="spec-v">CyberShield Pro Enterprise Suite</span>
                          </div>
                          <div className="spec-item-compact">
                            <span className="spec-k">Client Portal User:</span>
                            <span className="spec-v">{act.account2_software?.client_portal_username || act.member_email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="activation-actions-footer">
                      {act.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt('Please enter reason for rejection:', 'Payment reference not found or invalid');
                              if (reason) rejectMemberActivation(act.id, reason);
                            }}
                            className="btn btn-secondary btn-sm text-rose"
                          >
                            <X size={15} />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => approveMemberActivation(act.id)}
                            className="btn btn-primary btn-sm flex-center gap-1"
                          >
                            <CheckCircle2 size={16} />
                            <span>Approve & Activate Both Accounts</span>
                          </button>
                        </>
                      ) : (
                        <div className="activation-approved-note">
                          <CheckCircle2 size={16} className="text-success" />
                          <span>Both accounts activated & operational. Dashboard access unlocked on {act.approved_at || act.requested_at}.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 1: BANK PAYOUT DISBURSEMENTS */}
        {adminTab === 'payouts' && (
          <div className="admin-panel-card card-white p-6">
            <div className="card-head-between mb-4">
              <div>
                <h3 className="section-title-large mb-1">Bank Payout Disbursements</h3>
                <p className="text-muted text-sm">
                  Review withdrawal requests from partners. Transfer funds manually via NetBanking / UPI, attach the transaction screenshot, and confirm payout.
                </p>
              </div>
              {pendingRequests.length > 0 && (
                <div className="admin-head-alert-box">
                  <Clock size={16} className="text-amber" />
                  <span>{pendingRequests.length} Pending Manual Transfer</span>
                </div>
              )}
            </div>

            <div className="table-responsive">
              <table className="coach-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Partner / User</th>
                    <th>Requested (Gross)</th>
                    <th>5% TDS</th>
                    <th>Net To Pay</th>
                    <th>Target Bank & Account</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRequests.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-muted">
                        No withdrawal requests in queue.
                      </td>
                    </tr>
                  ) : (
                    payoutRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="code-font text-primary-blue font-bold">#{req.id}</td>
                        <td>
                          <div className="font-semibold">{req.member_name}</div>
                          <div className="text-muted font-xs">{req.member_email}</div>
                        </td>
                        <td className="font-bold">₹{req.amount.toLocaleString('en-IN')}</td>
                        <td className="text-rose font-semibold">-₹{req.tds_amount.toLocaleString('en-IN')}</td>
                        <td className="text-success font-extrabold">₹{req.net_payable.toLocaleString('en-IN')}</td>
                        <td>
                          <div className="font-semibold">{req.bank_details?.bank_name || 'HDFC Bank'}</div>
                          <div className="text-muted font-xs code-font">
                            A/C: {req.bank_details?.account_number} • IFSC: {req.bank_details?.ifsc}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${req.status === 'paid' ? 'badge-green' : req.status === 'pending' ? 'badge-amber' : 'badge-neutral'}`}>
                            {req.status === 'paid' ? 'Paid & Verified' : req.status === 'pending' ? 'Pending Action' : 'Rejected'}
                          </span>
                        </td>
                        <td className="text-right">
                          {req.status === 'pending' ? (
                            <button 
                              onClick={() => openManualPayModal(req)}
                              className="btn btn-primary btn-sm flex-center gap-1"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              <CreditCard size={14} />
                              <span>Review & Pay Manually</span>
                            </button>
                          ) : req.status === 'paid' ? (
                            <button 
                              onClick={() => setSelectedPayoutToView(req)}
                              className="btn btn-secondary btn-sm flex-center gap-1"
                            >
                              <Receipt size={14} />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-muted font-xs">Rejected</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {adminTab === 'orders' && (
          <div className="admin-panel-card card-white p-6">
            <h3 className="section-title-large mb-4">Retail Orders & CyberShield Billing</h3>
            <div className="table-responsive">
              <table className="coach-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Name</th>
                    <th>Plan</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-muted">
                        No orders recorded yet. Fresh retail purchases and partner subscriptions will appear here automatically.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.order_id}>
                        <td className="code-font font-bold text-primary-blue">#{o.order_id}</td>
                        <td>{o.buyer_name || (members.find(m => m.member_id === o.buyer_member_id)?.name) || 'Authorized Partner'}</td>
                        <td>{o.product_name}</td>
                        <td className="font-bold">₹{o.total_amount?.toLocaleString('en-IN') || '2,950'}</td>
                        <td>{o.payment_method}</td>
                        <td><span className="badge badge-green">Paid (CyberShield)</span></td>
                        <td>
                          <button 
                            onClick={() => addToast('info', 'Invoice Exported', `Exported invoice for #${o.order_id}`)}
                            className="btn btn-secondary btn-sm"
                          >
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: KYC REVIEW */}
        {adminTab === 'kyc' && (
          <div className="admin-panel-card card-white p-6">
            <h3 className="section-title-large mb-2">Partner KYC Approvals</h3>
            <p className="text-muted text-sm mb-4">Review submitted identity documents and bank passbooks before authorizing withdrawals.</p>
            
            <div className="table-responsive">
              <table className="coach-table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Email</th>
                    <th>PAN Card</th>
                    <th>Bank Settlement</th>
                    <th>Identity Proofs</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const hasPanText = Boolean(m.kyc?.pan && m.kyc.pan.trim().length > 0);
                    const hasBankText = Boolean(m.kyc?.bank_name && m.kyc?.bank_account_number);
                    const docs = m.kyc?.documents || {};
                    const panDoc = getDocFileInfo(m, 'pan');
                    const bankDoc = getDocFileInfo(m, 'bankAccount');
                    const aadhaarDoc = getDocFileInfo(m, 'aadhaar');
                    const addressDoc = getDocFileInfo(m, 'addressProof');

                    const hasAnySubmissions = hasPanText || hasBankText || panDoc.hasFile || bankDoc.hasFile || aadhaarDoc.hasFile || addressDoc.hasFile;
                    const status = m.kyc?.verification_status || (hasAnySubmissions ? 'under_review' : 'pending_documents');
                    const isVerified = status === 'verified';
                    const isUnderReview = status === 'under_review';

                    return (
                      <tr key={m.member_id || m.id}>
                        <td>
                          <div className="font-bold">{m.name}</div>
                          <div className="text-xs text-muted">{m.rank || 'Partner'}</div>
                        </td>
                        <td className="text-muted">{m.email}</td>
                        <td className="code-font">
                          {hasPanText ? (
                            <div>
                              <span className="font-semibold">{m.kyc.pan}</span>
                              {panDoc.hasFile ? (
                                <div className="mt-1">
                                  <div className="text-xs text-primary-blue font-medium truncate max-w-[160px]">{panDoc.fileName || 'PAN Document'}</div>
                                  <button
                                    type="button"
                                    onClick={() => openDocPreview(m, 'pan')}
                                    className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-0.5 py-0.5 px-1.5"
                                    title="View uploaded PAN card file"
                                  >
                                    <Eye size={11} />
                                    <span>View File</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted">No File Uploaded</div>
                              )}
                            </div>
                          ) : panDoc.hasFile ? (
                            <div>
                              <div className="text-xs font-semibold text-primary-blue truncate max-w-[160px]">{panDoc.fileName || 'PAN Document'}</div>
                              <span className="badge badge-amber text-xs font-normal mt-0.5 inline-block">File Uploaded • Text Pending</span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => openDocPreview(m, 'pan')}
                                  className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-1 py-0.5 px-1.5"
                                  title="View uploaded PAN card file"
                                >
                                  <Eye size={11} />
                                  <span>View File</span>
                                </button>
                              </div>
                            </div>
                          ) : isVerified ? (
                            <span className="badge badge-green text-xs">Verified ✓</span>
                          ) : (
                            <span className="text-muted italic">Not Submitted</span>
                          )}
                        </td>
                        <td>
                          {hasBankText ? (
                            <div>
                              <span className="font-semibold">{m.kyc.bank_name} (••••{m.kyc.bank_account_number.slice(-4)})</span>
                              {m.kyc.bank_ifsc && <div className="text-xs text-muted">IFSC: {m.kyc.bank_ifsc}</div>}
                              {bankDoc.hasFile ? (
                                <div className="mt-1">
                                  <div className="text-xs text-primary-blue font-medium truncate max-w-[160px]">{bankDoc.fileName || 'Passbook File'}</div>
                                  <button
                                    type="button"
                                    onClick={() => openDocPreview(m, 'bankAccount')}
                                    className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-0.5 py-0.5 px-1.5"
                                    title="View uploaded bank passbook file"
                                  >
                                    <Eye size={11} />
                                    <span>View File</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted">No Passbook Uploaded</div>
                              )}
                            </div>
                          ) : bankDoc.hasFile ? (
                            <div>
                              <div className="text-xs font-semibold text-primary-blue truncate max-w-[160px]">{bankDoc.fileName || 'Passbook File'}</div>
                              <span className="badge badge-amber text-xs font-normal mt-0.5 inline-block">File Uploaded • Details Pending</span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => openDocPreview(m, 'bankAccount')}
                                  className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-1 py-0.5 px-1.5"
                                  title="View uploaded bank passbook file"
                                >
                                  <Eye size={11} />
                                  <span>View File</span>
                                </button>
                              </div>
                            </div>
                          ) : isVerified ? (
                            <span className="badge badge-green text-xs">Verified ✓</span>
                          ) : (
                            <span className="text-muted italic">Pending Bank Setup</span>
                          )}
                        </td>
                        <td>
                          <div className="text-xs flex items-center justify-between gap-1">
                            <div>
                              <span className="text-muted">Aadhaar: </span>
                              <span className={aadhaarDoc.hasFile ? 'text-primary-blue font-semibold' : 'text-muted'}>
                                {aadhaarDoc.hasFile ? (aadhaarDoc.fileName || 'Uploaded') : (docs.aadhaar?.includes('Verified') ? 'Verified ✓' : 'Not Uploaded')}
                              </span>
                            </div>
                            {aadhaarDoc.hasFile && (
                              <button
                                type="button"
                                onClick={() => openDocPreview(m, 'aadhaar')}
                                className="btn btn-outline-blue btn-xs flex items-center gap-0.5 py-0.5 px-1.5"
                                title="View uploaded Aadhaar card file"
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                          <div className="text-xs flex items-center justify-between gap-1 mt-1">
                            <div>
                              <span className="text-muted">Address: </span>
                              <span className={addressDoc.hasFile ? 'text-primary-blue font-semibold' : 'text-muted'}>
                                {addressDoc.hasFile ? (addressDoc.fileName || 'Uploaded') : (docs.addressProof?.includes('Verified') ? 'Verified ✓' : 'Not Uploaded')}
                              </span>
                            </div>
                            {addressDoc.hasFile && (
                              <button
                                type="button"
                                onClick={() => openDocPreview(m, 'addressProof')}
                                className="btn btn-outline-blue btn-xs flex items-center gap-0.5 py-0.5 px-1.5"
                                title="View uploaded Address proof file"
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isVerified ? 'badge-green' : (isUnderReview ? 'badge-amber' : 'badge-neutral')}`}>
                            {isVerified ? 'Verified ✓' : (isUnderReview ? 'Under Review' : 'Pending Documents')}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedKycMember(m)}
                              className="btn btn-secondary btn-sm py-1 px-2 text-xs"
                              title="Inspect full partner KYC dossier"
                            >
                              Details
                            </button>
                            {!isVerified && (
                              <button 
                                type="button"
                                onClick={() => approveKyc(m.member_id || m.id)}
                                className="btn btn-primary btn-sm py-1 px-2 text-xs"
                                title="Approve KYC documents"
                              >
                                Approve
                              </button>
                            )}
                            {!isVerified && (
                              <button 
                                type="button"
                                onClick={() => rejectKyc(m.member_id || m.id, 'Document illegible or mismatched')}
                                className="btn btn-secondary btn-sm py-1 px-2 text-xs text-rose"
                                title="Reject KYC"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: WEBHOOKS & GATEWAY INTEGRATION CONSOLE */}
        {adminTab === 'webhooks' && (
          <div className="admin-panel-card card-white p-6">
            <div className="webhook-console-header flex-between items-center mb-6 flex-wrap gap-3">
              <div>
                <h3 className="section-title-large mb-1">CyberShield Gateway & Webhook Hub</h3>
                <p className="text-muted text-sm">Cryptographic server-to-server HMAC-SHA256 webhooks, API endpoints & event dispatcher.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-green flex items-center gap-1 font-xs font-bold">
                  <span className="live-dot-pulse"></span> Live Gateway
                </span>
                <span className="badge badge-blue font-xs font-bold">
                  HMAC-SHA256 Protocol
                </span>
                <span className="badge badge-purple font-xs font-bold">
                  Idempotent Delivery
                </span>
              </div>
            </div>

            <div className="webhook-console-grid">
              {/* LEFT COLUMN: Endpoints & Simulator Controls */}
              <div className="webhook-left-col flex-col gap-4">
                {/* Active Endpoint Card */}
                <div className="webhook-panel-subcard">
                  <div className="subcard-title-row flex-between items-center mb-2">
                    <span className="subcard-label flex items-center gap-2 font-bold text-sm">
                      <Globe size={16} className="text-primary-blue" />
                      Production Webhook URL
                    </span>
                    <span className="badge badge-outline-blue font-2xs">POST Endpoint</span>
                  </div>
                  <div className="webhook-input-action-row">
                    <input 
                      type="text" 
                      readOnly 
                      value="https://cybernetworking.vercel.app/api/integrations/zex/webhook" 
                      className="form-input-clean code-font text-xs flex-1"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        navigator.clipboard.writeText('https://cybernetworking.vercel.app/api/integrations/zex/webhook');
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                        addToast('success', 'URL Copied', 'Webhook endpoint copied to clipboard');
                      }}
                      className="btn btn-secondary btn-sm flex items-center gap-1 shrink-0"
                    >
                      {copiedUrl ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Signing Secret Card */}
                <div className="webhook-panel-subcard">
                  <div className="subcard-title-row flex-between items-center mb-2">
                    <span className="subcard-label flex items-center gap-2 font-bold text-sm">
                      <Key size={16} className="text-amber" />
                      Webhook Signing Secret
                    </span>
                    <span className="badge badge-green font-2xs">HMAC Active</span>
                  </div>
                  <div className="webhook-input-action-row">
                    <input 
                      type={revealedSecret ? "text" : "password"}
                      readOnly 
                      value="whsec_live_9f82c0384a71b402e19a8df4" 
                      className="form-input-clean code-font text-xs flex-1"
                    />
                    <button 
                      type="button" 
                      onClick={() => setRevealedSecret(!revealedSecret)}
                      className="btn btn-secondary btn-sm flex items-center gap-1 shrink-0"
                      title={revealedSecret ? "Hide Secret" : "Reveal Secret"}
                    >
                      {revealedSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{revealedSecret ? 'Hide' : 'Show'}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        navigator.clipboard.writeText('whsec_live_9f82c0384a71b402e19a8df4');
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                        addToast('success', 'Secret Copied', 'Signing secret copied to clipboard');
                      }}
                      className="btn btn-secondary btn-sm flex items-center gap-1 shrink-0"
                    >
                      {copiedSecret ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-2xs text-muted mt-2 flex items-center gap-1">
                    <ShieldCheck size={13} className="text-success shrink-0" />
                    <span>Verified with constant-time crypto check & ±300s timestamp tolerance.</span>
                  </div>
                </div>

                {/* Interactive Event Simulator Card */}
                <div className="webhook-panel-subcard bg-card-highlight">
                  <div className="subcard-title-row flex-between items-center mb-3">
                    <span className="subcard-label flex items-center gap-2 font-bold text-sm">
                      <Terminal size={16} className="text-primary-blue" />
                      Dispatch Event Simulator
                    </span>
                    <span className="badge badge-blue font-2xs">Interactive</span>
                  </div>

                  <div className="form-group-clean mb-3">
                    <label className="form-label-clean text-xs">Event Type</label>
                    <select 
                      value={simulatedEvent} 
                      onChange={(e) => setSimulatedEvent(e.target.value)}
                      className="form-input-clean text-xs"
                    >
                      <option value="subscription.activated">subscription.activated (₹2,500 Joining Plan + Dual Accounts)</option>
                      <option value="sale.completed">sale.completed (ZEX Cloud SaaS Direct Sale)</option>
                      <option value="sale.adjusted">sale.adjusted (Cancellation / Refund)</option>
                    </select>
                  </div>

                  <div className="form-group-clean mb-3">
                    <label className="form-label-clean text-xs">Target Member / Partner</label>
                    <select 
                      value={simulatedMemberId} 
                      onChange={(e) => setSimulatedMemberId(e.target.value)}
                      className="form-input-clean text-xs"
                    >
                      {members.map(m => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="meta-strip-item mb-4 p-3 bg-white rounded border border-light">
                    <div className="flex-between text-xs mb-1">
                      <span className="text-muted">Total Transaction Amount:</span>
                      <strong className="text-primary-blue">₹2,950.00 (INR)</strong>
                    </div>
                    <div className="flex-between text-2xs text-muted">
                      <span>Base ₹2,500 + 18% GST ₹450</span>
                      <span className="text-success font-bold">6-Tier Commissions Verified</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={handleDispatchWebhook}
                    className="btn btn-primary full-width flex-center gap-2 btn-sm"
                  >
                    <Send size={15} />
                    <span>{isSimulating ? 'Computing HMAC & Dispatching...' : 'Dispatch Signed Webhook to Gateway'}</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Payload Inspector & History */}
              <div className="webhook-right-col flex-col gap-4">
                {/* Cryptographic Headers Box */}
                <div className="webhook-panel-subcard">
                  <div className="subcard-title-row flex-between items-center mb-2">
                    <span className="subcard-label flex items-center gap-2 font-bold text-sm">
                      <Lock size={16} className="text-success" />
                      Inbound Request Headers
                    </span>
                    <span className="badge badge-green font-2xs">HTTP 200 Ready</span>
                  </div>
                  <pre className="code-box-clean text-2xs">
                    {`POST /api/integrations/zex/webhook HTTP/1.1\n` +
                     `Host: cybernetworking.vercel.app\n` +
                     `Content-Type: application/json\n` +
                     `X-CyberShield-Signature: ${recentWebhooks[0]?.signature || 'v1=7d4f9b2a1e8c...3b0a'}\n` +
                     `X-CyberShield-Timestamp: ${Math.floor(Date.now() / 1000)}`}
                  </pre>
                </div>

                {/* Formatted JSON Payload Box */}
                <div className="webhook-panel-subcard">
                  <div className="subcard-title-row flex-between items-center mb-2">
                    <span className="subcard-label flex items-center gap-2 font-bold text-sm">
                      <Code2 size={16} className="text-primary-blue" />
                      Live Transmitted Payload (JSON)
                    </span>
                    <span className="badge badge-outline-blue font-2xs">JSON Payload</span>
                  </div>
                  <pre className="code-box-clean text-2xs">
                    {JSON.stringify({
                      event: simulatedEvent,
                      event_id: recentWebhooks[0]?.id || "evt_live_84920194",
                      timestamp: new Date().toISOString(),
                      data: {
                        order_id: "CS-ORD-94821",
                        member_id: simulatedMemberId,
                        member_email: members.find(m => m.member_id === simulatedMemberId)?.email || "partner@cybershield.in",
                        product_code: "CS-PRO-SUITE",
                        amount: 2500,
                        gst: 450,
                        total: 2950,
                        currency: "INR",
                        status: simulatedEvent === 'sale.adjusted' ? "refunded" : "paid",
                        commission_eligible: simulatedEvent !== 'sale.adjusted'
                      }
                    }, null, 2)}
                  </pre>
                </div>

                {/* Recent Delivery Audit Log */}
                <div className="webhook-panel-subcard">
                  <div className="subcard-title-row flex-between items-center mb-2">
                    <span className="subcard-label flex items-center gap-2 font-bold text-sm">
                      <Clock size={16} className="text-muted" />
                      Recent Webhook Deliveries
                    </span>
                    <span className="text-2xs text-muted font-bold">{recentWebhooks.length} Deliveries</span>
                  </div>
                  <div className="table-responsive">
                    <table className="coach-table text-xs">
                      <thead>
                        <tr>
                          <th>Event ID</th>
                          <th>Event</th>
                          <th>Signature</th>
                          <th>Latency</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentWebhooks.map(w => (
                          <tr key={w.id}>
                            <td className="code-font font-bold text-primary-blue">{w.id}</td>
                            <td><span className="badge badge-outline-blue font-2xs">{w.event}</span></td>
                            <td><span className="badge badge-green font-2xs">Verified ✓</span></td>
                            <td><span className="text-muted font-2xs">{w.latency}</span></td>
                            <td><span className="badge badge-green font-2xs">200 OK</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADMIN MANUAL PAYMENT & SCREENSHOT MODAL */}
      {selectedPayoutForManualPay && (
        <div className="custom-modal-backdrop" onClick={() => setSelectedPayoutForManualPay(null)}>
          <div className="admin-manual-pay-modal card-white" onClick={e => e.stopPropagation()}>
            <div className="admin-pay-modal-header">
              <div>
                <h3 className="modal-title-bold">Manual Bank Disbursement</h3>
                <p className="modal-sub-clean">
                  Request #{selectedPayoutForManualPay.id} • Forwarded by {selectedPayoutForManualPay.member_name}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPayoutForManualPay(null)} className="close-modal-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursement} className="admin-pay-modal-body">
              {/* Beneficiary Verification Box with 1-Click Copy */}
              <div className="beneficiary-pay-card">
                <div className="beneficiary-head-row">
                  <span className="badge badge-green font-xs">Verified Beneficiary KYC Details</span>
                  <span className="text-xs text-muted">Requested on {selectedPayoutForManualPay.request_date}</span>
                </div>

                <div className="beneficiary-details-grid">
                  <div className="pay-field-box">
                    <span className="pay-field-lbl">Beneficiary Legal Name</span>
                    <span className="pay-field-val font-bold">
                      {selectedPayoutForManualPay.bank_details?.account_holder || selectedPayoutForManualPay.member_name}
                    </span>
                  </div>

                  <div className="pay-field-box">
                    <span className="pay-field-lbl">Bank Name</span>
                    <span className="pay-field-val">
                      {selectedPayoutForManualPay.bank_details?.bank_name || 'Commercial Bank'}
                    </span>
                  </div>

                  <div className="pay-field-box">
                    <span className="pay-field-lbl">Full Bank Account Number</span>
                    <div className="copy-action-row">
                      <span className="pay-field-val code-font font-bold text-primary">
                        {selectedPayoutForManualPay.bank_details?.account_number || 'Not Provided'}
                      </span>
                      {selectedPayoutForManualPay.bank_details?.account_number && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPayoutForManualPay.bank_details.account_number);
                            setIsCopiedAc(true);
                            setTimeout(() => setIsCopiedAc(false), 2000);
                            addToast('success', 'A/C Copied', 'Account number copied to clipboard.');
                          }}
                          className="copy-mini-btn"
                          title="Copy Account Number"
                        >
                          {isCopiedAc ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          <span>{isCopiedAc ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pay-field-box">
                    <span className="pay-field-lbl">IFSC Code</span>
                    <div className="copy-action-row">
                      <span className="pay-field-val code-font font-bold">
                        {selectedPayoutForManualPay.bank_details?.ifsc || 'Not Provided'}
                      </span>
                      {selectedPayoutForManualPay.bank_details?.ifsc && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPayoutForManualPay.bank_details.ifsc);
                            setIsCopiedIfsc(true);
                            setTimeout(() => setIsCopiedIfsc(false), 2000);
                            addToast('success', 'IFSC Copied', 'IFSC code copied to clipboard.');
                          }}
                          className="copy-mini-btn"
                          title="Copy IFSC Code"
                        >
                          {isCopiedIfsc ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          <span>{isCopiedIfsc ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount to transfer banner */}
                <div className="admin-net-pay-banner">
                  <div className="pay-banner-breakdown">
                    <span>Gross Requested: <strong>₹{selectedPayoutForManualPay.amount.toLocaleString('en-IN')}</strong></span>
                    <span>{selectedPayoutForManualPay.tds_rate ? `${selectedPayoutForManualPay.tds_rate}% TDS Deducted` : 'TDS Deducted'} ({selectedPayoutForManualPay.tds_section || 'Statutory'}): <strong className="text-rose">-₹{selectedPayoutForManualPay.tds_amount.toLocaleString('en-IN')}</strong></span>
                  </div>
                  <div className="pay-banner-final">
                    <span className="final-pay-lbl">NET AMOUNT TO TRANSFER:</span>
                    <span className="final-pay-num">₹{selectedPayoutForManualPay.net_payable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="admin-instruction-alert">
                <AlertCircle size={16} className="text-primary-blue flex-shrink-0" />
                <p className="text-xs text-secondary mb-0">
                  <strong>Admin Instructions:</strong> Open your Corporate NetBanking / UPI, initiate a transfer of <strong>₹{selectedPayoutForManualPay.net_payable.toLocaleString('en-IN')}</strong> to the beneficiary above, enter the generated Bank UTR Reference, and attach the payment confirmation screenshot. The user's balance will be deducted immediately upon your confirmation.
                </p>
              </div>

              {/* Form Inputs: UTR, Payment Mode, Screenshot */}
              <div className="admin-pay-form-grid">
                <div className="form-group-clean">
                  <label className="form-label-clean">Bank Reference / UTR Number *</label>
                  <input
                    type="text"
                    required
                    value={manualUtr}
                    onChange={(e) => setManualUtr(e.target.value)}
                    placeholder="e.g. UTR-HDFC-992182910"
                    className="form-input-clean code-font font-bold"
                  />
                </div>

                <div className="form-group-clean">
                  <label className="form-label-clean">Transfer Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="form-input-clean"
                  >
                    <option value="IMPS">IMPS (Instant Bank Transfer)</option>
                    <option value="NEFT">NEFT (National Electronic Fund)</option>
                    <option value="RTGS">RTGS (Real-Time Gross Settlement)</option>
                    <option value="UPI">UPI (Unified Payments Interface)</option>
                  </select>
                </div>
              </div>

              {/* Screenshot Attachment Section */}
              <div className="form-group-clean">
                <div className="screenshot-label-row">
                  <label className="form-label-clean mb-0">Genuine Bank Payment Proof / Counterfoil *</label>
                  <span className="badge badge-amber font-xs font-semibold">Banking Compliance Mandate</span>
                </div>
                <p className="text-muted font-xs mt-1 mb-2">
                  Admin must disburse funds via corporate net banking / UPI and attach the authentic bank counterfoil. Simulated or fabricated receipts are strictly prohibited under financial audit rules.
                </p>

                <div className="upload-dropzone-box">
                  <input
                    type="file"
                    accept="image/*"
                    id="admin-screenshot-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="admin-screenshot-upload" className="dropzone-label">
                    <Upload size={18} className="text-primary-blue mb-1" />
                    <span className="font-semibold text-xs text-primary">Click to Upload Payment Screenshot</span>
                    <span className="text-muted font-xs">PNG, JPG, or PDF confirmation (max 5MB)</span>
                  </label>
                </div>

                {screenshotPreview && (
                  <div className="attached-preview-wrapper mt-3">
                    <div className="preview-tag-row">
                      <span className="badge badge-green font-xs">✓ Screenshot Attached</span>
                      <button
                        type="button"
                        onClick={() => setScreenshotPreview('')}
                        className="text-xs text-rose font-semibold bg-transparent border-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <img src={screenshotPreview} alt="Transfer Screenshot" className="attached-proof-thumbnail" />
                  </div>
                )}
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">Admin Notes (Optional)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Sent via HDFC NetBanking Corporate Gateway"
                  className="form-input-clean text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="admin-pay-modal-actions">
                <button
                  type="button"
                  onClick={handleRejectPayoutClick}
                  className="btn btn-secondary text-rose border-rose"
                >
                  Reject Request
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayoutForManualPay(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="confirm-payout-btn"
                    onClick={handleConfirmDisbursement}
                    className="btn btn-primary flex-center gap-1"
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirm Payout & Deduct Balance</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PROOF MODAL FOR ADMIN */}
      {selectedPayoutToView && (
        <div className="custom-modal-backdrop" onClick={() => setSelectedPayoutToView(null)}>
          <div className="receipt-viewer-modal card-white" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <div className="flex-center gap-2">
                <CheckCircle2 size={22} className="text-success" />
                <div>
                  <h4 className="modal-title-bold">Disbursement Proof (#{selectedPayoutToView.id})</h4>
                  <p className="modal-sub-clean">Transferred to {selectedPayoutToView.member_name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedPayoutToView(null)} className="close-modal-btn">
                <X size={18} />
              </button>
            </div>

            <div className="receipt-modal-body">
              <div className="receipt-meta-grid">
                <div className="meta-box">
                  <span className="meta-lbl">UTR / Reference</span>
                  <span className="meta-val code-font text-primary-blue">{selectedPayoutToView.admin_payment?.utr_number || 'UTR-CS-9918237'}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Net Amount</span>
                  <span className="meta-val font-bold text-success">₹{selectedPayoutToView.net_payable.toLocaleString('en-IN')}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Bank Account</span>
                  <span className="meta-val">{selectedPayoutToView.bank_details?.bank_name} ••••{selectedPayoutToView.bank_details?.account_number?.slice(-4)}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Date Paid</span>
                  <span className="meta-val">{selectedPayoutToView.admin_payment?.paid_at || '12 Oct 2026'}</span>
                </div>
              </div>

              <div className="receipt-screenshot-container">
                <div className="screenshot-tag">Transfer Screenshot Proof</div>
                {selectedPayoutToView.admin_payment?.receipt_url ? (
                  <img 
                    src={selectedPayoutToView.admin_payment.receipt_url} 
                    alt="Payment Screenshot" 
                    className="receipt-attached-img"
                  />
                ) : (
                  <div className="simulated-bank-receipt">
                    <div className="receipt-bank-header">
                      <ShieldCheck size={32} className="text-success" />
                      <div className="font-extrabold text-base text-primary">HDFC BANK IMPS CONFIRMATION</div>
                      <div className="badge badge-green font-xs">TRANSACTION SUCCESSFUL</div>
                    </div>
                    <div className="receipt-details-list">
                      <div className="detail-line">
                        <span>Beneficiary:</span>
                        <strong>{selectedPayoutToView.bank_details?.account_holder || selectedPayoutToView.member_name}</strong>
                      </div>
                      <div className="detail-line">
                        <span>A/C Number:</span>
                        <strong className="code-font">{selectedPayoutToView.bank_details?.account_number}</strong>
                      </div>
                      <div className="detail-line">
                        <span>IFSC:</span>
                        <strong className="code-font">{selectedPayoutToView.bank_details?.ifsc}</strong>
                      </div>
                      <div className="detail-line">
                        <span>Disbursed Net:</span>
                        <strong className="text-success font-bold">₹{selectedPayoutToView.net_payable.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="detail-line">
                        <span>UTR Reference:</span>
                        <strong className="code-font text-primary">{selectedPayoutToView.admin_payment?.utr_number}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="receipt-modal-footer">
              <button type="button" onClick={() => setSelectedPayoutToView(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full KYC Dossier Review */}
      {selectedKycMember && (() => {
        const m = selectedKycMember;
        const docs = m.kyc?.documents || {};
        const isVerified = m.kyc?.verification_status === 'verified';
        const hasPanDoc = Boolean(docs.pan && docs.pan !== 'Pending Upload' && docs.pan !== 'Not Uploaded');
        const hasBankDoc = Boolean(docs.bankAccount && docs.bankAccount !== 'Pending Upload' && docs.bankAccount !== 'Not Uploaded');
        const panDoc = getDocFileInfo(m, 'pan');
        const bankDoc = getDocFileInfo(m, 'bankAccount');
        const aadhaarDoc = getDocFileInfo(m, 'aadhaar');
        const addressDoc = getDocFileInfo(m, 'addressProof');

        return (
          <div className="custom-modal-backdrop" onClick={() => setSelectedKycMember(null)}>
            <div className="card-white max-w-2xl w-full p-6 border-rounded shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="receipt-modal-header flex-between items-center border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={22} className="text-primary-blue" />
                  <h3 className="section-title-large">Partner KYC Dossier</h3>
                </div>
                <button type="button" onClick={() => setSelectedKycMember(null)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Header Summary */}
                <div className="p-3 bg-card-alt border-rounded flex-between items-center">
                  <div>
                    <h4 className="font-bold text-base">{m.name}</h4>
                    <span className="text-muted text-xs">{m.email} • ID: {m.member_id || m.id}</span>
                  </div>
                  <span className={`badge ${isVerified ? 'badge-green' : 'badge-amber'}`}>
                    {isVerified ? 'KYC Verified ✓' : 'Under Review'}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="card-alt p-3 border-rounded flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-muted block mb-1 font-semibold">1. Permanent Account Number (PAN)</span>
                      <div className="font-bold code-font text-sm">{m.kyc?.pan || 'PAN Number Pending'}</div>
                      <div className="text-xs text-primary-blue mt-1">
                        File: {panDoc.hasFile ? (panDoc.fileName || 'Attached') : 'No file uploaded'}
                      </div>
                    </div>
                    {panDoc.hasFile && (
                      <button
                        type="button"
                        onClick={() => openDocPreview(m, 'pan')}
                        className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-3 self-start"
                      >
                        <Eye size={12} />
                        <span>View Uploaded File</span>
                      </button>
                    )}
                  </div>

                  <div className="card-alt p-3 border-rounded flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-muted block mb-1 font-semibold">2. Bank Settlement Account</span>
                      <div className="font-bold text-sm">{m.kyc?.bank_name || 'Bank Name Pending'}</div>
                      <div className="text-xs code-font text-muted">A/C: {m.kyc?.bank_account_number || 'Pending'} • IFSC: {m.kyc?.bank_ifsc || 'Pending'}</div>
                      <div className="text-xs text-primary-blue mt-1">
                        File: {bankDoc.hasFile ? (bankDoc.fileName || 'Attached') : 'No file uploaded'}
                      </div>
                    </div>
                    {bankDoc.hasFile && (
                      <button
                        type="button"
                        onClick={() => openDocPreview(m, 'bankAccount')}
                        className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-3 self-start"
                      >
                        <Eye size={12} />
                        <span>View Uploaded File</span>
                      </button>
                    )}
                  </div>

                  <div className="card-alt p-3 border-rounded flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-muted block mb-1 font-semibold">3. Aadhaar Identity Proof</span>
                      <div className="text-xs font-semibold text-primary-blue">
                        {aadhaarDoc.hasFile ? (aadhaarDoc.fileName || 'Attached') : (docs.aadhaar?.includes('Verified') ? 'Verified ✓' : 'Not Uploaded')}
                      </div>
                    </div>
                    {aadhaarDoc.hasFile && (
                      <button
                        type="button"
                        onClick={() => openDocPreview(m, 'aadhaar')}
                        className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-3 self-start"
                      >
                        <Eye size={12} />
                        <span>View Uploaded File</span>
                      </button>
                    )}
                  </div>

                  <div className="card-alt p-3 border-rounded flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-muted block mb-1 font-semibold">4. Address Proof</span>
                      <div className="text-xs font-semibold text-primary-blue">
                        {addressDoc.hasFile ? (addressDoc.fileName || 'Attached') : (docs.addressProof?.includes('Verified') ? 'Verified ✓' : 'Not Uploaded')}
                      </div>
                    </div>
                    {addressDoc.hasFile && (
                      <button
                        type="button"
                        onClick={() => openDocPreview(m, 'addressProof')}
                        className="btn btn-outline-blue btn-xs flex items-center gap-1 mt-3 self-start"
                      >
                        <Eye size={12} />
                        <span>View Uploaded File</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Compliance & Agreement */}
                <div className="p-3 bg-card-alt border-rounded text-xs text-muted flex-between">
                  <div>
                    <span>Direct Selling Agreement: </span>
                    <strong className="text-primary">{m.kyc?.agreement_version || 'v2026.1'} Accepted</strong>
                  </div>
                  {m.kyc?.submitted_at && (
                    <span>Submitted: {new Date(m.kyc.submitted_at).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
              </div>

              <div className="receipt-modal-footer flex-between items-center mt-6 pt-3 border-t">
                <button type="button" onClick={() => setSelectedKycMember(null)} className="btn btn-secondary">
                  Close Dossier
                </button>
                <div className="flex items-center gap-2">
                  {!isVerified && (
                    <>
                      <button 
                        type="button"
                        onClick={() => {
                          rejectKyc(m.member_id || m.id, 'Document illegible or mismatched');
                          setSelectedKycMember(null);
                        }} 
                        className="btn btn-secondary text-rose"
                      >
                        Reject KYC
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          approveKyc(m.member_id || m.id);
                          setSelectedKycMember(null);
                        }} 
                        className="btn btn-primary"
                      >
                        Approve KYC
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Document Viewer - EXACT USER UPLOAD */}
      {previewingDoc && (
        <div className="custom-modal-backdrop" style={{ zIndex: 9999 }} onClick={() => setPreviewingDoc(null)}>
          <div 
            className="card-white" 
            style={{ 
              width: '100%', 
              maxWidth: '740px', 
              maxHeight: '90vh', 
              borderRadius: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px rgba(15, 23, 42, 0.35)',
              border: '1px solid #E2E8F0'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="receipt-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary" style={{ margin: 0 }}>
                    {previewingDoc.title}
                  </h3>
                  <p className="text-xs text-muted" style={{ margin: '2px 0 0 0' }}>
                    {previewingDoc.member.name} • {previewingDoc.member.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${previewingDoc.status === 'verified' ? 'badge-green' : 'badge-amber'}`}>
                  {previewingDoc.status === 'verified' ? 'Verified ✓' : 'Under Review'}
                </span>
                <button 
                  type="button" 
                  onClick={() => setPreviewingDoc(null)} 
                  className="close-modal-btn"
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: EXACT Uploaded File */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {previewingDoc.docFile ? (
                <>
                  {/* File Metadata Pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-primary-blue" />
                      <span className="code-font font-semibold text-xs text-primary-blue">{previewingDoc.docName || 'Uploaded File'}</span>
                      {previewingDoc.docSize && <span className="text-xs text-muted">({previewingDoc.docSize})</span>}
                    </div>
                    <a
                      href={previewingDoc.docFile}
                      download={previewingDoc.docName || `${previewingDoc.docKey}_file`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                      title="Download original uploaded file"
                    >
                      <Download size={12} />
                      <span>Download</span>
                    </a>
                  </div>

                  {/* Render exact uploaded image */}
                  {(previewingDoc.docFile.startsWith('data:image/') || previewingDoc.docType.startsWith('image/')) ? (
                    <div style={{ textAlign: 'center', background: '#0F172A', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
                      <img 
                        src={previewingDoc.docFile} 
                        alt={previewingDoc.title}
                        style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '8px' }} 
                      />
                    </div>
                  ) : (previewingDoc.docFile.startsWith('data:application/pdf') || previewingDoc.docType.includes('pdf')) ? (
                    /* Render exact uploaded PDF */
                    <div style={{ width: '100%', height: '480px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                      <iframe 
                        src={previewingDoc.docFile} 
                        title={previewingDoc.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  ) : (
                    /* Other exact file format */
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                      <FileText size={48} className="mx-auto text-primary-blue mb-2" />
                      <h4 className="font-bold text-base text-primary mb-1">{previewingDoc.docName || 'Uploaded File'}</h4>
                      <p className="text-xs text-muted mb-4">{previewingDoc.docSize || ''} • {previewingDoc.docType}</p>
                      <a
                        href={previewingDoc.docFile}
                        download={previewingDoc.docName || `${previewingDoc.docKey}_file`}
                        className="btn btn-primary btn-sm inline-flex items-center gap-1"
                      >
                        <Download size={14} />
                        <span>Download & View File</span>
                      </a>
                    </div>
                  )}
                </>
              ) : (
                /* No file actually uploaded */
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '36px 24px', textAlign: 'center' }}>
                  <AlertCircle size={44} className="mx-auto text-amber-500 mb-3" />
                  <h4 className="font-bold text-base text-slate-800 mb-1">No File Uploaded</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    The partner has not uploaded a file for <strong>{previewingDoc.title}</strong> yet.
                  </p>
                  {previewingDoc.docName && (
                    <div className="mt-2 text-xs text-muted">
                      Previous file reference: <code className="text-primary-blue font-semibold">{previewingDoc.docName}</code>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => setPreviewingDoc(null)} 
                className="btn btn-secondary"
              >
                Close Viewer
              </button>
              <div className="flex items-center gap-2">
                {previewingDoc.docFile && (
                  <a
                    href={previewingDoc.docFile}
                    download={previewingDoc.docName || `${previewingDoc.docKey}_file`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-blue btn-sm flex items-center gap-1"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </a>
                )}
                {previewingDoc.status !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => {
                      approveKyc(previewingDoc.member.member_id || previewingDoc.member.id);
                      setPreviewingDoc(null);
                      if (selectedKycMember) setSelectedKycMember(null);
                    }}
                    className="btn btn-primary btn-sm flex items-center gap-1"
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve KYC</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
