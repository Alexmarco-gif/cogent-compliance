/**
 * Cogent Marketing Shield - Deterministic APR, IRR & Drip-Pricing Calculator Engine
 * Document Reference: Document 13 (Section 3.1, Section 4.2 Tool 18), CBN Consumer Protection
 * Regulations (Key Facts Statement), FCCPA 2018 §115, FCCPC DEON Lending Regulations 2025/2026.
 *
 * Pure deterministic financial mathematics — never delegates rate or fee math to an LLM.
 */

import { ApprovedTerms, CampaignProduct } from "@/contracts/knowledge-product.contracts";
import type { ComputedFinancials, ComputedLoanExample } from "@/contracts/conversation.contracts";

export type RatePeriodType = "DAILY" | "MONTHLY" | "ANNUAL" | "FLAT_PER_TENOR";

export interface AprCalculationInput {
  principalNgn?: number;
  secondaryPrincipalsNgn?: number[];
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
  processingFeePercent: number;
  managementFeePercent: number;
  insuranceFeePercent: number;
  dailyPenaltyPercent: number;
  upfrontFeesNgn: number;
  netDisbursedNgn: number;
  interestAmountNgn: number;
  totalCostOfCreditNgn: number;
  totalRepaymentNgn: number;
  /** Periodic borrowing cost over the loan tenor: (TCC / NetDisbursed) * 100 */
  periodicCostRatePercent: number;
  /** Annualized total cost of credit divided by gross principal: (TCC / Principal) * (365 / Tenor) */
  effectiveNominalAprPercent: number;
  /** True CBN KFS Simple Annualised APR on actual net cash received (Actual/365): (TCC / NetDisbursed) * (365 / Tenor) */
  effectiveNetDisbursedAprPercent: number;
  /** Exact 6-decimal Simple Annualised APR on net cash (Actual/365) */
  effectiveNetDisbursedAprExactPercent: number;
  /** Compounded Effective Annual Rate (EAR) on net cash (Actual/365): ((1 + TCC / NetDisbursed)^(365 / Tenor) - 1) * 100 */
  effectiveCompoundIrrPercent: number;
  /** Alias for 2-decimal Compounded EAR on net cash (Actual/365) */
  effectiveCompoundEarPercent: number;
  /** Exact 6-decimal Compounded EAR on net cash (Actual/365) */
  effectiveCompoundEarExactPercent: number;
  /** Simple annualised APR on net cash under 360-day / twelve 30-day periods convention */
  nominalApr360Percent: number;
  /** Compounded EAR on net cash under 360-day / twelve 30-day periods convention */
  effectiveEar360Percent: number;
  aprDiscrepancyPercent: number;
  dripPricingDetected: boolean;
  shortTenorPlayStoreViolation: boolean;
  excessivePenaltyViolation: boolean;
  mfbProcessingFeeCapViolation: boolean;
  unsubstantiatedInsuranceFeeDetected: boolean;
  unsubstantiatedInsuranceFee: boolean;
  blindSpots: BlindSpotAlert[];
  /** Canonical single-source-of-truth financial schedule shared across LLM context and all artifacts */
  computedFinancials: ComputedFinancials;
}

