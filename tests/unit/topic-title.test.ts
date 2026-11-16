import { describe, it, expect } from "vitest";
import { deriveConversationTopicTitle } from "@/modules/conversations/topic-title";

describe("deriveConversationTopicTitle", () => {
  it("strips conversational boilerplate and returns concise title-cased topic", () => {
    expect(deriveConversationTopicTitle("Tell me about loan approval")).toBe("Loan Approval");
    expect(
      deriveConversationTopicTitle(
        "What are the CBN disclosure rules for credit promotions in Nigeria?",
      ),
    ).toBe("CBN Disclosure Rules for Credit Promotions");
  });

  it("summarizes linked product and channel instead of copying promotional text", () => {
    const prompt =
      'Review this promotional campaign copy for CBN, FCCPC, and ARCON compliance: "Borrow 500,000 Naira instantly at 0% interest! No hidden fees, no paperwork."';
    expect(
      deriveConversationTopicTitle(prompt, {
        productName: "Quick Cash Loan Test 1",
      }),
    ).toBe("Quick Cash Loan Test 1 — Compliance Review");

    expect(
      deriveConversationTopicTitle("Check this Instagram social media ad for our product", {
        productName: "Quick Cash Loan Test 1",
      }),
    ).toBe("Quick Cash Loan Test 1 — Social Media Ad Audit");
  });

  it("extracts domain for URL scan prompts", () => {
    expect(
      deriveConversationTopicTitle(
        "Inspect this live promotional landing page URL: https://www.stem-cogent.com/promo-offer",
      ),
    ).toBe("stem-cogent.com Landing Page Audit");

    expect(
      deriveConversationTopicTitle("Scan https://example.com/loan", {
        productName: "Quick Cash Loan Test 1",
      }),
    ).toBe("Quick Cash Loan Test 1 — example.com Audit");
  });

  it("handles attachment uploads and uploaded asset prompts cleanly", () => {
    expect(
      deriveConversationTopicTitle("", {
        productName: "Quick Cash Loan",
        attachmentName: "q3-loan-flyer.pdf",
      }),
    ).toBe("Quick Cash Loan — q3-loan-flyer");

    expect(
      deriveConversationTopicTitle(
        'Uploaded campaign asset "banner-april.png". Please review the extracted copy against CBN, FCCPC, and ARCON requirements.',
      ),
    ).toBe("banner-april Asset Audit");
  });

  it("drops quoted ad copy after colon and handles channel-for-subject phrasing", () => {
    expect(
      deriveConversationTopicTitle(
        'Review this social media ad for our Quick Cash Loan: "Get instant cash at 0% interest!"',
      ),
    ).toBe("Quick Cash Loan — Social Media Ad");
  });

  it("truncates at word boundary without cutting mid-word", () => {
    const longPrompt =
      "Check regulatory compliance obligations across digital credit advertising channels and consumer protection rules";
    const result = deriveConversationTopicTitle(longPrompt);
    expect(result.length).toBeLessThanOrEqual(56);
    expect(result.endsWith(" ")).toBe(false);
  });
});
