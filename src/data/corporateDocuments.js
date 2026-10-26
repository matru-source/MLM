// Official Corporate Compliance Documents for CyberNetworking Head Office
// Master corporate filing artifacts for MCA, Income Tax Department, HDFC Escrow, and Registered Office Deed

function encodeSvg(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const corporateAadhaarMcaSvg = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCFDFD"/>
      <stop offset="100%" stop-color="#F1F5F9"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  
  <!-- Outer Border & Background -->
  <rect width="800" height="1000" fill="url(#bg)"/>
  <rect x="25" y="25" width="750" height="950" fill="none" stroke="#0F172A" stroke-width="4"/>
  <rect x="35" y="35" width="730" height="930" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Government Header -->
  <g transform="translate(400, 110)" text-anchor="middle">
    <!-- Emblem placeholder circle -->
    <circle cx="0" cy="-30" r="28" fill="#1E293B"/>
    <text x="0" y="-22" font-family="serif" font-size="24" font-weight="bold" fill="#F59E0B">स</text>
    <text x="0" y="24" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0F172A" letter-spacing="2">GOVERNMENT OF INDIA</text>
    <text x="0" y="46" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#2563EB">MINISTRY OF CORPORATE AFFAIRS</text>
    <text x="0" y="68" font-family="Arial, sans-serif" font-size="12" fill="#64748B">Central Registration Centre, Manesar</text>
  </g>

  <!-- Title -->
  <g transform="translate(400, 240)" text-anchor="middle">
    <text x="0" y="0" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#0F172A">Certificate of Incorporation</text>
    <text x="0" y="22" font-family="Arial, sans-serif" font-size="11" fill="#475569">[Pursuant to sub-section (2) of section 7 and sub-section (1) of section 8 of the Companies Act, 2013]</text>
  </g>

  <!-- Body Content -->
  <g transform="translate(80, 310)" font-family="Arial, sans-serif" font-size="13" fill="#1E293B" line-height="1.6">
    <text x="0" y="0">I hereby certify that <tspan font-weight="bold" fill="#0F172A">CYBERNETWORKING PRIVATE LIMITED</tspan> is incorporated</text>
    <text x="0" y="24">on this Tenth day of January Two Thousand Twenty-Six under the Companies Act, 2013 (18 of 2013)</text>
    <text x="0" y="48">and that the company is limited by shares.</text>

    <!-- Details Box -->
    <rect x="0" y="80" width="640" height="240" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" rx="8"/>
    
    <g transform="translate(24, 115)">
      <text x="0" y="0" font-weight="bold" fill="#475569">Corporate Identity Number (CIN):</text>
      <text x="0" y="22" font-family="monospace" font-size="16" font-weight="bold" fill="#2563EB">U72900DL2026PTC109482</text>
      
      <text x="0" y="60" font-weight="bold" fill="#475569">Permanent Account Number (PAN):</text>
      <text x="0" y="82" font-family="monospace" font-size="16" font-weight="bold" fill="#059669">AAACC1234F</text>
      
      <text x="0" y="120" font-weight="bold" fill="#475569">Tax Deduction and Collection Account Number (TAN):</text>
      <text x="0" y="142" font-family="monospace" font-size="15" font-weight="bold" fill="#0F172A">DELC99881A</text>
      
      <text x="0" y="180" font-weight="bold" fill="#475569">Company Category / Sub-Category:</text>
      <text x="0" y="198" font-size="12" fill="#334155">Company limited by shares / Union Non-Govt Company</text>
    </g>
  </g>

  <!-- Registered Address -->
  <g transform="translate(80, 680)" font-family="Arial, sans-serif" font-size="12" fill="#334155">
    <text x="0" y="0" font-weight="bold" fill="#0F172A">Registered Office Address:</text>
    <text x="0" y="20">Level 8, CyberNetworking Tower, Cyber City, DLF Phase II, Gurugram, HR 122002, India</text>
  </g>

  <!-- Digital Signature & Seal -->
  <g transform="translate(560, 800)" text-anchor="middle">
    <circle cx="0" cy="0" r="50" fill="none" stroke="#D97706" stroke-width="2"/>
    <circle cx="0" cy="0" r="44" fill="none" stroke="#D97706" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="0" y="-12" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#D97706">MCA GOVT OF INDIA</text>
    <text x="0" y="4" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="#059669">DIGITALLY SIGNED</text>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="8" fill="#64748B">10/01/2026 10:45 IST</text>
    <text x="0" y="70" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0F172A">Registrar of Companies</text>
    <text x="0" y="86" font-family="Arial, sans-serif" font-size="10" fill="#64748B">Central Registration Centre</text>
  </g>

  <!-- Statutory Footer -->
  <g transform="translate(400, 935)" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#94A3B8">
    <text x="0" y="0">This certificate is digitally signed and valid under section 7 of the Companies Act, 2013.</text>
    <text x="0" y="14">Verification URL: https://www.mca.gov.in/mcafoportal/cinLookup.do</text>
  </g>
</svg>
`);

export const corporatePanSvg = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 540" width="100%" height="100%">
  <defs>
    <linearGradient id="panbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EBF4FF"/>
      <stop offset="50%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>

  <rect width="850" height="540" rx="20" fill="url(#panbg)" stroke="#94A3B8" stroke-width="2"/>
  <rect x="15" y="15" width="820" height="510" rx="14" fill="none" stroke="#CBD5E1" stroke-width="1"/>

  <!-- Top Strip -->
  <g transform="translate(425, 45)" text-anchor="middle">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#1E3A8A" letter-spacing="1.5">INCOME TAX DEPARTMENT</text>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0F172A">GOVT. OF INDIA</text>
  </g>

  <!-- Hologram / Chip Box -->
  <g transform="translate(70, 110)">
    <rect width="85" height="70" rx="8" fill="#FDE68A" stroke="#D97706" stroke-width="1.5"/>
    <text x="42" y="42" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="#B45309">ITD CHIP</text>
  </g>

  <!-- Taxpayer Details -->
  <g transform="translate(70, 220)" font-family="Arial, sans-serif">
    <text x="0" y="0" font-size="11" font-weight="bold" fill="#64748B">NAME / नाम</text>
    <text x="0" y="24" font-size="17" font-weight="900" fill="#0F172A" letter-spacing="0.5">CYBERNETWORKING PRIVATE LIMITED</text>

    <text x="0" y="60" font-size="11" font-weight="bold" fill="#64748B">DATE OF INCORPORATION / निगमन की तारीख</text>
    <text x="0" y="82" font-size="15" font-weight="bold" fill="#1E293B">10/01/2026</text>

    <text x="0" y="125" font-size="12" font-weight="bold" fill="#64748B">PERMANENT ACCOUNT NUMBER / स्थायी खाता संख्या</text>
    <rect x="-6" y="136" width="380" height="48" rx="6" fill="#0F172A"/>
    <text x="184" y="169" text-anchor="middle" font-family="monospace" font-size="26" font-weight="900" fill="#F8FAFC" letter-spacing="4">AAACC1234F</text>
  </g>

  <!-- QR Code & Signature Box -->
  <g transform="translate(680, 240)">
    <rect x="-80" y="-80" width="160" height="160" fill="#FFFFFF" stroke="#0F172A" stroke-width="2" rx="8"/>
    <!-- Mock QR pattern -->
    <rect x="-65" y="-65" width="40" height="40" fill="#0F172A"/>
    <rect x="25" y="-65" width="40" height="40" fill="#0F172A"/>
    <rect x="-65" y="25" width="40" height="40" fill="#0F172A"/>
    <rect x="-10" y="-10" width="20" height="20" fill="#0F172A"/>
    <text x="0" y="105" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#059669">SECURE QR VERIFIED</text>
  </g>

  <!-- Footer -->
  <g transform="translate(425, 495)" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748B">
    <text x="0" y="0">This card is issued under Section 139A of the Income Tax Act, 1961.</text>
  </g>
</svg>
`);

