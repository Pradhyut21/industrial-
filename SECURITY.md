# Security Policy — DeadMind Industrial Intelligence Platform

## Overview
DeadMind is designed for critical heavy industry operational environments (Power, Oil & Gas, Continuous Manufacturing). Security, data isolation, role-based access control (RBAC), and intellectual property protection are foundational to the system.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

---

## Security Architecture & Threat Model

### 1. Role-Based Access Control (RBAC)
DeadMind enforces RBAC across all knowledge artifacts and Continuity Vaults:
- **Public**: Broad operational documentation (SOPs, public equipment specs, standard maintenance checklists). Accessible by Field Technicians and operators.
- **Department-Restricted**: Domain-specific troubleshooting logs, historical calibration files, and internal department shift notes.
- **Confidential**: Sensitive trade secrets, proprietary formulas, exit handover notes, and executive risk audits. Scoped strictly to Admins, Plant Heads, and authorized leads.

### 2. Dual-Mode Telephony & API Credentials Isolation
- All third-party providers (Twilio, Groq, Bhashini, Sarvam AI) are accessed via server-side isolated interfaces.
- The platform never exposes API keys or access tokens to the client browser.
- In demo mode, zero external credentials are required; deterministic, sandboxed stub providers prevent accidental outbound calls or token exhaustion.

### 3. Zero-PII & Privacy Protection
- Industrial shift logs and engineer transcripts are scrubbed of personal non-operational identifiers.
- Raw audio files from voice notes and Twilio calls are processed in-flight through STT and discarded from disk; only sanitized operational transcripts are retained with explicit consent.

### 4. Input Sanitization & Vector Injection Defense
- Document ingestion inputs (`.pptx`, `.docx`, `.xlsx`, `.eml`, `.txt`, and git logs) undergo structural validation and sanitization prior to chunking and embedding.
- Retrieval queries are filtered against schema bounds to prevent prompt injection and model hallucination through adversarial retrieval poisoning.

---

## Reporting a Vulnerability

If you discover a security vulnerability within DeadMind, please report it responsibly:

1. **Do NOT** open a public GitHub issue.
2. Email security vulnerability reports directly to the maintainers at: `security@deadmind.ai` or submit a private security advisory through GitHub.
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation (if any)

We acknowledge receipt of all valid reports within **48 hours** and provide a resolution timeline.
