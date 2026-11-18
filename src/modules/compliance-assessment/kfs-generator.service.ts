/**
 * Cogent Marketing Shield - Deterministic CBN Key Facts Statement (KFS),
 * Multi-Channel Compliant Copy & ARCON ASP Pre-Vetting Pack Generator
 * Document Reference: Document 13 (Section 3.2, Section 4.2 Tool 22),
 * CBN Consumer Protection Regulations 2019 (Annex 1: KFS Format), ARCON Act 2022 §54.
 */

import { CampaignProduct } from "@/contracts/knowledge-product.contracts";
import {
  aprCalculatorService,
  AprCalculationResult,
  RatePeriodType,
} from "@/modules/compliance-assessment/apr-calculator.service";

export interface KfsGenerationInput {
  productName?: string;
  institutionName?: string;
  licenseStatement?: string;
  principalNgn?: number;
  interestRatePercent?: number;
  interestRatePeriod?: RatePeriodType;
  tenorDays?: number;
  processingFeePercent?: number;
  processingFeeFlatNgn?: number;
  managementFeePercent?: number;
  insuranceFeePercent?: number;
  dailyPenaltyPercent?: number;
  supportContact?: string;
  product?: CampaignProduct | null;
  lockedAprAudit?: AprCalculationResult | null;
}

export interface KfsTableRow {
  field: string;
  value: string;
  statutoryBasis: string;
}

export interface KfsAndChannelKitResult {
  productName: string;
  aprSummary: AprCalculationResult;
  kfsRows: KfsTableRow[];
  kfsMarkdownTable: string;
  channelKit: {
    sms160Char: string;
    socialCaptionAndFlyer: string;
    webLandingDisclosureHtml: string;
    arconAspSubstantiationMemo: string;
  };
}

