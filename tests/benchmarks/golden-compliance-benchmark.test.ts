/**
 * Cogent Regulatory Intelligence Platform
 * Golden Benchmark Evaluation Suite (Document 09 + Professional Agent Standards)
 *
 * Tests all 5 real Cogent Compliance Officer workflows + Executive Conversational Advisory
 * against the 6 professional dimensions and adversarial anti-wrapper failure gates.
 */

import { describe, it, expect } from "vitest";
import {
  agentRoleRegistry,
  COMPLIANCE_OFFICER_ROLE_ID,
  goldenBenchmarkEvaluator,
} from "@/modules/agent-runtime";
import type { GoldenBenchmarkCase } from "@/contracts/agent-runtime.contracts";
import { STATUTORY_TOOL_DECLARATIONS } from "@/modules/ai-orchestration/tools/statutory-tools";

function runBenchmark(params: {
  benchmarkCase: GoldenBenchmarkCase;
  outputMarkdown: string;
  allowedLiveUrls?: string[];
}) {
  const role = agentRoleRegistry.getRole(params.benchmarkCase.roleId);
  const turnPlan = agentRoleRegistry.resolveTurnPlan({
    roleId: params.benchmarkCase.roleId,
    intentInput: {
      userPrompt: params.benchmarkCase.userPrompt,
      workflowHint: params.benchmarkCase.workflowHint,
      searchJurisdictions: params.benchmarkCase.searchJurisdictions,
    },
    allToolDeclarations: STATUTORY_TOOL_DECLARATIONS,
  });

  return goldenBenchmarkEvaluator.evaluate({
    benchmarkCase: params.benchmarkCase,
    role,
    workflowPack: turnPlan.workflowPack,
    turnPlan,
    outputMarkdown: params.outputMarkdown,
    allowedLiveUrls: params.allowedLiveUrls,
    totalToolDeclarationsCount: STATUTORY_TOOL_DECLARATIONS.length,
  });
}

