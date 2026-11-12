/**
 * Cogent Marketing Shield - Remediation, Layer 6 Validation & Revision Service
 * Document Reference: Document 04 (Sections 5.1–5.3), Document 05 (Section 7.1), Document 08 (Phase 8)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { layer6RewriteValidator } from "@/modules/compliance-assessment/rewrite-validator.service";
import { campaignService } from "@/modules/campaigns/campaign.service";
import {
  GenerateRewriteInput,
  RewriteSuggestion,
  CreateCampaignRevisionInput,
  CompareRevisionsResponse,
  DiffSegment,
} from "@/contracts/remediation.contracts";
import crypto from "crypto";

export class RemediationService {
  /**
   * 1. Generates and validates an AI compliant rewrite proposal for a specific finding.
   */
  public async generateAndValidateRewrite(
    tenantId: string,
    userId: string,
    findingId: string,
    input: GenerateRewriteInput,
  ): Promise<RewriteSuggestion> {
    const supabase = createAdminSupabaseClient();

    // Fetch finding with linked campaign and evidence
    const { data: finding, error: findErr } = await supabase
      .from("compliance_findings")
      .select(`
        id,
        campaign_id,
        revision_id,
        claim_id,
        finding_code,
        title,
        description,
        severity,
        recommended_action,
        campaign_claims!claim_id(claim_text, normalized_claim, claim_category)
      `)
      .eq("tenant_id", tenantId)
      .eq("id", findingId)
      .single();

    if (findErr || !finding) {
      throw new Error(`Compliance finding ${findingId} not found`);
    }

    // Fetch parent campaign and revision text
    const { data: campaign } = await supabase
      .from("marketing_campaigns")
      .select("id, campaign_name, channel, product_id")
      .eq("tenant_id", tenantId)
      .eq("id", finding.campaign_id)
      .single();

    const { data: revision } = await supabase
      .from("campaign_revisions")
      .select("id, content_text")
      .eq("tenant_id", tenantId)
      .eq("id", finding.revision_id)
      .single();

    // Fetch product truth if product_id is set
    let productTruth = null;
    if (campaign?.product_id) {
      const { data: prod } = await supabase
        .from("campaign_products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", campaign.product_id)
        .maybeSingle();

      if (prod?.approved_terms) {
        productTruth = {
          productName: prod.product_name,
          productType: prod.product_type,
          ...prod.approved_terms,
        };
      }
    }

    // Extract exact claim text from claim record or description
    const claimRecord = finding.campaign_claims as unknown as { claim_text?: string } | null;
    const findingRecord = finding as unknown as { claim_text?: string };
    const claimText =
      claimRecord?.claim_text ||
      findingRecord.claim_text ||
      finding.title ||
      "";

    // Build Gemini prompt for controlled rewrite
    const prompt = `You are a Chief Legal & Compliance Officer and Senior Financial Copywriter in Nigeria.
Your job is to rewrite the non-compliant marketing excerpt below so it strictly complies with Nigerian regulatory law (CBN, FCCPC, ARCON, NDPC, SEC) while preserving persuasive marketing appeal.

Context:
- Campaign: "${campaign?.campaign_name || "Financial Promotion"}" (Channel: ${campaign?.channel || "SOCIAL_MEDIA"})
- Breached Rule / Finding: ${finding.title}
- Regulatory Description: ${finding.description}
- Remediation Guideline: ${finding.recommended_action}
- Target Tone: ${input.tone || "PROFESSIONAL"}
${input.custom_instructions ? `- Special Officer Instructions: "${input.custom_instructions}"` : ""}

${
  productTruth
    ? `MANDATORY PRODUCT TRUTH (You MUST respect these rates/fees strictly, NEVER invent other numbers):
- Product Name: ${productTruth.productName}
- Allowed Interest Rate: ${productTruth.interestRateMin || 0}% - ${productTruth.interestRateMax || productTruth.interestRateMin || 0}% (${productTruth.interestRateType || "APR"})
- Processing Fee: ${productTruth.processingFeePercent ? `${productTruth.processingFeePercent}%` : "Standard fees apply"}
- Tenor: ${productTruth.tenorMinDays || 30} - ${productTruth.tenorMaxDays || 90} days
- Mandatory Disclaimers: ${productTruth.requiredDisclosures?.join("; ") || "Terms and conditions apply. Licensed by the Central Bank of Nigeria."}`
    : "Note: Ensure mandatory disclosures ('Terms and conditions apply' and regulatory licensing) are retained."
}

Original Campaign Excerpt:
"""
${claimText}
"""

Full Revision Copy Context:
"""
${revision?.content_text || claimText}
"""

Instructions:
1. Provide a single compliant replacement text ("proposed_text") that directly fixes the violation.
2. Remove any prohibited absolutes (e.g., "100% risk-free", "guaranteed returns", "no credit check ever").
3. If fees or interest rates are mentioned, match the approved product truth numbers exactly.
4. Always preserve mandatory disclosures ("Terms and conditions apply" and licensing statements).
5. Provide a clear, professional 1-2 sentence explanation of the specific changes made.

Return PURE JSON only with this schema:
{
  "proposed_text": "The compliant rewritten text",
  "explanation": "Clear explanation of how the violation was remediated"
}`;

    let proposedText = "";
    let explanation = "";

    try {
      const response = await geminiService.generateText({
        prompt,
        temperature: 0.1,
        context: {
          tenantId,
          taskType: "ASSESSMENT_REASONING",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      proposedText = String(parsed.proposed_text || "").trim();
      explanation = String(parsed.explanation || "").trim();
    } catch (err) {
      logger.warn("Gemini rewrite generation failed or non-JSON returned, generating rule-based rewrite fallback", {
        error: (err as Error).message,
      });

      // Deterministic fallback rewrite if AI call times out
      proposedText = `${claimText.replace(/100%\s*risk-free/gi, "risk-managed").replace(/guaranteed\s*returns?/gi, "competitive returns").replace(/0%\s*fees?/gi, "standard fees")} (Terms and conditions apply. Licensed by the Central Bank of Nigeria.)`;
      explanation = "Applied deterministic rule-based sanitization removing prohibited guarantee and adding mandatory disclosures.";
    }

    if (!proposedText) {
      proposedText = `${claimText} (Subject to credit approval. Terms and conditions apply. Licensed by CBN.)`;
      explanation = "Appended mandatory statutory terms and qualification.";
    }

    // 2. Execute Layer 6 Rewrite Safety Validator
    const layer6Report = await layer6RewriteValidator.validateRewrite({
      tenantId,
      originalText: revision?.content_text || claimText,
      proposedText,
      findingClaimText: claimText,
      productTruth,
      channel: campaign?.channel,
    });

    const suggestionId = crypto.randomUUID();

    // 3. Log Audit Event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "REWRITE_SUGGESTION_GENERATED",
      entityType: "COMPLIANCE_FINDING",
      entityId: findingId,
      eventData: {
        suggestionId,
        tone: input.tone,
        layer6Status: layer6Report.validation_status,
        failureReasons: layer6Report.failure_reasons,
      },
    });

    logger.info("Generated compliance rewrite suggestion", {
      tenantId,
      findingId,
      suggestionId,
      validationStatus: layer6Report.validation_status,
    });

    return {
      suggestion_id: suggestionId,
      finding_id: findingId,
      original_text: claimText,
      proposed_text: proposedText,
      explanation,
      layer_6_validation: layer6Report,
    };
  }

  /**
   * 2. Creates an immutable campaign revision (Revision #N+1) and triggers automated reassessment.
   */
  public async createCampaignRevision(
    tenantId: string,
    userId: string,
    campaignId: string,
    input: CreateCampaignRevisionInput,
  ) {
    const supabase = createAdminSupabaseClient();

    // Fetch current campaign
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("id, status, current_revision_id, channel, product_id")
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Determine next revision number
    const { data: latestRev } = await supabase
      .from("campaign_revisions")
      .select("revision_number")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextRevisionNumber = (latestRev?.revision_number || 1) + 1;

    // Insert new immutable revision
    const { data: newRevision, error: revErr } = await supabase
      .from("campaign_revisions")
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        revision_number: nextRevisionNumber,
        parent_revision_id: input.parent_revision_id,
        content_text: input.content_text,
        revision_source: input.revision_source || "AI_REWRITE_ACCEPTED",
        change_summary: input.change_summary,
        created_by: userId,
      })
      .select("*")
      .single();

    if (revErr || !newRevision) {
      throw new Error(`Failed to create campaign revision: ${revErr?.message}`);
    }

    // Determine new campaign status:
    // If the campaign was previously APPROVED, editing it immediately INVALIDATES prior approval!
    let updatedStatus = campaign.status;
    let approvedRevId = null;

    if (campaign.status === "APPROVED") {
      updatedStatus = "RESUBMITTED";
      approvedRevId = null; // Invalidate previous approval
    } else if (campaign.status === "FINDINGS_AVAILABLE" || campaign.status === "REVISION_REQUIRED") {
      updatedStatus = "RESUBMITTED";
    }

    // Update campaign pointer
    await supabase
      .from("marketing_campaigns")
      .update({
        current_revision_id: newRevision.id,
        approved_revision_id: approvedRevId,
        status: updatedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // If auto_reassess requested, execute autonomous assessment pipeline
    let assessmentResult = null;
    if (input.auto_reassess !== false) {
      assessmentResult = await campaignService.triggerAssessment(
        tenantId,
        userId,
        campaignId,
        {
          revision_id: newRevision.id,
          include_live_web_check: false,
        },
      );
    }

    // Log Audit Event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_REVISION_CREATED",
      entityType: "CAMPAIGN_REVISION",
      entityId: newRevision.id,
      eventData: {
        campaignId,
        revisionNumber: nextRevisionNumber,
        parentRevisionId: input.parent_revision_id,
        revisionSource: input.revision_source,
        changeSummary: input.change_summary,
        invalidatedPreviousApproval: campaign.status === "APPROVED",
      },
    });

    logger.info("Successfully created campaign revision", {
      tenantId,
      campaignId,
      revisionNumber: nextRevisionNumber,
      revisionId: newRevision.id,
    });

    return {
      revision: newRevision,
      campaignStatus: updatedStatus,
      assessment: assessmentResult,
    };
  }

  /**
   * 3. Lists all revisions for a campaign.
   */
  public async listRevisions(tenantId: string, campaignId: string) {
    const supabase = createAdminSupabaseClient();

    const { data: revisions, error } = await supabase
      .from("campaign_revisions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .order("revision_number", { ascending: true });

    if (error) {
      throw new Error(`Failed to list revisions: ${error.message}`);
    }

    return revisions || [];
  }

  /**
   * 4. Compares two revisions (side-by-side diff, findings resolution, and lock delta).
   */
  public async compareRevisions(
    tenantId: string,
    campaignId: string,
    fromRevId: string,
    toRevId: string,
  ): Promise<CompareRevisionsResponse> {
    const supabase = createAdminSupabaseClient();

    const [fromRes, toRes] = await Promise.all([
      supabase
        .from("campaign_revisions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaignId)
        .eq("id", fromRevId)
        .single(),
      supabase
        .from("campaign_revisions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaignId)
        .eq("id", toRevId)
        .single(),
    ]);

    if (!fromRes.data || !toRes.data) {
      throw new Error("One or both revisions were not found for this campaign");
    }

    const fromRev = fromRes.data;
    const toRev = toRes.data;

    // Compute text diff
    const textDiff = this.computeWordDiff(fromRev.content_text, toRev.content_text);

    // Fetch findings for both revisions
    const [fromFindingsRes, toFindingsRes] = await Promise.all([
      supabase
        .from("compliance_findings")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("revision_id", fromRevId),
      supabase
        .from("compliance_findings")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("revision_id", toRevId),
    ]);

    const fromFindings = fromFindingsRes.data || [];
    const toFindings = toFindingsRes.data || [];

    // Find resolved findings (in fromRev but not in toRev by finding_code)
    const toCodes = new Set(toFindings.map((f) => f.finding_code));
    const resolvedFindings = fromFindings.filter((f) => !toCodes.has(f.finding_code));
    const remainingFindings = toFindings;

    // Fetch assessments for lock comparison
    const [fromAssessRes, toAssessRes] = await Promise.all([
      supabase
        .from("campaign_assessments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("revision_id", fromRevId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("campaign_assessments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("revision_id", toRevId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const fromBreachCount = fromFindings.length;
    const toBreachCount = toFindings.length;

    const fromAssessment = fromAssessRes.data;
    const toAssessment = toAssessRes.data;

    const fromPassed =
      fromBreachCount === 0 &&
      (fromAssessment ? fromAssessment.overall_risk_level === "LOW" : true);
    const toPassed =
      toBreachCount === 0 &&
      (toAssessment ? toAssessment.overall_risk_level === "LOW" : true);

    return {
      campaign_id: campaignId,
      from_revision: {
        id: fromRev.id,
        revision_number: fromRev.revision_number,
        content_text: fromRev.content_text,
        created_at: fromRev.created_at,
        created_by: fromRev.created_by,
      },
      to_revision: {
        id: toRev.id,
        revision_number: toRev.revision_number,
        content_text: toRev.content_text,
        created_at: toRev.created_at,
        created_by: toRev.created_by,
      },
      text_diff: textDiff,
      resolved_findings_count: resolvedFindings.length,
      remaining_findings_count: remainingFindings.length,
      resolved_findings: resolvedFindings,
      remaining_findings: remainingFindings,
      locks_comparison: {
        from_passed: fromPassed,
        to_passed: toPassed,
        from_breach_count: fromBreachCount,
        to_breach_count: toBreachCount,
        breaches_delta: toBreachCount - fromBreachCount,
      },
    };
  }

  /**
   * Deterministic word-level diff generator.
   */
  private computeWordDiff(oldText: string, newText: string): DiffSegment[] {
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);

    const diff: DiffSegment[] = [];
    let i = 0;
    let j = 0;

    while (i < oldWords.length || j < newWords.length) {
      if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
        diff.push({ type: "unchanged", value: oldWords[i]! });
        i++;
        j++;
      } else {
        // Look ahead for match
        let foundMatch = false;
        for (let k = 1; k < 5; k++) {
          if (j + k < newWords.length && oldWords[i] === newWords[j + k]) {
            for (let m = 0; m < k; m++) {
              diff.push({ type: "added", value: newWords[j + m]! });
            }
            j += k;
            foundMatch = true;
            break;
          }
          if (i + k < oldWords.length && oldWords[i + k] === newWords[j]) {
            for (let m = 0; m < k; m++) {
              diff.push({ type: "removed", value: oldWords[i + m]! });
            }
            i += k;
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          if (i < oldWords.length) {
            diff.push({ type: "removed", value: oldWords[i]! });
            i++;
          }
          if (j < newWords.length) {
            diff.push({ type: "added", value: newWords[j]! });
            j++;
          }
        }
      }
    }

    // Merge adjacent diffs with the same type for clean rendering
    const merged: DiffSegment[] = [];
    for (const seg of diff) {
      if (seg.value === "") continue;
      const last = merged[merged.length - 1];
      if (last && last.type === seg.type) {
        last.value += seg.value;
      } else {
        merged.push({ type: seg.type, value: seg.value });
      }
    }

    return merged;
  }
}

export const remediationService = new RemediationService();
