# Cogent Product & Codebase Analysis

**Inspected Codebase:** `/home/antigravity/Alexmarco-gif/cogent-compliance` (`package.json` v2.0.0)  
**Purpose:** Establish exact ground truth of what Cogent actually does in production code today so the marketing website communicates real, verifiable capabilities without inventing features.

---

## 1. Current Public-Facing Gap (Why This Project Exists)

An inspection of `src/middleware.ts` and `src/app/page.tsx` reveals a critical commercial gap:
- **`/` (`src/app/page.tsx`) is not a marketing page.** Unauthenticated visitors landing on `/` are immediately intercepted by Clerk middleware (`auth.protect`) and redirected to `/sign-in` (`src/middleware.ts:43-45`).
- **`/pricing` (`src/app/pricing/page.tsx`) is the only public product page**, and its header links back to `/chat` ("Workspace") and `/sign-in`.
- **Result:** Prospective Chief Compliance Officers, General Counsel, Fintech CEOs, or regulators clicking `cogent` links have zero public storefront explaining the platform, showing how it works, establishing statutory credibility, or letting them explore solutions before hitting a login wall.

---

## 2. Verified Technology & Architecture Stack

| Layer | Verified Implementation |
|---|---|
| **Framework** | Next.js `15.5.29` (App Router, TypeScript strict), React `19.0.0` |
| **Styling & Icons** | Tailwind CSS `3.4.17`, `lucide-react` `0.475.0`, `Instrument Serif` + `Inter` + `JetBrains Mono` |
| **Authentication & Tenancy** | Clerk Organizations (`@clerk/nextjs` `7.9.25`) + Supabase Composite RLS + 5-role, 22-permission RBAC matrix |
| **AI & Retrieval** | Google Gemini (`@google/genai` `3.1.0`), `pgvector` + PostgreSQL FTS Reciprocal Rank Fusion (`search_regulatory_clauses_rrf`), 23 structured Gemini tools (`statutory-tools.ts`) |
| **Storage & Async Jobs** | Cloudflare R2 private presigned storage (`r2.storage.ts` with magic-byte + SHA-256 verification), Inngest durable workflows (`inngest.functions.ts`), Resend email alerts |
| **Billing** | Dual-currency USD display + live FX NGN settlement via Paystack (`paystack.service.ts`) |

---

## 3. Verified Core Product Capabilities (Zero-Invention Fact Sheet)

Every claim on the marketing website must map directly to one of these implemented modules:

### 3.1 Three-Source Grounded Intelligence (`src/modules/regulatory-vault/`, `knowledge-base/`, `live-web-intelligence/`)
1. **Verified Statutory Vault (Golden 50 Corpus):** Seeded Nigerian regulatory instruments across **5 regulators** (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`) with `141` official PDF source files on disk (`94` CBN, `17` FCCPC, `15` SEC, `11` ARCON, `4` NDPC), clause-level references, lifecycle status (`CURRENT`, `SUPERSEDED`, `FUTURE_EFFECTIVE`, `REPEALED`), and SHA-256 document hashes.
2. **Institutional Knowledge Base & Product Truth (`/knowledge-base`):** Tenant-isolated upload of internal marketing playbooks (`PlaybookUploader`), structured product interest rates/fees/tenors (`ProductRateEditor` -> `campaign_products`), and activatable internal compliance rules (`RuleActivationTable`).
3. **Live Web & Regulatory Intelligence (`web-search.router.ts`):** Two-step Gemini Google Search grounding prioritizing `.gov.ng` domains (`cbn.gov.ng`, `fccpc.gov.ng`, `arcon.gov.ng`, `ndpc.gov.ng`, `sec.gov.ng`) and live promotional URL fetching, stored separately as `LIVE_WEB_INTELLIGENCE`.

### 3.2 Deterministic Compliance & Forensic Engines (`src/modules/compliance-assessment/`, `asset-processing/`)
- **3 Deterministic Mechanical Locks (`mechanical-locks.ts`):** Pure TypeScript + PostgreSQL evaluation before and after AI reasoning:
  - *Lock 1:* Statutory & internal prohibited/deceptive terms (`"100% risk-free"`, `"guaranteed returns"`, `"no credit check ever"`, etc.).
  - *Lock 2:* Numerical rate, fee, and tenor matching against the tenant's active `campaign_products` schedule.
  - *Lock 3:* Mandatory disclosures & disclaimers verification.
- **Deterministic APR / IRR & Drip-Pricing Calculator (`apr-calculator.service.ts`):** Computes exact `net_disbursed_ngn`, `total_repayment_ngn`, `total_cost_of_credit_ngn`, `effective_nominal_apr`, `effective_net_disbursed_apr`, and compounded IRR; flags drip pricing and `<60-day` loan tenor Google Play Store policy violations.
- **Flyer Visual Forensics (`visual-forensics.service.ts`):** Extracts OCR segments with normalized bounding boxes from PNG/JPEG/WEBP flyers and PDFs; measures headline-to-disclaimer pixel height ratio (`< 0.12` / buried fine print), checks for `ARCON/ASP` pre-vetting certificate IDs, NDIC deposit cap qualifiers, and AISOP talent cues.
- **App Store Listing Auditor (`app-store-auditor.service.ts`):** Checks Google Play Personal Loan Policy & FCCPC DEON rules (`<60-day` tenor ban, missing min/max repayment period, missing max APR, predatory recovery/contact-scraping flags, missing 24-hour grievance channel).
- **License Scope Boundary Matrix (`license-scope.service.ts`):** Enforces Nigerian regulatory license boundaries across 10 license tiers (`DMB_COMMERCIAL_BANK`, `MFB_NATIONAL`, `MFB_STATE`, `MFB_UNIT`, `PSB_PAYMENT_SERVICE_BANK`, `MMO_MOBILE_MONEY`, `PSSB_PAYMENT_SOLUTION`, `FCCPC_DIGITAL_LENDER`, `SEC_CAPITAL_MARKET_OPERATOR`, `FINTECH_GENERAL`).
- **CBN Key Facts Statement (KFS) & Channel Kit Generator (`kfs-generator.service.ts`):** Generates deterministic CBN Consumer Protection Framework Annex 1 KFS tables, 160-char compliant SMS copy, social flyer copy, and ARCON ASP substantiation memos.

### 3.3 Autonomous Analyst Workbench & Human-in-the-Loop Governance (`src/app/chat/`, `src/components/campaign/`, `src/modules/dossier/`)
- **Conversational-First Intake -> Structured Studio (`chat/page.tsx`, `ContextualCampaignInspector.tsx`, `ArtifactCanvasDrawer.tsx`):**
  - Users can ask statutory/playbook questions directly or drop ad copy, flyers, PDFs, DOCX files, or URLs.
  - Outputs structured `PASS` / `CONDITIONAL` / `BLOCK` Pre-Flight Gates, `What You Missed -> What It Costs You -> One-Click Fix` blind-spot cards, clickable inline citations opening the `EvidenceDrawer`, and side-by-side compliant rewrite diffs validated by Layer-6 self-correction.
- **Multi-Role Separation of Duties & Immutable Revisions:** Marketing/Growth can draft and propose revisions; only authorized `LEGAL_COUNSEL` or `CHIEF_COMPLIANCE_OFFICER` roles can formally approve or reject a specific `campaign_revision` (`approval.decide`).
- **One-Click Statutory PDF Dossier (`statutory-dossier.service.ts`):** Generates multi-page tamper-evident PDF dossiers (for ARCON ASP pre-vetting & FCCPC Reg. 32 2-year preservation) stored in R2 and linked to the SHA-256 hash-chained `marketing_audit_events` ledger (`audit.service.ts`). Evaluation-tier exports carry a preview watermark until upgraded.

### 3.4 Zero-Prompt Background Sentinels (`src/modules/drift-monitor/`, `src/modules/jobs/inngest.functions.ts`)
- **Continuous URL & App Store Drift Monitors (`/drift-monitors`):** Scheduled background checks on `LANDING_PAGE`, `TERMS_PAGE`, `PRICING_PAGE`, and `APP_STORE_LISTING` URLs against approved baselines; spawns incident threads in `/chat` and sends CCO email alerts via Resend on drift.
- **Regulatory Ripple Watcher (`regulatory-ripple.service.ts`):** Monitors official `.gov.ng` circulars and cross-references new directives against active campaigns and product rate cards.

### 3.5 Commercial & Onboarding Funnel (`/onboarding`, `/pricing`, `/settings/billing`)
- **60-Second 3-Step Onboarding (`/onboarding`):** Step 1 (Institution Scope + Role) -> Step 2 (Seed Product Truth Rate Card) -> Step 3 (Live Sandbox Audit).
- **4-Tier Pricing (`src/app/pricing/page.tsx` & `Document 11`):**
  - **Evaluation Pilot:** `$0` / 7 days (3 campaign reviews, 2 seats, 10 rewrites, 1 product schedule, watermarked preview PDF).
  - **Growth (Starter):** `$149/mo` (`$119/mo` annual, save 20%) — 25 reviews/mo, 3 seats, unlimited rewrites, 5 product schedules, unwatermarked PDF dossiers, 90-day retention.
  - **Scale (Pro — Recommended):** `$449/mo` (`$359/mo` annual) — Unlimited reviews, 10 seats, 15 live URL drift monitors, CCO sign-off workflow, signed PDF dossiers, 2-year FCCPC retention.
  - **Enterprise:** `$1,499/mo` (`$1,199/mo` annual) — Unlimited seats, reviews, & drift monitors, custom policy libraries, custom branded dossiers, 7-year BOFIA retention, dedicated support.

---

## 4. Target Buyer Personas & Primary Objections to Address on the Marketing Site

| Persona | Primary Fear / Trigger | What Convinces Them in <30 Seconds |
|---|---|---|
| **Chief Compliance Officer (CCO)** | Rogue campaign triggers ₦100M FCCPC fine, Play Store ban, or CBN sanction without audit trail | Deterministic Locks + CCO dual-control sign-off + 2-year / 7-year tamper-evident PDF Dossier |
| **General Counsel / Legal** | Hallucinated AI citations + repetitive manual ad reviews | Verbatim clause citations from CBN/FCCPC/ARCON/NDPC/SEC with SHA-256 hashes & effective dates |
| **Growth / Product Lead** | 5–10 day legal review bottleneck killing campaign launches | 15-second pre-flight check + `Problem -> Risk -> Fix` cards + pre-validated compliant rewrites |
| **Digital Lender / MFB / PSB Executive** | Hidden drip-pricing APR traps, `<60d` Play Store delisting, cross-license violations | Deterministic APR/IRR math, App Store Policy auditor, and CBN/BOFIA license-boundary matrix |
