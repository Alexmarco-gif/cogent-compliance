/**
 * Cogent Marketing Shield - App Store, Landing Page & NDPC Dark-Pattern Auditor
 * Document Reference: Document 13 (Section 3.1, Section 4.2 Tool 20), FCCPC DEON Lending
 * Regulations 2025/2026, Google Play Personal Loans Policy (Nigeria), NDPA 2023 & NDPC GAID 2025.
 *
 * Audits Google Play / Apple App Store descriptions and landing page copy for:
 * - Short-term loan ban (< 60 days repayment window)
 * - Missing Mandatory App Store Loan Disclosures (Min/Max Tenor, Max APR, Representative Example)
 * - FCCPC DEON banned contact-list/photo scraping & debt-shaming language
 * - Missing 24-hour / 14-day CBN/FCCPC complaint resolution channel
 * - NDPC GAID 2025 bundled or pre-ticked marketing consent dark patterns
 */

import { BlindSpotAlert } from "@/modules/compliance-assessment/apr-calculator.service";
import { CampaignProduct } from "@/contracts/knowledge-product.contracts";

export interface AppStoreAuditInput {
  listingText: string;
  url?: string;
  product?: CampaignProduct | null;
}

export interface AppStoreAuditResult {
  passed: boolean;
  hasShortTenorViolation: boolean;
  detectedMinTenorDays: number | null;
  detectedMaxTenorDays: number | null;
  hasMinMaxRepaymentDisclosure: boolean;
  hasMaxAprDisclosure: boolean;
  hasRepresentativeExample: boolean;
  hasBannedPrivacyOrRecoveryTrap: boolean;
  hasComplaintResolutionChannel: boolean;
  hasBundledConsentDarkPattern: boolean;
  blindSpots: BlindSpotAlert[];
}

const BANNED_RECOVERY_AND_PRIVACY_PATTERNS = [
  /\b(?:access\s+(?:your\s+)?contacts?|read\s+contact\s+list|scrape\s+contacts?|notify\s+your\s+contacts?|message\s+your\s+family|call\s+your\s+employers?)\b/i,
  /\b(?:access\s+(?:your\s+)?(?:photos?|gallery|call\s+logs?|sms\s+inbox))\b/i,
  /\b(?:public\s+shaming|blacklist\s+your\s+bvn\s+permanently\s+without\s+notice)\b/i,
];

const BUNDLED_CONSENT_PATTERNS = [
  /\bby\s+(?:signing\s+up|clicking\s+continue|registering|creating\s+an\s+account|applying)\s*,?\s*you\s+(?:automatically\s+)?(?:agree|consent)\s+to\s+(?:our\s+terms\s+and\s+)?receive\s+(?:marketing|promotional)\b/i,
  /\bpre[- ]?ticked\s+consent\b/i,
];

export class AppStoreAuditorService {
  /**
   * Executes deterministic compliance checks against FCCPC DEON, Google Play Nigeria Loan Policy,
   * and NDPC GAID 2025 consent rules.
   */
  public auditListingOrLandingPage(input: AppStoreAuditInput): AppStoreAuditResult {
    const text = input.listingText || "";
    const lower = text.toLowerCase();
    const productTerms = input.product?.approved_terms;

    // 1. Detect tenor range in listing or linked product truth
    let detectedMinTenorDays: number | null = productTerms?.tenor_min_days ?? null;
    let detectedMaxTenorDays: number | null = productTerms?.tenor_max_days ?? null;

    const rangeMatch = text.match(/(\d{1,3})\s*(?:to|[-–])\s*(\d{1,4})\s*days/i);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
      detectedMinTenorDays = parseInt(rangeMatch[1], 10);
      detectedMaxTenorDays = parseInt(rangeMatch[2], 10);
    } else {
      const singleDayMatches = [...text.matchAll(/\b(\d{1,3})\s*[- ]?days?\b/gi)];
      if (singleDayMatches.length > 0) {
        const dayNumbers = singleDayMatches
          .map((m) => (m[1] ? parseInt(m[1], 10) : NaN))
          .filter((n) => !isNaN(n) && n >= 1 && n <= 1825);
        if (dayNumbers.length > 0) {
          detectedMinTenorDays = Math.min(...dayNumbers);
          detectedMaxTenorDays = Math.max(...dayNumbers);
        }
      }
    }

