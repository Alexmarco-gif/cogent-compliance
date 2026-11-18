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
  detectedPartnerTier?: InstitutionLicenseTier | null;
  detectedActivities: string[];
  passedLicenseBoundary: boolean;
  blindSpots: BlindSpotAlert[];
}

export class LicenseScopeService {
  /**
   * Normalizes a raw tenant license tier, regulatory scope array, or explicit prompt declaration
   * into a canonical InstitutionLicenseTier.
   */
  public resolveLicenseTier(
    rawTier?: string | null,
    scopes?: string[],
    contentText?: string
  ): InstitutionLicenseTier {
    const text = contentText || "";

    // Check if the prompt/PRD explicitly declares the operating entity's license (e.g. "License Held: CBN PSSP License Only")
    if (
      /\b(?:license\s+held|operating\s+license|holds?\s+a|licensed\s+as)\s*[:\-]?\s*[^.\n]*?\b(?:pssp|payment\s+solution\s+service\s+provider|switching)\b/i.test(
        text
      ) ||
      /\bcbn\s+payment\s+solution\s+service\s+provider\s*\(pssp\)\s*license\b/i.test(text)
    ) {
      return "PSSB_PAYMENT_SOLUTION";
    }
    if (
      /\b(?:license\s+held|operating\s+license|holds?\s+a)\s*[:\-]?\s*[^.\n]*?\b(?:psb|payment\s+service\s+bank)\b/i.test(
        text
      )
    ) {
      return "PSB_PAYMENT_SERVICE_BANK";
    }
    if (
      /\b(?:license\s+held|operating\s+license|holds?\s+a)\s*[:\-]?\s*[^.\n]*?\b(?:mmo|mobile\s+money\s+operator)\b/i.test(
        text
      )
    ) {
      return "MMO_MOBILE_MONEY";
    }

    const upper = (rawTier || "").toUpperCase();
    if (upper.includes("PSB") || upper.includes("PAYMENT_SERVICE_BANK")) {
      return "PSB_PAYMENT_SERVICE_BANK";
    }
    if (upper.includes("MMO") || upper.includes("MOBILE_MONEY")) {
      return "MMO_MOBILE_MONEY";
    }
    if (
      upper.includes("PSSB") ||
      upper.includes("PSSP") ||
      upper.includes("PAYMENT_SOLUTION") ||
      upper.includes("SWITCH") ||
      upper.includes("GATEWAY")
    ) {
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
   * Evaluates whether the promotional copy or product architecture crosses statutory license boundaries.
   */
  public verifyLicenseScope(input: LicenseScopeAuditInput): LicenseScopeAuditResult {
    const text = input.contentText || "";
    const tier = this.resolveLicenseTier(input.licenseTier, input.activeRegulatoryScopes, text);
    const detectedActivities: string[] = [];
    const blindSpots: BlindSpotAlert[] = [];

    let detectedPartnerTier: InstitutionLicenseTier | null = null;
    if (/\b(?:unit\s+mfb|unit\s+microfinance\s+bank|mfb\s*[—\-–]?\s*tier\s*[12])\b/i.test(text)) {
      detectedPartnerTier = "MFB_UNIT";
    } else if (/\b(?:state\s+mfb|state\s+microfinance\s+bank)\b/i.test(text)) {
      detectedPartnerTier = "MFB_STATE";
    }

    const promotesLending =
      /\b(?:instant\s+loan|instant[- ]advance|nano[- ]?loans?|borrow\s+up\s+to|salary\s+advance|overdraft|credit\s+facility|get\s+a\s+loan|payday\s+loan)\b/i.test(
        text
      );
    const promotesDepositTaking =
      /\b(?:open\s+a\s+savings\s+account|fixed\s+deposit|save\s+and\s+earn|high[- ]yield\s+savings|deposit\s+rate|ndic\s+insured|deposits?\s+insured\s+by\s+ndic|naira\s+wallet|virtual\s+nubans?|stored\s+consumer\s+wallet|pays?\s+\d+(?:\.\d+)?%\s*p\.?a\.?\s*(?:fixed\s+)?interest)\b/i.test(
        text
      );
    const promotesSecuritiesOrYields =
      /\b(?:invest\s+in\s+stocks|mutual\s+fund|guaranteed\s+roi|crowdfunding\s+note|tokenized\s+asset|crypto\s+yield|annual\s+dividend\s+yield|commercial\s+papers?|money\s+market\s+instruments?)\b/i.test(
        text
      );
    const promotesNationwideCoverage =
      /\b(?:across\s+all\s+36\s+states|nationwide\s+branches|every\s+state\s+in\s+nigeria|(?:for\s+)?all\s+nigerians|every\s+nigerian|nationwide\s+(?:ios|android|mobile|digital)?\s*(?:\/(?:android|ios))?\s*app|nationwide\s+rollout)\b/i.test(
        text
      );
    const hasVagueFintechLegendWithoutLenderName =
      promotesLending &&
      /\b(?:cbn[- ]regulated\s+fintech|regulated\s+fintech)\b/i.test(text) &&
      !/\b(?:microfinance\s+bank|mfb|bank\s+plc|commercial\s+bank|finance\s+company\s+limited)\b/i.test(
        text
      );
    const hasCorporatePoolSweepOrClosedLoopP2P =
      /\b(?:sweep\s+daily|sweeps?\s+(?:daily\s+)?into\s+[^.\n]*?(?:master\s+corporate\s+account|corporate\s+account)|stored\s+consumer\s+wallet\s+balances|internal\s+@?\w+\s+p2p\s+ledger\s+transfers|funded\s+from\s+\d+%\s+of\s+pooled)\b/i.test(
        text
      );
    const hasDeferredBvnNinOrTierExcess =
      /\b(?:bvn\s*\/?\s*nin\s+deferred|phone\s*\+\s*name\s*\+\s*dob\s+only|without\s+bvn|unlimited\s+balance|bvn\s+or\s+nin\s*\(facial\s+biometrics\s+optional\))\b/i.test(
        text
      );
    const hasOffshoreOrParallelFxWallet =
      /\b(?:ngn[- ]to[- ]usd|parallel\s+fx|peer\/parallel\s+fx|offshore\s+(?:[a-z]+\s+)?api|usd\s+sub[- ]?wallet|usd\s+wallet|holding\s+up\s+to\s+(?:\$|usd\s*)\d+)\b/i.test(
        text
      );
    const hasExclusiveForeignDataHosting =
      /\b(?:aws\s+(?:us|eu|ap|ca)[a-z0-9-]*|virginia|ireland|frankfurt|london|hosted\s+exclusively\s+(?:on\s+(?:aws|gcp|azure)\s+(?:us|eu|offshore)|outside\s+nigeria|offshore))\b/i.test(
        text
      );
    const hasDeceptiveBankNdicOrUnvettedRaffle =
      /\b(?:licensed\s+digital\s+bank|deposit[- ]linked\s+raffle|weekly\s+raffle|raffle\s+draw|lucky\s+draw|promotional\s+draw|sweepstake|lottery|giveaway|without\s+external\s+pre[- ]vetting)\b/i.test(
        text
      );

    if (promotesLending) detectedActivities.push("CREDIT_AND_LENDING");
    if (promotesDepositTaking) detectedActivities.push("DEPOSIT_TAKING_AND_SAVINGS");
    if (promotesSecuritiesOrYields) detectedActivities.push("SECURITIES_AND_INVESTMENT_YIELDS");
    if (promotesNationwideCoverage) detectedActivities.push("NATIONWIDE_GEOGRAPHIC_SOLICITATION");
    if (hasCorporatePoolSweepOrClosedLoopP2P)
      detectedActivities.push("CORPORATE_DEPOSIT_SWEEP_AND_STORED_VALUE_LEDGER");
    if (hasDeferredBvnNinOrTierExcess) detectedActivities.push("NON_COMPLIANT_KYC_TIER_STRUCTURE");
    if (hasOffshoreOrParallelFxWallet) detectedActivities.push("UNAUTHORIZED_FX_DEALING_AND_USD_CUSTODY");
    if (hasExclusiveForeignDataHosting) detectedActivities.push("CROSS_BORDER_PAYMENT_DATA_HOSTING");
    if (hasDeceptiveBankNdicOrUnvettedRaffle)
      detectedActivities.push("UNVETTED_PROMOTIONAL_LOTTERY_AND_MISLEADING_BANK_CLAIM");

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
        whatYouMissed: `Your institution profile is ${tier}, which is strictly prohibited by CBN Guidelines and BOFIA 2020 Sections 2 and 58 from granting loans, advances, or credit directly on its own balance sheet without a disclosed CBN-licensed lending partner (DMB/MFB) and prior FCCPC DEON 2025 Regulations 8 & 10–12 lending-partnership approval.`,
        whatItCostsYou:
          "CBN regulatory cease-and-desist order, heavy monetary penalty under BOFIA 2020 Sections 2 and 58, FCCPC DEON 2025 Regulation 22/27 sanctions (up to ₦100,000,000 or 1% of turnover), and PSSP/PSB/MMO license revocation.",
        oneClickFix:
          'Originate credit strictly on the balance sheet of the licensed MFB/DMB/Finance Company partner (funded only from lawful bank capital or ring-fenced MFB deposits within CBN ratios) with explicit dual-entity disclosure: "Credit facilities are provided and underwritten by [Partner MFB/DMB Legal Name], licensed by the Central Bank of Nigeria (CBN)."',
        violatedStatute:
          "BOFIA 2020 Sections 2 & 58 / CBN New Licence Categorisation Requirements 2021 / FCCPC DEON Regulations 2025 Regs. 8, 10–12, 19(c), 22(c)",
      });
    }

