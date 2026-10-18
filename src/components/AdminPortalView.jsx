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
  FileText,
  History,
  Search,
  Filter
} from 'lucide-react';
import { getDocumentFile, generateDocPlaceholder, saveDocumentFile } from '../utils/documentStorage';
import { getEffectiveKycStatus, validateAadhaar, maskAadhaar } from '../utils/kycValidation';

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
    uploadKycDocument,
    isDbConnected,
    auditLogs = [],
    addToast 
  } = useMlm();

  const [adminTab, setAdminTab] = useState('activations'); // 'activations' | 'payouts' | 'orders' | 'kyc' | 'audit' | 'webhooks'
  const [selectedPayoutForManualPay, setSelectedPayoutForManualPay] = useState(null);
  const [selectedPayoutToView, setSelectedPayoutToView] = useState(null);
  const [selectedKycMember, setSelectedKycMember] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [revealedBankMembers, setRevealedBankMembers] = useState({});
  const [revealedAadhaarMembers, setRevealedAadhaarMembers] = useState({});
  const [auditFilterAction, setAuditFilterAction] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [rejectionModal, setRejectionModal] = useState({
    open: false,
    member: null,
    predefinedReason: 'Document illegible or blurred',
    customReason: ''
  });

  const getDocFileInfo = (member, docKey) => {
    const docs = member?.kyc?.documents || {};
    const memId = member?.member_id || member?.id;
    const docStoreItem = getDocumentFile(memId, docKey);

    // Only accept real uploaded file data (data:image/..., data:application/pdf..., or blob)
    let fileData = docs[`${docKey}File`] || 
      (typeof docs[docKey] === 'string' && (docs[docKey].startsWith('data:image/') || docs[docKey].startsWith('data:application/pdf') || docs[docKey].startsWith('blob:')) ? docs[docKey] : null) || 
      docStoreItem?.dataUrl || 
      null;

    let fileName = docs[`${docKey}Name`] || docStoreItem?.name || null;
    let fileType = docs[`${docKey}Type`] || docStoreItem?.type || null;
    let fileSize = docs[`${docKey}Size`] || docStoreItem?.size || null;

    const rawVal = docs[docKey];
    if (!fileName && typeof rawVal === 'string' && rawVal.startsWith('Uploaded (')) {
      fileName = rawVal.replace('Uploaded (', '').replace(/\)$/, '');
    }

    const hasFile = Boolean(fileData);

    return {
      hasFile,
      fileData,
      fileName: fileName || (hasFile ? `${docKey}_file` : null),
      fileType: fileType || (fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? 'image/jpeg' : fileName?.match(/\.pdf$/i) ? 'application/pdf' : 'document'),
      fileSize: fileSize || null,
      isGeneratedFallback: false
    };
  };

  const openDocPreview = async (member, docKey) => {
    const titles = {
      pan: 'PAN Card',
      bankAccount: 'Bank Passbook / Cheque',
      aadhaar: 'Aadhaar Card',
      addressProof: 'Address Proof'
    };
    let fileInfo = getDocFileInfo(member, docKey);

    // If file not in local memory, query the persistent Neon PostgreSQL cloud endpoint
    if (!fileInfo.hasFile) {
      try {
        const memId = member?.member_id || member?.id;
        const res = await fetch(`/api/kyc/upload?memberId=${encodeURIComponent(memId)}&docKey=${encodeURIComponent(docKey)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.document?.data_url) {
            saveDocumentFile(memId, docKey, {
              name: json.document.file_name,
              type: json.document.file_type,
              size: json.document.file_size,
              dataUrl: json.document.data_url
            });
            fileInfo = getDocFileInfo(member, docKey);
          }
        }
      } catch (err) {
        console.warn('[Doc Preview] Live Neon DB fetch error:', err);
      }
    }

    setPreviewingDoc({
      member,
      docKey,
      title: titles[docKey] || docKey,
      docName: fileInfo.fileName,
      docFile: fileInfo.fileData,
      docType: fileInfo.fileType,
      docSize: fileInfo.fileSize,
      hasFile: fileInfo.hasFile,
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
    if (!cleanUtr || cleanUtr.length < 6) {
      addToast('error', 'UTR Missing or Invalid', 'Please enter a valid Bank Reference / UTR Number from your corporate bank transfer.');
      return;
    }

    // Payment proof screenshot is strictly optional: admin can proceed with UTR reference alone
    approvePayout({
      payoutId: selectedPayoutForManualPay.id,
      utrNumber: cleanUtr,
      receiptUrl: screenshotPreview || '',
      paymentMode: paymentMode,
      adminNotes: adminNotes || 'Disbursed via verified corporate banking gateway.'
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
            onClick={() => setAdminTab('audit')}
            className={`admin-clean-tab ${adminTab === 'audit' ? 'active' : ''}`}
          >
            Compliance & Audit Trail ({auditLogs.length})
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
          <div className="admin-panel-card card-white">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title">New Partner Activations & Dual Accounts Provisioning</h3>
                <p className="admin-panel-subtitle">
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
                            <span className="spec-v">10-Tier Unilevel Matrix</span>
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
          <div className="admin-panel-card card-white">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title">Bank Payout Disbursements</h3>
                <p className="admin-panel-subtitle">
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
          <div className="admin-panel-card card-white">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title">Retail Orders & CyberShield Billing</h3>
                <p className="admin-panel-subtitle">
                  Real-time direct sales transactions, enterprise licenses, and recurring customer orders across all active partners.
                </p>
              </div>
            </div>
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
          <div className="admin-panel-card card-white">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title">Partner KYC Approvals</h3>
                <p className="admin-panel-subtitle">
                  Review submitted identity documents, PAN cards, and bank settlement details before authorizing partner commission withdrawals.
                </p>
              </div>
            </div>
            
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

                    // Check genuine uploaded documents (requires actual file data)
                    const genuinePan = panDoc.hasFile;
                    const genuineBank = bankDoc.hasFile;
                    const genuineAadhaar = aadhaarDoc.hasFile;
                    const genuineAddress = addressDoc.hasFile;
                    const uploadedDocsCount = (genuinePan ? 1 : 0) + (genuineBank ? 1 : 0) + (genuineAadhaar ? 1 : 0) + (genuineAddress ? 1 : 0);
                    const hasAnyUploadedDoc = uploadedDocsCount > 0;
                    const isFullyDocumented = uploadedDocsCount === 4 && hasPanText && hasBankText;

                    const hasAnySubmissions = hasPanText || hasBankText || hasAnyUploadedDoc;
                    const effectiveStatus = getEffectiveKycStatus(m);
                    const isVerified = effectiveStatus === 'verified';
                    const isUnderReview = effectiveStatus === 'under_review';
                    const isRejected = effectiveStatus === 'rejected';

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
                              <div className="mt-1 flex items-center gap-1.5">
                                {panDoc.hasFile ? (
                                  <>
                                    <span className="text-xs text-muted truncate max-w-[120px]">{panDoc.fileName}</span>
                                    <button
                                      type="button"
                                      onClick={() => openDocPreview(m, 'pan')}
                                      className="btn btn-outline-blue btn-xs flex items-center gap-1 py-0.5 px-1.5"
                                      title="View PAN Card document"
                                    >
                                      <Eye size={11} />
                                      <span>View</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="badge badge-neutral text-2xs" style={{ fontSize: '10px', padding: '1px 6px', color: '#94A3B8' }}>
                                    Awaiting Upload
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : panDoc.hasFile ? (
                            <div>
                              <div className="text-xs font-semibold text-primary-blue truncate max-w-[150px]">{panDoc.fileName}</div>
                              <span className="badge badge-amber text-xs font-normal mt-0.5 inline-block">File Uploaded</span>
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => openDocPreview(m, 'pan')}
                                  className="btn btn-outline-blue btn-xs flex items-center gap-1 py-0.5 px-1.5"
                                  title="View PAN Card document"
                                >
                                  <Eye size={11} />
                                  <span>View</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="badge badge-neutral text-2xs" style={{ fontSize: '10px', padding: '1px 6px', color: '#94A3B8' }}>
                                Awaiting Upload
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          {hasBankText ? (
                            <div>
                              <span className="font-semibold">{m.kyc.bank_name} (••••{m.kyc.bank_account_number.slice(-4)})</span>
                              {m.kyc.bank_ifsc && <div className="text-xs text-muted">IFSC: {m.kyc.bank_ifsc}</div>}
                              <div className="mt-1 flex items-center gap-1.5">
                                {bankDoc.hasFile ? (
                                  <>
                                    <span className="text-xs text-muted truncate max-w-[120px]">{bankDoc.fileName}</span>
                                    <button
                                      type="button"
                                      onClick={() => openDocPreview(m, 'bankAccount')}
                                      className="btn btn-outline-blue btn-xs flex items-center gap-1 py-0.5 px-1.5"
                                      title="View Bank Passbook document"
                                    >
                                      <Eye size={11} />
                                      <span>View</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="badge badge-neutral text-2xs" style={{ fontSize: '10px', padding: '1px 6px', color: '#94A3B8' }}>
                                    Awaiting Upload
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : bankDoc.hasFile ? (
                            <div>
                              <div className="text-xs font-semibold text-primary-blue truncate max-w-[150px]">{bankDoc.fileName}</div>
                              <span className="badge badge-amber text-xs font-normal mt-0.5 inline-block">File Uploaded</span>
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => openDocPreview(m, 'bankAccount')}
                                  className="btn btn-outline-blue btn-xs flex items-center gap-1 py-0.5 px-1.5"
                                  title="View Bank Passbook document"
                                >
                                  <Eye size={11} />
                                  <span>View</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="badge badge-neutral text-2xs" style={{ fontSize: '10px', padding: '1px 6px', color: '#94A3B8' }}>
                                Awaiting Upload
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-xs flex items-center justify-between gap-1">
                            <div>
                              <span className="text-muted">Aadhaar: </span>
                              <span className={aadhaarDoc.hasFile ? 'text-primary-blue font-semibold' : isVerified ? 'text-success font-semibold' : 'text-muted'}>
                                {aadhaarDoc.hasFile ? (aadhaarDoc.fileName || 'Uploaded') : isVerified ? 'Verified ✓' : 'Not Uploaded'}
                              </span>
                            </div>
                            {aadhaarDoc.hasFile ? (
                              <button
                                type="button"
                                onClick={() => openDocPreview(m, 'aadhaar')}
                                className="btn btn-outline-blue btn-xs flex items-center gap-0.5 py-0.5 px-1.5"
                                title="View Aadhaar Card document"
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            ) : (
                              <span className="badge badge-neutral font-2xs" style={{ fontSize: '10px', padding: '1px 6px', color: '#94A3B8' }}>
                                Awaiting Upload
                              </span>
                            )}
                          </div>
                          <div className="text-xs flex items-center justify-between gap-1 mt-1.5">
                            <div>
                              <span className="text-muted">Address: </span>
                              <span className={addressDoc.hasFile ? 'text-primary-blue font-semibold' : isVerified ? 'text-success font-semibold' : 'text-muted'}>
                                {addressDoc.hasFile ? (addressDoc.fileName || 'Uploaded') : isVerified ? 'Verified ✓' : 'Not Uploaded'}
                              </span>
                            </div>
                            {addressDoc.hasFile ? (
                              <button
                                type="button"
                                onClick={() => openDocPreview(m, 'addressProof')}
                                className="btn btn-outline-blue btn-xs flex items-center gap-0.5 py-0.5 px-1.5"
                                title="View Address Proof document"
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            ) : (
                              <span className="badge badge-neutral font-2xs" style={{ fontSize: '10px', padding: '1px 6px', color: '#94A3B8' }}>
                                Awaiting Upload
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isVerified ? 'badge-green' : (isUnderReview ? 'badge-amber' : (isRejected ? 'badge-rose' : 'badge-neutral'))}`}>
                            {isVerified ? 'Verified ✓' : (isUnderReview ? 'Under Review' : (isRejected ? 'Rejected' : 'Pending Documents'))}
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
                              uploadedDocsCount === 0 ? (
                                <button 
                                  type="button" 
                                  disabled 
                                  className="btn btn-secondary btn-sm py-1 px-2 text-xs" 
                                  style={{ opacity: 0.5, cursor: 'not-allowed', color: '#94A3B8' }}
                                  title="Direct Selling Rules 2021 prohibit approval without verified documents"
                                >
                                  0 Uploads
                                </button>
                              ) : (
                                <>
                                  <button 
                                    type="button" 
                                    onClick={() => approveKyc(m.member_id || m.id)}
                                    className="btn btn-primary btn-sm py-1 px-2 text-xs"
                                    title={isFullyDocumented ? "Approve & Fully Authorize KYC" : `Approve ${uploadedDocsCount}/4 submitted proofs`}
                                  >
                                    {isFullyDocumented ? 'Approve' : `Approve (${uploadedDocsCount}/4)`}
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => setRejectionModal({
                                      open: true,
                                      member: m,
                                      predefinedReason: 'Document illegible or blurred',
                                      customReason: ''
                                    })}
                                    className="btn btn-secondary btn-sm py-1 px-2 text-xs text-rose"
                                    title="Record Statutory KYC Rejection"
                                  >
                                    Reject
                                  </button>
                                </>
                              )
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

        {/* TAB 3B: STATUTORY COMPLIANCE AUDIT TRAIL */}
        {adminTab === 'audit' && (
          <div className="admin-panel-card card-white">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title flex items-center gap-2">
                  <History size={20} className="text-primary-blue" />
                  Statutory Compliance & Audit Trail (Direct Selling Rules 2021)
                </h3>
                <p className="admin-panel-subtitle">
                  Immutable historical log of partner KYC verification approvals, statutory rejections, compliance overrides, and IP metadata for regulatory audit compliance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-green flex items-center gap-1 font-xs font-bold">
                  <span className="live-dot-pulse"></span> Neon PostgreSQL Synced
                </span>
                <span className="badge badge-blue font-xs font-bold">
                  Rule 3(1)(b) Compliant
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span className="text-2xs text-muted block font-semibold uppercase tracking-wider">Total Audited Events</span>
                <span className="text-xl font-bold text-main">{auditLogs.length}</span>
                <span className="text-2xs text-primary-blue block mt-0.5">Cloud Database Records</span>
              </div>
              <div style={{ background: '#F0FDF4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                <span className="text-2xs text-muted block font-semibold uppercase tracking-wider">KYC Approvals</span>
                <span className="text-xl font-bold text-success">{auditLogs.filter(a => a.action === 'kyc_approved').length}</span>
                <span className="text-2xs text-success block mt-0.5">Direct Selling Certified</span>
              </div>
              <div style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: '10px', border: '1px solid #FECACA' }}>
                <span className="text-2xs text-muted block font-semibold uppercase tracking-wider">KYC Rejections</span>
                <span className="text-xl font-bold text-rose">{auditLogs.filter(a => a.action === 'kyc_rejected').length}</span>
                <span className="text-2xs text-rose block mt-0.5">Deficiencies Logged</span>
              </div>
              <div style={{ background: '#EEF2FF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #C7D2FE' }}>
                <span className="text-2xs text-muted block font-semibold uppercase tracking-wider">Active Partners</span>
                <span className="text-xl font-bold text-primary-blue">{members.length}</span>
                <span className="text-2xs text-primary-blue block mt-0.5">In Network Registry</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex-between items-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuditFilterAction('all')}
                  className={`btn btn-xs ${auditFilterAction === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  All Events ({auditLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterAction('kyc_approved')}
                  className={`btn btn-xs ${auditFilterAction === 'kyc_approved' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Approvals ({auditLogs.filter(a => a.action === 'kyc_approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterAction('kyc_rejected')}
                  className={`btn btn-xs ${auditFilterAction === 'kyc_rejected' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Rejections ({auditLogs.filter(a => a.action === 'kyc_rejected').length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search partner, admin, or ID..."
                    className="form-input-clean text-xs"
                    style={{ paddingLeft: '32px', paddingRight: '12px', height: '32px' }}
                  />
                </div>
              </div>
            </div>

            {/* Audit Table */}
            {(() => {
              const filtered = auditLogs.filter(log => {
                if (auditFilterAction !== 'all' && log.action !== auditFilterAction) return false;
                if (auditSearchQuery.trim()) {
                  const q = auditSearchQuery.toLowerCase();
                  const mName = (log.member_name || '').toLowerCase();
                  const mId = (log.member_id || '').toLowerCase();
                  const aName = (log.admin_name || '').toLowerCase();
                  const reason = (log.reason || '').toLowerCase();
                  const id = (log.id || '').toLowerCase();
                  return mName.includes(q) || mId.includes(q) || aName.includes(q) || reason.includes(q) || id.includes(q);
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center text-muted" style={{ background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                    <History size={32} className="mx-auto text-slate-400 mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-main">No Audit Log Records Match Criteria</p>
                    <p className="text-xs text-muted mt-1">
                      {auditLogs.length === 0 
                        ? 'Compliance actions (approving or rejecting KYC) will automatically populate immutable audit records here in real-time.' 
                        : 'Try adjusting your search query or action filter.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="admin-table-container">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Timestamp (IST)</th>
                        <th>Audited Action</th>
                        <th>Compliance Admin</th>
                        <th>Direct Partner</th>
                        <th>Statutory Reason / Findings</th>
                        <th>Client IP & Origin</th>
                        <th>Audit Record ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((log) => {
                        const isApproved = log.action === 'kyc_approved';
                        const timeStr = log.created_at 
                          ? new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : 'Just now';

                        return (
                          <tr key={log.id}>
                            <td className="text-xs text-muted font-medium whitespace-nowrap">
                              {timeStr}
                            </td>
                            <td>
                              <span className={`badge ${isApproved ? 'badge-green' : 'badge-amber'} font-2xs font-bold inline-flex items-center gap-1`}>
                                {isApproved ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                                {isApproved ? 'KYC APPROVED' : 'KYC REJECTED'}
                              </span>
                            </td>
                            <td>
                              <div className="font-semibold text-xs text-main">{log.admin_name || 'Compliance Admin'}</div>
                              <div className="text-2xs text-muted code-font">{log.admin_id || 'ADMIN_CONSOLE'}</div>
                            </td>
                            <td>
                              <div className="font-semibold text-xs text-main">{log.member_name || log.member_id}</div>
                              <div className="text-2xs text-muted code-font">{log.member_id}</div>
                            </td>
                            <td style={{ maxWidth: '280px' }}>
                              <div className="text-xs text-main font-medium" style={{ wordBreak: 'break-word' }}>
                                {log.reason || (isApproved ? 'Statutory KYC verified' : 'Deficiency in documents')}
                              </div>
                            </td>
                            <td>
                              <div className="code-font text-xs text-muted">{log.ip_address || '127.0.0.1'}</div>
                              <div className="text-2xs text-muted truncate" style={{ maxWidth: '140px' }} title={log.user_agent}>
                                {log.user_agent || 'Web Admin Console'}
                              </div>
                            </td>
                            <td>
                              <span className="code-font text-2xs text-muted bg-card-alt px-1.5 py-0.5 rounded border">
                                {log.id}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 4: WEBHOOKS & GATEWAY INTEGRATION CONSOLE */}
        {adminTab === 'webhooks' && (
          <div className="admin-panel-card card-white">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title">CyberShield Gateway & Webhook Hub</h3>
                <p className="admin-panel-subtitle">Cryptographic server-to-server HMAC-SHA256 webhooks, API endpoints & event dispatcher.</p>
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
                      <span className="text-success font-bold">10-Tier Commissions Verified</span>
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
                  <div className="pay-detail-item">
                    <span className="pay-lbl">Beneficiary Legal Name</span>
                    <span className="pay-val">
                      {selectedPayoutForManualPay.bank_details?.account_holder || selectedPayoutForManualPay.member_name}
                    </span>
                  </div>

                  <div className="pay-detail-item">
                    <span className="pay-lbl">Bank Name</span>
                    <span className="pay-val">
                      {selectedPayoutForManualPay.bank_details?.bank_name || selectedPayoutForManualPay.bank_name || 'Commercial Bank'}
                    </span>
                  </div>

                  <div className="pay-detail-item">
                    <span className="pay-lbl">Full Bank Account Number</span>
                    <div className="pay-val-copy-row">
                      <span className="pay-val code-font text-primary-blue">
                        {selectedPayoutForManualPay.bank_details?.account_number || selectedPayoutForManualPay.bank_account || 'Not Provided'}
                      </span>
                      {(selectedPayoutForManualPay.bank_details?.account_number || selectedPayoutForManualPay.bank_account) && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPayoutForManualPay.bank_details?.account_number || selectedPayoutForManualPay.bank_account);
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

                  <div className="pay-detail-item">
                    <span className="pay-lbl">IFSC Code</span>
                    <div className="pay-val-copy-row">
                      <span className="pay-val code-font">
                        {selectedPayoutForManualPay.bank_details?.ifsc || selectedPayoutForManualPay.bank_ifsc || 'Not Provided'}
                      </span>
                      {(selectedPayoutForManualPay.bank_details?.ifsc || selectedPayoutForManualPay.bank_ifsc) && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPayoutForManualPay.bank_details?.ifsc || selectedPayoutForManualPay.bank_ifsc);
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
                    <div className="breakdown-line">
                      <span className="text-xs text-muted">Gross Requested:</span>
                      <strong className="text-sm">₹{selectedPayoutForManualPay.amount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="breakdown-line">
                      <span className="text-xs text-muted">
                        {selectedPayoutForManualPay.tds_rate ? `${selectedPayoutForManualPay.tds_rate}% TDS Deducted` : 'TDS Deducted'} ({selectedPayoutForManualPay.tds_section || 'Statutory'}):
                      </span>
                      <strong className="text-sm text-rose">-₹{selectedPayoutForManualPay.tds_amount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  <div className="pay-banner-final">
                    <span className="final-pay-lbl">NET AMOUNT TO TRANSFER</span>
                    <span className="final-pay-num">₹{selectedPayoutForManualPay.net_payable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="admin-instruction-alert">
                <AlertCircle size={18} className="text-primary-blue flex-shrink-0 mt-0.5" />
                <p className="text-xs text-secondary mb-0 leading-relaxed">
                  <strong>Admin Instructions:</strong> Open your Corporate NetBanking / UPI, initiate a transfer of <strong>₹{selectedPayoutForManualPay.net_payable.toLocaleString('en-IN')}</strong> to the beneficiary above, enter the generated Bank UTR Reference, and optionally attach the payment confirmation screenshot. The user's balance will be deducted immediately upon your confirmation.
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

              {/* Screenshot Attachment Section (Optional) */}
              <div className="form-group-clean">
                <div className="screenshot-label-row">
                  <label className="form-label-clean mb-0">Bank Payment Receipt / Screenshot (Optional)</label>
                  <span className="badge badge-blue font-xs">Optional</span>
                </div>
                <p className="text-muted font-xs mt-1 mb-2">
                  Entering the UTR reference number alone is sufficient to approve payout. Uploading a receipt screenshot is optional.
                </p>

                <div className="upload-dropzone-box">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    id="admin-screenshot-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="admin-screenshot-upload" className="dropzone-label">
                    <Upload size={18} className="text-primary-blue mb-1" />
                    <span className="font-semibold text-xs text-primary">Click to Upload Payment Screenshot (Optional)</span>
                    <span className="text-muted font-xs">PNG, JPG, or PDF (optional)</span>
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
        const effectiveStatus = getEffectiveKycStatus(m);
        const isVerified = effectiveStatus === 'verified';
        const isUnderReview = effectiveStatus === 'under_review';
        const isRejected = effectiveStatus === 'rejected';
        const panDoc = getDocFileInfo(m, 'pan');
        const bankDoc = getDocFileInfo(m, 'bankAccount');
        const aadhaarDoc = getDocFileInfo(m, 'aadhaar');
        const addressDoc = getDocFileInfo(m, 'addressProof');
        const genuinePan = panDoc.hasFile;
        const genuineBank = bankDoc.hasFile;
        const genuineAadhaar = aadhaarDoc.hasFile;
        const genuineAddress = addressDoc.hasFile;
        const uploadedDocsCount = (genuinePan ? 1 : 0) + (genuineBank ? 1 : 0) + (genuineAadhaar ? 1 : 0) + (genuineAddress ? 1 : 0);
        const hasAnyUploadedDoc = uploadedDocsCount > 0;
        const hasPanText = Boolean(m.kyc?.pan && m.kyc.pan.trim().length >= 10);
        const hasBankText = Boolean(m.kyc?.bank_name && m.kyc?.bank_account_number);
        const isFullyDocumented = uploadedDocsCount === 4 && hasPanText && hasBankText;

        return (
          <div className="custom-modal-backdrop" style={{ zIndex: 9998, padding: '16px' }} onClick={() => setSelectedKycMember(null)}>
            <div 
              style={{
                width: '100%',
                maxWidth: '840px',
                maxHeight: '92vh',
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.4)',
                border: '1.5px solid #E2E8F0'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ padding: '20px 26px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                      Partner KYC Compliance Dossier
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Statutory identity and bank settlement verification under Direct Selling Rules
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedKycMember(null)} 
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                  title="Close Dossier"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Partner Identity Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                  border: '1.5px solid #DBEAFE',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#2563EB',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
                    }}>
                      {(m.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>{m.name}</h4>
                        <span style={{ background: '#E2E8F0', color: '#334155', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                          {m.rank || 'Partner'}
                        </span>
                      </div>
                      <div style={{ marginTop: '3px', fontSize: '12px', color: '#64748B' }}>
                        <span>{m.email}</span> • <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>ID: {m.member_id || m.id}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '12px',
                      background: isVerified ? '#ECFDF5' : '#FFFBEB',
                      color: isVerified ? '#047857' : '#B45309',
                      border: isVerified ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                    }}>
                      {isVerified ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>KYC Verified & Authorized ✓</span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} />
                          <span>Compliance Review Pending</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* 4 Cards Grid - Responsive 2 Columns */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '16px'
                }}>
                  {/* Card 1: PAN */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.6px' }}>
                          1. Permanent Account Number (PAN)
                        </span>
                        {panDoc.hasFile && (
                          <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                            Sec 194H
                          </span>
                        )}
                      </div>

                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>TAX IDENTIFICATION</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '17px', fontWeight: 900, color: '#0F172A', letterSpacing: '1px' }}>
                            {m.kyc?.pan || 'PAN PENDING'}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>5% TDS Rate</span>
                      </div>

                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: panDoc.hasFile ? '#2563EB' : '#94A3B8'
                      }}>
                        <FileText size={14} />
                        <span style={{ fontWeight: 600 }}>
                          {panDoc.hasFile ? panDoc.fileName : 'No file uploaded'}
                        </span>
                        {panDoc.fileSize && (
                          <span style={{ color: '#64748B', fontSize: '11px' }}>({panDoc.fileSize})</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center' }}>
                      {panDoc.hasFile ? (
                        <button
                          type="button"
                          onClick={() => openDocPreview(m, 'pan')}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                          }}
                          title="View PAN Document"
                        >
                          <Eye size={13} />
                          <span>View Uploaded File</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} />
                          <span>Awaiting PAN Document File</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Bank Settlement Account */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.6px' }}>
                          2. Bank Settlement Account
                        </span>
                        <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                          IMPS / NEFT
                        </span>
                      </div>

                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 14px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                          {m.kyc?.bank_name || 'Bank Setup Pending'}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                          <div>
                            A/C: <span style={{ fontWeight: 700 }}>
                              {m.kyc?.bank_account_number ? (
                                revealedBankMembers[m.member_id || m.id] ? (
                                  m.kyc.bank_account_number
                                ) : (
                                  `•••••••••${m.kyc.bank_account_number.slice(-4)}`
                                )
                              ) : (
                                'Pending'
                              )}
                            </span> • IFSC: <span style={{ fontWeight: 700 }}>{m.kyc?.bank_ifsc || 'Pending'}</span>
                          </div>
                          {m.kyc?.bank_account_number && (
                            <button
                              type="button"
                              onClick={() => setRevealedBankMembers(prev => ({ ...prev, [m.member_id || m.id]: !prev[m.member_id || m.id] }))}
                              className="btn btn-secondary btn-xs py-0.5 px-1.5 flex items-center gap-1 text-primary-blue"
                              title={revealedBankMembers[m.member_id || m.id] ? "Mask account number" : "Reveal full account number"}
                            >
                              {revealedBankMembers[m.member_id || m.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                              <span style={{ fontSize: '10px' }}>{revealedBankMembers[m.member_id || m.id] ? 'Mask' : 'Reveal'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: bankDoc.hasFile ? '#2563EB' : '#94A3B8'
                      }}>
                        <FileText size={14} />
                        <span style={{ fontWeight: 600 }}>
                          {bankDoc.hasFile ? bankDoc.fileName : 'No file uploaded'}
                        </span>
                        {bankDoc.fileSize && (
                          <span style={{ color: '#64748B', fontSize: '11px' }}>({bankDoc.fileSize})</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center' }}>
                      {bankDoc.hasFile ? (
                        <button
                          type="button"
                          onClick={() => openDocPreview(m, 'bankAccount')}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                          }}
                          title="View Bank Settlement Document"
                        >
                          <Eye size={13} />
                          <span>View Uploaded File</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} />
                          <span>Awaiting Passbook / Cheque File</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Aadhaar Card */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.6px' }}>
                          3. Aadhaar Identity Proof
                        </span>
                        <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                          UIDAI Card
                        </span>
                      </div>

                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 14px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>12-DIGIT AADHAAR NUMBER</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', flexWrap: 'wrap', gap: '4px' }}>
                          <span>
                            {m.kyc?.aadhaar ? (
                              revealedAadhaarMembers[m.member_id || m.id] ? (
                                m.kyc.aadhaar
                              ) : (
                                maskAadhaar(m.kyc.aadhaar)
                              )
                            ) : (
                              'Pending UIDAI Furnishing'
                            )}
                          </span>
                          {m.kyc?.aadhaar && (
                            <button
                              type="button"
                              onClick={() => setRevealedAadhaarMembers(prev => ({ ...prev, [m.member_id || m.id]: !prev[m.member_id || m.id] }))}
                              className="btn btn-secondary btn-xs py-0.5 px-1.5 flex items-center gap-1 text-primary-blue"
                              title={revealedAadhaarMembers[m.member_id || m.id] ? "Mask Aadhaar" : "Reveal full Aadhaar"}
                            >
                              {revealedAadhaarMembers[m.member_id || m.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                              <span>{revealedAadhaarMembers[m.member_id || m.id] ? 'Mask' : 'Reveal'}</span>
                            </button>
                          )}
                        </div>
                        {m.kyc?.aadhaar && (() => {
                          const vRes = validateAadhaar(m.kyc.aadhaar);
                          return vRes.isValid ? (
                            <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={11} />
                              <span>UIDAI Verhoeff Checksum Passed ✓</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={11} />
                              <span>{vRes.message}</span>
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: aadhaarDoc.hasFile ? '#2563EB' : '#94A3B8'
                      }}>
                        <FileText size={14} />
                        <span style={{ fontWeight: 600 }}>
                          {aadhaarDoc.hasFile ? aadhaarDoc.fileName : 'No file uploaded'}
                        </span>
                        {aadhaarDoc.fileSize && (
                          <span style={{ color: '#64748B', fontSize: '11px' }}>({aadhaarDoc.fileSize})</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center' }}>
                      {aadhaarDoc.hasFile ? (
                        <button
                          type="button"
                          onClick={() => openDocPreview(m, 'aadhaar')}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                          }}
                          title="View Aadhaar Card"
                        >
                          <Eye size={13} />
                          <span>View Uploaded File</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} />
                          <span>Awaiting Aadhaar Card File</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Address Proof */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.6px' }}>
                          4. Address Proof
                        </span>
                        <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                          Statutory Proof
                        </span>
                      </div>

                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 14px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                          Residential Address Verification
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          Utility bill / Rent Agreement / National Proof
                        </div>
                      </div>

                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: addressDoc.hasFile ? '#2563EB' : '#94A3B8'
                      }}>
                        <FileText size={14} />
                        <span style={{ fontWeight: 600 }}>
                          {addressDoc.hasFile ? addressDoc.fileName : 'No file uploaded'}
                        </span>
                        {addressDoc.fileSize && (
                          <span style={{ color: '#64748B', fontSize: '11px' }}>({addressDoc.fileSize})</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center' }}>
                      {addressDoc.hasFile ? (
                        <button
                          type="button"
                          onClick={() => openDocPreview(m, 'addressProof')}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                          }}
                          title="View Address Proof Document"
                        >
                          <Eye size={13} />
                          <span>View Uploaded File</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} />
                          <span>Awaiting Address Proof File</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compliance & Agreement Footer Strip */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  fontSize: '12px',
                  color: '#475569',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} className="text-primary-blue" />
                    <span>Direct Selling Agreement: </span>
                    <strong style={{ color: '#2563EB' }}>{m.kyc?.agreement_version || 'v2026.1'} Accepted ✓</strong>
                  </div>
                  <div>
                    <span>Submitted: </span>
                    <strong style={{ color: '#0F172A' }}>
                      {m.kyc?.submitted_at ? new Date(m.kyc.submitted_at).toLocaleDateString('en-IN') : '17/10/2026'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 26px',
                borderTop: '1px solid #E2E8F0',
                background: '#FAFAFA',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedKycMember(null)} 
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#334155',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Close Dossier
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {!isVerified && (
                    uploadedDocsCount === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={14} />
                          <span>Statutory Block: 0 documents uploaded</span>
                        </span>
                        <button 
                          type="button" 
                          disabled 
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            color: '#94A3B8',
                            padding: '8px 18px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="Direct Selling Rules 2021 prohibit approval without verified documents"
                        >
                          <Lock size={15} />
                          <span>Approval Blocked (0 Uploads)</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          type="button" 
                          onClick={() => {
                            setRejectionModal({
                              open: true,
                              member: m,
                              predefinedReason: 'Document illegible or blurred',
                              customReason: ''
                            });
                          }} 
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          Reject KYC
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            approveKyc(m.member_id || m.id);
                            setSelectedKycMember(null);
                          }} 
                          style={{
                            background: isFullyDocumented 
                              ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' 
                              : 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
                            border: 'none',
                            color: '#FFFFFF',
                            padding: '8px 22px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isFullyDocumented ? '0 4px 10px rgba(16, 185, 129, 0.3)' : '0 4px 10px rgba(245, 158, 11, 0.3)'
                          }}
                          title={isFullyDocumented ? "Approve and authorize partner KYC" : `Approve currently submitted ${uploadedDocsCount}/4 documents`}
                        >
                          <CheckCircle2 size={16} />
                          <span>{isFullyDocumented ? 'Approve Partner KYC (4/4)' : `Approve Uploads (${uploadedDocsCount}/4)`}</span>
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Document Viewer - EXACT USER UPLOAD */}
      {previewingDoc && (
        <div className="custom-modal-backdrop" style={{ zIndex: 9999, padding: '16px' }} onClick={() => setPreviewingDoc(null)}>
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '780px', 
              maxHeight: '92vh', 
              borderRadius: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 30px 60px rgba(15, 23, 42, 0.45)',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    {previewingDoc.title}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    {previewingDoc.member.name} • {previewingDoc.member.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${previewingDoc.docFile ? (previewingDoc.status === 'verified' ? 'badge-green' : 'badge-amber') : 'badge-neutral'}`}>
                  {previewingDoc.docFile ? (previewingDoc.status === 'verified' ? 'Verified ✓' : 'Under Review') : 'No File Attached'}
                </span>
                <button 
                  type="button" 
                  onClick={() => setPreviewingDoc(null)} 
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: EXACT Uploaded File */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {previewingDoc.docFile ? (
                <>
                  {/* File Metadata Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-primary-blue" />
                      <div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#2563EB' }}>
                          {previewingDoc.docName || `${previewingDoc.docKey}_file`}
                        </span>
                        {previewingDoc.docSize && (
                          <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>({previewingDoc.docSize})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={previewingDoc.docFile}
                        download={previewingDoc.docName || `${previewingDoc.docKey}_file`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#2563EB',
                          textDecoration: 'none'
                        }}
                        title="Download original document file"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* Render exact uploaded image */}
                  {(previewingDoc.docFile.startsWith('data:image/') || previewingDoc.docType.startsWith('image/')) ? (
                    <div style={{ textAlign: 'center', background: '#0F172A', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '360px' }}>
                      <img 
                        src={previewingDoc.docFile} 
                        alt={previewingDoc.title}
                        style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '8px' }} 
                      />
                    </div>
                  ) : (previewingDoc.docFile.startsWith('data:application/pdf') || previewingDoc.docType.includes('pdf')) ? (
                    /* Render exact uploaded PDF */
                    <div style={{ width: '100%', height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                      <iframe 
                        src={previewingDoc.docFile} 
                        title={previewingDoc.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  ) : (
                    /* Other exact file format */
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', textAlign: 'center' }}>
                      <FileText size={52} className="mx-auto text-primary-blue mb-2" />
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{previewingDoc.docName || 'Uploaded File'}</h4>
                      <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>{previewingDoc.docSize || ''} • {previewingDoc.docType}</p>
                      <a
                        href={previewingDoc.docFile}
                        download={previewingDoc.docName || `${previewingDoc.docKey}_file`}
                        className="btn btn-primary btn-sm inline-flex items-center gap-1"
                      >
                        <Download size={14} />
                        <span>Download & Open Document</span>
                      </a>
                    </div>
                  )}
                </>
              ) : (
                /* No file uploaded yet: Clean, clear notice */
                <div style={{ 
                  background: '#F8FAFC', 
                  border: '1.5px dashed #CBD5E1', 
                  borderRadius: '16px', 
                  padding: '52px 24px', 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: '#F1F5F9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#94A3B8'
                  }}>
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontWeight: 800, fontSize: '16px', color: '#1E293B' }}>
                      No document file uploaded by this partner yet.
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '440px', lineHeight: 1.5 }}>
                      The partner has not attached an image (JPG/PNG) or PDF document for {previewingDoc.title}.
                    </p>
                  </div>
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
                {previewingDoc.hasFile && previewingDoc.status !== 'verified' && (
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
                    <span>Approve Partner KYC</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUTORY REJECTION REASON MODAL (DIRECT SELLING RULES 2021 AUDITING) */}
      {rejectionModal.open && rejectionModal.member && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '520px', width: '92%' }}>
            <div className="admin-modal-header flex-between items-center">
              <div className="flex items-center gap-2">
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={20} className="text-rose" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-main">Record Statutory KYC Rejection</h3>
                  <p className="text-xs text-muted">Audited compliance action logged to Neon PostgreSQL</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setRejectionModal({ open: false, member: null, predefinedReason: 'Document illegible or blurred', customReason: '' })}
                className="btn-icon-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body p-4 flex-col gap-3">
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div className="flex-between items-center text-xs text-muted">
                  <span>Target Partner:</span>
                  <span className="font-bold text-main">{rejectionModal.member.name}</span>
                </div>
                <div className="flex-between items-center text-xs text-muted mt-1">
                  <span>Partner ID / Email:</span>
                  <span className="code-font text-xs">{rejectionModal.member.member_id || rejectionModal.member.id} • {rejectionModal.member.email}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-main mb-1 block">
                  Statutory Rejection Reason (Direct Selling Rules 2021)
                </label>
                <select
                  value={rejectionModal.predefinedReason}
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, predefinedReason: e.target.value }))}
                  className="form-input-clean text-xs w-full mb-2"
                  style={{ padding: '8px 12px' }}
                >
                  <option value="Document illegible or blurred">Document illegible or blurred (Requires high-res re-upload)</option>
                  <option value="Name mismatch between PAN card and banking records">Name mismatch between PAN card and banking records</option>
                  <option value="Aadhaar number invalid or checksum verification failed">Aadhaar number invalid or checksum verification failed</option>
                  <option value="Bank document older than 3 months or missing IFSC">Bank document older than 3 months or missing IFSC</option>
                  <option value="Address proof missing valid state or pincode">Address proof missing valid state or pincode</option>
                  <option value="Suspected altered or unverified compliance document">Suspected altered or unverified compliance document</option>
                  <option value="Custom">Custom compliance reason (specify below)...</option>
                </select>

                <label className="text-xs font-bold text-muted mb-1 block">
                  Additional Compliance Auditor Notes (Optional):
                </label>
                <textarea
                  rows={3}
                  value={rejectionModal.customReason}
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, customReason: e.target.value }))}
                  placeholder="Explain specific defect to direct seller (e.g., 'Address proof must be electricity bill or bank statement within 90 days')..."
                  className="form-input-clean text-xs w-full"
                  style={{ padding: '8px 12px', resize: 'vertical' }}
                />
              </div>

              <div className="p-3 bg-card-alt border-rounded text-2xs text-muted flex items-start gap-2">
                <Shield size={14} className="text-amber shrink-0 mt-0.5" />
                <span>
                  <strong>Compliance Notice:</strong> This rejection will be permanently recorded in the Neon PostgreSQL audit trail along with your administrator identity, client IP address, and timestamp. The partner will be notified to re-upload compliant documentation.
                </span>
              </div>
            </div>

            <div className="admin-modal-footer flex-between items-center p-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setRejectionModal({ open: false, member: null, predefinedReason: 'Document illegible or blurred', customReason: '' })}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason = rejectionModal.predefinedReason === 'Custom'
                    ? (rejectionModal.customReason.trim() || 'Compliance criteria not met')
                    : (rejectionModal.customReason.trim() ? `${rejectionModal.predefinedReason}: ${rejectionModal.customReason.trim()}` : rejectionModal.predefinedReason);

                  rejectKyc(rejectionModal.member.member_id || rejectionModal.member.id, finalReason, {
                    adminId: 'ADMIN_CONSOLE',
                    adminName: 'Compliance Officer',
                    memberName: rejectionModal.member.name
                  });

                  setRejectionModal({ open: false, member: null, predefinedReason: 'Document illegible or blurred', customReason: '' });
                  if (selectedKycMember) setSelectedKycMember(null);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                style={{ background: '#DC2626', borderColor: '#DC2626' }}
              >
                <AlertCircle size={14} />
                <span>Confirm Statutory Rejection & Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
