/**
 * Cogent Regulatory Intelligence Platform
 * Work Product Artifacts & Immutable Revision Service
 * Document Reference: Document 14 & Document 15 (Phase 3)
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { auditService } from "@/modules/audit/audit.service";
import { guardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";
import { logger } from "@/lib/logger";
import {
  createWorkProductSchema,
  updateWorkProductSchema,
  type UpdateWorkProductInput,
  type WorkflowType,
  type WorkProductRecord,
  type WorkProductStatus,
} from "@/contracts/work-product.contracts";

export interface WorkProductRevisionRecord {
  id: string;
  tenant_id: string;
  work_product_id: string;
  version_number: number;
  markdown_content: string;
  structured_payload: Record<string, unknown>;
  change_summary: string | null;
  edited_by: string;
  source_hash_sha256: string;
  created_at: string;
}

export class WorkProductService {
  private computeSha256(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }

  /**
   * Creates a new persisted Work Product or creates a new version if work_product_id is supplied.
   * Always enforces guardrailValidator.validateWorkProduct() before persistence.
   */
  public async upsertWorkProduct(
    tenantId: string,
    userId: string,
    rawInput: import("zod").input<typeof createWorkProductSchema>,
    options?: {
      allowedLiveUrls?: string[];
      hasInternalKnowledgeRefs?: boolean;
    }
  ): Promise<{ workProduct: WorkProductRecord; created: boolean }> {
    const input = createWorkProductSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    // Run Work Product anti-hallucination & legal-floor guardrail validation
    const validation = await guardrailValidator.validateWorkProduct(
      {
        workflow_type: input.workflow_type,
        markdown_content: input.markdown_content,
        structured_payload: input.structured_payload,
        citations: input.citations,
        evidence_gaps: input.evidence_gaps,
      },
      {
        tenantId,
        allowedLiveUrls: options?.allowedLiveUrls,
        hasInternalKnowledgeRefs: options?.hasInternalKnowledgeRefs,
      }
    );

    const sanitizedMarkdown = validation.sanitized_markdown;
    const sourceHash = this.computeSha256(sanitizedMarkdown);

    // Check if updating an existing work product
    if (input.work_product_id) {
      const { data: existing, error: fetchErr } = await supabase
        .from("work_product_artifacts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", input.work_product_id)
        .maybeSingle();

      if (!fetchErr && existing) {
        const nextVersion = Number(existing.version_number || 1) + 1;
        const { data: updated, error: updErr } = await supabase
          .from("work_product_artifacts")
          .update({
            title: input.title,
            jurisdiction_scope: input.jurisdiction_scope,
            markdown_content: sanitizedMarkdown,
            structured_payload: input.structured_payload,
            citations: validation.sanitized_citations,
            evidence_gaps: validation.evidence_gaps,
            guardrail_report: validation.guardrail_report,
            version_number: nextVersion,
            status: input.status,
            source_hash_sha256: sourceHash,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("id", input.work_product_id)
          .select("*")
          .single();

        if (updErr || !updated) {
          throw new Error(`Failed to update work product: ${updErr?.message || "Unknown error"}`);
        }

        await supabase.from("work_product_revisions").insert({
          tenant_id: tenantId,
          work_product_id: updated.id,
          version_number: nextVersion,
          markdown_content: sanitizedMarkdown,
          structured_payload: input.structured_payload,
          change_summary: input.change_summary || "Updated via workflow tool execution",
          edited_by: userId,
          source_hash_sha256: sourceHash,
        });

        await auditService.appendEvent({
          tenantId,
          actorId: userId,
          actorType: "USER",
          action: "WORK_PRODUCT_UPDATED",
          entityType: "WORK_PRODUCT_ARTIFACT",
          entityId: updated.id,
          eventData: {
            workflowType: updated.workflow_type,
            artifactType: updated.artifact_type,
            versionNumber: nextVersion,
            sourceHashSha256: sourceHash,
          },
        });

        return { workProduct: updated as WorkProductRecord, created: false };
      }
    }

    // Insert new work product artifact
    const { data: inserted, error: insErr } = await supabase
      .from("work_product_artifacts")
      .insert({
        ...(input.work_product_id ? { id: input.work_product_id } : {}),
        tenant_id: tenantId,
        conversation_id: input.conversation_id ?? null,
        message_id: input.message_id ?? null,
        workflow_type: input.workflow_type,
        artifact_type: input.artifact_type,
        title: input.title,
        jurisdiction_scope: input.jurisdiction_scope,
        markdown_content: sanitizedMarkdown,
        structured_payload: input.structured_payload,
        citations: validation.sanitized_citations,
        evidence_gaps: validation.evidence_gaps,
        guardrail_report: validation.guardrail_report,
        version_number: 1,
        status: input.status,
        source_hash_sha256: sourceHash,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (insErr || !inserted) {
      logger.error("Failed to insert work product artifact", {
        tenantId,
        workflowType: input.workflow_type,
        error: insErr?.message,
      });
      throw new Error(`Failed to persist work product: ${insErr?.message || "Unknown error"}`);
    }

    await supabase.from("work_product_revisions").insert({
      tenant_id: tenantId,
      work_product_id: inserted.id,
      version_number: 1,
      markdown_content: sanitizedMarkdown,
      structured_payload: input.structured_payload,
      change_summary: input.change_summary || "Initial draft synthesized",
      edited_by: userId,
      source_hash_sha256: sourceHash,
    });

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "WORK_PRODUCT_CREATED",
      entityType: "WORK_PRODUCT_ARTIFACT",
      entityId: inserted.id,
      eventData: {
        workflowType: inserted.workflow_type,
        artifactType: inserted.artifact_type,
        conversationId: inserted.conversation_id,
        versionNumber: 1,
        sourceHashSha256: sourceHash,
      },
    });

    return { workProduct: inserted as WorkProductRecord, created: true };
  }

  /**
   * Lists persisted Work Products for a tenant with optional filters.
   */
  public async listWorkProducts(
    tenantId: string,
    filters?: {
      conversation_id?: string;
      workflow_type?: WorkflowType;
      status?: WorkProductStatus;
      limit?: number;
    }
  ): Promise<WorkProductRecord[]> {
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(filters?.limit || 30, 100);

    let query = supabase
      .from("work_product_artifacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (filters?.conversation_id) {
      query = query.eq("conversation_id", filters.conversation_id);
    }
    if (filters?.workflow_type) {
      query = query.eq("workflow_type", filters.workflow_type);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list work products: ${error.message}`);
    }

    return (data || []) as WorkProductRecord[];
  }

  /**
   * Fetches a single Work Product and its revision history for a tenant.
   */
  public async getWorkProductWithRevisions(
    tenantId: string,
    workProductId: string
  ): Promise<{ work_product: WorkProductRecord; revisions: WorkProductRevisionRecord[] } | null> {
    const supabase = createAdminSupabaseClient();

    const { data: wp, error: wpErr } = await supabase
      .from("work_product_artifacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", workProductId)
      .maybeSingle();

    if (wpErr || !wp) {
      return null;
    }

    const { data: revRows, error: revErr } = await supabase
      .from("work_product_revisions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("work_product_id", workProductId)
      .order("version_number", { ascending: false });

    if (revErr) {
      logger.warn("Failed to load revisions for work product", {
        tenantId,
        workProductId,
        error: revErr.message,
      });
    }

    return {
      work_product: wp as WorkProductRecord,
      revisions: (revRows || []) as WorkProductRevisionRecord[],
    };
  }

  /**
   * Updates an existing Work Product inline from the Studio Canvas, incrementing version_number
   * and recording an immutable revision snapshot.
   */
  public async updateWorkProductInline(
    tenantId: string,
    userId: string,
    workProductId: string,
    rawInput: UpdateWorkProductInput
  ): Promise<{ workProduct: WorkProductRecord; revision: WorkProductRevisionRecord }> {
    const input = updateWorkProductSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("work_product_artifacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", workProductId)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error(`Work product ${workProductId} not found`);
    }

    const nextMarkdown = input.markdown_content ?? existing.markdown_content;
    const nextPayload = input.structured_payload ?? existing.structured_payload ?? {};
    const nextTitle = input.title ?? existing.title;
    const nextStatus = input.status ?? existing.status;

    // Re-run policy/URL validation when content is edited
    const validation = await guardrailValidator.validateWorkProduct(
      {
        workflow_type: existing.workflow_type,
        markdown_content: nextMarkdown,
        structured_payload: nextPayload,
        citations: existing.citations || [],
        evidence_gaps: existing.evidence_gaps || [],
      },
      { tenantId }
    );

    const nextVersion = Number(existing.version_number || 1) + 1;
    const nextHash = this.computeSha256(validation.sanitized_markdown);

    const { data: updated, error: updErr } = await supabase
      .from("work_product_artifacts")
      .update({
        title: nextTitle,
        markdown_content: validation.sanitized_markdown,
        structured_payload: nextPayload,
        citations: validation.sanitized_citations,
        evidence_gaps: validation.evidence_gaps,
        guardrail_report: validation.guardrail_report,
        version_number: nextVersion,
        status: nextStatus,
        source_hash_sha256: nextHash,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", workProductId)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new Error(`Failed to update work product: ${updErr?.message || "Unknown error"}`);
    }

    const { data: revision, error: revErr } = await supabase
      .from("work_product_revisions")
      .insert({
        tenant_id: tenantId,
        work_product_id: workProductId,
        version_number: nextVersion,
        markdown_content: validation.sanitized_markdown,
        structured_payload: nextPayload,
        change_summary: input.change_summary || `Inline canvas edit (v${nextVersion})`,
        edited_by: userId,
        source_hash_sha256: nextHash,
      })
      .select("*")
      .single();

    if (revErr || !revision) {
      throw new Error(`Failed to record work product revision: ${revErr?.message || "Unknown error"}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "WORK_PRODUCT_UPDATED",
      entityType: "WORK_PRODUCT_ARTIFACT",
      entityId: workProductId,
      eventData: {
        versionNumber: nextVersion,
        status: nextStatus,
        changeSummary: input.change_summary || null,
        sourceHashSha256: nextHash,
      },
    });

    return {
      workProduct: updated as WorkProductRecord,
      revision: revision as WorkProductRevisionRecord,
    };
  }
}

export const workProductService = new WorkProductService();
