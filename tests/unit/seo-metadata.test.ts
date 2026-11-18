import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("SEO Metadata: Sitemap & Robots", () => {
  it("should generate a valid sitemap with all public marketing routes", () => {
    const map = sitemap();
    expect(Array.isArray(map)).toBe(true);
    expect(map.length).toBeGreaterThanOrEqual(6);

    const urls = map.map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/"))).toBe(true);
    expect(urls.some((u) => u.includes("/solutions"))).toBe(true);
    expect(urls.some((u) => u.includes("/resources"))).toBe(true);
    expect(urls.some((u) => u.includes("/company"))).toBe(true);
    expect(urls.some((u) => u.includes("/resources/faq"))).toBe(true);
    expect(urls.some((u) => u.includes("/legal"))).toBe(true);

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
    expect(rules?.disallow).toContain("/chat");
    expect(rules?.disallow).toContain("/api/");
    expect(rules?.disallow).toContain("/settings");
  });
});
