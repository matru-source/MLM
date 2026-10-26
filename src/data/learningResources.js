// CyberNetworking Academy & Training Resources Baseline Data
// Features video tutorials and comprehensive books/manuals with real readable page content

export const initialLearningResources = [
  // ==========================================
  // 1. CYBERSECURITY TRAINING VIDEOS
  // ==========================================
  {
    id: 'vid_phishing_defense',
    type: 'video',
    title: 'Mastering Cyber Threat Intelligence & Phishing Defense',
    category: 'Threat Defense',
    duration: '18 min',
    author: 'CyberNetworking InfoSec Team',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/embed/bPVaOlJ6ln0',
    description: 'In-depth operational breakdown of email phishing vectors, spear-phishing signatures, credential harvesting tactics, and live incident response playbooks for enterprise defense.',
    isFeatured: true,
    chapters: [
      { time: '00:00', title: 'Introduction to Modern Threat Landscape' },
      { time: '04:15', title: 'Anatomy of Advanced Spear Phishing Attacks' },
      { time: '09:30', title: 'Email Gateway Heuristics & DMARC/DKIM/SPF' },
      { time: '14:20', title: 'Live Demonstration: Malicious Link Deobfuscation' },
      { time: '17:00', title: 'Partner Action Checklist & Employee Hygiene' }
    ],
    notes: 'Key Takeaway: Over 82% of corporate data breaches start with human error or compromised email credentials. Deploying multi-factor authentication (MFA) and continuous email verification prevents 99% of automated credential stuffing attacks.'
  },
  {
    id: 'vid_zero_trust_arch',
    type: 'video',
    title: 'Zero Trust Network Architecture & Endpoint Hardening',
    category: 'Zero Trust & Cloud',
    duration: '26 min',
    author: 'Dr. Matru Prasad Mohanty (Principal Director)',
    thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/embed/yrr_W7j9r4E',
    description: 'Learn how perimeter-less network security works: micro-segmentation, continuous identity verification, posture assessments, and securing remote Windows and Linux enterprise nodes.',
    isFeatured: true,
    chapters: [
      { time: '00:00', title: 'Why Perimeter Defenses Fail in Cloud Networks' },
      { time: '05:40', title: 'The 3 Pillars of Zero Trust: Verify, Least Privilege, Assume Breach' },
      { time: '12:10', title: 'Micro-segmentation & Network Access Control (NAC)' },
      { time: '19:25', title: 'Deploying Endpoint Detection & Response (EDR) Agents' },
      { time: '24:00', title: 'SOC Integration & Real-time Telemetry Dashboards' }
    ],
    notes: 'Never trust, always verify. Every request must be authenticated, authorized, and encrypted before granting access to critical infrastructure.'
  },
  {
    id: 'vid_enterprise_ransomware',
    type: 'video',
    title: 'Enterprise Ransomware Mitigation & Disaster Recovery',
    category: 'Malware Defense',
    duration: '32 min',
    author: 'Senior Security Architect',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/embed/g4kKz8P9i3o',
    description: 'Practical operational protocols for detecting lateral movement, isolating infected network subnets, automated air-gapped backups, and cryptographic recovery procedures.',
    isFeatured: false,
    chapters: [
      { time: '00:00', title: 'Ransomware Evolution: From Lockers to Exfiltration' },
      { time: '07:15', title: 'Detecting Lateral Movement with Windows Event Logs' },
      { time: '15:30', title: 'Immutable & Air-Gapped Backup Strategies' },
      { time: '23:45', title: 'Incident Containment: Isolating Compromised VLANs' },
      { time: '29:10', title: 'Post-Incident Forensics & Compliance Disclosures' }
    ],
    notes: 'Having immutable, air-gapped backups guarantees business continuity without having to negotiate with criminal threat actors.'
  },
  {
    id: 'vid_partner_direct_selling',
    type: 'video',
    title: 'Direct Selling Rules 2021 & Legal Ethics for Cyber Partners',
    category: 'Regulatory Compliance',
    duration: '21 min',
    author: 'Corporate Legal & Compliance Desk',
    thumbnail: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/embed/inWWhr5tnEA',
    description: 'A comprehensive walkthrough of the Consumer Protection (Direct Selling) Rules 2021, statutory TDS filing under Sec 194H, 7-day cooling-off guarantee, and ethical marketing guidelines.',
    isFeatured: false,
    chapters: [
      { time: '00:00', title: 'Overview of Consumer Protection Act & 2021 Direct Selling Rules' },
      { time: '04:50', title: 'The Legitimate Cyber Security Product Requirement' },
      { time: '09:30', title: '7-Day Cooling-off Period & Escrow Settlement' },
      { time: '14:15', title: 'Statutory TDS Deductions (Sec 194H vs Sec 206AA)' },
      { time: '18:40', title: 'Partner Code of Ethics & Brand Protection' }
    ],
    notes: 'Direct sellers must always provide genuine product utility, transparent pricing, and honor customer cooling-off rights without exception.'
  },
  {
    id: 'vid_api_webhook_security',
    type: 'video',
    title: 'Securing API Integrations, Webhook Signatures & Token Handshakes',
    category: 'API & Web Security',
    duration: '19 min',
    author: 'Platform Engineering Lead',
    thumbnail: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/embed/4a0FbQdH3dY',
    description: 'Deep dive into HMAC-SHA256 signature verification, ZEX Connect handshakes, rate limiting, and replay attack prevention for high-volume transactions.',
    isFeatured: false,
    chapters: [
      { time: '00:00', title: 'Fundamentals of Webhook Security' },
      { time: '04:10', title: 'Generating & Verifying HMAC-SHA256 Signatures' },
      { time: '09:20', title: 'Timestamp Replay Attack Mitigation' },
      { time: '13:50', title: 'Mutual TLS & IP Allowlisting for Admin Gateways' },
      { time: '17:30', title: 'Testing with CyberNetworking Webhook Simulator' }
    ],
    notes: 'Never parse webhook payloads without first cryptographically validating the HMAC signature against your secret key.'
  },

  // ==========================================
  // 2. BOOKS & MANUALS (PDF VIEWER)
  // ==========================================
  {
    id: 'pdf_partner_playbook_2026',
    type: 'pdf',
    title: 'CyberNetworking Partner Playbook & Direct Selling Manual (2026 Edition)',
    category: 'Partner Handbook',
    pageCount: 48,
    author: 'CyberNetworking Executive Desk',
    thumbnail: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
    url: 'https://cybernetworking.vercel.app/docs/CyberNetworking_Partner_Playbook_2026.pdf',
    description: 'The official operational handbook for all registered partners: complete explanation of the ₹2,500 joining fee, 10-tier commission distribution, dual accounts provisioning, and direct selling success roadmap.',
    isFeatured: true,
    pages: [
      {
        pageNumber: 1,
        title: 'Title Page & Executive Welcome',
        content: `
# CyberNetworking Partner Playbook
### Official 2026 Operational Handbook & Direct Selling Manual
**Published by CyberNetworking Private Limited**
*Regd. Office: DLF Cyber City, Phase II, Gurugram, India*

---

Welcome to the CyberNetworking Partner Network. This manual serves as your definitive guide to operating as an authorized direct selling partner under the Consumer Protection (Direct Selling) Rules, 2021. 

By joining CyberNetworking, you have activated two high-value accounts:
1. **Account 1 (Direct Selling Partner Account):** Empowering you with a 10-tier referral network, transparent commission tracking, and direct bank settlement.
2. **Account 2 (Enterprise Cyber Defense License):** A full 1-year multi-device cybersecurity software suite protecting your critical personal and business endpoints against digital extortion and data theft.

*"Empowering India's digital economy through cutting-edge cyber protection and ethical network entrepreneurship."*
        `
      },
      {
        pageNumber: 2,
        title: 'The ₹2,500 Joining Fee & Financial Model',
        content: `
# Chapter 1: The Product & Joining Fee Economics

Every new partner joining fee is **₹2,500 + 18% GST (₹450)** = **₹2,950 Total**.
The entire ₹2,500 base amount is transparently allocated under a fixed, sustainable mathematical model:

### Statutory Commission Distribution (Total ₹1,600 Budget Across 10 Tiers):
- **Tier 1 (Direct Sponsor):** ₹500 (20.0%)
- **Tier 2:** ₹250 (10.0%)
- **Tier 3:** ₹200 (8.0%)
- **Tier 4:** ₹150 (6.0%)
- **Tier 5:** ₹100 (4.0%)
- **Tier 6:** ₹100 (4.0%)
- **Tier 7:** ₹100 (4.0%)
- **Tier 8:** ₹100 (4.0%)
- **Tier 9:** ₹50 (2.0%)
- **Tier 10:** ₹50 (2.0%)

### Company Operational & Technology Retention:
- **Base Retention:** ₹900 (Product engineering, cloud server infrastructure, Brevo OTP dispatch, and payment gateway reserves).
- **Unused Tiers:** Any levels without active upline sponsors flow automatically to the Company Reserve Fund to maintain absolute fiscal solvency.
        `
      },
      {
        pageNumber: 3,
        title: 'Dual Accounts Provisioning Architecture',
        content: `
# Chapter 2: Dual Accounts Provisioning Architecture

Unlike conventional platforms that sell abstract memberships, CyberNetworking provisions two independent, API-backed accounts immediately upon joining payment verification:

### Account 1: Partner Direct Selling MLM Account
- Unique Partner ID (e.g., mem_matru)
- Dedicated Referral Link: https://cybernetworking.vercel.app/?ref=YOUR_CODE
- Commission Wallet with automated TDS deduction tracking (Sec 194H)
- Real-time 10-Tier Downline Hierarchy Tree visualization

### Account 2: Enterprise Software License Key
- Unique 16-character alphanumeric license key (e.g., CS-PRO-XXXX-XXXX)
- 5 Endpoint Protection Seats (Windows, macOS, Android, Linux)
- Cloud Antivirus & AI Vulnerability Scanner
- 1-Year Validity with annual renewal rights
        `
      },
      {
        pageNumber: 4,
        title: 'Statutory Compliance & TDS Mandates',
        content: `
# Chapter 3: Statutory Compliance & Tax Deduction at Source (TDS)

As a legally compliant entity operating under Indian Corporate Law:

### 1. Mandatory PAN Verification (Section 194H)
- Direct selling commissions are subject to Tax Deduction at Source (TDS) under Section 194H of the Income Tax Act, 1961.
- Partners with verified PAN cards have **5.0% TDS** deducted automatically during payout disbursal.
- Partners without a verified PAN card are subject to **20.0% TDS** under Section 206AA.

### 2. Quarterly Form 16A Issuance
- All deducted TDS is remitted to the Central Government via official BSR challans.
- Partners can download authentic, digitally verified Form 16A certificates directly from the **Wallet & Payouts** section of the dashboard for seamless ITR filing.
        `
      },
      {
        pageNumber: 5,
        title: 'The 7-Day Cooling-off Guarantee',
        content: `
# Chapter 4: Consumer Protection & Cooling-Off Guarantee

Under Rule 5(1) of the Consumer Protection (Direct Selling) Rules, 2021:

1. **7-Day Escrow Buffer:** All newly earned commissions are held in a transparent "Cooling-Off Escrow" state for 7 statutory days from the order date.
2. **Right to Cancel:** Any new partner has the unconditional right to request a full refund within the 7-day period if they do not wish to continue.
3. **Automated Maturity:** Upon the completion of the 7-day period, commissions automatically mature into the "Available Balance" wallet and are eligible for instant bank payout withdrawal.
4. **Zero Joining Pyramid Ban:** CyberNetworking strictly prohibits payment purely for recruiting without a bonafide sale of the enterprise software suite.
        `
      }
    ]
  },
  {
    id: 'pdf_soc_defense_manual',
    type: 'pdf',
    title: 'Enterprise SOC Operations & Threat Hunting Field Manual',
    category: 'Technical Manual',
    pageCount: 92,
    author: 'Dr. Matru Prasad Mohanty & SOC Operations',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    url: 'https://cybernetworking.vercel.app/docs/Enterprise_SOC_Operations_Manual.pdf',
    description: 'Standard operating procedures for Security Operations Centers (SOC): SIEM correlation rules, malware sandbox triage, firewall rule configurations, and network packet capture inspection.',
    isFeatured: true,
    pages: [
      {
        pageNumber: 1,
        title: 'SOC Architecture & Ingestion Pipeline',
        content: `
# Enterprise SOC Operations & Threat Hunting Manual
### Standard Operating Procedures v4.2
**SOC Defense Operations Center — CyberNetworking**

---

### Ingestion Architecture
Modern Security Operations Centers require continuous, low-latency log collection across hybrid cloud footprints:
- **Endpoint Telemetry:** Process executions, network socket creations, registry mutations (Sysmon Event IDs 1, 3, 11, 13).
- **Network Metadata:** Zeek/Bro connection logs, DNS query logs, NetFlow/IPFIX records.
- **Authentication Logs:** Kerberos ticket requests (Event ID 4768, 4769), OAuth token grants, Azure AD Sign-in logs.

All incoming events must be normalized into the Elastic Common Schema (ECS) or Open Cybersecurity Schema Framework (OCSF) prior to indexing.
        `
      },
      {
        pageNumber: 2,
        title: 'Triage Severity Matrix & Incident Classification',
        content: `
# Chapter 2: Incident Classification & Escalation SLAs

All alerts surfaced by correlation rules must be triaged within strict time constraints:

| Severity | Target SLA | Description & Trigger Examples |
|---|---|---|
| **P1 - Critical** | 15 Minutes | Active Ransomware execution, Domain Controller compromise, Data exfiltration > 10GB. |
| **P2 - High** | 45 Minutes | Mimikatz LSASS credential dump, unauthorized privilege escalation, C2 beaconing. |
| **P3 - Medium** | 2 Hours | Brute force spikes on public SSH/RDP, disabled Windows Defender service. |
| **P4 - Low** | 8 Hours | Port scanning from external untrusted IPs, adware installations. |

### Containment Protocol
1. Isolate the affected host at the endpoint firewall level via EDR API.
2. Revoke all active Kerberos/OAuth sessions for the compromised user principal.
3. Capture volatile RAM artifacts before system shutdown.
        `
      },
      {
        pageNumber: 3,
        title: 'Threat Hunting with Sigma Rules & MITRE ATT&CK',
        content: `
# Chapter 3: Threat Hunting Methodologies

Threat hunters proactively inspect historical telemetry for stealthy adversaries who evade automated detection rules:

### Priority MITRE ATT&CK Techniques:
- **T1059.001 (Command & Scripting Interpreter: PowerShell):** Look for -EncodedCommand, -ExecutionPolicy Bypass, and memory-injected scripts.
- **T1003.001 (OS Credential Dumping: LSASS Memory):** Audit all process access handles requesting PROCESS_VM_READ against lsass.exe.
- **T1078 (Valid Accounts):** Detect geographic impossible travel anomalies and logins occurring outside established working hours.
        `
      }
    ]
  },
  {
    id: 'pdf_compliance_guidelines_2021',
    type: 'pdf',
    title: 'Consumer Protection (Direct Selling) Statutory Compliance Guidelines',
    category: 'Regulatory Compliance',
    pageCount: 34,
    author: 'Ministry Compliance & TRACES Advisory',
    thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    url: 'https://cybernetworking.vercel.app/docs/Direct_Selling_Statutory_Compliance_Guidelines.pdf',
    description: 'Official regulatory manual explaining full compliance under the Direct Selling Rules 2021, mandatory 7-day cooling-off escrow operations, Form 16A TDS quarterly reporting, and GST input reconciliation.',
    isFeatured: false,
    pages: [
      {
        pageNumber: 1,
        title: 'Regulatory Scope & Mandates',
        content: `
# Consumer Protection (Direct Selling) Statutory Guidelines
### Official Notification: G.S.R. 882(E) — Ministry of Consumer Affairs
**Compliance Document for CyberNetworking Direct Selling Partners**

---

### Statutory Definition of Direct Selling
Under Rule 2(d) of the 2021 Rules, "Direct Selling" refers to marketing, distribution, and sale of goods or provision of services through a network of sellers, other than through a permanent retail location.

### Core Legal Obligations:
1. Every direct selling entity must be incorporated under the Companies Act, 2013.
2. Must have a physical registered office in India with verifiable corporate address proof.
3. Must maintain an active website with full transparency regarding company leadership, registered address, customer care, and grievance redressal officer.
4. Prohibition of pyramid schemes or money circulation schemes disguised as direct selling networks.
        `
      },
      {
        pageNumber: 2,
        title: 'Grievance Redressal Mechanism & Timelines',
        content: `
# Chapter 2: Partner & Consumer Grievance Protocol

Every authorized partner and registered customer has access to a structured statutory complaint redressal mechanism:

- **Acknowledgment:** Any submitted ticket or support query must be formally acknowledged with a unique ticket number within **48 hours**.
- **Resolution Timeline:** All grievances must be resolved within **30 days** of receipt.
- **Cooling-Off Escrow:** Customers and new partners have an absolute right to return the software suite and receive a 100% refund within **7 days** without penalty.
- **Grievance Officer:** 
  - Dr. Matru Prasad Mohanty, Principal Director & Head of Compliance
  - Direct Email: compliance@cybernetworking.in
  - Phone: +91 63707 44656
        `
      }
    ]
  },
  {
    id: 'pdf_incident_response_cheatsheet',
    type: 'pdf',
    title: 'Cybersecurity Incident Response & Emergency Containment Handbook',
    category: 'Quick Reference',
    pageCount: 22,
    author: 'National Cyber Defense Alliance',
    thumbnail: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80',
    url: 'https://cybernetworking.vercel.app/docs/Emergency_Incident_Response_Cheatsheet.pdf',
    description: 'Pocket reference guide for identifying malicious IP addresses, DDoS mitigation, server quarantine commands, memory dump capture, and emergency containment steps during a live breach.',
    isFeatured: false,
    pages: [
      {
        pageNumber: 1,
        title: 'Initial Breach Assessment & First Responders Protocol',
        content: `
# Emergency Incident Response Cheatsheet
### Rapid Containment & First Responder Protocol v3.0

---

### Step 1: DO NOT Reboot or Power Off the Server!
Powering off the server destroys volatile RAM artifacts where rootkits, decryption keys, and memory-only payloads reside.

### Step 2: Network Isolation Commands
**Windows PowerShell (Run as Administrator):**
netsh advfirewall set allprofiles state on
netsh advfirewall firewall add rule name="EMERGENCY_ISOLATE" dir=out action=block
netsh advfirewall firewall add rule name="EMERGENCY_ISOLATE_IN" dir=in action=block

**Linux Terminal:**
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT DROP
        `
      },
      {
        pageNumber: 2,
        title: 'Evidence Preservation & Triage Commands',
        content: `
# Chapter 2: Live Volatile Evidence Gathering

Before isolating the system from local console:

### Active Network Sockets:
- Windows: netstat -ano -p tcp | findstr "ESTABLISHED"
- Linux: ss -tulpn or lsof -i -P -n

### Running Processes with Command Line Arguments:
- Windows: Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine
- Linux: ps auxwwf

### Log Capture:
Copy Windows Event Logs from C:\\Windows\\System32\\Winevt\\Logs\\Security.evtx to an external write-blocked USB storage device.
        `
      }
    ]
  }
];
