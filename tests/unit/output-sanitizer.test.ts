import { describe, it, expect } from "vitest";
import {
  createStreamingOutputSanitizer,
  sanitizeAssistantOutput,
} from "@/lib/ai/output-sanitizer";

describe("Output Sanitizer (Prompt Confidentiality & Symbol Discipline)", () => {
  it("strips leaked <canonical_computed_financials> and canonical computation engine phrasing", () => {
    const raw =
      "Per the canonical computation engine (`<canonical_computed_financials>`), the financial breakdown for a sample loan of **₦500,000 over a 30-day tenor** is below.";
    const cleaned = sanitizeAssistantOutput(raw);

    expect(cleaned).not.toContain("canonical_computed_financials");
    expect(cleaned).not.toContain("canonical computation engine");
    expect(cleaned).not.toContain("()");
    expect(cleaned).not.toContain("``");
    expect(cleaned).toBe(
      "Based on the verified loan schedule, the financial breakdown for a sample loan of **₦500,000 over a 30-day tenor** is below."
    );
  });

  it("strips any leaked internal XML context delimiters across prose", () => {
    const raw =
      "Grounded in <verified_statutory_vault> and `<internal_institutional_truth>` plus (<dual_grounding_context>).";
    const cleaned = sanitizeAssistantOutput(raw);

    expect(cleaned).not.toContain("verified_statutory_vault");
    expect(cleaned).not.toContain("internal_institutional_truth");
    expect(cleaned).not.toContain("dual_grounding_context");
    expect(cleaned).not.toContain("()");
  });

  it("normalizes §§ and § section glyphs into plain legal text while preserving currency", () => {
    const raw =
      "Under NDPA 2023 §§ 26, 35 and CBN CPF §4.2.1, penalties can reach ₦100,000,000.";
    const cleaned = sanitizeAssistantOutput(raw);

    expect(cleaned).toBe(
      "Under NDPA 2023 Sections 26, 35 and CBN CPF Section 4.2.1, penalties can reach ₦100,000,000."
    );
  });

  it("sanitizes split internal tags and split §§ symbols across streaming chunks", () => {
    const sanitizer = createStreamingOutputSanitizer();
    const chunks = [
      "Per the canonical computation engine (",
      "`<canonical_computed_financials>`",
      "), under NDPA 2023 §",
      "§ 26, 35 and CBN CPF §",
      "4.2, fees must be disclosed.",
    ];

    let combined = "";
    for (const chunk of chunks) {
      combined += sanitizer.push(chunk);
    }
    combined += sanitizer.flush();

    expect(combined).toBe(
      "Based on the verified loan schedule, under NDPA 2023 Sections 26, 35 and CBN CPF Section 4.2, fees must be disclosed."
    );
  });

  it("emits normal chunks immediately without buffering when no tags or trailing § appear", () => {
    const sanitizer = createStreamingOutputSanitizer();
    expect(sanitizer.push("### Regulatory Analysis\n\n")).toBe("### Regulatory Analysis\n\n");
    expect(sanitizer.push("Disclose all loan fees upfront.")).toBe("Disclose all loan fees upfront.");
    expect(sanitizer.flush()).toBe("");
  });
});
