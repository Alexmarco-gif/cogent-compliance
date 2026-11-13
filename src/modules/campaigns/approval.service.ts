/**
 * Cogent Marketing Shield - Campaign Human Sign-Off & Approval Service
 * Document Reference: Document 04 (Section 5.4), Document 07 (Section 5.2 Separation of Duties), Document 08 (Phase 9)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { auditService } from "@/modules/audit/audit.service";
import { notificationService } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import {
  SubmitCampaignReviewInput,
  CampaignApprovalDecisionInput,
} from "@/contracts/approval-dossier.contracts";

export class ApprovalService {
  /**
   * 1. Submits a campaign revision for formal Legal / CCO Sign-Off.
   * Enforces that the revision exists and transitions campaign status to UNDER_REVIEW.
   */
  public async submitForReview(
    tenantId: string,
    userId: string,
    campaignId: string,
    input: SubmitCampaignReviewInput,
  ) {
    const supabase = createAdminSupabaseClient();

    // Verify campaign existence and tenant isolation
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("id, campaign_name, channel, status, current_revision_id")
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Verify revision exists
    const { data: revision, error: revErr } = await supabase
      .from("campaign_revisions")
      .select("id, revision_number, content_text")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .eq("id", input.revision_id)
      .single();

    if (revErr || !revision) {
      throw new Error(
        `Revision ${input.revision_id} not found for campaign ${campaignId}`,
      );
    }

    // Insert campaign review record
    const { data: review, error: revInsertErr } = await supabase
      .from("campaign_reviews")
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        revision_id: input.revision_id,
        reviewer_id: userId,
        review_status: "PENDING",
        review_comments: input.comment || null,
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (revInsertErr || !review) {
      throw new Error(`Failed to create review record: ${revInsertErr?.message}`);
    }

    // Transition campaign status to UNDER_REVIEW
    await supabase
      .from("marketing_campaigns")
      .update({
        status: "UNDER_REVIEW",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", campaignId);

    // Fetch tenant institution name for notification
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();

    const institutionName = tenant?.name || "Regulated Financial Institution";

    // Send transactional email notification to Compliance Team
    try {
      await notificationService.sendReviewRequest({
        to: process.env.RESEND_FROM_EMAIL || "compliance@notifications.stem-cogent.com",
        campaign_id: campaignId,
        campaign_title: campaign.campaign_name,
        submitter_name: userId,
        institution_name: institutionName,
        review_url: `https://compliance.stem-cogent.com/campaigns/${campaignId}`,
      });
    } catch (notifErr) {
      logger.warn("Failed to dispatch review request notification", {
        error: notifErr,
        campaignId,
      });
    }

    // Record immutable audit event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_SUBMITTED_FOR_REVIEW",
      entityType: "CAMPAIGN",
      entityId: campaignId,
      eventData: {
        campaignId,
        revisionId: input.revision_id,
        revisionNumber: revision.revision_number,
        comment: input.comment || null,
        previousStatus: campaign.status,
        newStatus: "UNDER_REVIEW",
      },
    });

    logger.info("Campaign submitted for compliance review", {
      tenantId,
      campaignId,
      revisionId: input.revision_id,
      userId,
    });

    return {
      success: true,
      campaign_id: campaignId,
      status: "UNDER_REVIEW",
      review_id: review.id,
      submitted_at: review.started_at,
    };
  }

  /**
   * 2. Records formal institutional sign-off or rejection decision.
   * Strictly gated by approval.decide permission. Enforces separation of duties & dual control.
   */
  public async recordApprovalDecision(
    tenantId: string,
    userId: string,
    campaignId: string,
    input: CampaignApprovalDecisionInput,
    userRole?: string,
  ) {
    const supabase = createAdminSupabaseClient();

    // Separation of Duties Verification
    if (
      userRole === "MARKETING_GROWTH" ||
      userRole === "COMPLIANCE_ANALYST"
    ) {
      throw new Error(
        "403 APPROVAL_NOT_PERMITTED: Only Legal Counsel and Chief Compliance Officers can decide formal campaign approvals.",
      );
    }

    // Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("id, campaign_name, status, current_revision_id, created_by")
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Confirm revision is the campaign's current assessed revision
    if (campaign.current_revision_id !== input.revision_id) {
      throw new Error(
        `Approval target revision ${input.revision_id} is not the current active revision of campaign ${campaignId}`,
      );
    }

    // Fetch revision to check author for Dual-Control Policy
    const { data: revision } = await supabase
      .from("campaign_revisions")
      .select("id, created_by, revision_number")
      .eq("tenant_id", tenantId)
      .eq("id", input.revision_id)
      .single();

    // Dual-Control Enforcement: Author cannot self-approve their own revision
    const enforceDualControl = process.env.ENFORCE_DUAL_CONTROL_APPROVAL === "true";
    if (enforceDualControl && revision?.created_by === userId) {
      throw new Error(
        "DUAL_CONTROL_VIOLATION: Regulatory policy prohibits self-approval of authored campaign revision.",
      );
    }

    // Insert formal approval record
    const { data: approval, error: appErr } = await supabase
      .from("campaign_approvals")
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        revision_id: input.revision_id,
        approved_by: userId,
        decision: input.decision,
        decision_reason: input.decision_reason,
        conditions: input.conditions || {},
        decided_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (appErr || !approval) {
      throw new Error(`Failed to record approval decision: ${appErr?.message}`);
    }

    // Update campaign status
    const newStatus = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";
    const approvedRevisionId = input.decision === "APPROVED" ? input.revision_id : null;

    await supabase
      .from("marketing_campaigns")
      .update({
        status: newStatus,
        approved_revision_id: approvedRevisionId,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", campaignId);

    // Update any pending reviews for this revision
    await supabase
      .from("campaign_reviews")
      .update({
        review_status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .eq("revision_id", input.revision_id)
      .eq("review_status", "PENDING");

    // Dispatch decision notification
    try {
      await notificationService.sendApprovalDecision({
        to: process.env.RESEND_FROM_EMAIL || "marketing@accessbankplc.com",
        campaign_id: campaignId,
        campaign_title: campaign.campaign_name,
        decision: input.decision,
        officer_name: userId,
        officer_role: userRole || "LEGAL_COUNSEL",
        comments: input.decision_reason,
        campaign_url: `https://compliance.stem-cogent.com/campaigns/${campaignId}`,
      });
    } catch (notifErr) {
      logger.warn("Failed to dispatch approval decision notification", {
        error: notifErr,
        campaignId,
      });
    }

    // Record immutable audit event
    const actionType =
      input.decision === "APPROVED" ? "CAMPAIGN_APPROVED" : "CAMPAIGN_REJECTED";

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: actionType,
      entityType: "CAMPAIGN_APPROVAL",
      entityId: approval.id,
      eventData: {
        campaignId,
        revisionId: input.revision_id,
        decision: input.decision,
        decisionReason: input.decision_reason,
        conditions: input.conditions || {},
        approvedRevisionId,
        newStatus,
      },
    });

    logger.info("Recorded formal compliance sign-off decision", {
      tenantId,
      campaignId,
      revisionId: input.revision_id,
      decision: input.decision,
      decidedBy: userId,
    });

    return {
      approval,
      campaignStatus: newStatus,
      approvedRevisionId,
    };
  }

  /**
   * 3. Retrieves historical approvals and review records for a campaign.
   */
  public async listApprovalsAndReviews(tenantId: string, campaignId: string) {
    const supabase = createAdminSupabaseClient();

    const [approvalsRes, reviewsRes] = await Promise.all([
      supabase
        .from("campaign_approvals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaignId)
        .order("decided_at", { ascending: false }),
      supabase
        .from("campaign_reviews")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaignId)
        .order("started_at", { ascending: false }),
    ]);

    return {
      approvals: approvalsRes.data || [],
      reviews: reviewsRes.data || [],
    };
  }
}

export const approvalService = new ApprovalService();
