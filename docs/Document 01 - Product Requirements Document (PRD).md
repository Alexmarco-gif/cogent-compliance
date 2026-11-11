# COGENT MARKETING SHIELD
## Product Requirements Document (PRD)

**Product Name:** Cogent Marketing Shield  
**Product Type:** Standalone Enterprise Regulatory & Marketing Compliance Operating System  
**Document Number:** 01  
**Document Title:** Product Requirements Document (PRD)  
**Version:** 2.0 (Greenfield Source of Truth)  
**Status:** Approved Baseline for Architecture and Implementation  
**Product Direction:** Conversational Compliance Copilot + Autonomous Campaign Analyst + Institutional System of Record  
**AI Provider:** Google Gemini API (`@google/genai` SDK — Gemini 2.5 Pro, Gemini 2.5 Flash, `text-embedding-004`)  
**Target Stack:** Next.js (App Router, TypeScript, Tailwind CSS), Supabase (PostgreSQL, `pgvector`, Supabase Auth + Composite RLS), Private S3-Compatible Object Storage (Cloudflare R2 / Supabase Private Storage), Asynchronous Worker Queue  
**Primary Market:** Nigerian Regulated Financial Institutions (Digital Lenders, Fintechs, Microfinance Banks, Payment Service Banks, Mobile Money Operators, Commercial Banks, WealthTech & Investment Firms)

---

# 1. Executive Summary

## 1.1 Product Overview

Cogent Marketing Shield is a standalone, enterprise-grade conversational compliance workspace and autonomous campaign analyst built specifically for Nigerian regulated financial institutions.

It enables compliance, legal, product, marketing, and growth teams to query Nigerian statutory requirements, enforce internal company playbooks and product fee schedules, inspect promotional campaigns across multiple media formats, remediate non-compliant claims, execute role-based institutional approvals, generate statutory pre-vetting and audit dossiers, and monitor live published campaigns for post-approval drift.

The platform unifies two complementary capabilities inside a single coherent workspace:

1. **Conversational Compliance Copilot:** An open-ended, multi-turn conversational intelligence assistant grounded in three distinct, verifiable intelligence sources:
   - **Source 1 — The Pre-Verified Statutory Vault (The "Golden 50" Corpus):** A clause-level, cryptographically hashed database of the 50 most enforced Nigerian marketing, consumer protection, data privacy, and financial promotional instruments across the Central Bank of Nigeria (CBN), Federal Competition and Consumer Protection Commission (FCCPC), Advertising Regulatory Council of Nigeria (ARCON), Nigeria Data Protection Commission (NDPC), and Securities and Exchange Commission (SEC).
   - **Source 2 — The Institutional Knowledge Base & Playbook Engine:** A tenant-isolated vault containing the institution's own internal marketing playbooks, brand guidelines, approved product interest rates and fee schedules, mandatory disclaimers, and internal standard operating procedures (SOPs).
   - **Source 3 — Real-Time Live Web & Regulatory Search (`search_live_web` & `fetch_live_url_content`):** An automated real-time web intelligence router that searches official Nigerian regulator domains and live internet sources whenever a user asks about breaking regulatory circulars, recent enforcement actions, or live promotional URLs.

2. **Autonomous Campaign Analyst:** A deterministic and AI-assisted compliance engine that activates automatically when a user introduces promotional material (pasted ad copy, flyers, PNG/JPEG/WEBP images, PDFs, DOCX files, or live campaign URLs). It extracts material claims, runs deterministic mechanical locks alongside multi-source legal reasoning, maps every flagged issue to exact statutory or internal playbook evidence, validates proposed rewrites, manages immutable campaign revisions, routes campaigns for authorized human sign-off, generates one-click statutory audit dossiers, and monitors published URLs for unauthorized post-approval changes.

## 1.2 Why Financial Institutions Adopt and Pay for Cogent (The Anti-Wrapper Moat)

Nigerian fintechs and financial institutions operate in a high-risk regulatory environment where delays in compliance sign-off slow down product launches, and a single unvetted or misleading digital promotion exposes the institution to severe statutory penalties (including ARCON pre-vetting penalties of ₦1M–₦3M+ per violation and FCCPC administrative penalties of up to ₦100M or 1% of annual turnover, alongside mandatory 2-year promotional record retention).

Generic conversational AI tools (such as ChatGPT, Claude, or raw Gemini web chat) cannot solve this problem and actually increase institutional liability because they:
- Hallucinate legal citations, invent non-existent section numbers, or rely on outdated training data.
- Have zero knowledge of an institution's actual approved product interest rates, fee structures, tenor limits, or internal brand playbooks.
- Invent unauthorized financial rates or omit mandatory CBN/FCCPC disclosures when asked to rewrite marketing copy.
- Lack multi-player institutional workflows, role-based access control (RBAC), and immutable version control between Marketing/Growth and Legal/Compliance.
- Cannot produce a verifiable, regulator-ready **ARCON ASP Pre-Vetting Bundle** or **FCCPC 2-Year Statutory Audit Dossier**.
- Cannot monitor live published landing pages for post-approval content drift.

Cogent Marketing Shield is **not an AI wrapper**. It is an **Institutional System of Record and Compliance Operating System** where conversation is the natural intake layer, deterministic backend locks enforce mechanical accuracy, and every approved campaign produces a permanent, auditable compliance shield.

## 1.3 Core Product Promise

**Cogent turns regulation and internal playbooks into immediate, auditable action.**

