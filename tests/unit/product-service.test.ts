/**
 * Cogent Marketing Shield - Product Truth & Lock 2 Unit Test Suite
 * Document Reference: Document 08 (Phase 10), Document 09 (Section 3.1: LOCK2-001 - LOCK2-004)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";

describe("Deterministic Lock 2: Product Rate, Fee & Tenor Truth Matcher", () => {
  const sampleProductTruth = {
    productName: "QuickCash Salary Advance",
    productType: "DIGITAL_LENDING",
    interestRateMin: 4.0,
    interestRateMax: 6.0,
    interestRateType: "MONTHLY" as const,
    processingFeePercent: 1.5,
    managementFeePercent: 0,
    tenorMinDays: 30,
    tenorMaxDays: 90,
    requiredDisclosures: [
      "Terms and conditions apply",
      "Licensed by the Central Bank of Nigeria",
    ],
  };

  it("LOCK2-001: detects when ad copy claims '0% processing fee' or 'No fees' when product has processing fee", async () => {
    const content =
      "Get instant salary loans up to ₦500k. 0% processing fee and no fees attached! Licensed by the Central Bank of Nigeria. Terms and conditions apply.";

    const result = await mechanicalLocksEngine.executeLocks({
      tenantId: "tenant_alpha_001",
      contentText: content,
      productTruth: sampleProductTruth,
    });

    expect(result.lock2_product_rate_match.passed).toBe(false);
    const feeBreaches = result.lock2_product_rate_match.breaches.filter(
      (b) => b.breachType === "FEE_SCHEDULE_MISMATCH"
    );
    expect(feeBreaches.length).toBeGreaterThan(0);
    expect(feeBreaches[0]?.explanation).toContain("1.5%");
  });

  it("LOCK2-002: detects when ad copy advertises '2% monthly interest' while approved min is 4.0%", async () => {
    const content =
      "Low cost credit for everyone! Get loans at 2% monthly interest now. 1.5% processing fee applies. Licensed by the Central Bank of Nigeria. Terms and conditions apply.";

    const result = await mechanicalLocksEngine.executeLocks({
      tenantId: "tenant_alpha_001",
      contentText: content,
      productTruth: sampleProductTruth,
    });

    expect(result.lock2_product_rate_match.passed).toBe(false);
    const rateBreaches = result.lock2_product_rate_match.breaches.filter(
      (b) => b.breachType === "INTEREST_RATE_UNDERSTATED"
    );
    expect(rateBreaches.length).toBeGreaterThan(0);
    expect(rateBreaches[0]?.matchedText).toMatch(/2%\s*monthly\s*interest/i);
    expect(rateBreaches[0]?.explanation).toContain("4%");
  });

  it("LOCK2-003: detects when advertised repayment tenor ('180 days') exceeds max_tenor_days = 90", async () => {
    const content =
      "Need extra flexibility? Enjoy repayment over 180 days tenor with QuickCash. 5% monthly interest & 1.5% fee. Licensed by the Central Bank of Nigeria. Terms and conditions apply.";

    const result = await mechanicalLocksEngine.executeLocks({
      tenantId: "tenant_alpha_001",
      contentText: content,
      productTruth: sampleProductTruth,
    });

    expect(result.lock2_product_rate_match.passed).toBe(false);
    const tenorBreaches = result.lock2_product_rate_match.breaches.filter(
      (b) => b.breachType === "TENOR_LIMIT_EXCEEDED"
    );
    expect(tenorBreaches.length).toBeGreaterThan(0);
    expect(tenorBreaches[0]?.explanation).toContain("90 days");
  });

  it("LOCK2-004: passes cleanly when advertised rates, fees, and tenors fall strictly within approved product bounds", async () => {
    const content =
      "Get a QuickCash salary advance up to ₦500k. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. APR 60% annualized. Subject to credit appraisal. Terms and conditions apply. Licensed by the Central Bank of Nigeria.";

    const result = await mechanicalLocksEngine.executeLocks({
      tenantId: "tenant_alpha_001",
      contentText: content,
      productTruth: sampleProductTruth,
    });

    expect(result.lock2_product_rate_match.passed).toBe(true);
    expect(result.lock2_product_rate_match.breaches.length).toBe(0);
    expect(result.passed).toBe(true);
  });
});
