/**
 * Cogent Marketing Shield - Layer 6 Rewrite Safety Validator
 * Document Reference: Document 05 (Section 7.1 Layer 6), Document 08 (Phase 8)
 */

import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import { logger } from "@/lib/logger";
import { Layer6ValidationReport } from "@/contracts/remediation.contracts";

export interface Layer6ValidationParams {
  tenantId: string;
  originalText: string;
  proposedText: string;
  findingClaimText?: string;
  productTruth?: {
    productName: string;
    productType: string;
    interestRateMin?: number;
    interestRateMax?: number;
    interestRateType?: "APR" | "MONTHLY" | "FLAT";
    processingFeePercent?: number;
    managementFeePercent?: number;
    tenorMinDays?: number;
    tenorMaxDays?: number;
    requiredDisclosures?: string[];
  } | null;
  channel?: string;
}

export class Layer6RewriteValidator {
  /**
   * Deterministically validates a proposed compliance rewrite against:
   * 1. Resolution of the original non-compliant claim.
   * 2. Deterministic Lock 1 (Prohibited/Restricted Terms Scanner).
   * 3. Deterministic Lock 2 (Product Rate, APR, and Fee Truth Matcher).
   * 4. Deterministic Lock 3 (Mandatory Statutory & Institutional Disclosures).
   */
  public async validateRewrite(
    params: Layer6ValidationParams,
  ): Promise<Layer6ValidationReport> {
    const failureReasons: string[] = [];
    const proposed = params.proposedText.trim();

    // 1. Check whether original issue was addressed
    let originalIssueAddressed = true;
    if (params.findingClaimText && params.findingClaimText.trim().length > 4) {
      const normalizedOriginalClaim = params.findingClaimText.toLowerCase().trim();
      const normalizedProposed = proposed.toLowerCase();

      // If the exact non-compliant phrase is still verbatim in the proposed text, fail
      if (normalizedProposed.includes(normalizedOriginalClaim)) {
        originalIssueAddressed = false;
        failureReasons.push(
          `Original non-compliant phrase "${params.findingClaimText.trim()}" was not removed or remediated in the proposed copy.`,
        );
      }
    }

    // 2. Execute 3 Deterministic Mechanical Locks on proposed text
    const lockResults = await mechanicalLocksEngine.executeLocks({
      tenantId: params.tenantId,
      contentText: proposed,
      productTruth: params.productTruth,
      channel: params.channel,
    });

    // Check Lock 1: Prohibited Terms
    const newProhibitedTermsDetected = !lockResults.lock1_prohibited_terms.passed;
    if (newProhibitedTermsDetected) {
      for (const breach of lockResults.lock1_prohibited_terms.breaches) {
        failureReasons.push(
          `Lock 1 Breach: Prohibited term "${breach.matchedText}" introduced in rewrite (${breach.explanation}).`,
        );
      }
    }

    // Check Lock 2: Product Rate & Fee Match
    let productRateFeeMatch: "PASSED" | "FAILED" | "NOT_APPLICABLE" = "PASSED";
    if (params.productTruth) {
      if (!lockResults.lock2_product_rate_match.passed) {
        productRateFeeMatch = "FAILED";
        for (const breach of lockResults.lock2_product_rate_match.breaches) {
          failureReasons.push(
            `Lock 2 Breach: ${breach.explanation}`,
          );
        }
      }
    } else {
      productRateFeeMatch = "NOT_APPLICABLE";
    }

    // Check Lock 3: Mandatory Disclosures
    const mandatoryDisclosuresPresent = lockResults.lock3_mandatory_disclosures.passed;
    if (!mandatoryDisclosuresPresent) {
      for (const disc of lockResults.lock3_mandatory_disclosures.missingDisclosures) {
        failureReasons.push(
          `Lock 3 Breach: Missing mandatory disclosure: "${disc}".`,
        );
      }
    }

    const validationStatus =
      originalIssueAddressed &&
      !newProhibitedTermsDetected &&
      productRateFeeMatch !== "FAILED" &&
      mandatoryDisclosuresPresent
        ? "PASSED"
        : "FAILED";

    const report: Layer6ValidationReport = {
      validation_status: validationStatus,
      original_issue_addressed: originalIssueAddressed,
      new_prohibited_terms_detected: newProhibitedTermsDetected,
      product_rate_fee_match: productRateFeeMatch,
      mandatory_disclosures_present: mandatoryDisclosuresPresent,
      failure_reasons: failureReasons,
    };

    logger.info("Executed Layer 6 Rewrite Validation", {
      tenantId: params.tenantId,
      validationStatus,
      failureCount: failureReasons.length,
      originalIssueAddressed,
      newProhibitedTermsDetected,
    });

    return report;
  }
}

export const layer6RewriteValidator = new Layer6RewriteValidator();