For every regulatory question or promotional campaign, Cogent Marketing Shield establishes:
- **What rule applies:** Exact statutory provision (from the Golden 50 Vault), internal rule (from the Institutional Playbook), or breaking update (from Live Web Search).
- **Why it applies:** Applicability reasoning tied to the institution's license type, product category, communication channel, and target audience.
- **Where the issue is:** Exact quoted text, page number, or OCR bounding-box region in the submitted campaign asset.
- **What deterministic locks triggered:** Pass/fail verification against prohibited terms, mandatory disclosures, and approved product rate/fee schedules.
- **How to fix it safely:** A pre-validated rewrite that resolves the compliance breach without inventing rates, altering product terms, or dropping required disclaimers.
- **Who approved it:** Role-based cryptographic sign-off by an authorized human reviewer tied to an immutable campaign revision.

The product is a decision-support and workflow-enforcement platform; it does not replace qualified legal counsel or grant autonomous statutory approval without human authorization.

---

# 2. Product Vision, Scope, and Non-Goals

## 2.1 Product Vision

To become the default compliance workspace and campaign clearance system of record for every fintech, digital lender, microfinance bank, payment service bank, mobile money operator, commercial bank, and investment institution in Nigeria—eliminating the multi-day bottleneck between Growth and Compliance while shielding institutions from regulatory fines.

## 2.2 Primary Product Objectives

1. **Natural Conversational Entry Point:** Allow compliance, legal, product, and marketing teams to ask standalone regulatory or internal policy questions immediately without filling out forms or creating a campaign first.
2. **Seamless Conversation-to-Campaign Transition:** Automatically detect when a user introduces promotional copy, files, or URLs in chat and transition the workspace into a structured Campaign Analysis session while preserving full conversational context.
3. **Three-Source Grounded Intelligence:** Combine the **Golden 50 Statutory Vault**, the **Tenant-Isolated Institutional Knowledge Base**, and **Real-Time Live Web Search** with strict source-class separation and visual trust badges.
4. **Deterministic + Reasoning Assessment Engine:** Pair deterministic mechanical checks (prohibited terms, numerical rate/fee matching against `campaign_products`, mandatory disclaimers) with Gemini's contextual legal reasoning.
5. **Zero-Hallucination Evidence Chain:** Enforce a 7-layer backend validation pipeline so Gemini can never invent citations, fabricate source URLs, or attribute unsubmitted text to a user.
6. **Safe Remediation & Immutable Versioning:** Provide side-by-side rewrite comparisons that are automatically reassessed before acceptance, storing every accepted change as a new immutable `campaign_revision`.
7. **Multi-Role Institutional Sign-Off:** Enforce strict separation of duties so Marketing/Growth can submit and revise campaigns, while only authorized Compliance/Legal/CCO roles can formally approve a specific campaign revision.
8. **One-Click Statutory Dossiers & Drift Monitoring:** Generate downloadable PDF compliance dossiers (formatted for ARCON ASP pre-clearance and FCCPC 2-year statutory audit retention) and monitor live published URLs against the approved revision snapshot.

## 2.3 Explicit Non-Goals

Cogent Marketing Shield is **not**:
- A generic consumer chatbot or general-purpose writing assistant.
- A generic IT/cloud infrastructure checklist tool (e.g., SOC 2 or ISO 27001 scanner).
- An autonomous legal authority that approves or publishes advertisements without human sign-off.
- A public legal blog or unverified news aggregator that mixes secondary web commentary into statutory law.

---

# 3. Target Market, User Personas, and Role-Based Permissions

## 3.1 Ideal Customer Profile (ICP) in Nigeria

1. **High-Velocity Mid-Market Financial Institutions (Primary Beachhead):**
   - FCCPC-registered Digital Lenders and Consumer Credit platforms.
   - CBN-licensed Microfinance Banks (MFBs), Payment Service Banks (PSBs), and Mobile Money Operators (MMOs).
   - SEC-regulated WealthTech, Robo-Advisory, and Digital Asset platforms.
   - Payment Gateways and Switching companies running frequent merchant/consumer promotions.
2. **Enterprise Financial Institutions:**
   - Tier-1 and Tier-2 Commercial Banks, Merchant Banks, and Holding Companies managing high-volume multi-channel marketing, influencer campaigns, and agency submissions.

## 3.2 Primary User Personas

### 1. Chief Compliance Officer (CCO) / Head of Compliance
- **Core Pain:** Overwhelmed by last-minute campaign review requests from Marketing; terrified of a ₦100M FCCPC fine or CBN sanction caused by an unvetted social post, influencer video, or rogue landing page; lacks a centralized 2-year audit trail.
- **Jobs-to-Be-Done in Cogent:** Upload and approve internal compliance playbooks; oversee high-risk campaign escalations; execute final cryptographic sign-off on campaign revisions; export statutory audit dossiers during regulatory inspections; monitor post-publication drift alerts.

### 2. General Counsel / Legal & Regulatory Affairs Officer
- **Core Pain:** Spends hours manually cross-checking ad claims against CBN circulars, FCCPC regulations, and ARCON vetting rules; repeatedly writes the same rejection emails to the Growth team.
- **Jobs-to-Be-Done in Cogent:** Query exact statutory provisions and recent live regulatory updates; inspect the evidence chain behind flagged campaign claims; review ambiguous applicability edge cases; approve or reject campaign revisions with legal conditions.

### 3. Product Manager / Marketing & Growth Lead
- **Core Pain:** Waiting 3 to 10 business days for Legal/Compliance to clear a simple flyer, SMS blast, or landing page; receiving vague rejections ("Not compliant, fix this") without actionable rewrites; losing launch momentum.
- **Jobs-to-Be-Done in Cogent:** Pre-check campaign copy, flyers, and URLs in 15 seconds before submitting to Compliance; understand exactly which word or missing disclosure triggered a flag; accept pre-validated compliant rewrites; submit clean campaigns for fast-track human approval.