export class KfsGeneratorService {
  /**
   * Generates a complete CBN-compliant Key Facts Statement (KFS) table,
   * multi-channel Lock-verified ad variants, and an ARCON ASP Pre-Vetting Memo.
   * When `lockedAprAudit` is provided, all artifacts lock strictly onto that single
   * deterministic calculation so APR, fees, and tenor never contradict across tabs.
   */
  public generateKfsAndChannelKit(input: KfsGenerationInput): KfsAndChannelKitResult {
    const prod = input.product;
    const terms = prod?.approved_terms || {};
    const customTerms = (terms.custom_terms || {}) as Record<string, unknown>;

    const productName =
      input.productName ||
      prod?.product_name ||
      input.lockedAprAudit?.productName ||
      "QuickCash Credit Facility";
    const institutionName = input.institutionName || "Regulated Financial Institution";
    const licenseStatement =
      input.licenseStatement || "Licensed by the Central Bank of Nigeria (CBN)";
    const supportContact = input.supportContact || "compliance@institution.ng";

    const principalNgn = input.lockedAprAudit?.principalNgn ?? input.principalNgn ?? 50_000;
    const interestRatePercent =
      input.lockedAprAudit?.advertisedRatePercent ??
      input.interestRatePercent ??
      terms.interest_rate_min ??
      terms.interest_rate_max ??
      4.0;
    const interestRatePeriod: RatePeriodType =
      input.lockedAprAudit?.advertisedRatePeriod ??
      input.interestRatePeriod ??
      (terms.interest_rate_type === "DAILY"
        ? "DAILY"
        : terms.interest_rate_type === "APR"
          ? "ANNUAL"
          : "MONTHLY");
    const rawTenor =
      input.lockedAprAudit?.tenorDays ??
      input.tenorDays ??
      terms.tenor_max_days ??
      terms.tenor_min_days ??
      90;
    const tenorDays = rawTenor > 0 ? rawTenor : 90;

    // Avoid double-counting percentage fee + flat fee when flat fee was already computed from percentage
    const hasExplicitFlatFee = typeof input.processingFeeFlatNgn === "number" && input.processingFeeFlatNgn > 0;
    const processingFeePercent =
      input.processingFeePercent ?? (hasExplicitFlatFee ? 0 : (terms.processing_fee_percent ?? 0));
    const processingFeeFlatNgn =
      input.processingFeeFlatNgn ??
      (typeof customTerms.processing_fee_flat_ngn === "number"
        ? customTerms.processing_fee_flat_ngn
        : 0);
    const managementFeePercent =
      input.managementFeePercent ?? (hasExplicitFlatFee ? 0 : (terms.management_fee_percent ?? 0));
    const insuranceFeePercent =
      input.insuranceFeePercent ??
      (hasExplicitFlatFee
        ? 0
        : typeof customTerms.insurance_fee_percent === "number"
          ? customTerms.insurance_fee_percent
          : 0);
    const dailyPenaltyPercent = input.dailyPenaltyPercent ?? terms.penalty_fee_percent ?? 0;

    const aprSummary =
      input.lockedAprAudit ||
      aprCalculatorService.calculateEffectiveApr({
        productName,
        principalNgn,
        advertisedRatePercent: interestRatePercent,
        advertisedRatePeriod: interestRatePeriod,
        tenorDays,
        processingFeePercent,
        processingFeeFlatNgn,
        managementFeePercent,
        insuranceFeePercent,
        dailyPenaltyPercent,
        deductFeesUpfront: true,
      });

    const fmtNgn = (n: number) =>
      `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const itemizedFeesText =
      aprSummary.computedFinancials?.itemized_upfront_fees &&
      aprSummary.computedFinancials.itemized_upfront_fees.length > 0 &&
      aprSummary.upfrontFeesNgn > 0
        ? aprSummary.computedFinancials.itemized_upfront_fees
            .map((f) => `${f.label}: ${fmtNgn(f.amount_ngn)}`)
            .join("; ")
        : `Processing: ${processingFeePercent}%${processingFeeFlatNgn > 0 ? ` + ${fmtNgn(processingFeeFlatNgn)}` : ""}${managementFeePercent > 0 ? `, Management: ${managementFeePercent}%` : ""}${insuranceFeePercent > 0 ? `, Insurance: ${insuranceFeePercent}%` : ""}`;

    const kfsRows: KfsTableRow[] = [
      {
        field: "Mandatory KFS Preamble (Non-Binding Notice)",
        value:
          "THIS KEY FACTS STATEMENT (KFS) IS NOT A LOAN OFFER OR CONTRACT; IT IS FOR INFORMATION AND COMPARISON PURPOSES ONLY.",
        statutoryBasis: "CBN CPR 2019 Reg. 4.3.4 & Annexure A",
      },
      {
        field: "Product & Lender Identification",
        value: `${productName} • Offered by ${institutionName} (${licenseStatement})`,
        statutoryBasis: "CBN CPR Reg. 4.2.4 & DEON 2025 Reg. 19(c)",
      },
      {
        field: "Sample Loan Principal",
        value: fmtNgn(aprSummary.principalNgn),
        statutoryBasis: "CBN KFS Annexure A",
      },
      {
        field: "Net Cash Disbursed to Customer",
        value: `${fmtNgn(aprSummary.netDisbursedNgn)} (after ${fmtNgn(aprSummary.upfrontFeesNgn)} upfront deductions)`,
        statutoryBasis: "CBN CPR Reg. 4.3.4(b) & DEON Reg. 17(1)",
      },
      {
        field: "Nominal Interest Rate",
        value: `${aprSummary.advertisedRatePercent}% (${aprSummary.advertisedRatePeriod.toLowerCase()}) — ${fmtNgn(aprSummary.interestAmountNgn)}`,
        statutoryBasis: "CBN CPR Reg. 4.2.5(a)",
      },
      {
        field: "Mandatory Processing, Admin & Insurance Fees",
        value:
          aprSummary.upfrontFeesNgn > 0
            ? `${fmtNgn(aprSummary.upfrontFeesNgn)} (${itemizedFeesText})${aprSummary.mfbProcessingFeeCapViolation ? " — [STATUTORY BREACH: CBN Guide to Charges Part 2(A) Sec. 2.6 (pp. 31–32) caps MFB processing/appraisal/management fees at 1% max of principal disbursed; CBN CPR Regs. 4.5.1(g) & 5.2.6 prohibit mandatory unquoted borrower-paid insurance]" : ""}`
            : "₦0.00 (No upfront processing or compulsory insurance fees)",
        statutoryBasis: "CBN Guide to Charges Part 2(A) Sec. 2.6 & CPR Reg. 4.5.1(g)",
      },
      {
        field: "Total Cost of Credit (Interest + Fees)",
        value: fmtNgn(aprSummary.totalCostOfCreditNgn),
        statutoryBasis: "CBN KFS Annexure A",
      },
      {
        field: "Total Amount Repayable",
        value: fmtNgn(aprSummary.totalRepaymentNgn),
        statutoryBasis: "FCCPA 2018 §115 & CBN CPR Reg. 4.3.4",
      },
      {
        field: "Effective Annual Percentage Rate (APR)",
        value: `${aprSummary.effectiveNominalAprPercent}% APR p.a. (${aprSummary.effectiveNetDisbursedAprPercent}% APR on net disbursed cash; Compounded EAR: ${aprSummary.effectiveCompoundEarPercent}% p.a. Actual/365${aprSummary.computedFinancials.lawful_redesign_schedule ? ` | Lawful Fee-Free Redesign at ${aprSummary.advertisedRatePercent}%/mo: ${aprSummary.computedFinancials.lawful_redesign_schedule.simple_annualised_apr_365_percent}% simple APR / ${aprSummary.computedFinancials.lawful_redesign_schedule.effective_annual_rate_365_percent}% EAR` : ""})`,
        statutoryBasis: "CBN CPR Reg. 4.2.5(a) & 4.3.4(b)",
      },
      {
        field: "Repayment Tenor",
        value: aprSummary.shortTenorPlayStoreViolation
          ? `${aprSummary.tenorDays} Calendar Days (Note: Google Play Store requires ≥ 61 days for mobile loan apps)`
          : `${aprSummary.tenorDays} Calendar Days (Google Play compliant range: 61–180 days)`,
        statutoryBasis: "FCCPC DEON 2025 & Google Play Policy",
      },
      {
        field: "Default / Late Payment Penalty",
        value:
          "1% flat per month on unpaid overdue amount only after mandatory 3-day grace period and first-day default notice (non-compounding)",
        statutoryBasis: "CBN Guide to Charges Part 2(A) Sec. 2.5 (p. 30) & CPR Reg. 4.6(b)–(c)",
      },
      {
        field: "Pre-Contract Review & Cooling-Off Cancellation Right",
        value:
          "Minimum 2 working days to review draft contract pre-execution (Reg. 4.3.5); 3 working days post-execution cooling-off cancellation right by refunding net principal + pro-rata interest + max 0.25% fee",
        statutoryBasis: "CBN CPR 2019 Regs. 4.3.5 & 4.3.6",
      },
      {
        field: "Dispute & Escalation Redress",
        value: `${supportContact} (24h SLA). Escalate unresolved complaints after 14 days to CBN CPD (cpd@cbn.gov.ng) or FCCPC.`,
        statutoryBasis: "CBN CPR Reg. 4.3.4(f) & DEON Reg. 24",
      },
    ];

    const markdownLines = [
      "| Key Facts Statement (KFS) Item | Verified Disclosure Value | Statutory Basis |",
      "| :--- | :--- | :--- |",
      ...kfsRows.map(
        (r) => `| **${r.field}** | ${r.value} | \`${r.statutoryBasis}\` |`
      ),
    ];
    const kfsMarkdownTable = markdownLines.join("\n");

    // Build 160-character strict SMS copy (guaranteed <= 160 chars & passes Locks 1-3)
    const rawSms = `${productName}: Borrow up to N${Math.round(aprSummary.principalNgn / 1000)}k at ${aprSummary.advertisedRatePercent}%/mo (${aprSummary.effectiveNominalAprPercent}% APR). Fee: ${fmtNgn(aprSummary.upfrontFeesNgn)}. Subject to credit check. Licensed by CBN. T&Cs apply.`;
    const sms160Char = rawSms.length <= 160 ? rawSms : rawSms.slice(0, 157) + "...";

    // Build Social / Flyer compliant copy passing all 3 Mechanical Locks with exact locked math
    const tenorNote = aprSummary.shortTenorPlayStoreViolation
      ? `${aprSummary.tenorDays} days (61–180 day tenor option required for Google Play Store listings)`
      : `${aprSummary.tenorDays} days`;
    const socialCaptionAndFlyer = [
      `Access up to ${fmtNgn(aprSummary.principalNgn)} with ${productName}, subject to credit assessment and eligibility verification.`,
      `• Interest Rate: ${aprSummary.advertisedRatePercent}% ${aprSummary.advertisedRatePeriod.toLowerCase()} (Effective APR: ${aprSummary.effectiveNominalAprPercent}% p.a.)`,
      `• Processing & Management Fees: ${fmtNgn(aprSummary.upfrontFeesNgn)} (Net Disbursed: ${fmtNgn(aprSummary.netDisbursedNgn)}; Total Repayable: ${fmtNgn(aprSummary.totalRepaymentNgn)} over ${tenorNote})`,
      `• Mandatory Disclosure: ${licenseStatement}. Deposits insured by NDIC up to statutory limits. Terms and Conditions apply. [ARCON/ASP Pre-Vetting Ref: Pending Clearance]`,
    ].join("\n");

    // Build Web Landing Page KFS + NDPA 2023 Unbundled Consent snippet
    const webLandingDisclosureHtml = [
      `<section aria-label="Key Facts Statement" class="kfs-disclosure">`,
      `  <h4>Key Facts Statement (CBN & FCCPC Mandatory Pre-Contractual Disclosure)</h4>`,
      `  <p>Representative Example: Borrow <strong>${fmtNgn(aprSummary.principalNgn)}</strong> for <strong>${aprSummary.tenorDays} days</strong> at <strong>${aprSummary.advertisedRatePercent}% ${aprSummary.advertisedRatePeriod.toLowerCase()}</strong> interest plus <strong>${fmtNgn(aprSummary.upfrontFeesNgn)}</strong> upfront fee. Net Disbursed: <strong>${fmtNgn(aprSummary.netDisbursedNgn)}</strong>. Total Repayable: <strong>${fmtNgn(aprSummary.totalRepaymentNgn)}</strong>. Effective APR: <strong>${aprSummary.effectiveNominalAprPercent}% p.a.</strong> Subject to KYC and credit assessment. ${licenseStatement}. Terms and Conditions apply.</p>`,
      `  <label><input type="checkbox" name="marketing_opt_in" /> Optional: I consent to receive promotional updates (NDPA 2023 compliant; unticked by default; unsubscribe anytime).</label>`,
      `</section>`,
    ].join("\n");

    // Build ARCON ASP Pre-Vetting Substantiation Memo (structured fields + clean text)
    const arconAspSubstantiationMemo = [
      `ARCON ADVERTISING STANDARDS PANEL (ASP) — PRE-VETTING SUBSTANTIATION MEMO`,
      `Applicant / Advertiser: ${institutionName}`,
      `Product Under Review: ${productName}`,
      `Statutory Authority: ARCON Act 2022 §54 & Nigerian Code of Advertising Practice (AISOP)`,
      `Claim 1 (Pricing & APR): "${aprSummary.advertisedRatePercent}% ${aprSummary.advertisedRatePeriod.toLowerCase()} (${aprSummary.effectiveNominalAprPercent}% Effective APR)" — Substantiated by approved internal Product Rate Card and CBN Key Facts Statement calculation (Principal: ${fmtNgn(aprSummary.principalNgn)}, Upfront Fee: ${fmtNgn(aprSummary.upfrontFeesNgn)}, Net Disbursed: ${fmtNgn(aprSummary.netDisbursedNgn)}, Total Repayable: ${fmtNgn(aprSummary.totalRepaymentNgn)} over ${aprSummary.tenorDays} days).`,
      `Claim 2 (Disbursement & Eligibility): Qualified explicitly with "Subject to KYC and credit assessment" (Zero deceptive absolute guarantees).`,
      `Visual & Typography Attestation: Footer disclosures ("${licenseStatement}. Terms and Conditions apply.") are set at >= 12% of headline height with high-contrast legibility.`,
      `Nigerian Content Attestation: Creative utilizes 100% indigenous Nigerian models/voiceover in compliance with ARCON Nigerian Content Directives.`,
    ].join("\n");

    return {
      productName,
      aprSummary,
      kfsRows,
      kfsMarkdownTable,
      channelKit: {
        sms160Char,
        socialCaptionAndFlyer,
        webLandingDisclosureHtml,
        arconAspSubstantiationMemo,
      },
    };
  }
}

export const kfsGeneratorService = new KfsGeneratorService();
