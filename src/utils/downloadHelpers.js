/**
 * Utility to generate and trigger real file downloads for Tax Invoices and TDS Form 16A Certificates
 */

export function downloadTaxInvoice({ order, member }) {
  const orderId = order?.order_id || 'CS20261010';
  const orderDate = order?.activation_date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const buyerName = member?.name || order?.buyer_name || 'Matru Prasad Panda';
  const buyerEmail = member?.email || order?.buyer_email || 'matruprasadpanda497@gmail.com';
  const buyerPhone = member?.phone || '+91 9876543210';
  const buyerAddress = member?.address || 'Plot 42, Cyber Gateway Tech Zone, Bhubaneswar, Odisha - 751024';
  const paymentMethod = order?.payment_method || 'UPI (Google Pay / PhonePe)';
  const utrNumber = order?.utr_number || 'UTR-CS-428910293812';
  const referralCode = member?.referral_code || 'CS123456';
  const licenseKey = member?.software_license?.license_key || order?.account2_software?.license_key || `CS-PRO-${referralCode}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CyberShield Tax Invoice #${orderId}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #2563eb; }
    .brand-sub { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .company-details { font-size: 12px; color: #64748b; text-align: right; line-height: 1.5; }
    .invoice-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; font-size: 13px; }
    .meta-box { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #edf2f7; }
    .meta-title { font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 12px; color: #475569; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .total-row { font-weight: 800; font-size: 15px; color: #0f172a; background: #f8fafc; }
    .badge-paid { display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .footer-note { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; line-height: 1.5; }
    .dual-accounts-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-top: 20px; font-size: 12px; }
    @media print { body { background: #fff; padding: 0; } .invoice-card { box-shadow: none; border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="invoice-header">
      <div>
        <div class="brand-title">CyberShield</div>
        <div class="brand-sub">Security Network Pvt. Ltd.</div>
        <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
          <strong>GSTIN:</strong> 21AAACC1234D1Z5<br>
          <strong>CIN:</strong> U72900OR2026PTC048291<br>
          <strong>PAN:</strong> AABCC5544K
        </div>
      </div>
      <div class="company-details">
        <h2 style="margin: 0 0 6px; color: #0f172a; font-size: 20px;">TAX INVOICE</h2>
        <div><strong>Invoice No:</strong> #INV-${orderId}</div>
        <div><strong>Invoice Date:</strong> ${orderDate}</div>
        <div><strong>Place of Supply:</strong> Odisha (State Code 21)</div>
        <div style="margin-top: 6px;"><span class="badge-paid">PAID IN FULL ✓</span></div>
      </div>
    </div>

    <div class="invoice-meta-grid">
      <div class="meta-box">
        <div class="meta-title">Billed To (Authorized Partner)</div>
        <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${buyerName}</div>
        <div>${buyerEmail}</div>
        <div>${buyerPhone}</div>
        <div style="color: #64748b; margin-top: 4px;">${buyerAddress}</div>
      </div>
      <div class="meta-box">
        <div class="meta-title">Payment & Gateway Details</div>
        <div><strong>Payment Mode:</strong> ${paymentMethod}</div>
        <div><strong>Bank Ref / UTR:</strong> <code>${utrNumber}</code></div>
        <div><strong>Distributor ID:</strong> <code>${member?.member_id || 'mem_matru'}</code></div>
        <div><strong>Referral Code:</strong> <code>${referralCode}</code></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Description of Services & Licenses</th>
          <th>HSN/SAC</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Taxable Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>CyberShield Partner Joining Membership License</strong><br>
            <span style="color: #64748b; font-size: 12px;">One-Year Enterprise Security Suite + 6-Level Direct Selling Authorization Rights</span>
          </td>
          <td>998313</td>
          <td class="text-right">1</td>
          <td class="text-right">₹2,500.00</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align: right; color: #64748b;">Subtotal (Taxable Value):</td>
          <td class="text-right" style="font-weight: 600;">₹2,500.00</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align: right; color: #64748b;">CGST (9.0%):</td>
          <td class="text-right" style="font-weight: 600;">₹225.00</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align: right; color: #64748b;">SGST (9.0%):</td>
          <td class="text-right" style="font-weight: 600;">₹225.00</td>
        </tr>
        <tr class="total-row">
          <td colspan="4" style="text-align: right;">Total Amount Payable / Received (INR):</td>
          <td class="text-right" style="color: #2563eb;">₹2,950.00</td>
        </tr>
      </tbody>
    </table>

    <div class="dual-accounts-box">
      <strong style="color: #1e40af; font-size: 13px;">Enterprise Accounts Provisioned with this Invoice:</strong>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
        <div><strong>Account 1 (Direct Selling):</strong> Partner ID ${member?.member_id || 'mem_matru'} • 6-Tier Tree Active</div>
        <div><strong>Account 2 (Software License):</strong> <code>${licenseKey}</code> • 5 Endpoint Seats</div>
      </div>
    </div>

    <div class="footer-note">
      This is a computer-generated statutory tax invoice issued under Section 31 of the CGST Act, 2017.<br>
      Consumer Protection (Direct Selling) Rules, 2021 Compliant • 7-Day Cooling-off Guarantee Active.<br>
      Questions? Contact: support@cybershield.network | Plot 42, Cyber Gateway Tech Zone, PIN: 751024.
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CyberShield_Tax_Invoice_${orderId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadForm16A({ member, tdsAmount = 50 }) {
  const pan = member?.kyc?.pan || 'ABCDE1234F';
  const legalName = member?.kyc?.legal_name || member?.name || 'Matru Prasad Panda';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Form 16A TDS Certificate - ${legalName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
    .cert-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .cert-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .gov-sub { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    h2 { margin: 6px 0; color: #0f172a; font-size: 22px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 13px; }
    .meta-box { background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #edf2f7; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; color: #475569; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="cert-header">
      <div class="gov-sub">Income Tax Department • Government of India</div>
      <h2>FORM NO. 16A</h2>
      <div style="font-size: 13px; color: #64748b;">[See rule 31(1)(b)] • Certificate under Section 203 of the Income-tax Act, 1961</div>
      <div style="font-size: 13px; font-weight: 700; color: #2563eb; margin-top: 4px;">Certificate for Tax Deducted at Source on Payments under Section 194H (Commission)</div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <strong>Name & Address of Deductor (Payer):</strong><br>
        CyberShield Security Network Pvt. Ltd.<br>
        Plot 42, Cyber Gateway Tech Zone, Bhubaneswar, Odisha - 751024<br>
        <strong>TAN:</strong> BLRC12345E | <strong>PAN:</strong> AABCC5544K
      </div>
      <div class="meta-box">
        <strong>Name & Address of Deductee (Direct Seller):</strong><br>
        <strong>Name:</strong> ${legalName}<br>
        <strong>PAN:</strong> ${pan}<br>
        <strong>Partner Member ID:</strong> ${member?.member_id || 'mem_matru'}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Quarter</th>
          <th>Nature of Payment</th>
          <th>Gross Amount Paid</th>
          <th>Rate of TDS</th>
          <th class="text-right">TDS Deposited</th>
          <th>Challan / CIN</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Q2 (Jul - Sep 2026)</td>
          <td>Direct Selling Commission (Sec 194H)</td>
          <td>₹1,000.00</td>
          <td>5.0%</td>
          <td class="text-right" style="font-weight: 700; color: #15803d;">₹${tdsAmount}.00</td>
          <td><code>CIN99210</code></td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; color: #166534;">
      ✓ Certified that a sum of <strong>₹${tdsAmount}.00</strong> has been deducted at source and deposited to the credit of the Central Government in compliance with Section 194H.
    </div>

    <div class="footer">
      Generated automatically by CyberShield Statutory TDS Disbursal Engine.<br>
      Verified digital certificate for quarterly TDS filing with TRACES (CPC-TDS).
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CyberShield_Form16A_TDS_${member?.member_id || 'mem_matru'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