### 4. Compliance Analyst
- **Core Pain:** Manually logging campaign submissions in spreadsheets, chasing Marketing for updated flyers, and compiling ARCON ASP pre-vetting packages by hand.
- **Jobs-to-Be-Done in Cogent:** Conduct first-line campaign assessments; verify OCR claim extractions; manage the Institutional Knowledge Base and approved product rate tables; prepare review packages and escalate complex findings to the CCO.

### 5. Workspace Administrator
- **Core Pain:** Managing user access, role separation, and audit visibility across departments.
- **Jobs-to-Be-Done in Cogent:** Invite team members, assign RBAC roles, configure workspace settings, and review system audit logs.

## 3.3 Locked Role-Based Access Control (RBAC) Matrix

Permissions are enforced strictly on the backend server and via PostgreSQL Row Level Security (RLS). No user interface state alone grants authority.

| Capability / Operation | Permission Key | Marketing / Growth | Compliance Analyst | Legal Counsel | CCO | Admin |
|---|---|---|---|---|---|---|
| Ask standalone regulatory & internal policy questions | `conversation.create`, `conversation.read` | Yes | Yes | Yes | Yes | Yes |
| Trigger real-time live web regulatory search | `intelligence.live_web.search` | Yes | Yes | Yes | Yes | Yes |
| Create campaigns & upload campaign assets/URLs | `campaign.create`, `asset.upload` | Yes | Yes | Yes | Yes | Yes |
| View extracted claims, findings & evidence chains | `assessment.read` | Yes | Yes | Yes | Yes | Yes |
| Request AI rewrite suggestions | `revision.propose` | Yes | Yes | Yes | Yes | Yes |
| Accept rewrites & save new campaign revisions | `revision.accept`, `revision.create` | Yes | Yes | Yes | Yes | No (unless dual-role) |
| Submit campaign revision for formal review | `campaign.submit_review` | Yes | Yes | Yes | Yes | No |
| Add formal review comments & escalate findings | `review.comment`, `review.escalate` | Comment only | Yes | Yes | Yes | No |
| Formally **Approve** or **Reject** a campaign revision | `approval.decide` | **No** | **No** (First-line review only) | **Yes** | **Yes** | **No** |
| Generate & download Statutory Compliance Dossier | `dossier.generate`, `dossier.download` | View own | Yes | Yes | Yes | Yes |
| Upload & edit Institutional Playbooks & Product Terms | `knowledge.write`, `product.write` | No (Read-only) | Draft / Propose | Yes | Yes | Yes |
| Activate / publish Institutional Rules & Disclaimers | `knowledge.publish` | **No** | **No** | **Yes** | **Yes** | **Yes** |
| Manage users, roles, and tenant settings | `tenant.admin`, `user.manage` | **No** | **No** | **No** | View | **Yes** |
| View immutable system & compliance audit logs | `audit.read` | **No** | **No** | **Yes** | **Yes** | **Yes** |

---

# 4. Core Product Experience & Anti-Wrapper Differentiation

## 4.1 Conversational-First Intake, Structured Workflow Execution

The primary entry screen of Cogent Marketing Shield is a clean, enterprise conversational workspace. Users are never forced to navigate complex nested menus or complete a 15-field form just to ask a question.

Example natural starting interactions:
- *"What are the mandatory disclosures for advertising a digital consumer loan under CBN and FCCPC rules?"*
- *"Does our internal marketing playbook allow us to use 'instant approval' or '0% interest' in an SMS campaign?"*
- *"Search the live web: did ARCON or the FCCPC release any new enforcement notice on fintech influencers this month?"*
- *"Review this flyer and caption for our November salary-advance promo."* (User attaches `promo_flyer.png`).

## 4.2 Adaptive Contextual Workspace

The interface dynamically adapts to the user's intent rather than forcing a permanent, cluttered split-screen:

1. **Standalone Regulatory / Playbook Inquiry Mode:**
   - Prioritizes the central conversation stream.
   - Displays inline, clickable **Evidence Reference Badges** showing whether each cited rule comes from the **`[Verified Statutory Vault]`**, **`[Internal Playbook Vault]`**, or **`[Live Web Intelligence]`**.
   - Clicking any citation opens a slide-over **Evidence Drawer** displaying the exact statutory clause, document version, effective date, SHA-256 document hash, and official source URL.

2. **Autonomous Campaign Analyst Mode:**
   - The moment a user pastes promotional copy, uploads a flyer/PDF/DOCX, or submits a campaign URL, Cogent recognizes the transition to campaign work, creates or associates a structured `marketing_campaign` record, and smoothly opens the **Contextual Campaign Inspector** alongside the chat.
   - The Contextual Campaign Inspector exposes structured operational tabs:
     - **Overview & Deterministic Locks:** Instant Pass/Fail badges for Prohibited Terms, Internal Product Rate/Fee Match, and Mandatory Disclosures, plus overall risk level and workflow status.
     - **Assets & OCR Provenance:** Visual preview of uploaded flyers/documents with highlighted OCR text segments and page/bounding-box provenance.
     - **Claims & Findings:** Every extracted promotional claim mapped to its specific statutory or internal playbook finding, severity, and applicability status.
     - **Remediation & Diff Viewer:** Side-by-side comparison of original text vs. validated compliant rewrite, with one-click acceptance to create an immutable `campaign_revision`.
     - **Sign-Off & Dossier:** Formal review comments, CCO/Legal approval controls bound to the exact `revision_id`, one-click PDF Dossier export, and Post-Publication Drift Monitoring configuration.

---

# 5. Functional Requirements

## 5.1 Conversational Compliance Copilot (`MS-CHAT`)

