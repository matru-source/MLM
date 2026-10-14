import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { X, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';

export default function GrievanceModal({ isOpen, onClose, member }) {
  const { fileGrievance, orders, processRefund } = useMlm();
  const [category, setCategory] = useState('COOLING_OFF_REFUND');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !member) return null;

  // Find eligible orders for this member
  const memberOrders = orders.filter(o => 
    o.buyer_member_id === member.member_id && o.payment_status === 'succeeded'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (category === 'COOLING_OFF_REFUND' && selectedOrderId) {
      // Process cooling-off refund automatically if requested
      await processRefund(selectedOrderId, description || 'Customer exercised 7-day cooling-off refund right');
    }

    fileGrievance(
      member.member_id,
      category,
      subject || (category === 'COOLING_OFF_REFUND' ? `Cooling-Off Refund for ${selectedOrderId}` : 'Support Inquiry'),
      description
    );

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="zex-secure-badge">
              <ShieldAlert size={12} />
              <span>Grievance Redressal Mechanism</span>
            </div>
            <h2 className="modal-title">Refund & Grievance Request</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <label className="input-label">Request Type</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="COOLING_OFF_REFUND">7-Day Cooling-Off Refund Request</option>
              <option value="COMMISSION_DISCREPANCY">Commission Allocation Dispute</option>
              <option value="KYC_INQUIRY">KYC & Verification Status</option>
              <option value="PAYOUT_QUERY">Payout & Bank Settlement Query</option>
              <option value="GENERAL_GRIEVANCE">Consumer Grievance</option>
            </select>
          </div>

          {category === 'COOLING_OFF_REFUND' && (
            <div className="form-section">
              <label className="input-label">Select Active Subscription Order</label>
              {memberOrders.length > 0 ? (
                <select
                  value={selectedOrderId}
                  required
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Choose Order to Refund --</option>
                  {memberOrders.map(o => (
                    <option key={o.order_id} value={o.order_id}>
                      {o.order_id} - {o.product_name} (₹{o.amount})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="empty-sub-notice">
                  No active orders found for this account. You can still file an inquiry below.
                </div>
              )}
            </div>
          )}

          <div className="form-section">
            <label className="input-label">Subject / Summary</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-input"
              placeholder="Brief summary of request"
            />
          </div>

          <div className="form-section">
            <label className="input-label">Detailed Explanation</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Provide complete details for our Grievance Redressal Officer..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <RotateCcw size={16} />
              <span>Submit Grievance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
