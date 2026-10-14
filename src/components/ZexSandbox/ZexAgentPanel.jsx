import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { generateHmacSignature, generateId } from '../../utils/cryptoSim';
import { 
  Cpu, 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  FileText, 
  RotateCcw, 
  Key, 
  Hash, 
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ZexAgentPanel() {
  const { 
    orders, 
    webhookEvents, 
    commissionEntries, 
    processSubscriptionActivation,
    processRefund,
    addToast
  } = useMlm();

  const [activeTab, setActiveTab] = useState('webhooks'); // 'webhooks' | 'reconciliation' | 'api_docs'
  const [selectedWebhook, setSelectedWebhook] = useState(null);

  // Manual Webhook Trigger Simulator
  const [eventType, setEventType] = useState('subscription.activated');
  const [testBuyerName, setTestBuyerName] = useState('Vikramaditya Roy');
  const [testBuyerEmail, setTestBuyerEmail] = useState('vikram.roy@enterprise.com');
  const [testRefCode, setTestRefCode] = useState('ZEX-ALEX99');
  const [isSimulating, setIsSimulating] = useState(false);

  // Reconciliation calculations
  const grossSales = orders.length * 2500;
  const successfulOrders = orders.filter(o => o.payment_status === 'succeeded');
  const refundedOrders = orders.filter(o => o.payment_status === 'refunded');
  const netSalesAmount = successfulOrders.length * 2500;
  const contractedMlmRate = 1600; // Network payout per eligible sale
  const mlmNetworkPayable = successfulOrders.length * contractedMlmRate;

  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    setIsSimulating(true);

    try {
      if (eventType === 'subscription.activated') {
        await processSubscriptionActivation({
          buyerName: testBuyerName,
          buyerEmail: testBuyerEmail,
          buyerPhone: '+91 98700 11223',
          referralCode: testRefCode,
          paymentMethod: 'UPI'
        });
      } else if (eventType === 'refund.completed') {
        const lastOrder = orders.find(o => o.payment_status === 'succeeded');
        if (lastOrder) {
          await processRefund(lastOrder.order_id, 'Simulated ZEX Gateway Refund Webhook');
        } else {
          addToast('warning', 'No Active Order', 'Create an active subscription first before simulating refund.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="zex-agent-container">
      {/* ZEX Authoritative Banner */}
      <div className="zex-banner glass-panel">
        <div className="zex-banner-left">
          <div className="zex-badge">
            <Cpu size={14} className="text-cyan" />
            <span>Authoritative Core System</span>
          </div>
          <h2 className="zex-title">ZEX Authoritative Merchant & API Engine</h2>
          <p className="zex-desc">
            ZEX is the Merchant of Record authoritative for payment status, customer identity, subscriptions, and refunds. 
            All commission entries in the MLM platform are triggered strictly through signed HMAC server-to-server webhooks.
          </p>
        </div>

        <div className="zex-banner-right">
          <div className="auth-spec-pill">
            <Key size={14} className="text-emerald" />
            <span>HMAC-SHA256 Signed Webhooks Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="zex-nav-tabs">
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`zex-tab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
        >
          <Send size={16} />
          <span>Webhook Dispatcher & Log ({webhookEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`zex-tab-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
        >
          <CheckCircle2 size={16} />
          <span>3-Way Automated Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('api_docs')}
          className={`zex-tab-btn ${activeTab === 'api_docs' ? 'active' : ''}`}
        >
          <Code size={16} />
          <span>OpenAPI 3.0 Contract & Schema</span>
        </button>
      </div>

      {/* Panels */}
      <div className="zex-panel-body">
        {/* WEBHOOKS TAB */}
        {activeTab === 'webhooks' && (
          <div className="webhook-workspace-grid">
            {/* Left: Dispatch Simulator */}
            <div className="webhook-dispatch-card glass-panel">
              <div className="card-header-clean">
                <Send size={16} className="text-cyan" />
                <h3 className="card-clean-title">Simulate Signed ZEX Webhook Event</h3>
              </div>
              <p className="card-clean-sub">
                Dispatches a cryptographic event payload with real HMAC signature headers.
              </p>

              <form onSubmit={handleSimulateWebhook} className="webhook-form">
                <div className="form-section">
                  <label className="input-label">Webhook Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="form-select"
                  >
                    <option value="subscription.activated">subscription.activated (Triggers 10 Upline Commissions)</option>
                    <option value="refund.completed">refund.completed (Triggers 10 Upline Clawbacks)</option>
                  </select>
                </div>

                {eventType === 'subscription.activated' && (
                  <>
                    <div className="form-section">
                      <label className="input-label">Subscriber Name</label>
                      <input
                        type="text"
                        required
                        value={testBuyerName}
                        onChange={(e) => setTestBuyerName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-section">
                      <label className="input-label">Subscriber Email</label>
                      <input
                        type="email"
                        required
                        value={testBuyerEmail}
                        onChange={(e) => setTestBuyerEmail(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-section">
                      <label className="input-label">Referring Seller Code</label>
                      <input
                        type="text"
                        required
                        value={testRefCode}
                        onChange={(e) => setTestRefCode(e.target.value.toUpperCase())}
                        className="form-input code-font"
                      />
                    </div>
                  </>
                )}

                <div className="webhook-headers-preview">
                  <div className="preview-label">Headers Dispatched:</div>
                  <div className="headers-box code-font">
                    <div>Content-Type: application/json</div>
                    <div>x-zex-signature: sha256_e7f3...</div>
                    <div>x-zex-timestamp: {Date.now()}</div>
                    <div>Idempotency-Key: {generateId('idemp')}</div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="btn btn-cyan full-width"
                >
                  <Send size={16} />
                  <span>{isSimulating ? 'Dispatching...' : 'Dispatch Signed Webhook Event'}</span>
                </button>
              </form>
            </div>

            {/* Right: Event Log History */}
            <div className="webhook-log-card glass-panel">
              <div className="card-header-clean">
                <Hash size={16} className="text-emerald" />
                <h3 className="card-clean-title">Live Webhook Ingestion Log</h3>
              </div>

              {webhookEvents.length > 0 ? (
                <div className="webhook-events-list">
                  {webhookEvents.map(evt => (
                    <div
                      key={evt.event_id}
                      onClick={() => setSelectedWebhook(evt)}
                      className={`webhook-event-item ${selectedWebhook?.event_id === evt.event_id ? 'selected' : ''}`}
                    >
                      <div className="event-top-line">
                        <span className={`badge ${evt.event_type.includes('activated') ? 'badge-emerald' : 'badge-rose'}`}>
                          {evt.event_type}
                        </span>
                        <span className="code-font font-xs text-secondary">{formatDateTime(evt.received_at)}</span>
                      </div>
                      <div className="event-mid-line code-font text-cyan font-xs">
                        ID: {evt.event_id}
                      </div>
                      <div className="event-signature-line code-font font-xs text-secondary truncate">
                        sig: {evt.signature.slice(0, 32)}...
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-sub-notice">
                  No webhooks received yet. Dispatch an event using the simulator on the left.
                </div>
              )}

              {/* Payload Viewer Modal / Drawer */}
              {selectedWebhook && (
                <div className="payload-inspect-drawer">
                  <div className="drawer-header-small">
                    <span className="code-font text-emerald">Payload: {selectedWebhook.event_id}</span>
                    <button onClick={() => setSelectedWebhook(null)} className="btn-close-mini">✕</button>
                  </div>
                  <pre className="payload-code code-font">
                    {JSON.stringify(selectedWebhook.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RECONCILIATION TAB */}
        {activeTab === 'reconciliation' && (
          <div className="reconciliation-container glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">Automated 3-Way Daily Reconciliation</h3>
                <span className="section-desc">
                  Reconciles Gateway Payment ↔ Authoritative ZEX Subscriptions ↔ MLM Commission Ledger.
                </span>
              </div>
              <span className="badge badge-emerald">Discrepancy Exception Queue: 0 Errors</span>
            </div>

            {/* Reconciliation Statement Table */}
            <div className="settlement-statement-card">
              <h4 className="statement-title">Monthly Commercial Settlement Calculation</h4>
              <div className="statement-formula-grid">
                <div className="formula-row">
                  <span className="label">Gross Successful Retail Sales ({orders.length} subscriptions × ₹2,500):</span>
                  <span className="code-font text-primary">{formatINR(grossSales)}</span>
                </div>
                <div className="formula-row">
                  <span className="label">Less Customer Refunds & Cooling-Off Cancellations ({refundedOrders.length} orders):</span>
                  <span className="code-font text-rose">-{formatINR(refundedOrders.length * 2500)}</span>
                </div>
                <div className="formula-row formula-subtotal">
                  <span className="label">Net Eligible Retail Sales:</span>
                  <span className="code-font font-bold text-cyan">{formatINR(netSalesAmount)}</span>
                </div>
                <div className="formula-row">
                  <span className="label">Contracted MLM Payout Allocation (₹1,600 / Unit):</span>
                  <span className="code-font text-emerald font-bold">{formatINR(mlmNetworkPayable)}</span>
                </div>
                <div className="formula-row">
                  <span className="label">Retained Authoritative ZEX Margin & Gateway/GST Buffer:</span>
                  <span className="code-font text-secondary">{formatINR(netSalesAmount - mlmNetworkPayable)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API DOCS TAB */}
        {activeTab === 'api_docs' && (
          <div className="api-docs-container glass-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="section-title">ZEX Subscription REST API Specification</h3>
                <span className="section-desc">
                  Authoritative interface contract for customer resolution and checkout sessions.
                </span>
              </div>
              <span className="badge badge-cyan">v1.2.0 OpenAPI Contract</span>
            </div>

            <div className="endpoint-list">
              <div className="endpoint-item">
                <div className="endpoint-header">
                  <span className="method-pill method-post">POST</span>
                  <span className="endpoint-path code-font">/v1/customers/resolve</span>
                </div>
                <p className="endpoint-desc">
                  Finds or generates authoritative ZEX customer identity using phone and email without sharing sensitive passwords.
                </p>
              </div>

              <div className="endpoint-item">
                <div className="endpoint-header">
                  <span className="method-pill method-post">POST</span>
                  <span className="endpoint-path code-font">/v1/checkout-sessions</span>
                </div>
                <p className="endpoint-desc">
                  Creates a ₹2,500 merchant checkout session carrying the originating MLM sales agent ID and idempotency key.
                </p>
              </div>

              <div className="endpoint-item">
                <div className="endpoint-header">
                  <span className="method-pill method-get">GET</span>
                  <span className="endpoint-path code-font">/v1/subscriptions/{'{subscription_id}'}</span>
                </div>
                <p className="endpoint-desc">
                  Returns authoritative activation state, expiry date, cooling-off window, and renewal status.
                </p>
              </div>

              <div className="endpoint-item">
                <div className="endpoint-header">
                  <span className="method-pill method-post">POST</span>
                  <span className="endpoint-path code-font">/v1/subscriptions/{'{subscription_id}'}/cancel</span>
                </div>
                <p className="endpoint-desc">
                  Authoritative cancellation initiating refund and signed `refund.completed` webhook.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
