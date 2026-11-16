# COGENT MARKETING SHIELD
## Autonomous Nigerian Compliance Analyst — Architecture & Execution Plan

**Document Number:** 13  
**Document Title:** Autonomous Compliance Analyst, Silent Blind-Spot Detection & Zero-Prompt Workflows  
**Version:** 1.0  
**Status:** Approved Blueprint (Pre-Implementation)  
**Target Codebase:** `src/modules/ai-orchestration/`, `src/modules/conversations/`, `src/modules/compliance-assessment/`, `src/modules/drift-monitor/`, `src/modules/jobs/`, `src/components/chat/`

---

## 1. Executive Thesis: From RAG Q&A Wrapper to Autonomous Compliance Analyst

An autonomous, intelligent AI differs from a basic "AI wrapper" because it does not merely retrieve text and generate passive prose. It **plans**, **executes deterministic tools**, **remembers institutional context**, **self-corrects**, and **solves problems the user did not even know existed** until the compliance goal is completely resolved.

| Dimension | Basic Chatbot ("AI Wrapper") | Autonomous Nigerian Compliance Analyst (Target) |
|---|---|---|
| **Core Function** | Generates text responses one prompt at a time | Plans multi-step compliance workflows and executes tools autonomously |
| **Action Ability** | Talks about what you *should* do | Computes true IRR/APR, crawls live URLs, inspects flyer geometry, creates revisions, and compiles PDF dossiers |
| **Blind-Spot Detection** | Answers only what the user explicitly asks | Silently cross-checks Product Rate Cards, Playbooks, License Tier, ARCON ASP rules, and App Store policies on every turn |
| **Memory** | Forgets context once the chat ends | Remembers tenant license scope, product rate cards, and past CCO rejection/approval precedents across threads |
| **Problem Solving** | Gives a single wall of text and stops | Self-corrects drafts against Deterministic Locks 1–3 before output and provides one-click resolution buttons |
| **Initiative** | Waits for exact, step-by-step prompts | Runs Zero-Prompt background sentinels (24h URL Drift, Regulatory Ripple Alerts, 2-Year Audit Readiness) |

### Core Architectural Mandate
> **Solve the user's hidden risks before a regulator does.**  
> Every response and background workflow must move beyond generic advice to uncover silent blind spots that cause **FCCPC delisting, Google Play Store takedowns, NIBSS/payment gateway disconnection, ARCON sanctions, or CBN administrative fines**.

---

## 2. Current Codebase Gap Audit

Cogent already has strong domain foundations (35 PostgreSQL tables, Golden 50 Statutory Vault, `campaign_products`, `mechanical-locks.ts`, `guardrails.validator.ts`, `drift.service.ts`, `statutory-dossier.service.ts`, and Inngest workers). However, in the live conversational experience, those capabilities are disconnected from an autonomous agent loop:

1. **Incomplete Tool Registry (11 of 17+ tools exposed):** `src/modules/ai-orchestration/tools/statutory-tools.ts` exposes search and read tools, while core campaign/execution tools (`get_campaign_context`, `get_campaign_asset_content`, `extract_campaign_claims`, `run_deterministic_compliance_locks`, `assess_campaign_compliance`, `get_compliance_findings`) are missing from `STATUTORY_TOOL_DECLARATIONS`.
2. **Manual Context Dependency:** In `src/modules/conversations/copilot.orchestrator.ts`, Deterministic Locks 1–3 only run if the user manually picks a `referencedProductId` in the dropdown. `src/app/chat/page.tsx` does not forward uploaded `attachment_asset_ids` or pasted `campaign_urls` into the streaming agent loop.
3. **No Deterministic Financial Math Engine:** LLMs estimate rates poorly. Cogent lacks a strict TypeScript APR/IRR & drip-pricing calculator to expose hidden upfront fees and short-tenor traps.
4. **Unused Visual Bounding-Box Forensics:** `src/modules/asset-processing/asset-extractor.service.ts` extracts normalized `0–1000` bounding boxes from flyers via Gemini Vision, but never computes headline-vs-disclaimer typography ratios or checks for ARCON ASP certificate numbers.
5. **Unstructured Markdown Walls:** `src/components/chat/AdaptiveMessageRenderer.tsx` renders plain markdown and citation chips—it does not render interactive **Pre-Flight Gate (`PASS` / `CONDITIONAL` / `BLOCK`)** cards, **Problem → Risk → Fix** cards, **Key Facts Statement (KFS)** tables, or **Human-in-the-Loop (HITL)** action buttons.
6. **Passive Background Jobs:** `src/modules/jobs/inngest.functions.ts` has a basic 6-hour drift cron, but lacks deep URL/Play Store compliance re-audits, automatic incident thread alerts, and a **Regulatory Ripple Watcher** for new CBN/FCCPC/ARCON circulars.

