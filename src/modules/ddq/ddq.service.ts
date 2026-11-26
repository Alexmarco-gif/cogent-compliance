/**
 * Cogent Compliance Operations - End-to-End DDQ Engagement Orchestration Service (Pillar 3)
 * Coordinates the full CCO DDQ lifecycle:
 *   1. Intake & Registration (.xlsx / .docx / .pdf / .csv / text up to 500 questions)
 *   2. Async Inngest batch auto-matching (Q&A Library) + per-question Evidence Vault drafting
 *   3. Departmental responsibility matrix & bulk assignment (10 fintech departments)
 *   4. Evidence Vault linking with automatic Annexure A–Z labelling
 *   5. CCO validation + one-click promotion to Approved Q&A Library
 *   6. Multi-executive sign-off workflow (CEO, CCO/MLRO, CFO, CISO, GC) with cryptographic SHA-256 snapshot
 *   7. Post-submission bank follow-up register & decision tracking
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { inngest } from "@/modules/jobs/inngest.client";
import { enrichEvidenceRecord } from "@/modules/evidence/evidence.service";
import { qaLibraryService } from "@/modules/ddq/qa-library.service";
import {
  getDefaultDepartmentForDomain,
  parseDdqFile,
  parseTextDdq,
  parseWorkProductDdqMarkdown,
  type ParsedDdqResult,
} from "@/modules/ddq/ddq-parser.service";
import { ddqDraftingService } from "@/modules/ddq/ddq-drafting.service";
import { computeDdqSnapshotHash, type DdqExportContext } from "@/modules/ddq/ddq-export.service";
import {
  bulkAssignQuestionsSchema,
  createDdqEngagementSchema,
  createDdqFollowupSchema,
  promoteWorkProductToDdqSchema,
  recordDdqSignoffSchema,
  updateDdqEngagementSchema,
  updateDdqFollowupSchema,
  updateDdqQuestionSchema,
  type BulkAssignQuestionsInput,
  type ComplianceDepartment,
  type CreateDdqEngagementInput,
  type CreateDdqFollowupInput,
  type DdqEngagementRecord,
  type DdqFollowupRecord,
  type DdqQuestionEvidenceLinkRecord,
  type DdqQuestionRecord,
  type DdqRequesterType,
  type DdqSignoffRecord,
  type DdqSignoffRole,
  type EvidenceItemRecord,
  type PromoteWorkProductToDdqInput,
  type RecordDdqSignoffInput,
  type UpdateDdqEngagementInput,
  type UpdateDdqQuestionInput,
} from "@/contracts/ddq.contracts";

export function indexToAnnexureLabel(indexZeroBased: number): string {
  // 0 -> Annexure A, 25 -> Annexure Z, 26 -> Annexure AA
  let n = indexZeroBased;
  let letters = "";
  while (n >= 0) {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return `Annexure ${letters}`;
}

export interface DdqDepartmentSummary {
  department: ComplianceDepartment;
  total: number;
  answered: number;
  validated: number;
  needs_evidence: number;
}

export interface DdqDetailPayload {
  engagement: DdqEngagementRecord;
  questions: DdqQuestionRecord[];
  annexures: Array<{
    annexure_label: string;
    evidence_item: EvidenceItemRecord;
    question_codes: string[];
  }>;
  signoffs: DdqSignoffRecord[];
  followups: DdqFollowupRecord[];
  department_matrix: DdqDepartmentSummary[];
  readiness: {
    snapshot_sha256: string;
    percent_answered: number;
    percent_validated: number;
    open_evidence_gaps: number;
    expired_annexures_count: number;
    pending_signoffs_count: number;
    ready_for_submission: boolean;
    blockers: string[];
  };
}

export class DdqService {
  /**
   * Registers a new DDQ engagement, parses uploaded file (.xlsx/.docx/.pdf/.csv) or pasted text
   * into individual ddq_questions rows, initializes default executive sign-off gates, and
   * either drafts immediately (for <= 25 questions) or queues durable Inngest batch processing.
   */
  public async createEngagement(
    tenantId: string,
    userId: string,
    orgName: string,
    rawInput: CreateDdqEngagementInput,
    file?: {
      buffer: Buffer;
      fileName: string;
      mimeType: string;
    }
  ): Promise<{ engagement: DdqEngagementRecord; parsed_count: number; queued_async: boolean }> {
    const input = createDdqEngagementSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();
    const ddqId = crypto.randomUUID();

    let storageKey: string | null = null;
    let sourceSha256: string | null = null;
    let parsed: ParsedDdqResult;

    if (file && file.buffer.length > 0) {
      sourceSha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
      const sanitized = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      storageKey = `tenants/${tenantId}/ddqs/${ddqId}/${sanitized}`;

      try {
        await r2StorageService.putObjectBuffer(storageKey, file.buffer, file.mimeType);
      } catch (err) {
        logger.warn("R2 DDQ source upload failed softly; continuing with parsed rows", {
          ddqId,
          error: (err as Error).message,
        });
      }

      parsed = await parseDdqFile(file.buffer, file.fileName, file.mimeType);
    } else if (input.raw_text && input.raw_text.trim().length > 0) {
      sourceSha256 = crypto.createHash("sha256").update(input.raw_text, "utf8").digest("hex");
      parsed = parseTextDdq(input.raw_text, "TEXT");
    } else {
      parsed = { source_format: "TEXT", questions: [], source_structure: { total_detected: 0 } };
    }

    const totalQuestions = parsed.questions.length;
    const shouldQueueAsync = Boolean(input.auto_process !== false && totalQuestions > 20);

    const { data: engagement, error: engErr } = await supabase
      .from("ddq_engagements")
      .insert({
        id: ddqId,
        tenant_id: tenantId,
        title: input.title,
        requesting_institution: input.requesting_institution,
        requester_type: input.requester_type,
        reference_code: input.reference_code || null,
        contact_name: input.contact_name || null,
        contact_email: input.contact_email || null,
        status: shouldQueueAsync ? "INGESTING" : totalQuestions > 0 ? "IN_PROGRESS" : "DRAFT",
        due_date: input.due_date ?? null,
        source_file_name: file?.fileName ?? null,
        source_mime_type: file?.mimeType ?? null,
        source_storage_key: storageKey,
        source_sha256: sourceSha256,
        source_format: parsed.source_format,
        source_structure: parsed.source_structure,
        total_questions: totalQuestions,
        evidence_gap_count: totalQuestions,
        created_by: userId,
        cco_owner_id: userId,
      })
      .select("*")
      .single();

    if (engErr || !engagement) {
      throw new Error(`Failed to create DDQ engagement: ${engErr?.message || "Unknown error"}`);
    }

    // Persist parsed questions in batches of 100
    if (parsed.questions.length > 0) {
      for (let i = 0; i < parsed.questions.length; i += 100) {
        const slice = parsed.questions.slice(i, i + 100);
        const rows = slice.map((q) => ({
          tenant_id: tenantId,
          ddq_id: ddqId,
          question_index: q.question_index,
          question_code: q.question_code,
          section_name: q.section_name,
          question_text: q.question_text,
          domain: q.domain,
          assigned_department: q.assigned_department,
          source_sheet_name: q.source_sheet_name,
          source_row_number: q.source_row_number,
          source_question_col: q.source_question_col,
          source_answer_col: q.source_answer_col,
          source_evidence_col: q.source_evidence_col,
          status: q.existing_answer ? "IN_REVIEW" : "UNASSIGNED",
          answer_source: q.existing_answer ? "MANUAL" : "NONE",
          draft_answer: q.existing_answer || null,
          grounding_classification: "MISSING_EVIDENCE",
          evidence_gap_flag: true,
        }));

        const { error: qErr } = await supabase.from("ddq_questions").insert(rows);
        if (qErr) {
          throw new Error(`Failed to persist DDQ questions batch: ${qErr.message}`);
        }
      }
    }

    // Initialize default Executive Sign-Off gates (CCO/MLRO, CEO, CISO, CFO)
    const signoffRoles: DdqSignoffRole[] =
      input.required_signoff_roles && input.required_signoff_roles.length > 0
        ? input.required_signoff_roles
        : ["CCO_MLRO", "CEO", "CISO", "CFO"];

    await supabase.from("ddq_signoffs").insert(
      signoffRoles.map((role) => ({
        tenant_id: tenantId,
        ddq_id: ddqId,
        signoff_role: role,
        status: "PENDING",
      }))
    );

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "DDQ_ENGAGEMENT_CREATED",
      entityType: "DDQ_ENGAGEMENT",
      entityId: ddqId,
      eventData: {
        title: input.title,
        requestingInstitution: input.requesting_institution,
        sourceFormat: parsed.source_format,
        totalQuestions,
        queuedAsync: shouldQueueAsync,
      },
    });

    // Auto-match & draft immediately for small DDQs, or queue Inngest durable worker for 21–500 questions
    if (input.auto_process !== false && totalQuestions > 0) {
      if (shouldQueueAsync) {
        try {
          await inngest.send({
            name: "marketing-shield/ddq.process",
            data: {
              ddqId,
              tenantId,
              orgName,
              triggeredByUserId: userId,
            },
          });
        } catch (err) {
          logger.warn("Inngest dispatch unavailable; running first batch synchronously", {
            ddqId,
            error: (err as Error).message,
          });
          await this.processQuestionsBatch(tenantId, userId, orgName, ddqId, {
            limit: 25,
            useAiSynthesis: true,
          });
        }
      } else {
        await this.processQuestionsBatch(tenantId, userId, orgName, ddqId, {
          limit: 25,
          useAiSynthesis: true,
        });
      }
    }

    const refreshed = await this.recomputeEngagementCounters(tenantId, ddqId);
    return {
      engagement: refreshed || (engagement as DdqEngagementRecord),
      parsed_count: totalQuestions,
      queued_async: shouldQueueAsync,
    };
  }

  /**
   * Runs Q&A Library auto-matching + per-question Evidence Vault grounded drafting across
   * a batch of unprocessed (or specifically selected) DDQ questions.
   */
  public async processQuestionsBatch(
    tenantId: string,
    userId: string,
    orgName: string,
    ddqId: string,
    options?: {
      questionIds?: string[];
      offset?: number;
      limit?: number;
      forceRedraft?: boolean;
      useAiSynthesis?: boolean;
    }
  ): Promise<{
    processed: number;
    auto_matched_qa: number;
    evidence_grounded: number;
    gaps_flagged: number;
  }> {
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(options?.limit ?? 20, 50);

    let query = supabase
      .from("ddq_questions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId)
      .order("question_index", { ascending: true });

    if (options?.questionIds && options.questionIds.length > 0) {
      query = query.in("id", options.questionIds);
    } else if (!options?.forceRedraft) {
      query = query.in("answer_source", ["NONE"]);
    }

    if (options?.offset != null) {
      query = query.range(options.offset, options.offset + limit - 1);
    } else {
      query = query.limit(limit);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`Failed loading DDQ questions for processing: ${error.message}`);
    }

    const questions = (rows || []) as DdqQuestionRecord[];
    let processed = 0;
    let autoMatched = 0;
    let evidenceGrounded = 0;
    let gapsFlagged = 0;

    for (const q of questions) {
      const outcome = await ddqDraftingService.draftSingleQuestion(tenantId, orgName, q, {
        useAiSynthesis: options?.useAiSynthesis,
      });

      const { error: updErr } = await supabase
        .from("ddq_questions")
        .update({
          answer_source: outcome.answer_source,
          status: outcome.status,
          matched_qa_id: outcome.matched_qa_id,
          match_confidence: outcome.match_confidence,
          draft_answer: outcome.draft_answer,
          grounding_classification: outcome.grounding_classification,
          evidence_gap_flag: outcome.evidence_gap_flag,
          evidence_gap_reason: outcome.evidence_gap_reason,
          statutory_citations: outcome.statutory_citations,
          ai_confidence: outcome.ai_confidence,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("id", q.id);

      if (!updErr) {
        processed += 1;
        if (
          outcome.answer_source === "QA_LIBRARY_EXACT" ||
          outcome.answer_source === "QA_LIBRARY_STALE"
        ) {
          autoMatched += 1;
        } else if (outcome.answer_source === "AI_EVIDENCE_GROUNDED") {
          evidenceGrounded += 1;
        }
        if (outcome.evidence_gap_flag) {
          gapsFlagged += 1;
        }

        if (outcome.linked_evidence_ids.length > 0) {
          await this.linkEvidenceToQuestion(
            tenantId,
            userId,
            ddqId,
            q.id,
            outcome.linked_evidence_ids,
            "Auto-linked during DDQ grounding"
          );
        }
      }
    }

    await this.recomputeEngagementCounters(tenantId, ddqId);

    return {
      processed,
      auto_matched_qa: autoMatched,
      evidence_grounded: evidenceGrounded,
      gaps_flagged: gapsFlagged,
    };
  }

  /**
   * Lists all DDQ engagements in the tenant's DDQ Register along with KPI summary stats.
   */
  public async listEngagements(
    tenantId: string,
    filters?: { status?: string; search?: string }
  ): Promise<{
    items: DdqEngagementRecord[];
    summary: {
      active_ddqs: number;
      total_questions: number;
      auto_matched_total: number;
      open_gaps_total: number;
      ready_for_signoff: number;
    };
  }> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("ddq_engagements")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("status", "ARCHIVED")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Failed to list DDQ engagements: ${error.message}`);
    }

    let items = (data || []) as DdqEngagementRecord[];

    const activeStatuses = new Set([
      "DRAFT",
      "INGESTING",
      "IN_PROGRESS",
      "UNDER_CCO_REVIEW",
      "PENDING_EXECUTIVE_SIGNOFF",
      "FOLLOW_UP",
    ]);

    const summary = {
      active_ddqs: items.filter((d) => activeStatuses.has(d.status)).length,
      total_questions: items.reduce((a, d) => a + Number(d.total_questions || 0), 0),
      auto_matched_total: items.reduce((a, d) => a + Number(d.auto_matched_count || 0), 0),
      open_gaps_total: items.reduce((a, d) => a + Number(d.evidence_gap_count || 0), 0),
      ready_for_signoff: items.filter(
        (d) =>
          d.status === "PENDING_EXECUTIVE_SIGNOFF" ||
          d.status === "APPROVED" ||
          (d.total_questions > 0 && d.validated_count >= d.total_questions)
      ).length,
    };

    if (filters?.status) {
      items = items.filter((d) => d.status === filters.status);
    }
    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.requesting_institution.toLowerCase().includes(q) ||
          (d.reference_code || "").toLowerCase().includes(q)
      );
    }

    return { items, summary };
  }

  /**
   * Loads the complete DDQ Operations Workbench state: engagement, all questions, linked evidence,
   * Annexure A–Z schedule, executive sign-offs, follow-ups, responsibility matrix, and readiness blockers.
   */
  public async getEngagementDetail(
    tenantId: string,
    ddqId: string
  ): Promise<DdqDetailPayload | null> {
    const supabase = createAdminSupabaseClient();

    const [engRes, qRes, linkRes, signRes, followRes] = await Promise.all([
      supabase
        .from("ddq_engagements")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", ddqId)
        .maybeSingle(),
      supabase
        .from("ddq_questions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ddq_id", ddqId)
        .order("question_index", { ascending: true }),
      supabase
        .from("ddq_question_evidence_links")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ddq_id", ddqId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ddq_signoffs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ddq_id", ddqId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ddq_followups")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ddq_id", ddqId)
        .order("round_number", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (engRes.error || !engRes.data) return null;

    const engagement = engRes.data as DdqEngagementRecord;
    const rawQuestions = (qRes.data || []) as DdqQuestionRecord[];
    const rawLinks = (linkRes.data || []) as DdqQuestionEvidenceLinkRecord[];
    const signoffs = (signRes.data || []) as DdqSignoffRecord[];
    const followups = (followRes.data || []) as DdqFollowupRecord[];

    // Hydrate linked Evidence Vault items
    const evidenceIds = Array.from(new Set(rawLinks.map((l) => l.evidence_item_id)));
    const evidenceMap = new Map<string, EvidenceItemRecord>();
    if (evidenceIds.length > 0) {
      const { data: evRows } = await supabase
        .from("compliance_evidence_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", evidenceIds);

      for (const row of (evRows || []) as Record<string, unknown>[]) {
        const enriched = enrichEvidenceRecord(row);
        evidenceMap.set(enriched.id, enriched);
      }
    }

    // Group links by question & build consolidated Annexure A–Z schedule
    const linksByQuestion = new Map<string, DdqQuestionEvidenceLinkRecord[]>();
    const annexureMap = new Map<
      string,
      { annexure_label: string; evidence_item: EvidenceItemRecord; question_codes: Set<string> }
    >();
    const qCodeById = new Map(rawQuestions.map((q) => [q.id, q.question_code]));

    for (const link of rawLinks) {
      const ev = evidenceMap.get(link.evidence_item_id);
      const hydratedLink: DdqQuestionEvidenceLinkRecord = {
        ...link,
        evidence_item: ev,
      };
      const arr = linksByQuestion.get(link.question_id) || [];
      arr.push(hydratedLink);
      linksByQuestion.set(link.question_id, arr);

      if (ev) {
        const existing = annexureMap.get(ev.id);
        const qCode = qCodeById.get(link.question_id) || "";
        if (existing) {
          if (qCode) existing.question_codes.add(qCode);
        } else {
          annexureMap.set(ev.id, {
            annexure_label: link.annexure_label,
            evidence_item: ev,
            question_codes: new Set(qCode ? [qCode] : []),
          });
        }
      }
    }

    const questions: DdqQuestionRecord[] = rawQuestions.map((q) => ({
      ...q,
      statutory_citations: Array.isArray(q.statutory_citations) ? q.statutory_citations : [],
      evidence_links: linksByQuestion.get(q.id) || [],
    }));

    const annexures = Array.from(annexureMap.values())
      .map((a) => ({
        annexure_label: a.annexure_label,
        evidence_item: a.evidence_item,
        question_codes: Array.from(a.question_codes),
      }))
      .sort((a, b) => a.annexure_label.localeCompare(b.annexure_label));

    // Departmental Responsibility Matrix
    const deptMap = new Map<ComplianceDepartment, DdqDepartmentSummary>();
    for (const q of questions) {
      const cur = deptMap.get(q.assigned_department) || {
        department: q.assigned_department,
        total: 0,
        answered: 0,
        validated: 0,
        needs_evidence: 0,
      };
      cur.total += 1;
      if ((q.final_answer || q.draft_answer || "").trim().length > 0) cur.answered += 1;
      if (q.status === "CCO_VALIDATED" || q.status === "APPROVED") cur.validated += 1;
      if (q.evidence_gap_flag || q.status === "NEEDS_EVIDENCE") cur.needs_evidence += 1;
      deptMap.set(q.assigned_department, cur);
    }

    const total = questions.length;
    const answeredCount = questions.filter((q) => (q.final_answer || q.draft_answer || "").trim().length > 0).length;
    const validatedCount = questions.filter((q) => q.status === "CCO_VALIDATED" || q.status === "APPROVED").length;
    const openGaps = questions.filter((q) => q.evidence_gap_flag).length;
    const expiredAnnexures = annexures.filter((a) => a.evidence_item.computed_health === "EXPIRED").length;
    const pendingSignoffs = signoffs.filter((s) => s.status === "PENDING").length;
    const rejectedSignoffs = signoffs.filter((s) => s.status === "REJECTED").length;

    const blockers: string[] = [];
    if (total === 0) blockers.push("No questions loaded in this DDQ.");
    if (openGaps > 0) blockers.push(`${openGaps} question(s) still flagged with missing internal evidence.`);
    if (validatedCount < total) blockers.push(`${total - validatedCount} question(s) awaiting CCO validation.`);
    if (expiredAnnexures > 0) blockers.push(`${expiredAnnexures} attached Annexure document(s) are EXPIRED.`);
    if (pendingSignoffs > 0) blockers.push(`${pendingSignoffs} executive sign-off gate(s) still pending.`);
    if (rejectedSignoffs > 0) blockers.push(`${rejectedSignoffs} executive sign-off gate(s) rejected.`);

    return {
      engagement,
      questions,
      annexures,
      signoffs,
      followups,
      department_matrix: Array.from(deptMap.values()).sort((a, b) => b.total - a.total),
      readiness: {
        snapshot_sha256: computeDdqSnapshotHash(engagement.id, questions),
        percent_answered: total > 0 ? Math.round((answeredCount / total) * 100) : 0,
        percent_validated: total > 0 ? Math.round((validatedCount / total) * 100) : 0,
        open_evidence_gaps: openGaps,
        expired_annexures_count: expiredAnnexures,
        pending_signoffs_count: pendingSignoffs,
        ready_for_submission: blockers.length === 0 && total > 0,
        blockers,
      },
    };
  }

  /**
   * Builds export context for .xlsx and .zip generators.
   */
  public async getExportContext(
    tenantId: string,
    orgName: string,
    ddqId: string
  ): Promise<DdqExportContext | null> {
    const detail = await this.getEngagementDetail(tenantId, ddqId);
    if (!detail) return null;
    return {
      engagement: detail.engagement,
      orgName,
      questions: detail.questions,
      annexures: detail.annexures,
      signoffs: detail.signoffs,
    };
  }

  /**
   * Updates engagement metadata or lifecycle status.
   */
  public async updateEngagement(
    tenantId: string,
    userId: string,
    ddqId: string,
    rawInput: UpdateDdqEngagementInput
  ): Promise<DdqEngagementRecord> {
    const input = updateDdqEngagementSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.requesting_institution !== undefined) patch.requesting_institution = input.requesting_institution;
    if (input.requester_type !== undefined) patch.requester_type = input.requester_type;
    if (input.reference_code !== undefined) patch.reference_code = input.reference_code;
    if (input.contact_name !== undefined) patch.contact_name = input.contact_name;
    if (input.contact_email !== undefined) patch.contact_email = input.contact_email || null;
    if (input.due_date !== undefined) patch.due_date = input.due_date;
    if (input.decision_notes !== undefined) patch.decision_notes = input.decision_notes;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "SUBMITTED") {
        patch.submitted_at = new Date().toISOString();
      }
    }

    const { data: updated, error } = await supabase
      .from("ddq_engagements")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", ddqId)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update DDQ engagement: ${error?.message || "Not found"}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "DDQ_ENGAGEMENT_UPDATED",
      entityType: "DDQ_ENGAGEMENT",
      entityId: ddqId,
      eventData: { updatedFields: Object.keys(patch), status: updated.status },
    });

    return updated as DdqEngagementRecord;
  }

  /**
   * Updates an individual DDQ question (answer editing, departmental assignment,
   * Evidence Vault linking, CCO validation, and optional promotion to Approved Q&A Library).
   */
  public async updateQuestion(
    tenantId: string,
    userId: string,
    userName: string | null,
    ddqId: string,
    questionId: string,
    rawInput: UpdateDdqQuestionInput,
    canValidateAsCco: boolean
  ): Promise<{ question: DdqQuestionRecord; promoted_qa_id?: string }> {
    const input = updateDdqQuestionSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("ddq_questions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId)
      .eq("id", questionId)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error("DDQ question not found");
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.domain !== undefined) patch.domain = input.domain;
    if (input.assigned_department !== undefined) patch.assigned_department = input.assigned_department;
    if (input.assigned_user_id !== undefined) patch.assigned_user_id = input.assigned_user_id;
    if (input.assigned_user_name !== undefined) patch.assigned_user_name = input.assigned_user_name;
    if (input.assigned_email !== undefined) patch.assigned_email = input.assigned_email || null;
    if (input.due_date !== undefined) patch.due_date = input.due_date;
    if (input.draft_answer !== undefined) patch.draft_answer = input.draft_answer;
    if (input.final_answer !== undefined) {
      patch.final_answer = input.final_answer;
      if (input.final_answer && input.final_answer.trim().length > 0) {
        patch.answer_source = "MANUAL";
      }
    }
    if (input.grounding_classification !== undefined) {
      patch.grounding_classification = input.grounding_classification;
    }
    if (input.evidence_gap_flag !== undefined) patch.evidence_gap_flag = input.evidence_gap_flag;
    if (input.evidence_gap_reason !== undefined) patch.evidence_gap_reason = input.evidence_gap_reason;
    if (input.reviewer_notes !== undefined) patch.reviewer_notes = input.reviewer_notes;

    if (input.status !== undefined) {
      if ((input.status === "CCO_VALIDATED" || input.status === "APPROVED") && !canValidateAsCco) {
        throw new Error("Only Legal Counsel or Chief Compliance Officer can validate DDQ responses.");
      }
      patch.status = input.status;
    }

    if (input.validate_as_cco) {
      if (!canValidateAsCco) {
        throw new Error("Only Legal Counsel or Chief Compliance Officer can validate DDQ responses.");
      }
      const effectiveAnswer = (
        input.final_answer ??
        existing.final_answer ??
        input.draft_answer ??
        existing.draft_answer ??
        ""
      ).trim();

      if (!effectiveAnswer) {
        throw new Error("Cannot CCO-validate an empty response.");
      }

      patch.final_answer = effectiveAnswer;
      patch.status = "CCO_VALIDATED";
      patch.evidence_gap_flag = false;
      patch.evidence_gap_reason = null;
      patch.validated_by = userId;
      patch.validated_at = new Date().toISOString();
    } else if (
      (input.assigned_user_name || input.assigned_email || input.assigned_user_id) &&
      existing.status === "UNASSIGNED" &&
      !input.status
    ) {
      patch.status = "ASSIGNED";
    }

    const { data: updated, error: updErr } = await supabase
      .from("ddq_questions")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", questionId)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new Error(`Failed to update DDQ question: ${updErr?.message || "Unknown error"}`);
    }

    if (input.link_evidence_ids && input.link_evidence_ids.length > 0) {
      await this.linkEvidenceToQuestion(tenantId, userId, ddqId, questionId, input.link_evidence_ids);
      // Clear missing-evidence flag if user explicitly linked evidence
      if (input.evidence_gap_flag === undefined && updated.evidence_gap_flag) {
        await supabase
          .from("ddq_questions")
          .update({
            evidence_gap_flag: false,
            evidence_gap_reason: null,
            grounding_classification: "VERIFIED_EVIDENCE",
          })
          .eq("tenant_id", tenantId)
          .eq("id", questionId);
        updated.evidence_gap_flag = false;
        updated.grounding_classification = "VERIFIED_EVIDENCE";
      }
    }

    if (input.unlink_evidence_ids && input.unlink_evidence_ids.length > 0) {
      await supabase
        .from("ddq_question_evidence_links")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("question_id", questionId)
        .in("evidence_item_id", input.unlink_evidence_ids);
    }

    let promotedQaId: string | undefined;
    if (input.promote_to_qa_library) {
      if (!canValidateAsCco) {
        throw new Error("Only Legal Counsel or CCO can publish approved answers to the Q&A Library.");
      }

      const finalAns = String(updated.final_answer || updated.draft_answer || "").trim();
      if (finalAns.length >= 10) {
        const { data: links } = await supabase
          .from("ddq_question_evidence_links")
          .select("evidence_item_id")
          .eq("tenant_id", tenantId)
          .eq("question_id", questionId);

        const linkedEvIds = ((links || []) as Array<{ evidence_item_id: string }>).map(
          (l) => l.evidence_item_id
        );

        const qaEntry = await qaLibraryService.createEntry(tenantId, userId, userName, {
          canonical_question: updated.question_text,
          approved_answer: finalAns,
          domain: updated.domain,
          owner_department: updated.assigned_department,
          linked_evidence_ids: linkedEvIds,
          statutory_citations: Array.isArray(updated.statutory_citations)
            ? updated.statutory_citations
            : [],
          source_ddq_id: ddqId,
          source_question_id: questionId,
        });
        promotedQaId = qaEntry.id;
      }
    }

    await this.recomputeEngagementCounters(tenantId, ddqId);

    return { question: updated as DdqQuestionRecord, promoted_qa_id: promotedQaId };
  }

  /**
   * Bulk assigns DDQ questions to a department / owner / due date, or auto-routes by domain.
   */
  public async bulkAssignQuestions(
    tenantId: string,
    userId: string,
    ddqId: string,
    rawInput: BulkAssignQuestionsInput
  ): Promise<{ updated_count: number }> {
    const input = bulkAssignQuestionsSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    if (input.auto_route_by_domain) {
      const { data: questions } = await supabase
        .from("ddq_questions")
        .select("id, domain")
        .eq("tenant_id", tenantId)
        .eq("ddq_id", ddqId);

      let count = 0;
      for (const q of (questions || []) as Array<{ id: string; domain: DdqQuestionRecord["domain"] }>) {
        const dept = getDefaultDepartmentForDomain(q.domain);
        const { error } = await supabase
          .from("ddq_questions")
          .update({
            assigned_department: dept,
            ...(input.due_date ? { due_date: input.due_date } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("id", q.id);
        if (!error) count += 1;
      }
      return { updated_count: count };
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.assigned_department) patch.assigned_department = input.assigned_department;
    if (input.assigned_user_id !== undefined) patch.assigned_user_id = input.assigned_user_id;
    if (input.assigned_user_name !== undefined) patch.assigned_user_name = input.assigned_user_name;
    if (input.assigned_email !== undefined) patch.assigned_email = input.assigned_email || null;
    if (input.due_date !== undefined) patch.due_date = input.due_date;

    let query = supabase
      .from("ddq_questions")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId);

    if (input.question_ids && input.question_ids.length > 0) {
      query = query.in("id", input.question_ids);
    } else if (input.filter_department) {
      query = query.eq("assigned_department", input.filter_department);
    } else if (input.filter_domain) {
      query = query.eq("domain", input.filter_domain);
    }

    const { data, error } = await query.select("id");
    if (error) {
      throw new Error(`Bulk assign failed: ${error.message}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "DDQ_QUESTIONS_BULK_ASSIGNED",
      entityType: "DDQ_ENGAGEMENT",
      entityId: ddqId,
      eventData: { updatedCount: (data || []).length, department: input.assigned_department },
    });

    return { updated_count: (data || []).length };
  }

  /**
   * Links one or more Central Evidence Vault items to a DDQ question and assigns consistent
   * Annexure A, B, C... labels across the engagement (reusing the same Annexure letter whenever
   * the same policy/certificate is cited by multiple questions!).
   */
  public async linkEvidenceToQuestion(
    tenantId: string,
    userId: string,
    ddqId: string,
    questionId: string,
    evidenceIds: string[],
    relevanceNote?: string
  ): Promise<void> {
    if (evidenceIds.length === 0) return;
    const supabase = createAdminSupabaseClient();

    const { data: existingLinks } = await supabase
      .from("ddq_question_evidence_links")
      .select("evidence_item_id, annexure_label")
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId);

    const labelByEvidence = new Map<string, string>();
    for (const row of (existingLinks || []) as Array<{
      evidence_item_id: string;
      annexure_label: string;
    }>) {
      if (!labelByEvidence.has(row.evidence_item_id)) {
        labelByEvidence.set(row.evidence_item_id, row.annexure_label);
      }
    }

    let nextIndex = labelByEvidence.size;
    const rowsToUpsert: Array<Record<string, unknown>> = [];

    for (const evId of Array.from(new Set(evidenceIds))) {
      let label = labelByEvidence.get(evId);
      if (!label) {
        label = indexToAnnexureLabel(nextIndex);
        labelByEvidence.set(evId, label);
        nextIndex += 1;
      }

      rowsToUpsert.push({
        tenant_id: tenantId,
        ddq_id: ddqId,
        question_id: questionId,
        evidence_item_id: evId,
        annexure_label: label,
        relevance_note: relevanceNote ?? null,
        linked_by: userId,
      });
    }

    const { error } = await supabase
      .from("ddq_question_evidence_links")
      .upsert(rowsToUpsert, {
        onConflict: "tenant_id,question_id,evidence_item_id",
        ignoreDuplicates: true,
      });

    if (error) {
      logger.warn("Failed linking evidence to DDQ question", {
        ddqId,
        questionId,
        error: error.message,
      });
    }
  }

  /**
   * Records or updates a real Executive Sign-Off decision bound to the cryptographic SHA-256
   * snapshot of all DDQ responses at approval time.
   */
  public async recordSignoff(
    tenantId: string,
    userId: string,
    userName: string | null,
    ddqId: string,
    rawInput: RecordDdqSignoffInput
  ): Promise<DdqSignoffRecord> {
    const input = recordDdqSignoffSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: questions } = await supabase
      .from("ddq_questions")
      .select("question_code, final_answer, draft_answer, status")
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId)
      .order("question_index", { ascending: true });

    const snapshotSha256 = computeDdqSnapshotHash(
      ddqId,
      (questions || []) as Array<
        Pick<DdqQuestionRecord, "question_code" | "final_answer" | "draft_answer" | "status">
      >
    );

    const isDecision = input.status === "APPROVED" || input.status === "REJECTED" || input.status === "WAIVED";

    const { data: signoff, error } = await supabase
      .from("ddq_signoffs")
      .upsert(
        {
          tenant_id: tenantId,
          ddq_id: ddqId,
          signoff_role: input.signoff_role,
          signer_user_id: isDecision ? userId : null,
          signer_name: input.signer_name || userName || null,
          signer_email: input.signer_email || null,
          status: input.status,
          attestation_statement:
            input.attestation_statement ||
            (input.status === "APPROVED"
              ? "I attest that the representations in my domain are accurate, grounded in verified institutional evidence, and compliant with BOFIA 2020 and applicable CBN/NDPA/NFIU directives."
              : null),
          comments: input.comments || null,
          snapshot_sha256: isDecision ? snapshotSha256 : null,
          decided_at: isDecision ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,ddq_id,signoff_role" }
      )
      .select("*")
      .single();

    if (error || !signoff) {
      throw new Error(`Failed recording executive sign-off: ${error?.message || "Unknown error"}`);
    }

    // Check if ALL sign-offs are now APPROVED or WAIVED -> advance engagement to APPROVED
    const { data: allSignoffs } = await supabase
      .from("ddq_signoffs")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId);

    if (
      allSignoffs &&
      allSignoffs.length > 0 &&
      allSignoffs.every((s) => s.status === "APPROVED" || s.status === "WAIVED")
    ) {
      await supabase
        .from("ddq_engagements")
        .update({ status: "APPROVED", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("id", ddqId);
    } else if (input.status === "REJECTED") {
      await supabase
        .from("ddq_engagements")
        .update({ status: "UNDER_CCO_REVIEW", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("id", ddqId);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: `DDQ_SIGNOFF_${input.status}`,
      entityType: "DDQ_ENGAGEMENT",
      entityId: ddqId,
      eventData: {
        signoffRole: input.signoff_role,
        status: input.status,
        snapshotSha256,
      },
    });

    return signoff as DdqSignoffRecord;
  }

  /**
   * Logs a post-submission bank clarification/follow-up question.
   */
  public async createFollowup(
    tenantId: string,
    userId: string,
    ddqId: string,
    rawInput: CreateDdqFollowupInput
  ): Promise<DdqFollowupRecord> {
    const input = createDdqFollowupSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("ddq_followups")
      .insert({
        tenant_id: tenantId,
        ddq_id: ddqId,
        question_id: input.question_id ?? null,
        round_number: input.round_number ?? 1,
        requester_query: input.requester_query,
        response_text: input.response_text ?? null,
        status: input.status ?? "OPEN",
        due_date: input.due_date ?? null,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed creating DDQ follow-up: ${error?.message || "Unknown error"}`);
    }

    await supabase
      .from("ddq_engagements")
      .update({ status: "FOLLOW_UP", updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", ddqId)
      .in("status", ["SUBMITTED", "APPROVED"]);

    return data as DdqFollowupRecord;
  }

  public async updateFollowup(
    tenantId: string,
    ddqId: string,
    rawInput: z.infer<typeof updateDdqFollowupSchema>
  ): Promise<DdqFollowupRecord> {
    const input = updateDdqFollowupSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.response_text !== undefined) patch.response_text = input.response_text;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "RESOLVED") patch.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("ddq_followups")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId)
      .eq("id", input.followup_id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed updating DDQ follow-up: ${error?.message || "Not found"}`);
    }
    return data as DdqFollowupRecord;
  }

  /**
   * Recomputes aggregate counters on ddq_engagements from ddq_questions.
   */
  public async recomputeEngagementCounters(
    tenantId: string,
    ddqId: string
  ): Promise<DdqEngagementRecord | null> {
    const supabase = createAdminSupabaseClient();
    const { data: rows } = await supabase
      .from("ddq_questions")
      .select("status, answer_source, draft_answer, final_answer, evidence_gap_flag")
      .eq("tenant_id", tenantId)
      .eq("ddq_id", ddqId);

    const list = (rows || []) as Array<{
      status: string;
      answer_source: string;
      draft_answer: string | null;
      final_answer: string | null;
      evidence_gap_flag: boolean;
    }>;

    const total = list.length;
    const answered = list.filter((q) => (q.final_answer || q.draft_answer || "").trim().length > 0).length;
    const autoMatched = list.filter(
      (q) => q.answer_source === "QA_LIBRARY_EXACT" || q.answer_source === "QA_LIBRARY_STALE"
    ).length;
    const validated = list.filter((q) => q.status === "CCO_VALIDATED" || q.status === "APPROVED").length;
    const gaps = list.filter((q) => q.evidence_gap_flag).length;

    const { data: current } = await supabase
      .from("ddq_engagements")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("id", ddqId)
      .maybeSingle();

    const nextStatus =
      current?.status === "INGESTING" && answered >= total ? "IN_PROGRESS" : current?.status;

    const { data: updated } = await supabase
      .from("ddq_engagements")
      .update({
        total_questions: total,
        answered_count: answered,
        auto_matched_count: autoMatched,
        validated_count: validated,
        evidence_gap_count: gaps,
        ...(nextStatus ? { status: nextStatus } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", ddqId)
      .select("*")
      .single();

    return (updated as DdqEngagementRecord) || null;
  }

  /**
   * Promotes a persisted Chat Studio DDQ Work Product into a live DDQ Operations engagement.
   * Idempotent: if an engagement already exists linked to `work_product_id`, returns it cleanly.
   * Parses Q&A rows, preserves Chat-drafted answers & `[NEEDS_INTERNAL_EVIDENCE]` gap flags,
   * and saves the full working material reference + markdown snapshot inside `engagement.metadata`.
   */
  public async promoteWorkProductToDdq(
    tenantId: string,
    userId: string,
    rawInput: PromoteWorkProductToDdqInput
  ): Promise<{
    engagement: DdqEngagementRecord;
    parsed_count: number;
    already_existed: boolean;
  }> {
    const input = promoteWorkProductToDdqSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: wp, error: wpErr } = await supabase
      .from("work_product_artifacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", input.work_product_id)
      .maybeSingle();

    if (wpErr || !wp) {
      throw new Error(`Work product ${input.work_product_id} not found for tenant.`);
    }

    // Idempotency check: return existing DDQ engagement if this work product was already promoted
    const { data: existingList } = await supabase
      .from("ddq_engagements")
      .select("*")
      .eq("tenant_id", tenantId)
      .contains("metadata", { source_work_product_id: wp.id })
      .order("created_at", { ascending: false })
      .limit(1);

    const existing = Array.isArray(existingList) ? existingList[0] : null;
    if (existing) {
      return {
        engagement: existing as DdqEngagementRecord,
        parsed_count: Number(existing.total_questions || 0),
        already_existed: true,
      };
    }

    const title = (input.title || String(wp.title || "Supervisory & Partner DDQ Response")).slice(
      0,
      220
    );
    const markdown = String(wp.markdown_content || "");
    const combinedCue = `${title} ${markdown.slice(0, 600)}`;

    const inferredRequesterType: DdqRequesterType =
      input.requester_type ||
      (/\b(cbn|central bank|sec\b|ndpc|nfiu|fccpc|regulator|supervisory|examiner)\b/i.test(
        combinedCue
      )
        ? "REGULATOR"
        : /\b(investor|vc\b|private equity|series [a-d]|fund)\b/i.test(combinedCue)
          ? "INVESTOR"
          : /\b(acquirer|processor|switch|nibss|interswitch|visa|mastercard)\b/i.test(combinedCue)
            ? "PAYMENT_PROCESSOR"
            : "SPONSOR_BANK");

    const inferredInstitution =
      input.requesting_institution ||
      (/\b(cbn|central bank of nigeria)\b/i.test(combinedCue)
        ? "Central Bank of Nigeria (CBN)"
        : /\b(ndpc)\b/i.test(combinedCue)
          ? "Nigeria Data Protection Commission (NDPC)"
          : /\b(nfiu)\b/i.test(combinedCue)
            ? "Nigerian Financial Intelligence Unit (NFIU)"
            : /\b(sec\b|securities and exchange)\b/i.test(combinedCue)
              ? "Securities and Exchange Commission (SEC)"
              : inferredRequesterType === "REGULATOR"
                ? "Supervisory Authority"
                : "Sponsor Bank / Partner");

    const parsed = parseWorkProductDdqMarkdown(markdown, title);
    const totalQuestions = parsed.questions.length;
    const ddqId = crypto.randomUUID();
    const sourceSha256 = crypto
      .createHash("sha256")
      .update(markdown || title, "utf8")
      .digest("hex");

    const gapPattern = /\[NEEDS_INTERNAL_EVIDENCE\]|NEEDS_INTERNAL_EVIDENCE|evidence gap|attach .*?(policy|certificate|log|report)/i;
    const preparedRows = parsed.questions.map((q) => {
      const draftAns = (q.existing_answer || "").trim() || null;
      const hasGap = !draftAns || gapPattern.test(draftAns);
      return {
        tenant_id: tenantId,
        ddq_id: ddqId,
        question_index: q.question_index,
        question_code: q.question_code,
        section_name: q.section_name,
        question_text: q.question_text,
        domain: q.domain,
        assigned_department: q.assigned_department,
        source_sheet_name: null,
        source_row_number: null,
        source_question_col: null,
        source_answer_col: null,
        source_evidence_col: null,
        status: hasGap ? "NEEDS_EVIDENCE" : "AI_DRAFTED",
        answer_source: !draftAns
          ? "NONE"
          : hasGap
            ? "AI_GAP_FLAGGED"
            : "AI_EVIDENCE_GROUNDED",
        draft_answer: draftAns,
        grounding_classification: hasGap ? "MISSING_EVIDENCE" : "VERIFIED_EVIDENCE",
        evidence_gap_flag: hasGap,
      };
    });

    const answeredCount = preparedRows.filter((r) => Boolean(r.draft_answer)).length;
    const gapCount = preparedRows.filter((r) => r.evidence_gap_flag).length;

    const engagementMetadata = {
      source_work_product_id: wp.id,
      source_conversation_id: wp.conversation_id || null,
      source_workflow_type: wp.workflow_type || "SUPERVISORY_DDQ_RESPONSE",
      source_document_title: wp.title || title,
      source_version_number: Number(wp.version_number || 1),
      source_markdown_content: markdown,
      promoted_from_chat: true,
      promoted_at: new Date().toISOString(),
    };

    const { data: engagement, error: engErr } = await supabase
      .from("ddq_engagements")
      .insert({
        id: ddqId,
        tenant_id: tenantId,
        title,
        requesting_institution: inferredInstitution,
        requester_type: inferredRequesterType,
        reference_code: input.reference_code || null,
        status: totalQuestions > 0 ? "IN_PROGRESS" : "DRAFT",
        due_date: input.due_date ?? null,
        source_file_name: `${title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80)}.md`,
        source_mime_type: "text/markdown",
        source_sha256: sourceSha256,
        source_format: "TEXT",
        source_structure: parsed.source_structure,
        total_questions: totalQuestions,
        answered_count: answeredCount,
        auto_matched_count: 0,
        validated_count: 0,
        evidence_gap_count: gapCount,
        created_by: userId,
        cco_owner_id: userId,
        metadata: engagementMetadata,
      })
      .select("*")
      .single();

    if (engErr || !engagement) {
      throw new Error(
        `Failed to promote work product to DDQ engagement: ${engErr?.message || "Unknown error"}`
      );
    }

    if (preparedRows.length > 0) {
      for (let i = 0; i < preparedRows.length; i += 100) {
        const slice = preparedRows.slice(i, i + 100);
        const { error: qErr } = await supabase.from("ddq_questions").insert(slice);
        if (qErr) {
          throw new Error(`Failed to persist promoted DDQ questions: ${qErr.message}`);
        }
      }
    }

    const signoffRoles: DdqSignoffRole[] = ["CCO_MLRO", "CEO", "CISO", "CFO"];
    await supabase.from("ddq_signoffs").insert(
      signoffRoles.map((role) => ({
        tenant_id: tenantId,
        ddq_id: ddqId,
        signoff_role: role,
        status: "PENDING",
      }))
    );

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "DDQ_PROMOTED_FROM_WORK_PRODUCT",
      entityType: "DDQ_ENGAGEMENT",
      entityId: ddqId,
      eventData: {
        workProductId: wp.id,
        conversationId: wp.conversation_id || null,
        title,
        totalQuestions,
        answeredCount,
        evidenceGapCount: gapCount,
      },
    });

    return {
      engagement: engagement as DdqEngagementRecord,
      parsed_count: totalQuestions,
      already_existed: false,
    };
  }
}

import { z } from "zod";
export const ddqService = new DdqService();
