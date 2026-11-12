/**
 * Cogent Marketing Shield - 3 Deterministic Mechanical Locks
 * Document Reference: Document 05 (Section 6), Document 07 (Section 7.2), Document 08 (Phase 5 Task 4)
 *
 * Rules:
 * - Pure deterministic TypeScript + PostgreSQL execution
 * - Never delegates to LLM reasoning
 * - Evaluates independently before and after AI reasoning
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface MechanicalLocksInput {
  tenantId: string;
  campaignId?: string;
  contentText: string;
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

export interface LockBreach {
  lockNumber: 1 | 2 | 3;
  lockName: string;
  breachType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  matchedText: string;
  explanation: string;
  statutoryReference?: string;
}

export interface MechanicalLocksResult {
  passed: boolean;
  lock1_prohibited_terms: {
    passed: boolean;
    breaches: LockBreach[];
  };
  lock2_product_rate_match: {
    passed: boolean;
    breaches: LockBreach[];
  };
  lock3_mandatory_disclosures: {
    passed: boolean;
    breaches: LockBreach[];
    missingDisclosures: string[];
  };
  totalBreachCount: number;
}

/**
 * Built-in Nigerian statutory prohibited and deceptive marketing terms (CBN CPF, ARCON ASP, FCCPA).
 */
const STATUTORY_PROHIBITED_TERMS = [
  {
    term: "100% risk-free",
    category: "DECEPTIVE_GUARANTEE",
    reason: "Strictly prohibited by SEC and CBN CPF §4.2; all financial products carry inherent risk.",
    severity: "CRITICAL" as const,
    statutoryRef: "CBN CPF §4.2.1 / SEC Rule 102",
  },
  {
    term: "guaranteed returns",
    category: "DECEPTIVE_GUARANTEE",
    reason: "Guaranteed investment or lending yields violate SEC and CBN advertising rules.",
    severity: "CRITICAL" as const,
    statutoryRef: "SEC Investments & Securities Act 2025 / CBN CPF",
  },
  {
    term: "no credit check ever",
    category: "PREDATORY_LENDING",
    reason: "Violates FCCPC DEON Guidelines §4 and CBN Credit Risk Guidelines requiring KYC/credit bureau checks.",
    severity: "HIGH" as const,
    statutoryRef: "FCCPC DEON Lending Guidelines 2025 §4",
  },
  {
    term: "free money",
    category: "MISLEADING_PROMOTION",
    reason: "Prohibited promotional baiting under FCCPA 2018 Section 123.",
    severity: "HIGH" as const,
    statutoryRef: "FCCPA 2018 §123",
  },
  {
    term: "instant loan no repayment",
    category: "FRAUDULENT_MARKETING",
    reason: "Blatantly deceptive claim prohibited under FCCPC & CBN Consumer Protection Regulations.",
    severity: "CRITICAL" as const,
    statutoryRef: "CBN Consumer Protection Regulations 2019 §3.2",
  },
  {
    term: "cbn approved returns",
    category: "FALSE_REGULATORY_ENDORSEMENT",
    reason: "Central Bank of Nigeria does not guarantee or endorse commercial returns or yields.",
    severity: "CRITICAL" as const,
    statutoryRef: "CBN Circular CMD/DIR/PUB/CIR/001/003",
  },
  {
    term: "zero interest forever",
    category: "DECEPTIVE_FEE_CLAIM",
    reason: "Disguising administrative fees under a zero interest headline constitutes deceptive advertising.",
    severity: "HIGH" as const,
    statutoryRef: "FCCPC Sales Promotion Regulations 2026 §32",
  },
  {
    term: "unlimited loan approval",
    category: "PREDATORY_LENDING",
    reason: "Contradicts mandatory responsible lending and affordability assessment regulations.",
    severity: "HIGH" as const,
    statutoryRef: "FCCPC DEON Lending Regulations 2025",
  },
  {
    term: "zero risk",
    category: "DECEPTIVE_GUARANTEE",
    reason: "False safety claim prohibited in financial promotion.",
    severity: "HIGH" as const,
    statutoryRef: "CBN CPF Part 4",
  },
  {
    term: "ndic covers all losses",
    category: "MISLEADING_INSURANCE_SCOPE",
    reason: "NDIC deposit insurance is subject to statutory maximum insured limits (₦5,000,000 for DMBs / ₦2,000,000 for MFBs).",
    severity: "HIGH" as const,
    statutoryRef: "NDIC Act / CBN Guidelines",
  },
];

