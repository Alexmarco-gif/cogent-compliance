/**
 * Cogent Marketing Shield - 11-Category Claim Extraction Engine
 * Document Reference: Document 05 (Section 8), Document 08 (Phase 7)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import {
  STATUTORY_CLAIM_CATEGORIES,
  StatutoryClaimCategory,
  ExtractedClaim,
} from "@/contracts/campaign.contracts";

export interface ClaimExtractionParams {
  tenantId: string;
  campaignId: string;
  revisionId?: string;
  assetId?: string;
  contentText: string;
  sourceType?: "DIRECT_TEXT" | "OCR";
}

export class ClaimExtractorEngine {
  /**
   * Extracts structured claims across all 11 statutory categories from campaign copy.
   */
  public async extractClaims(params: ClaimExtractionParams): Promise<ExtractedClaim[]> {
    const claims: ExtractedClaim[] = [];

    // Prompt for Gemini 2.5 Pro claim extraction
    const prompt = `You are an expert regulatory compliance auditor specialized in Nigerian advertising and financial promotion law (CBN, FCCPC, ARCON, NDPC, SEC).
Analyze the following marketing campaign copy and extract EVERY discrete promotional claim made.

Categorize each extracted claim strictly into one of these 11 controlled categories:
1. INTEREST_RATE_OR_APR (percentage rates, flat rates, 0% claims, annual percentage rates)
2. FEE_OR_CHARGE_REPRESENTATION (processing fees, hidden charges, administrative fees, "no fees" claims)
3. GUARANTEED_APPROVAL_OR_RETURN ("100% approval", "guaranteed profits", "risk-free")
4. SPEED_OR_INSTANT_DISBURSEMENT ("instant in 5 seconds", "24-hour approval", "immediate payout")
5. PROMOTIONAL_OFFER_OR_DISCOUNT (cashbacks, signup bonus, referral gifts)
6. ELIGIBILITY_OR_TENOR_TERM (loan duration, minimum balance, collateral requirements)
7. REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM ("Licensed by CBN", "Approved by SEC", "Regulated by FCCPC")
8. SECURITY_OR_DATA_PRIVACY_CLAIM (NDPR/NDPA compliance, "bank-grade security", data sharing claims)
9. COMPARATIVE_OR_SUPERLATIVE_CLAIM ("Nigeria's #1 Bank", "Lowest rates in Lagos", "Best loan app")
10. MANDATORY_DISCLOSURE_OR_DISCLAIMER (terms and conditions, dispute contacts, APR disclosures)
11. INFLUENCER_OR_TESTIMONIAL_REPRESENTATION (celebrity endorsement, customer testimonial)

Text to analyze:
"""
${params.contentText}
"""

Return a pure JSON array of objects with this schema:
[
  {
    "claim_text": "Exact verbatim substring from the source text",
    "normalized_claim": "Standardized canonical summary of the representation",
    "claim_category": "One of the 11 categories above",
    "confidence": 0.95
  }
]
Return pure JSON array only.`;

    try {
      const response = await geminiService.generateText({
        prompt,
        temperature: 0.1,
        context: {
          taskType: "CLAIM_EXTRACTION",
        },
      });

      const parsed = JSON.parse(response.text || "[]");
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item.claim_text &&
            STATUTORY_CLAIM_CATEGORIES.includes(item.claim_category as StatutoryClaimCategory)
          ) {
            claims.push({
              claim_text: String(item.claim_text).trim(),
              normalized_claim: item.normalized_claim ? String(item.normalized_claim).trim() : undefined,
              claim_category: item.claim_category as StatutoryClaimCategory,
              confidence: Number(item.confidence) || 0.9,
              page_number: 1,
              source_type: params.sourceType || "DIRECT_TEXT",
            });
          }
        }
      }
    } catch (err) {
      logger.warn("Gemini claim extraction failed, applying deterministic regex extraction fallback", {
        error: (err as Error).message,
      });

      // Deterministic fallback regex rules
      claims.push(...this.extractDeterministicClaims(params.contentText, params.sourceType));
    }

    // Persist claims into campaign_claims table
    if (claims.length > 0 && !process.env.SUPABASE_URL?.includes("mock")) {
      const supabase = createAdminSupabaseClient();
      const records = claims.map((c) => ({
        tenant_id: params.tenantId,
        campaign_id: params.campaignId,
        asset_id: params.assetId || null,
        claim_text: c.claim_text,
        normalized_claim: c.normalized_claim || c.claim_text,
        claim_category: c.claim_category,
        extraction_method: "GEMINI_2_5_PRO",
        extraction_confidence: c.confidence,
        verification_status: "EXTRACTED",
        revision_id: params.revisionId || null,
      }));

      const { error: insErr } = await supabase.from("campaign_claims").insert(records);
      if (insErr) {
        logger.error("Failed to persist claims into campaign_claims", { error: insErr.message });
      }
    }

    logger.info("Extracted statutory campaign claims", {
      tenantId: params.tenantId,
      campaignId: params.campaignId,
      claimCount: claims.length,
    });

    return claims;
  }

  /**
   * Deterministic regex fallback for claim extraction when AI service is unavailable.
   */
  private extractDeterministicClaims(
    text: string,
    sourceType: "DIRECT_TEXT" | "OCR" = "DIRECT_TEXT",
  ): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];

    // Interest rate / APR regex
    const rateMatch = text.match(/(\d+(\.\d+)?%\s*(interest|apr|monthly|flat|per annum))/i);
    if (rateMatch) {
      claims.push({
        claim_text: rateMatch[0],
        normalized_claim: `Interest rate claimed: ${rateMatch[0]}`,
        claim_category: "INTEREST_RATE_OR_APR",
        confidence: 0.95,
        page_number: 1,
        source_type: sourceType,
      });
    }

    // Zero fee / free regex
    const zeroFeeMatch = text.match(/(0%\s*fees?|zero\s*fees?|no\s*hidden\s*charges?|free\s*transfer)/i);
    if (zeroFeeMatch) {
      claims.push({
        claim_text: zeroFeeMatch[0],
        normalized_claim: "Zero fee / free representation",
        claim_category: "FEE_OR_CHARGE_REPRESENTATION",
        confidence: 0.92,
        page_number: 1,
        source_type: sourceType,
      });
    }

    // Speed / instant disbursement
    const speedMatch = text.match(/(instant|in\s*\d+\s*(seconds|minutes|hours)|same[- ]day\s*approval)/i);
    if (speedMatch) {
      claims.push({
        claim_text: speedMatch[0],
        normalized_claim: "Instant disbursement speed representation",
        claim_category: "SPEED_OR_INSTANT_DISBURSEMENT",
        confidence: 0.9,
        page_number: 1,
        source_type: sourceType,
      });
    }

    // Licensing claim
    const licenseMatch = text.match(/(licensed\s*by\s*(the\s*)?(cbn|central\s*bank)|regulated\s*by\s*fccpc|insured\s*by\s*ndic)/i);
    if (licenseMatch) {
      claims.push({
        claim_text: licenseMatch[0],
        normalized_claim: "Regulatory licensing claim",
        claim_category: "REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM",
        confidence: 0.98,
        page_number: 1,
        source_type: sourceType,
      });
    }

    // Terms and conditions
    const tcMatch = text.match(/(terms\s*and\s*conditions\s*apply|t&cs?\s*apply)/i);
    if (tcMatch) {
      claims.push({
        claim_text: tcMatch[0],
        normalized_claim: "Terms and conditions disclaimer",
        claim_category: "MANDATORY_DISCLOSURE_OR_DISCLAIMER",
        confidence: 0.99,
        page_number: 1,
        source_type: sourceType,
      });
    }

    // Guaranteed approval
    const guarMatch = text.match(/(100%\s*(approval|risk-free)|guaranteed\s*(returns|profit|approval))/i);
    if (guarMatch) {
      claims.push({
        claim_text: guarMatch[0],
        normalized_claim: "Guaranteed outcome claim",
        claim_category: "GUARANTEED_APPROVAL_OR_RETURN",
        confidence: 0.95,
        page_number: 1,
        source_type: sourceType,
      });
    }

    return claims;
  }
}

export const claimExtractorEngine = new ClaimExtractorEngine();
