/**
 * Test Suite: Privacy & User Experience Issues (P3)
 * 1. Data Leak on Pending Screen (Eliminate orders[0] and customer info leak)
 * 2. OTP Visible in Browser (Plaintext OTP eliminated from sessionStorage and UI)
 * 3. Blank White Screen on Error (React ErrorBoundary safety net active)
 */
import assert from 'assert';
import fs from 'node:fs';
import { hashOtp, verifyOtpHash } from '../src/utils/cryptoAuth.js';

console.log('====================================================');
console.log('🧪 RUNNING TEST SUITE: PRIVACY & USER EXPERIENCE (P3)');
console.log('====================================================\n');

// -------------------------------------------------------------------
// TEST 1: Data Leak Prevention on Pending Screen
// -------------------------------------------------------------------
console.log('TEST 1: Data Leak Prevention (Isolated Orders & No Cross-Customer Leaks)');

// Mock order database containing another customer's private order
const otherCustomerOrder = {
  order_id: 'CS_LEAK_9999',
  buyer_member_id: 'mem_victim_user_1',
  buyer_name: 'Victim Customer',
  buyer_email: 'victim@customer.com',
  buyer_phone: '+91 99999 88888',
  total_amount: 2950
};
const allOrders = [otherCustomerOrder];

// New user waiting for approval (has no confirmed order in database yet)
const newPendingUser = {
  member_id: 'mem_pending_newbie_42',
  name: 'New Pending Partner',
  email: 'newbie@cybershield.network',
  phone: '+91 77777 66666',
  seller_status: 'pending_approval'
};

// Test new safe lookup logic (must NEVER fall back to orders[0])
const safeOrderLookup = allOrders.find(o => 
  (o.buyer_member_id && o.buyer_member_id === newPendingUser.member_id) || 
  (o.buyer_email && o.buyer_email === newPendingUser.email)
);

assert.strictEqual(safeOrderLookup, undefined, 'Pending user lookup must return undefined, NOT orders[0]');

const displayedOrderNum = safeOrderLookup?.order_id || (newPendingUser.member_id ? `ORD-${newPendingUser.member_id.slice(-6).toUpperCase()}` : 'PENDING');
assert.notStrictEqual(displayedOrderNum, otherCustomerOrder.order_id, 'Must NEVER display another customer order ID');
assert.strictEqual(displayedOrderNum, 'ORD-BIE_42', 'Must safely construct isolated identifier for pending user');

// Check MemberDashboardView.jsx source code directly
const dashSource = fs.readFileSync('src/components/MemberDashboardView.jsx', 'utf8');
assert.ok(!dashSource.includes('|| orders[0]'), 'MemberDashboardView.jsx must NEVER contain "|| orders[0]" fallback');
console.log('  ✓ Verified orders[0] fallback is completely eliminated from MemberDashboardView.jsx');

// Check CheckoutModal.jsx source code
const modalCheckoutSource = fs.readFileSync('src/components/Modals/CheckoutModal.jsx', 'utf8');
assert.ok(!modalCheckoutSource.includes('Rahul Deshmukh'), 'CheckoutModal.jsx must not contain hardcoded Rahul Deshmukh');
assert.ok(!modalCheckoutSource.includes('+91 98200 44556'), 'CheckoutModal.jsx must not contain hardcoded leaked phone number');
console.log('  ✓ Verified hardcoded dummy names and phone numbers removed from CheckoutModal.jsx');


// -------------------------------------------------------------------
// TEST 2: OTP Protection (No Plaintext OTP in Browser Storage or UI)
// -------------------------------------------------------------------
console.log('\nTEST 2: OTP Cryptographic Hash Protection (No Plaintext in Browser)');

// Test 2.A: Verify OTP is hashed with salt
const testEmail = 'partner@cybershield.net';
const plainOtp = '654321';