export class MechanicalLocksEngine {
  /**
   * Executes all 3 Mechanical Locks deterministically.
   */
  public async executeLocks(input: MechanicalLocksInput): Promise<MechanicalLocksResult> {
    const breaches: LockBreach[] = [];

    // Lock 1: Prohibited Lexicon Scanner
    const lock1Breaches = await this.executeLock1(input);
    breaches.push(...lock1Breaches);

    // Lock 2: Product Rate, Fee & Tenor Truth Matcher
    const lock2Breaches = this.executeLock2(input);
    breaches.push(...lock2Breaches);

    // Lock 3: Mandatory Statutory & Institutional Disclosure Checker
    const { breaches: lock3Breaches, missingDisclosures } = this.executeLock3(input);
    breaches.push(...lock3Breaches);

    const passed = breaches.length === 0;

    logger.info("Executed 3 Deterministic Mechanical Locks", {
      tenantId: input.tenantId,
      campaignId: input.campaignId,
      passed,
      lock1BreachCount: lock1Breaches.length,
      lock2BreachCount: lock2Breaches.length,
      lock3BreachCount: lock3Breaches.length,
      totalBreachCount: breaches.length,
    });

    return {
      passed,
      lock1_prohibited_terms: {
        passed: lock1Breaches.length === 0,
        breaches: lock1Breaches,
      },
      lock2_product_rate_match: {
        passed: lock2Breaches.length === 0,
        breaches: lock2Breaches,
      },
      lock3_mandatory_disclosures: {
        passed: lock3Breaches.length === 0,
        breaches: lock3Breaches,
        missingDisclosures,
      },
      totalBreachCount: breaches.length,
    };
  }

  /**
   * Lock 1: Scans against statutory & active institutional prohibited terms in DB.
   */
  private async executeLock1(input: MechanicalLocksInput): Promise<LockBreach[]> {
    const breaches: LockBreach[] = [];
    const normalizedText = input.contentText.toLowerCase();

    // 1. Check built-in statutory prohibited terms
    for (const rule of STATUTORY_PROHIBITED_TERMS) {
      if (normalizedText.includes(rule.term.toLowerCase())) {
        breaches.push({
          lockNumber: 1,
          lockName: "Lock 1: Prohibited Lexicon Scanner",
          breachType: rule.category,
          severity: rule.severity,
          matchedText: rule.term,
          explanation: rule.reason,
          statutoryReference: rule.statutoryRef,
        });
      }
    }

    // 2. Check active tenant-specific institutional terms in PostgreSQL
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("mock")) {
      try {
        const supabase = createAdminSupabaseClient();
        const { data: dbTerms } = await supabase
          .from("prohibited_terms")
          .select("term, category, reason, severity, matching_mode")
          .eq("status", "ACTIVE")
          .or(`tenant_id.is.null,tenant_id.eq.${input.tenantId}`);

      if (dbTerms && dbTerms.length > 0) {
        for (const item of dbTerms) {
          const needle = item.term.toLowerCase();
          let matched = false;

          if (item.matching_mode === "REGEX") {
            try {
              const regex = new RegExp(item.term, "i");
              matched = regex.test(input.contentText);
            } catch {
              matched = normalizedText.includes(needle);
            }
          } else {
            matched = normalizedText.includes(needle);
          }

          if (matched && !breaches.some((b) => b.matchedText.toLowerCase() === needle)) {
            breaches.push({
              lockNumber: 1,
              lockName: "Lock 1: Prohibited Lexicon Scanner",
              breachType: item.category,
              severity: item.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
              matchedText: item.term,
              explanation: item.reason,
            });
          }
        }
      }
    } catch (err) {
      logger.warn("Database prohibited terms scan encountered error, built-in rules applied", {
        error: (err as Error).message,
      });
    }
  }

