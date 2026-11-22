/**
 * Workflow Pack 3: Supervisory Inquiry & Sponsor Bank DDQ Response
 * Actual Cogent Workflow: SUPERVISORY_DDQ_RESPONSE -> supervisory_ddq_response
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const SUPERVISORY_DDQ_PACK: WorkflowPackDefinition = {
  id: "SUPERVISORY_DDQ_RESPONSE",
  displayName: "Supervisory Inquiry & Sponsor Bank DDQ Response",
  description:
    "Drafts formal CBN supervisory responses and Sponsor Bank due-diligence questionnaire answers with strict BOFIA/CBN CPR anti-fabrication discipline and evidence-gap tagging.",
  workflowType: "SUPERVISORY_DDQ_RESPONSE",
  artifactType: "supervisory_ddq_response",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Verify whether referenced attachments and internal records were actually supplied; flag missing files upfront.",
    "Parse every numbered supervisory item and DDQ question against the institution's verified Knowledge Base and Nigerian statutory matrix.",
    "Strictly separate (1) Completed & Evidenced Actions, (2) Records/Evidence Not Supplied ([NEEDS_INTERNAL_EVIDENCE]), and (3) Prospective Commitments.",
    "Enforce exact statutory boundaries (Bank Deposit vs. MMO KYC limits, 31 March NDPC CAR deadline, MLPPA 2022 CTR/STR/FTR tracks, Cybercrimes Act s.37(3) 72h vs. Instant EFT 2018 clocks).",
    "Attach a Pre-Submission Sign-Off Checklist (CEO, CCO/MLRO, CFO, CISO) and Submission Annexures Schedule (Annexures A–F).",
  ],
  deterministicPreChecks: [
    "DDQ_EVIDENCE_ALIGNMENT",
    "MISSING_ATTACHMENT_CHECK",
    "STATUTORY_REFERENCE_MATRIX",
  ],
  allowedTools: [
    "parse_and_answer_ddq_questions",
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "verify_regulatory_evidence",
    "search_institutional_knowledge",
    "search_live_web",
    "fetch_live_url_content",
    "recall_institutional_precedents",
    "search_nigerian_regulations",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 3,
  temperature: 0.15,
  prefersLiveWebSearch: true,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: SUPERVISORY INQUIRY / SPONSOR BANK DDQ RESPONSE
- Answer each numbered question and supervisory item formally with exact Nigerian statutory citations (Gazette sections and Circular references) and required technical controls.
- **STRICT FACTUAL HONESTY & ANTI-FABRICATION RULE (BOFIA 2020 & CBN Consumer Protection Regulations 2019 Regulation 7)**: NEVER invent, guess, or extrapolate operational facts, engineering root causes (e.g., database migration deadlocks, credential-stuffing vectors), exact customer/incident counts, completed refund amounts or dates, ticket timestamps, or past regulatory certifications (DPO registration, CAR filings, VAPT completion, STR filings) unless explicitly present in \`<internal_institutional_truth>\`, \`<uploaded_asset_extracted_content>\`, or the user's message.
- Explicitly distinguish **(1) Completed & Evidenced Actions**, **(2) Gaps / Records Not Supplied** (marked \`[NEEDS_INTERNAL_EVIDENCE]\` with safe \`[insert ...]\` placeholders), and **(3) Prospective Commitments ("will implement")**. Do NOT turn "will implement" into "has implemented" without evidence.
- If a referenced PDF/document was mentioned in the prompt but not attached or extracted, state explicitly in a pre-submission note that the named file and supporting institutional records were not supplied, and include a Pre-Submission Sign-Off Checklist and Submission Annexures table (Annexures A–F).
- Persist via \`upsert_work_product_artifact\` (\`supervisory_ddq_response\`).`,
  requiredDeliverableSections: [
    {
      key: "pre_submission_notice",
      label: "Pre-Submission Instructions & Evidence Status Notice",
      headingPatterns: ["pre[- ]submission", "evidence\\s+status"],
      required: true,
    },
    {
      key: "ddq_or_supervisory_responses",
      label: "Formal Question-by-Question / Supervisory Responses",
      headingPatterns: ["part\\s+a|q1|question\\s+1|supervisory\\s+(?:inquiry|response)|due\\s+diligence"],
      required: true,
    },
    {
      key: "sign_off_checklist",
      label: "Pre-Submission Sign-Off Checklist",
      headingPatterns: ["sign[- ]off\\s+checklist", "pre[- ]submission\\s+sign[- ]off"],
      required: true,
    },
    {
      key: "submission_annexures",
      label: "Submission Annexures Schedule",
      headingPatterns: ["annexure"],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: [
      "HOLD — INTERNAL EVIDENCE REQUIRED BEFORE DISPATCH",
      "READY FOR EXECUTIVE SIGN-OFF",
    ],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
    failClosedConditions: [
      "Referenced attachment or institutional evidence missing — must emit explicit Pre-Submission Notice and [NEEDS_INTERNAL_EVIDENCE] markers.",
      "Any unverified claim of completed refunds, past VAPT/CAR/STR filings, or fabricated engineering root causes.",
    ],
  },
  buildExecutionPlan: () => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: "Parse Supervisory/DDQ Questions & Gather Internal Controls",
      status: "RUNNING",
    },
    {
      step_id: "wf_retrieve",
      step_number: 2,
      title: "Search 141-PDF Statutory Vault & Gated Live Regulatory Web",
      status: "PENDING",
    },
    {
      step_id: "wf_synthesize",
      step_number: 3,
      title: "Draft Guardrail-Verified Deliverable Work Product",
      status: "PENDING",
    },
  ],
  buildSynthesisDirective: (ctx) => `\n<supervisory_ddq_synthesis_directives>
1. **Pre-Submission Instructions & Evidence Status Notice (Top Section)**:
   - ${
     ctx.hasMissingNamedAttachment && ctx.missingAttachmentFilename
       ? `Explicitly note at the top that '${ctx.missingAttachmentFilename}' was not supplied in extracted form in this turn, and supporting institutional records were not attached unless verified in <internal_institutional_truth>.`
       : "Explicitly distinguish verified facts found in internal evidence from unverified fields."
   }
   - Invoke **BOFIA 2020** and **CBN Consumer Protection Regulations 2019 Regulation 7**: NEVER invent operational root causes (no fake database migration deadlocks, credential-stuffing vectors, refund amounts/dates, ticket timestamps, or unverified past CAR/VAPT/STR/DPO filings). Use \`[NEEDS_INTERNAL_EVIDENCE]\` and safe \`[insert ...]\` placeholders where internal records are absent, and separate **(a) Completed & Evidenced Actions**, **(b) Records / Evidence Not Supplied**, and **(c) Prospective Commitments ("will implement")**.
   - Include a Pre-Submission Sign-Off checklist requiring verification by CEO, CCO/MLRO, Finance/CFO, and CISO before dispatch.
2. **Sponsor Bank / Partner DDQ Precision Requirements (where DDQ items are asked)**:
   - **Licensing & Virtual Accounts**: Distinguish PSSP vs. MMO vs. Bank deposit-taking under CBN 2020/2021 New Licence Categorisation. Cite CBN Mobile Money Guidelines (July 2021) **Sections 7.2.1, 7.4(g), and Section 9 (Nominee Account rules)**: non-interest-bearing Nominee Accounts at designated DMBs, no bank right of set-off, settlement-only debits, no collateralisation, 100% backing, daily reconciliation; reject daily sweeps to Master Corporate Accounts or generic "trust account" labeling without documented account titles/mandates. Where the sponsor or partner is a Unit/Tier-2 Microfinance Bank, explicitly request written Sponsor Bank confirmation that customer geography, virtual accounts, and product scope fall within its subsisting Unit MFB permissions (a nationwide app does not expand a Unit MFB's licensed scope).
   - **KYC & Onboarding Controls**: Present a **two-part Limit Matrix** (never lump together): (1) **Bank Deposit Accounts** under CBN Circular \`FPR/DIR/CIR/GEN/06/002\` (1 July 2016: Tier 1 = ₦50,000 **single-deposit** limit & ₦300,000 cumulative balance cap; Tier 2 = ₦100,000 **single-deposit** limit & ₦500,000 cumulative balance cap; Tier 3 = bank/channel risk limits, not unlimited transfers); vs. (2) **MMO Wallets** under July 2021 MMO Guidelines **Section 16** (daily cumulative outflow limits: ₦50,000 / ₦200,000 / ₦5,000,000). Overlay CBN Circular \`PSM/DIR/PUB/CIR/001/053\` (1 Dec 2023): Tier 1 requires BVN and/or NIN; Tiers 2 & 3 require BOTH BVN and NIN validated via NIBSS/NIMC before activation, zero 30-day deferral/VIP waiver/agent override, plus CBN CDD Regs 2023 Reg 16 & Section 11.
   - **NDPA 2023 & NDPC**: Cite NDPA 2023 Sections 24–29, 32, 40 (72h breach), 41–44 & **NDPC GAID 2025 Articles 8–10 & 45**: statutory annual CAR deadline is **31 March** (for pre-12 June 2023 entities, or initial 15-month period then 31 March annually)—NOT 15 March. Address the CBN 15 June 2026 Data Localisation Circular & 4 Nov 2026 FAQ separately (full compliance by **1 January 2027**; any offshore-only primary payment hosting requires a documented Nigerian localisation/migration plan).
   - **NFIU & AML/CFT**: Include all 3 tracks under **MLPPA 2022**: Section 11 CTR (>₦5M individual / >₦10M corporate within 7 days, covering transactions/lodgements/transfers—not physical cash alone), Section 7 & NFIU 2024 STR Guidelines (no minimum monetary threshold, covers attempted transactions, immediate within 24h via goAML, no month-end batching), Section 3(1) International Transfer >USD 10,000 within 1 day, and Section 8 >= 5-year retention.
   - **Cybersecurity & VAPT**: Cite CBN Circular \`BSD/DIR/GEN/LAB/11/25\` (10 Oct 2018 PSP Cybersecurity Framework Sections 2.4–2.9, 3.7, 3.9.3 [31 March self-assessment], operative Section 5.6 [<=24h] vs. Appendix VII [6h initial notification target]) and the NPS Risk and Information Security Management Framework (annual VAPT baseline vs stronger internal commitments). Separate the PSP Framework from a partner MFB/OFI's OFI framework and do not treat the 2024 DMB/PSB exposure draft as enacted for PSPs.
   - **Third-Party Sub-Merchants**: Cite CBN AML Regs 2022 (Regs 19–29, 37–40), **FCCPC DEON Consumer Lending Regulations 2025** (Regs 8, 10–13), and **CBN December 2023 VASP Account Guidelines** (prohibiting crypto/FX merchants unless Legal/Compliance/Sponsor Bank approve a permitted-use model is a prudent risk policy, not claiming all virtual-asset activity is universally illegal).
3. **CBN Supervisory Inquiry / Incident Response Precision Requirements (where supervisory or NIP/debit issues are raised)**:
   - Use formal regulator letterhead with bracketed fields (\`[insert date/timestamp WAT]\`, \`[insert tracking IDs]\`), Governance & Dedicated Restitution Provision (referencing only the disputed exposure amount stated in the inquiry, subject to customer-level reconciliation, without claiming unverified completed payouts), and **Separate Regulatory Timeline Matrix**:
     - Unauthorised debits: **Cybercrimes (Prohibition, Prevention, etc.) Act 2015 Section 37(3)** (72 hours from written customer notice to provide clear legal authorisation or reverse; ₦5,000,000 fine; do not use the Nov 2025 APP-fraud exposure draft to delay redress).
     - Failed NIP legs: **CBN Instant EFT Regulation 2018** Section 5.2(8) (10 min upon receiving-bank return), Section 5.2(9) (1 hour after next settlement closure), Sections 5.3(2)–(4) (60 seconds inward / 24h exceptions), Section 11 (24-hour failed-NIP sanction), Section 10.1.2 (3 working days general disputes), Sections 5.1(13) & 10.3 (daily NIBSS fraud returns).
     - Consumer Protection & Returns: **CBN CPR 2019** Regulations 6.2.2 & 6.3.2 (24h ack), 6.3.7–6.3.11 (next-day SRC + refund with interest/charges), 6.3.15–6.3.17 (quarterly RCA), Reg 7 & BOFIA 2020; plus NDPA Section 40 (72h personal-data breach) and MLPPA Sections 7 & 11.
   - Include Incident Delivery Milestones (6h / 12h / 24h / 48h / daily), Root-Cause Investigation Workstreams framed as hypotheses to verify (never fabricated causes), Systemic Technical Controls table, and a **Submission Annexures Schedule (Annexures A–F)**.
</supervisory_ddq_synthesis_directives>`,
  buildTurnGuidance: () =>
    `Execute workflow intent 'SUPERVISORY_DDQ_RESPONSE' directly now using the hydrated statutory vault, statutory reference matrix, institutional records, and live evidence above. Do NOT repeat redundant search tool calls unless a critical gap remains; write the complete citation-backed deliverable directly (the Work Product Studio automatically saves your output).`,
};
