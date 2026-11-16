/**
 * Cogent Marketing Shield - Deterministic APR, IRR & Drip-Pricing Calculator Engine
 * Document Reference: Document 13 (Section 3.1, Section 4.2 Tool 18), CBN Consumer Protection
 * Regulations (Key Facts Statement), FCCPA 2018 §115, FCCPC DEON Lending Regulations 2025/2026.
 *
 * Pure deterministic financial mathematics — never delegates rate or fee math to an LLM.
 */

import { ApprovedTerms, CampaignProduct } from "@/contracts/knowledge-product.contracts";
import type { ComputedFinancials } from "@/contracts/conversation.contracts";

export type RatePeriodType = "DAILY" | "MONTHLY" | "ANNUAL" | "FLAT_PER_TENOR";

export interface AprCalculationInput {
  principalNgn?: number;
  advertisedRatePercent: number;
  advertisedRatePeriod?: RatePeriodType;
  tenorDays: number;
  processingFeePercent?: number;
  processingFeeFlatNgn?: number;
  managementFeePercent?: number;
  insuranceFeePercent?: number;
  deductFeesUpfront?: boolean;
  dailyPenaltyPercent?: number;
  claimedAprPercent?: number;
  productName?: string;
}

export interface BlindSpotAlert {
  findingCode: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  whatYouMissed: string;
  whatItCostsYou: string;
  oneClickFix: string;
  violatedStatute: string;
  exactQuoteOrMetric: string;
}

export interface AprCalculationResult {
  productName: string;
  principalNgn: number;
  tenorDays: number;
  advertisedRatePercent: number;
  advertisedRatePeriod: RatePeriodType;
  advertisedImpliedAprPercent: number;
  upfrontFeesNgn: number;
  netDisbursedNgn: number;
  interestAmountNgn: number;
  totalCostOfCreditNgn: number;
  totalRepaymentNgn: number;
  /** Annualized total cost of credit divided by gross principal: (TCC / Principal) * (365 / Tenor) */
  effectiveNominalAprPercent: number;
  /** True CBN KFS Effective APR on actual net cash received: (TCC / NetDisbursed) * (365 / Tenor) */
  effectiveNetDisbursedAprPercent: number;
  /** Compounded annualized IRR: ((1 + TCC / NetDisbursed)^(365 / Tenor) - 1) * 100 */
  effectiveCompoundIrrPercent: number;
  aprDiscrepancyPercent: number;
  dripPricingDetected: boolean;
  shortTenorPlayStoreViolation: boolean;
  excessivePenaltyViolation: boolean;
  blindSpots: BlindSpotAlert[];
  /** Canonical single-source-of-truth financial schedule shared across LLM context and all artifacts */
  computedFinancials: ComputedFinancials;
}