    return breaches;
  }

  /**
   * Lock 2: Product Rate, Fee & Tenor Truth Matcher.
   * Compares numerical claims in campaign against linked campaign_products truth.
   */
  private executeLock2(input: MechanicalLocksInput): LockBreach[] {
    const breaches: LockBreach[] = [];
    if (!input.productTruth) return breaches;

    const { productTruth, contentText } = input;
    const lower = contentText.toLowerCase();

    // Check for "0% interest" or "zero interest" claims when product truth has interest rate > 0
    if (
      (productTruth.interestRateMin && productTruth.interestRateMin > 0) ||
      (productTruth.interestRateMax && productTruth.interestRateMax > 0)
    ) {
      if (/(?:\b0%|\bzero\s*percent|\bzero\s*interest|\bno\s*interest)/i.test(contentText)) {
        breaches.push({
          lockNumber: 2,
          lockName: "Lock 2: Product Rate Truth Matcher",
          breachType: "INTEREST_RATE_MISMATCH",
          severity: "CRITICAL",
          matchedText: "0% / zero interest",
          explanation: `Campaign advertises 0% interest, but ${productTruth.productName} product truth specifies a rate of ${productTruth.interestRateMin}% - ${productTruth.interestRateMax}%.`,
          statutoryReference: "CBN CPF §4.2.1 / FCCPC DEON Guidelines §6",
        });
      }
    }

    // Check for "0 fees" or "no fees" claims when fees exist
    if (
      (productTruth.processingFeePercent && productTruth.processingFeePercent > 0) ||
      (productTruth.managementFeePercent && productTruth.managementFeePercent > 0)
    ) {
      if (/\b(?:no\s*fees|0\s*fees|zero\s*fees|completely\s*free)\b/i.test(lower)) {
        breaches.push({
          lockNumber: 2,
          lockName: "Lock 2: Product Fee Truth Matcher",
          breachType: "FEE_SCHEDULE_MISMATCH",
          severity: "HIGH",
          matchedText: "no fees / zero fees",
          explanation: `Campaign claims zero fees, but institutional product terms mandate a processing fee of ${productTruth.processingFeePercent}%.`,
          statutoryReference: "CBN Consumer Protection Regulations 2019 §3.2.3",
        });
      }
    }

    return breaches;
  }

  /**
   * Lock 3: Mandatory Statutory & Institutional Disclosure Checker.
   */
  private executeLock3(input: MechanicalLocksInput): {
    breaches: LockBreach[];
    missingDisclosures: string[];
  } {
    const breaches: LockBreach[] = [];
    const missingDisclosures: string[] = [];
    const content = input.contentText;
    const lower = content.toLowerCase();

    // Disclosure 1: Regulatory Licensing & Oversight statement
    const hasRegulatorNotice =
      /licensed by (?:the )?central bank of nigeria/i.test(content) ||
      /regulated by (?:the )?(?:cbn|fccpc|sec|arcon)/i.test(content) ||
      /\b(?:cbn|fccpc) licensed\b/i.test(content);

    if (!hasRegulatorNotice) {
      missingDisclosures.push("Regulatory License / Oversight Notice (e.g. 'Licensed by the Central Bank of Nigeria')");
      breaches.push({
        lockNumber: 3,
        lockName: "Lock 3: Mandatory Disclosures Checklist",
        breachType: "MISSING_REGULATORY_LICENSE_DISCLOSURE",
        severity: "HIGH",
        matchedText: "[Omitted Regulatory Disclosure]",
        explanation: "Promotional marketing materials for financial products must explicitly disclose the institution's regulatory status.",
        statutoryReference: "CBN Guidelines on Advertisements / FCCPC DEON Guidelines 2025",
      });
    }

    // Disclosure 2: Terms and Conditions
    const hasTermsNotice =
      /terms\s*(?:and|&)\s*conditions\s*apply/i.test(lower) ||
      /\bt&cs?\s*apply/i.test(lower) ||
      /conditions\s*apply/i.test(lower);

    if (!hasTermsNotice) {
      missingDisclosures.push("Terms & Conditions Disclaimer ('Terms and conditions apply')");
      breaches.push({
        lockNumber: 3,
        lockName: "Lock 3: Mandatory Disclosures Checklist",
        breachType: "MISSING_TERMS_AND_CONDITIONS",
        severity: "MEDIUM",
        matchedText: "[Omitted T&C Disclaimer]",
        explanation: "Financial promotions must explicitly notify consumers that terms and conditions apply.",
        statutoryReference: "ARCON Vetting Guidelines §5 / CBN CPF §4.2",
      });
    }

    // Disclosure 3: APR disclosure when interest or loan is advertised
    const mentionsCredit = /\b(?:loan|credit|borrow|interest|repayment|apr)\b/i.test(lower);
    const mentionsApr = /\bapr\b|\bannual percentage rate\b|\btotal cost of credit\b/i.test(lower);

    if (mentionsCredit && !mentionsApr) {
      missingDisclosures.push("Annual Percentage Rate (APR) or Total Cost of Credit");
      breaches.push({
        lockNumber: 3,
        lockName: "Lock 3: Mandatory Disclosures Checklist",
        breachType: "MISSING_MANDATORY_APR_DISCLOSURE",
        severity: "HIGH",
        matchedText: "[Omitted APR Disclosure]",
        explanation: "Any promotion advertising consumer credit, loans, or interest rates must prominently disclose the annualized percentage rate (APR) or total cost of credit.",
        statutoryReference: "CBN CPF Part 4 §4.2.1 / FCCPC DEON Lending Regulations 2025 §7",
      });
    }

    return { breaches, missingDisclosures };
  }
}

export const mechanicalLocksEngine = new MechanicalLocksEngine();