### Functional Requirements
- Provide persistent, multi-turn conversations scoped strictly to the authenticated user's `tenant_id`.
- Maintain chronological message history (`sequence_number`) across browser refreshes and sessions.
- Resolve multi-turn conversational references (e.g., *"How does that apply if we promote it via WhatsApp instead?"*).
- Assemble bounded, relevant context on the backend rather than sending unlimited raw history to Gemini.
- Stream assistant responses progressively via Server-Sent Events (SSE), emitting distinct lifecycle events for text deltas, tool executions, campaign creation, and assessment completion.
- Allow users to search, rename, reopen, and archive past conversations without deleting linked campaign or audit records.

### Acceptance Criteria
- A user can ask standalone regulatory or internal policy questions without creating a campaign record.
- Follow-up questions retain context from earlier turns and active campaigns.
- Every regulatory or internal policy assertion in chat includes an inspectable evidence reference or an explicit uncertainty qualification.

---

## 5.2 Pre-Verified Statutory Vault — The "Golden 50" Corpus (`MS-REG-VAULT`)

### Initial Regulatory Scope (The Golden 50 Standard)
Before production launch, the platform's Statutory Vault must be seeded with the **Golden 50 Nigerian Regulatory Instruments**—verified, parsed to the clause and obligation level, cryptographically hashed (`sha256`), and embedded (`VECTOR(768)`) across:
1. **Central Bank of Nigeria (CBN):** Consumer Protection Framework, Consumer Protection Regulations, Guidelines on Digital Lending / Credit, Guide to Charges by Banks and Other Financial Institutions, Microfinance Bank Guidelines, PSB & Mobile Money Guidelines, AML/CFT/CPF customer communication rules, and Cybersecurity/Fraud disclosure directives.
2. **Federal Competition and Consumer Protection Commission (FCCPC):** Federal Competition and Consumer Protection Act (FCCPA), Limited Interim Regulatory/Registration Framework and Guidelines for Digital Lending, Sales Promotion (Amended) Regulations (including digital, automated/AI, and influencer promotional rules, 2-year record retention, and penalty frameworks), and Deceptive/Unfair Marketing Guidelines.
3. **Advertising Regulatory Council of Nigeria (ARCON):** ARCON Act, Nigerian Code of Advertising Practice, Sales Promotion and Other Rights/Restrictions on Practice, ASP Pre-Vetting Guidelines for Financial Services, and Digital/Social Media/Influencer Advertising Directives.
4. **Nigeria Data Protection Commission (NDPC):** Nigeria Data Protection Act (NDPA) 2023 and General Application and Implementation Directive (GAID)—specifically provisions governing direct marketing, opt-in/opt-out consent, privacy notices, and cross-selling disclosures.
5. **Securities and Exchange Commission (SEC):** Investment and Securities Act (ISA), SEC Rules on Digital Assets / VASPs, Robo-Advisory Rules, Collective Investment Scheme promotional rules, and restrictions on guaranteed investment return claims.

### Functional Requirements
- Store hierarchical records for `regulatory_bodies`, `regulatory_instruments`, `regulatory_document_versions`, `regulatory_clauses`, `regulatory_obligations`, `applicability_rules`, and `statutory_penalties`.
- Preserve exact provenance metadata for every instrument version: official title, instrument type, official source URL, original PDF storage key, `document_hash`, `publication_date`, `effective_date`, `lifecycle_status` (`CURRENT`, `SUPERSEDED`, `DRAFT`, `FUTURE_EFFECTIVE`, `REPEALED`), and `verification_status` (`VERIFIED_OFFICIAL_SOURCE`).
- Execute Hybrid Retrieval combining `pgvector` semantic similarity and PostgreSQL Full-Text Search (FTS) via Reciprocal Rank Fusion (RRF), filtered by regulator, lifecycle status, and effective date.
- Distinguish statutory obligations (Source Class A) from explanatory FAQs (Source Class B) and secondary commentary (Source Class C).

### Acceptance Criteria
- Superseded or repealed provisions are never silently presented as active law.
- Future-effective provisions are explicitly flagged with their commencement date.
- Every retrieved statutory clause can be inspected down to its exact verbatim text, section number, page number, and source document hash.

---

## 5.3 Institutional Knowledge Base & Internal Playbook Engine (`MS-KB-PLAYBOOK`)

### Purpose
Allow each financial institution to upload, structure, version, and enforce its own internal compliance policies, brand playbooks, and product terms so Cogent acts as the institution's proprietary compliance brain.

### Supported Institutional Knowledge Categories
1. **Internal Marketing & Brand Playbooks:** Tone of voice, brand rules, social media/influencer guidelines, and internal marketing standards.
2. **Product & Pricing Truth (`campaign_products`):** Structured records of the institution's financial products, including exact interest rates, APRs, processing fees, late penalty fees, minimum/maximum tenors, and eligibility criteria.
3. **Mandatory Internal Disclaimers & Disclosures:** Exact legal footer or audio/visual disclaimer text required by the institution's legal team for specific channels and products.
4. **Approved vs. Prohibited Claims Registry:** Pre-approved marketing representations and company-specific banned words or phrases (`prohibited_terms`).
5. **Internal SOPs & Escalation Rules:** Institutional rules defining when a campaign requires CCO or General Counsel escalation.