    const hasShortTenorViolation =
      (detectedMaxTenorDays !== null && detectedMaxTenorDays < 60) ||
      (detectedMinTenorDays !== null &&
        detectedMaxTenorDays === null &&
        detectedMinTenorDays < 60);

    // 2. Check mandatory Google Play / FCCPC DEON listing disclosures
    const hasMinMaxRepaymentDisclosure =
      Boolean(rangeMatch) ||
      /(?:minimum|min)\s+and\s+(?:maximum|max)\s+period\s+for\s+repayment/i.test(text) ||
      /repayment\s+(?:period|tenor|duration)\s*:\s*\d+/i.test(text);

    const hasMaxAprDisclosure =
      /(?:maximum\s+apr|annual\s+percentage\s+rate\s*\(?apr\)?|apr\s*(?:of|is|:|up\s+to)?\s*\d+(?:\.\d+)?\s*%)/i.test(
        text
      );

    const hasRepresentativeExample =
      /(?:representative\s+example|for\s+example\s*,?\s*if\s+you\s+borrow|sample\s+loan\s+calculation|total\s+cost\s+of\s+credit)/i.test(
        text
      );

    // 3. Check banned FCCPC DEON contact/photo scraping or abusive recovery language
    const bannedMatch = BANNED_RECOVERY_AND_PRIVACY_PATTERNS.map((rx) => text.match(rx)).find(
      Boolean
    );
    const hasBannedPrivacyOrRecoveryTrap = Boolean(bannedMatch);

    // 4. Check CBN / FCCPC mandatory complaint resolution channel disclosure
    const hasComplaintResolutionChannel =
      /(?:complaint|redress|dispute|support|helpdesk|customer\s+care|@|\+234|0[789][01]\d{8}|fccpc|cbn\s+cpd)/i.test(
        lower
      ) && /(?:24\s*hours?|48\s*hours?|14\s*days?|resolve|support|contact)/i.test(lower);

    // 5. Check NDPC GAID 2025 bundled consent dark pattern
    const hasBundledConsentDarkPattern = BUNDLED_CONSENT_PATTERNS.some((rx) => rx.test(text));

    const blindSpots: BlindSpotAlert[] = [];

    if (hasShortTenorViolation) {
      const shownTenor = detectedMaxTenorDays ?? detectedMinTenorDays ?? 30;
      blindSpots.push({
        findingCode: "APP_STORE_SHORT_TENOR_TRAP",
        severity: "CRITICAL",
        exactQuoteOrMetric: `Detected repayment tenor of ${shownTenor} days (< 60 days threshold)`,
        whatYouMissed: `Your landing page or store listing references a ${shownTenor}-day repayment period without a 60+ day maximum repayment option. Google Play's Financial Services Policy for Nigeria classifies loans requiring full repayment in under 60 days as prohibited short-term personal loans.`,
        whatItCostsYou:
          "Immediate Google Play Store app removal/suspension in Nigeria and FCCPC Digital Lending Taskforce delisting.",
        oneClickFix:
          'Update product tenor bounds and listing text to state: "Minimum and maximum repayment period: 61 days to 180 days."',
        violatedStatute: "Google Play Personal Loans Policy (Nigeria) / FCCPC DEON Guidelines 2025",
      });
    }

    if (!hasMaxAprDisclosure || !hasRepresentativeExample) {
      blindSpots.push({
        findingCode: "MISSING_KFS_REPRESENTATIVE_EXAMPLE",
        severity: "HIGH",
        exactQuoteOrMetric: !hasMaxAprDisclosure
          ? "Missing Maximum APR (%) disclosure"
          : "Missing Representative Total Cost of Credit Example",
        whatYouMissed:
          "Your page or app listing omits a complete Representative Loan Example showing Principal, Interest, All Processing/Management Fees, Net Disbursed Amount, Total Repayable, and Maximum APR before sign-up.",
        whatItCostsYou:
          "Violation of CBN Consumer Protection Regulations §3.2.1 (Pre-Contractual Key Facts Statement) and Google Play metadata rejection.",
        oneClickFix:
          'Embed the auto-generated CBN Key Facts Statement (KFS) table and add: "Representative Example: Borrow ₦50,000 over 90 days at 4% monthly interest and 1.5% processing fee. Net Disbursed: ₦49,250. Total Repayable: ₦56,750. Maximum APR: 54% p.a."',
        violatedStatute: "CBN Consumer Protection Regulations 2019 §3.2.1 / FCCPC DEON Reg. 2025",
      });
    }