---

## 3. Core Behavioral Pillars

### 3.1 Pillar 1: Silent Blind-Spot Detection (Cross-Check Everything Automatically)
Whenever a user submits a prompt, flyer, copy snippet, or URL—even if they only ask *"Does this copy sound good?"*—Cogent must silently run background cross-checks against the tenant's workspace truth:

1. **Catching the "Marketing vs. App" Mismatch:**
   - If a flyer states *"Get ₦50,000 in 5 minutes at 5% monthly"*, Cogent automatically loads the matching `campaign_products` rate card, detects a ₦2,500 upfront processing fee and 15-day tenor, computes the **true annualized APR / IRR**, and warns:
     > *"Your flyer implies 60% APR, but your active rate card charges 182%+ effective APR. Publishing this violates FCCPA Section 115 and triggers FCCPC delisting."*
2. **Spotting Missing Pre-Conditions:**
   - If a user drafts an Instagram, X, radio, or influencer ad for a financial product, Cogent automatically flags missing **ARCON ASP Pre-Vetting Certificate IDs**, missing **NDIC coverage caps** (`₦5,000,000` DMB / `₦2,000,000` MFB), or **ARCON AISOP foreign talent restrictions** even when the user never asked about ARCON.
3. **Detecting Hidden "Drip Pricing" & App Store Traps:**
   - When scanning a landing page or app listing, Cogent checks for upfront fee deductions from disbursed principal, loans with repayment periods **under 60 days** (which trigger immediate Google Play Store removal), abusive recovery/contact-scraping threats (FCCPC DEON Regulations), missing **24-hour complaint resolution channels**, and **pre-ticked NDPC GAID 2025 consent boxes**.
4. **License-Scope Boundary Enforcement:**
   - Cross-checks the institution's onboarding license tier (e.g., *PSB, MMO, Tier-1 MFB, FCCPC Digital Lender, SEC Crowdfunding*) against product claims—blocking unauthorized cross-license marketing (e.g., a PSB/MMO advertising unbacked credit).

### 3.2 Pillar 2: The Mandatory "Analyst Output" Formula (`Problem → Risk → Fix`)
Every compliance analysis delivered in the UI or background alert must follow a strict 3-part actionable structure rather than generic prose:

1. **What You Missed (The Blind Spot):** The exact hidden fee mismatch, missing pre-condition, font-ratio violation, or statutory breach discovered across the asset, URL, and internal rate card.
2. **What It Costs You (The Consequence):** The concrete Nigerian regulatory and commercial penalty—e.g., *Google Play Store takedown*, *NIBSS/Paystack/Flutterwave gateway disconnection*, *FCCPC administrative penalty (up to 10% annual turnover / ₦10M+)*, *ARCON ASP daily violation fines*, or *director disqualification*.
3. **One-Click Resolution (The Done-For-You Fix):**
   - Exact, Lock-verified rewritten copy ready to publish.
   - Auto-generated **CBN Key Facts Statement (KFS)** table derived deterministically from `campaign_products`.
   - Inline interactive buttons: **`Apply Compliant Rewrite`**, **`Generate ARCON ASP Memo`**, and **`Approve & Seal 2-Year FCCPC Dossier`**.

### 3.3 Pillar 3: Zero-Prompt Workflows (Proactive Value)
Cogent works continuously even when no user is actively chatting:

1. **Continuous URL & App Store Sentinel:**
   - Scheduled background agents inspect monitored landing pages, T&C URLs, and Play Store / App Store listings.
   - When content changes (e.g., a marketing or web team update removes a KFS link, alters a fee, or drops a CBN license footer), Cogent immediately runs a full deterministic + AI audit, computes a side-by-side redline diff, sends an urgent CCO alert, and opens an incident thread in `/chat`:
     > *"Your web team updated the pricing page 2 hours ago and removed the Key Facts Statement link. Fix this now to stay compliant."*
2. **Regulatory Ripple Alerts (Reverse Drift Detection):**
   - A daily background monitor searches official Nigerian regulator channels (`.gov.ng` via Two-Step `search_live_web`) for newly issued CBN, FCCPC, ARCON, NDPC, and SEC circulars.
   - Instead of sending a generic news digest, Cogent **cross-references new circulars against all active `APPROVED` campaigns and `campaign_products` rate cards**, flagging exact impacted products and required copy updates.
3. **Automated 2-Year Audit Readiness (FCCPC Reg. 32 Preservation):**
   - Every audited flyer, URL snapshot, rate calculation, finding, and human decision is automatically SHA-256 hashed, timestamped, and linked into the tamper-evident `marketing_audit_events` hash-chain and `statutory-dossier.service.ts` so a regulator-ready defense file is exportable at any moment.

---

## 4. Complete Analyst Tool Registry (23 Tools)

### 4.1 Wire the 6 Existing / Missing Document 04 Tools
Add declarations and executors in `src/modules/ai-orchestration/tools/statutory-tools.ts`:
1. `get_campaign_context` — Load campaign metadata, active revision text, linked product, assets, and lock results.
2. `get_campaign_asset_content` — Load extracted OCR text, bounding boxes, and page provenance from `asset_extraction_segments`.
3. `extract_campaign_claims` — Run `claim-extractor.ts` to isolate discrete promotional claims with provenance.
4. `run_deterministic_compliance_locks` — Execute Locks 1, 2, and 3 deterministically against any copy + `campaign_products`.
5. `assess_campaign_compliance` — Run full autonomous assessment + 7-layer guardrails and persist `compliance_findings`.
6. `get_compliance_findings` — Retrieve persisted findings and `finding_evidence` for a campaign revision.

### 4.2 Add 6 New Autonomous Nigerian Analyst & Forensic Tools

| # | Tool Name (`snake_case`) | Service File | Deterministic Inputs & Outputs |
|---|---|---|---|
| **18** | `calculate_effective_apr_and_drip_fees` | `src/modules/compliance-assessment/apr-calculator.service.ts` | **Inputs:** `principal_ngn`, `advertised_rate_percent`, `rate_period` (`DAILY`\|`MONTHLY`\|`ANNUAL`\|`FLAT`), `tenor_days`, `processing_fee_percent`, `processing_fee_flat_ngn`, `management_fee_percent`, `upfront_deduction`, `daily_penalty_percent`, `claimed_apr_or_rate_text`.<br>**Outputs:** Exact `net_disbursed_ngn`, `total_repayment_ngn`, `total_cost_of_credit_ngn`, `nominal_apr_percent`, `effective_apr_irr_percent`, `drip_pricing_detected` (boolean), `rate_discrepancy_percent`, and `fccpc_cbn_flags[]`. |
| **19** | `audit_flyer_visual_forensics` | `src/modules/asset-processing/visual-forensics.service.ts` | **Inputs:** `asset_id`.<br>**Outputs:** Computes bounding-box pixel height ratios (`min_disclaimer_to_headline_ratio`), flags buried fine print (`ratio < 0.10`), verifies presence of `ARCON/ASP` pre-vetting certificate ID pattern, checks `NDIC` deposit cap qualifier, and flags unverified foreign/celebrity model cues for ARCON AISOP review. |
| **20** | `audit_app_store_listing` | `src/modules/compliance-assessment/app-store-auditor.service.ts` | **Inputs:** `listing_text` or `url`, `product_id` (optional).<br>**Outputs:** Checks Google Play Personal Loan Policy & FCCPC DEON compliance: `tenor_lt_60_days_violation`, `missing_min_max_repayment_period`, `missing_max_apr`, `missing_representative_example`, `predatory_recovery_or_contact_scraping_flags`, `missing_24h_grievance_channel`. |
| **21** | `verify_license_scope_matrix` | `src/modules/compliance-assessment/license-scope.service.ts` | **Inputs:** `content_text`, `institution_license_tier` (auto-loaded from tenant profile if omitted).<br>**Outputs:** Deterministic permission matrix checking if advertised products (credit, deposit, investment yield, FX, crypto/VASP) are lawful under the tenant's CBN/FCCPC/SEC license class. |
| **22** | `generate_kfs_and_channel_kit` | `src/modules/compliance-assessment/kfs-generator.service.ts` | **Inputs:** `product_id` (or parsed parameters), `sample_principal_ngn`, `sample_tenor_days`, `target_channels[]` (`SMS`\|`INSTAGRAM`\|`WEB_KFS`\|`ARCON_ASP_MEMO`).<br>**Outputs:** Deterministic **CBN Key Facts Statement (KFS)** markdown/JSON table, 160-char compliant SMS copy, Social flyer copy + footer disclosure, and **ARCON ASP Substantiation Memo** draft. |
| **23** | `recall_institutional_precedents` | `src/modules/ai-orchestration/precedent-memory.service.ts` | **Inputs:** `topic_query`, `product_type` (optional), `limit`.<br>**Outputs:** Tenant's onboarding regulatory profile + historical `campaign_approvals` rejection reasons + recurring `compliance_findings` patterns so Cogent remembers CCO preferences across all threads. |