### Functional Requirements
- Provide a dedicated **Knowledge Base & Playbooks** workspace where authorized users (`Legal`, `CCO`, `Admin`, and `Analyst` in draft mode) can upload PDF/DOCX policy documents or create structured product/rule entries.
- Store all institutional documents and rules with strict tenant isolation (`tenant_id`), version numbers, effective dates, and lifecycle statuses (`DRAFT`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`).
- Process uploaded playbook documents asynchronously: extract text, segment into chunks (`marketing_knowledge_chunks`), generate `pgvector` embeddings for conversational Q&A, and extract structured enforceable rules (`marketing_knowledge_rules`) for human confirmation before activation.
- During any campaign assessment or chat query, retrieve relevant institutional rules alongside statutory provisions while keeping their provenance strictly separated.

### Acceptance Criteria
- Internal playbook rules are badged as **`[Internal Playbook Rule]`** and are never conflated with statutory law (**`[Verified Statutory Vault]`**).
- If a marketing flyer advertises a 2% interest rate for a loan product whose `campaign_products` record specifies a 4% interest rate, Cogent deterministically flags the rate mismatch.
- Zero cross-tenant leakage: Tenant A can never search, view, or infer Tenant B's playbooks or product terms.

---

## 5.4 Real-Time Live Web & URL Intelligence (`MS-LIVE-WEB`)

### Purpose
Enable Cogent to answer questions and evaluate campaigns that require real-time, up-to-the-minute information from the live internet or official regulator websites without polluting the verified Statutory Vault.

### Functional Requirements
- **Live Regulatory & Market Web Search (`search_live_web`):**
  - Automatically invoked by the AI Orchestrator when a user asks about recent regulatory announcements, breaking circulars, recent enforcement actions, or current market events not covered by the static vault, or when the user explicitly requests a live search.
  - Executed via a backend Two-Step Search Router using Google Search grounding (`googleSearch: {}`), prioritizing official Nigerian regulatory domains (`cbn.gov.ng`, `fccpc.gov.ng`, `arcon.gov.ng`, `ndpc.gov.ng`, `sec.gov.ng`, `ndic.gov.ng`, `nass.gov.ng`) and reputable legal/financial publications.
  - Persist every live web retrieval in `live_web_retrievals` with the exact query, retrieved URLs, page titles, snippets, and retrieval timestamp.
- **Live Campaign URL Inspection (`fetch_live_url_content`):**
  - When a user submits a live landing page or promotional URL for compliance review, safely fetch, sanitize, and extract the visible text and metadata of the webpage on the backend (with strict SSRF protection, timeout limits, and content-size caps).
  - Store an immutable snapshot of the fetched webpage content as a `campaign_asset` so the assessment is tied to the exact page state at the time of review.
- **Vault Promotion Workflow:**
  - If `search_live_web` discovers a new official regulatory circular on a regulator's domain, authorized administrators can queue the discovered URL for formal verification and ingestion into the permanent Statutory Vault.

### Acceptance Criteria
- Information retrieved from the live web is explicitly badged as **`[Live Web Intelligence]`** with clickable source URLs and retrieval timestamps.
- Unverified web articles or secondary legal blogs retrieved via live search cannot silently overwrite or impersonate `VERIFIED_OFFICIAL_SOURCE` statutory provisions.

---

## 5.5 Campaign Intake & Multi-Format Asset Processing (`MS-ASSET`)

### Supported Input Formats
- Pasted promotional text (SMS, WhatsApp broadcast, social caption, email copy, radio/video script).
- Images & Flyers: `PNG`, `JPEG`, `WEBP` (up to 15 MB per file).
- Documents: `PDF`, `DOCX` (up to 25 MB per file).
- Live Promotional URLs: `HTTPS` landing pages and web promotions.

### Functional Requirements
- Upload files directly to private object storage using short-lived, server-generated presigned URLs (`POST /assets/upload-session` and `POST /assets/{asset_id}/complete`). Never pass large base64 file payloads through JSON chat endpoints.
- Validate file size, extension, and actual magic-byte MIME signature on the backend; compute and store the `sha256_hash` of every uploaded file; execute malware/security inspection before extraction.
- Run asynchronous extraction workers to parse PDF/DOCX text and perform multimodal OCR on promotional flyers and images.
- Store segment-level provenance (`asset_extraction_segments`) including page numbers, paragraph indices, bounding-box coordinates (where available), extraction method (`DIRECT_TEXT` vs `OCR`), and extraction confidence scores.
- Allow users to preview the original asset alongside extracted text and manually correct low-confidence OCR segments before or during assessment.

### Acceptance Criteria
- Original uploaded files remain immutable in private storage and are accessible only to authorized users within the same `tenant_id`.
- OCR-derived text is explicitly labeled as `OCR` so uncertain character recognition is never misrepresented as a verbatim text quote.

---

## 5.6 Autonomous Campaign Recognition & Claim Extraction (`MS-CLAIM`)

### Functional Requirements
- Automatically detect when a user message introduces promotional material and create or associate a structured `marketing_campaign` and initial `campaign_revision` (`revision_number = 1`).
- Extract discrete, material promotional claims from all submitted text and assets (`campaign_claims`), categorizing each claim into controlled types:
  - `INTEREST_RATE_OR_APR`
  - `FEE_OR_CHARGE_REPRESENTATION`
  - `GUARANTEED_APPROVAL_OR_RETURN`
  - `SPEED_OR_INSTANT_DISBURSEMENT`
  - `PROMOTIONAL_OFFER_OR_DISCOUNT`
  - `ELIGIBILITY_OR_TENOR_TERM`
  - `REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM`
  - `SECURITY_OR_DATA_PRIVACY_CLAIM`
  - `COMPARATIVE_OR_SUPERLATIVE_CLAIM`
  - `MANDATORY_DISCLOSURE_OR_DISCLAIMER`
  - `INFLUENCER_OR_TESTIMONIAL_REPRESENTATION`
- Link every extracted claim to its exact `asset_id`, `extraction_segment_id`, and verbatim `claim_text`.

### Acceptance Criteria
- Every extracted claim can be traced back to its exact location in the submitted text, PDF page, or flyer image.
- The system never fabricates or paraphrases a claim and presents it inside quotation marks as the user's original wording.

---

## 5.7 Multi-Layered Compliance Assessment Engine (`MS-ASSESS`)

### The Three-Stage Assessment Pipeline
When evaluating a campaign revision, the Autonomous Campaign Analyst executes three coordinated stages:

1. **Stage A — Deterministic Mechanical Locks (Code-Enforced):**
   - **Lock 1 (Prohibited & Restricted Terms):** Scans campaign text and OCR segments against active statutory and tenant-specific `prohibited_terms` (exact, phrase, and regex matching).
   - **Lock 2 (Product Rate & Fee Schedule Verification):** Compares extracted numerical claims (interest rates, fees, tenors) against the linked `campaign_products` record in the Institutional Knowledge Base.
   - **Lock 3 (Mandatory Disclosure Check):** Verifies whether required statutory and internal disclaimers (e.g., CBN licensing statement, T&Cs apply, risk warnings) are present in the campaign material.

2. **Stage B — Multi-Source Evidence Retrieval:**
   - Retrieves candidate statutory clauses from the **Golden 50 Vault**, internal rules from the **Institutional Knowledge Base**, and (when relevant) breaking updates via **Live Web Search**.
   - Evaluates **Applicability** based on institution license type, product category, communication channel, target audience, and effective date.

3. **Stage C — Gemini Contextual Compliance Reasoning & Finding Generation:**
   - Evaluates misleading impressions, implied guarantees, omitted material conditions, and fine-print contradictions.
   - Produces structured `compliance_findings` with severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`), evidence links (`finding_evidence`), applicability status, and actionable remediation guidance.
   - Records an immutable `assessment_evidence_snapshot` capturing the exact version and hash of every statutory clause and internal rule used at the moment of assessment.

