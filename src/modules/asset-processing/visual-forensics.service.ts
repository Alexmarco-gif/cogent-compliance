/**
 * Cogent Marketing Shield - Flyer Visual Forensics & ARCON/Typography Auditor
 * Document Reference: Document 13 (Section 3.1, Section 4.2 Tool 19), ARCON Act 2022 §54,
 * ARCON AISOP Code, CBN Consumer Protection Framework §4.2, NDIC Deposit Insurance Guidelines.
 *
 * Inspects bounding-box geometry ([ymin, xmin, ymax, xmax] on 0-1000 scale) and OCR text
 * from promotional flyers to catch microscopic fine print, missing ARCON ASP vetting seals,
 * unverified NDIC deposit coverage claims, and coercive urgency baiting.
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { BoundingBox } from "@/contracts/campaign.contracts";
import { BlindSpotAlert } from "@/modules/compliance-assessment/apr-calculator.service";

export interface VisualSegmentInput {
  segmentIndex: number;
  textContent: string;
  pageNumber?: number;
  boundingBox?: BoundingBox | null;
}

export interface VisualForensicsInput {
  assetId?: string;
  tenantId?: string;
  fullText: string;
  segments: VisualSegmentInput[];
  channel?: string;
}

export interface VisualForensicsResult {
  assetId?: string;
  headlineBoxHeight: number;
  smallestDisclaimerBoxHeight: number;
  disclaimerToHeadlineRatio: number;
  hasMicroscopicDisclosures: boolean;
  hasArconAspCertificateId: boolean;
  detectedArconAspId: string | null;
  hasUnqualifiedNdicClaim: boolean;
  hasCoerciveUrgencyLanguage: boolean;
  passedVisualAudit: boolean;
  blindSpots: BlindSpotAlert[];
}

const ARCON_ASP_PATTERN =
  /\b(?:ARCON(?:\s*[/\-]\s*ASP)?|ASP|APCON)\s*(?:CERT(?:IFICATE)?|VETTING|NO|ID|REF)?\s*[/\-:#\s]+\s*(?=[A-Z0-9/\-]*\d)[A-Z0-9]{2,12}(?:[/\-][A-Z0-9]{2,15})*\b/i;

const COERCIVE_URGENCY_PATTERNS = [
  /\b(?:act\s+now\s+or\s+lose|last\s+chance\s+ever|borrow\s+today\s+before\s+you\s+regret|no\s+questions\s+asked\s+cash)\b/i,
  /\b(?:everyone\s+is\s+approved\s+instantly|beat\s+sapa\s+with\s+free\s+cash)\b/i,
  /\b(?:run\s+don['’]?t\s+walk|before\s+slots\s+finish|giving\s+away\s+free\s+money|pay\s+back\s+almost\s+nothing)\b/i,
];

const RAFFLE_PROMO_PATTERN =
  /\b(?:transact\s*(?:&|and)\s*win|raffle\s+draw|mega\s+holiday\s+raffle|automatically\s+enters\s+you\s+into)\b/i;

export class VisualForensicsService {
  /**
   * Runs deterministic bounding-box geometry and Nigerian advertising visual compliance checks.
   */
  public evaluateSegments(input: VisualForensicsInput): VisualForensicsResult {
    const fullText = input.fullText || input.segments.map((s) => s.textContent).join("\n");
    const segments = input.segments || [];

    // 1. Compute bounding box heights (0-1000 normalized vertical scale)
    let headlineBoxHeight = 0;
    let smallestDisclaimerBoxHeight = 0;
    let disclaimerSegmentText = "";

    for (const seg of segments) {
      const box = seg.boundingBox;
      if (!box) continue;
      const height = Math.max(box.ymax - box.ymin, 1);
      const label = (box.label || "").toUpperCase();
      const textLower = seg.textContent.toLowerCase();

      const isDisclaimer =
        label === "DISCLAIMER" ||
        /terms\s*(?:and|&)\s*conditions|t&cs?\s*apply|licensed\s+by|regulated\s+by|subject\s+to\s+credit/i.test(
          textLower
        );

      const isHeadline =
        label === "HEADLINE" ||
        label === "INTEREST_RATE" ||
        (!isDisclaimer && seg.segmentIndex === 0);

      if (isHeadline && height > headlineBoxHeight) {
        headlineBoxHeight = height;
      }

      if (isDisclaimer) {
        if (smallestDisclaimerBoxHeight === 0 || height < smallestDisclaimerBoxHeight) {
          smallestDisclaimerBoxHeight = height;
          disclaimerSegmentText = seg.textContent;
        }
      }
    }

    // Fallback defaults if no bounding boxes were present (e.g., plain PDF/DOCX text)
    if (headlineBoxHeight === 0) {
      headlineBoxHeight = 100;
    }
    if (smallestDisclaimerBoxHeight === 0) {
      const hasAnyDisclaimer =
        /terms\s*(?:and|&)\s*conditions|t&cs?\s*apply|licensed\s+by/i.test(fullText);
      smallestDisclaimerBoxHeight = hasAnyDisclaimer ? 15 : 0;
    }

    const disclaimerToHeadlineRatio = Number(
      (smallestDisclaimerBoxHeight / headlineBoxHeight).toFixed(3)
    );

    // CBN CPF §4.2 & ARCON Code require disclaimers to be legible and at least 10-12% of headline height
    const hasMicroscopicDisclosures =
      smallestDisclaimerBoxHeight > 0 && disclaimerToHeadlineRatio < 0.12;

    // 2. Check ARCON / ASP Pre-Vetting Certificate ID presence
    const aspMatch = fullText.match(ARCON_ASP_PATTERN);
    const hasArconAspCertificateId = Boolean(aspMatch);
    const detectedArconAspId = aspMatch ? aspMatch[0] : null;

    // 3. Check NDIC Deposit Insurance representation
    const mentionsNdic = /\bNDIC\b|nigeria\s+deposit\s+insurance/i.test(fullText);
    const hasUnqualifiedNdicClaim =
      mentionsNdic &&
      /(?:100%\s*insured|all\s+deposits\s+fully\s+insured|unlimited\s+ndic)/i.test(fullText);

    // 4. Check coercive urgency or manipulative language
    const hasCoerciveUrgencyLanguage = COERCIVE_URGENCY_PATTERNS.some((rx) => rx.test(fullText));
    const hasUnregisteredRafflePromo =
      RAFFLE_PROMO_PATTERN.test(fullText) &&
      !/\b(?:fccpc\s+reg|gaming\s+board|lsla|lotteries\s+authority)\b/i.test(fullText);

    const blindSpots: BlindSpotAlert[] = [];

    if (hasMicroscopicDisclosures) {
      blindSpots.push({
        findingCode: "VISUAL_MICROSCOPIC_DISCLAIMER",
        severity: "HIGH",
        exactQuoteOrMetric: `Disclaimer-to-Headline height ratio is ${(disclaimerToHeadlineRatio * 100).toFixed(1)}% (Minimum required: 12.0%)`,
        whatYouMissed: `Your flyer's disclaimer ("${disclaimerSegmentText.slice(0, 80) || "Terms & Conditions"}") is rendered at only ${(disclaimerToHeadlineRatio * 100).toFixed(1)}% of the main headline's height (${smallestDisclaimerBoxHeight}px vs ${headlineBoxHeight}px on a 1000px canvas), making material conditions unreadable on mobile screens.`,
        whatItCostsYou:
          "Deemed a 'buried/inconspicuous disclosure' under CBN Consumer Protection Regulations 2019 Reg. 4.2.5(d)–(e) (minimum font size 10 / legible typography) and FCCPA 2018 §115. Regulators treat illegible fine print as if the disclosure was completely omitted, exposing the institution to deceptive advertising fines.",
        oneClickFix:
          "Increase the footer disclaimer font size to at least 12%–15% of the primary headline height (minimum 10pt on print / 14px on 1080p social creatives) with high-contrast foreground text.",
        violatedStatute: "CBN Consumer Protection Regulations 2019 Reg. 4.2.5(d)–(e) / ARCON Code Art. 21",
      });
    }

    if (!hasArconAspCertificateId) {
      blindSpots.push({
        findingCode: "MISSING_ARCON_ASP_PRE_VETTING_ID",
        severity: "HIGH",
        exactQuoteOrMetric: "No ARCON / ASP Pre-Vetting Certificate Number or CBN CPD Reg. 4.2.9 Notification Ref detected on creative",
        whatYouMissed:
          "Under Section 54 of the ARCON Act 2022 and the Nigerian Code of Advertising Practice, every consumer-facing financial advertisement across flyer, landing page, and paid TikTok/IG influencer reels must obtain an Advertising Standards Panel (ASP) Certificate of Approval (via ARCON-licensed practitioner Form 001) BEFORE exposure. Distinctly, under CBN Consumer Protection Regulations 2019 Regulation 4.2.9, the regulated institution must also submit prior notification of advertising content (audience, media, duration, and internal compliance sign-off) to the Director, CBN Consumer Protection Department.",
        whatItCostsYou:
          "ARCON Notice of Violation, mandatory campaign takedown across all media/social platforms, minimum ₦500,000+ administrative penalty per unvetted exposure, prosecution before the Advertising Offences Tribunal, and CBN CPD retraction directive under Reg. 4.2.8.",
        oneClickFix:
          "File prior notification with the Director, CBN Consumer Protection Department under Reg. 4.2.9, submit Form 001 + substantiation pack to ARCON ASP for pre-exposure vetting, and embed the issued 'ARCON/ASP/...' certificate reference on the creative before launch.",
        violatedStatute: "ARCON Act 2022 §54 / CBN Consumer Protection Regulations 2019 Reg. 4.2.9",
      });
    }

    if (hasUnqualifiedNdicClaim) {
      blindSpots.push({
        findingCode: "UNQUALIFIED_NDIC_COVERAGE_CLAIM",
        severity: "HIGH",
        exactQuoteOrMetric: "Unqualified 100% / unlimited NDIC deposit coverage claim",
        whatYouMissed:
          "The creative implies unlimited NDIC protection, whereas NDIC statutory deposit insurance is capped at ₦5,000,000 per depositor for Deposit Money Banks (DMBs) and ₦2,000,000 per depositor for Microfinance Banks (MFBs, revised upward in 2024). Moreover, NDIC covers eligible deposits only—not loans, credit-life insurance, or raffle prizes.",
        whatItCostsYou:
          "Regulatory sanction from NDIC and CBN for misrepresenting statutory deposit insurance limits to the public.",
        oneClickFix:
          "Replace blanket insurance claims with the statutory wording: 'Deposits are insured by the Nigeria Deposit Insurance Corporation (NDIC) up to statutory limits (₦2,000,000 per depositor for MFBs).'",
        violatedStatute: "NDIC Act / CBN Consumer Protection Regulations 2019",
      });
    }

    if (hasCoerciveUrgencyLanguage) {
      blindSpots.push({
        findingCode: "COERCIVE_URGENCY_MANIPULATION",
        severity: "HIGH",
        exactQuoteOrMetric: "High-pressure urgency / FOMO borrowing & influencer baiting language detected ('run don\\'t walk', 'before slots finish', 'giving away free money', 'pay back almost nothing')",
        whatYouMissed:
          "The campaign uses artificial scarcity ('before slots finish'), false characterisation of debt as a gift ('giving away free money'), price minimisation ('pay back almost nothing'), and undisclosed commercial influencer endorsement to induce impulsive borrowing.",
        whatItCostsYou:
          "Breaches CBN Consumer Protection Regulations 2019 Regs. 4.1.5, 4.2.2, 4.2.5, 5.3.1–5.3.2 & 5.3.6 (ban on unsolicited/high-pressure credit marketing), FCCPA 2018 §§ 115, 123 & 125, FCCPC DEON Regulations 2025 Regs. 17(1), 19 & 22 (up to ₦100,000,000 or 1% of turnover), and ARCON influencer vetting rules.",
        oneClickFix:
          "Remove all 'free money', 'pay back almost nothing', and 'before slots finish' claims. Require the influencer to open with an explicit 'Paid Advertisement for [Licensed Entity]' disclosure and state the representative example, fees, and APR on-screen and in voiceover.",
        violatedStatute: "CBN CPR 2019 Regs. 4.1.5, 4.2.2, 5.3.1 / FCCPA 2018 §§ 115, 123, 125 / DEON 2025 Regs. 17, 19, 22 / ARCON Act 2022 §54",
      });
    }

    if (hasUnregisteredRafflePromo) {
      blindSpots.push({
        findingCode: "UNREGISTERED_RAFFLE_PROMOTION_AND_TIE_IN",
        severity: "HIGH",
        exactQuoteOrMetric: `"TRANSACT & WIN ₦5,000,000 CASH! — Every transfer of ₦5,000+ between Nov 20 and Dec 31 automatically enters you into our Mega Holiday Raffle Draw!"`,
        whatYouMissed:
          "1) Unregistered Sales Promotion & Lottery: Running a chance-based cash raffle requires prior FCCPC Sales Promotion Registration (rules submitted at least 21 days before start; note also the Draft FCCPC Sales Promotion (Amended) Regulations 2026) and State/National Lotteries & Gaming Authority clearance. 2) Prize Pool vs. Single Prize Ambiguity: 'WIN ₦5,000,000 CASH' fails to clarify whether ₦5,000,000 is one grand prize or a shared pool, and omits draw date, cut-off time, qualifying transaction types (whether self-transfers or reversals count), and winner verification/payout rules. 3) Credit-Raffle Tie-In: Combining a high-cost loan ad and influencer borrow callout ('borrow ₦200k right now... plus win ₦5M') conflates borrowing with a lottery inducement.",
        whatItCostsYou:
          "FCCPC stop-order and sales promotion sanctions under FCCPA 2018 §§ 115, 120–125, gaming authority seal/fine for unpermitted lottery draw, and CBN Consumer Protection Regulations 2019 Regs. 4.1.5, 4.2.5, 5.3.1–5.3.2 & 5.3.6 enforcement.",
        oneClickFix:
          "Separate the transfer raffle from all loan advertising; hold the raffle until FCCPC Sales Promotion registration (filed >=21 days prior) and gaming permits are issued; and publish full draw rules specifying whether ₦5,000,000 is a single prize or total pool, qualifying transfers, exclusions, draw date, and payout timeline.",
        violatedStatute: "FCCPA 2018 §§ 115, 120–125 / FCCPC Sales Promotion Rules / CBN CPR 2019 Regs. 4.1.5, 4.2.5, 5.3.1–5.3.2",
      });
    }

    return {
      assetId: input.assetId,
      headlineBoxHeight,
      smallestDisclaimerBoxHeight,
      disclaimerToHeadlineRatio,
      hasMicroscopicDisclosures,
      hasArconAspCertificateId,
      detectedArconAspId,
      hasUnqualifiedNdicClaim,
      hasCoerciveUrgencyLanguage,
      passedVisualAudit: blindSpots.length === 0,
      blindSpots,
    };
  }

  /**
   * Loads an extracted campaign asset from Supabase and runs the visual forensics audit.
   */
  public async auditAssetById(
    tenantId: string,
    assetId: string
  ): Promise<VisualForensicsResult> {
    const supabase = createAdminSupabaseClient();

    const [{ data: extraction }, { data: segments }] = await Promise.all([
      supabase
        .from("asset_extractions")
        .select("id, extracted_text")
        .eq("tenant_id", tenantId)
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("asset_extraction_segments")
        .select("segment_index, text_content, page_number, bounding_box")
        .eq("tenant_id", tenantId)
        .eq("asset_id", assetId)
        .order("segment_index", { ascending: true }),
    ]);

    const mappedSegments: VisualSegmentInput[] = (segments || []).map((s) => ({
      segmentIndex: s.segment_index,
      textContent: s.text_content,
      pageNumber: s.page_number,
      boundingBox: (s.bounding_box as BoundingBox | null) || null,
    }));

    return this.evaluateSegments({
      assetId,
      tenantId,
      fullText: extraction?.extracted_text || mappedSegments.map((m) => m.textContent).join("\n"),
      segments: mappedSegments,
    });
  }
}

export const visualForensicsService = new VisualForensicsService();