---

## 5. Multi-Step Agent Loop, Self-Correction & Auto-Context Engine

Upgrade `src/modules/conversations/copilot.orchestrator.ts` from a 3-round Q&A loop to an **Autonomous Multi-Step Compliance Agent**:

1. **Zero-Click Context Hydration (Before Round 1):**
   - Automatically load the tenant's **Institution Regulatory Profile** (`license_tier`, registered regulators, default disclosures) and **Active `campaign_products`** catalog.
   - Auto-match any product name or rate pattern mentioned in the user prompt, uploaded flyer OCR, or scanned URL against `campaign_products`—even when the user did not select a product from the dropdown.
   - Automatically hydrate extracted text and bounding-box metadata for any `attachment_asset_ids` and snapshot content for any `campaign_urls` passed in the stream payload.
   - Auto-create or link a `marketing_campaigns` + `campaign_revisions` record whenever promotional copy, a flyer asset, or a landing page URL is submitted for review (emitting `campaign.created`).

2. **Visible Multi-Step Execution Planner (`plan.*` SSE Events):**
   - Emit structured planning progress to the UI so users watch the analyst work step-by-step:
     1. *Hydrate Asset OCR / Live URL & Auto-Match Product Rate Card*
     2. *Compute True APR / IRR & Visual / App Store Forensics*
     3. *Execute Deterministic Locks 1–3 & Institutional Precedents*
     4. *Verify Statutory Clauses (CBN / FCCPC / ARCON / NDPC / SEC)*
     5. *Synthesize Problem → Risk → Fix & Run Layer-6 Self-Correction*

3. **Multi-Round Tool Loop & Pre-Output Reflexion (Self-Correction):**
   - Increase `maxToolRounds` to **7** with duplicate-call deduplication.
   - **Self-Correction Gate:** Whenever the orchestrator prepares a `compliant_rewrite` or `kfs_table` artifact, it runs `mechanicalLocksEngine.executeLocks()` + `rewriteValidatorService` on the AI's proposed copy **before** emitting `message.completed`.
   - If the AI's own rewrite breaches a lock (e.g., drops `"Terms and Conditions Apply"`, changes an approved rate, or omits the CBN license disclosure), the orchestrator feeds the breach back to Gemini in an internal correction turn and forces a compliant fix automatically.

---

## 6. Structured Outputs & In-Thread Human-in-the-Loop (HITL) UI

### 6.1 Structured Audit Payload (`StructuredComplianceReport`)
In addition to clean DOC-10-ACPC prose, the assistant message persists a strongly typed `metadata.structured_report` object validated by Zod:

```typescript
interface StructuredComplianceReport {
  pre_flight_gate: {
    verdict: "PASS" | "CONDITIONAL" | "BLOCK";
    risk_score: number; // 0 - 100
    lock_summary: {
      lock1_prohibited_terms: "PASS" | "FAIL";
      lock2_product_rate_match: "PASS" | "FAIL";
      lock3_mandatory_disclosures: "PASS" | "FAIL";
    };
    apr_audit?: {
      advertised_implied_apr: number;
      effective_true_apr: number;
      drip_pricing_detected: boolean;
      net_disbursed_ngn: number;
      total_repayment_ngn: number;
    };
  };
  blind_spot_findings: Array<{
    finding_id?: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    category: string;
    what_you_missed: string;       // Blind Spot
    what_it_costs_you: string;     // Nigerian Penalty / Consequence
    exact_quote: string;
    violated_statute: string;
    regulatory_clause_id?: string;
    suggested_fix: string;         // Done-For-You Rewrite
  }>;
  artifacts: {
    compliant_rewrite?: {
      channel: string;
      rewritten_copy: string;
      verified_by_locks: boolean;
    };
    kfs_table?: {
      product_name: string;
      rows: Array<{ label: string; value: string }>;
      markdown_table: string;
    };
    arcon_asp_memo?: string;
  };
  campaign_context?: {
    campaign_id: string;
    revision_id: string;
    revision_number: number;
    can_user_approve: boolean;
  };
}
```

### 6.2 Interactive In-Thread Components (`src/components/chat/`)
Upgrade `AdaptiveMessageRenderer.tsx` and `src/app/chat/page.tsx` to render:
1. **`AgentExecutionPlanCard`:** Live collapsible step tracker driven by `plan.created` and `plan.step_updated` SSE events.
2. **`PreFlightGateBanner`:** High-contrast `PASS` / `CONDITIONAL` / `BLOCK` badge with Risk Score, Locks 1–3 pills, and Effective APR vs. Advertised APR comparison strip.
3. **`BlindSpotFindingCards`:** Cards structured explicitly around **What You Missed** → **What It Costs You** → **One-Click Resolution** with clause inspection links.
4. **`KfsAndRewriteArtifactCard`:** Copyable CBN Key Facts Statement table + compliant ad rewrite + channel switcher (`SMS 160-char`, `Social`, `Web`, `ASP Memo`).
5. **Inline HITL Action Bar:**
   - **`Apply Compliant Rewrite`** → Calls `POST /api/marketing-shield/v1/campaigns/{id}/revisions`, creates immutable Revision #N+1, and triggers re-verification.
   - **`Approve & Seal 2-Year FCCPC Dossier`** (RBAC-gated for `LEGAL_COUNSEL` / `CHIEF_COMPLIANCE_OFFICER`) → Calls `POST /approvals` + `POST /dossiers`, then renders an inline downloadable PDF Dossier card with SHA-256 verification hash.

---

## 7. Background Autonomy: Zero-Prompt Sentinels (`src/modules/jobs/` & `src/modules/drift-monitor/`)

1. **Continuous URL & App Store Sentinel (`scheduledDriftWatcherJob` + `drift.service.ts`):**
   - Support monitor targets of type `LANDING_PAGE`, `TERMS_AND_CONDITIONS`, `PRICING_PAGE`, and `APP_STORE_LISTING`.
   - On every run (and on manual trigger), compute DOM/text diff against the approved revision baseline, run `mechanicalLocksEngine`, `aprCalculatorService`, and `appStoreAuditorService`.
   - When drift or a new violation is detected:
     - Mark monitor `DRIFT_DETECTED` and record exact redline diff in `drift_details`.
     - Automatically spawn a high-priority **Incident Conversation** in `marketing_conversations` containing the `Problem → Risk → Fix` analysis so the user sees it immediately upon login.
     - Dispatch Resend email alert to the CCO.