### Acceptance Criteria
- Every material finding links to at least one validated `finding_evidence` record (`regulatory_clause_id`, `regulatory_obligation_id`, `knowledge_rule_id`, or verified `live_web_retrieval_id`).
- Findings clearly distinguish between a **Statutory Violation Risk**, an **Internal Playbook Deviation**, and an **Applicability Uncertainty Requiring Human Review**.

---

## 5.8 The 7-Layer Compliance Guardrail Architecture (`MS-GUARD`)

To guarantee that Cogent never behaves like an unverified AI wrapper, every assessment output must pass seven independent backend validation layers before being persisted or displayed:

- **Layer 1 — Source Integrity:** Confirms the cited regulatory instrument or internal playbook exists in the database, is verified, and has a valid document hash.
- **Layer 2 — Temporal & Version Integrity:** Confirms the cited document version is `CURRENT` as of the assessment date and not `SUPERSEDED`, `REPEALED`, or `DRAFT`.
- **Layer 3 — Provision & Verbatim Quote Integrity:** Confirms the cited clause ID belongs to the instrument and the provision text matches the stored record.
- **Layer 4 — Claim Provenance Integrity:** Confirms the quoted campaign text in the finding actually exists in the user's submitted `campaign_revisions` or `asset_extraction_segments`.
- **Layer 5 — Relevance & Applicability Integrity:** Confirms that semantic similarity is not treated as automatic legal applicability; checks institution type, product, and channel conditions, flagging missing context as `APPLICABILITY_UNCERTAIN`.
- **Layer 6 — Rewrite Integrity:** Automatically re-runs deterministic locks and compliance checks on any proposed rewrite to ensure it resolves the original finding without inventing financial rates, changing product terms, or deleting mandatory disclosures.
- **Layer 7 — Human Approval Integrity:** Enforces that AI recommendations never alter `APPROVED` status; binds human approval strictly to a single immutable `revision_id` and automatically invalidates approval if campaign content changes materially.

---

## 5.9 Controlled Rewrite, Remediation & Immutable Versioning (`MS-REWRITE`)

### Functional Requirements
- Allow users to request a compliant rewrite for any individual finding or for the entire campaign copy (`POST /findings/{finding_id}/rewrite-suggestions`).
- Constrain rewrite generation using the institution's `campaign_products` terms and mandatory disclosures so Gemini never invents interest rates, fees, tenors, or unapproved product promises.
- Run **Layer 6 Rewrite Validation** on the proposed wording and display a side-by-side visual diff showing removed text, added text, addressed findings, and validation status.
- Require explicit user action (`ACCEPT`, `REJECT`, or manual edit). Accepting a rewrite creates a new immutable `campaign_revisions` record (`revision_number = N + 1`) linked to `parent_revision_id` and triggers a full reassessment of the new revision.

### Acceptance Criteria
- Original campaign submissions (`revision_number = 1`) and all prior revisions are never overwritten.
- A campaign revision cannot be marked ready for approval until its latest revision has completed reassessment.

---

## 5.10 Human Review, Approval Workflow & Statutory Dossiers (`MS-APPROVAL` & `MS-DOSSIER`)

### Canonical Campaign Lifecycle States
All backend services, database constraints, API contracts, and UI badges must enforce this exact 11-state lifecycle:
1. `DRAFT` — Campaign created; assets or copy being assembled.
2. `SUBMITTED` — Submitted by user for compliance assessment.
3. `PROCESSING` — Asset extraction, OCR, or claim extraction running.
4. `ASSESSMENT_IN_PROGRESS` — Deterministic locks, retrieval, and compliance reasoning executing.
5. `FINDINGS_AVAILABLE` — Assessment complete; findings ready for inspection.
6. `REVISION_REQUIRED` — Material compliance issues identified requiring remediation.
7. `RESUBMITTED` — New `campaign_revision` created and queued for reassessment.
8. `UNDER_REVIEW` — Submitted to authorized Compliance/Legal reviewer for formal human sign-off.
9. `APPROVED` — Formally approved by an authorized reviewer (`Legal` or `CCO`) for a specific immutable `revision_id`.
10. `REJECTED` — Formally rejected by an authorized reviewer with recorded reasons.
11. `ARCHIVED` — Campaign closed and retained in immutable historical archive.

