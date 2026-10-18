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

// Verhoeff algorithm multiplication table
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

// Verhoeff algorithm permutation table
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Validate number using Verhoeff checksum algorithm (used officially by UIDAI for Aadhaar)
 */
export function validateVerhoeff(numStr) {
  if (!numStr) return false;
  const digits = String(numStr).replace(/\D/g, '').split('').reverse().map(Number);
  if (digits.length !== 12) return false;
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
}

/**
 * Validate 12-digit Indian Aadhaar number
 * Rule 1: Exactly 12 numeric digits
 * Rule 2: Cannot start with 0 or 1 (per UIDAI specifications)
 * Rule 3: Must satisfy Verhoeff checksum
 */
export function validateAadhaar(aadhaarStr) {
  if (!aadhaarStr) {
    return { isValid: false, message: 'Aadhaar number is required.' };
  }
  const clean = String(aadhaarStr).replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) {
    return { isValid: false, message: 'Aadhaar must be exactly 12 numeric digits.' };
  }
  if (/^[01]/.test(clean)) {
    return { isValid: false, message: 'Aadhaar cannot begin with 0 or 1 per UIDAI specifications.' };
  }
  if (!validateVerhoeff(clean)) {
    return { isValid: false, message: 'Invalid Aadhaar checksum (UIDAI Verhoeff validation failed).' };
  }
  return { isValid: true, clean, message: 'Valid 12-digit Aadhaar (Verhoeff checksum passed).' };
}

/**
 * Mask Aadhaar number per UIDAI compliance (hide first 8 digits, display last 4)
 */
export function maskAadhaar(aadhaarStr) {
  if (!aadhaarStr) return '';
  const clean = String(aadhaarStr).replace(/[\s-]/g, '');
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Format Aadhaar input as groups of 4 digits (XXXX XXXX XXXX)
 */
export function formatAadhaarInput(val) {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Real-Time IFSC Lookup via RBI Registry (Razorpay Free API)
 */
export async function lookupIfsc(ifscCode) {
  if (!ifscCode) return { success: false, error: 'IFSC code is required.' };
  const cleanIfsc = String(ifscCode).trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
    return { success: false, error: 'Invalid IFSC format. Must be 11 characters (e.g., HDFC0001234).' };
  }

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`);
    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: 'IFSC code not found in RBI registry.' };
      }
      return { success: false, error: `IFSC verification service returned code ${res.status}.` };
    }
    const data = await res.json();
    return {
      success: true,
      bank: data.BANK || '',
      branch: data.BRANCH || '',
      city: data.CITY || '',
      state: data.STATE || '',
      address: data.ADDRESS || '',
      micr: data.MICR || '',
      upi: data.UPI,
      neft: data.NEFT,
      rtgs: data.RTGS,
      imps: data.IMPS
    };
  } catch (err) {
    return { success: false, error: 'Unable to reach IFSC verification server. Check network connection.' };
  }
}

/**
 * Check if a member has a genuine uploaded file for a specific document key
 */
export function hasGenuineDocFile(member, docKey) {
  if (!member) return false;
  const docs = member.kyc?.documents || {};
  if (docs[`${docKey}File`]) return true;
  const val = docs[docKey];
  if (typeof val === 'string' && (val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('http'))) {
    return true;
  }
  return false;
}

/**
 * Count how many of the 4 statutory documents have genuine uploaded files
 */
export function countGenuineDocFiles(member) {
  const keys = ['pan', 'bankAccount', 'aadhaar', 'addressProof'];
  return keys.reduce((acc, k) => acc + (hasGenuineDocFile(member, k) ? 1 : 0), 0);
}

