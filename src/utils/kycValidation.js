/**
 * Statutory KYC Compliance & Status Verification Utility
 * In accordance with Consumer Protection (Direct Selling) Rules, 2021
 * 
 * Rules:
 * 1. Overall KYC CANNOT be 'verified' unless ALL 4 mandatory proofs are verified:
 *    - Aadhaar / National ID Proof
 *    - PAN Card (with valid PAN string + proof)
 *    - Address Proof (Utility / Lease / Rent Agreement)
 *    - Bank Settlement Account (Bank Name + Account Number + Passbook/Cheque proof)
 * 2. If ANY proof is missing, not uploaded, or under review, overall status MUST BE
 *    'under_review' or 'pending_documents'.
 * 3. If any document is rejected, overall status is 'rejected'.
 */

export function getEffectiveKycStatus(member) {
  if (!member) return 'pending_documents';
  const kyc = member.kyc || {};
  const docs = kyc.documents || {};

  const requiredDocs = ['aadhaar', 'pan', 'addressProof', 'bankAccount'];

  // Check if each specific document is truly verified
  const isDocVerified = (key) => {
    const docStatus = docs[`${key}Status`];
    const docVal = docs[key];
    const hasFile = Boolean(docs[`${key}File`] || docs[`${key}Name`]);

    // Corporate root exemption check
    if (member.rank === 'Head Office Partner' || member.member_id === 'mem_matru') {
      return docStatus === 'verified' || docVal === 'Verified ✓' || docVal === 'Verified';
    }

    // Must be marked verified and not under_review or pending
    const isExplicitlyVerified = docStatus === 'verified' || docVal === 'Verified ✓';
    const isNotPending = docVal !== 'Not Uploaded' && docVal !== 'Pending Upload' && docVal !== 'Pending';
    
    return isExplicitlyVerified && isNotPending;
  };

  const isDocRejected = (key) => {
    return docs[`${key}Status`] === 'rejected' || docs[key] === 'Rejected';
  };

  const isDocSubmitted = (key) => {
    const docVal = docs[key];
    const hasFile = Boolean(docs[`${key}File`] || docs[`${key}Name`]);
    if (hasFile) return true;
    if (typeof docVal === 'string' && (docVal.startsWith('Uploaded') || docVal.startsWith('data:'))) return true;
    if (key === 'pan' && kyc.pan && kyc.pan.trim().length >= 10) return true;
    if (key === 'bankAccount' && kyc.bank_name && kyc.bank_account_number) return true;
    return false;
  };

  // 1. Any rejection makes overall status rejected
  if (kyc.verification_status === 'rejected' || requiredDocs.some(isDocRejected)) {
    return 'rejected';
  }

  // 2. Check if all 4 required statutory documents are completely verified
  const hasPanDetails = Boolean(kyc.pan && kyc.pan.trim().length >= 10);
  const hasBankDetails = Boolean(kyc.bank_name && kyc.bank_account_number);
  const allDocsVerified = requiredDocs.every(isDocVerified);

  // Strictly require ALL 4 proofs + bank & PAN details to be 'verified'
  if (allDocsVerified && hasPanDetails && hasBankDetails && kyc.verification_status === 'verified') {
    return 'verified';
  }

  // 3. If any document or detail is submitted, it is under review
  const anySubmitted = requiredDocs.some(isDocSubmitted) || hasPanDetails || hasBankDetails || kyc.verification_status === 'under_review';
  if (anySubmitted) {
    return 'under_review';
  }

  return 'pending_documents';
}

/**
 * Format status badge label and CSS class
 */
export function getKycStatusBadge(effectiveStatus) {
  switch (effectiveStatus) {
    case 'verified':
      return { label: 'KYC Verified ✓', badgeClass: 'badge-green', color: '#10B981', textClass: 'text-success' };
    case 'under_review':
      return { label: 'KYC Under Verification', badgeClass: 'badge-amber', color: '#F59E0B', textClass: 'text-amber' };
    case 'rejected':
      return { label: 'KYC Rejected', badgeClass: 'badge-rose', color: '#EF4444', textClass: 'text-rose' };
    default:
      return { label: 'KYC Documents Pending', badgeClass: 'badge-neutral', color: '#94A3B8', textClass: 'text-muted' };
  }
}