export const corporateOfficeLeaseSvg = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%">
  <rect width="800" height="1000" fill="#FAFBFD"/>
  <rect x="25" y="25" width="750" height="950" fill="none" stroke="#334155" stroke-width="3"/>
  <rect x="35" y="35" width="730" height="930" fill="none" stroke="#CBD5E1" stroke-width="1"/>

  <!-- Stamp Paper Header -->
  <rect x="40" y="40" width="720" height="150" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.5"/>
  <g transform="translate(400, 100)" text-anchor="middle">
    <text x="0" y="0" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#78350F" letter-spacing="3">INDIA NON JUDICIAL</text>
    <text x="0" y="24" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#92400E">GOVERNMENT OF HARYANA</text>
    <text x="0" y="45" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#059669">e-Stamp Certificate No: IN-HR8294018294821N</text>
  </g>

  <!-- Document Title -->
  <g transform="translate(400, 240)" text-anchor="middle">
    <text x="0" y="0" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#0F172A">COMMERCIAL LEASE &amp; REGISTERED OFFICE DEED</text>
    <text x="0" y="22" font-family="Arial, sans-serif" font-size="11" fill="#64748B">Statutory Address Compliance under Companies Act 2013 &amp; Direct Selling Rules</text>
  </g>

  <!-- Deed Body -->
  <g transform="translate(80, 310)" font-family="Arial, sans-serif" font-size="13" fill="#1E293B">
    <text x="0" y="0">THIS LEASE DEED is executed on this 10th day of January, 2026 at Gurugram, Haryana by and between:</text>

    <text x="0" y="40" font-weight="bold" fill="#0F172A">1. LESSOR: DLF Cyber City Developers Limited,</text>
    <text x="0" y="60" fill="#475569">having registered office at DLF Centre, Sansad Marg, New Delhi 110001.</text>

    <text x="0" y="100" font-weight="bold" fill="#0F172A">2. LESSEE: CyberNetworking Private Limited,</text>
    <text x="0" y="120" fill="#475569">represented by authorized signatory Matru Prasad Panda (Managing Director).</text>

    <!-- Property Details Box -->
    <rect x="0" y="160" width="640" height="200" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" rx="8"/>
    <g transform="translate(24, 195)">
      <text x="0" y="0" font-weight="bold" fill="#2563EB">DEMISED PREMISES &amp; CORPORATE HEAD OFFICE ADDRESS:</text>
      <text x="0" y="28" font-size="15" font-weight="bold" fill="#0F172A">Level 8, Tower B, CyberNetworking HQ, DLF Cyber City,</text>
      <text x="0" y="50" font-size="14" font-weight="bold" fill="#0F172A">Phase II, Gurugram, Haryana - 122002, India.</text>

      <text x="0" y="90" font-size="12" fill="#475569">Permitted Use: Headquarters &amp; Operations of National Cyber Security MLM Network</text>
      <text x="0" y="110" font-size="12" fill="#475569">Lease Period: 5 Years (Renewable)</text>
      <text x="0" y="130" font-size="12" font-weight="bold" fill="#059669">Electricity Utility Meter ID: DHBVN-CYBER-88491 (Active &amp; Paid)</text>
    </g>
  </g>

  <!-- Seals & Signatures -->
  <g transform="translate(200, 780)" text-anchor="middle">
    <line x1="-100" y1="0" x2="100" y2="0" stroke="#0F172A" stroke-width="1.5"/>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0F172A">For DLF Cyber City Developers Ltd</text>
    <text x="0" y="36" font-family="Arial, sans-serif" font-size="10" fill="#64748B">Authorized Signatory (Lessor)</text>
  </g>

  <g transform="translate(600, 780)" text-anchor="middle">
    <line x1="-100" y1="0" x2="100" y2="0" stroke="#0F172A" stroke-width="1.5"/>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#2563EB">For CyberNetworking Pvt Ltd</text>
    <text x="0" y="36" font-family="Arial, sans-serif" font-size="10" fill="#64748B">Managing Director (Lessee)</text>
  </g>

  <!-- Sub-Registrar Seal -->
  <g transform="translate(400, 890)" text-anchor="middle">
    <circle cx="0" cy="0" r="40" fill="none" stroke="#059669" stroke-width="2"/>
    <text x="0" y="-8" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#059669">REGISTERED DEED</text>
    <text x="0" y="8" font-family="Arial, sans-serif" font-size="8" fill="#059669">Sub-Registrar Gurugram</text>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="8" fill="#64748B">10-Jan-2026</text>
  </g>
