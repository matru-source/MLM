import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { X, ShieldCheck, FileText, CheckCircle2, Building, AlertCircle, Upload, Check, RefreshCw } from 'lucide-react';
import { validateAadhaar, lookupIfsc, formatAadhaarInput } from '../../utils/kycValidation';

export default function KycModal({ isOpen, onClose, member }) {
  const { submitKyc } = useMlm();

  const [legalName, setLegalName] = useState(member?.kyc?.legal_name || member?.name || '');
  const [pan, setPan] = useState(member?.kyc?.pan || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(member?.kyc?.aadhaar || '');
  const [bankName, setBankName] = useState(member?.kyc?.bank_name || 'HDFC Bank');
  const [accountNumber, setAccountNumber] = useState(member?.kyc?.bank_account_number || '');
  const [ifsc, setIfsc] = useState(member?.kyc?.bank_ifsc || '');
  const [ifscData, setIfscData] = useState(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(member?.kyc?.agreement_accepted || false);
  const [agreeRefund, setAgreeRefund] = useState(true);
  const [agreeConduct, setAgreeConduct] = useState(true);
  
  // Real document file states
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);

  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  const handleFileUpload = (setter) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Maximum file size allowed is 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setter({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type,
          dataUrl: loadEvt.target.result,
          uploadedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // PAN regex validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
      setError('Please enter a valid 10-character Indian PAN number (e.g., ABCDE1234F).');
      return;
    }

    if (aadhaarNumber) {
      const aRes = validateAadhaar(aadhaarNumber);
      if (!aRes.isValid) {
        setError(`Aadhaar validation failed: ${aRes.message}`);
        return;
      }
    }

    if (!accountNumber || accountNumber.length < 8) {
      setError('Please enter a valid bank account number.');
      return;
    }

    if (!ifsc || ifsc.length < 11) {
      setError('Please enter a valid 11-character IFSC code (e.g., HDFC0001234).');
      return;
    }

    // Direct Selling Rules 2021 compliance: require genuine document uploads
    const existingDocs = member?.kyc?.documents || {};
    const hasPanDoc = panFile || (existingDocs.pan && existingDocs.pan !== 'Not Uploaded' && existingDocs.pan !== 'Pending Upload');
    const hasBankDoc = bankFile || (existingDocs.bankAccount && existingDocs.bankAccount !== 'Not Uploaded' && existingDocs.bankAccount !== 'Pending Upload');

    if (!hasPanDoc || !hasBankDoc) {
      setError('Direct Selling Rules 2021 require proof of identity (PAN Card) and Bank Account proof file uploads. Text-only submissions cannot be verified.');
      return;
    }

    if (!agreeTerms || !agreeRefund || !agreeConduct) {
      setError('You must accept the Direct Selling Agreement and compliance conduct rules to activate seller eligibility.');
      return;
    }

    const submittedDocs = {
      pan: panFile ? panFile.dataUrl : (existingDocs.pan || 'Pending Upload'),
      panName: panFile ? panFile.name : (existingDocs.panName || null),
      bankAccount: bankFile ? bankFile.dataUrl : (existingDocs.bankAccount || 'Pending Upload'),
      bankAccountName: bankFile ? bankFile.name : (existingDocs.bankAccountName || null),
      aadhaar: aadhaarFile ? aadhaarFile.dataUrl : (existingDocs.aadhaar || 'Pending Upload'),
      aadhaarName: aadhaarFile ? aadhaarFile.name : (existingDocs.aadhaarName || null),
      addressProof: existingDocs.addressProof || 'Pending Upload'
    };

    submitKyc(member.member_id, {
      legal_name: legalName,
      pan: pan.toUpperCase(),
      aadhaar: aadhaarNumber,
      bank_name: ifscData?.bank || bankName,
      bank_account_number: accountNumber,
      bank_ifsc: ifsc.toUpperCase(),
      documents: submittedDocs
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="zex-secure-badge">
              <ShieldCheck size={12} />
              <span>Direct Selling Rules 2021 Compliance</span>
            </div>
            <h2 className="modal-title">Seller Onboarding & KYC Verification</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="kyc-notice-box">
            <FileText size={18} className="text-cyan" />
            <div className="kyc-notice-text">
              Under Indian law (Direct Selling Rules 2021), commission payouts require verified identity (PAN) 
              and authentic bank document proof. Submissions undergo compliance review before approval.
            </div>
          </div>

          {error && (
            <div className="form-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Identity Info */}
          <div className="form-section">
            <label className="section-label">Identity & Tax Information</label>
            <div className="form-grid-2">
              <div>
                <label className="input-label">Legal Name (as per PAN)</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="form-input"
                  placeholder="Full Legal Name"
                />
              </div>
              <div>
                <label className="input-label">Permanent Account Number (PAN)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="form-input code-font"
                  placeholder="ABCDE1234F"
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>12-Digit Aadhaar Number (UIDAI)</label>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Direct Selling Rules 2021 Identity Proof</span>
              </div>
              <input
                type="text"
                maxLength={14}
                value={formatAadhaarInput(aadhaarNumber)}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setAadhaarNumber(clean);
                }}
                className="form-input code-font"
                placeholder="2345 6789 0124"
              />
              {aadhaarNumber.length === 12 && (() => {
                const v = validateAadhaar(aadhaarNumber);
                return v.isValid ? (
                  <span style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <CheckCircle2 size={12} /> Valid UIDAI Aadhaar (Verhoeff Checksum Passed ✓)
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <AlertCircle size={12} /> {v.message}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Document Uploads (Required) */}
          <div className="form-section">
            <label className="section-label">Mandatory Identity & Bank Proof Documents</label>
            <p className="input-caption mb-3">Upload clear photo or PDF copies (max 5MB each). Documents are encrypted for compliance review.</p>
            
            <div className="form-grid-2">
              {/* PAN Document Upload */}
              <div className="doc-upload-field">
                <label className="input-label">PAN Card Copy *</label>
                <div className={`file-upload-box ${panFile ? 'uploaded' : ''}`}>
                  <input
                    type="file"
                    id="pan-upload"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload(setPanFile)}
                    className="file-input-hidden"
                  />
                  <label htmlFor="pan-upload" className="file-input-label">
                    {panFile ? (
                      <span className="file-selected-text">
                        <Check size={14} className="text-emerald inline mr-1" />
                        {panFile.name} ({panFile.size})
                      </span>
                    ) : (
                      <span>
                        <Upload size={14} className="inline mr-1" />
                        Select PAN Document (JPG/PNG/PDF)
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Bank Proof Upload */}
              <div className="doc-upload-field">
                <label className="input-label">Bank Passbook / Cheque Copy *</label>
                <div className={`file-upload-box ${bankFile ? 'uploaded' : ''}`}>
                  <input
                    type="file"
                    id="bank-upload"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload(setBankFile)}
                    className="file-input-hidden"
                  />
                  <label htmlFor="bank-upload" className="file-input-label">
                    {bankFile ? (
                      <span className="file-selected-text">
                        <Check size={14} className="text-emerald inline mr-1" />
                        {bankFile.name} ({bankFile.size})
                      </span>
                    ) : (
                      <span>
                        <Upload size={14} className="inline mr-1" />
                        Select Bank Proof (Passbook/Cheque)
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Aadhaar Upload (Optional / Supplemental) */}
              <div className="doc-upload-field" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">Aadhaar Card (Optional Supplemental ID)</label>
                <div className={`file-upload-box ${aadhaarFile ? 'uploaded' : ''}`}>
                  <input
                    type="file"
                    id="aadhaar-upload"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload(setAadhaarFile)}
                    className="file-input-hidden"
                  />
                  <label htmlFor="aadhaar-upload" className="file-input-label">
                    {aadhaarFile ? (
                      <span className="file-selected-text">
                        <Check size={14} className="text-emerald inline mr-1" />
                        {aadhaarFile.name} ({aadhaarFile.size})
                      </span>
                    ) : (
                      <span>
                        <Upload size={14} className="inline mr-1" />
                        Select Aadhaar Copy (Front & Back)
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="form-section">
            <label className="section-label">Bank Payout Settlement Account</label>
            <div className="form-grid-2">
              <div>
                <label className="input-label">Bank Name</label>
                <input
                  type="text"
                  required
                  value={ifscData?.bank || bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. HDFC Bank, SBI"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>IFSC Code</label>
                  {ifscLoading && (
                    <span style={{ fontSize: '10px', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <RefreshCw size={10} className="animate-spin" /> Verifying...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={ifsc}
                  onChange={async (e) => {
                    const clean = e.target.value.toUpperCase().trim();
                    setIfsc(clean);
                    setIfscError('');
                    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
                      setIfscLoading(true);
                      const res = await lookupIfsc(clean);
                      setIfscLoading(false);
                      if (res.success) {
                        setIfscData(res);
                        setIfscError('');
                        if (res.bank) setBankName(res.bank);
                      } else {
                        setIfscData(null);
                        setIfscError(res.error || 'IFSC code not found in RBI registry.');
                      }
                    } else {
                      setIfscData(null);
                    }
                  }}
                  className="form-input code-font"
                  placeholder="HDFC0001234"
                />
              </div>
            </div>

            {ifscData && (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '8px 12px', marginTop: '10px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>{ifscData.bank}</span>
                  <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                    RBI Verified
                  </span>
                </div>
                <div style={{ color: '#475569', marginTop: '2px', fontSize: '11px' }}>
                  Branch: <strong style={{ color: '#0F172A' }}>{ifscData.branch}</strong> • {ifscData.city}, {ifscData.state}
                </div>
              </div>
            )}
            {ifscError && (
              <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {ifscError}
              </div>
            )}

            <div className="form-group-single">
              <label className="input-label">Account Number</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="form-input code-font"
                placeholder="Bank Account Number"
              />
              <span className="input-caption">Account details are securely encrypted and tokenized for payouts.</span>
            </div>
          </div>

          {/* Statutory Agreements */}
          <div className="form-section">
            <label className="section-label">Mandatory Legal Agreements</label>
            <div className="agreements-list">
              <label className="agreement-checkbox">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>
                  I accept the <strong>Direct Seller Agreement (v2026.1)</strong> and acknowledge that commissions are paid solely on completed retail software sales, not recruitments.
                </span>
              </label>

              <label className="agreement-checkbox">
                <input
                  type="checkbox"
                  checked={agreeRefund}
                  onChange={(e) => setAgreeRefund(e.target.checked)}
                />
                <span>
                  I agree to the <strong>7-Day Customer Cooling-Off Policy</strong> and understand that customer refunds will reverse corresponding unearned commissions.
                </span>
              </label>

              <label className="agreement-checkbox">
                <input
                  type="checkbox"
                  checked={agreeConduct}
                  onChange={(e) => setAgreeConduct(e.target.checked)}
                />
                <span>
                  I agree to the <strong>Code of Conduct</strong> and declare that I will make no misleading income guarantees or unauthorized marketing claims.
                </span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <ShieldCheck size={16} />
              <span>Submit Documents for Compliance Review</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