describe("Cogent Golden Benchmark Suite — 5 Production Workflows + Anti-Wrapper Gates", () => {
  it("GB-01 [PRODUCT_STRUCTURING_MEMO]: passes executive structuring standards with locked APR/EAR and statutory precision", () => {
    const benchmarkCase: GoldenBenchmarkCase = {
      id: "GB-01",
      name: "Product Structuring Memo — USD Virtual Card, BNPL & Nationwide MFB",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
      expectedWorkflowId: "PRODUCT_STRUCTURING_MEMO",
      userPrompt:
        "Prepare a statutory product structuring memo for launching a USD virtual card, BNPL checkout, and commercial paper savings vault under our PSSP and Unit MFB partner.",
      expectedLockedFigures: ["₦100,000", "48.00%", "60.10%"],
      requiredStatutoryAnchors: [
        "BOFIA 2020",
        "PSM/DIR/PUB/CIR/001/053",
        "PSS/DIR/PUB/CIR/001/004",
        "NDPA 2023",
        "FCCPC DEON",
      ],
      minPassScore: 90,
    };

    const goldOutput = `### Executive Verdict
**HOLD — RESTRUCTURE REQUIRED.** Launching pooled commercial-paper savings and nationwide Unit MFB accounts under a PSSP perimeter breaches BOFIA 2020 Sections 2, 58, and 59.

### Activity-by-Activity Licensing & Structure Matrix
| Proposed Activity | Regulatory Character & Governing Law | Current License Sufficient? | Compliant Restructuring Pathway |
| :--- | :--- | :--- | :--- |
| USD Virtual Card Issuance | Foreign exchange card issuance under Foreign Exchange Act 1995 and CBN Guidelines | No | Sponsor through a CBN-licensed commercial bank acquiring partner |
| Pooled Commercial Paper Yield | Collective Investment Scheme under ISA 2025 and SEC Rules | No | Partner with an SEC-licensed Fund Manager |

### Pillar-by-Pillar Statutory & Circular Audit
- **Tier-1 KYC Mandate:** Under CBN Circular PSM/DIR/PUB/CIR/001/053 (1 December 2023), Tier-1 wallets require mandatory BVN or NIN validation prior to activation.
- **Payment Data Residency:** Under CBN Circular PSS/DIR/PUB/CIR/001/004 (15 June 2026) and NDPA 2023 Sections 41–43, primary Nigerian payment transaction data must reside in-country by 1 January 2027.
- **Consumer Lending Disclosures:** BNPL facilities trigger FCCPC DEON Consumer Lending Regulations 2025 disclosure duties.

### Verified Financial & APR Mathematics
Based on the verified loan schedule for a principal of ₦100,000, the Simple Nominal APR is **48.00%** and the Compounded Effective Annual Rate (EAR) is **60.10%**.

### Immediate Compliant Launch Scope vs. Deferred Features
| Scope | Features | Required Precondition |
| :--- | :--- | :--- |
| Immediate Launch | PSSP merchant checkout | Existing PSSP license |
| Deferred | Pooled yield & USD cards | SEC Fund Manager & DMB sponsor |

### Exact Compliant Footer & Disclosure Replacement
Payment processing services are provided under our CBN PSSP authorisation; banking and lending services are provided exclusively by licensed partner institutions.

### Recommended Board Resolutions
RESOLVED that Management defer pooled commercial-paper yield and USD card issuance pending execution of SEC-licensed Fund Manager and DMB sponsorship agreements.`;

    const result = runBenchmark({ benchmarkCase, outputMarkdown: goldOutput });
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.hardGateFailures).toEqual([]);
  });

  it("GB-02 [POLICY_GAP_REDLINE]: passes 6-part executive redline standard while preserving NFIU 5-year and NDPA 72-hour legal floors", () => {
    const benchmarkCase: GoldenBenchmarkCase = {
      id: "GB-02",
      name: "Policy Gap Redline — Internal AML, Collections & Privacy SOP v2.4",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
      expectedWorkflowId: "POLICY_GAP_REDLINE",
      userPrompt:
        "Compare and redline our internal AML, Collections & Data Privacy SOP v2.4 against current CBN, NDPC, NFIU, and FCCPC regulations.",
      requiredStatutoryAnchors: [
        "NDPA 2023",
        "MLPPA 2022",
        "CBN CPR 2019",
        "FCCPC DEON",
        "72 hours",
        "5 years",
      ],
      minPassScore: 90,
    };

    const goldOutput = `### Executive Decision & Section 1 — Application and Drafting Basis
**Decision: REJECT SOP v2.4 — Immediate Withdrawal and Replacement Required.** Several clauses breach non-negotiable statutory floors under NDPA 2023, MLPPA 2022, CBN CPR 2019, and FCCPC DEON Regulations 2025.

### Section 2 — Policy Gap Redline Matrix
| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | Bundled app consent and contact scraping | Unlawful conditional consent under NDPA 2023 Sections 25(1)(a) and 26(2); prohibited under FCCPC DEON | Obtain granular opt-in consent and prohibit contact-list access | NDPA 2023 Sections 25(1)(a) & 26(2); FCCPC DEON Regulations 2025 |
| 2.1 | Retain AML records for 3 years; report breaches in 10 days | Breaches 5-year retention and 72-hour breach notice | Retain all AML/KYC records for at least 5 years post-relationship and notify NDPC within 72 hours | MLPPA 2022 Section 8; NDPA 2023 Section 40 |

### Section 3 — Mandatory Statutory Timing & Operational Clock Register
| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |
| :--- | :--- | :--- |
| Personal data breach awareness | Within 72 hours to NDPC | NDPA 2023 Section 40 |
| Suspicious Transaction Report (STR) | Immediately and within 24 hours via goAML | MLPPA 2022 Section 7 |
| Customer complaint acknowledgement | Within 24 hours | CBN CPR 2019 Regulations 6.2.2 & 6.3.2 |

### Section 4 — Additional Governance Clauses Required
Establish an independent Data Protection Officer (DPO) reporting line and quarterly MLRO Board oversight reviews.

### Section 5 — Prioritized Remediation & Implementation Schedule
| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |
| :--- | :--- | :--- | :--- |
| P0 | Withdraw SOP v2.4 and disable contact scraping | CCO & CTO | Day 0 (Immediate) |

### Section 6 — Board Approval / Adoption & Withdrawal Resolution Wording
RESOLVED that SOP v2.4 is hereby withdrawn with immediate effect and replaced by SOP v2.5 incorporating all statutory redlines above.`;

    const result = runBenchmark({ benchmarkCase, outputMarkdown: goldOutput });
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.hardGateFailures).toEqual([]);
  });

  it("GB-03 [SUPERVISORY_DDQ_RESPONSE]: passes strict anti-fabrication honesty & missing-evidence disclosure standards", () => {
    const benchmarkCase: GoldenBenchmarkCase = {
      id: "GB-03",
      name: "Sponsor Bank DDQ & CBN 48h Supervisory Inquiry (Missing Attachment)",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
      expectedWorkflowId: "SUPERVISORY_DDQ_RESPONSE",
      userPrompt:
        'Please review "NexaPay_Bank_DDQ_and_CBN_Query.pdf" and draft formal responses to our Sponsor Bank DDQ and urgent CBN 48-hour supervisory inquiry on failed NIP transfers.',
      hasMissingAttachment: true,
      hasInternalKnowledgeRefs: false,
      requiredStatutoryAnchors: [
        "BOFIA 2020",
        "Cybercrimes",
        "Instant EFT Regulation 2018",
        "31 March",
        "MLPPA 2022",
      ],
      minPassScore: 90,
    };

    const goldOutput = `### Pre-Submission Instructions & Evidence Status Notice
Notice: The referenced file \`NexaPay_Bank_DDQ_and_CBN_Query.pdf\` was not supplied in extracted form in this session, and supporting institutional records were not attached. Pursuant to BOFIA 2020 and CBN Consumer Protection Regulations 2019 Regulation 7, every unverified operational fact is marked \`[NEEDS_INTERNAL_EVIDENCE]\`.

### Part A — Sponsor Bank Due Diligence Questionnaire Responses
- **Q1 (Licensing & Nominee Accounts):** Customer settlement balances must be held in non-interest-bearing Nominee Accounts under CBN Mobile Money Guidelines Section 9. Exact account titles and daily reconciliation logs: \`[NEEDS_INTERNAL_EVIDENCE]\`.
- **Q3 (NDPA 2023 & NDPC CAR):** The statutory annual CAR filing deadline is **31 March** under NDPC GAID 2025. Evidence of DPO appointment and CAR submission: \`[NEEDS_INTERNAL_EVIDENCE]\`.
- **Q4 (NFIU Reporting):** Under MLPPA 2022 Section 7 (24-hour STR), Section 11 (7-day CTR), and Section 8 (at least 5-year retention), filings are submitted via goAML.

### Part B — Urgent CBN Supervisory Inquiry Response
- **Statutory Redress Timelines:** Unauthorised debits are governed by Cybercrimes (Prohibition, Prevention, etc.) Act 2015 Section 37(3) (72 hours from written notice), while failed NIP reversals follow CBN Instant EFT Regulation 2018 Section 5.2(8) and Section 11.
- **Root-Cause Workstreams (Hypotheses to Verify):** Reconciliation logs and settlement timestamps are pending engineering verification (\`[NEEDS_INTERNAL_EVIDENCE]\`).

### Pre-Submission Sign-Off Checklist
- CEO, CCO/MLRO, CFO, and CISO verification required prior to dispatch.

### Submission Annexures Schedule
- Annexure A: Signed Nominee Account Mandate \`[insert attachment ref]\`
- Annexure B: Reconciled NIP Settlement Log \`[insert attachment ref]\``;

    const result = runBenchmark({ benchmarkCase, outputMarkdown: goldOutput });
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.hardGateFailures).toEqual([]);
  });

  it("GB-04 [CROSS_BORDER_COMPARISON]: passes multi-jurisdiction matrix precision with verified URL grounding", () => {
    const benchmarkCase: GoldenBenchmarkCase = {
      id: "GB-04",
      name: "Cross-Border Regulatory Matrix — Nigeria vs. Kenya vs. Ghana",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
      expectedWorkflowId: "CROSS_BORDER_COMPARISON",
      userPrompt:
        "Build a cross-border regulatory comparison matrix for launching a payment wallet and remittance product across Nigeria, Kenya, and Ghana.",
      searchJurisdictions: ["NG", "KE", "GH"],
      requiredStatutoryAnchors: ["CBN", "CBK", "BoG", "paid-up", "escrow", "resident"],
      minPassScore: 90,
    };

    const goldOutput = `### Side-by-Side Cross-Border Regulatory Comparison Matrix
| Pillar | Nigeria (CBN) | Kenya (CBK) | Ghana (BoG) |
| :--- | :--- | :--- | :--- |
| Primary License Class | MMO / PSSP | Payment Service Provider (PSP) | Dedicated Electronic Money Issuer (DEMI) |
| Paid-Up Capital vs. Escrow | Separate minimum paid-up share capital and refundable CBN escrow deposit | Paid-up capital separate from trust float | Minimum paid-up capital under Payment Systems and Services Act |
| Local Equity & Resident Governance | Local incorporation and CBN-approved resident directors | Local subsidiary with resident leadership | Minimum local equity shareholding and resident CEO requirement |

### Pillar-by-Pillar Regulatory Breakdown
- **Licensing & Settlement:** Official guidance is published on [Central Bank of Nigeria](https://www.cbn.gov.ng/payments) and [Bank of Ghana](https://www.bog.gov.gh/payment-systems).
- **Data Residency & FX Governance:** Distinguish circular issuance dates from effective compliance deadlines across Nigeria, Kenya, and Ghana.`;

    const result = runBenchmark({
      benchmarkCase,
      outputMarkdown: goldOutput,
      allowedLiveUrls: [
        "https://www.cbn.gov.ng/payments",
        "https://www.bog.gov.gh/payment-systems",
      ],
    });
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.hardGateFailures).toEqual([]);
  });

  it("GB-05 [FULL_COMPLIANCE_AUDIT]: passes 8-section Campaign Clearance Memo with locked APR/EAR, KFS & ARCON gate", () => {
    const benchmarkCase: GoldenBenchmarkCase = {
      id: "GB-05",
      name: "Marketing Clearance Memo — 30-Day MFB Loan Flyer & Influencer Script",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
      expectedWorkflowId: "FULL_COMPLIANCE_AUDIT",
      userPrompt:
        'Audit this loan flyer copy: "Get ₦100,000 instant cash in 5 minutes! Only 4% interest, 5% upfront fee, repay in 30 days. Win an iPhone!"',
      expectedLockedFigures: ["₦95,000", "₦104,000", "115.26%"],
      requiredStatutoryAnchors: [
        "CBN Guide to Charges 2020",
        "ARCON Act 2022 Section 54",
        "FCCPC",
        "NDIC",
        "cooling-off",
      ],
      minPassScore: 90,
    };

    const goldOutput = `### Clearance Decision & Executive Summary
**HOLD — DO NOT PUBLISH.** The draft flyer charges a 5% upfront fee exceeding the 1% maximum MFB processing cap under CBN Guide to Charges 2020 Part 2(A) Section 2.6 and omits mandatory ARCON ASP pre-exposure approval under ARCON Act 2022 Section 54.

### Line-by-Line Statutory Audit Tables
#### Table 2A: Headline, Pricing & Fees
| Asset / Line | Exact Claim | Issue | Governing Rule | Required Fix |
| :--- | :--- | :--- | :--- | :--- |
| Flyer Hero | 5% upfront fee | Exceeds 1% MFB cap | CBN Guide to Charges 2020 | Reduce fee to no more than 1% |
| Promo Giveaway | Win an iPhone | Unregistered sales promo | FCCPC Sales Promotion Regulations | Hold pending 21-day FCCPC registration |

### NDIC & Regulatory-Status Disclosure Analysis
NDIC covers eligible deposits up to ₦2,000,000 per depositor for MFBs and never insures loan products.

### Deterministic APR & Cash-Flow Verification
For a ₦100,000 loan with 5% upfront deduction, Net Disbursed Cash is **₦95,000**, Total Repayment is **₦104,000**, and Simple Annualised Nominal APR on Net Cash is **115.26%**.

### Key Facts Statement (KFS) — Redesigned Compliant Schedule
Includes mandatory non-offer preamble, 2-working-day draft contract review, 3-working-day cooling-off right under CBN CPR 2019 Regulation 4.3.6, and 3-day default grace period.

### Rewritten Compliant Campaign Copy
Apply for an MFB personal loan subject to eligibility verification. Processing fee does not exceed 1%. Full APR and repayment schedule disclosed in your Key Facts Statement prior to acceptance.

### ARCON Substantiation & Release Gate
Obtain ARCON ASP Form 001 pre-exposure approval and CCO sign-off prior to publication.`;

    const result = runBenchmark({ benchmarkCase, outputMarkdown: goldOutput });
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.hardGateFailures).toEqual([]);
  });

  it("GB-06 [CONVERSATIONAL_ADVISORY]: passes warm plain-English advisor tone with zero AI jargon", () => {
    const benchmarkCase: GoldenBenchmarkCase = {
      id: "GB-06",
      name: "Executive Greeting & Plain-English Capabilities",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
      expectedWorkflowId: "CONVERSATIONAL_ADVISORY",
      userPrompt: "Hi, what can you help our compliance team with?",
      requiredStatutoryAnchors: ["campaigns", "policies"],
      minPassScore: 90,
    };

    const goldOutput = `Hello. I help compliance, legal, and product teams clear promotional campaigns before launch, verify loan APR and fee disclosures, structure new financial products and cross-border expansions, redline internal policies against current circulars, and draft evidence-backed responses to sponsor bank or regulator inquiries.`;

    const result = runBenchmark({ benchmarkCase, outputMarkdown: goldOutput });
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBe(100);
  });

  describe("Adversarial Anti-Wrapper Failure Gates", () => {
    it("FAILS immediately when an output leaks internal XML tags, raw UUIDs, or ungrounded URLs", () => {
      const benchmarkCase: GoldenBenchmarkCase = {
        id: "ADV-01",
        name: "Adversarial Leakage & Hallucinated URL Gate",
        roleId: COMPLIANCE_OFFICER_ROLE_ID,
        expectedWorkflowId: "REGULATORY_LOOKUP",
        userPrompt: "What are the CBN rules on APR disclosure?",
        requiredStatutoryAnchors: ["CBN"],
        minPassScore: 85,
      };

      const badOutput = `According to <verified_statutory_vault> and clause [d156429b-1111-4222-8333-444455556666], see https://hallucinated-cbn-circular.example.com/fake.pdf for CBN APR rules 🚀.`;

      const result = runBenchmark({
        benchmarkCase,
        outputMarkdown: badOutput,
        allowedLiveUrls: [],
      });

      expect(result.passed).toBe(false);
      expect(result.hardGateFailures.length).toBeGreaterThanOrEqual(3);
      expect(result.hardGateFailures.some((f) => f.includes("XML"))).toBe(true);
      expect(result.hardGateFailures.some((f) => f.includes("UUID"))).toBe(true);
      expect(result.hardGateFailures.some((f) => f.includes("ungrounded external URL"))).toBe(true);
    });

    it("FAILS immediately when a policy redline weakens NFIU 5-year retention or NDPC 72-hour breach notice", () => {
      const benchmarkCase: GoldenBenchmarkCase = {
        id: "ADV-02",
        name: "Adversarial Weakened Statutory Legal Floor Gate",
        roleId: COMPLIANCE_OFFICER_ROLE_ID,
        expectedWorkflowId: "POLICY_GAP_REDLINE",
        userPrompt: "Redline our AML & Privacy policy against CBN and NDPA rules.",
        requiredStatutoryAnchors: ["NDPA"],
        minPassScore: 85,
      };

      const badOutput = `### Executive Decision
APPROVE. The institution shall retain AML transaction records for 2 years and notify the NDPC within 14 days of a data breach.`;

      const result = runBenchmark({ benchmarkCase, outputMarkdown: badOutput });
      expect(result.passed).toBe(false);
      expect(result.hardGateFailures.some((f) => f.includes("NFIU"))).toBe(true);
      expect(result.hardGateFailures.some((f) => f.includes("NDPC"))).toBe(true);
    });

    it("FAILS immediately when a Supervisory DDQ response fabricates root causes or omits [NEEDS_INTERNAL_EVIDENCE]", () => {
      const benchmarkCase: GoldenBenchmarkCase = {
        id: "ADV-03",
        name: "Adversarial DDQ Fabrication Gate",
        roleId: COMPLIANCE_OFFICER_ROLE_ID,
        expectedWorkflowId: "SUPERVISORY_DDQ_RESPONSE",
        userPrompt: "Draft our urgent CBN supervisory inquiry response on failed NIP transfers.",
        hasInternalKnowledgeRefs: false,
        requiredStatutoryAnchors: ["CBN"],
        minPassScore: 85,
      };

      const badOutput = `### Supervisory Response
Our investigation confirmed a database migration deadlock caused the incident, and all 318 affected customers have been fully refunded under CBN guidelines.`;

      const result = runBenchmark({ benchmarkCase, outputMarkdown: badOutput });
      expect(result.passed).toBe(false);
      expect(
        result.hardGateFailures.some((f) => f.includes("[NEEDS_INTERNAL_EVIDENCE]"))
      ).toBe(true);
      expect(
        result.hardGateFailures.some((f) => f.includes("Fabricated"))
      ).toBe(true);
    });

    it("penalizes exposed AI/engineering jargon and § symbol violations in Executive Voice", () => {
      const benchmarkCase: GoldenBenchmarkCase = {
        id: "ADV-04",
        name: "Adversarial AI Jargon & ACPC Voice Gate",
        roleId: COMPLIANCE_OFFICER_ROLE_ID,
        expectedWorkflowId: "CONVERSATIONAL_ADVISORY",
        userPrompt: "Hi, what can you do?",
        requiredStatutoryAnchors: [],
        minPassScore: 90,
      };

      const badOutput = `# What Can I Do
I am Cogent's Autonomous Workflow Engine using a canonical computation engine and Studio Canvas artifacts to check CBN CPF §4.2 for $100 fees.`;

      const result = runBenchmark({ benchmarkCase, outputMarkdown: badOutput });
      expect(result.passed).toBe(false);
      const voiceDim = result.dimensions.find((d) => d.dimension === "EXECUTIVE_VOICE_AND_ACPC");
      expect(voiceDim?.passed).toBe(false);
      expect(voiceDim?.findings.length).toBeGreaterThanOrEqual(4);
    });
  });
});