export class AprCalculatorService {
  /**
   * Computes deterministic CBN Key Facts Statement (KFS) Effective APR, IRR,
   * Net Disbursed Cash, Total Cost of Credit, and FCCPC/CBN blind-spot alerts.
   */
  public calculateEffectiveApr(input: AprCalculationInput): AprCalculationResult {
    const principalNgn = Math.max(input.principalNgn ?? 50_000, 1_000);
    const tenorDays = Math.max(Math.round(input.tenorDays || 30), 1);
    const advertisedRatePercent = Math.max(input.advertisedRatePercent || 0, 0);
    const advertisedRatePeriod: RatePeriodType = input.advertisedRatePeriod || "MONTHLY";
    const deductFeesUpfront = input.deductFeesUpfront !== false;
    const productName = input.productName || "Digital Credit Facility";

    // 1. Compute implied headline APR (what the marketing copy makes the user think the annual rate is)
    let advertisedImpliedAprPercent = 0;
    if (input.claimedAprPercent !== undefined && input.claimedAprPercent > 0) {
      advertisedImpliedAprPercent = Number(input.claimedAprPercent.toFixed(2));
    } else if (advertisedRatePeriod === "ANNUAL") {
      advertisedImpliedAprPercent = Number(advertisedRatePercent.toFixed(2));
    } else if (advertisedRatePeriod === "MONTHLY") {
      advertisedImpliedAprPercent = Number((advertisedRatePercent * 12).toFixed(2));
    } else if (advertisedRatePeriod === "DAILY") {
      advertisedImpliedAprPercent = Number((advertisedRatePercent * 365).toFixed(2));
    } else {
      advertisedImpliedAprPercent = Number(
        (advertisedRatePercent * (365 / tenorDays)).toFixed(2)
      );
    }

    // 2. Compute nominal interest in NGN over the loan tenor
    let interestAmountNgn = 0;
    if (advertisedRatePeriod === "MONTHLY") {
      interestAmountNgn = principalNgn * (advertisedRatePercent / 100) * (tenorDays / 30);
    } else if (advertisedRatePeriod === "DAILY") {
      interestAmountNgn = principalNgn * (advertisedRatePercent / 100) * tenorDays;
    } else if (advertisedRatePeriod === "ANNUAL") {
      interestAmountNgn = principalNgn * (advertisedRatePercent / 100) * (tenorDays / 365);
    } else {
      interestAmountNgn = principalNgn * (advertisedRatePercent / 100);
    }

    // 3. Compute mandatory upfront/ancillary fees (processing, management, insurance, flat fee)
    const processingFeePctNgn = Number(
      (principalNgn * ((input.processingFeePercent || 0) / 100)).toFixed(2)
    );
    const processingFeeFlatNgn = Number((input.processingFeeFlatNgn || 0).toFixed(2));
    const managementFeeNgn = Number(
      (principalNgn * ((input.managementFeePercent || 0) / 100)).toFixed(2)
    );
    const insuranceFeeNgn = Number(
      (principalNgn * ((input.insuranceFeePercent || 0) / 100)).toFixed(2)
    );

    const itemizedUpfrontFees: ComputedFinancials["itemized_upfront_fees"] = [];
    if (processingFeePctNgn > 0) {
      itemizedUpfrontFees.push({
        label: "Processing Fee (%)",
        amount_ngn: processingFeePctNgn,
        basis: `${input.processingFeePercent}% of principal`,
      });
    }
    if (processingFeeFlatNgn > 0) {
      itemizedUpfrontFees.push({
        label: "Flat Processing / Admin Fee",
        amount_ngn: processingFeeFlatNgn,
        basis: "Fixed upfront deduction",
      });
    }
    if (managementFeeNgn > 0) {
      itemizedUpfrontFees.push({
        label: "Management Fee",
        amount_ngn: managementFeeNgn,
        basis: `${input.managementFeePercent}% of principal`,
      });
    }
    if (insuranceFeeNgn > 0) {
      itemizedUpfrontFees.push({
        label: "Credit Life / Insurance Fee",
        amount_ngn: insuranceFeeNgn,
        basis: `${input.insuranceFeePercent}% of principal`,
      });
    }

    const upfrontFeesNgn = Number(
      (
        processingFeePctNgn +
        processingFeeFlatNgn +
        managementFeeNgn +
        insuranceFeeNgn
      ).toFixed(2)
    );

    const netDisbursedNgn = Number(
      Math.max(
        deductFeesUpfront ? principalNgn - upfrontFeesNgn : principalNgn,
        1
      ).toFixed(2)
    );

    const roundedInterestNgn = Number(interestAmountNgn.toFixed(2));
    const totalCostOfCreditNgn = Number((roundedInterestNgn + upfrontFeesNgn).toFixed(2));
    const totalRepaymentNgn = Number((netDisbursedNgn + totalCostOfCreditNgn).toFixed(2));

    // 4. Compute Effective APR (Nominal Principal basis vs. Net Disbursed Cash basis) & Compound IRR
    const annualizationFactor = 365 / tenorDays;
    const effectiveNominalAprPercent = Number(
      (((totalCostOfCreditNgn / principalNgn) * annualizationFactor) * 100).toFixed(2)
    );
    const effectiveNetDisbursedAprPercent = Number(
      (((totalCostOfCreditNgn / netDisbursedNgn) * annualizationFactor) * 100).toFixed(2)
    );

    const periodicReturn = totalCostOfCreditNgn / netDisbursedNgn;
    const rawIrr = (Math.pow(1 + periodicReturn, Math.min(annualizationFactor, 50)) - 1) * 100;
    const effectiveCompoundIrrPercent = Number(Math.min(rawIrr, 99999.99).toFixed(2));

    const aprDiscrepancyPercent = Number(
      Math.max(effectiveNominalAprPercent - advertisedImpliedAprPercent, 0).toFixed(2)
    );

    const dripPricingDetected = upfrontFeesNgn > 0 && aprDiscrepancyPercent >= 3;
    const shortTenorPlayStoreViolation = tenorDays < 60;
    const excessivePenaltyViolation = (input.dailyPenaltyPercent || 0) > 0.1;

    // 5. Build Problem -> Risk -> Fix blind-spot alerts
    const blindSpots: BlindSpotAlert[] = [];

    if (dripPricingDetected || aprDiscrepancyPercent >= 5) {
      const formattedPrincipal = `₦${principalNgn.toLocaleString("en-NG")}`;
      const formattedFees = `₦${upfrontFeesNgn.toLocaleString("en-NG")}`;
      const formattedNet = `₦${netDisbursedNgn.toLocaleString("en-NG")}`;
      const formattedRepay = `₦${totalRepaymentNgn.toLocaleString("en-NG")}`;

      blindSpots.push({
        findingCode: "APR_DRIP_PRICING_MISMATCH",
        severity: "CRITICAL",
        exactQuoteOrMetric: `Implied ${advertisedImpliedAprPercent}% APR vs. True ${effectiveNominalAprPercent}% APR (${effectiveNetDisbursedAprPercent}% on net cash)`,
        whatYouMissed: `Your promotion implies ${advertisedImpliedAprPercent}% APR (${advertisedRatePercent}% ${advertisedRatePeriod.toLowerCase()}), but once the ${formattedFees} mandatory fee and ${tenorDays}-day tenor on ${productName} are factored in, the borrower receives ${formattedNet} net cash and repays ${formattedRepay}—an actual annualized rate of ${effectiveNominalAprPercent}% APR (${effectiveNetDisbursedAprPercent}% APR on net disbursed cash).`,
        whatItCostsYou:
          "Violates FCCPA 2018 Section 115 (False/Misleading Price Representation) and CBN Consumer Protection Regulations §3.2.3 (Key Facts Statement). Triggers FCCPC Digital Lender delisting, NIBSS/payment gateway disconnection, and administrative penalties up to ₦10,000,000 or 10% of annual turnover.",
        oneClickFix: `Disclose the full Total Cost of Credit upfront: "Borrow ${formattedPrincipal} for ${tenorDays} days at ${advertisedRatePercent}% ${advertisedRatePeriod.toLowerCase()} interest plus ${formattedFees} processing fee (Net Disbursed: ${formattedNet}; Total Repayable: ${formattedRepay}; Effective APR: ${effectiveNominalAprPercent}% p.a.). Terms & Conditions apply."`,
        violatedStatute: "FCCPA 2018 §115 / CBN Consumer Protection Regulations 2019 §3.2.3",
      });
    }

    if (shortTenorPlayStoreViolation) {
      blindSpots.push({
        findingCode: "SHORT_TENOR_PLAY_STORE_BAN",
        severity: "HIGH",
        exactQuoteOrMetric: `${tenorDays}-day repayment tenor (< 60 days minimum)`,
        whatYouMissed: `This loan product specifies a ${tenorDays}-day repayment window. Google Play Store's Personal Loans Policy for Nigeria strictly prohibits promoting short-term personal loans that require full repayment in 60 days or less.`,
        whatItCostsYou:
          "Immediate Google Play Store app suspension/removal in Nigeria and heightened FCCPC DEON predatory short-term lending enforcement scrutiny.",
        oneClickFix: `Ensure the maximum repayment period offered and disclosed in both the ad and app store listing is at least 61 to 90 days (e.g., "Repayment tenors from 61 days to 180 days").`,
        violatedStatute: "FCCPC DEON Guidelines 2025 §5 / Google Play Personal Loans Policy (Nigeria)",
      });
    }

    if (excessivePenaltyViolation) {
      blindSpots.push({
        findingCode: "EXCESSIVE_ROLLOVER_PENALTY",
        severity: "HIGH",
        exactQuoteOrMetric: `${input.dailyPenaltyPercent}% daily late penalty (${((input.dailyPenaltyPercent || 0) * 30).toFixed(1)}% monthly)`,
        whatYouMissed: `A daily default penalty of ${input.dailyPenaltyPercent}% compounds to ${((input.dailyPenaltyPercent || 0) * 30).toFixed(1)}% per month, breaching the CBN Guide to Charges cap on default interest (1% flat per month on unpaid principal only).`,
        whatItCostsYou:
          "Mandatory customer restitution order by CBN Consumer Protection Department, regulatory sanction, and FCCPC DEON enforcement for punitive debt-trap pricing.",
        oneClickFix:
          "Cap late payment default charges in your product schedule and disclosures at 1% per month flat on the unpaid principal balance only, without compounding.",
        violatedStatute: "CBN Guide to Charges by Banks & OFIs / CBN CPF §4.3",
      });
    }

    const computedFinancials: ComputedFinancials = {
      product_name: productName,
      principal_ngn: principalNgn,
      itemized_upfront_fees: itemizedUpfrontFees,
      total_upfront_fees_ngn: upfrontFeesNgn,
      net_disbursed_cash_ngn: netDisbursedNgn,
      nominal_interest_ngn: roundedInterestNgn,
      advertised_rate_percent: advertisedRatePercent,
      advertised_rate_period: advertisedRatePeriod,
      advertised_implied_apr_percent: advertisedImpliedAprPercent,
      total_cost_of_credit_ngn: totalCostOfCreditNgn,
      total_repayable_ngn: totalRepaymentNgn,
      effective_apr_percent: effectiveNominalAprPercent,
      effective_net_disbursed_apr_percent: effectiveNetDisbursedAprPercent,
      tenor_days: tenorDays,
      drip_pricing_detected: dripPricingDetected,
      short_tenor_violation: shortTenorPlayStoreViolation,
    };

    return {
      productName,
      principalNgn,
      tenorDays,
      advertisedRatePercent,
      advertisedRatePeriod,
      advertisedImpliedAprPercent,
      upfrontFeesNgn,
      netDisbursedNgn,
      interestAmountNgn: roundedInterestNgn,
      totalCostOfCreditNgn,
      totalRepaymentNgn,
      effectiveNominalAprPercent,
      effectiveNetDisbursedAprPercent,
      effectiveCompoundIrrPercent,
      aprDiscrepancyPercent,
      dripPricingDetected,
      shortTenorPlayStoreViolation,
      excessivePenaltyViolation,
      blindSpots,
      computedFinancials,
    };
  }