### Statutory Compliance & Pre-Vetting Dossier (`MS-DOSSIER`)
- With one click (`POST /campaigns/{campaign_id}/dossiers`), generate a structured, downloadable **PDF Compliance & Pre-Vetting Dossier** designed to satisfy **FCCPC Regulation 32 (2-year mandatory promotional record retention)** and **ARCON ASP pre-vetting documentation preparation**.
- The dossier contains:
  - Campaign metadata, channel, and product context.
  - Original submitted asset previews and SHA-256 file hashes.
  - Extracted claims and deterministic lock results.
  - Complete list of findings, exact statutory clauses/versions consulted (`assessment_evidence_snapshots`), and internal playbook rules verified.
  - Full revision history and side-by-side remediation diffs.
  - Formal human review comments and the cryptographic approval record (`approved_by`, role, timestamp, and exact `approved_revision_id`).
  - Explicit disclaimer distinguishing Cogent's internal pre-clearance audit record from an official regulator-issued certificate.

### Post-Publication Drift Monitoring (`MS-DRIFT`)
- For approved campaigns linked to a live promotional URL, authorized users can enable a **Drift Monitor** (`campaign_drift_monitors`).
- Background workers periodically fetch the live URL, compare its visible claims and disclosures against the `approved_revision_id` snapshot, and flag `DRIFT_DETECTED` if unauthorized post-approval edits occur—alerting the CCO and requiring reassessment.

---

# 6. End-to-End User Journeys

