import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deduplicateCitations,
  formatSourceEntry,
} from "@/lib/ai/citation-formatter";
import {
  buildFallbackFollowUps,
  generateContextualFollowUps,
} from "@/modules/conversations/follow-up.generator";
import type { CitationItem, StructuredComplianceReport } from "@/contracts/conversation.contracts";

describe("Citation Formatter & Source Grouping", () => {
  it("deduplicates duplicate CBN clause references, URL trailing slashes, and cleans OCR stutter", () => {
    const raw: CitationItem[] = [
      {
        source_class: "VERIFIED_OFFICIAL_SOURCE",
        badge_label: "VERIFIED STATUTE",
        regulator: "CBN",
        instrument_title: "CBN Consumer Protection Framework",
        clause_reference: "Paragraph 5",
        regulatory_clause_id: "clause-1",
      },
      {
        source_class: "VERIFIED_OFFICIAL_SOURCE",
        badge_label: "VERIFIED STATUTE",
        regulator: "CBN",
        clause_reference: "Paragraph 5",
        regulatory_clause_id: "clause-2",
      },
      {
        source_class: "VERIFIED_OFFICIAL_SOURCE",
        badge_label: "VERIFIED STATUTE",
        regulator: "ARCON",
        instrument_title: "ARCON Act 2022",
        clause_reference: "35.35.AnAn advertiser,advertiser, must vet",
        regulatory_clause_id: "clause-3",
      },
      {
        source_class: "LIVE_WEB_INTELLIGENCE",
        badge_label: "OFFICIAL WEB",
        trust_tier: "OFFICIAL_REGULATOR_WEB",
        page_title: "Payments System Supervision | Central Bank",
        retrieved_url: "https://www.cbn.gov.ng/payments-system/",
      },
      {
        source_class: "LIVE_WEB_INTELLIGENCE",
        badge_label: "OFFICIAL WEB",
        trust_tier: "OFFICIAL_REGULATOR_WEB",
        page_title: "Payments System Supervision",
        retrieved_url: "https://cbn.gov.ng/payments-system",
      },
    ];

    const deduped = deduplicateCitations(raw);
    expect(deduped).toHaveLength(3);
    expect(deduped[1]?.clause_reference).toBe("Section 35");
  });

  it("replaces noisy scraped web titles with clean slug + domain titles while preserving rich titles", () => {
    const noisyAuthor = formatSourceEntry({
      source_class: "LIVE_WEB_INTELLIGENCE",
      badge_label: "LIVE WEB",
      trust_tier: "GENERAL_LIVE_WEB",
      page_title: "Adewale F.",
      retrieved_url: "https://fintechlaw.ng/articles/cbn-psb-capital-requirements",
    });
    expect(noisyAuthor.primaryTitle).toBe("Cbn Psb Capital Requirements");
    expect(noisyAuthor.hostname).toBe("fintechlaw.ng");
    expect(noisyAuthor.tierGroup).toBe("LEGAL_AND_PRESS");

    const truncatedGuide = formatSourceEntry({
      source_class: "LIVE_WEB_INTELLIGENCE",
      badge_label: "OFFICIAL WEB",
      trust_tier: "OFFICIAL_REGULATOR_WEB",
      page_title: "This guide provides the requirements f...",
      retrieved_url: "https://www.bog.gov.gh/licensing/payment-service-providers-guidelines/",
    });
    expect(truncatedGuide.primaryTitle).toBe("Payment Service Providers Guidelines");
    expect(truncatedGuide.hostname).toBe("bog.gov.gh");
    expect(truncatedGuide.tierGroup).toBe("OFFICIAL_REGULATOR_WEB");

    const vaultEntry = formatSourceEntry({
      source_class: "VERIFIED_OFFICIAL_SOURCE",
      badge_label: "VERIFIED STATUTE",
      regulator: "CBN",
      instrument_title: "CBN CPF 2016",
      clause_reference: "§ 4.2.1",
      regulatory_clause_id: "clause-cbn-421",
    });
    expect(vaultEntry.tierGroup).toBe("STATUTORY_VAULT");
    expect(vaultEntry.primaryTitle).toBe("CBN CPF 2016 — Section 4.2.1");
    expect(vaultEntry.primaryTitle).not.toContain("§");
  });
});

describe("Contextual Follow-Up Generator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty suggestions for pure greetings or trivial replies", async () => {
    const res = await generateContextualFollowUps({
      userPrompt: "Hello!",
      responseText: "Good morning! How can I assist you with your compliance review today?",
      hasCustomAiClient: true,
    });
    expect(res).toEqual([]);
  });

  it("produces grounded workflow + question follow-ups for cross-border prompts and excludes already-created workflows", () => {
    const followUps = buildFallbackFollowUps({
      userPrompt:
        "We want to expand NexaPay Borderless into Nigeria, Kenya, Ghana, and South Africa. Compare licensing and data rules.",
      responseText:
        "### Multi-Market Regulatory Comparison\n\nExpanding payments infrastructure across Nigeria (CBN & NDPC), Kenya (CBK & ODPC), Ghana (Bank of Ghana & DPC), and South Africa (SARB & FSCA) requires separate local entity licensing. Regulatory passporting is prohibited.",
      jurisdictions: ["NG", "KE", "GH", "ZA"],
      workProductWorkflowType: "CROSS_BORDER_COMPARISON",
    });

    expect(followUps.length).toBeGreaterThanOrEqual(3);
    expect(followUps.some((f) => f.kind === "workflow")).toBe(true);
    expect(followUps.some((f) => f.kind === "question")).toBe(true);
    // Should not recommend CROSS_BORDER_COMPARISON again since it was just built
    expect(followUps.some((f) => f.workflow_hint === "CROSS_BORDER_COMPARISON")).toBe(false);
    for (const item of followUps) {
      expect(item.label).not.toContain("§");
      expect(item.label.length).toBeLessThanOrEqual(130);
    }
  });

  it("produces campaign remediation follow-ups when a structured compliance audit flags holds", () => {
    const mockReport = {
      pre_flight_gate: {
        verdict: "BLOCK",
        risk_score: 88,
        lock_summary: {
          lock1_prohibited_terms: "FAIL",
          lock2_product_rate_match: "FAIL",
          lock3_mandatory_disclosures: "FAIL",
          total_breaches: 3,
        },
      },
      blind_spot_findings: [
        {
          finding_code: "APR_DRIP_PRICING",
          severity: "CRITICAL",
          what_you_missed: "Upfront processing fee omitted from effective APR",
          what_it_costs_you: "FCCPC sanction",
          one_click_fix: "Disclose Effective APR",
          violated_statute: "FCCPA 2018 Section 115",
          exact_quote: "0% fee instant loan",
        },
      ],
      artifacts: {},
      campaign_context: {
        product_name: "QuickCash Nano",
      },
    } as StructuredComplianceReport;

    const followUps = buildFallbackFollowUps({
      userPrompt: "Audit our QuickCash Nano Instagram ad copy",
      responseText:
        "HOLD BEFORE PUBLISHING. QuickCash Nano ad copy violates FCCPA 2018 Section 115 and CBN Consumer Protection Framework APR disclosure requirements.",
      structuredReport: mockReport,
      productName: "QuickCash Nano",
    });

    expect(followUps.length).toBeGreaterThanOrEqual(3);
    expect(followUps[0]?.kind).toBe("workflow");
    expect(followUps.some((f) => f.label.includes("QuickCash Nano"))).toBe(true);
  });
});