</svg>
`);

export const corporateBankCertificateSvg = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%">
  <rect width="800" height="1000" fill="#FFFFFF"/>
  <rect x="25" y="25" width="750" height="950" fill="none" stroke="#1E3A8A" stroke-width="3"/>
  <rect x="35" y="35" width="730" height="930" fill="none" stroke="#CBD5E1" stroke-width="1"/>

  <!-- Bank Letterhead -->
  <g transform="translate(80, 80)">
    <rect width="180" height="44" fill="#004C8F" rx="4"/>
    <text x="90" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">HDFC BANK</text>
    <text x="0" y="66" font-family="Arial, sans-serif" font-size="11" fill="#64748B">HDFC Bank Corporate Banking Group, Connaught Place, New Delhi 110001</text>
  </g>

  <!-- Certificate Heading -->
  <g transform="translate(400, 200)" text-anchor="middle">
    <text x="0" y="0" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#0F172A">CORPORATE ESCROW SETTLEMENT CERTIFICATE</text>
    <text x="0" y="22" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#059669">TO WHOMSOEVER IT MAY CONCERN</text>
  </g>

  <!-- Body -->
  <g transform="translate(80, 270)" font-family="Arial, sans-serif" font-size="13" fill="#1E293B">
    <text x="0" y="0">This is to certify that <tspan font-weight="bold" fill="#0F172A">CYBERNETWORKING PRIVATE LIMITED</tspan> maintains an</text>
    <text x="0" y="22">active Corporate Escrow and Multi-Tier Partner Commission Settlement Account with our branch as per</text>
    <text x="0" y="44">the RBI guidelines and Direct Selling Rules 2021.</text>

    <!-- Account Details Card -->
    <rect x="0" y="70" width="640" height="250" fill="#F8FAFC" stroke="#93C5FD" stroke-width="1.5" rx="10"/>

    <g transform="translate(24, 105)">
      <text x="0" y="0" font-weight="bold" fill="#475569">Account Beneficiary Name:</text>
      <text x="0" y="22" font-size="15" font-weight="bold" fill="#0F172A">CYBERNETWORKING PRIVATE LIMITED</text>

      <text x="0" y="60" font-weight="bold" fill="#475569">Corporate Account Number:</text>
      <text x="0" y="84" font-family="monospace" font-size="20" font-weight="bold" fill="#2563EB">50200012345678</text>

      <text x="0" y="122" font-weight="bold" fill="#475569">RTGS / NEFT / IMPS IFSC Code:</text>
      <text x="0" y="144" font-family="monospace" font-size="17" font-weight="bold" fill="#059669">HDFC0000001</text>

      <text x="0" y="180" font-weight="bold" fill="#475569">Account Type / Operating Mode:</text>
      <text x="0" y="200" font-size="13" fill="#334155">Current Corporate Escrow / Direct Automated Partner Disbursal</text>
    </g>
  </g>

  <!-- Cheque Graphic -->
  <g transform="translate(80, 610)">
    <rect width="640" height="150" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4,3" rx="8"/>
    <text x="24" y="32" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">CANCELLED CHEQUE SPECIMEN ATTACHED</text>
    <line x1="20" y1="130" x2="620" y2="30" stroke="#DC2626" stroke-width="4"/>
    <line x1="20" y1="145" x2="620" y2="45" stroke="#DC2626" stroke-width="4"/>
    <text x="320" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#DC2626" letter-spacing="8">CANCELLED</text>
  </g>

  <!-- Bank Authorized Signatory -->
  <g transform="translate(580, 850)" text-anchor="middle">
    <circle cx="0" cy="0" r="42" fill="none" stroke="#1E3A8A" stroke-width="2"/>
    <text x="0" y="-8" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1E3A8A">HDFC BANK LTD</text>
    <text x="0" y="8" font-family="Arial, sans-serif" font-size="8" fill="#059669">BRANCH MANAGER</text>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="8" fill="#64748B">Connaught Place</text>
    <text x="0" y="65" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0F172A">Chief Manager (Escrow Ops)</text>
  </g>

  <!-- Statutory Footer -->
  <g transform="translate(400, 950)" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#94A3B8">
    <text x="0" y="0">This certificate is issued for regulatory compliance and partner commission settlement verification.</text>
  </g>
</svg>
`);
