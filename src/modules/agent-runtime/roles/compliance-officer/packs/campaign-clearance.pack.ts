/**
 * Workflow Pack 5: Marketing Clearance & Campaign Compliance Audit
 * Actual Cogent Workflow: FULL_COMPLIANCE_AUDIT / CAMPAIGN_COMPLIANCE_KIT
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const CAMPAIGN_CLEARANCE_PACK: WorkflowPackDefinition = {
  id: "FULL_COMPLIANCE_AUDIT",
  displayName: "Marketing Clearance & Campaign Compliance Audit",
  description:
    "Audits promotional copy, flyers, landing pages, app store listings, and influencer scripts using 3 Deterministic Mechanical Locks, CBN APR/EAR verification, visual forensics, KFS generation, and ARCON ASP pre-vetting checks.",
  workflowType: "CAMPAIGN_COMPLIANCE_KIT",
  artifactType: "compliant_ad_rewrite",
  isWorkProductWorkflow: false,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Extract and verify all promotional claims from submitted ad copy, OCR flyer segments, PDF/DOCX assets, or live campaign URLs.",
    "Match against the institution's approved Product Rate Card and run all 3 Deterministic Locks (Prohibited Terms, Rate/Fee/Tenor Truth, Mandatory Disclosures).",
    "Compute verified Gross-Principal Nominal APR, Net-Disbursed Simple Annualised Nominal APR, Compounded EAR (Actual/365), and check MFB/CBN statutory tariff caps.",
    "Audit visual font ratios, ARCON ASP pre-exposure seal, Google Play <=60-day personal loan rules, NDIC coverage wording, and influencer/promo draw triggers.",
    "Deliver an 8-section lawyer-grade Marketing Clearance Memo with a redesigned compliant KFS table, pre-validated campaign rewrites, and ARCON substantiation release gate.",
  ],
  deterministicPreChecks: [
    "MECHANICAL_LOCKS",
    "APR_AND_DRIP_PRICING",
    "VISUAL_FORENSICS",
    "APP_STORE_AUDIT",
    "LICENSE_SCOPE_MATRIX",
    "KFS_AND_CHANNEL_KIT",
    "STATUTORY_REFERENCE_MATRIX",
  ],
  allowedTools: [
    "get_campaign_context",
    "get_campaign_asset_content",
    "extract_campaign_claims",
    "run_deterministic_compliance_locks",
    "assess_campaign_compliance",
    "get_compliance_findings",
    "generate_rewrite_suggestions",
    "compare_campaign_revisions",
    "calculate_effective_apr_and_drip_fees",
    "calculate_cbn_apr_and_drip_pricing",
    "audit_flyer_visual_forensics",
    "audit_app_store_listing",
    "verify_license_scope_matrix",
    "generate_kfs_and_channel_kit",
    "create_compliance_artifact",
    "scan_live_url_or_creative",
    "match_product_rate_card",
    "get_product_approved_terms",
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "verify_regulatory_evidence",
    "assess_regulatory_applicability",
    "search_institutional_knowledge",
    "search_live_web",
    "fetch_live_url_content",
    "recall_institutional_precedents",
    "search_nigerian_regulations",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 3,
  temperature: 0.2,
  prefersLiveWebSearch: true,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: MARKETING CLEARANCE & CAMPAIGN COMPLIANCE AUDIT
Deliver an authoritative, lawyer-grade 8-section Marketing Clearance & Ad Campaign Audit Memo:
1. **Clearance Decision (\`HOLD — DO NOT PUBLISH\` / \`CONDITIONAL\` / \`CLEAR\`) & Executive Summary** (stating the exact Gross-Principal Nominal APR, Net-Disbursed Simple Annualised Nominal APR, and Compounded Effective Annual Rate (EAR) on \`Actual/365\`, and explaining why disclosing unlawful tariff caps in fine print or a KFS does not legalise them).
2. **Scope, Institutional Assumptions & Material Regulatory Corrections** (explicitly distinguishing CBN Consumer Protection Regulations 2019 Reg. 4.2.9 prior notification to the Director, Consumer Protection Department from ARCON Act 2022 Section 54 ASP pre-exposure approval via Form 001; citing CBN Guide to Charges 2020 Part 2(A) Section 2.6 [1% max MFB processing/appraisal/management fee cap] and Section 2.5 & Footnote 3 [1% flat/month MFB penal rate cap after 3-day grace period]; stating the current ₦2,000,000 NDIC MFB deposit insurance limit vs. loans/credit-life insurance; distinguishing enacted FCCPC DEON Regulations 2025 from any pending exposure drafts; and flagging Google Play Store's \`<=60-day\` personal loan ban in Nigeria when short tenors apply).
3. **Line-by-Line Statutory Audit Tables** (\`| Asset / Line | Exact Claim | Issue | Governing Rule | Required Fix |\`):
   - **Table 2A: Headline, Pricing, Eligibility & Lender-of-Record**
   - **Table 2B: Fees, Mandatory Insurance, Default Charges & Tenor**
   - **Table 2C: Promotional Draws / Raffles, Influencer Claims & Pre-Exposure Clearances**
4. **NDIC & Regulatory-Status Disclosure Analysis** (verifying whether "NDIC insured" actually appears on the creative, explaining that NDIC covers eligible deposits up to ₦2,000,000 per depositor for MFBs and ₦5,000,000 for DMBs—never loans or borrower credit-life insurance fees—and recording no false NDIC violation when deposit-taking is not promoted).
5. **Deterministic APR & Cash-Flow Verification** (Assumptions, side-by-side cash-flow table for every loan size extracted in \`loan_examples\`, step-by-step equations for Net Disbursed Cash $N$, Total Repayment $R$, periodic cost rate, Simple Annualised Nominal APR on Net Cash, and Compounded EAR, plus an \`Actual/365\` vs \`360-day\` convention comparison table).
6. **Key Facts Statement (KFS) — CBN Reg. 4.3.4 & Annexure A** (showing both why any non-compliant fee/penalty structure is unlawful and a **Redesigned Compliant KFS Table** using the computed values in \`lawful_redesign_schedule\`, with the mandatory non-offer preamble, minimum 2-working-day draft contract review period under Reg. 4.3.5, 3-working-day cooling-off right under Reg. 4.3.6, and 3-day default grace period under Reg. 4.6(b)).
7. **Rewritten Compliant Campaign Copy** (**A. Loan Ad & Landing-Page Hero**, **B. Influencer Script with upfront Paid Advertisement disclosure if an influencer script is in scope**, and **C. Separate Promotional Draw / Raffle Copy held pending FCCPC 21-day prior registration & gaming permits when applicable**).
8. **ARCON Substantiation & Regulatory-Clearance Checklist Table + Release Gate**.`,
  requiredDeliverableSections: [
    {
      key: "clearance_decision",
      label: "Clearance Decision & Executive Summary",
      headingPatterns: ["clearance\\s+decision", "executive\\s+summary", "hold\\s*[—–-]\\s*do\\s+not\\s+publish"],
      required: true,
    },
    {
      key: "line_by_line_audit",
      label: "Line-by-Line Statutory Audit Tables",
      headingPatterns: ["line[- ]by[- ]line", "table\\s+2a", "statutory\\s+audit"],
      required: true,
    },
    {
      key: "apr_verification",
      label: "APR & Cash-Flow Verification",
      headingPatterns: ["apr\\s+(?:&|and)\\s+cash[- ]flow", "effective\\s+annual\\s+rate"],
      required: true,
    },
    {
      key: "kfs_table",
      label: "Key Facts Statement (KFS)",
      headingPatterns: ["key\\s+facts\\s+statement", "\\bkfs\\b"],
      required: true,
    },
    {
      key: "rewritten_copy",
      label: "Rewritten Compliant Campaign Copy",
      headingPatterns: ["rewritten\\s+compliant", "compliant\\s+campaign\\s+copy"],
      required: true,
    },
    {
      key: "release_gate",
      label: "ARCON Substantiation & Release Gate",
      headingPatterns: ["arcon\\s+substantiation", "release\\s+gate", "regulatory[- ]clearance\\s+checklist"],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: ["HOLD — DO NOT PUBLISH", "CONDITIONAL", "CLEAR"],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
    failClosedConditions: [
      "Deterministic Lock 1, 2, or 3 breach detected.",
      "Unlawful MFB fee or penal rate cap exceeded under CBN Guide to Charges 2020.",
      "Missing ARCON ASP pre-exposure certificate or FCCPC 21-day promotional draw registration.",
    ],
  },
  buildExecutionPlan: () => [
    {
      step_id: "step_hydrate",
      step_number: 1,
      title: "Hydrate Institutional Memory, Rate Cards & Asset/URL Context",
      status: "RUNNING",
    },
    {
      step_id: "step_forensics",
      step_number: 2,
      title: "Run Silent Blind-Spot Scan (APR/IRR Math, Visual & App Store Forensics)",
      status: "PENDING",
    },
    {
      step_id: "step_locks",
      step_number: 3,
      title: "Execute 3 Deterministic Mechanical Locks & License Boundary Check",
      status: "PENDING",
    },
    {
      step_id: "step_vault",
      step_number: 4,
      title: "Cross-Examine Nigerian Statutory Vault (CBN, FCCPC, ARCON, NDPC, SEC)",
      status: "PENDING",
    },
    {
      step_id: "step_remediate",
      step_number: 5,
      title: "Synthesize Problem → Risk → Fix Verdict, KFS Table & Layer-6 Verified Rewrites",
      status: "PENDING",
    },
  ],
};
