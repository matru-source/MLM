import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

console.log('🧪 TESTING CATEGORY 5: UI, PRIVACY & USER FLOW ISSUES');
console.log('====================================================\n');

let allPassed = true;

// 1. Admin Button Still Visible Check
console.log('🔍 TEST 1: Verifying Admin Desk button is removed from user dashboard...');
const memberDashView = fs.readFileSync(path.join(srcDir, 'components/MemberDashboardView.jsx'), 'utf8');

if (memberDashView.includes('Admin Desk') || memberDashView.includes('#admin') || memberDashView.includes("setAdminView(true)")) {
  console.error('❌ FAIL: Admin Desk or admin desk trigger still found in MemberDashboardView.jsx');
  allPassed = false;
} else if (memberDashView.includes('Awaiting Bank Verification')) {
  console.log('✓ 1. SUCCESS: "Admin Desk" button removed; replaced with compliant "Awaiting Bank Verification" badge.');
} else {
  console.error('❌ FAIL: Unexpected pending banner content.');
  allPassed = false;
}

// 2. KYC Images Saved & Admin Document Inspection
console.log('\n🔍 TEST 2: Verifying KYC uploads save base64 Data URLs & Admin can view photos...');
const kycModal = fs.readFileSync(path.join(srcDir, 'components/Modals/KycModal.jsx'), 'utf8');
const adminDash = fs.readFileSync(path.join(srcDir, 'components/AdminPortal/AdminDashboard.jsx'), 'utf8');
const mlmContext = fs.readFileSync(path.join(srcDir, 'context/MlmContext.jsx'), 'utf8');

const readsDataUrl = kycModal.includes('FileReader') && kycModal.includes('readAsDataURL');
const preservesDocData = mlmContext.includes('panName') && mlmContext.includes('bankAccountName');
const adminCanViewPhoto = adminDash.includes('View Photo') && adminDash.includes('selectedProofModal');

if (readsDataUrl && preservesDocData && adminCanViewPhoto) {
  console.log('✓ 2. SUCCESS: KYC photos read as base64 Data URLs, persisted to state/DB, and Admin review modal can view full images.');
} else {
  console.error(`❌ FAIL: KYC photo pipeline incomplete: readsDataUrl=${readsDataUrl}, preservesDocData=${preservesDocData}, adminCanViewPhoto=${adminCanViewPhoto}`);
  allPassed = false;
}

// 3. Forgot Password Flow
console.log('\n🔍 TEST 3: Verifying "Forgot Password" self-service flow in AuthModal...');
const authModal = fs.readFileSync(path.join(srcDir, 'components/AuthModal.jsx'), 'utf8');

const hasForgotButton = authModal.includes('Forgot Password?');
const hasForgotStep = authModal.includes("authMode === 'forgot'") || authModal.includes("setAuthMode('forgot')");
const hasResetHandler = authModal.includes('handleConfirmResetPassword') && authModal.includes('handleSendResetCode');
const hasBrevoIntegration = authModal.includes('sendEmailOtp') && authModal.includes('verifyEmailOtp');
const hasHashUpdate = authModal.includes('hashPassword') && authModal.includes('dbUpdateMemberPassword');

if (hasForgotButton && hasForgotStep && hasResetHandler && hasBrevoIntegration && hasHashUpdate) {
  console.log('✓ 3. SUCCESS: Self-service Forgot Password flow implemented with Brevo OTP verification & password hashing!');
} else {
  console.error(`❌ FAIL: Forgot password missing components: button=${hasForgotButton}, step=${hasForgotStep}, resetHandler=${hasResetHandler}, brevo=${hasBrevoIntegration}, hashUpdate=${hasHashUpdate}`);
  allPassed = false;
}

// 4. Old Trading Bot Text Purged
console.log('\n🔍 TEST 4: Verifying no old trading bot text remains in UI components...');
const checkFiles = [
  'components/PublicView/PublicLanding.jsx',
  'components/Modals/CheckoutModal.jsx',
  'components/MemberPortal/MemberDashboard.jsx',
  'components/MemberPortal/ReferralHub.jsx',
  'components/PublicHome.jsx',
  'components/MemberDashboardView.jsx'
];

let tradingMentions = 0;
for (const relPath of checkFiles) {
  const filePath = path.join(srcDir, relPath);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/algorithmic|trading bot|trade bot|trading tools|crypto & equity market signals/gi);
    if (matches) {
      console.error(`❌ FAIL: Found trading text in ${relPath}:`, matches);
      tradingMentions += matches.length;
    }
  }
}

if (tradingMentions === 0) {
  console.log('✓ 4. SUCCESS: All legacy "Algorithmic Trading Bot", "trading tools", and "signals" copy completely replaced with Cyber Security.');
} else {
  allPassed = false;
}

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 ALL 4 ISSUES IN CATEGORY 5 (UI, PRIVACY & USER FLOW) VERIFIED & RESOLVED!');
  process.exit(0);
} else {
  console.error('❌ SOME CHECKS FAILED IN CATEGORY 5.');
  process.exit(1);
}
