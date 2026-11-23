/**
 * Cogent Compliance Operations - Approved Q&A Knowledge Library Service (Pillar 2)
 * Stores CCO-validated canonical DDQ answers so future questionnaires from Bank #2, #3, etc.
 * auto-match in seconds, with automatic staleness detection (review cycle + linked evidence expiry).
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { computeEvidenceHealth } from "@/modules/evidence/evidence.service";
import {
  createQaLibraryEntrySchema,
  updateQaLibraryEntrySchema,
  type ComplianceDepartment,
  type CreateQaLibraryEntryInput,
  type DdqDomain,
  type QaLibraryEntryRecord,
  type QaLibraryStatus,
  type StatutoryCitationItem,
  type UpdateQaLibraryEntryInput,
} from "@/contracts/ddq.contracts";

export interface QaLibraryMatchResult {
  entry: QaLibraryEntryRecord;
  confidence: number; // 0..1
  is_stale: boolean;
  staleness_reasons: string[];
  match_type: "QA_LIBRARY_EXACT" | "QA_LIBRARY_STALE";
}

const STOP_WORDS = new Set([
  "what", "when", "where", "which", "with", "that", "this", "from", "have",
  "does", "your", "company", "please", "provide", "confirm", "describe",
  "detail", "explain", "whether", "about", "there", "their", "been", "into",
  "under", "over", "each", "more", "most", "such", "ensure", "organization",
  "organisation", "institution", "fintech", "entity", "currently",
]);

export function normalizeQuestionToken(token: string): string {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenizeQuestion(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
      .map(normalizeQuestionToken)
  );
}

export function computeQuestionLexicalSimilarity(q1: string, q2: string): number {
  const s1 = tokenizeQuestion(q1);
  const s2 = tokenizeQuestion(q2);
  if (s1.size === 0 || s2.size === 0) return 0;

  let intersection = 0;
  for (const token of s1) {
    if (s2.has(token)) intersection += 1;
  }

  const union = s1.size + s2.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;
  const overlapMin = intersection / Math.min(s1.size, s2.size);
  // Weighted blend favoring high coverage of the shorter question while resisting noise
  return Number((jaccard * 0.45 + overlapMin * 0.55).toFixed(3));
}

export function evaluateQaStaleness(
  entry: {
    status: string;
    review_due_at?: string | null;
    linked_evidence_ids?: string[];
  },
  evidenceHealthMap: Map<string, { title: string; computed_health: string; expiry_date: string | null }>
): { is_stale: boolean; staleness_reasons: string[] } {
  const reasons: string[] = [];

  if (entry.status === "STALE" || entry.status === "NEEDS_REVIEW") {
    reasons.push(`Marked as ${entry.status.replace("_", " ").toLowerCase()} in Q&A Library.`);
  }

  if (entry.review_due_at) {
    const due = new Date(entry.review_due_at);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
      reasons.push(`Scheduled review deadline (${due.toISOString().slice(0, 10)}) has passed.`);
    }
  }

  const linkedIds = Array.isArray(entry.linked_evidence_ids) ? entry.linked_evidence_ids : [];
  for (const evId of linkedIds) {
    const ev = evidenceHealthMap.get(evId);
    if (!ev) continue;
    if (ev.computed_health === "EXPIRED") {
      reasons.push(
        `Linked evidence "${ev.title}" expired on ${ev.expiry_date || "an earlier date"}.`
      );
    } else if (ev.computed_health === "SUPERSEDED" || ev.computed_health === "ARCHIVED") {
      reasons.push(`Linked evidence "${ev.title}" is ${ev.computed_health.toLowerCase()}.`);
    }
  }

  return {
    is_stale: reasons.length > 0,
    staleness_reasons: reasons,
  };
}

export class QaLibraryService {
  private async loadEvidenceHealthMap(
    tenantId: string,
    evidenceIds: string[]
  ): Promise<Map<string, { title: string; computed_health: string; expiry_date: string | null }>> {
    const map = new Map<string, { title: string; computed_health: string; expiry_date: string | null }>();
    const uniqueIds = Array.from(new Set(evidenceIds.filter(Boolean)));
    if (uniqueIds.length === 0) return map;

    const supabase = createAdminSupabaseClient();
    const { data } = await supabase
      .from("compliance_evidence_items")
      .select("id, title, status, expiry_date")
      .eq("tenant_id", tenantId)
      .in("id", uniqueIds);

    for (const row of (data || []) as Record<string, unknown>[]) {
      const health = computeEvidenceHealth({
        status: String(row.status || "ACTIVE"),
        expiry_date: (row.expiry_date as string | null) ?? null,
      });
      map.set(String(row.id), {
        title: String(row.title || "Linked Evidence"),
        computed_health: health.computed_health,
        expiry_date: (row.expiry_date as string | null) ?? null,
      });
    }
    return map;
  }

  private enrichRow(
    row: Record<string, unknown>,
    evidenceHealthMap: Map<string, { title: string; computed_health: string; expiry_date: string | null }>
  ): QaLibraryEntryRecord {
    const linkedIds = Array.isArray(row.linked_evidence_ids)
      ? (row.linked_evidence_ids as string[])
      : [];
    const staleness = evaluateQaStaleness(
      {
        status: String(row.status || "ACTIVE"),
        review_due_at: (row.review_due_at as string | null) ?? null,
        linked_evidence_ids: linkedIds,
      },
      evidenceHealthMap
    );

    return {
      ...(row as unknown as QaLibraryEntryRecord),
      linked_evidence_ids: linkedIds,
      statutory_citations: Array.isArray(row.statutory_citations)
        ? (row.statutory_citations as StatutoryCitationItem[])
        : [],
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      times_reused: Number(row.times_reused || 0),
      is_stale: staleness.is_stale,
      staleness_reasons: staleness.staleness_reasons,
    };
  }

  /**
   * Creates a new CCO-approved Q&A entry in the institutional knowledge library.
   */
  public async createEntry(
    tenantId: string,
    userId: string,
    userName: string | null,
    rawInput: CreateQaLibraryEntryInput
  ): Promise<QaLibraryEntryRecord> {
    const input = createQaLibraryEntrySchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const reviewDays = input.review_cycle_days ?? 180;
    const reviewDueAt = new Date(Date.now() + reviewDays * 24 * 60 * 60 * 1000).toISOString();

    let embedding: number[] | null = null;
    try {
      embedding = await geminiService.generateEmbedding(
        `${input.canonical_question}\n${input.approved_answer.slice(0, 600)}`,
        { fastInteractive: true, timeoutMs: 3500, context: { tenantId, taskType: "EMBEDDING_GENERATION" } }
      );
    } catch {
      embedding = null;
    }

    const { data: inserted, error } = await supabase
      .from("ddq_qa_library")
      .insert({
        tenant_id: tenantId,
        canonical_question: input.canonical_question,
        approved_answer: input.approved_answer,
        domain: input.domain,
        owner_department: input.owner_department,
        linked_evidence_ids: input.linked_evidence_ids ?? [],
        statutory_citations: input.statutory_citations ?? [],
        tags: input.tags ?? [],
        source_ddq_id: input.source_ddq_id ?? null,
        source_question_id: input.source_question_id ?? null,
        ...(embedding ? { embedding } : {}),
        status: "ACTIVE",
        approved_by: userId,
        approved_by_name: userName,
        approved_at: new Date().toISOString(),
        review_due_at: reviewDueAt,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create Q&A Library entry: ${error?.message || "Unknown error"}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "QA_LIBRARY_ENTRY_CREATED",
      entityType: "DDQ_QA_LIBRARY",
      entityId: inserted.id,
      eventData: {
        domain: input.domain,
        ownerDepartment: input.owner_department,
        linkedEvidenceCount: (input.linked_evidence_ids || []).length,
        sourceDdqId: input.source_ddq_id ?? null,
      },
    });

    const healthMap = await this.loadEvidenceHealthMap(tenantId, input.linked_evidence_ids ?? []);
    return this.enrichRow(inserted as Record<string, unknown>, healthMap);
  }

  /**
   * Lists Q&A Library entries with computed staleness flags & summary counters.
   */
  public async listEntries(
    tenantId: string,
    filters?: {
      domain?: DdqDomain;
      owner_department?: ComplianceDepartment;
      status?: QaLibraryStatus;
      stale_only?: boolean;
      search?: string;
    }
  ): Promise<{
    items: QaLibraryEntryRecord[];
    summary: { total: number; fresh: number; stale: number; total_reuses: number };
  }> {
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("ddq_qa_library")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("status", "ARCHIVED")
      .order("times_reused", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(300);

    if (filters?.domain) query = query.eq("domain", filters.domain);
    if (filters?.owner_department) query = query.eq("owner_department", filters.owner_department);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list Q&A Library: ${error.message}`);
    }

    const rawRows = (data || []) as Record<string, unknown>[];
    const allEvidenceIds = rawRows.flatMap((r) =>
      Array.isArray(r.linked_evidence_ids) ? (r.linked_evidence_ids as string[]) : []
    );
    const healthMap = await this.loadEvidenceHealthMap(tenantId, allEvidenceIds);

    let items = rawRows.map((r) => this.enrichRow(r, healthMap));

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.canonical_question.toLowerCase().includes(q) ||
          i.approved_answer.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const summary = {
      total: items.length,
      fresh: items.filter((i) => !i.is_stale).length,
      stale: items.filter((i) => i.is_stale).length,
      total_reuses: items.reduce((acc, i) => acc + i.times_reused, 0),
    };

    if (filters?.stale_only) {
      items = items.filter((i) => i.is_stale);
    }

    return { items, summary };
  }

  /**
   * Updates or revalidates an existing Q&A Library entry.
   */
  public async updateEntry(
    tenantId: string,
    userId: string,
    userName: string | null,
    entryId: string,
    rawInput: UpdateQaLibraryEntryInput
  ): Promise<QaLibraryEntryRecord> {
    const input = updateQaLibraryEntrySchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.canonical_question !== undefined) patch.canonical_question = input.canonical_question;
    if (input.approved_answer !== undefined) patch.approved_answer = input.approved_answer;
    if (input.domain !== undefined) patch.domain = input.domain;
    if (input.owner_department !== undefined) patch.owner_department = input.owner_department;
    if (input.linked_evidence_ids !== undefined) patch.linked_evidence_ids = input.linked_evidence_ids;
    if (input.statutory_citations !== undefined) patch.statutory_citations = input.statutory_citations;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.status !== undefined) patch.status = input.status;

    if (input.revalidate) {
      const reviewDays = input.review_cycle_days ?? 180;
      patch.status = "ACTIVE";
      patch.approved_by = userId;
      patch.approved_by_name = userName;
      patch.approved_at = new Date().toISOString();
      patch.review_due_at = new Date(Date.now() + reviewDays * 24 * 60 * 60 * 1000).toISOString();
    }

    if (input.canonical_question || input.approved_answer) {
      try {
        const textForEmbed = `${input.canonical_question || ""}\n${(input.approved_answer || "").slice(0, 600)}`.trim();
        if (textForEmbed) {
          patch.embedding = await geminiService.generateEmbedding(textForEmbed, {
            fastInteractive: true,
            timeoutMs: 3500,
            context: { tenantId, taskType: "EMBEDDING_GENERATION" },
          });
        }
      } catch {
        // Proceed without blocking update
      }
    }

    const { data: updated, error } = await supabase
      .from("ddq_qa_library")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update Q&A entry: ${error?.message || "Not found"}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: input.revalidate ? "QA_LIBRARY_ENTRY_REVALIDATED" : "QA_LIBRARY_ENTRY_UPDATED",
      entityType: "DDQ_QA_LIBRARY",
      entityId: entryId,
      eventData: { updatedFields: Object.keys(patch) },
    });

    const linkedIds = Array.isArray(updated.linked_evidence_ids)
      ? (updated.linked_evidence_ids as string[])
      : [];
    const healthMap = await this.loadEvidenceHealthMap(tenantId, linkedIds);
    return this.enrichRow(updated as Record<string, unknown>, healthMap);
  }

  /**
   * Soft-archives a Q&A Library entry.
   */
  public async archiveEntry(tenantId: string, userId: string, entryId: string): Promise<void> {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("ddq_qa_library")
      .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", entryId);

    if (error) {
      throw new Error(`Failed to archive Q&A entry: ${error.message}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "QA_LIBRARY_ENTRY_ARCHIVED",
      entityType: "DDQ_QA_LIBRARY",
      entityId: entryId,
      eventData: {},
    });
  }

  /**
   * Finds the strongest matching approved Q&A entry for a DDQ question (semantic + lexical)
   * and evaluates staleness against review_due_at and linked evidence expiry dates.
   */
  public async findBestMatch(
    tenantId: string,
    questionText: string,
    minConfidence: number = 0.62
  ): Promise<QaLibraryMatchResult | null> {
    const supabase = createAdminSupabaseClient();
    const cleanQ = questionText.trim();
    if (cleanQ.length < 8) return null;

    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await geminiService.generateEmbedding(cleanQ.slice(0, 500), {
        fastInteractive: true,
        timeoutMs: 3000,
        context: { tenantId, taskType: "EMBEDDING_GENERATION" },
      });
    } catch {
      queryEmbedding = null;
    }

    let candidates: Array<{ row: Record<string, unknown>; confidence: number }> = [];

    // 1. Try Hybrid RRF RPC
    try {
      const { data: rpcRows, error } = await supabase.rpc("search_ddq_qa_library_rrf", {
        p_tenant_id: tenantId,
        p_query_text: cleanQ.slice(0, 400),
        p_query_embedding: queryEmbedding,
        p_match_count: 5,
        p_rrf_k: 60,
      });

      if (!error && Array.isArray(rpcRows) && rpcRows.length > 0) {
        candidates = (rpcRows as Record<string, unknown>[]).map((r) => {
          const lex = computeQuestionLexicalSimilarity(cleanQ, String(r.canonical_question || ""));
          const sem = Number(r.similarity || 0);
          const confidence = sem > 0 ? Number(Math.max(sem, lex * 0.95).toFixed(3)) : lex;
          return {
            row: {
              ...r,
              id: r.qa_id || r.id,
            },
            confidence,
          };
        });
      }
    } catch (err) {
      logger.warn("Q&A Library RRF RPC fallback triggered", {
        tenantId,
        error: (err as Error).message,
      });
    }

    // 2. Fallback scan of tenant's active Q&A Library if RPC returned empty
    if (candidates.length === 0) {
      const { data: rows } = await supabase
        .from("ddq_qa_library")
        .select("*")
        .eq("tenant_id", tenantId)
        .neq("status", "ARCHIVED")
        .limit(250);

      for (const row of (rows || []) as Record<string, unknown>[]) {
        const lex = computeQuestionLexicalSimilarity(cleanQ, String(row.canonical_question || ""));
        if (lex >= minConfidence) {
          candidates.push({ row, confidence: lex });
        }
      }
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    if (!best || best.confidence < minConfidence) {
      return null;
    }

    const linkedIds = Array.isArray(best.row.linked_evidence_ids)
      ? (best.row.linked_evidence_ids as string[])
      : [];
    const healthMap = await this.loadEvidenceHealthMap(tenantId, linkedIds);
    const enriched = this.enrichRow(best.row, healthMap);

    // Increment reuse telemetry softly
    try {
      await supabase
        .from("ddq_qa_library")
        .update({
          times_reused: enriched.times_reused + 1,
          last_reused_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("id", enriched.id);
    } catch {
      // Non-blocking telemetry
    }

    return {
      entry: enriched,
      confidence: best.confidence,
      is_stale: enriched.is_stale,
      staleness_reasons: enriched.staleness_reasons,
      match_type: enriched.is_stale ? "QA_LIBRARY_STALE" : "QA_LIBRARY_EXACT",
    };
  }
}

export const qaLibraryService = new QaLibraryService();
