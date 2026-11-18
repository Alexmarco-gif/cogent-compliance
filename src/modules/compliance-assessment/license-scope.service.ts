/**
 * Cogent Marketing Shield - Cross-Regulator License Scope & Boundary Matrix Engine
 * Document Reference: Document 13 (Section 3.1, Section 4.2 Tool 21), BOFIA 2020 §2,
 * CBN PSB/MMO/MFB Guidelines, FCCPC DEON Regulations 2025, SEC ISA 2025.
 *
 * Deterministically checks whether the financial activities promoted in a campaign
 * are legally permitted under the tenant's Nigerian regulatory license tier.
 */

import { BlindSpotAlert } from "@/modules/compliance-assessment/apr-calculator.service";

export type InstitutionLicenseTier =
  | "DMB_COMMERCIAL_BANK"
  | "MFB_NATIONAL"
  | "MFB_STATE"
  | "MFB_UNIT"
  | "PSB_PAYMENT_SERVICE_BANK"
  | "MMO_MOBILE_MONEY"
  | "PSSB_PAYMENT_SOLUTION"
  | "FCCPC_DIGITAL_LENDER"
  | "SEC_CAPITAL_MARKET_OPERATOR"
  | "FINTECH_GENERAL";

export interface LicenseScopeAuditInput {
  contentText: string;
  licenseTier?: InstitutionLicenseTier | string | null;
  activeRegulatoryScopes?: string[];
}

export interface LicenseScopeAuditResult {
  resolvedLicenseTier: InstitutionLicenseTier;
  detectedActivities: string[];
  passedLicenseBoundary: boolean;
  blindSpots: BlindSpotAlert[];
}

export class LicenseScopeService {
  /**
   * Normalizes a raw tenant license tier or regulatory scope array into a canonical InstitutionLicenseTier.
   */
  public resolveLicenseTier(
    rawTier?: string | null,
    scopes?: string[]
  ): InstitutionLicenseTier {
    const upper = (rawTier || "").toUpperCase();
    if (upper.includes("PSB") || upper.includes("PAYMENT_SERVICE_BANK")) {
      return "PSB_PAYMENT_SERVICE_BANK";
    }
    if (upper.includes("MMO") || upper.includes("MOBILE_MONEY")) {
      return "MMO_MOBILE_MONEY";
    }
    if (upper.includes("PSSB") || upper.includes("SWITCH") || upper.includes("GATEWAY")) {
      return "PSSB_PAYMENT_SOLUTION";
    }
    if (upper.includes("MFB_STATE") || upper.includes("STATE_MFB")) {
      return "MFB_STATE";
    }
    if (upper.includes("MFB_UNIT") || upper.includes("UNIT_MFB")) {
      return "MFB_UNIT";
    }
    if (upper.includes("MFB")) {
      return "MFB_NATIONAL";
    }
    if (upper.includes("DMB") || upper.includes("COMMERCIAL_BANK")) {
      return "DMB_COMMERCIAL_BANK";
    }
    if (upper.includes("SEC") || upper.includes("WEALTHTECH") || upper.includes("CMO")) {
      return "SEC_CAPITAL_MARKET_OPERATOR";
    }
    if (upper.includes("DIGITAL_LENDER") || upper.includes("FCCPC")) {
      return "FCCPC_DIGITAL_LENDER";
    }

    const joinedScopes = (scopes || []).join(" ").toUpperCase();
    if (joinedScopes.includes("FCCPC") && !joinedScopes.includes("CBN")) {
      return "FCCPC_DIGITAL_LENDER";
    }
    if (joinedScopes.includes("SEC") && !joinedScopes.includes("CBN")) {
      return "SEC_CAPITAL_MARKET_OPERATOR";
    }

    return "FINTECH_GENERAL";
  }

