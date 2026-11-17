import { describe, it, expect } from "vitest";
import {
  STUDIO_WORKFLOW_CASES,
  DAILY_WORKFLOW_LEDGER,
  DUAL_SEARCH_TRACKS,
  PLAN_STEPS,
  REGULATOR_METRICS,
  LICENSE_VERTICALS,
  COMPLIANCE_FAQS,
  CO_FOUNDERS,
} from "@/data/marketing-scenarios";

describe("Cogent Regulatory Intelligence & Marketing Scenarios", () => {
  it("provides all 5 core split-studio workflow cases including cross-border matrix", () => {
    expect(STUDIO_WORKFLOW_CASES).toHaveLength(5);
    expect(STUDIO_WORKFLOW_CASES.map((c) => c.id)).toEqual([
      "structuring",
      "policy",
      "inquiry",
      "crossborder",
      "marketing",
    ]);

    for (const item of STUDIO_WORKFLOW_CASES) {
      expect(item.userPrompt.length).toBeGreaterThan(20);
      expect(item.sourcesUsed.length).toBeGreaterThanOrEqual(3);
      expect(item.synthesisBullets.length).toBeGreaterThanOrEqual(2);
      expect(item.artifactSections.length).toBeGreaterThanOrEqual(1);
    }

    const crossborder = STUDIO_WORKFLOW_CASES.find((c) => c.id === "crossborder");
    expect(crossborder?.matrixRows?.length).toBeGreaterThanOrEqual(3);
  });

  it("maps the 5 daily workflow compressions, 3 search tracks, 7 regulators, 4 license verticals, and FAQs cleanly", () => {
    expect(DAILY_WORKFLOW_LEDGER).toHaveLength(5);
    expect(DUAL_SEARCH_TRACKS).toHaveLength(3);
    expect(PLAN_STEPS).toHaveLength(3);
    expect(REGULATOR_METRICS.map((r) => r.acronym)).toEqual([
      "CBN",
      "NDPC",
      "FCCPC",
      "SEC",
      "NFIU",
      "NDIC",
      "ARCON",
    ]);
    expect(LICENSE_VERTICALS).toHaveLength(4);
    for (const sector of LICENSE_VERTICALS) {
      expect(sector.workflowsAccelerated.length).toBeGreaterThanOrEqual(3);
      expect(sector.sampleCase.taskDescription.length).toBeGreaterThan(10);
      expect(sector.sampleCase.deliverable.length).toBeGreaterThan(10);
    }
    expect(COMPLIANCE_FAQS).toHaveLength(6);
    expect(new Set(COMPLIANCE_FAQS.map((f) => f.category))).toEqual(
      new Set(["Workflows", "Research", "Drafting", "Security"])
    );
  });

  it("defines both Stem Systems co-founders Odion O. Alex and Gift Chinedu Nduka cleanly", () => {
    expect(CO_FOUNDERS).toHaveLength(2);
    expect(CO_FOUNDERS.map((f) => f.name)).toEqual([
      "Odion O. Alex",
      "Gift Chinedu Nduka",
    ]);
    expect(CO_FOUNDERS[1]?.roleBadge).toContain("CSO");
    expect(CO_FOUNDERS[1]?.bio).toContain("Stem Systems");
  });
});
