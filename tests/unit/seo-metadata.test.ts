import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {
  DUAL_SEARCH_TRACKS,
  SOLUTION_VERTICAL_PAGES,
} from "@/data/marketing-scenarios";

describe("SEO Metadata: Sitemap, Robots & Positioning", () => {
  it("should generate a valid sitemap with all public marketing and vertical solution routes", async () => {
    const map = await sitemap();
    expect(Array.isArray(map)).toBe(true);
    expect(map.length).toBeGreaterThanOrEqual(10);

    const urls = map.map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/solutions"))).toBe(true);
    expect(urls.some((u) => u.includes("/resources"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/resources/insights"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/resources/videos"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/resources/reports"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/resources/events"))).toBe(true);
    expect(urls.some((u) => u.includes("/company"))).toBe(true);
    expect(urls.some((u) => u.includes("/resources/faq"))).toBe(true);
    expect(urls.some((u) => u.includes("/legal"))).toBe(true);

    for (const vertical of SOLUTION_VERTICAL_PAGES) {
      expect(urls.some((u) => u.endsWith(`/solutions/${vertical.slug}`))).toBe(true);
    }

    for (const entry of map) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.changeFrequency).toBeDefined();
    }
  });

  it("should generate valid robots.txt rules protecting private app routes", () => {
    const config = robots();
    expect(config.sitemap).toContain("/sitemap.xml");

    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules).toBeDefined();
    expect(rules?.allow).toContain("/");
    expect(rules?.allow).toContain("/legal");
    expect(rules?.disallow).toContain("/@/");
    expect(rules?.disallow).toContain("/chat");
    expect(rules?.disallow).toContain("/api/");
    expect(rules?.disallow).toContain("/settings");
  });

  it("should keep marketing search tracks free of legacy AI/technical jargon", () => {
    const serialized = JSON.stringify(DUAL_SEARCH_TRACKS);
    expect(serialized).not.toMatch(/Local Statutory Vault/i);
    expect(serialized).not.toMatch(/clause-level retrieval/i);
    expect(serialized).not.toMatch(/Circular Discovery/i);
    expect(serialized).not.toMatch(/Synthesizes precedent/i);
  });
});
