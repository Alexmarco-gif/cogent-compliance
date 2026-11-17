import { describe, it, expect } from "vitest";
import {
  HERO_SCENARIOS,
  REGULATOR_METRICS,
  LICENSE_VERTICALS,
  WALKTHROUGH_STEPS,
  COMPARISON_ROWS,
  COMPLIANCE_FAQS,
} from "@/data/marketing-scenarios";
import {
  GOLDEN_50_INSTRUMENTS,
  REGULATORY_BODIES,
} from "@/modules/regulatory-vault/golden50.data";

describe("Marketing Scenarios & Statutory Metrics", () => {
  it("keeps regulator PDF metrics consistent with the 141 indexed statutory documents", () => {
    const totalPdfs = REGULATOR_METRICS.reduce((acc, item) => acc + item.sourceCount, 0);
    expect(REGULATOR_METRICS).toHaveLength(5);
    expect(totalPdfs).toBe(141);

    const acronyms = REGULATOR_METRICS.map((r) => r.acronym);
    expect(acronyms).toEqual(["CBN", "FCCPC", "SEC", "ARCON", "NDPC"]);
  });

  it("provides valid interactive hero scenarios with non-empty highlights and lower resolved risk", () => {
    expect(HERO_SCENARIOS).toHaveLength(3);
    for (const scenario of HERO_SCENARIOS) {
      expect(scenario.submittedCopy.toLowerCase()).toContain(
        scenario.flaggedPhrase.toLowerCase()
      );
      expect(scenario.resolvedRiskScore).toBeLessThan(scenario.riskScore);
      expect(scenario.rewriteHighlights.length).toBeGreaterThan(0);
      for (const h of scenario.rewriteHighlights) {
        expect(scenario.compliantRewrite.toLowerCase()).toContain(h.toLowerCase());
      }
    }
  });

  it("maps license verticals, walkthrough steps, comparison rows, and FAQs cleanly", () => {
    expect(LICENSE_VERTICALS).toHaveLength(4);
    expect(WALKTHROUGH_STEPS).toHaveLength(4);
    expect(COMPARISON_ROWS).toHaveLength(7);
    expect(COMPLIANCE_FAQS.length).toBeGreaterThanOrEqual(6);
  });

  it("ensures Golden 50 instruments align with the 5 canonical Nigerian regulatory bodies", () => {
    const validAcronyms = new Set(REGULATORY_BODIES.map((b) => b.acronym));
    expect(validAcronyms.size).toBe(5);
    expect(GOLDEN_50_INSTRUMENTS.length).toBeGreaterThanOrEqual(30);

    for (const inst of GOLDEN_50_INSTRUMENTS) {
      expect(validAcronyms.has(inst.regulatorAcronym)).toBe(true);
      expect(inst.title.length).toBeGreaterThan(5);
      expect(inst.document_hash.length).toBeGreaterThan(10);
    }
  });
});