  /**
   * Evaluates whether the promotional copy crosses statutory license boundaries.
   */
  public verifyLicenseScope(input: LicenseScopeAuditInput): LicenseScopeAuditResult {
    const text = input.contentText || "";
    const tier = this.resolveLicenseTier(input.licenseTier, input.activeRegulatoryScopes);
    const detectedActivities: string[] = [];
    const blindSpots: BlindSpotAlert[] = [];

    const promotesLending =
      /\b(?:instant\s+loan|borrow\s+up\s+to|salary\s+advance|overdraft|credit\s+facility|get\s+a\s+loan|payday\s+loan)\b/i.test(
        text
      );
    const promotesDepositTaking =
      /\b(?:open\s+a\s+savings\s+account|fixed\s+deposit|save\s+and\s+earn|high[- ]yield\s+savings|deposit\s+rate|ndic\s+insured)\b/i.test(
        text
      );
    const promotesSecuritiesOrYields =
      /\b(?:invest\s+in\s+stocks|mutual\s+fund|guaranteed\s+roi|crowdfunding\s+note|tokenized\s+asset|crypto\s+yield|annual\s+dividend\s+yield)\b/i.test(
        text
      );
    const promotesNationwideCoverage =
      /\b(?:across\s+all\s+36\s+states|nationwide\s+branches|every\s+state\s+in\s+nigeria|(?:for\s+)?all\s+nigerians|every\s+nigerian)\b/i.test(
        text
      );
    const hasVagueFintechLegendWithoutLenderName =
      promotesLending &&
      /\b(?:cbn[- ]regulated\s+fintech|regulated\s+fintech)\b/i.test(text) &&
      !/\b(?:microfinance\s+bank|mfb|bank\s+plc|commercial\s+bank|finance\s+company\s+limited)\b/i.test(
        text
      );

    if (promotesLending) detectedActivities.push("CREDIT_AND_LENDING");
    if (promotesDepositTaking) detectedActivities.push("DEPOSIT_TAKING_AND_SAVINGS");
    if (promotesSecuritiesOrYields) detectedActivities.push("SECURITIES_AND_INVESTMENT_YIELDS");
    if (promotesNationwideCoverage) detectedActivities.push("NATIONWIDE_GEOGRAPHIC_SOLICITATION");

    // Rule 1: PSB / MMO / PSSB cannot grant loans or credit directly on their own balance sheet
    if (
      promotesLending &&
      (tier === "PSB_PAYMENT_SERVICE_BANK" ||
        tier === "MMO_MOBILE_MONEY" ||
        tier === "PSSB_PAYMENT_SOLUTION")
    ) {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_UNAUTHORIZED_LENDING",
        severity: "CRITICAL",
        exactQuoteOrMetric: `${tier} license advertising direct credit/loan facilities`,
        whatYouMissed: `Your institution profile is ${tier}, which is strictly prohibited by CBN Guidelines from granting loans, advances, or guarantees directly without a disclosed CBN-licensed lending partner (DMB/MFB) and prior FCCPC DEON 2025 Regulations 8 & 10–12 lending-partnership approval.`,
        whatItCostsYou:
          "CBN regulatory cease-and-desist order, heavy monetary penalty under BOFIA 2020, FCCPC DEON 2025 Regulation 22 sanctions (up to ₦100,000,000 or 1% of turnover), and potential Payment Service / PSSP license suspension.",
        oneClickFix:
          'Explicitly name the licensed underwriting partner in the ad: "Credit facilities are provided and underwritten by [Partner MFB/DMB Legal Name], licensed by the Central Bank of Nigeria (CBN)."',
        violatedStatute:
          "CBN Guidelines for PSBs/PSSPs / FCCPC DEON Regulations 2025 Regs. 8, 10–12, 19(c), 22(c)",
      });
    }

    // Rule 2: FCCPC Digital Lender or SEC Operator cannot solicit public deposits without CBN Banking/MFB license
    if (
      promotesDepositTaking &&
      (tier === "FCCPC_DIGITAL_LENDER" ||
        tier === "SEC_CAPITAL_MARKET_OPERATOR" ||
        tier === "PSSB_PAYMENT_SOLUTION")
    ) {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_UNLAWFUL_DEPOSIT_SOLICITATION",
        severity: "CRITICAL",
        exactQuoteOrMetric: `${tier} soliciting savings or fixed deposits from the public`,
        whatYouMissed:
          "Your campaign solicits savings or deposits ('Save and earn' / 'Fixed deposit'), which constitutes banking business under Section 2 of BOFIA 2020 and is illegal without a CBN Deposit Money Bank, MFB, or PSB license.",
        whatItCostsYou:
          "Account freezing by CBN/EFCC, criminal liability under BOFIA 2020 Section 2, and immediate payment gateway disconnection.",
        oneClickFix:
          'Either remove deposit/savings solicitation language or clearly disclose the CBN-licensed custodial bank holding customer funds: "Savings custody powered by [Partner Bank PLC], licensed by the CBN and insured by NDIC."',
        violatedStatute: "Banks and Other Financial Institutions Act (BOFIA) 2020 §2",
      });
    }

    // Rule 3: MFB / Digital Lender / MMO promoting investment securities or crypto yields without SEC registration
    if (
      promotesSecuritiesOrYields &&
      tier !== "SEC_CAPITAL_MARKET_OPERATOR" &&
      tier !== "DMB_COMMERCIAL_BANK"
    ) {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_UNREGISTERED_INVESTMENT_SOLICITATION",
        severity: "CRITICAL",
        exactQuoteOrMetric: `${tier} advertising investment returns / securities / digital asset yields`,
        whatYouMissed:
          "The promotion invites the public to invest for returns or digital asset yields, which requires registration as a Capital Market Operator or VASP with the Securities and Exchange Commission (SEC).",
        whatItCostsYou:
          "Public SEC 'Unregistered Investment Scheme' circular naming your brand, CBN account restriction, and heavy penalties under the Investments and Securities Act (ISA) 2025.",
        oneClickFix:
          'Remove investment yield solicitation or state the SEC-registered fund manager: "Investment products are managed by [SEC-Licensed Asset Manager], registered with the Securities and Exchange Commission (SEC)."',
        violatedStatute: "Investments and Securities Act (ISA) 2025 / SEC Rules on Digital Assets",
      });
    }

    // Rule 4: State or Unit MFB advertising nationwide operations ("all Nigerians" / "all 36 states")
    if (promotesNationwideCoverage && (tier === "MFB_STATE" || tier === "MFB_UNIT" || hasVagueFintechLegendWithoutLenderName)) {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_MFB_GEOGRAPHIC_BREACH",
        severity: "HIGH",
        exactQuoteOrMetric: `Claiming universal nationwide coverage ("for all Nigerians" / "all 36 states") under ${tier === "MFB_UNIT" ? "Unit MFB" : tier === "MFB_STATE" ? "State MFB" : "Unit/State MFB or Dual-Entity"} scope`,
        whatYouMissed:
          "A Unit or State Microfinance Bank is restricted by CBN Revised Regulatory and Supervisory Guidelines for Microfinance Banks in Nigeria to operating within its licensed local government area or state, and cannot promise credit 'for all Nigerians' nationwide without a National MFB or DMB license.",
        whatItCostsYou:
          "CBN Other Financial Institutions Supervision Department (OFISD) sanction and administrative fine for soliciting outside licensed geographical boundaries, plus CBN CPR Reg. 4.2.5(c) & FCCPA §123 enforcement for deceptive universal eligibility claims.",
        oneClickFix:
          "Qualify geographic and credit eligibility: 'Available to eligible salaried or verified residents within our licensed operating territory in Lagos State, subject to KYC, BVN, and creditworthiness assessment.'",
        violatedStatute:
          "CBN Revised Regulatory and Supervisory Guidelines for MFBs in Nigeria / CBN CPR 2019 Reg. 4.2.5(c)",
      });
    }

    // Rule 5: Vague "CBN-regulated fintech" legend in a loan ad without naming the licensed lender of record
    if (hasVagueFintechLegendWithoutLenderName) {
      blindSpots.push({
        findingCode: "INCOMPLETE_REGULATORY_LENDER_LEGEND",
        severity: "HIGH",
        exactQuoteOrMetric: `"NexaPay is a CBN-regulated fintech" (No licensed lender of record or licence category stated)`,
        whatYouMissed:
          "'Fintech' is not a statutory CBN licence class. A CBN Payment Solution Service Provider (PSSP) licence does not authorise lending on its own balance sheet. Under CBN Consumer Protection Regulations 2019 Reg. 4.2.4 (explicitly naming the CBN in an advert is restricted beyond stating the exact regulatory status) and FCCPC DEON Regulations 2025 Regs. 8, 10–12, 19(c), and 22(c), any digital lending campaign must identify the exact licensed lender of record (e.g., Unit/State/National MFB or Finance Company) and hold prior FCCPC approval for any PSSP-MFB lending partnership.",
        whatItCostsYou:
          "CBN Consumer Protection Department takedown order under Reg. 4.2.4/4.2.8 and FCCPC DEON Regulation 22 penalties (up to ₦100,000,000 or 1% of turnover, plus director disqualification).",
        oneClickFix:
          'Replace "CBN-regulated fintech" with the exact dual-entity disclosure: "Loans are offered and underwritten by [Exact Legal Name of Microfinance Bank Ltd] (Licensed by the Central Bank of Nigeria as a [Unit/State/National] Microfinance Bank). Payment processing powered by [Entity Ltd] (CBN-licensed PSSP)."',
        violatedStatute:
          "CBN CPR 2019 Reg. 4.2.4 / FCCPC DEON Regulations 2025 Regs. 8, 10–12, 19(c), 22(c)",
      });
    }

    return {
      resolvedLicenseTier: tier,
      detectedActivities,
      passedLicenseBoundary: blindSpots.length === 0,
      blindSpots,
    };
  }
}

export const licenseScopeService = new LicenseScopeService();
