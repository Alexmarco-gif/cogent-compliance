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
      /\b(?:across\s+all\s+36\s+states|nationwide\s+branches|every\s+state\s+in\s+nigeria)\b/i.test(
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
        whatYouMissed: `Your institution profile is ${tier}, which is strictly prohibited by CBN Guidelines from granting loans, advances, or guarantees directly without a disclosed CBN-licensed lending partner (DMB/MFB).`,
        whatItCostsYou:
          "CBN regulatory cease-and-desist order, heavy monetary penalty under BOFIA 2020, and potential Payment Service Bank / MMO license suspension.",
        oneClickFix:
          'Explicitly name the licensed underwriting partner in the ad: "Credit facilities are provided and underwritten by [Partner MFB/DMB Name], licensed by the Central Bank of Nigeria."',
        violatedStatute: "CBN Guidelines for Payment Service Banks (PSBs) / MMO Framework",
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

    // Rule 4: State or Unit MFB advertising nationwide operations across all 36 states
    if (promotesNationwideCoverage && (tier === "MFB_STATE" || tier === "MFB_UNIT")) {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_MFB_GEOGRAPHIC_BREACH",
        severity: "HIGH",
        exactQuoteOrMetric: `${tier} claiming nationwide 36-state banking operations`,
        whatYouMissed: `A ${tier === "MFB_UNIT" ? "Unit" : "State"} Microfinance Bank is restricted by CBN Guidelines to operating within its licensed state/local government area and cannot solicit nationwide branch banking without a National MFB license.`,
        whatItCostsYou:
          "CBN Other Financial Institutions Supervision Department (OFISD) sanction and fine for operating outside licensed geographical boundaries.",
        oneClickFix:
          "Qualify geographic availability to your licensed state of operation or remove 'all 36 states' claims.",
        violatedStatute: "CBN Revised Regulatory and Supervisory Guidelines for MFBs in Nigeria",
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