2. **Regulatory Ripple Watcher (`scheduledRegulatoryMonitorJob`):**
   - Daily Inngest cron job querying `.gov.ng` updates across CBN, FCCPC, ARCON, NDPC, and SEC via `webSearchRouter.searchLiveWeb()`.
   - Deduplicates against `live_web_retrievals` / `regulatory_horizon_alerts`.
   - When a genuinely new circular or enforcement guideline is discovered, runs an impact scan across every tenant's active `campaign_products` and `APPROVED` campaigns, creating a **Regulatory Ripple Alert** with exact affected products and required copy patches.

---

## 8. Database & API Contract Extensions (Backward-Compatible)

1. **Additive Migration (`supabase/migrations/20261116000001_autonomous_analyst_extensions.sql`):**
   - `tenants`: add `institution_license_tier` (e.g., `DMB`, `MFB_NATIONAL`, `MFB_STATE`, `PSB`, `MMO`, `FCCPC_DIGITAL_LENDER`, `SEC_CAPITAL_MARKET`, `FINTECH_PARTNER`) if not already stored in onboarding metadata.
   - `campaign_drift_monitors`: add `monitor_target_type` (`LANDING_PAGE` | `TERMS_PAGE` | `APP_STORE_LISTING` | `PRICING_PAGE`), `incident_conversation_id` (nullable UUID).
   - `regulatory_ripple_alerts`: tenant-scoped table storing detected new regulatory circulars, impacted `campaign_id[]` / `product_id[]`, severity, summary, and acknowledgment status.
2. **SSE & Contract Extensions (`src/contracts/conversation.contracts.ts`):**
   - Add `plan.created`, `plan.step_updated`, `structured_report.ready`, `campaign.created`, and `assessment.completed` to the `SSEEvent` union.
   - Add `BlindSpotFindingSchema`, `StructuredComplianceReportSchema`, `AprCalculationResultSchema`, and `KfsTableSchema`.
3. **API Routes:**
   - `GET /api/marketing-shield/v1/alerts/ripple` & `POST /api/marketing-shield/v1/alerts/ripple/[id]/acknowledge` for Regulatory Ripple Alerts.
   - `POST /api/marketing-shield/v1/tools/apr-calculator` (optional direct endpoint for UI calculator preview).

---

## 9. Phased Execution Roadmap & Verification Gates

| Phase | Deliverable Scope | Key Files | Verification Gate |
|---|---|---|---|
| **Phase A** | **Deterministic Analyst & Forensic Engines** | `apr-calculator.service.ts`, `visual-forensics.service.ts`, `app-store-auditor.service.ts`, `license-scope.service.ts`, `kfs-generator.service.ts`, `precedent-memory.service.ts` | Unit tests covering CBN IRR/APR drip-pricing edge cases, `<60d` Play Store ban, font-ratio math, license matrix, and KFS generation. |
| **Phase B** | **Complete 23-Tool Registry & Autonomous Loop** | `statutory-tools.ts`, `copilot.orchestrator.ts`, `conversation.contracts.ts`, `src/app/api/marketing-shield/v1/conversations/[id]/messages/stream/route.ts` | Integration tests proving zero-click product matching, multi-round tool calls, Layer-6 rewrite self-correction, and `StructuredComplianceReport` emission. |
| **Phase C** | **Structured Audit Cards & In-Thread HITL UI** | `AdaptiveMessageRenderer.tsx`, `AgentExecutionPlanCard.tsx`, `PreFlightGateBanner.tsx`, `BlindSpotFindingCard.tsx`, `KfsAndRewriteCard.tsx`, `src/app/chat/page.tsx` | Component & Playwright E2E tests for live plan progression, `PASS/CONDITIONAL/BLOCK` gate rendering, one-click rewrite revision creation, and one-click CCO Dossier sealing. |
| **Phase D** | **Zero-Prompt Sentinels & DB Migration** | `20261116000001_autonomous_analyst_extensions.sql`, `drift.service.ts`, `inngest.functions.ts`, `regulatory-ripple.service.ts` | Unit + resilience tests for URL/App Store drift incident thread creation and Regulatory Ripple cross-referencing against active campaigns/products. |

---

*End of Document 13 — Ready for Phase A–D Implementation upon approval.*
