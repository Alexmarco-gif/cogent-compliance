/**
 * Cogent Compliance Platform — Product Feature Governance & NPA System of Record Service
 *
 * Manages the full 9-stage fintech feature governance lifecycle:
 * - Feature Proposals & Materiality Classification (including 1-click promotion from Work Products)
 * - Risk & Control Matrix + Compliance-to-Build Tracking
 * - 1st-Line Control Evidence Attachment (SHA-256 hashed) & 2nd-Line Control Verification
 * - Interactive 10-Point Launch Readiness Gate (APPROVED / CONDITIONALLY_APPROVED / REJECTED)
 *   with strict Three Lines of Defence enforcement, anti-self-approval, and non-overridable blockers
 * - Post-Implementation Reviews (PIR), Material Change Reassessments & 3rd-Line Audit Observations
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import {
  assertCanDecideFeatureGate,
  assertThirdLineIndependence,
  requirePermission,
} from "@/modules/auth-tenancy/rbac.guard";
import { getRoleMetadata } from "@/modules/auth-tenancy/roles";
import { AuthTenancyError, type TenantContext } from "@/modules/auth-tenancy/types";
import {
  type ControlEvidenceAttachment,
  type FeatureControlRecord,
  type FeatureLifecycleStage,
  type FeaturePostLaunchReviewRecord,
  type FeatureReadinessGateRecord,
  type GateConditionItem,
  type GateSignoffRecord,
  type ProductFeatureRecord,
  type ReadinessEvaluation,
  createControlSchema,
  createFeatureSchema,
  createPostLaunchReviewSchema,
  attachControlEvidenceSchema,
  promoteWorkProductToFeatureSchema,
  submitGateActionSchema,
  updateFeatureSchema,
  verifyControlSchema,
} from "@/contracts/feature-governance.contracts";
import { featureStructuringEngine } from "./feature-structuring.engine";

export interface FeatureDossier {
  feature: ProductFeatureRecord;
  controls: FeatureControlRecord[];
  gates: FeatureReadinessGateRecord[];
  reviews: FeaturePostLaunchReviewRecord[];
  ripple_alerts: Array<Record<string, unknown>>;
  readiness: ReadinessEvaluation;
}

export class FeatureGovernanceService {
  private sha256(payload: string): string {
    return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  }

  /**
   * Lists all governed product features for the tenant, optionally filtered by stage or gate status.
   */
  public async listFeatures(
    tenantId: string,
    filters?: {
      lifecycle_stage?: string;
      gate_status?: string;
      materiality_tier?: string;
    }
  ): Promise<ProductFeatureRecord[]> {
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("product_features")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (filters?.lifecycle_stage) {
      query = query.eq("lifecycle_stage", filters.lifecycle_stage);
    }
    if (filters?.gate_status) {
      query = query.eq("gate_status", filters.gate_status);
    }
    if (filters?.materiality_tier) {
      query = query.eq("materiality_tier", filters.materiality_tier);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Failed to list product features", { tenantId, error: error.message });
      throw new Error(`Failed to list product features: ${error.message}`);
    }
    return (data || []) as ProductFeatureRecord[];
  }

  /**
   * Creates a new Product Feature Proposal and optionally auto-bootstraps its Multi-Domain RIA,
   * Risk & Control Matrix, and Compliance-to-Build specifications.
   */
  public async createFeature(
    ctx: TenantContext,
    rawInput: import("zod").input<typeof createFeatureSchema>
  ): Promise<FeatureDossier> {
    assertThirdLineIndependence(ctx, "feature.create");
    requirePermission(ctx, "feature.create");

    const input = createFeatureSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const blueprint = featureStructuringEngine.buildFeatureStructuringBlueprint({
      featureName: input.feature_name,
      description: input.summary,
      businessObjective: input.business_objective || input.summary,
      explicitActivityType: input.financial_activity_type,
      explicitChangeClassification: input.change_classification,
      explicitMaterialityTier: input.materiality_tier,
      targetMarket: input.target_market,
    });

    const initialStage: FeatureLifecycleStage = input.auto_generate_controls
      ? "RISK_AND_CONTROL_DESIGN"
      : "PROPOSAL";

    const { data: createdFeature, error: featureErr } = await supabase
      .from("product_features")
      .insert({
        tenant_id: ctx.tenantId,
        feature_code: blueprint.feature_code,
        feature_name: input.feature_name,
        summary: input.summary,
        business_objective: input.business_objective || input.summary.slice(0, 400),
        financial_activity_type: blueprint.financial_activity_type,
        change_classification: blueprint.change_classification,
        materiality_tier: blueprint.materiality_tier,
        target_market: input.target_market,
        revenue_model: input.revenue_model,
        third_party_dependencies: input.third_party_dependencies,
        applicable_regulators: blueprint.applicable_regulators,
        regulatory_domains: blueprint.regulatory_domains,
        ria_matrix: blueprint.ria_matrix,
        lifecycle_stage: initialStage,
        gate_status: "NOT_READY",
        readiness_score_numerator: 3,
        readiness_score_denominator: 10,
        work_product_id: input.work_product_id || null,
        conversation_id: input.conversation_id || null,
        linked_product_id: input.linked_product_id || null,
        created_by: ctx.userId,
        owner_user_id: ctx.userId,
        owner_role: ctx.role,
        metadata: {
          materiality_rationale: blueprint.materiality_rationale,
        },
      })
      .select("*")
      .single();

    if (featureErr || !createdFeature) {
      throw new Error(`Failed to create product feature: ${featureErr?.message || "Unknown error"}`);
    }

    let insertedControls: FeatureControlRecord[] = [];
    if (input.auto_generate_controls && blueprint.controls.length > 0) {
      const rows = blueprint.controls.map((c) => ({
        tenant_id: ctx.tenantId,
        feature_id: createdFeature.id,
        control_code: c.control_code,
        compliance_domain: c.compliance_domain,
        regulator: c.regulator,
        statutory_citation: c.statutory_citation,
        risk_statement: c.risk_statement,
        risk_severity: c.risk_severity,
        control_type: c.control_type,
        control_objective: c.control_objective,
        product_requirement: c.product_requirement,
        engineering_spec: c.engineering_spec,
        operational_sop_trigger: c.operational_sop_trigger,
        qa_test_case: c.qa_test_case,
        owner_line: c.owner_line,
        owner_role: c.owner_role,
        required_evidence_description: c.required_evidence_description,
        is_mandatory_launch_blocker: c.is_mandatory_launch_blocker,
        verification_status: "PENDING",
        evidence_attachments: [],
      }));

      const { data: ctrlData, error: ctrlErr } = await supabase
        .from("feature_controls")
        .insert(rows)
        .select("*");

      if (ctrlErr) {
        logger.warn("Failed to seed auto-generated feature controls", {
          tenantId: ctx.tenantId,
          featureId: createdFeature.id,
          error: ctrlErr.message,
        });
      } else {
        insertedControls = (ctrlData || []) as FeatureControlRecord[];
      }
    }

    const readiness = featureStructuringEngine.evaluateReadinessChecklist({
      feature: createdFeature as ProductFeatureRecord,
      controls: insertedControls,
    });

    await supabase
      .from("product_features")
      .update({
        readiness_score_numerator: readiness.numerator,
        readiness_score_denominator: readiness.denominator,
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", createdFeature.id);

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "PRODUCT_FEATURE",
      entityId: createdFeature.id,
      action: "FEATURE_PROPOSAL_CREATED",
      eventData: {
        actorRole: ctx.role,
        feature_code: createdFeature.feature_code,
        feature_name: createdFeature.feature_name,
        change_classification: createdFeature.change_classification,
        materiality_tier: createdFeature.materiality_tier,
        controls_seeded: insertedControls.length,
        readiness_score: `${readiness.numerator}/${readiness.denominator}`,
      },
    });

    return {
      feature: {
        ...(createdFeature as ProductFeatureRecord),
        readiness_score_numerator: readiness.numerator,
        readiness_score_denominator: readiness.denominator,
      },
      controls: insertedControls,
      gates: [],
      reviews: [],
      ripple_alerts: [],
      readiness,
    };
  }

  /**
   * 1-Click Promotion: Converts a generated PRODUCT_STRUCTURING_MEMO Work Product into a
   * live governed `product_features` record with its Risk & Control Matrix & 10-Point Gate.
   */
  public async promoteWorkProductToFeature(
    ctx: TenantContext,
    rawInput: import("zod").input<typeof promoteWorkProductToFeatureSchema>
  ): Promise<FeatureDossier> {
    assertThirdLineIndependence(ctx, "feature.create");
    requirePermission(ctx, "feature.create");

    const input = promoteWorkProductToFeatureSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: wp, error: wpErr } = await supabase
      .from("work_product_artifacts")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", input.work_product_id)
      .single();

    if (wpErr || !wp) {
      throw new Error(`Work product ${input.work_product_id} not found for tenant.`);
    }

    // If a feature already exists linked to this work product, return its full dossier
    const { data: existing } = await supabase
      .from("product_features")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("work_product_id", wp.id)
      .maybeSingle();

    if (existing?.id) {
      return this.getFeatureDossier(ctx.tenantId, existing.id);
    }

    const derivedName =
      input.feature_name ||
      String(wp.title || "Structured Fintech Feature").slice(0, 180);
    const summaryText = String(wp.markdown_content || wp.title || "").slice(0, 2800);

    return this.createFeature(ctx, {
      feature_name: derivedName,
      summary: summaryText.length >= 10 ? summaryText : `${derivedName} — promoted from Structuring Pack.`,
      business_objective: `Promoted from Structuring Work Product v${wp.version_number || 1}: ${derivedName}`,
      change_classification: input.change_classification,
      target_market: input.target_market || "INDIVIDUALS_AND_BUSINESSES",
      revenue_model: input.revenue_model || "",
      third_party_dependencies: input.third_party_dependencies || [],
      work_product_id: wp.id,
      conversation_id: wp.conversation_id || null,
      auto_generate_controls: true,
    });
  }

  /**
   * Loads the complete live governance dossier for a product feature.
   */
  public async getFeatureDossier(tenantId: string, featureId: string): Promise<FeatureDossier> {
    const supabase = createAdminSupabaseClient();

    const { data: feature, error: featErr } = await supabase
      .from("product_features")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", featureId)
      .single();

    if (featErr || !feature) {
      throw new Error(`Product feature ${featureId} not found.`);
    }

    const [controlsRes, gatesRes, reviewsRes, ripplesRes] = await Promise.all([
      supabase
        .from("feature_controls")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("feature_id", featureId)
        .order("control_code", { ascending: true }),
      supabase
        .from("feature_readiness_gates")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("feature_id", featureId)
        .order("gate_number", { ascending: false }),
      supabase
        .from("feature_post_launch_reviews")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("feature_id", featureId)
        .order("created_at", { ascending: false }),
      supabase
        .from("regulatory_ripple_alerts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("impacted_feature_id", featureId)
        .order("created_at", { ascending: false }),
    ]);

    const controls = (controlsRes.data || []) as FeatureControlRecord[];
    const gates = (gatesRes.data || []) as FeatureReadinessGateRecord[];
    const reviews = (reviewsRes.data || []) as FeaturePostLaunchReviewRecord[];
    const rippleAlerts = (ripplesRes.data || []) as Array<Record<string, unknown>>;

    const hasSecondLineApproval = gates.some(
      (g) => g.decision === "APPROVED" || g.decision === "CONDITIONALLY_APPROVED"
    );

    const readiness = featureStructuringEngine.evaluateReadinessChecklist({
      feature: feature as ProductFeatureRecord,
      controls,
      hasSecondLineSignoff: hasSecondLineApproval,
    });

    return {
      feature: {
        ...(feature as ProductFeatureRecord),
        readiness_score_numerator: readiness.numerator,
        readiness_score_denominator: readiness.denominator,
      },
      controls,
      gates,
      reviews,
      ripple_alerts: rippleAlerts,
      readiness,
    };
  }

  /**
   * Updates feature proposal metadata or advances lifecycle stage (blocked for 3rd Line Internal Audit).
   */
  public async updateFeature(
    ctx: TenantContext,
    featureId: string,
    rawInput: import("zod").input<typeof updateFeatureSchema>
  ): Promise<FeatureDossier> {
    assertThirdLineIndependence(ctx, "feature.update");
    requirePermission(ctx, "feature.update");

    const input = updateFeatureSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("product_features")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", featureId)
      .single();

    if (fetchErr || !existing) {
      throw new Error(`Product feature ${featureId} not found.`);
    }

    // Prevent skipping Launch Gate into POST_LAUNCH_MONITORING without APPROVED / CONDITIONALLY_APPROVED gate
    if (
      input.lifecycle_stage === "POST_LAUNCH_MONITORING" &&
      existing.gate_status !== "APPROVED" &&
      existing.gate_status !== "CONDITIONALLY_APPROVED"
    ) {
      throw new AuthTenancyError(
        "MANDATORY_GATE_BLOCKER_UNRESOLVED",
        "Cannot transition feature to POST_LAUNCH_MONITORING without a formal APPROVED or CONDITIONALLY_APPROVED Launch Gate decision from 2nd Line.",
        409
      );
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.feature_name !== undefined) patch.feature_name = input.feature_name;
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.business_objective !== undefined) patch.business_objective = input.business_objective;
    if (input.change_classification !== undefined) patch.change_classification = input.change_classification;
    if (input.materiality_tier !== undefined) patch.materiality_tier = input.materiality_tier;
    if (input.target_market !== undefined) patch.target_market = input.target_market;
    if (input.revenue_model !== undefined) patch.revenue_model = input.revenue_model;
    if (input.third_party_dependencies !== undefined) {
      patch.third_party_dependencies = input.third_party_dependencies;
    }
    if (input.lifecycle_stage !== undefined) patch.lifecycle_stage = input.lifecycle_stage;
    if (input.next_pir_due_at !== undefined) patch.next_pir_due_at = input.next_pir_due_at;

    const { error: updErr } = await supabase
      .from("product_features")
      .update(patch)
      .eq("tenant_id", ctx.tenantId)
      .eq("id", featureId);

    if (updErr) {
      throw new Error(`Failed to update feature: ${updErr.message}`);
    }

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "PRODUCT_FEATURE",
      entityId: featureId,
      action: "FEATURE_UPDATED",
      eventData: {
        actorRole: ctx.role,
        previous: {
          lifecycle_stage: existing.lifecycle_stage,
          materiality_tier: existing.materiality_tier,
        },
        patch,
      },
    });

    return this.getFeatureDossier(ctx.tenantId, featureId);
  }

  /**
   * Adds a new Risk & Control + Compliance-to-Build entry to a feature.
   */
  public async addControl(
    ctx: TenantContext,
    featureId: string,
    rawInput: import("zod").input<typeof createControlSchema>
  ): Promise<FeatureControlRecord> {
    assertThirdLineIndependence(ctx, "feature.control.manage");
    requirePermission(ctx, "feature.control.manage");

    const input = createControlSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: created, error } = await supabase
      .from("feature_controls")
      .insert({
        tenant_id: ctx.tenantId,
        feature_id: featureId,
        ...input,
        verification_status: "PENDING",
        evidence_attachments: [],
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error(`Failed to create feature control: ${error?.message || "Unknown error"}`);
    }

    await this.syncReadinessScore(ctx.tenantId, featureId);

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "FEATURE_CONTROL",
      entityId: created.id,
      action: "FEATURE_CONTROL_CREATED",
      eventData: {
        actorRole: ctx.role,
        feature_id: featureId,
        control_code: created.control_code,
        compliance_domain: created.compliance_domain,
        control_type: created.control_type,
        is_mandatory_launch_blocker: created.is_mandatory_launch_blocker,
      },
    });

    return created as FeatureControlRecord;
  }

  /**
   * Attaches cryptographic control test evidence (1st Line or 2nd Line) and transitions
   * a control into EVIDENCE_SUBMITTED for 2nd-Line verification.
   */
  public async attachControlEvidence(
    ctx: TenantContext,
    featureId: string,
    rawInput: import("zod").input<typeof attachControlEvidenceSchema>
  ): Promise<FeatureControlRecord> {
    assertThirdLineIndependence(ctx, "feature.evidence.attach");
    requirePermission(ctx, "feature.evidence.attach");

    const input = attachControlEvidenceSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: control, error: fetchErr } = await supabase
      .from("feature_controls")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("feature_id", featureId)
      .eq("id", input.control_id)
      .single();

    if (fetchErr || !control) {
      throw new Error(`Control ${input.control_id} not found for feature ${featureId}.`);
    }

    const attachment: ControlEvidenceAttachment = {
      id: crypto.randomUUID(),
      title: input.title,
      evidence_type: input.evidence_type,
      reference_url_or_key: input.reference_url_or_key,
      notes: input.notes,
      submitted_by: ctx.userId,
      submitted_role: ctx.role,
      submitted_at: new Date().toISOString(),
      sha256_hash: this.sha256(
        `${featureId}|${input.control_id}|${input.title}|${input.reference_url_or_key}|${input.content_digest_input || ""}`
      ),
    };

    const existingAttachments = Array.isArray(control.evidence_attachments)
      ? (control.evidence_attachments as ControlEvidenceAttachment[])
      : [];
    const nextAttachments = [...existingAttachments, attachment];

    const nextStatus =
      control.verification_status === "VERIFIED"
        ? "VERIFIED"
        : "EVIDENCE_SUBMITTED";

    const { data: updated, error: updErr } = await supabase
      .from("feature_controls")
      .update({
        evidence_attachments: nextAttachments,
        verification_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", control.id)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new Error(`Failed to attach control evidence: ${updErr?.message || "Unknown error"}`);
    }

    await this.syncReadinessScore(ctx.tenantId, featureId);

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "FEATURE_CONTROL",
      entityId: control.id,
      action: "CONTROL_EVIDENCE_ATTACHED",
      eventData: {
        actorRole: ctx.role,
        feature_id: featureId,
        control_code: control.control_code,
        evidence_id: attachment.id,
        evidence_type: attachment.evidence_type,
        sha256_hash: attachment.sha256_hash,
      },
    });

    return updated as FeatureControlRecord;
  }

  /**
   * 2nd-Line Control Verification: Compliance/Legal/Risk/AML/InfoSec verifies or fails a control.
   * 1st Line and 3rd Line are strictly denied.
   */
  public async verifyControl(
    ctx: TenantContext,
    featureId: string,
    rawInput: import("zod").input<typeof verifyControlSchema>
  ): Promise<FeatureControlRecord> {
    assertThirdLineIndependence(ctx, "feature.control.verify");
    requirePermission(ctx, "feature.control.verify");

    const input = verifyControlSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: control, error: fetchErr } = await supabase
      .from("feature_controls")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("feature_id", featureId)
      .eq("id", input.control_id)
      .single();

    if (fetchErr || !control) {
      throw new Error(`Control ${input.control_id} not found for feature ${featureId}.`);
    }

    const existingAttachments = Array.isArray(control.evidence_attachments)
      ? control.evidence_attachments
      : [];

    if (
      input.verification_status === "VERIFIED" &&
      control.is_mandatory_launch_blocker &&
      existingAttachments.length === 0
    ) {
      throw new AuthTenancyError(
        "MANDATORY_GATE_BLOCKER_UNRESOLVED",
        `Cannot mark mandatory control ${control.control_code} as VERIFIED without at least one attached test/validation evidence artifact.`,
        409
      );
    }

    const { data: updated, error: updErr } = await supabase
      .from("feature_controls")
      .update({
        verification_status: input.verification_status,
        verified_by: ctx.userId,
        verified_role: ctx.role,
        verified_at: new Date().toISOString(),
        verification_notes: input.verification_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", control.id)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new Error(`Failed to verify control: ${updErr?.message || "Unknown error"}`);
    }

    await this.syncReadinessScore(ctx.tenantId, featureId);

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "FEATURE_CONTROL",
      entityId: control.id,
      action: "CONTROL_VERIFICATION_DECIDED",
      eventData: {
        actorRole: ctx.role,
        previous_status: control.verification_status,
        feature_id: featureId,
        control_code: control.control_code,
        verification_status: input.verification_status,
        verification_notes: input.verification_notes,
      },
    });

    return updated as FeatureControlRecord;
  }

  /**
   * Interactive Launch Readiness Gate Workflow:
   * - `SUBMIT_FOR_GATE`: 1st/2nd Line submits feature into LAUNCH_GATE (`PENDING_GATE`).
   * - `RECORD_DECISION`: Strictly 2nd Line (`feature.gate.decide`) with:
   *    1) Three Lines of Defence independence check (3rd Line blocked)
   *    2) Anti-Self-Approval Dual Control (author cannot approve their own feature)
   *    3) Non-overridable Mandatory Blocker Lock: `APPROVED` is HARD-BLOCKED if any mandatory
   *       readiness item or launch-blocker control is unverified or failed!
   *    4) `CONDITIONALLY_APPROVED` requires at least 1 explicit tracked condition with owner & due date
   *       and still blocks if any mandatory control is explicitly in `FAILED` state.
   *    5) Persists SHA-256 hashed immutable `feature_readiness_gates` record + hash-chained audit event.
   */
  public async handleLaunchGate(
    ctx: TenantContext,
    featureId: string,
    rawInput: import("zod").input<typeof submitGateActionSchema>
  ): Promise<FeatureDossier> {
    const input = submitGateActionSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const dossier = await this.getFeatureDossier(ctx.tenantId, featureId);
    const { feature, controls, gates, readiness } = dossier;

    if (input.action === "SUBMIT_FOR_GATE") {
      assertThirdLineIndependence(ctx, "feature.gate.submit");
      requirePermission(ctx, "feature.gate.submit");

      await supabase
        .from("product_features")
        .update({
          lifecycle_stage: "LAUNCH_GATE",
          gate_status: "PENDING_GATE",
          readiness_score_numerator: readiness.numerator,
          readiness_score_denominator: readiness.denominator,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", ctx.tenantId)
        .eq("id", featureId);

      await auditService.appendEvent({
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        actorType: "USER",
        entityType: "PRODUCT_FEATURE",
        entityId: featureId,
        action: "FEATURE_SUBMITTED_FOR_LAUNCH_GATE",
        eventData: {
          actorRole: ctx.role,
          readiness_score: `${readiness.numerator}/${readiness.denominator}`,
          mandatory_blockers_count: readiness.mandatory_blockers.length,
          submission_notes: input.submission_notes || null,
        },
      });

      return this.getFeatureDossier(ctx.tenantId, featureId);
    }

    // RECORD_DECISION — Binding 2nd-Line Launch Gate Authority
    const enforceDualControl =
      process.env.ENFORCE_DUAL_CONTROL_APPROVAL !== "false" &&
      !input.allow_self_approval_override;

    assertCanDecideFeatureGate(ctx, feature.created_by, enforceDualControl);

    const failedMandatoryControls = controls.filter(
      (c) =>
        c.is_mandatory_launch_blocker &&
        (c.verification_status === "FAILED" || c.verification_status === "REASSESSMENT_REQUIRED")
    );

    if (input.decision === "APPROVED" && !readiness.is_ready_for_unconditional_approval) {
      throw new AuthTenancyError(
        "MANDATORY_GATE_BLOCKER_UNRESOLVED",
        `Unconditional Launch Approval blocked by ${readiness.mandatory_blockers.length} unresolved mandatory readiness requirement(s): ${readiness.mandatory_blockers.slice(0, 3).join(" | ")}`,
        409
      );
    }

    if (input.decision === "CONDITIONALLY_APPROVED") {
      if (failedMandatoryControls.length > 0) {
        throw new AuthTenancyError(
          "MANDATORY_GATE_BLOCKER_UNRESOLVED",
          `Conditional Approval blocked: ${failedMandatoryControls.map((c) => c.control_code).join(", ")} are in FAILED/REASSESSMENT_REQUIRED state and cannot be overridden.`,
          409
        );
      }
      if (input.conditions.length === 0) {
        throw new AuthTenancyError(
          "MANDATORY_GATE_BLOCKER_UNRESOLVED",
          "Conditional Approval requires at least one explicit remediation condition with an accountable role and due date.",
          400
        );
      }
    }

    const nextGateNumber = gates.length + 1;
    const roleMeta = getRoleMetadata(ctx.role);
    const conditions: GateConditionItem[] = input.conditions.map((c) => ({
      id: crypto.randomUUID(),
      description: c.description,
      owner_role: c.owner_role,
      due_date: c.due_date,
      status: "OPEN",
    }));

    const signoff: GateSignoffRecord = {
      user_id: ctx.userId,
      role: ctx.role,
      defence_line: roleMeta.defenceLine,
      decision: input.decision,
      rationale: input.decision_rationale,
      signed_at: new Date().toISOString(),
    };

    const postDecisionReadiness = featureStructuringEngine.evaluateReadinessChecklist({
      feature,
      controls,
      hasSecondLineSignoff:
        input.decision === "APPROVED" || input.decision === "CONDITIONALLY_APPROVED",
    });

    const snapshotPayload = JSON.stringify({
      tenant_id: ctx.tenantId,
      feature_id: featureId,
      gate_number: nextGateNumber,
      decision: input.decision,
      decided_by: ctx.userId,
      decided_role: ctx.role,
      readiness: `${postDecisionReadiness.numerator}/${postDecisionReadiness.denominator}`,
      conditions,
      controls_snapshot: controls.map((c) => ({
        code: c.control_code,
        status: c.verification_status,
        evidence_hashes: (c.evidence_attachments || []).map((e) => e.sha256_hash),
      })),
    });
    const snapshotHash = this.sha256(snapshotPayload);

    const { error: gateInsertErr } = await supabase
      .from("feature_readiness_gates")
      .insert({
        tenant_id: ctx.tenantId,
        feature_id: featureId,
        gate_number: nextGateNumber,
        decision: input.decision,
        readiness_score_numerator: postDecisionReadiness.numerator,
        readiness_score_denominator: postDecisionReadiness.denominator,
        checklist_snapshot: postDecisionReadiness.checklist,
        conditions,
        signoffs: [signoff],
        decided_by: ctx.userId,
        decided_role: ctx.role,
        decision_rationale: input.decision_rationale,
        snapshot_hash_sha256: snapshotHash,
      });

    if (gateInsertErr) {
      throw new Error(`Failed to persist Launch Gate decision: ${gateInsertErr.message}`);
    }

    const isLaunched =
      input.decision === "APPROVED" || input.decision === "CONDITIONALLY_APPROVED";
    const nowIso = new Date().toISOString();
    // Default Post-Implementation Review due 90 days post-launch
    const nextPirDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("product_features")
      .update({
        gate_status: input.decision,
        lifecycle_stage: isLaunched ? "POST_LAUNCH_MONITORING" : "VALIDATION_TESTING",
        readiness_score_numerator: postDecisionReadiness.numerator,
        readiness_score_denominator: postDecisionReadiness.denominator,
        launched_at: isLaunched ? feature.launched_at || nowIso : feature.launched_at,
        next_pir_due_at: isLaunched ? feature.next_pir_due_at || nextPirDue : feature.next_pir_due_at,
        updated_at: nowIso,
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", featureId);

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "FEATURE_READINESS_GATE",
      entityId: featureId,
      action: `LAUNCH_GATE_${input.decision}`,
      eventData: {
        actorRole: ctx.role,
        previous: { gate_status: feature.gate_status, lifecycle_stage: feature.lifecycle_stage },
        gate_number: nextGateNumber,
        decision: input.decision,
        readiness: `${postDecisionReadiness.numerator}/${postDecisionReadiness.denominator}`,
        conditions_count: conditions.length,
        snapshot_hash_sha256: snapshotHash,
      },
    });

    return this.getFeatureDossier(ctx.tenantId, featureId);
  }

  /**
   * Records a Post-Implementation Review (PIR), Material Change Reassessment, Incident Escalation,
   * Suspension/Retirement Review, or Independent 3rd-Line Internal Audit Assurance Note.
   */
  public async createPostLaunchReview(
    ctx: TenantContext,
    featureId: string,
    rawInput: import("zod").input<typeof createPostLaunchReviewSchema>
  ): Promise<{ review: FeaturePostLaunchReviewRecord; dossier: FeatureDossier }> {
    const input = createPostLaunchReviewSchema.parse(rawInput);

    // Permission check by review type (enforcing 3LoD boundaries)
    if (input.review_type === "INTERNAL_AUDIT_ASSURANCE") {
      requirePermission(ctx, "audit.assurance_note");
    } else if (
      input.review_type === "MATERIAL_CHANGE_REASSESSMENT" ||
      input.review_type === "SUSPENSION_REVIEW" ||
      input.review_type === "RETIREMENT_REVIEW"
    ) {
      assertThirdLineIndependence(ctx, "feature.change.assess");
      requirePermission(ctx, "feature.change.assess");
    } else {
      assertThirdLineIndependence(ctx, "feature.pir.manage");
      requirePermission(ctx, "feature.pir.manage");
    }

    const supabase = createAdminSupabaseClient();
    const { data: feature, error: featErr } = await supabase
      .from("product_features")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", featureId)
      .single();

    if (featErr || !feature) {
      throw new Error(`Product feature ${featureId} not found.`);
    }

    const hasOpenRemediations = input.remediation_actions.some((a) => a.status === "OPEN");
    const reviewStatus =
      input.requires_reapproval || hasOpenRemediations
        ? "REMEDIATION_REQUIRED"
        : input.conclusion_notes
          ? "CLOSED"
          : "OPEN";

    const { data: createdReview, error: revErr } = await supabase
      .from("feature_post_launch_reviews")
      .insert({
        tenant_id: ctx.tenantId,
        feature_id: featureId,
        review_type: input.review_type,
        status: reviewStatus,
        title: input.title,
        trigger_summary: input.trigger_summary,
        monitoring_metrics: input.monitoring_metrics,
        change_impact_summary: input.change_impact_summary || null,
        requires_reapproval: input.requires_reapproval,
        remediation_actions: input.remediation_actions,
        conducted_by: ctx.userId,
        conducted_role: ctx.role,
        concluded_at: reviewStatus === "CLOSED" ? new Date().toISOString() : null,
        conclusion_notes: input.conclusion_notes || null,
      })
      .select("*")
      .single();

    if (revErr || !createdReview) {
      throw new Error(`Failed to record post-launch review: ${revErr?.message || "Unknown error"}`);
    }

    // Lifecycle transitions triggered by Material Change Reassessment, Suspension, or Retirement
    // (Internal Audit assurance notes NEVER mutate operational feature state!)
    if (input.review_type !== "INTERNAL_AUDIT_ASSURANCE") {
      const featurePatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (input.retire_feature || input.review_type === "RETIREMENT_REVIEW") {
        featurePatch.lifecycle_stage = "RETIRED";
      } else if (input.suspend_feature_immediately || input.review_type === "SUSPENSION_REVIEW") {
        featurePatch.lifecycle_stage = "SUSPENDED";
      } else if (input.requires_reapproval) {
        featurePatch.lifecycle_stage = "MODIFICATION_OR_RETIREMENT";
        featurePatch.gate_status = "PENDING_GATE";
      } else if (input.review_type === "POST_IMPLEMENTATION_REVIEW" && reviewStatus === "CLOSED") {
        // Schedule next annual PIR
        featurePatch.next_pir_due_at = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      if (Object.keys(featurePatch).length > 1) {
        await supabase
          .from("product_features")
          .update(featurePatch)
          .eq("tenant_id", ctx.tenantId)
          .eq("id", featureId);
      }
    }

    await auditService.appendEvent({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorType: "USER",
      entityType: "FEATURE_POST_LAUNCH_REVIEW",
      entityId: createdReview.id,
      action: `FEATURE_${input.review_type}_RECORDED`,
      eventData: {
        actorRole: ctx.role,
        feature_id: featureId,
        review_type: input.review_type,
        status: reviewStatus,
        requires_reapproval: input.requires_reapproval,
        suspend_feature_immediately: input.suspend_feature_immediately,
        retire_feature: input.retire_feature,
      },
    });

    const dossier = await this.getFeatureDossier(ctx.tenantId, featureId);
    return {
      review: createdReview as FeaturePostLaunchReviewRecord,
      dossier,
    };
  }

  private async syncReadinessScore(tenantId: string, featureId: string): Promise<void> {
    try {
      const dossier = await this.getFeatureDossier(tenantId, featureId);
      const supabase = createAdminSupabaseClient();
      await supabase
        .from("product_features")
        .update({
          readiness_score_numerator: dossier.readiness.numerator,
          readiness_score_denominator: dossier.readiness.denominator,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("id", featureId);
    } catch (err) {
      logger.warn("syncReadinessScore failed softly", {
        tenantId,
        featureId,
        error: (err as Error).message,
      });
    }
  }
}

export const featureGovernanceService = new FeatureGovernanceService();