## 6.1 Journey A — Standalone Regulatory & Live Web Inquiry
1. A Legal Counsel opens Cogent Marketing Shield and types: *"What are the FCCPC rules on running a cashback promo for our mobile money app, and have there been any new CBN circulars on this recently?"*
2. Cogent queries the **Golden 50 Statutory Vault** (retrieving the FCCPC Sales Promotion Regulations and CBN Consumer Protection provisions), queries the **Institutional Knowledge Base** (retrieving the company's internal promo policy), and executes **`search_live_web`** to check for recent CBN/FCCPC circulars.
3. Cogent streams a structured answer with inline badges: **`[Verified Statutory Vault]`**, **`[Internal Playbook Rule]`**, and **`[Live Web Intelligence]`**.
4. The user clicks a citation badge to inspect the exact verbatim clause in the slide-over Evidence Drawer. No campaign object is created.

## 6.2 Journey B — Flyer Upload & Autonomous Campaign Assessment
1. A Marketing Manager starts a chat, attaches a promotional flyer (`november_loan_flyer.png`), and types: *"Check this flyer for our QuickCash loan promo on Instagram."*
2. Cogent uploads the file to private storage via presigned URL, hashes it, creates a `marketing_campaign` (`revision_number = 1`), and slides open the **Contextual Campaign Inspector**.
3. The background worker runs OCR, extracts 4 claims (including *"0% fees!"* and *"Instant approval in 30 seconds Guaranteed!"*), and runs the 3 Deterministic Locks + Multi-Source Assessment.
4. Within seconds, the Inspector displays:
   - **Deterministic Lock Failure:** Product Rate/Fee Mismatch (`QuickCash` has a 1.5% processing fee in `campaign_products`, contradicting *"0% fees!"*).
   - **High-Severity Statutory Finding:** Unsubstantiated guarantee (*"Guaranteed!"*) and missing mandatory CBN licensing & T&C disclosure under CBN Consumer Protection Framework and ARCON Code.

## 6.3 Journey C — Controlled Rewrite, Diff Inspection & Reassessment
1. The Marketing Manager clicks **"Generate Compliant Rewrite"** on the flagged findings.
2. Cogent generates a revised caption and flyer text replacement that incorporates the actual 1.5% processing fee from `campaign_products`, removes the unverified guarantee, and appends the institution's mandatory CBN/NDIC footer disclosure.
3. **Layer 6 Rewrite Validation** runs automatically and confirms `ORIGINAL_ISSUE_ADDRESSED` and `NO_NEW_ISSUES_DETECTED`.
4. The Marketing Manager reviews the side-by-side diff, clicks **"Accept & Save Revision"**, creating `revision_number = 2`, which passes reassessment and moves to `FINDINGS_AVAILABLE` (0 open critical/high findings).
5. The Marketing Manager clicks **"Submit for Compliance Sign-Off"**, transitioning the campaign to `UNDER_REVIEW`.

## 6.4 Journey D — CCO Sign-Off, Dossier Export & Drift Watch
1. The Chief Compliance Officer (CCO) opens the campaign in `UNDER_REVIEW`, inspects the original flyer, the OCR claims, the statutory evidence snapshot, and the diff between Revision 1 and Revision 2.
2. The CCO clicks **"Approve Revision #2"**, enters an approval note, and confirms inside the modal.
3. The backend verifies the CCO's `approval.decide` permission, records an immutable `campaign_approvals` record bound to `revision_id = 2`, and transitions the campaign to `APPROVED`.
4. The CCO clicks **"Generate Statutory Dossier (PDF)"** to archive the 2-year FCCPC/ARCON pre-vetting bundle and enables the **Post-Publication Drift Monitor** on the campaign's landing page URL.

---

# 7. Non-Functional Requirements

## 7.1 Security & Multi-Tenant Isolation
- **Strict Server-Derived Tenancy:** Every tenant-owned table includes `tenant_id UUID NOT NULL` derived exclusively from the authenticated server session (`tenant_memberships`). Composite unique constraints (`UNIQUE (tenant_id, id)`) and composite foreign keys prevent any cross-tenant record linking.
- **Untrusted Input Isolation:** Uploaded PDFs, images, DOCX files, and fetched live URLs are wrapped in strict untrusted-data delimiters so embedded prompt-injection text can never override system instructions or execute tools.
- **NDPA 2023 Alignment:** Minimize personal data in prompts, encrypt all data in transit (TLS 1.3) and at rest (AES-256), and enforce server-only secret management.

## 7.2 Performance & Reliability Targets
| Operation | Target SLA |
|---|---|
| Initial chat acknowledgement & SSE stream open | `< 1.5 seconds` |
| Time to first streamed assistant token | `< 2.5 seconds` |
| Standalone statutory / playbook Q&A response | `< 8 seconds` |
| Live web grounded regulatory search (`search_live_web`) | `< 10 seconds` |
| Text-only campaign compliance assessment | `< 12 seconds` |
| Flyer OCR / multi-page PDF campaign assessment | Asynchronous progress states (`< 25 seconds` typical) |
| Statutory PDF Dossier generation | `< 10 seconds` |

## 7.3 Auditability & Observability
- Every state-changing user action, AI model run (`ai_model_runs`), tool execution (`ai_tool_calls`), evidence snapshot, revision, and approval decision is logged with a cryptographic state hash chain in `marketing_audit_events`.
- Telemetry tracks token usage, latency, retrieval hit rates, and guardrail rejection rates without logging raw confidential campaign payloads into plain-text application logs.

---

# 8. Failure States and Required Fail-Closed Behaviour

| Failure Scenario | Required System Behaviour |
|---|---|
| No matching provision in Statutory Vault or Playbook | Explicitly state `INSUFFICIENT_EVIDENCE`; offer to run `search_live_web` or escalate for human review. Never invent a citation. |
| Gemini hallucinates an unknown `clause_id` or URL | Backend Layer 1/3 Guardrail rejects the citation before output; strips unverified reference and logs validation failure. |
| Retrieved statutory instrument is `SUPERSEDED` | Block silent use as active authority; display supersession warning and link to current instrument version. |
| Missing product or license context for applicability | Label finding as `APPLICABILITY_UNCERTAIN` and prompt user for the missing product/channel detail. |
| Low-confidence OCR on uploaded flyer | Flag extracted claim with `EXTRACTION_UNCERTAIN` badge and allow user to inspect/edit extracted text. |
| Proposed rewrite invents a rate or drops a disclosure | Layer 6 Rewrite Validator blocks compliant status, flags `NEW_ISSUES_DETECTED`, and explains the discrepancy. |
| Unauthorized user attempts to approve a campaign | Backend returns `403 FORBIDDEN` (`APPROVAL_NOT_PERMITTED`) and logs security audit event. |
| Approved campaign copy or asset is modified | Automatically invalidate carry-over approval; create a new revision and transition status to `RESUBMITTED` / reassessment required. |
| Live URL changes after campaign approval | Drift Watcher flags `DRIFT_DETECTED`, records diff snapshot, and alerts CCO/Legal reviewers. |

---

# 9. Locked Product & Architectural Decisions

Unlike exploratory drafts, the following decisions are **locked** across all 9 documents of this Source of Truth:

1. **Greenfield Standalone Architecture:** Built from scratch as a clean modular monolith with zero legacy tables or deprecated scanner routes.
2. **Three-Source Intelligence Standard:** Every workspace instance combines (1) The **Golden 50 Statutory Vault**, (2) The **Tenant-Isolated Institutional Knowledge Base & Playbooks**, and (3) **Real-Time Live Web & URL Intelligence**.
3. **Approval Authority:** In the initial release, only `Legal Counsel` and `CCO` roles hold the `approval.decide` permission by default. `Marketing / Growth` and `Compliance Analysts` cannot self-approve campaigns.
4. **Campaign Creation Modes:** Users can initiate campaigns naturally through conversation (by pasting copy, uploading files, or sharing a URL) **or** click **"New Campaign"** in the Campaigns view, which opens a dedicated campaign-bound conversation thread.
5. **Supported File Limits:** `PNG`, `JPEG`, `WEBP` (max 15 MB); `PDF`, `DOCX` (max 25 MB); and `HTTPS` campaign URLs (fetched and snapshotted server-side with user confirmation of extracted content).
6. **Statutory Audit Retention:** Campaign assessments, evidence snapshots, revisions, approvals, and generated PDF dossiers are retained for a minimum of **5 years** (exceeding the FCCPC 2-year minimum mandate) under `ON DELETE RESTRICT` database protection.

---

# 10. Master Documentation Suite Index (The 9-Document Source of Truth)

This PRD (**Document 01**) governs the subsequent 8 technical and execution specifications:

- **Document 01:** `01_PRD.md` — Product Requirements Document *(This Document)*
- **Document 02:** `02_Target_System_Architecture.md` — Target System Architecture
- **Document 03:** `03_Database_and_Data_Model.md` — Database and Data Model Specification
- **Document 04:** `04_API_and_Gemini_Tool_Contracts.md` — API and Gemini Tool Contracts
- **Document 05:** `05_Regulatory_Evidence_and_Guardrails.md` — Regulatory Evidence and Compliance Guardrails Specification
- **Document 06:** `06_Frontend_Experience_Specification.md` — Frontend Experience and Interaction Specification
- **Document 07:** `07_Security_and_Governance.md` — Security, Tenancy and Governance Specification
- **Document 08:** `08_Implementation_Roadmap_and_Execution.md` — Greenfield Implementation Roadmap and Antigravity Execution Plan
- **Document 09:** `09_Testing_and_Production_Readiness.md` — Testing, Golden Benchmark and Production Readiness Plan

**End of Document 01 — Product Requirements Document (PRD).**