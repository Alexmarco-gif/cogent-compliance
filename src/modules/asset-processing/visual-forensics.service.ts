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
];

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

    const blindSpots: BlindSpotAlert[] = [];

    if (hasMicroscopicDisclosures) {
      blindSpots.push({
        findingCode: "VISUAL_MICROSCOPIC_DISCLAIMER",
        severity: "HIGH",
        exactQuoteOrMetric: `Disclaimer-to-Headline height ratio is ${(disclaimerToHeadlineRatio * 100).toFixed(1)}% (Minimum required: 12.0%)`,
        whatYouMissed: `Your flyer's disclaimer ("${disclaimerSegmentText.slice(0, 80) || "Terms & Conditions"}") is rendered at only ${(disclaimerToHeadlineRatio * 100).toFixed(1)}% of the main headline's height (${smallestDisclaimerBoxHeight}px vs ${headlineBoxHeight}px on a 1000px canvas), making material conditions unreadable on mobile screens.`,
        whatItCostsYou:
          "Deemed a 'buried/inconspicuous disclosure' under CBN Consumer Protection Framework §4.2 and FCCPA 2018 §115. Regulators treat illegible fine print as if the disclosure was completely omitted, exposing the institution to deceptive advertising fines.",
        oneClickFix:
          "Increase the footer disclaimer font size to at least 12%–15% of the primary headline height (minimum 10pt on print / 14px on 1080p social creatives) with high-contrast foreground text.",
        violatedStatute: "CBN Consumer Protection Framework §4.2 / ARCON Code Art. 21",
      });
    }

    if (!hasArconAspCertificateId) {
      blindSpots.push({
        findingCode: "MISSING_ARCON_ASP_PRE_VETTING_ID",
        severity: "HIGH",
        exactQuoteOrMetric: "No ARCON / ASP Pre-Vetting Certificate Number detected on creative",
        whatYouMissed:
          "You did not ask about ARCON, but under Section 54 of the ARCON Act 2022 and the Nigerian Code of Advertising Practice, every financial services advertisement must obtain Advertising Standards Panel (ASP) pre-vetting approval before publication.",
        whatItCostsYou:
          "ARCON Notice of Violation, mandatory campaign takedown across all media/social platforms, minimum ₦500,000+ administrative penalty per unvetted exposure, and prosecution before the Advertising Offences Tribunal.",
        oneClickFix:
          "Generate the ARCON ASP Pre-Vetting Substantiation Memo using Cogent's one-click generator, submit the creative for ASP clearance, and embed the issued 'ARCON/ASP/...' certificate reference on the flyer corner before launch.",
        violatedStatute: "ARCON Act 2022 §54 / AISOP Code",
      });
    }

    if (hasUnqualifiedNdicClaim) {
      blindSpots.push({
        findingCode: "UNQUALIFIED_NDIC_COVERAGE_CLAIM",
        severity: "HIGH",
        exactQuoteOrMetric: "Unqualified 100% / unlimited NDIC deposit coverage claim",
        whatYouMissed:
          "The creative implies unlimited NDIC protection, whereas NDIC statutory deposit insurance is capped at ₦5,000,000 per depositor for Deposit Money Banks (DMBs) and ₦2,000,000 for Microfinance Banks (MFBs).",
        whatItCostsYou:
          "Regulatory sanction from NDIC and CBN for misrepresenting statutory deposit insurance limits to the public.",
        oneClickFix:
          "Replace blanket insurance claims with the statutory wording: 'Deposits are insured by the Nigeria Deposit Insurance Corporation (NDIC) up to statutory limits.'",
        violatedStatute: "NDIC Act / CBN Consumer Protection Regulations 2019",
      });
    }

    if (hasCoerciveUrgencyLanguage) {
      blindSpots.push({
        findingCode: "COERCIVE_URGENCY_MANIPULATION",
        severity: "MEDIUM",
        exactQuoteOrMetric: "High-pressure urgency / FOMO borrowing language detected",
        whatYouMissed:
          "The flyer uses high-pressure psychological urgency to induce impulsive borrowing, which breaches responsible lending marketing standards.",
        whatItCostsYou:
          "FCCPC DEON enforcement warning and rejection during ARCON ASP pre-vetting review.",
        oneClickFix:
          "Remove high-pressure countdown or FOMO slogans and state clear, objective credit eligibility and repayment terms.",
        violatedStatute: "FCCPC DEON Regulations 2025 / CBN Responsible Lending Guidelines",
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
