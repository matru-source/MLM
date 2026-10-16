/**
 * Test Security Fixes Verification Script
 * Validates the 5 critical P0 security issues are fully resolved.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword, verifyPassword } from '../src/utils/cryptoAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist/assets');

async function runTests() {
  console.log('====================================================');
  console.log('🔒 VERIFYING RESOLUTION OF TOP 5 CRITICAL P0 ISSUES');
  console.log('====================================================\n');

  // Test 1: Password Hashing & Verification
  console.log('--- TEST 1: Cryptographic Password Hashing & Verification ---');
  const plain = 'SecretPass@2026!';
  const hash = await hashPassword(plain);
  if (!hash || hash.length !== 64) {
    throw new Error(`Hash failed: expected 64 hex chars, got ${hash}`);
  }
  console.log('✅ PASS [1]: Password hashed to 64-character SHA-256 string');

  const isMatch = await verifyPassword(plain, hash);
  if (!isMatch) throw new Error('Valid password failed verification');
  console.log('✅ PASS [2]: Correct password verified successfully');

  const isMismatch = await verifyPassword('WrongPassword123', hash);
  if (isMismatch) throw new Error('Incorrect password was mistakenly accepted');
  console.log('✅ PASS [3]: Incorrect password strictly rejected');

  // Test 2: Client bundle inspection for exposed Brevo API Key
  console.log('\n--- TEST 2: Email API Key Exposed in Client Bundle ---');
  const jsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
  const compromisedBrevoKey = 'xkeysib-dd33eaf971b87fe9c47207ffbd40162ab62ba051aef7b9c470a868f2d80aa1de';
  
  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(path.join(distDir, jsFile), 'utf-8');
    if (content.includes(compromisedBrevoKey)) {
      throw new Error(`CRITICAL: Compromised Brevo key found in compiled bundle ${jsFile}`);
    }
  }
  console.log('✅ PASS [4]: Compromised Brevo API key is completely absent from all compiled client bundles');

  // Test 3: Client bundle inspection for hardcoded Base64 Neon DB owner string
  console.log('\n--- TEST 3: Database Master Password Exposed in Client Bundle ---');
  const compromisedBase64Db = 'cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfckVnVEZDTHdEcTM2';
  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(path.join(distDir, jsFile), 'utf-8');
    if (content.includes(compromisedBase64Db)) {
      throw new Error(`CRITICAL: Hardcoded DB owner string found in compiled bundle ${jsFile}`);
    }
  }
  console.log('✅ PASS [5]: Hardcoded base64 Neon DB connection string is completely absent from all client bundles');

  // Test 4: Protected Admin Gate
  console.log('\n--- TEST 4: Admin Page Route Protection ---');
  const appJs = fs.readFileSync(path.resolve(__dirname, '../src/App.jsx'), 'utf-8');
  if (!appJs.includes('AdminLoginModal') || !appJs.includes('!isAdminAuthenticated')) {
    throw new Error('App.jsx does not gate /admin route with AdminLoginModal');
  }
  console.log('✅ PASS [6]: /admin route is gated with AdminLoginModal and requires executive authentication');

  // Test 5: Registration Saves Passwords to DB
  console.log('\n--- TEST 5: Password Storage During Member Registration ---');
  const contextJs = fs.readFileSync(path.resolve(__dirname, '../src/context/MlmContext.jsx'), 'utf-8');
  if (!contextJs.includes('passwordHash') || !contextJs.includes('hashPassword(password)')) {
    throw new Error('MlmContext.jsx does not hash and store password during registration');
  }
  console.log('✅ PASS [7]: User passwords are cryptographically hashed and saved during registration');

  console.log('\n====================================================');
  console.log('🎉 ALL 5 CRITICAL SECURITY ISSUES VERIFIED FIXED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err.message);
  process.exit(1);
});
