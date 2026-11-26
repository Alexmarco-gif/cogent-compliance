import { describe, it, expect } from "vitest";
import {
  CreateResourcePostSchema,
  isSafeResourceUrl,
} from "@/contracts/resources.contracts";
import {
  PLAYBOOK_TEMPLATES,
  buildDeterministicAtomizationKit,
  calculatePriorityScore,
  computePillarMix,
  evaluateResourceSeoAndQa,
  extractMarkdownHeadings,
  isPostRefreshDue,
  splitMarkdownForMidArticleCta,
} from "@/modules/resources/resources-playbook.helpers";

describe("Master Content Operations & SEO Playbook Engine", () => {
  it("allows safe internal canonical paths and official URLs while rejecting hostile URLs", () => {
    expect(isSafeResourceUrl("/solutions/aml-compliance-banks-fintechs-nigeria")).toBe(true);
    expect(isSafeResourceUrl("/resources/insights/cbn-data-localization")).toBe(true);
    expect(isSafeResourceUrl("/sign-up")).toBe(true);
    expect(isSafeResourceUrl("#frequently-asked-questions")).toBe(true);
    expect(isSafeResourceUrl("https://www.cbn.gov.ng/Out/2026/circular.pdf")).toBe(true);

    expect(isSafeResourceUrl("//evil.example.com/phish")).toBe(false);
    expect(isSafeResourceUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeResourceUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeResourceUrl("/resources/../../etc/passwd")).toBe(false);
  });

  it("computes the 3-Factor Priority Score and Greenlight threshold (>= 11/15)", () => {
    expect(calculatePriorityScore(5, 5, 4)).toEqual({
      total: 14,
      max: 15,
      greenlit: true,
      hasAllFactors: true,
    });
    expect(calculatePriorityScore(4, 3, 3)).toEqual({
      total: 10,
      max: 15,
      greenlit: false,
      hasAllFactors: true,
    });
    expect(calculatePriorityScore(5, 5, null).greenlit).toBe(false);
  });

  it("evaluates all 12 Maker-Checker QA gates accurately", () => {
    const tpl = PLAYBOOK_TEMPLATES.pillar_1_circular;
    const report = evaluateResourceSeoAndQa({
      title: "CBN Data Localization Deadline Nigeria: Fintech Checklist",
      slug: "cbn-data-localization-deadline-nigeria",
      excerpt:
        "Complete CBN data localization deadline Nigeria compliance checklist for PSSPs, MMOs, and banks covering NDPA 2023 and technical controls.",
      primaryKeyword: "CBN data localization deadline Nigeria",
      seoTitle: "CBN Data Localization Deadline Nigeria Checklist | Cogent",
      seoDescription:
        "Complete CBN data localization deadline Nigeria compliance checklist for PSSPs, MMOs, and banks covering NDPA 2023 and technical controls.",
      bodyMarkdown: `**Bottom Line Up Front:** Under the CBN data localization deadline Nigeria mandate, all PSSPs, MMOs, and banks must align local hosting with [CBN](https://www.cbn.gov.ng/) and [NDPC](https://ndpc.gov.ng/) rules.

${tpl.bodyMarkdown}`,
      faqItems: tpl.starterFaqs,
      midArticleCta: tpl.defaultCta,
      showLegalDisclaimer: true,
      qaChecklist: {
        statutoryAccuracyVerified: true,
        repealedRuleChecked: true,
        reviewerName: "CCO Reviewer",
      },
      authoritativeSources: [
        { title: "CBN Payment Data Circular", url: "https://www.cbn.gov.ng/circular" },
        { title: "NDPA 2023", url: "https://ndpc.gov.ng/ndpa-2023" },
      ],
    });

    expect(report.totalCount).toBe(12);
    expect(report.passedCount).toBe(12);
    expect(report.readyToPublish).toBe(true);
    expect(report.internalLinkCount).toBeGreaterThanOrEqual(3);
    expect(report.govOutlinkCount).toBeGreaterThanOrEqual(2);
  });

  it("splits markdown for mid-article CTA at {{CTA}} marker or automatically before 3rd H2", () => {
    const explicit = splitMarkdownForMidArticleCta("Intro\n\n{{CTA}}\n\nRest");
    expect(explicit.before).toBe("Intro");
    expect(explicit.after).toBe("Rest");

    const autoSplit = splitMarkdownForMidArticleCta(
      "Intro\n\n## Section 1\nBody 1\n\n## Section 2\nBody 2\n\n## Section 3\nBody 3",
    );
    expect(autoSplit.before).toContain("## Section 2");
    expect(autoSplit.after).toContain("## Section 3");
  });

  it("extracts deterministic collision-safe heading IDs for Auto-TOC", () => {
    const headings = extractMarkdownHeadings(
      "## Overview\n### Checklist\n## Overview\n```md\n## Ignored In Code Fence\n```",
    );
    expect(headings).toEqual([
      { level: 2, text: "Overview", id: "overview" },
      { level: 3, text: "Checklist", id: "checklist" },
      { level: 2, text: "Overview", id: "overview-2" },
    ]);
  });

  it("flags published posts due for 30-day freshness refresh and computes 40/30/20/10 pillar mix", () => {
    const now = new Date("2026-11-25T00:00:00Z");
    const stale = isPostRefreshDue(
      {
        status: "published",
        publishedAt: "2026-10-01T00:00:00Z",
        lastStatutoryAuditAt: null,
        refreshDueAt: null,
        effectiveDate: null,
      },
      now,
    );
    expect(stale.due).toBe(true);

    const fresh = isPostRefreshDue(
      {
        status: "published",
        publishedAt: "2026-11-20T00:00:00Z",
        lastStatutoryAuditAt: "2026-11-20T00:00:00Z",
        refreshDueAt: "2026-12-20T00:00:00Z",
        effectiveDate: null,
      },
      now,
    );
    expect(fresh.due).toBe(false);

    const mix = computePillarMix([
      { status: "published", contentPillar: "pillar_1_circular" },
      { status: "published", contentPillar: "pillar_1_circular" },
      { status: "published", contentPillar: "pillar_2_jtbd" },
      { status: "published", contentPillar: "pillar_3_license" },
      { status: "draft", contentPillar: "pillar_4_comparison" },
    ]);
    expect(mix.totalTagged).toBe(4);
    expect(mix.entries.find((e) => e.pillar === "pillar_1_circular")?.actualPercent).toBe(50);
  });

  it("generates canonical /resources/[category]/[slug] URLs in 1-to-7 atomization kit (never /blog/)", () => {
    const kit = buildDeterministicAtomizationKit({
      title: "FCCPC Digital Lending Checklist",
      excerpt: "Pass FCCPC DEON registration fast.",
      bodyMarkdown: "## Registration Steps\n## Penalties",
      category: "insights",
      slug: "fccpc-digital-lending-checklist",
      circularCode: "DEON-2025",
      regulators: ["FCCPC", "NDPC"],
    });

    const expectedUrl = "https://stem-cogent.com/resources/insights/fccpc-digital-lending-checklist";
    expect(kit.linkedinCarousel).toContain(expectedUrl);
    expect(kit.founderLinkedinPost).toContain(expectedUrl);
    expect(kit.twitterThread).toContain(expectedUrl);
    expect(kit.newsletterBrief).toContain(expectedUrl);
    expect(kit.salesBattlecard).toContain(expectedUrl);
    expect(kit.twitterThread).not.toContain("/blog/");
  });

  it("validates a complete Playbook Ops create payload via CreateResourcePostSchema", () => {
    const parsed = CreateResourcePostSchema.safeParse({
      title: "CBN Data Localization Mandate: Complete Checklist",
      category: "insights",
      status: "draft",
      workflowStage: "sme_review",
      contentPillar: "pillar_1_circular",
      targetPersona: "cco_mlro",
      workflowTrack: "track_a_rapid_48h",
      primaryKeyword: "CBN data localization deadline Nigeria",
      secondaryKeywords: ["local hosting fintech Nigeria", "NDPA 2023"],
      priorityUrgency: 5,
      priorityCommercial: 5,
      priorityWinnability: 4,
      circularCode: "PSM/DIR/PUB/CIR/001/045",
      regulators: ["CBN", "NDPC"],
      authoritativeSources: [
        { title: "NDPA 2023", code: "Section 41", url: "https://ndpc.gov.ng/" },
      ],
      faqItems: [
        {
          question: "Who must comply with CBN data localization rules?",
          answer:
            "All CBN-licensed commercial banks, MFBs, PSSPs, and MMOs processing Nigerian payment transactions.",
        },
      ],
      midArticleCta: {
        eyebrow: "WORKFLOW 02",
        headline: "Audit your Data Governance SOP in 5 minutes",
        description: "Upload your SOP to Cogent's isolated workspace.",
        buttonLabel: "Start Free Trial",
        buttonUrl: "/sign-up",
      },
      showLegalDisclaimer: true,
      qaChecklist: {
        statutoryAccuracyVerified: true,
        repealedRuleChecked: true,
        reviewerName: "Head of Compliance",
      },
    });

    expect(parsed.success).toBe(true);
  });
});
