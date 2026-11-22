import { describe, it, expect } from "vitest";
import {
  CreateResourcePostSchema,
  estimateReadingTimeMinutes,
  isSafeResourceUrl,
  normalizeVideoSource,
  slugifyTitle,
} from "@/contracts/resources.contracts";

describe("Resources Contracts & Embed Normalization", () => {
  it("validates safe URLs and rejects javascript/data payloads", () => {
    expect(isSafeResourceUrl("https://u.pcloud.link/publink/show?code=abc")).toBe(true);
    expect(isSafeResourceUrl("https://drive.google.com/file/d/12345/view")).toBe(true);
    expect(isSafeResourceUrl("/api/marketing-shield/v1/resources/media/resources/2026/11/abc.png")).toBe(
      true,
    );
    expect(isSafeResourceUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeResourceUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeResourceUrl("/api/marketing-shield/v1/resources/media/../../secret")).toBe(false);
  });

  it("validates CreateResourcePostSchema and rejects unsafe URLs", () => {
    const valid = CreateResourcePostSchema.safeParse({
      title: "CBN 2026 Automated AML Standards Guide",
      category: "insights",
      status: "published",
      excerpt: "Key updates for Nigerian fintechs.",
      bodyMarkdown: "# Heading\n\nDetailed breakdown.",
      tags: ["CBN", "AML"],
    });
    expect(valid.success).toBe(true);

    const invalidUrl = CreateResourcePostSchema.safeParse({
      title: "Bad link test",
      category: "reports",
      reportFileUrl: "javascript:alert(1)",
    });
    expect(invalidUrl.success).toBe(false);
  });

  it("slugifies titles and estimates reading time cleanly", () => {
    expect(slugifyTitle("CBN's 2026 AML Circular: What Fintechs Must Know!")).toBe(
      "cbn-s-2026-aml-circular-what-fintechs-must-know",
    );
    expect(estimateReadingTimeMinutes("word ".repeat(420))).toBe(2);
  });

  it("normalizes YouTube, Vimeo, Loom, Google Drive, MP4, and pCloud video URLs", () => {
    expect(normalizeVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "iframe",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      providerLabel: "YouTube",
    });

    expect(normalizeVideoSource("https://youtu.be/abc123XYZ")).toMatchObject({
      kind: "iframe",
      embedUrl: "https://www.youtube-nocookie.com/embed/abc123XYZ",
      providerLabel: "YouTube",
    });

    expect(normalizeVideoSource("https://vimeo.com/123456789")).toMatchObject({
      kind: "iframe",
      embedUrl: "https://player.vimeo.com/video/123456789",
      providerLabel: "Vimeo",
    });

    expect(normalizeVideoSource("https://www.loom.com/share/loomvid99")).toMatchObject({
      kind: "iframe",
      embedUrl: "https://www.loom.com/embed/loomvid99",
      providerLabel: "Loom",
    });

    expect(
      normalizeVideoSource("https://drive.google.com/file/d/1AbCDefGhi/view?usp=sharing"),
    ).toMatchObject({
      kind: "iframe",
      embedUrl: "https://drive.google.com/file/d/1AbCDefGhi/preview",
      providerLabel: "Google Drive",
    });

    expect(normalizeVideoSource("https://cdn.example.com/walkthrough.mp4")).toMatchObject({
      kind: "video",
      providerLabel: "Direct Video",
    });

    expect(normalizeVideoSource("https://u.pcloud.link/publink/show?code=xyz")).toMatchObject({
      kind: "external",
      providerLabel: "pCloud",
    });
  });
});