    // Rule 2: FCCPC Digital Lender, SEC Operator, or PSSP cannot solicit public deposits without CBN Banking/MFB/MMO license
    if (
      promotesDepositTaking &&
      (tier === "FCCPC_DIGITAL_LENDER" ||
        tier === "SEC_CAPITAL_MARKET_OPERATOR" ||
        tier === "PSSB_PAYMENT_SOLUTION")
    ) {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_UNLAWFUL_DEPOSIT_SOLICITATION",
        severity: "CRITICAL",
        exactQuoteOrMetric: `${tier} soliciting savings, consumer wallets, or deposits from the public`,
        whatYouMissed:
          "Your product solicits retail savings or stored-value consumer wallet deposits ('Save and earn' / high-yield savings vault / consumer Naira wallet), which constitutes banking business under BOFIA 2020 Sections 2 and 58 and electronic money issuance under CBN New Licence Categorisation Requirements 2021. A PSSP (₦100M capital) is strictly a technical payment gateway/switch and is barred from holding customer funds or issuing consumer wallets (which requires a Mobile Money Operator [MMO] license with ₦2B capital or a licensed MFB/DMB).",
        whatItCostsYou:
          "Account freezing by CBN/EFCC, criminal liability under BOFIA 2020 Section 2 (5 years imprisonment and/or ₦50,000,000 fine plus daily default penalties), and immediate NIBSS switching disconnection.",
        oneClickFix:
          'Domicile all customer deposits and virtual NUBANs directly on the core banking ledger of a CBN-licensed bank/MFB (with zero daily sweep into the PSSP corporate account), or acquire a CBN Mobile Money Operator (MMO) license: "Savings and wallet custody are domiciled directly with [Licensed Partner Bank], licensed by the CBN and insured by NDIC up to statutory limits."',
        violatedStatute:
          "Banks and Other Financial Institutions Act (BOFIA) 2020 Sections 2 & 58 / CBN New Licence Categorisation Requirements 2021 / CBN PSHC Guidelines 2021 Section 3.1.2",
      });
    }

    // Rule 3: MFB / Digital Lender / MMO / PSSP promoting investment securities or commercial paper yields without SEC CIS registration
    if (
      promotesSecuritiesOrYields &&
      tier !== "SEC_CAPITAL_MARKET_OPERATOR" &&
      tier !== "DMB_COMMERCIAL_BANK"
    ) {
      const yieldSnippet =
        text.match(/\b\d+(?:\.\d+)?%\s*p\.?a\.?[^.\n]{0,60}commercial\s+papers?/i)?.[0] ||
        `${tier} pooling customer funds into commercial papers / investment yields without SEC Fund Manager & CIS approval`;
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_UNREGISTERED_INVESTMENT_SOLICITATION",
        severity: "CRITICAL",
        exactQuoteOrMetric: yieldSnippet,
        whatYouMissed:
          "Pooling retail customer wallet balances to invest in commercial papers or money market instruments and pay a fixed yield constitutes an unregistered Collective Investment Scheme (CIS) and unlicensed Fund/Portfolio Management under the Investments and Securities Act (ISA) 2025 and SEC Rules.",
        whatItCostsYou:
          "Public SEC 'Unregistered Investment Scheme' cease-and-desist circular, CBN settlement account freeze, mandatory investor restitution, and severe statutory sanctions under the Investments and Securities Act (ISA) 2025 and SEC Directive on Prohibition of Guaranteed Returns.",
        oneClickFix:
          'Ring-fence any commercial-paper yield product as an SEC-registered Money Market Fund managed by an SEC-licensed Fund/Portfolio Manager with an independent SEC-registered Custodian and Trustee, requiring explicit opt-in subscription and variable net-asset-value (NAV) disclosures rather than a guaranteed fixed interest rate.',
        violatedStatute:
          "Investments and Securities Act (ISA) 2025 / SEC Rules on Collective Investment Schemes (CIS) & Fund Managers / SEC Directive on Guaranteed Returns",
      });
    }

    // Rule 4: State or Unit MFB (direct or BaaS Partner) advertising nationwide operations across Nigeria
    if (
      promotesNationwideCoverage &&
      (tier === "MFB_STATE" ||
        tier === "MFB_UNIT" ||
        detectedPartnerTier === "MFB_UNIT" ||
        detectedPartnerTier === "MFB_STATE" ||
        hasVagueFintechLegendWithoutLenderName)
    ) {
      const mfbLabel =
        tier === "MFB_UNIT" || detectedPartnerTier === "MFB_UNIT"
          ? "Unit Microfinance Bank (Tier 1 / Tier 2)"
          : tier === "MFB_STATE" || detectedPartnerTier === "MFB_STATE"
            ? "State Microfinance Bank"
            : "Unit/State Microfinance Bank or Dual-Entity";
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_MFB_GEOGRAPHIC_BREACH",
        severity: detectedPartnerTier === "MFB_UNIT" ? "CRITICAL" : "HIGH",
        exactQuoteOrMetric: `${mfbLabel} claiming nationwide distribution ("all Nigerians" / "all 36 states" / nationwide app)`,
        whatYouMissed: `A ${mfbLabel} is geographically restricted by the CBN Revised Regulatory and Supervisory Guidelines for Microfinance Banks in Nigeria (2020) (Sections 2 & 5) to operating within its licensed Local Government Area / State and is prohibited from soliciting nationwide retail deposits or promising credit 'for all Nigerians' across all 36 states without a National MFB or DMB license.`,
        whatItCostsYou:
          "CBN Other Financial Institutions Supervision Department (OFISD) cease-and-desist order, revocation or administrative fine for operating outside approved geographic boundaries, suspension of NIBSS virtual account generation, and CBN CPR Reg. 4.2.5(c) / FCCPA §123 enforcement.",
        oneClickFix:
          "Replace or augment the Unit/State MFB partner with a CBN-licensed National Microfinance Bank (₦5,000,000,000 minimum capital) or Commercial Bank (DMB) for nationwide distribution, or restrict solicitation to eligible customers within the MFB's licensed territory.",
        violatedStatute:
          "CBN Revised Regulatory and Supervisory Guidelines for Microfinance Banks in Nigeria 2020 Sections 2 & 5 / CBN CPR 2019 Reg. 4.2.5(c)",
      });
    }

    // Rule 4b: Vague "CBN-regulated fintech" legend in a loan ad without naming the licensed lender of record
    if (hasVagueFintechLegendWithoutLenderName) {
      const vagueSnippet =
        text.match(/[^\n]*(?:cbn[- ]regulated\s+fintech|regulated\s+fintech)[^\n]*/i)?.[0]?.trim() ||
        "Vague 'CBN-regulated fintech' legend without naming licensed lender of record";
      blindSpots.push({
        findingCode: "INCOMPLETE_REGULATORY_LENDER_LEGEND",
        severity: "HIGH",
        exactQuoteOrMetric: vagueSnippet.slice(0, 180),
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

    // Rule 5: Corporate pool sweeping of virtual NUBANs & internal P2P ledger transfers by a PSSP
    if (hasCorporatePoolSweepOrClosedLoopP2P && tier === "PSSB_PAYMENT_SOLUTION") {
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_PSSP_POOL_SWEEP_AND_P2P_LEDGER_BREACH",
        severity: "CRITICAL",
        exactQuoteOrMetric:
          "Daily sweep of virtual NUBAN inflows into PSSP corporate account + internal P2P consumer wallet ledger",
        whatYouMissed:
          "Sweeping retail customer deposits daily from partner MFB virtual NUBANs into a PSSP's Master Corporate Account commingles client funds with corporate assets, destroys individual customer ledger segregation, and voids NDIC pass-through protection. Additionally, maintaining stored consumer wallet balances with internal closed-loop P2P ledger transfers is an exclusive Mobile Money Operator (MMO) / banking activity prohibited for a PSSP under the CBN PSHC Guidelines 2021 (Section 3.1.2) and CBN Virtual Account Guidelines.",
        whatItCostsYou:
          "Immediate CBN Payment System Management Department (PSMD) suspension of PSSP license, NIBSS NIP disconnection, and regulatory prosecution under BOFIA 2020 Sections 2 and 58.",
        oneClickFix:
          "Eliminate the daily corporate account sweep completely. Keep every customer's funds segregated in individual NUBAN accounts on the licensed partner bank's core banking ledger, and route P2P transfers via the partner bank's regulated ledger or NIBSS NIP with full AML/CFT transaction monitoring.",
        violatedStatute:
          "BOFIA 2020 Sections 2 & 58 / CBN PSHC Guidelines 2021 Section 3.1.2 / CBN Circular on Virtual Accounts",
      });
    }

    // Rule 6: CBN Dec 2023 Tier-1 BVN/NIN Mandate & Three-Tiered KYC Limits Breach
    if (hasDeferredBvnNinOrTierExcess) {
      const kycSnippet =
        text.match(/[^\n]*(?:bvn\s*\/?\s*nin\s+deferred|unlimited\s+balance|without\s+bvn)[^\n]*/i)?.[0]?.trim() ||
        "Non-compliant Tiered KYC onboarding (deferred BVN/NIN, optional biometrics, or Unlimited balance cap)";
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_CBN_2023_TIER1_KYC_BVN_NIN_BREACH",
        severity: "CRITICAL",
        exactQuoteOrMetric: kycSnippet.slice(0, 180),
        whatYouMissed:
          "Under CBN Circular PSM/DIR/PUB/CIR/001/053 of 1 December 2023, the CBN abolished zero-BVN/NIN Tier-1 account opening: every new Tier-1 wallet/account MUST be opened with a validated BVN or NIN at onboarding (any deferral is illegal). Furthermore, Tier-1 accounts are capped at ₦50,000 daily transaction / ₦300,000 cumulative balance, Tier 2/3 accounts require BOTH BVN and NIN with mandatory biometric/facial verification against NIBSS/NIMC, and offering an 'Unlimited' retail mobile wallet balance violates CBN Three-Tiered KYC and MLPPA 2022 Sections 2–7 & 12.",
        whatItCostsYou:
          "Mandatory account-opening freeze, CBN AML/CFT administrative fines under the CBN Customer Due Diligence Regulations 2023 (Regulation 16) and MLPPA 2022, and NFIU sanction for unmonitored high-value wallets.",
        oneClickFix:
          "Enforce mandatory BVN or NIN + facial biometric validation at Day-0 onboarding before generating any NUBAN. Align limits strictly to CBN Three-Tiered KYC: Tier 1 (BVN or NIN: ₦50,000 daily / ₦300,000 max balance), Tier 2 (BVN + NIN: ₦200,000 daily / ₦500,000 max balance), and Tier 3 (BVN + NIN + verified address + EDD: ₦5,000,000 daily cap with automated NFIU CTR filing at ₦5,000,000).",
        violatedStatute:
          "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) / CBN CDD Regulations 2023 Reg. 16 / MLPPA 2022 Sections 2–7 & 12",
      });
    }

    // Rule 7: Unauthorized FX Dealing, Parallel Rate Conversion & Offshore USD Sub-Wallet
    if (hasOffshoreOrParallelFxWallet && tier !== "DMB_COMMERCIAL_BANK") {
      const fxSnippet =
        text.match(/[^\n]*(?:ngn[- ]to[- ]usd|parallel\s+fx|offshore\s+[a-z]+\s+api|usd\s+wallet)[^\n]*/i)?.[0]?.trim() ||
        "Unauthorized in-app NGN-to-USD conversion at peer/parallel FX rates and offshore USD sub-wallet custody";
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_UNAUTHORIZED_FX_AND_OFFSHORE_USD_WALLET",
        severity: "CRITICAL",
        exactQuoteOrMetric: fxSnippet.slice(0, 180),
        whatYouMissed:
          "Operating an in-app NGN-to-USD conversion engine at peer/parallel exchange rates and holding USD balances via an offshore API violates the Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995 (Sections 1, 5 & 6) and the CBN Revised IMTO Guidelines (January 2024). Only CBN-licensed Authorized Dealers (Commercial/Merchant Banks) may conduct retail foreign exchange conversion, strictly at official Nigerian Autonomous Foreign Exchange Market (NAFEM / EFEMS) rates, and fintechs/IMTOs are prohibited from domestic NGN-to-USD conversion or holding onshore retail USD wallets.",
        whatItCostsYou:
          "Criminal prosecution by EFCC/CBN for illegal foreign exchange dealing and parallel-market rate manipulation under the Foreign Exchange Act 1995, immediate freezing of all Nigerian bank settlement accounts, and permanent revocation of CBN licenses.",
        oneClickFix:
          "Scrap the offshore parallel-rate USD sub-wallet entirely. If USD domiciliary savings are desired, offer a referral/API integration to a CBN-licensed Commercial Bank (Authorized Dealer) where the customer opens a regulated Domiciliary Account directly with the Commercial Bank at official NAFEM rates.",
        violatedStatute:
          "Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995 Sections 1, 5 & 6 / CBN Revised IMTO Guidelines 2024 / BOFIA 2020 Section 2",
      });
    }

    // Rule 8: Exclusive Offshore Hosting vs. CBN In-Country Payment Data Localization & NDPA Cross-Border Rules
    if (hasExclusiveForeignDataHosting) {
      const hostingSnippet =
        text.match(/[^\n]*(?:aws\s+(?:us|eu|ap|ca)[a-z0-9-]*|hosted\s+exclusively\s+[^\n]+)[^\n]*/i)?.[0]?.trim() ||
        "Nigerian KYC, payment transaction, and contact data hosted exclusively on offshore cloud infrastructure";
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_DATA_LOCALIZATION_AND_CROSS_BORDER_BREACH",
        severity: "HIGH",
        exactQuoteOrMetric: hostingSnippet.slice(0, 180),
        whatYouMissed:
          "Hosting Nigerian payment transaction records and customer KYC exclusively on offshore cloud infrastructure violates CBN Circular PSS/DIR/PUB/CIR/001/004 of 15 June 2026 (requiring all payment transaction data in Nigeria to be stored and processed in-country within Nigeria by 1 January 2027) and CBN Point-of-Sale/Sovereign Data localization rules. It also breaches NDPA 2023 Sections 41–43 and NDPC GAID 2025 Article 45 & Schedule 5 on cross-border data transfers (and note that migrating solely to a foreign African cloud region such as AWS Cape Town still violates CBN's in-country Nigeria payment data localization mandate).",
        whatItCostsYou:
          "NDPC enforcement penalty up to 2% of annual gross revenue or ₦10,000,000 (whichever is higher) under NDPA 2023 Section 48, plus CBN PSMD suspension of payment switching/PSSP operations for non-compliance with in-country data residency.",
        oneClickFix:
          "Deploy primary production databases for Nigerian payment transactions and KYC records inside a Tier-III/IV data center physically located in Nigeria (e.g., Rack Centre, Equinix/MainOne MDXi Lagos, or Africa Data Centres LOS1). If encrypted disaster-recovery backups are replicated offshore, execute NDPC-approved Standard Contractual Clauses, a Transfer Impact Assessment (TIA), and a Data Protection Impact Assessment (DPIA) under NDPA 2023 Sections 41–43 and NDPC GAID 2025 Article 45.",
        violatedStatute:
          "CBN Circular PSS/DIR/PUB/CIR/001/004 (15 June 2026) / NDPA 2023 Sections 24–27 & 41–43 / NDPC GAID 2025 Art. 45 & Schedule 5",
      });
    }

    // Rule 9: False "Licensed Digital Bank" & Unqualified NDIC Claim + Unvetted Promo Raffle
    if (hasDeceptiveBankNdicOrUnvettedRaffle) {
      const promoSnippet =
        text.match(/[^\n]*(?:licensed\s+digital\s+bank|weekly\s+raffle|raffle\s+draw|without\s+external\s+pre[- ]vetting)[^\n]*/i)?.[0]?.trim() ||
        "Unqualified 'Licensed Digital Bank / Deposits Insured by NDIC' claim and/or unvetted promotional raffle campaign";
      blindSpots.push({
        findingCode: "LICENSE_SCOPE_FALSE_BANK_NDIC_AND_UNVETTED_LOTTERY_PROMO",
        severity: "CRITICAL",
        exactQuoteOrMetric: promoSnippet.slice(0, 180),
        whatYouMissed:
          "1) Calling a non-bank fintech/PSSP a 'Licensed Digital Bank' is a criminal offence under BOFIA 2020 Section 59 (prohibiting use of the word 'Bank' by non-banks). 2) Claiming unqualified NDIC insurance for a PSSP is false and misleading under the NDIC Act 2023 and FCCPA 2018 Sections 103–105 & 115—NDIC coverage (revised May 2024 to ₦2,000,000 max per depositor for MFBs and ₦5,000,000 for DMBs) attaches only to deposits held directly in the licensed MFB's books and is voided by corporate sweeping or commercial paper pooling. 3) Launching a deposit-entry promotional raffle on social media without prior vetting violates ARCON Act 2022 Sections 54 & 57 (mandatory ASP Certificate of Approval before any public/social media exposure) and requires promotional lottery permits from the National Lottery Regulatory Commission (NLRC) / Lagos State Lotteries and Gaming Authority (LSLGA) and FCCPC notification.",
        whatItCostsYou:
          "Criminal liability under BOFIA 2020 Section 59, ARCON Advertising Offences Tribunal fines (minimum ₦500,000 per unvetted ad exposure under ARCON Act Section 54), NLRC/FCCPC shutdown of the promotional draw, and NDIC cease-and-desist order.",
        oneClickFix:
          'Obtain an NLRC/LSLGA promotional permit, file FCCPC sales-promotion terms, secure an ARCON ASP Certificate ID before publishing, and replace the footer with: "[Entity Name] is a Payment Solution Service Provider licensed by the Central Bank of Nigeria (CBN). Banking and deposit services are provided by [Licensed Partner Bank Name], licensed by the CBN and insured by the NDIC up to statutory limits (₦2,000,000 per depositor for MFBs). Terms and Conditions apply. [ARCON ASP Certificate No.]"',
        violatedStatute:
          "BOFIA 2020 Section 59 / NDIC Act 2023 (₦2M MFB limit) / ARCON Act 2022 Sections 54 & 57 / NLRC Act 2005 / FCCPA 2018 Sections 103–105 & 115",
      });
    }

    return {
      resolvedLicenseTier: tier,
      detectedPartnerTier,
      detectedActivities,
      passedLicenseBoundary: blindSpots.length === 0,
      blindSpots,
    };
  }
}

export const licenseScopeService = new LicenseScopeService();
