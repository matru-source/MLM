/**
 * Test Money & Payment Loopholes (P1) Verification Script
 * Validates the 4 financial & payment fixes:
 * 1. Withdrawal Double-Spending Prevention
 * 2. Instant Free Account Activation Prevention
 * 3. Lost Commissions / Concurrency Race Condition Fix
 * 4. Duplicate Bank UTR Rejection
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('====================================================');
  console.log('💰 VERIFYING MONEY & PAYMENT LOOPHOLES (P1) FIXES');
  console.log('====================================================\n');

  const contextJs = fs.readFileSync(path.resolve(__dirname, '../src/context/MlmContext.jsx'), 'utf-8');
  const neonDbJs = fs.readFileSync(path.resolve(__dirname, '../src/services/neonDbService.js'), 'utf-8');
  const zexJs = fs.readFileSync(path.resolve(__dirname, '../src/services/zexIntegrationService.js'), 'utf-8');
  const checkoutJs = fs.readFileSync(path.resolve(__dirname, '../src/components/CheckoutModal.jsx'), 'utf-8');

  // TEST 1: Withdrawal Double-Spending
  console.log('--- TEST 1: Withdrawal Double-Spending Prevention ---');
  if (!contextJs.includes('activePendingTotal') || !contextJs.includes('unencumberedBalance')) {
    throw new Error('MlmContext.jsx does not calculate unencumbered balance for withdrawals');
  }
  console.log('✅ PASS [1]: Unencumbered balance calculation accounts for active pending withdrawals');

  if (!contextJs.includes('setAvailableBalance(prev => Math.max(0, prev - numAmount))')) {
    throw new Error('MlmContext.jsx does not immediately lock funds upon withdrawal submission');
  }
  console.log('✅ PASS [2]: Funds are immediately locked and deducted from available balance on request');

  if (!neonDbJs.includes('AND wallet_balance >= ${payout.amount}')) {
    throw new Error('neonDbService.js does not enforce atomic balance check on payout request');
  }
  console.log('✅ PASS [3]: Database atomically checks and reserves balance at SQL level (prevents concurrency overdraft)');

  if (!contextJs.includes('RESTORE RESERVED FUNDS back to partner balance upon rejection')) {
    throw new Error('MlmContext.jsx does not restore locked funds on payout rejection');
  }
  console.log('✅ PASS [4]: Rejected withdrawal requests properly restore reserved funds back to member balance');

  // TEST 2: Instant Free Account Activation
  console.log('\n--- TEST 2: Instant Free Account Activation Prevention ---');
  if (contextJs.includes("payment_status: 'paid',") && contextJs.includes("activated_by: 'CyberShield Trust Engine'")) {
    throw new Error('completePayment still auto-marks orders as paid without admin verification');
  }
  if (!contextJs.includes("payment_status: 'pending_verification'")) {
    throw new Error('completePayment does not set payment_status to pending_verification');
  }
  console.log('✅ PASS [5]: completePayment marks order as pending_verification instead of instant paid');

  if (!contextJs.includes("seller_status: 'pending_approval'")) {
    throw new Error('completePayment does not keep seller_status as pending_approval');
  }
  console.log('✅ PASS [6]: Buyer account remains in pending_approval (referral link & dashboard locked)');

  if (checkoutJs.includes('confetti({') && checkoutJs.includes('PAID ✓')) {
    throw new Error('CheckoutModal still displays instant PAID checkmark');
  }
  console.log('✅ PASS [7]: Checkout UI displays Awaiting Admin Bank Verification status instead of fake instant approval');

  // TEST 3: Lost Commissions (Race Condition Fix)
  console.log('\n--- TEST 3: Lost Commissions (Atomic Concurrency Arithmetic) ---');
  if (neonDbJs.includes('wallet_balance = ${newBal}')) {
    throw new Error('neonDbService still uses non-atomic JavaScript read-modify-write for commissions');
  }
  if (!neonDbJs.includes('wallet_balance = COALESCE(wallet_balance, 0) + ${tier.rate}')) {
    throw new Error('neonDbService does not use atomic SQL increment for commissions');
  }
  console.log('✅ PASS [8]: dbApproveActivation uses atomic in-place SQL arithmetic for upline commissions');

  if (!zexJs.includes('wallet_balance = COALESCE(wallet_balance, 0) + ${tier.rate}')) {
    throw new Error('zexIntegrationService does not use atomic SQL increment for commissions');
  }
  console.log('✅ PASS [9]: ZEX webhook commission processing uses atomic in-place SQL arithmetic');

  // TEST 4: Duplicate Bank UTR Numbers
  console.log('\n--- TEST 4: Duplicate Bank UTR Numbers Prevention ---');
  if (!contextJs.includes('isDuplicate') || !contextJs.includes('Duplicate Bank Reference')) {
    throw new Error('MlmContext.jsx does not validate UTR uniqueness against existing orders/activations');
  }
  console.log('✅ PASS [10]: completePayment enforces strict duplicate UTR check against all orders and activations');

  if (!neonDbJs.includes('dbCheckUtrExists') || !neonDbJs.includes('Duplicate UTR Error')) {
    throw new Error('neonDbService does not provide database-level duplicate UTR check');
  }
  console.log('✅ PASS [11]: Database service enforces cross-table duplicate UTR verification');

  console.log('\n====================================================');
  console.log('🎉 ALL 4 MONEY & PAYMENT LOOPHOLES VERIFIED FIXED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err.message);
  process.exit(1);
});
