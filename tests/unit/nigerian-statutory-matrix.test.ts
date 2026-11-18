/**
 * Cogent Regulatory Intelligence Platform
 * Stage 3 Policy & SOP Statutory Gap Redline Matrix, Multi-Facet Query Decomposer & Guardrail Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NIGERIAN_MANDATORY_OPERATIONAL_CLOCKS,
  NIGERIAN_SOP_SUBCLAUSE_TEMPLATES,
  NIGERIAN_STATUTORY_PROVISIONS,
  decomposePromptIntoSearchFacets,
  matchAuthoritativeNigerianProvisions,
} from "@/modules/regulatory-vault/nigerian-statutory-matrix";
import { GuardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";
import { StatutoryToolExecutor } from "@/modules/ai-orchestration/tools/statutory-tools";

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [] }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
  }),
}));

vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.01)),
  },
}));

const NEXAPAY_SOP_PROMPT = `NEXAPAY TECHNOLOGIES LIMITED — INTERNAL COLLECTIONS, DATA PRIVACY & COMPLAINTS SOP (v1.0)
Section 1 (Consent & Permissions): All app users must accept bundled Terms & Privacy Policy at sign-up, granting perpetual, irrevocable consent for NexaPay to harvest device contacts, SMS inbox, call logs, GPS location, and photo gallery. Opt-out is unavailable.
Section 2 (Debt Collection Escalation): Day 1-2 overdue: Automated SMS + 1.5% daily penalty interest. Day 3-5 overdue: Collections agents send WhatsApp/SMS notices to borrower's top 10 phonebook contacts and employer HR asking them to urge repayment. Day 7+ overdue: Publish borrower's full name, BVN, photo, and debt status on "NexaPay Defaulters Wall" social media handle.
Section 3 (Data Retention & Breach Protocol): Customer BVN, NIN, bank statements, and contact logs are retained indefinitely on AWS US-East (Virginia) servers even after account closure. In the event of a data breach, Engineering shall investigate internally and notify NDPC within 30 days if media coverage occurs.
Section 4 (Customer Complaint & Fraud Redress): Customers submit disputes via email only. Support has 5 business days to acknowledge and up to 30 business days to resolve failed transfers or unauthorized debits.
Section 5 (AML/CFT & Suspicious Transactions): Agents may waive BVN/NIN verification for VIP referrals up to NGN 5,000,000. Suspicious transactions exceeding NGN 10,000,000 are reviewed quarterly and reported to NFIU at month-end.

Cross-reference against:
1. FCCPC Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations 2025 (DEON).
2. Nigeria Data Protection Act (NDPA) 2023 and NDPC General Application and Implementation Directive (GAID).
3. CBN Consumer Protection Regulations & Guide to Charges.
4. CBN AML/CFT/CPF Regulations & NFIU reporting mandates.`;

describe("Stage 3 Policy & SOP Statutory Gap Redline Precision & Retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decomposes long 5-section SOP prompts end-to-end without truncating trailing sections or statutes", () => {
    const decomposed = decomposePromptIntoSearchFacets(NEXAPAY_SOP_PROMPT, "NG");
    expect(decomposed.facetQueries.length).toBeGreaterThanOrEqual(5);

    const facetIds = decomposed.facetQueries.map((f) => f.facetId);
    expect(facetIds).toContain("ng-consent-permissions");
    expect(facetIds).toContain("ng-collections-penalties");
    expect(facetIds).toContain("ng-fccpc-deon-lending");
    expect(facetIds).toContain("ng-retention-breach-localisation");
    expect(facetIds).toContain("ng-complaints-eft-redress");
    expect(facetIds).toContain("ng-aml-kyc-nfiu");

    expect(decomposed.primaryVaultQuery).toContain("Section 2.5");
    expect(decomposed.primaryVaultQuery).toContain("MLPPA 2022");
    expect(decomposed.primaryVaultQuery).toContain("Instant EFT");
  });

  it("enforces exact NDPA 2023 Sections 25/26(2) vs 35 and GAID 2025 commencement distinctions", () => {
    const sub11 = NIGERIAN_SOP_SUBCLAUSE_TEMPLATES.find((t) => t.subClauseId === "1.1");
    const sub12 = NIGERIAN_SOP_SUBCLAUSE_TEMPLATES.find((t) => t.subClauseId === "1.2");
    expect(sub11?.statutoryBreaches.join(" ")).toContain("Section 26(2)");
    expect(sub11?.statutoryBreaches.join(" ")).toContain("19 Sept 2025");
    expect(sub12?.statutoryBreaches.join(" ")).toContain("Section 35");
    expect(sub12?.statutoryBreaches.join(" ")).toContain("Article 17");
  });

  it("catches the embedded 1.5% daily penalty rate trap against CBN Guide to Charges Part 2(A) Section 2.5 & Footnote 3", () => {
    const sub21 = NIGERIAN_SOP_SUBCLAUSE_TEMPLATES.find((t) => t.subClauseId === "2.1");
    expect(sub21).toBeDefined();
    expect(sub21?.statutoryBreaches.join(" ")).toContain("Part 2(A), Section 2.5 & Footnote 3");
    expect(sub21?.statutoryBreaches.join(" ")).toContain("1% flat per month");
    expect(sub21?.statutoryBreaches.join(" ")).toContain("3-day grace period");
    expect(sub21?.statutoryBreaches.join(" ")).toContain("Reg. 4.6(b)");
  });

  it("covers all 21 atomic sub-clauses across Sections 1-5 and all 16 mandatory operational clocks", () => {
    const ids = NIGERIAN_SOP_SUBCLAUSE_TEMPLATES.map((t) => t.subClauseId);
    expect(ids).toEqual([
      "1.1", "1.2", "1.3", "1.4",
      "2.1", "2.2", "2.3", "2.4",
      "3.1", "3.2", "3.3", "3.4",
      "4.1", "4.2", "4.3", "4.4",
      "5.1", "5.2", "5.3", "5.4", "5.5",
    ]);

    expect(NIGERIAN_MANDATORY_OPERATIONAL_CLOCKS.length).toBeGreaterThanOrEqual(16);
    const clockText = JSON.stringify(NIGERIAN_MANDATORY_OPERATIONAL_CLOCKS);
    expect(clockText).toContain("Reg. 3.2.6");
    expect(clockText).toContain("10 minutes");
    expect(clockText).toContain("48 hours");
    expect(clockText).toContain("1 January 2027");
    expect(clockText).toContain("Section 11");
    expect(clockText).toContain("USD 10,000");
  });

  it("hydrates comparePolicyAgainstRegulation with full statutory matrix, subclause diffs, and official regulator links", async () => {
    const executor = new StatutoryToolExecutor();
    const res = await executor.comparePolicyAgainstRegulation(
      {
        policy_text: NEXAPAY_SOP_PROMPT,
        regulation_query: NEXAPAY_SOP_PROMPT,
      },
      { tenantId: "tenant_test", userId: "user_test" }
    );

    expect(res.success).toBe(true);
    const benchmarks = res.statutory_benchmarks as Array<Record<string, unknown>>;
    expect(benchmarks.length).toBeGreaterThanOrEqual(15);

    const subclauseMatrix = res.subclause_gap_matrix as Array<Record<string, unknown>>;
    expect(subclauseMatrix).toHaveLength(21);

    const scopeGuidance = (res.institutional_scope_guidance as string[]).join(" ");
    expect(scopeGuidance).toContain("PSSP vs. Licensed Lender of Record");
    expect(scopeGuidance).toContain("CBN AML/CFT/CPF Regulations 2022");
    expect(scopeGuidance).toContain("21 July 2025");
    expect(scopeGuidance).toContain("19 September 2025");

    const officialRefs = res.official_regulator_references as Array<{ id: string }>;
    expect(officialRefs.length).toBe(matchAuthoritativeNigerianProvisions(NEXAPAY_SOP_PROMPT, 20).length);
  });

  it("allows quoting 'notify NDPC within 30 days' in Column 2 Current Non-Compliant Text of a Policy Redline table without triggering false-positive legal floor warnings", async () => {
    const validator = new GuardrailValidator();
    const compliantRedlineMarkdown = [
      "| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |",
      "| --- | --- | --- | --- | --- |",
      "| 3.1 | Retain customer BVN indefinitely | NDPA Section 24(1)(d) & MLPPA Section 8 | 3.1 Retain KYC records for five (5) years post-closure then securely delete. | MLPPA 2022 Section 8 |",
      "| 3.3 | Notify NDPC within 30 days if media coverage occurs | NDPA 2023 Section 40(2) | 3.3 Notify the NDPC within 72 hours of breach awareness regardless of media coverage. | NDPA 2023 Section 40(2) |",
    ].join("\n");

    const res = await validator.validateWorkProduct(
      {
        workflow_type: "POLICY_GAP_REDLINE",
        markdown_content: compliantRedlineMarkdown,
        citations: [
          {
            source_class: "VERIFIED_OFFICIAL_SOURCE",
            badge_label: "Verified Statutory Vault",
            instrument_title: NIGERIAN_STATUTORY_PROVISIONS[0]!.documentTitle,
            regulatory_clause_id: NIGERIAN_STATUTORY_PROVISIONS[0]!.id,
          },
        ],
      },
      { tenantId: "tenant_test" }
    );

    expect(res.passed).toBe(true);
    expect(res.guardrail_report.legal_floor_warnings).toHaveLength(0);
    expect(res.guardrail_report.stripped_vault_ids).toHaveLength(0);
  });

  it("does not hardcode test company names or blindly trigger fintech subclauses on unrelated policies with Sections 1-5", async () => {
    const serializedTemplates = JSON.stringify(NIGERIAN_SOP_SUBCLAUSE_TEMPLATES);
    expect(serializedTemplates.toLowerCase()).not.toContain("nexapay");

    const unrelatedPolicy = `ACME LOGISTICS NIGERIA — VENDOR PROCUREMENT & FLEET SAFETY POLICY
Section 1 (Scope): Applies to warehouse and delivery drivers.
Section 2 (Vehicle Inspection): Pre-trip brake and tire checks required daily.
Section 3 (Fuel Cards): Fuel receipts must be submitted weekly.
Section 4 (Uniforms): High-visibility vests mandatory in loading bays.
Section 5 (Ethics): No supplier gifts exceeding NGN 20,000.`;

    const executor = new StatutoryToolExecutor();
    const res = await executor.comparePolicyAgainstRegulation(
      {
        policy_text: unrelatedPolicy,
        regulation_query: "Vendor procurement and fleet safety policy review",
      },
      { tenantId: "tenant_test", userId: "user_test" }
    );

    const subclauseMatrix = res.subclause_gap_matrix as Array<Record<string, unknown>>;
    expect(subclauseMatrix).toHaveLength(0);
  });
});
