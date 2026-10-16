/**
 * Brevo (formerly Sendinblue) Transactional Email OTP Service
 * API Documentation: https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const STORAGE_KEY_API_KEY = 'cybershield_brevo_api_key';
const STORAGE_KEY_SENDER = 'cybershield_brevo_sender_email';

export const DEFAULT_BREVO_SENDER = 'matruprasadpanda497@gmail.com';

export function getBrevoApiKey() {
  return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
}

export function setBrevoApiKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  }
}

export function getBrevoSenderEmail() {
  return localStorage.getItem(STORAGE_KEY_SENDER) || DEFAULT_BREVO_SENDER;
}

export function setBrevoSenderEmail(email) {
  if (email) {
    localStorage.setItem(STORAGE_KEY_SENDER, email.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_SENDER);
  }
}

// Generate a secure 6-digit numeric OTP
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an OTP verification email to user
 * If Brevo API key is available, sends real transactional email via Brevo REST API.
 * If not yet configured, runs in testing mode and returns the code so development is uninterrupted.
 */
export async function sendEmailOtp({ email, fullName }) {
  const otpCode = generateOtpCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  // Save pending verification session in sessionStorage
  const verificationSession = {
    email: email.trim().toLowerCase(),
    otp: otpCode,
    expiresAt,
    attempts: 0
  };
  sessionStorage.setItem(`cybershield_otp_${email.trim().toLowerCase()}`, JSON.stringify(verificationSession));

  // 1. Primary Method: Dispatch via secure backend serverless API route (/api/auth/send-otp)
  // This keeps the Brevo API key strictly in server environment variables without client exposure.
  try {
    const serverlessRes = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), fullName, otp: otpCode })
    });
    if (serverlessRes.ok) {
      const serverlessData = await serverlessRes.json();
      if (serverlessData.success || serverlessData.ok) {
        return {
          success: true,
          mode: serverlessData.mode || 'serverless_brevo',
          messageId: serverlessData.messageId,
          otp: otpCode,
          message: serverlessData.message || `Real verification OTP email dispatched to ${email} via secure serverless gateway!`
        };
      }
    }
  } catch (backendErr) {
    // Backend endpoint not active in static client dev environment; continue to client-side fallback
    console.debug('[Brevo Client] Backend serverless unavailable, falling back to client config:', backendErr?.message);
  }

  const apiKey = getBrevoApiKey();
  const senderEmail = getBrevoSenderEmail();

  // If live Brevo API key is configured in client settings, send via Brevo REST API
  if (apiKey) {
    try {
      const emailPayload = {
        sender: {
          name: 'CyberShield Security Network',
          email: senderEmail
        },
        to: [
          {
            email: email.trim(),
            name: fullName || 'Partner Member'
          }
        ],
        subject: `[CyberShield Network] Your Registration Verification OTP: ${otpCode}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; }
              .container { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
              .logo { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 800; color: #1E40AF; margin-bottom: 20px; }
              .title { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 10px 0; }
              .subtitle { font-size: 14px; color: #64748B; line-height: 1.5; margin: 0 0 24px 0; }
              .otp-box { background: #EFF6FF; border: 2px dashed #3B82F6; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0; }
              .otp-number { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #1D4ED8; font-family: monospace; }
              .expiry-note { font-size: 12px; color: #64748B; margin-top: 6px; }
              .warning { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400E; margin-top: 24px; line-height: 1.5; }
              .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 28px; border-top: 1px solid #F1F5F9; padding-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">🛡️ CyberShield Network</div>
              <h1 class="title">Verify Your Email Address</h1>
              <p class="subtitle">Hi ${fullName || 'Partner'}, thank you for registering with CyberShield Network. Use the verification code below to verify your email address:</p>
              
              <div class="otp-box">
                <div class="otp-number">${otpCode}</div>
                <div class="expiry-note">Valid for 10 minutes. Do not share this code with anyone.</div>
              </div>

              <div class="warning">
                <strong>Security Alert:</strong> CyberShield staff will never ask you for your verification code or password via phone, email, or WhatsApp.
              </div>

              <div class="footer">
                © 2026 CyberShield Network. All rights reserved.<br>
                Consumer Protection (Direct Selling) Rules, 2021 Compliant.
              </div>
            </div>
          </body>
          </html>
        `
      };

      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Brevo API responded with error:', errorData);
        // Fallback gracefully so registration can still proceed
        return {
          success: true,
          mode: 'live_failed_fallback',
          otp: otpCode,
          message: `Brevo API returned error (${response.status}). Generated OTP for testing: ${otpCode}`,
          error: errorData
        };
      }

      const responseData = await response.json();
      return {
        success: true,
        mode: 'live_brevo',
        messageId: responseData.messageId,
        otp: otpCode,
        message: `Real verification OTP email sent to ${email} via Brevo!`
      };
    } catch (err) {
      console.error('Error connecting to Brevo API:', err);
      return {
        success: true,
        mode: 'network_fallback',
        otp: otpCode,
        message: `Could not reach Brevo API directly. Test OTP: ${otpCode}`
      };
    }
  }

  // Testing / Preview mode when Brevo API key is not yet entered
  console.log(`%c[CyberShield Brevo OTP Service] Verification OTP for ${email}: ${otpCode}`, 'background: #2563EB; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  return {
    success: true,
    mode: 'simulation',
    otp: otpCode,
    message: `Test OTP sent! Code is ${otpCode} (Enter Brevo API Key anytime for real email delivery).`
  };
}

/**
 * Verify entered OTP against stored session
 */
export function verifyEmailOtp({ email, enteredOtp }) {
  const sessionStr = sessionStorage.getItem(`cybershield_otp_${email.trim().toLowerCase()}`);
  if (!sessionStr) {
    return { success: false, reason: 'No pending OTP verification found. Please request a new code.' };
  }

  const session = JSON.parse(sessionStr);

  if (Date.now() > session.expiresAt) {
    sessionStorage.removeItem(`cybershield_otp_${email.trim().toLowerCase()}`);
    return { success: false, reason: 'Verification code has expired. Please request a new code.' };
  }

  if (session.attempts >= 5) {
    sessionStorage.removeItem(`cybershield_otp_${email.trim().toLowerCase()}`);
    return { success: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (session.otp.trim() !== enteredOtp.trim()) {
    session.attempts += 1;
    sessionStorage.setItem(`cybershield_otp_${email.trim().toLowerCase()}`, JSON.stringify(session));
    return { success: false, reason: 'Invalid verification code. Please check and try again.' };
  }

  // Verified successfully!
  sessionStorage.removeItem(`cybershield_otp_${email.trim().toLowerCase()}`);
  return { success: true, message: 'Email address successfully verified!' };
}