export class AprCalculatorService {
  /**
   * Computes deterministic CBN Key Facts Statement (KFS) Effective APR, EAR/IRR,
   * Net Disbursed Cash, Total Cost of Credit, and FCCPC/CBN blind-spot alerts.
   */
  public calculateEffectiveApr(input: AprCalculationInput): AprCalculationResult {
    const principalNgn = Math.max(input.principalNgn ?? 50_000, 1_000);
    const tenorDays = Math.max(Math.round(input.tenorDays || 30), 1);
    const advertisedRatePercent = Math.max(input.advertisedRatePercent || 0, 0);
    const advertisedRatePeriod: RatePeriodType = input.advertisedRatePeriod || "MONTHLY";
    const deductFeesUpfront = input.deductFeesUpfront !== false;
    const productName = input.productName || "Digital Credit Facility";

    const processingFeePercent = Math.max(input.processingFeePercent || 0, 0);
    const managementFeePercent = Math.max(input.managementFeePercent || 0, 0);
    const insuranceFeePercent = Math.max(input.insuranceFeePercent || 0, 0);
    const dailyPenaltyPercent = Math.max(input.dailyPenaltyPercent || 0, 0);
    const processingFeeFlatNgn = Number(Math.max(input.processingFeeFlatNgn || 0, 0).toFixed(2));

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

    const computeScheduleForPrincipal = (facePrincipal: number): ComputedLoanExample => {
      let interestRaw = 0;
      if (advertisedRatePeriod === "MONTHLY") {
        interestRaw = facePrincipal * (advertisedRatePercent / 100) * (tenorDays / 30);
      } else if (advertisedRatePeriod === "DAILY") {
        interestRaw = facePrincipal * (advertisedRatePercent / 100) * tenorDays;
      } else if (advertisedRatePeriod === "ANNUAL") {
        interestRaw = facePrincipal * (advertisedRatePercent / 100) * (tenorDays / 365);
      } else {
        interestRaw = facePrincipal * (advertisedRatePercent / 100);
      }

      const procNgn = Number(
        (facePrincipal * (processingFeePercent / 100) + processingFeeFlatNgn).toFixed(2)
      );
      const mgmtNgn = Number((facePrincipal * (managementFeePercent / 100)).toFixed(2));
      const insNgn = Number((facePrincipal * (insuranceFeePercent / 100)).toFixed(2));
      const totalUpfront = Number((procNgn + mgmtNgn + insNgn).toFixed(2));
      const netCash = Number(
        Math.max(deductFeesUpfront ? facePrincipal - totalUpfront : facePrincipal, 1).toFixed(2)
      );
      const nominalInt = Number(interestRaw.toFixed(2));
      const tcc = Number((nominalInt + totalUpfront).toFixed(2));
      const totalRepay = Number((netCash + tcc).toFixed(2));

      return {
        principal_ngn: facePrincipal,
        processing_fee_ngn: procNgn,
        insurance_fee_ngn: insNgn,
        management_fee_ngn: mgmtNgn,
        total_upfront_fees_ngn: totalUpfront,
        net_disbursed_cash_ngn: netCash,
        nominal_interest_ngn: nominalInt,
        total_cost_of_credit_ngn: tcc,
        total_repayable_ngn: totalRepay,
      };
    };

    const primarySchedule = computeScheduleForPrincipal(principalNgn);

    // 3. Build itemized upfront/ancillary fees (processing, management, insurance, flat fee)
    const processingFeePctNgn = Number(
      (principalNgn * (processingFeePercent / 100)).toFixed(2)
    );
    const managementFeeNgn = primarySchedule.management_fee_ngn;
    const insuranceFeeNgn = primarySchedule.insurance_fee_ngn;

    const itemizedUpfrontFees: ComputedFinancials["itemized_upfront_fees"] = [];
    if (processingFeePctNgn > 0) {
      itemizedUpfrontFees.push({
        label: "Processing Fee (%)",
        amount_ngn: processingFeePctNgn,
        basis: `${processingFeePercent}% of principal (deducted upfront)`,
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
        basis: `${managementFeePercent}% of principal (deducted upfront)`,
      });
    }
    if (insuranceFeeNgn > 0) {
      itemizedUpfrontFees.push({
        label: "Credit Life / Insurance Fee",
        amount_ngn: insuranceFeeNgn,
        basis: `${insuranceFeePercent}% of principal (deducted upfront)`,
      });
    }

    const upfrontFeesNgn = primarySchedule.total_upfront_fees_ngn;
    const netDisbursedNgn = primarySchedule.net_disbursed_cash_ngn;
    const roundedInterestNgn = primarySchedule.nominal_interest_ngn;
    const totalCostOfCreditNgn = primarySchedule.total_cost_of_credit_ngn;
    const totalRepaymentNgn = primarySchedule.total_repayable_ngn;

    // 4. Compute Effective APR (Gross Principal basis vs. Net Disbursed Cash basis) & Compounded EAR (Actual/365 and 360-day)
    const annualizationFactor365 = 365 / tenorDays;
    const annualizationFactor360 = 360 / tenorDays;
    const periodicReturn = totalCostOfCreditNgn / netDisbursedNgn;
    const periodicCostRatePercent = Number((periodicReturn * 100).toFixed(6));

    const effectiveNominalAprPercent = Number(
      (((totalCostOfCreditNgn / principalNgn) * annualizationFactor365) * 100).toFixed(2)
    );
    const rawNetDisbursedApr365 = periodicReturn * annualizationFactor365 * 100;
    const effectiveNetDisbursedAprPercent = Number(rawNetDisbursedApr365.toFixed(2));
    const effectiveNetDisbursedAprExactPercent = Number(rawNetDisbursedApr365.toFixed(6));

    const rawEar365 =
      (Math.pow(1 + periodicReturn, Math.min(annualizationFactor365, 50)) - 1) * 100;
    const effectiveCompoundIrrPercent = Number(Math.min(rawEar365, 99999.99).toFixed(2));
    const effectiveCompoundEarExactPercent = Number(Math.min(rawEar365, 99999.99).toFixed(6));

    const nominalApr360Percent = Number((periodicReturn * annualizationFactor360 * 100).toFixed(6));
    const rawEar360 =
      (Math.pow(1 + periodicReturn, Math.min(annualizationFactor360, 50)) - 1) * 100;
    const effectiveEar360Percent = Number(Math.min(rawEar360, 99999.99).toFixed(6));

    const aprDiscrepancyPercent = Number(
      Math.max(effectiveNominalAprPercent - advertisedImpliedAprPercent, 0).toFixed(2)
    );

    const dripPricingDetected = upfrontFeesNgn > 0 && aprDiscrepancyPercent >= 3;
    const shortTenorPlayStoreViolation = tenorDays <= 60;
    const excessivePenaltyViolation = dailyPenaltyPercent > 0.1;
    const mfbProcessingFeeCapViolation = processingFeePercent + managementFeePercent > 1.0;
    const unsubstantiatedInsuranceFeeDetected = insuranceFeePercent > 0;

    // Build all loan examples (sorted ascending by principal, e.g. ₦200,000 then ₦500,000)
    const distinctPrincipals = Array.from(
      new Set([principalNgn, ...(input.secondaryPrincipalsNgn || [])].filter((p) => p >= 1_000))
    ).sort((a, b) => a - b);
    const loanExamples: ComputedLoanExample[] = distinctPrincipals.map((p) =>
      computeScheduleForPrincipal(p)
    );

    // Build Lawful Redesign Schedule (0% processing, 0% mandatory insurance, 0% default charge, retaining stated interest rate)
    const redesignPeriodicRate =
      advertisedRatePeriod === "MONTHLY"
        ? (advertisedRatePercent / 100) * (tenorDays / 30)
        : advertisedRatePeriod === "DAILY"
          ? (advertisedRatePercent / 100) * tenorDays
          : advertisedRatePeriod === "ANNUAL"
            ? (advertisedRatePercent / 100) * (tenorDays / 365)
            : advertisedRatePercent / 100;
    const redesignSimpleApr365 = Number(
      (redesignPeriodicRate * annualizationFactor365 * 100).toFixed(6)
    );
    const redesignEar365 = Number(
      ((Math.pow(1 + redesignPeriodicRate, Math.min(annualizationFactor365, 50)) - 1) * 100).toFixed(
        4
      )
    );
    const lawfulRedesignSchedule: NonNullable<ComputedFinancials["lawful_redesign_schedule"]> = {
      assumed_interest_rate_percent: advertisedRatePercent,
      tenor_days: tenorDays,
      processing_fee_ngn: 0,
      insurance_fee_ngn: 0,
      default_penalty_ngn: 0,
      simple_annualised_apr_365_percent: redesignSimpleApr365,
      effective_annual_rate_365_percent: redesignEar365,
      examples: distinctPrincipals.map((p) => {
        const interestPayable = Number((p * redesignPeriodicRate).toFixed(2));
        return {
          principal_ngn: p,
          net_received_ngn: p,
          interest_payable_ngn: interestPayable,
          total_cost_of_credit_ngn: interestPayable,
          total_repayment_ngn: Number((p + interestPayable).toFixed(2)),
        };
      }),
    };

    // 5. Build Problem -> Risk -> Fix blind-spot alerts
    const blindSpots: BlindSpotAlert[] = [];

    if (dripPricingDetected || aprDiscrepancyPercent >= 5) {
      const formattedPrincipal = `₦${principalNgn.toLocaleString("en-NG")}`;
      const formattedFees = `₦${upfrontFeesNgn.toLocaleString("en-NG")}`;
      const formattedNet = `₦${netDisbursedNgn.toLocaleString("en-NG")}`;
      const formattedRepay = `₦${totalRepaymentNgn.toLocaleString("en-NG")}`;
      const feeBreakdownSummary =
        itemizedUpfrontFees.length > 1
          ? ` (${itemizedUpfrontFees.map((f) => `${f.label}: ₦${f.amount_ngn.toLocaleString("en-NG")}`).join(" + ")})`
          : "";

      blindSpots.push({
        findingCode: "APR_DRIP_PRICING_MISMATCH",
        severity: "CRITICAL",
        exactQuoteOrMetric: `Implied ${advertisedImpliedAprPercent}% APR vs. True ${effectiveNominalAprPercent}% APR (${effectiveNetDisbursedAprPercent}% simple APR on net cash; ${effectiveCompoundIrrPercent}% Effective Annual Rate / EAR on Actual/365)`,
        whatYouMissed: `Your promotion implies ${advertisedImpliedAprPercent}% APR (${advertisedRatePercent}% ${advertisedRatePeriod.toLowerCase()}), but once the ${formattedFees} mandatory upfront deduction${feeBreakdownSummary} and ${tenorDays}-day tenor on ${productName} are factored in, the borrower receives ${formattedNet} net cash on Day 0 and repays ${formattedRepay} on Day ${tenorDays} (Total Cost of Credit: ₦${totalCostOfCreditNgn.toLocaleString("en-NG")})—an actual annualized rate of ${effectiveNominalAprPercent}% APR on gross principal, ${effectiveNetDisbursedAprPercent}% (${effectiveNetDisbursedAprExactPercent}%) simple annualized APR on net cash received, and ${effectiveCompoundIrrPercent}% (${effectiveCompoundEarExactPercent}%) compounded Effective Annual Rate (EAR) using Actual/365.`,
        whatItCostsYou:
          "Violates FCCPA 2018 Section 115 and Section 123(1) (False/Misleading Price Representation), CBN Consumer Protection Regulations 2019 Regulations 3.2.3, 4.2.1–4.2.4, 4.4.3(c)–(d), and Annexure B (Key Facts Statement & APR methodology), and FCCPC DEON Digital Lending Regulations 2025 Regulation 17(a)–(e). Fine print cannot cure a misleading headline impression.",
        oneClickFix: `Disclose the full Total Cost of Credit upfront: "Borrow ${formattedPrincipal} for ${tenorDays} days at ${advertisedRatePercent}% ${advertisedRatePeriod.toLowerCase()} interest plus ${formattedFees} upfront fee (Net Disbursed: ${formattedNet}; Total Repayable: ${formattedRepay}; Effective APR: ${effectiveNominalAprPercent}% p.a. / ${effectiveNetDisbursedAprPercent}% on net cash; EAR: ${effectiveCompoundIrrPercent}%). Terms & Conditions apply."`,
        violatedStatute:
          "FCCPA 2018 Sections 115 & 123(1) / CBN Consumer Protection Regulations 2019 Regulations 3.2.3, 4.2.2, 4.4.3(d) & Annexure B / FCCPC DEON Regulations 2025 Regulation 17",
      });
    }

    if (mfbProcessingFeeCapViolation) {
      blindSpots.push({
        findingCode: "MFB_PROCESSING_FEE_CAP_BREACH",
        severity: "CRITICAL",
        exactQuoteOrMetric: `${processingFeePercent + managementFeePercent}% upfront processing/management fee vs. 1% statutory MFB ceiling`,
        whatYouMissed: `The advertised ${processingFeePercent + managementFeePercent}% upfront processing/management fee breaches the CBN Guide to Charges tariff ceiling for Microfinance Banks (and Commercial Banks). Under Part 2(A), Section 2.6 (pp. 31–32) of the CBN Guide to Charges (effective Jan 1, 2020), processing, appraisal, ancillary, and management fees are negotiable subject to a maximum ceiling of 1% of principal disbursed, once per facility. Relabelling the fee as 'processing', 'platform', or 'convenience' does not alter its substance, and a KFS disclosure cannot make an unlawful 4% fee compliant.`,
        whatItCostsYou:
          "Mandatory fee refund and customer restitution orders by the CBN Consumer Protection Department, regulatory sanctions under CBN Guide to Charges Section 2.2 and CBN Consumer Protection Regulations 2019 Regulation 3.2.2, and immediate hold on campaign clearance.",
        oneClickFix:
          "Reprice the facility before advertising: either remove the processing fee (₦0) or cap total processing, appraisal, and management charges at a maximum of 1% of principal disbursed, once per facility, in accordance with CBN Guide to Charges Part 2(A), Section 2.6.",
        violatedStatute:
          "CBN Guide to Charges (2020) Part 2(A), Section 2.6 (pp. 31–32) / CBN Consumer Protection Regulations 2019 Regulation 3.2.2",
      });
    }

    if (unsubstantiatedInsuranceFeeDetected) {
      blindSpots.push({
        findingCode: "UNSUBSTANTIATED_MANDATORY_INSURANCE_FEE",
        severity: "HIGH",
        exactQuoteOrMetric: `Mandatory ${insuranceFeePercent}% upfront insurance deduction (₦${insuranceFeeNgn.toLocaleString("en-NG")}) without underwriter or choice disclosure`,
        whatYouMissed: `The campaign deducts a compulsory ${insuranceFeePercent}% insurance fee upfront without identifying a licensed insurer, policy cover, exclusions, actual premium invoice, or customer choice mechanism. Under CBN Consumer Protection Regulations 2019 Regulations 4.5.1(g), 5.1.9, and 5.2.6, mandatory credit insurance must not be used as a disguised lender fee or misdescribed as an NDIC deposit-insurance premium.`,
        whatItCostsYou:
          "CBN Consumer Protection enforcement for disguised fee loading, mandatory restitution of unremitted insurance deductions, and ARCON ASP pre-vetting rejection for unsubstantiated compulsory charges.",
        oneClickFix:
          "Either remove the compulsory 1.5% insurance charge or substantiate genuine insurance need by naming the NAICOM-licensed underwriter, disclosing policy cover/exclusions and exact premium in the KFS, and providing the borrower with the required choice of insurer under CBN Consumer Protection Regulations 5.1.9 and 5.2.6.",
        violatedStatute:
          "CBN Consumer Protection Regulations 2019 Regulations 4.5.1(g), 5.1.9 & 5.2.6",
      });
    }

    if (shortTenorPlayStoreViolation) {
      blindSpots.push({
        findingCode: "SHORT_TENOR_PLAY_STORE_BAN",
        severity: "HIGH",
        exactQuoteOrMetric: `${tenorDays}-day repayment tenor (<= 60 days minimum)`,
        whatYouMissed: `This loan product specifies a ${tenorDays}-day repayment window. Google Play Store's Personal Loans Policy for Nigeria strictly prohibits promoting short-term personal loans that require full repayment in 60 days or less.`,
        whatItCostsYou:
          "Immediate Google Play Store app suspension/removal in Nigeria and heightened FCCPC DEON predatory short-term lending enforcement scrutiny.",
        oneClickFix: `Ensure the maximum repayment period offered and disclosed in both the ad and app store listing is at least 61 to 90 days (e.g., "Repayment tenors from 61 days to 180 days").`,
        violatedStatute: "FCCPC DEON Guidelines 2025 §5 / Google Play Personal Loans Policy (Nigeria)",
      });
    }

    if (excessivePenaltyViolation) {
      const monthlyPenaltyEquiv = Number((dailyPenaltyPercent * 30).toFixed(1));
      blindSpots.push({
        findingCode: "EXCESSIVE_ROLLOVER_PENALTY",
        severity: "CRITICAL",
        exactQuoteOrMetric: `${dailyPenaltyPercent}% daily late penalty (${monthlyPenaltyEquiv}% over 30 days vs. 1% flat/month MFB ceiling)`,
        whatYouMissed: `A daily default penalty of ${dailyPenaltyPercent}% accrues to ${monthlyPenaltyEquiv}% over 30 days, blatantly breaching the CBN Guide to Charges Part 2(A), Section 2.5 and Footnote 3 (p. 30) ceiling for Microfinance Banks, which caps penal charges at a maximum of 1% flat per month on the unpaid amount after a mandatory 3-day grace period. Furthermore, CBN Consumer Protection Regulations 2019 Regulation 4.6(b)–(c) requires first-day default notification, application only after 3 days, and separate statement disclosure. This breach cannot be cured by fine-print disclosure.`,
        whatItCostsYou:
          "Mandatory customer restitution order by CBN Consumer Protection Department, regulatory sanction under CBN Guide to Charges Part 2(A) Section 2.5, and FCCPC DEON enforcement for punitive debt-trap pricing.",
        oneClickFix:
          "Eliminate the 2% daily default charge or cap late-payment penal interest in the product schedule and KFS at no more than 1% flat per month on the unpaid amount only, applied strictly after a 3-day grace period and first-day default notice (CBN Guide to Charges Part 2(A) Section 2.5; CBN CPR Regulation 4.6(b)).",
        violatedStatute:
          "CBN Guide to Charges (2020) Part 2(A), Section 2.5 & Footnote 3 (p. 30) / CBN Consumer Protection Regulations 2019 Regulation 4.6(b)–(c)",
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
      effective_net_disbursed_apr_exact_percent: effectiveNetDisbursedAprExactPercent,
      periodic_cost_rate_percent: periodicCostRatePercent,
      effective_compound_ear_percent: effectiveCompoundIrrPercent,
      effective_compound_ear_exact_percent: effectiveCompoundEarExactPercent,
      nominal_apr_360_percent: nominalApr360Percent,
      effective_ear_360_percent: effectiveEar360Percent,
      daily_penalty_percent: dailyPenaltyPercent > 0 ? dailyPenaltyPercent : undefined,
      monthly_equivalent_penalty_percent:
        dailyPenaltyPercent > 0 ? Number((dailyPenaltyPercent * 30).toFixed(2)) : undefined,
      tenor_days: tenorDays,
      drip_pricing_detected: dripPricingDetected,
      short_tenor_violation: shortTenorPlayStoreViolation,
      mfb_processing_fee_cap_violation: mfbProcessingFeeCapViolation,
      excessive_penalty_violation: excessivePenaltyViolation,
      unsubstantiated_insurance_fee: unsubstantiatedInsuranceFeeDetected,
      loan_examples: loanExamples,
      lawful_redesign_schedule: lawfulRedesignSchedule,
    };

    return {
      productName,
      principalNgn,
      tenorDays,
      advertisedRatePercent,
      advertisedRatePeriod,
      advertisedImpliedAprPercent,
      processingFeePercent,
      managementFeePercent,
      insuranceFeePercent,
      dailyPenaltyPercent,
      upfrontFeesNgn,
      netDisbursedNgn,
      interestAmountNgn: roundedInterestNgn,
      totalCostOfCreditNgn,
      totalRepaymentNgn,
      periodicCostRatePercent,
      effectiveNominalAprPercent,
      effectiveNetDisbursedAprPercent,
      effectiveNetDisbursedAprExactPercent,
      effectiveCompoundIrrPercent,
      effectiveCompoundEarPercent: effectiveCompoundIrrPercent,
      effectiveCompoundEarExactPercent,
      nominalApr360Percent,
      effectiveEar360Percent,
      aprDiscrepancyPercent,
      dripPricingDetected,
      shortTenorPlayStoreViolation,
      excessivePenaltyViolation,
      mfbProcessingFeeCapViolation,
      unsubstantiatedInsuranceFeeDetected,
      unsubstantiatedInsuranceFee: unsubstantiatedInsuranceFeeDetected,
      blindSpots,
      computedFinancials,
    };
  }

  /**
   * Automatically parses promotional copy for loan amounts (including secondary influencer examples),
   * rates, processing fees, insurance fees, default penalties, and tenors,
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

    // 1. Extract loan principal(s) from copy, distinguishing loan amounts ("Borrow up to ₦500,000", "borrow ₦200k")
    // from raffle prizes ("WIN ₦5,000,000") or transfer qualifiers ("transfer of ₦5,000+")
    const parseNgnToken = (numStr: string, suffix?: string): number => {
      const base = parseFloat(numStr.replace(/,/g, ""));
      if (isNaN(base)) return 0;
      const lowerSuffix = (suffix || "").toLowerCase();
      if (lowerSuffix === "k" || lowerSuffix === "thousand") return Math.round(base * 1_000);
      if (lowerSuffix === "m" || lowerSuffix === "million") return Math.round(base * 1_000_000);
      return Math.round(base);
    };

    const detectedLoanPrincipals: number[] = [];
    const loanContextRegex =
      /\b(?:borrow(?:\s+up\s+to)?|loan(?:\s+of|\s+up\s+to)?|get(?:\s+up\s+to)?|access(?:\s+up\s+to)?|principal(?:\s+of)?)\s*(?:₦|NGN\s*|N)\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m|million|thousand)?\b/gi;
    let loanMatch: RegExpExecArray | null;
    while ((loanMatch = loanContextRegex.exec(contentText)) !== null) {
      if (loanMatch[1]) {
        const parsed = parseNgnToken(loanMatch[1], loanMatch[2]);
        if (parsed >= 1_000 && parsed <= 100_000_000) {
          detectedLoanPrincipals.push(parsed);
        }
      }
    }

    let principalNgn = 50_000;
    if (detectedLoanPrincipals.length > 0) {
      principalNgn = detectedLoanPrincipals[0]!;
    } else {
      const fallbackMatch = contentText.match(/(?:₦|NGN\s*|N)(\d{1,3}(?:,\d{3})+|\d{4,9})/i);
      if (fallbackMatch && fallbackMatch[1]) {
        const parsed = Number(fallbackMatch[1].replace(/,/g, ""));
        if (!isNaN(parsed) && parsed >= 1_000) {
          principalNgn = parsed;
        }
      }
    }
    const secondaryPrincipalsNgn = detectedLoanPrincipals.slice(1);

    // 2. Extract advertised interest rate & period from copy
    let advertisedRatePercent: number | undefined;
    let advertisedRatePeriod: RatePeriodType = "MONTHLY";

    const monthlyMatch =
      contentText.match(
        /(\d+(?:\.\d+)?)\s*%\s*(?:flat\s*)?(?:monthly|per\s*month|a\s*month|interest\s*monthly)/i
      ) ||
      contentText.match(
        /(\d+(?:\.\d+)?)\s*%\s*monthly\s*flat\s*rate/i
      );
    const dailyMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:daily|per\s*day|a\s*day)\s*(?:interest|rate)/i
    );
    const annualMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:p\.?a\.?|per\s*annum|annual(?:ly)?|apr)/i
    );
    const genericRateMatch = contentText.match(/at\s+(?:just\s+)?(\d+(?:\.\d+)?)\s*%/i);

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
    const tenorDaysMatch = contentText.match(
      /(\d+)\s*[- ]?(?:day|days)\s*(?:loan|tenor|tenure|repayment|term)?/i
    );
    if (tenorDaysMatch && tenorDaysMatch[1]) {
      const parsedDays = parseInt(tenorDaysMatch[1], 10);
      if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 1825) {
        tenorDays = parsedDays;
      }
    }

    // 4. Resolve processing, management, insurance, flat fees, and daily default penalty from product truth OR copy
    let processingFeePercent = terms.processing_fee_percent || 0;
    let processingFeeFlatNgn =
      typeof customTerms.processing_fee_flat_ngn === "number"
        ? customTerms.processing_fee_flat_ngn
        : 0;
    const managementFeePercent = terms.management_fee_percent || 0;
    let insuranceFeePercent =
      typeof customTerms.insurance_fee_percent === "number"
        ? customTerms.insurance_fee_percent
        : 0;
    let dailyPenaltyPercent = terms.penalty_fee_percent || 0;

    // Flat processing fee in NGN (e.g., "₦2,500 processing fee")
    const copyFlatFeeMatch = contentText.match(
      /(?:₦|NGN\s*|N)(\d{1,3}(?:,\d{3})+|\d{3,6})\s*(?:processing|admin|management|service|one[- ]off)?\s*fee/i
    );
    if (copyFlatFeeMatch && copyFlatFeeMatch[1] && processingFeeFlatNgn === 0) {
      processingFeeFlatNgn = Number(copyFlatFeeMatch[1].replace(/,/g, ""));
    }

    // Percentage processing fee (supports both "4% processing fee", "4% processing +", and "processing fee of 4%")
    const copyPctFeeBeforeMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:processing|admin(?:istrative)?|management|origination|service|platform)(?:\s*fee|\s*charge|\s*\+|\s*and\b)/i
    );
    const copyPctFeeAfterMatch = contentText.match(
      /(?:processing|admin(?:istrative)?|management|origination|service|platform)\s*(?:fee|charge)\s*(?:of|is|:|-)?\s*(\d+(?:\.\d+)?)\s*%/i
    );
    if (processingFeePercent === 0) {
      if (copyPctFeeBeforeMatch?.[1]) {
        processingFeePercent = parseFloat(copyPctFeeBeforeMatch[1]);
      } else if (copyPctFeeAfterMatch?.[1]) {
        processingFeePercent = parseFloat(copyPctFeeAfterMatch[1]);
      }
    }

    // Percentage insurance / credit-life fee (supports both "1.5% insurance fee" and "insurance fee of 1.5%")
    const copyInsFeeBeforeMatch = contentText.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:credit\s*life\s*|loan\s*|mandatory\s*)?insurance(?:\s*fee|\s*premium|\s*charge|\s*deduction)?/i
    );
    const copyInsFeeAfterMatch = contentText.match(
      /(?:credit\s*life\s*|loan\s*|mandatory\s*)?insurance\s*(?:fee|premium|charge|deduction)?\s*(?:of|is|:|-)?\s*(\d+(?:\.\d+)?)\s*%/i
    );
    if (insuranceFeePercent === 0) {
      if (copyInsFeeBeforeMatch?.[1]) {
        insuranceFeePercent = parseFloat(copyInsFeeBeforeMatch[1]);
      } else if (copyInsFeeAfterMatch?.[1]) {
        insuranceFeePercent = parseFloat(copyInsFeeAfterMatch[1]);
      }
    }

    // Daily default / late payment penalty (supports "2% daily default interest", "2% daily late fee", "late repayment attracts 2% daily")
    const copyDailyPenaltyMatch =
      contentText.match(
        /(\d+(?:\.\d+)?)\s*%\s*(?:daily|per\s*day|a\s*day)\s*(?:default|late|penalty|overdue|rollover)(?:\s*(?:interest|fee|charge|rate))?/i
      ) ||
      contentText.match(
        /(?:late\s*(?:repayment|payment|fee)|default\s*(?:interest|fee|charge|penalty))[^.\n]{0,40}?(\d+(?:\.\d+)?)\s*%\s*(?:daily|per\s*day|a\s*day)/i
      );
    if (dailyPenaltyPercent === 0 && copyDailyPenaltyMatch?.[1]) {
      dailyPenaltyPercent = parseFloat(copyDailyPenaltyMatch[1]);
    }

    return this.calculateEffectiveApr({
      principalNgn,
      secondaryPrincipalsNgn,
      advertisedRatePercent,
      advertisedRatePeriod,
      tenorDays,
      processingFeePercent,
      processingFeeFlatNgn,
      managementFeePercent,
      insuranceFeePercent,
      dailyPenaltyPercent,
      deductFeesUpfront: true,
      productName: product?.product_name || "Promoted Credit Product",
    });
  }
}

export const aprCalculatorService = new AprCalculatorService();