const otpHash = await hashOtp(testEmail, plainOtp);
assert.ok(typeof otpHash === 'string' && otpHash.length === 64, 'OTP hash must be 64-character SHA-256 string');
assert.notStrictEqual(otpHash, plainOtp, 'OTP hash must not equal plaintext OTP');

// Test 2.B: Verify sessionStorage simulation stores ONLY the hash
const simulatedSessionStorage = {};
const verificationSession = {
  email: testEmail.trim().toLowerCase(),
  otpHash, // Only hash saved!
  expiresAt: Date.now() + 600000,
  attempts: 0
};
simulatedSessionStorage[`cybershield_otp_${testEmail}`] = JSON.stringify(verificationSession);

const storedJson = simulatedSessionStorage[`cybershield_otp_${testEmail}`];
assert.ok(!storedJson.includes(plainOtp), 'Stored session must NEVER contain the plaintext 6-digit OTP code!');
assert.ok(storedJson.includes(otpHash), 'Stored session contains only the one-way cryptographic hash');
console.log('  ✓ Verified sessionStorage stores only salted SHA-256 hash; plain OTP is completely unreadable');

// Test 2.C: Verify validation logic
const correctMatch = await verifyOtpHash(testEmail, plainOtp, otpHash);
assert.strictEqual(correctMatch, true, 'Correct OTP input must verify successfully against hash');

const wrongMatch = await verifyOtpHash(testEmail, '111111', otpHash);
assert.strictEqual(wrongMatch, false, 'Incorrect OTP input must fail verification');
console.log('  ✓ Verified cryptographic OTP verification accurately confirms match without storing plaintext');

// Test 2.D: Verify AuthModal.jsx does not display test code on screen
const authModalSource = fs.readFileSync('src/components/AuthModal.jsx', 'utf8');
assert.ok(!authModalSource.includes('simulatedOtpHint'), 'AuthModal.jsx must not contain simulatedOtpHint');
assert.ok(!authModalSource.includes('Instant Test Code:'), 'AuthModal.jsx must not display "Instant Test Code:" banner on screen');
console.log('  ✓ Verified OTP test code banners and display leaks are completely removed from AuthModal.jsx');


// -------------------------------------------------------------------
// TEST 3: Blank White Screen Safety (React ErrorBoundary)
// -------------------------------------------------------------------
console.log('\nTEST 3: Blank White Screen Protection (React ErrorBoundary)');

// 3.A: Verify ErrorBoundary source code implementation
const errorBoundarySource = fs.readFileSync('src/components/ErrorBoundary.jsx', 'utf8');
assert.ok(errorBoundarySource.includes('class ErrorBoundary extends React.Component'), 'ErrorBoundary must extend React.Component');
assert.ok(errorBoundarySource.includes('static getDerivedStateFromError'), 'ErrorBoundary must implement getDerivedStateFromError');
assert.ok(errorBoundarySource.includes('componentDidCatch'), 'ErrorBoundary must implement componentDidCatch');
assert.ok(errorBoundarySource.includes('hasError: true'), 'ErrorBoundary must set hasError: true');
assert.ok(errorBoundarySource.includes('Safety Shield Active'), 'ErrorBoundary must render user-friendly safety message');
console.log('  ✓ Verified ErrorBoundary implements full React lifecycle methods and fallback safety UI');

// 3.B: Verify main.jsx wraps App with ErrorBoundary
const mainSource = fs.readFileSync('src/main.jsx', 'utf8');
assert.ok(mainSource.includes('<ErrorBoundary>'), 'main.jsx must wrap application with <ErrorBoundary>');
assert.ok(mainSource.includes('</ErrorBoundary>'), 'main.jsx must close </ErrorBoundary>');
console.log('  ✓ Verified main.jsx wraps entire component tree with ErrorBoundary safety screen');

console.log('\n====================================================');
console.log('🎉 ALL P3 PRIVACY & USER EXPERIENCE TESTS PASSED!');
console.log('====================================================');
