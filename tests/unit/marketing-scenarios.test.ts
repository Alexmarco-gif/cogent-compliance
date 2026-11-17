import { describe, it, expect } from "vitest";
import {
  HERO_BOARD_CARDS,
  BOARD_HOTSPOTS,
  STORY_STAKES,
  PLAN_STEPS,
  REGULATOR_METRICS,
  LICENSE_VERTICALS,
  COMPLIANCE_FAQS,
  CO_FOUNDERS,
} from "@/data/marketing-scenarios";

describe("StoryBrand Marketing Scenarios & Co-Founder Data", () => {
  it("provides interactive Hero Product Board cards across all 3 status lanes and 6 hotspots", () => {
    expect(HERO_BOARD_CARDS).toHaveLength(6);
    expect(BOARD_HOTSPOTS).toHaveLength(6);

    const lanes = new Set(HERO_BOARD_CARDS.map((c) => c.lane));
    expect(lanes).toEqual(new Set(["submitted", "review", "cleared"]));

    for (const card of HERO_BOARD_CARDS) {
      expect(card.flaggedIssue.length).toBeGreaterThan(15);
      expect(card.cleanRewrite.length).toBeGreaterThan(15);
      expect(card.checksDone).toBeLessThanOrEqual(card.checksTotal);
    }
  });

  it("maps the StoryBrand Stakes, 3-Step Plan, Regulator Strip, License Verticals, and FAQs cleanly", () => {
    expect(STORY_STAKES).toHaveLength(3);
    expect(PLAN_STEPS).toHaveLength(3);
    expect(REGULATOR_METRICS.map((r) => r.acronym)).toEqual([
      "CBN",
      "FCCPC",
      "ARCON",
      "NDPC",
      "SEC",
    ]);
    expect(LICENSE_VERTICALS).toHaveLength(4);
    expect(COMPLIANCE_FAQS).toHaveLength(6);
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
