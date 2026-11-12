/**
 * Cogent Marketing Shield - Campaign Intake, Asset Management & Autonomous Assessment Service
 * Document Reference: Document 04 (Section 4), Document 05, Document 08 (Phase 7)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { assetExtractorService } from "@/modules/asset-processing/asset-extractor.service";
import { claimExtractorEngine } from "@/modules/compliance-assessment/claim-extractor";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import { guardrailValidator, CandidateFinding } from "@/modules/compliance-assessment/guardrails.validator";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import {
  CreateCampaignInput,
  ListCampaignsQuery,
  AssetUploadSessionRequest,
  AssetUploadSessionResponse,
  CompleteAssetUploadInput,
  UpdateExtractionSegmentInput,
  TriggerAssessmentInput,
} from "@/contracts/campaign.contracts";
import crypto from "crypto";

export class CampaignService {
  /**
   * 1. Creates a marketing campaign explicitly or from chat conversation.
   */
  public async createCampaign(
    tenantId: string,
    userId: string,
    input: CreateCampaignInput,
  ) {
    const supabase = createAdminSupabaseClient();

    // Insert into marketing_campaigns
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .insert({
        tenant_id: tenantId,
        conversation_id: input.conversation_id || null,
        created_by: userId,
        campaign_name: input.campaign_name,
        description: input.description || null,
        campaign_type: input.campaign_type || "PROMOTIONAL",
        channel: input.channel || "SOCIAL_MEDIA",
        product_id: input.product_id || null,
        status: "DRAFT",
        risk_level: "PENDING",
        metadata: input.metadata || {},
      })
      .select("*")
      .single();

    if (campErr || !campaign) {
      logger.error("Failed to insert marketing campaign", { error: campErr?.message });
      throw new Error(`Failed to create marketing campaign: ${campErr?.message}`);
    }

    // Insert initial campaign revision (Revision #1)
    const { data: revision, error: revErr } = await supabase
      .from("campaign_revisions")
      .insert({
        tenant_id: tenantId,
        campaign_id: campaign.id,
        revision_number: 1,
        content_text: input.initial_content_text || "",
        revision_source: "INITIAL_IMPORT",
        change_summary: "Initial campaign creation intake",
        created_by: userId,
      })
      .select("id")
      .single();

    if (revErr || !revision) {
      logger.error("Failed to insert campaign initial revision", { error: revErr?.message });
    } else {
      // Set current_revision_id on campaign
      await supabase
        .from("marketing_campaigns")
        .update({ current_revision_id: revision.id })
        .eq("id", campaign.id);
      campaign.current_revision_id = revision.id;
    }

    // Link to conversation if provided
    if (input.conversation_id) {
      await supabase.from("conversation_campaign_links").insert({
        tenant_id: tenantId,
        conversation_id: input.conversation_id,
        campaign_id: campaign.id,
        link_type: "CREATED_FROM_CONVERSATION",
      });
    }

    // Audit Event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_CREATED",
      entityType: "MARKETING_CAMPAIGN",
      entityId: campaign.id,
      eventData: {
        campaignName: campaign.campaign_name,
        channel: campaign.channel,
      },
    });

    logger.info("Successfully created marketing campaign", {
      tenantId,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    });

    return campaign;
  }

  /**
   * 2. Lists campaigns with tenant isolation and optional filters.
   */
  public async listCampaigns(tenantId: string, query: ListCampaignsQuery) {
    const supabase = createAdminSupabaseClient();
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    let q = supabase
      .from("marketing_campaigns")
      .select("*, campaign_revisions!current_revision_id(id, revision_number, content_text)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.status) {
      q = q.eq("status", query.status);
    }
    if (query.channel) {
      q = q.eq("channel", query.channel);
    }
    if (query.risk_level) {
      q = q.eq("risk_level", query.risk_level);
    }

    const { data, error, count } = await q;
    if (error) {
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }

    return { campaigns: data || [], totalCount: count ?? (data?.length || 0) };
  }

  /**
   * 3. Retrieves campaign details by ID including current revision and linked assets.
   */
  public async getCampaignById(tenantId: string, campaignId: string) {
    const supabase = createAdminSupabaseClient();

    const { data: campaign, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Fetch revisions, assets, and latest assessment
    const [revRes, assetsRes, assessRes, prodRes] = await Promise.all([
      campaign.current_revision_id
        ? supabase.from("campaign_revisions").select("*").eq("id", campaign.current_revision_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("campaign_assets").select("*").eq("campaign_id", campaignId),
      supabase
        .from("campaign_assessments")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      campaign.product_id
        ? supabase.from("campaign_products").select("*").eq("id", campaign.product_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      ...campaign,
      current_revision: revRes.data || null,
      assets: assetsRes.data || [],
      latest_assessment: assessRes.data || null,
      product: prodRes.data || null,
    };
  }

  /**
   * 4. Creates a Cloudflare R2 presigned asset upload session.
   */
  public async createAssetUploadSession(
    tenantId: string,
    userId: string,
    input: AssetUploadSessionRequest,
  ): Promise<AssetUploadSessionResponse> {
    const supabase = createAdminSupabaseClient();
    const assetId = crypto.randomUUID();

    const fileExt = input.original_filename.split(".").pop()?.toLowerCase() || "bin";
    const assetType = input.mime_type.startsWith("image/") ? "IMAGE" : input.mime_type.includes("pdf") ? "PDF" : "DOCX";

    const presigned = await r2StorageService.generatePresignedUploadUrl({
      tenantId,
      assetId,
      filename: input.original_filename,
      mimeType: input.mime_type,
      fileSizeBytes: input.file_size_bytes,
    });

    // Record asset entry in database
    const { error: insErr } = await supabase.from("campaign_assets").insert({
      id: assetId,
      tenant_id: tenantId,
      campaign_id: input.campaign_id || null,
      conversation_id: input.conversation_id || null,
      uploaded_by: userId,
      original_filename: input.original_filename,
      storage_provider: "CLOUDFLARE_R2",
      storage_bucket: process.env.R2_BUCKET_NAME || "cogent-marketing-shield-assets",
      storage_key: presigned.storageKey,
      mime_type: input.mime_type,
      file_extension: fileExt,
      file_size_bytes: input.file_size_bytes,
      sha256_hash: input.sha256_hash,
      asset_type: assetType,
      processing_status: "PENDING",
      malware_status: "PENDING",
      extraction_status: "PENDING",
    });

    if (insErr) {
      throw new Error(`Failed to initialize campaign asset record: ${insErr.message}`);
    }

    return {
      asset_id: assetId,
      presigned_upload_url: presigned.uploadUrl,
      storage_key: presigned.storageKey,
      expires_in_seconds: presigned.expiresInSeconds,
      max_size_bytes: presigned.maxSizeBytes,
    };
  }

  /**
   * 5. Completes asset upload: performs magic bytes check, multimodal OCR/parsing, and queues assessment.
   */
  public async completeAssetUpload(
    tenantId: string,
    userId: string,
    assetId: string,
    input: CompleteAssetUploadInput,
  ) {
    const extractionResult = await assetExtractorService.extractAsset({
      tenantId,
      assetId,
    });

    const supabase = createAdminSupabaseClient();
    const { data: asset } = await supabase
      .from("campaign_assets")
      .select("campaign_id")
      .eq("id", assetId)
      .single();

    // If linked to campaign, append extracted text to current revision or trigger assessment
    if (asset?.campaign_id && input.auto_assess) {
      const { data: campaign } = await supabase
        .from("marketing_campaigns")
        .select("current_revision_id")
        .eq("id", asset.campaign_id)
        .single();

      if (campaign?.current_revision_id) {
        // Append extracted text to revision content_text
        const { data: rev } = await supabase
          .from("campaign_revisions")
          .select("content_text")
          .eq("id", campaign.current_revision_id)
          .single();

        const updatedCopy = rev?.content_text
          ? `${rev.content_text}\n\n[Asset Extraction - ${extractionResult.extractionMethod}]:\n${extractionResult.extractedText}`
          : extractionResult.extractedText;

        await supabase
          .from("campaign_revisions")
          .update({ content_text: updatedCopy })
          .eq("id", campaign.current_revision_id);

        // Trigger autonomous compliance assessment
        await this.triggerAssessment(tenantId, userId, asset.campaign_id, {
          revision_id: campaign.current_revision_id,
          include_live_web_check: false,
        });
      }
    }

    return {
      success: true,
      assetId,
      extraction: extractionResult,
    };
  }

  /**
   * 6. Retrieves asset extraction segments and bounding boxes.
   */
  public async getAssetExtraction(tenantId: string, assetId: string) {
    const supabase = createAdminSupabaseClient();

    const { data: extraction, error: extErr } = await supabase
      .from("asset_extractions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (extErr || !extraction) {
      return null;
    }

    const { data: segments } = await supabase
      .from("asset_extraction_segments")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("asset_id", assetId)
      .order("segment_index", { ascending: true });

    return {
      ...extraction,
      segments: segments || [],
    };
  }

  /**
   * 7. Corrects a low-confidence OCR segment and writes audit event.
   */
  public async updateExtractionSegment(
    tenantId: string,
    userId: string,
    assetId: string,
    segmentId: string,
    input: UpdateExtractionSegmentInput,
  ) {
    const supabase = createAdminSupabaseClient();

    const { data: oldSegment, error: getErr } = await supabase
      .from("asset_extraction_segments")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", segmentId)
      .single();

    if (getErr || !oldSegment) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    const { data: updated, error: updErr } = await supabase
      .from("asset_extraction_segments")
      .update({
        text_content: input.text_content,
        metadata: {
          ...oldSegment.metadata,
          corrected_by: userId,
          corrected_at: new Date().toISOString(),
          correction_reason: input.correction_reason || "User OCR correction",
        },
      })
      .eq("id", segmentId)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new Error(`Failed to update OCR segment: ${updErr?.message}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "OCR_SEGMENT_CORRECTED",
      entityType: "ASSET_EXTRACTION_SEGMENT",
      entityId: segmentId,
      eventData: {
        assetId,
        correctionReason: input.correction_reason,
        previousText: oldSegment.text_content,
        newText: updated.text_content,
      },
    });

    return updated;
  }

  /**
   * 8. Executes full autonomous compliance assessment with 3 Deterministic Locks & 7-Layer Guardrails.
   */
  public async triggerAssessment(
    tenantId: string,
    userId: string,
    campaignId: string,
    input: TriggerAssessmentInput,
  ) {
    const supabase = createAdminSupabaseClient();

    // 1. Fetch Campaign and Revision
    const campaignDetail = await this.getCampaignById(tenantId, campaignId);
    const revisionId = input.revision_id || campaignDetail.current_revision_id;

    if (!revisionId) {
      throw new Error(`No revision found to assess for campaign ${campaignId}`);
    }

    const { data: revision } = await supabase
      .from("campaign_revisions")
      .select("*")
      .eq("id", revisionId)
      .single();

    const contentText = revision?.content_text || "";

    // 2. Mark Campaign Assessment in Progress
    await supabase
      .from("marketing_campaigns")
      .update({ status: "ASSESSMENT_IN_PROGRESS" })
      .eq("id", campaignId);

    // 3. Create Assessment Record
    const { data: assessment, error: assessErr } = await supabase
      .from("campaign_assessments")
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        revision_id: revisionId,
        assessment_number: (campaignDetail.latest_assessment?.assessment_number || 0) + 1,
        assessment_type: "INITIAL",
        status: "PROCESSING",
        overall_risk_level: "PENDING",
        created_by: userId,
        assessment_started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (assessErr || !assessment) {
      throw new Error(`Failed to initialize assessment record: ${assessErr?.message}`);
    }

    // 4. Extract Claims across 11 categories
    await claimExtractorEngine.extractClaims({
      tenantId,
      campaignId,
      revisionId,
      contentText,
      sourceType: "DIRECT_TEXT",
    });

    // 5. Execute 3 Deterministic Mechanical Locks
    const lockResults = await mechanicalLocksEngine.executeLocks({
      tenantId,
      campaignId,
      contentText,
      productTruth: campaignDetail.product?.approved_terms || null,
      channel: campaignDetail.channel,
    });

    // 6. Multi-Source Statutory Retrieval
    const { data: clauses } = await supabase.rpc("match_regulatory_clauses", {
      query_text: contentText.slice(0, 500) || "advertising consumer protection",
      query_embedding: null,
      match_count: 5,
    });

    // 7. Gemini Reasoning & Synthesis
    const prompt = `You are the Lead Nigerian Regulatory Compliance Counsel for Cogent Marketing Shield.
Evaluate this financial promotional campaign against official Nigerian statutory regulations (CBN CPF, FCCPA, ARCON ASP, NDPA).

Campaign Name: "${campaignDetail.campaign_name}"
Channel: "${campaignDetail.channel}"
Copy Text:
"""
${contentText}
"""

Deterministic Mechanical Lock Results:
- Lock 1 Prohibited Terms: ${lockResults.lock1_prohibited_terms.passed ? "PASSED" : "FAILED (Breaches: " + lockResults.lock1_prohibited_terms.breaches.map(b => b.matchedText).join(", ") + ")"}
- Lock 2 Product Rate Truth: ${lockResults.lock2_product_rate_match.passed ? "PASSED" : "FAILED"}
- Lock 3 Mandatory Disclosures: ${lockResults.lock3_mandatory_disclosures.passed ? "PASSED" : "FAILED (Missing: " + lockResults.lock3_mandatory_disclosures.missingDisclosures.join(", ") + ")"}

Generate actionable compliance findings. For every finding, provide:
- findingCode: e.g. "FIND-CBN-RATE-01", "FIND-FCCPC-DISC-02"
- title: Concise, authoritative finding title
- description: Legal rationale explaining the specific statutory risk
- severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
- regulatoryClauseId: UUID if known from the vault, or null
- recommendedAction: Specific remediation required to achieve compliance

Return a clean JSON array of findings only.`;

    const candidateFindings: CandidateFinding[] = [];

    // First convert mechanical lock breaches into candidate findings
    for (const b of [
      ...lockResults.lock1_prohibited_terms.breaches,
      ...lockResults.lock2_product_rate_match.breaches,
      ...lockResults.lock3_mandatory_disclosures.breaches,
    ]) {
      candidateFindings.push({
        claimText: b.matchedText || contentText.slice(0, 100),
        findingCode: `LOCK-${b.lockNumber}-${b.breachType}`,
        title: `${b.lockName}: ${b.matchedText || b.breachType}`,
        description: b.explanation,
        severity: b.severity,
        regulatoryClauseId: clauses?.[0]?.id || undefined,
        recommendedAction: `Remediate the prohibited claim '${b.matchedText}' in line with Nigerian statutory standards.`,
      });
    }

    try {
      const aiResponse = await geminiService.generateText({
        prompt,
        temperature: 0.2,
        context: { taskType: "ASSESSMENT_REASONING" },
      });

      const parsedAiFindings = JSON.parse(aiResponse.text || "[]");
      if (Array.isArray(parsedAiFindings)) {
        for (const item of parsedAiFindings) {
          if (item.findingCode && item.title && item.description) {
            candidateFindings.push({
              claimText: item.claimText || contentText.slice(0, 100),
              findingCode: String(item.findingCode),
              title: String(item.title),
              description: String(item.description),
              severity: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(item.severity)
                ? item.severity
                : "MEDIUM",
              regulatoryClauseId: item.regulatoryClauseId || clauses?.[0]?.id,
              recommendedAction: String(item.recommendedAction || "Update marketing copy to comply with regulations."),
            });
          }
        }
      }
    } catch (err) {
      logger.warn("AI compliance assessment generation fallback applied", { error: (err as Error).message });
    }

    // 8. 7-Layer Guardrails Validation
    const guardrailReport = await guardrailValidator.validateFindings(
      candidateFindings,
      contentText,
      tenantId,
    );

    // 9. Persist validated findings and evidence
    for (const vf of guardrailReport.validatedFindings) {
      const { data: findingRecord } = await supabase
        .from("compliance_findings")
        .insert({
          tenant_id: tenantId,
          campaign_id: campaignId,
          assessment_id: assessment.id,
          revision_id: revisionId,
          finding_code: vf.findingCode,
          title: vf.title,
          description: vf.description,
          severity: vf.severity,
          finding_status: "OPEN",
          applicability_status: vf.applicabilityStatus,
          recommended_action: vf.recommendedAction,
          requires_human_review: vf.requiresHumanReview,
        })
        .select("id")
        .single();

      if (findingRecord && vf.regulatoryClauseId) {
        await supabase.from("finding_evidence").insert({
          tenant_id: tenantId,
          finding_id: findingRecord.id,
          evidence_type: "REGULATORY_CLAUSE",
          regulatory_clause_id: vf.regulatoryClauseId,
          relevance_explanation: vf.description,
          applicability_status: vf.applicabilityStatus,
          verification_status: "VERIFIED",
        });

        // Insert immutable evidence snapshot
        await supabase.from("assessment_evidence_snapshots").insert({
          tenant_id: tenantId,
          assessment_id: assessment.id,
          source_type: "REGULATORY",
          source_record_id: vf.regulatoryClauseId,
          source_text_hash: crypto.createHash("sha256").update(vf.description).digest("hex"),
          evidence_snapshot: {
            title: vf.title,
            findingCode: vf.findingCode,
            statutoryBasis: vf.description,
          },
          verification_status: "VERIFIED",
        });
      }
    }

    // 10. Update Assessment and Campaign Status
    const hasCritical = guardrailReport.validatedFindings.some((f) => f.severity === "CRITICAL");
    const hasHigh = guardrailReport.validatedFindings.some((f) => f.severity === "HIGH");
    const overallRisk = hasCritical ? "CRITICAL" : hasHigh ? "HIGH" : guardrailReport.validatedFindings.length > 0 ? "MEDIUM" : "LOW";

    await supabase
      .from("campaign_assessments")
      .update({
        status: "COMPLETED",
        overall_risk_level: overallRisk,
        summary: `Autonomous assessment identified ${guardrailReport.validatedFindings.length} findings (${lockResults.totalBreachCount} mechanical lock breaches).`,
        assessment_completed_at: new Date().toISOString(),
      })
      .eq("id", assessment.id);

    await supabase
      .from("marketing_campaigns")
      .update({
        status: "FINDINGS_AVAILABLE",
        risk_level: overallRisk,
      })
      .eq("id", campaignId);

    // Audit Event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_ASSESSMENT_COMPLETED",
      entityType: "CAMPAIGN_ASSESSMENT",
      entityId: assessment.id,
      eventData: {
        assessmentId: assessment.id,
        overallRisk,
        findingsCount: guardrailReport.validatedFindings.length,
      },
    });

    return {
      assessmentId: assessment.id,
      campaignId,
      overallRisk,
      lockResults,
      findingsCount: guardrailReport.validatedFindings.length,
    };
  }

  /**
   * 9. Retrieves an assessment by ID with lock summary.
   */
  public async getAssessment(tenantId: string, assessmentId: string) {
    const supabase = createAdminSupabaseClient();
    const { data: assessment, error } = await supabase
      .from("campaign_assessments")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", assessmentId)
      .single();

    if (error || !assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    const { data: findings } = await supabase
      .from("compliance_findings")
      .select("*, finding_evidence(*)")
      .eq("assessment_id", assessmentId);

    return {
      ...assessment,
      findings: findings || [],
    };
  }

  /**
   * 10. Lists findings for a campaign.
   */
  public async listFindings(tenantId: string, campaignId: string) {
    const supabase = createAdminSupabaseClient();
    const { data: findings, error } = await supabase
      .from("compliance_findings")
      .select("*, finding_evidence(*)")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list findings: ${error.message}`);
    }

    return findings || [];
  }

  /**
   * 11. Retrieves a single finding by ID with full evidence chain.
   */
  public async getFindingById(tenantId: string, findingId: string) {
    const supabase = createAdminSupabaseClient();
    const { data: finding, error } = await supabase
      .from("compliance_findings")
      .select("*, finding_evidence(*, regulatory_clauses(*))")
      .eq("tenant_id", tenantId)
      .eq("id", findingId)
      .single();

    if (error || !finding) {
      throw new Error(`Finding ${findingId} not found`);
    }

    return finding;
  }
}

export const campaignService = new CampaignService();