  /**
   * Automatically parses promotional copy for loan amounts, rates, fees, and tenors,
   * cross-references against the tenant's saved CampaignProduct truth, and runs the APR engine.
   */
  public analyzeCopyAgainstProductTruth(
    contentText: string,
    product?: CampaignProduct | null,
    overrideTerms?: Partial<ApprovedTerms> | null
  ): AprCalculationResult | null {
    const terms: Partial<ApprovedTerms> = {
      ...(product?.approved_terms || {}),
      ...(overrideTerms || {}),
    };
    const customTerms = (terms.custom_terms || {}) as Record<string, unknown>;

    // 1. Extract principal from copy (e.g. "₦50,000", "N100,000", "NGN 250000")
    let principalNgn = 50_000;
    const principalMatch = contentText.match(/(?:₦|NGN\s*|N)(\d{1,3}(?:,\d{3})+|\d{4,9})/i);
    if (principalMatch && principalMatch[1]) {
      const parsed = Number(principalMatch[1].replace(/,/g, ""));
      if (!isNaN(parsed) && parsed >= 1_000) {
        principalNgn = parsed;
      }
    }

    // 2. Extract advertised interest rate & period from copy
    let advertisedRatePercent: number | undefined;
    let advertisedRatePeriod: RatePeriodType = "MONTHLY";

    const monthlyMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:monthly|per\s*month|a\s*month|interest\s*monthly)/i
    );
    const dailyMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:daily|per\s*day|a\s*day)/i
    );
    const annualMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:p\.?a\.?|per\s*annum|annual(?:ly)?|apr)/i
    );
    const genericRateMatch = contentText.match(/at\s+(\d+(?:\.\d+)?)\s*%/i);

    if (monthlyMatch && monthlyMatch[1]) {
      advertisedRatePercent = parseFloat(monthlyMatch[1]);
      advertisedRatePeriod = "MONTHLY";
    } else if (dailyMatch && dailyMatch[1]) {
      advertisedRatePercent = parseFloat(dailyMatch[1]);
      advertisedRatePeriod = "DAILY";
    } else if (annualMatch && annualMatch[1]) {
      advertisedRatePercent = parseFloat(annualMatch[1]);
      advertisedRatePeriod = "ANNUAL";
    } else if (genericRateMatch && genericRateMatch[1]) {
      advertisedRatePercent = parseFloat(genericRateMatch[1]);
      advertisedRatePeriod =
        terms.interest_rate_type === "DAILY"
          ? "DAILY"
          : terms.interest_rate_type === "APR"
            ? "ANNUAL"
            : "MONTHLY";
    } else if (terms.interest_rate_min !== undefined) {
      advertisedRatePercent = terms.interest_rate_min;
      advertisedRatePeriod =
        terms.interest_rate_type === "DAILY"
          ? "DAILY"
          : terms.interest_rate_type === "APR"
            ? "ANNUAL"
            : "MONTHLY";
    }

    // If copy has an advertised rate or product truth, or financial promotion signals, run APR analysis
    const hasLoanSignal =
      advertisedRatePercent !== undefined ||
      /\b(?:loan|borrow|credit|disburse|repay|interest|apr|tenor|tenure|quickcash|monthly|processing\s*fee)\b/i.test(
        contentText
      ) ||
      Boolean(product);
    if (!hasLoanSignal || advertisedRatePercent === undefined) {
      return null;
    }

    // 3. Resolve tenor (prefer copy if explicitly stated, unless product truth has a shorter/strict tenor)
    let tenorDays = terms.tenor_min_days || terms.tenor_max_days || 30;
    const tenorDaysMatch = contentText.match(/(\d+)\s*[- ]?(?:day|days)\s*(?:loan|tenor|tenure|repayment)?/i);
    if (tenorDaysMatch && tenorDaysMatch[1]) {
      const parsedDays = parseInt(tenorDaysMatch[1], 10);
      if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 1825) {
        tenorDays = parsedDays;
      }
    }

    // 4. Resolve processing/management/flat fees from product truth OR copy
    let processingFeePercent = terms.processing_fee_percent || 0;
    let processingFeeFlatNgn =
      typeof customTerms.processing_fee_flat_ngn === "number"
        ? customTerms.processing_fee_flat_ngn
        : 0;
    const managementFeePercent = terms.management_fee_percent || 0;
    const dailyPenaltyPercent = terms.penalty_fee_percent || 0;

    const copyFlatFeeMatch = contentText.match(
      /(?:₦|NGN\s*|N)(\d{1,3}(?:,\d{3})+|\d{3,6})\s*(?:processing|admin|management|service|one[- ]off)?\s*fee/i
    );
    if (copyFlatFeeMatch && copyFlatFeeMatch[1] && processingFeeFlatNgn === 0) {
      processingFeeFlatNgn = Number(copyFlatFeeMatch[1].replace(/,/g, ""));
    }

    const copyPctFeeMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:processing|admin|management|origination|service)\s*fee/i
    );
    if (copyPctFeeMatch && copyPctFeeMatch[1] && processingFeePercent === 0) {
      processingFeePercent = parseFloat(copyPctFeeMatch[1]);
    }

    return this.calculateEffectiveApr({
      principalNgn,
      advertisedRatePercent,
      advertisedRatePeriod,
      tenorDays,
      processingFeePercent,
      processingFeeFlatNgn,
      managementFeePercent,
      dailyPenaltyPercent,
      deductFeesUpfront: true,
      productName: product?.product_name || "Promoted Credit Product",
    });
  }
}

export const aprCalculatorService = new AprCalculatorService();