    if (hasBannedPrivacyOrRecoveryTrap) {
      blindSpots.push({
        findingCode: "FCCPC_DEON_CONTACT_SCRAPING_BAN",
        severity: "CRITICAL",
        exactQuoteOrMetric: bannedMatch?.[0] || "Contact list / gallery / coercive recovery access",
        whatYouMissed: `Your copy or terms reference "${bannedMatch?.[0] || "contact/gallery access"}". Accessing borrower contact lists, photos, or call logs, or threatening third-party debt shaming, is strictly outlawed in Nigeria.`,
        whatItCostsYou:
          "Immediate revocation of FCCPC Digital Lending approval, NIBSS/payment gateway disconnection order, app store ban, and NDPC data breach penalty up to 2% of gross annual revenue or ₦10,000,000.",
        oneClickFix:
          "Remove all contact-list, photo gallery, and call-log permissions and replace recovery language with lawful credit bureau reporting disclosures.",
        violatedStatute: "FCCPC DEON Regulations 2025 §8 / NDPA 2023 §24",
      });
    }

    if (!hasComplaintResolutionChannel) {
      blindSpots.push({
        findingCode: "MISSING_COMPLAINT_ESCALATION_TIMELINE",
        severity: "MEDIUM",
        exactQuoteOrMetric: "No 24h acknowledgment / 14-day CBN/FCCPC dispute escalation notice",
        whatYouMissed:
          "You did not include a clear customer grievance channel with a 24-hour acknowledgment SLA and the statutory right to escalate unresolved complaints to the CBN Consumer Protection Department or FCCPC after 14 days.",
        whatItCostsYou:
          "Non-compliance finding during CBN/FCCPC consumer protection examination.",
        oneClickFix:
          'Add footer disclosure: "For complaints, contact support@yourinstitution.ng (24-hour response SLA). Unresolved disputes after 14 days may be escalated to the CBN Consumer Protection Department (cpd@cbn.gov.ng) or FCCPC."',
        violatedStatute: "CBN Consumer Protection Regulations 2019 §7.1 / FCCPC DEON Guidelines",
      });
    }

    if (hasBundledConsentDarkPattern) {
      blindSpots.push({
        findingCode: "NDPC_GAID_BUNDLED_CONSENT_DARK_PATTERN",
        severity: "HIGH",
        exactQuoteOrMetric: "Bundled account sign-up and promotional marketing consent",
        whatYouMissed:
          "Your sign-up flow bundles Terms & Conditions acceptance with promotional marketing consent ('By signing up, you agree to receive marketing...'). Under NDPA 2023 and NDPC GAID 2025, marketing consent must be granular, unbundled, and unticked by default.",
        whatItCostsYou:
          "NDPC enforcement notice and administrative fine for unlawful processing of personal data without freely given, specific consent.",
        oneClickFix:
          "Separate the Terms & Privacy acknowledgment from an optional, unticked checkbox: '[ ] I consent to receive promotional product updates via SMS/Email (You may opt out at any time).'",
        violatedStatute: "Nigeria Data Protection Act (NDPA) 2023 §26 / NDPC GAID 2025",
      });
    }

    return {
      passed: blindSpots.length === 0,
      hasShortTenorViolation,
      detectedMinTenorDays,
      detectedMaxTenorDays,
      hasMinMaxRepaymentDisclosure,
      hasMaxAprDisclosure,
      hasRepresentativeExample,
      hasBannedPrivacyOrRecoveryTrap,
      hasComplaintResolutionChannel,
      hasBundledConsentDarkPattern,
      blindSpots,
    };
  }
}

export const appStoreAuditorService = new AppStoreAuditorService();
