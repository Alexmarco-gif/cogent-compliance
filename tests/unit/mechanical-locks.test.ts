/**
 * Cogent Marketing Shield - 3 Deterministic Mechanical Locks Unit Tests
 * Document Reference: Document 05 (Section 6), Document 08 (Phase 5 Remediation)
 */

import { describe, it, expect } from "vitest";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";

describe("Deterministic Mechanical Locks Engine (Phase 5 Remediation)", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";

  it("Lock 1: should flag prohibited marketing terms with exact statutory severity and reason", async () => {
    const deceptiveCopy = "Get your 100% risk-free loan now with guaranteed returns and no credit check ever!";
    const result = await mechanicalLocksEngine.executeLocks({
      tenantId,
      contentText: deceptiveCopy,
    });

    expect(result.passed).toBe(false);
    expect(result.lock1_prohibited_terms.passed).toBe(false);
    expect(result.lock1_prohibited_terms.breaches.length).toBeGreaterThanOrEqual(3);

    const breachTerms = result.lock1_prohibited_terms.breaches.map((b) => b.matchedText.toLowerCase());
    expect(breachTerms).toContain("100% risk-free");
    expect(breachTerms).toContain("guaranteed returns");
    expect(breachTerms).toContain("no credit check ever");

    const riskFreeBreach = result.lock1_prohibited_terms.breaches.find((b) => b.matchedText === "100% risk-free");
    expect(riskFreeBreach?.severity).toBe("CRITICAL");
  });

  it("Lock 2: should catch advertised rate and fee deviations against product truth", async () => {
    const adCopy = "QuickCash provides loans with 0% interest and no fees today!";
    const productTruth = {
      productName: "QuickCash Prime",
      productType: "DIGITAL_LENDING",
      interestRateMin: 18,
      interestRateMax: 32,
      interestRateType: "APR" as const,
      processingFeePercent: 2.5,
    };

    const result = await mechanicalLocksEngine.executeLocks({
      tenantId,
      contentText: adCopy,
      productTruth,
    });

    expect(result.passed).toBe(false);
    expect(result.lock2_product_rate_match.passed).toBe(false);
    expect(result.lock2_product_rate_match.breaches.length).toBe(2);

    const types = result.lock2_product_rate_match.breaches.map((b) => b.breachType);
    expect(types).toContain("INTEREST_RATE_MISMATCH");
    expect(types).toContain("FEE_SCHEDULE_MISMATCH");
  });

  it("Lock 3: should enforce mandatory licensing, T&C, and APR disclosures", async () => {
    const adCopy = "Borrow up to ₦500,000 for your business right now on your mobile phone.";
    const result = await mechanicalLocksEngine.executeLocks({
      tenantId,
      contentText: adCopy,
    });

    expect(result.passed).toBe(false);
    expect(result.lock3_mandatory_disclosures.passed).toBe(false);
    expect(result.lock3_mandatory_disclosures.missingDisclosures.length).toBeGreaterThanOrEqual(2);

    const types = result.lock3_mandatory_disclosures.breaches.map((b) => b.breachType);
    expect(types).toContain("MISSING_REGULATORY_LICENSE_DISCLOSURE");
    expect(types).toContain("MISSING_TERMS_AND_CONDITIONS");
    expect(types).toContain("MISSING_MANDATORY_APR_DISCLOSURE");
  });

  it("should pass 100% cleanly when compliant copy and mandatory disclosures are present", async () => {
    const compliantCopy =
      "Get a business loan from ₦50,000 to ₦2,000,000. Interest rates start from 22% APR (Max 28% APR). Licensed by the Central Bank of Nigeria. Regulated by FCCPC. Terms and conditions apply.";

    const productTruth = {
      productName: "SME Working Capital",
      productType: "DIGITAL_LENDING",
      interestRateMin: 22,
      interestRateMax: 28,
      processingFeePercent: 1.0,
    };

    const result = await mechanicalLocksEngine.executeLocks({
      tenantId,
      contentText: compliantCopy,
      productTruth,
    });

    expect(result.passed).toBe(true);
    expect(result.totalBreachCount).toBe(0);
    expect(result.lock1_prohibited_terms.passed).toBe(true);
    expect(result.lock2_product_rate_match.passed).toBe(true);
    expect(result.lock3_mandatory_disclosures.passed).toBe(true);
  });
});
