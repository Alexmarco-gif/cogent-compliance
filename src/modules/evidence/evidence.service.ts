/**
 * Cogent Compliance Operations - Central Evidence Repository Service (Pillar 1)
 * Manages versioned compliance policies, licences, VAPT reports, NDPC CAR receipts,
 * reconciliations, and certificates with expiry tracking, SHA-256 hashing, R2 storage,
 * and hybrid semantic/lexical retrieval for DDQs & Audits.
 */

import crypto from "crypto";
import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";
import ExcelJS from "exceljs";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import {
  createEvidenceItemSchema,
  updateEvidenceItemSchema,
  type ComplianceDepartment,
  type CreateEvidenceItemInput,
  type EvidenceCategory,
  type EvidenceItemRecord,
  type EvidenceStatus,
  type UpdateEvidenceItemInput,
} from "@/contracts/ddq.contracts";

const EXPIRING_SOON_DAYS = 30;

export interface EvidenceSearchHit {
  evidence_item_id: string;
  chunk_id: string;
  title: string;
  category: EvidenceCategory;
  owner_department: ComplianceDepartment;
  status: EvidenceStatus;
  computed_health: EvidenceItemRecord["computed_health"];
  expiry_date: string | null;
  file_name: string | null;
  chunk_text: string;
  score: number;
}

export interface EvidenceHealthSummary {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
  draft: number;
}

export function computeEvidenceHealth(row: {
  status: string;
  expiry_date?: string | null;
}): {
  computed_health: EvidenceItemRecord["computed_health"];
  days_until_expiry: number | null;
} {
  const status = row.status as EvidenceStatus;
  if (status === "ARCHIVED" || status === "SUPERSEDED" || status === "DRAFT") {
    return { computed_health: status, days_until_expiry: null };
  }
  if (!row.expiry_date) {
    return { computed_health: "ACTIVE", days_until_expiry: null };
  }

  const expiry = new Date(`${row.expiry_date}T23:59:59Z`);
  if (Number.isNaN(expiry.getTime())) {
    return { computed_health: "ACTIVE", days_until_expiry: null };
  }

  const diffMs = expiry.getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { computed_health: "EXPIRED", days_until_expiry: days };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return { computed_health: "EXPIRING_SOON", days_until_expiry: days };
  }
  return { computed_health: "ACTIVE", days_until_expiry: days };
}

export function enrichEvidenceRecord(row: Record<string, unknown>): EvidenceItemRecord {
  const health = computeEvidenceHealth({
    status: String(row.status || "ACTIVE"),
    expiry_date: (row.expiry_date as string | null) ?? null,
  });

  return {
    ...(row as unknown as EvidenceItemRecord),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    metadata: (row.metadata as Record<string, unknown>) || {},
    computed_health: health.computed_health,
    days_until_expiry: health.days_until_expiry,
  };
}

export function chunkEvidenceText(text: string, maxChars: number = 1400, overlap: number = 180): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    const cleanPara = para.trim();
    if (!cleanPara) continue;

    if ((buffer + "\n\n" + cleanPara).length <= maxChars) {
      buffer = buffer ? `${buffer}\n\n${cleanPara}` : cleanPara;
    } else {
      if (buffer) {
        chunks.push(buffer);
        const tail = buffer.slice(-overlap);
        buffer = `${tail}\n\n${cleanPara}`.slice(0, maxChars);
      } else {
        // Long single paragraph: split into bounded slices
        for (let i = 0; i < cleanPara.length; i += maxChars - overlap) {
          chunks.push(cleanPara.slice(i, i + maxChars));
        }
        buffer = "";
      }
    }
  }
  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }
  return chunks.slice(0, 120);
}

export async function extractTextFromUploadedFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  try {
    if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
      const pdfRes = await extractPdfText(new Uint8Array(buffer));
      const text = Array.isArray(pdfRes.text) ? pdfRes.text.join("\n\n") : String(pdfRes.text || "");
      return text.trim();
    }

    if (
      lowerMime.includes("wordprocessingml") ||
      lowerName.endsWith(".docx")
    ) {
      const res = await mammoth.extractRawText({ buffer });
      return (res.value || "").trim();
    }

    if (
      lowerMime.includes("spreadsheetml") ||
      lowerName.endsWith(".xlsx")
    ) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const lines: string[] = [];
      wb.eachSheet((sheet) => {
        lines.push(`=== Sheet: ${sheet.name} ===`);
        sheet.eachRow((row) => {
          const cells = (row.values as unknown[])
            .slice(1)
            .map((v) => (v == null ? "" : typeof v === "object" && "text" in v ? String((v as { text: unknown }).text) : String(v)))
            .map((s) => s.trim())
            .filter(Boolean);
          if (cells.length > 0) {
            lines.push(cells.join(" | "));
          }
        });
      });
      return lines.join("\n").trim();
    }

    if (
      lowerMime.startsWith("text/") ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".csv")
    ) {
      return buffer.toString("utf-8").trim();
    }
  } catch (err) {
    logger.warn("Evidence file text extraction failed softly", {
      fileName,
      mimeType,
      error: (err as Error).message,
    });
  }

  return "";
}

export class EvidenceService {
  /**
   * Creates a new Central Evidence Repository item (optionally with a binary file uploaded to R2).
   * If `parent_evidence_id` is passed, increments version_number and marks the predecessor SUPERSEDED.
   */
  public async createEvidenceItem(
    tenantId: string,
    userId: string,
    rawInput: CreateEvidenceItemInput,
    file?: {
      buffer: Buffer;
      fileName: string;
      mimeType: string;
    }
  ): Promise<EvidenceItemRecord> {
    const input = createEvidenceItemSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    let versionNumber = input.version_number ?? 1;
    if (input.parent_evidence_id) {
      const { data: parent } = await supabase
        .from("compliance_evidence_items")
        .select("id, version_number")
        .eq("tenant_id", tenantId)
        .eq("id", input.parent_evidence_id)
        .maybeSingle();

      if (parent) {
        versionNumber = Number(parent.version_number || 1) + 1;
        await supabase
          .from("compliance_evidence_items")
          .update({ status: "SUPERSEDED", updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId)
          .eq("id", parent.id);
      }
    }

    const evidenceId = crypto.randomUUID();
    let storageKey: string | null = null;
    let sha256Hash: string | null = null;
    let fileName = input.file_name ?? null;
    let mimeType = input.mime_type ?? null;
    let fileSizeBytes: number | null = null;
    let extractedText = (input.extracted_text || "").trim();

    if (file && file.buffer.length > 0) {
      fileName = file.fileName;
      mimeType = file.mimeType;
      fileSizeBytes = file.buffer.length;
      sha256Hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
      const sanitizedName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      storageKey = `tenants/${tenantId}/evidence/${evidenceId}/${sanitizedName}`;

      try {
        await r2StorageService.putObjectBuffer(storageKey, file.buffer, file.mimeType);
      } catch (err) {
        logger.warn("R2 evidence upload failed softly; continuing with metadata/text indexing", {
          tenantId,
          evidenceId,
          error: (err as Error).message,
        });
      }

      if (!extractedText) {
        extractedText = await extractTextFromUploadedFile(file.buffer, file.fileName, file.mimeType);
      }
    } else if (extractedText) {
      sha256Hash = crypto.createHash("sha256").update(extractedText, "utf8").digest("hex");
    }

    const initialHealth = computeEvidenceHealth({
      status: "ACTIVE",
      expiry_date: input.expiry_date ?? null,
    });

    const { data: inserted, error } = await supabase
      .from("compliance_evidence_items")
      .insert({
        id: evidenceId,
        tenant_id: tenantId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        owner_department: input.owner_department,
        owner_user_id: input.owner_user_id ?? userId,
        owner_name: input.owner_name ?? null,
        version_number: versionNumber,
        parent_evidence_id: input.parent_evidence_id ?? null,
        status: initialHealth.computed_health,
        effective_date: input.effective_date ?? null,
        expiry_date: input.expiry_date ?? null,
        review_cycle_days: input.review_cycle_days ?? 365,
        file_name: fileName,
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
        storage_key: storageKey,
        sha256_hash: sha256Hash,
        extracted_text: extractedText || null,
        tags: input.tags ?? [],
        uploaded_by: userId,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create evidence item: ${error?.message || "Unknown error"}`);
    }

    // Index text chunks for per-question DDQ retrieval
    const textToIndex = [
      input.title,
      input.description || "",
      extractedText,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (textToIndex.length >= 20) {
      await this.indexEvidenceChunks(tenantId, evidenceId, textToIndex);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "EVIDENCE_ITEM_CREATED",
      entityType: "COMPLIANCE_EVIDENCE_ITEM",
      entityId: evidenceId,
      eventData: {
        title: input.title,
        category: input.category,
        ownerDepartment: input.owner_department,
        versionNumber,
        expiryDate: input.expiry_date ?? null,
        sha256Hash,
      },
    });

    return enrichEvidenceRecord(inserted as Record<string, unknown>);
  }

  /**
   * Chunks and optionally embeds evidence text into compliance_evidence_chunks.
   */
  public async indexEvidenceChunks(
    tenantId: string,
    evidenceItemId: string,
    fullText: string
  ): Promise<number> {
    const supabase = createAdminSupabaseClient();
    const chunks = chunkEvidenceText(fullText);
    if (chunks.length === 0) return 0;

    await supabase
      .from("compliance_evidence_chunks")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("evidence_item_id", evidenceItemId);

    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]!;
      let embedding: number[] | null = null;
      // Embed first 25 chunks synchronously to keep upload snappy; FTS covers all chunks immediately.
      if (i < 25) {
        try {
          embedding = await geminiService.generateEmbedding(chunkText.slice(0, 1500), {
            fastInteractive: true,
            timeoutMs: 4000,
            context: { tenantId, taskType: "EMBEDDING_GENERATION" },
          });
        } catch {
          embedding = null;
        }
      }
      rows.push({
        tenant_id: tenantId,
        evidence_item_id: evidenceItemId,
        chunk_index: i,
        chunk_text: chunkText,
        ...(embedding ? { embedding } : {}),
      });
    }

    const { error } = await supabase.from("compliance_evidence_chunks").insert(rows);
    if (error) {
      logger.warn("Failed inserting evidence chunks", {
        tenantId,
        evidenceItemId,
        error: error.message,
      });
      return 0;
    }
    return rows.length;
  }

  /**
   * Lists evidence items for a tenant with computed expiry health and summary counters.
   */
  public async listEvidenceItems(
    tenantId: string,
    filters?: {
      category?: EvidenceCategory;
      owner_department?: ComplianceDepartment;
      status?: string;
      search?: string;
      include_archived?: boolean;
    }
  ): Promise<{ items: EvidenceItemRecord[]; summary: EvidenceHealthSummary }> {
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("compliance_evidence_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.owner_department) {
      query = query.eq("owner_department", filters.owner_department);
    }
    if (!filters?.include_archived) {
      query = query.neq("status", "ARCHIVED");
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list evidence items: ${error.message}`);
    }

    let items = ((data || []) as Record<string, unknown>[]).map(enrichEvidenceRecord);

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          (item.file_name || "").toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const summary: EvidenceHealthSummary = {
      total: items.length,
      active: items.filter((i) => i.computed_health === "ACTIVE").length,
      expiring_soon: items.filter((i) => i.computed_health === "EXPIRING_SOON").length,
      expired: items.filter((i) => i.computed_health === "EXPIRED").length,
      draft: items.filter((i) => i.computed_health === "DRAFT").length,
    };

    if (filters?.status) {
      items = items.filter((i) => i.computed_health === filters.status);
    }

    return { items, summary };
  }

  /**
   * Fetches a single evidence item.
   */
  public async getEvidenceItem(tenantId: string, evidenceId: string): Promise<EvidenceItemRecord | null> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("compliance_evidence_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", evidenceId)
      .maybeSingle();

    if (error || !data) return null;
    return enrichEvidenceRecord(data as Record<string, unknown>);
  }

  /**
   * Updates evidence metadata, expiry date, extracted text, or records approval.
   */
  public async updateEvidenceItem(
    tenantId: string,
    userId: string,
    evidenceId: string,
    rawInput: UpdateEvidenceItemInput
  ): Promise<EvidenceItemRecord> {
    const input = updateEvidenceItemSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.category !== undefined) patch.category = input.category;
    if (input.owner_department !== undefined) patch.owner_department = input.owner_department;
    if (input.owner_user_id !== undefined) patch.owner_user_id = input.owner_user_id;
    if (input.owner_name !== undefined) patch.owner_name = input.owner_name;
    if (input.effective_date !== undefined) patch.effective_date = input.effective_date;
    if (input.expiry_date !== undefined) patch.expiry_date = input.expiry_date;
    if (input.review_cycle_days !== undefined) patch.review_cycle_days = input.review_cycle_days;
    if (input.extracted_text !== undefined) patch.extracted_text = input.extracted_text;
    if (input.tags !== undefined) patch.tags = input.tags;

    if (input.status !== undefined) {
      patch.status = input.status;
    } else if (input.expiry_date !== undefined) {
      patch.status = computeEvidenceHealth({ status: "ACTIVE", expiry_date: input.expiry_date }).computed_health;
    }

    if (input.approve) {
      patch.approved_by = userId;
      patch.approved_at = new Date().toISOString();
      patch.status = computeEvidenceHealth({
        status: "ACTIVE",
        expiry_date: input.expiry_date ?? undefined,
      }).computed_health;
    }

    const { data: updated, error } = await supabase
      .from("compliance_evidence_items")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", evidenceId)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update evidence item: ${error?.message || "Not found"}`);
    }

    if (input.extracted_text) {
      await this.indexEvidenceChunks(
        tenantId,
        evidenceId,
        `${updated.title}\n\n${updated.description || ""}\n\n${input.extracted_text}`
      );
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: input.approve ? "EVIDENCE_ITEM_APPROVED" : "EVIDENCE_ITEM_UPDATED",
      entityType: "COMPLIANCE_EVIDENCE_ITEM",
      entityId: evidenceId,
      eventData: { updatedFields: Object.keys(patch) },
    });

    return enrichEvidenceRecord(updated as Record<string, unknown>);
  }

  /**
   * Soft-archives an evidence item.
   */
  public async archiveEvidenceItem(tenantId: string, userId: string, evidenceId: string): Promise<void> {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("compliance_evidence_items")
      .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", evidenceId);

    if (error) {
      throw new Error(`Failed to archive evidence item: ${error.message}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "EVIDENCE_ITEM_ARCHIVED",
      entityType: "COMPLIANCE_EVIDENCE_ITEM",
      entityId: evidenceId,
      eventData: {},
    });
  }

  /**
   * Searches the Central Evidence Vault for a single DDQ question using Hybrid RRF RPC
   * with automatic lexical fallback (ensuring every question gets grounded individually).
   */
  public async searchEvidenceForQuestion(
    tenantId: string,
    questionText: string,
    limit: number = 4
  ): Promise<EvidenceSearchHit[]> {
    const supabase = createAdminSupabaseClient();
    const cleanQuery = questionText.trim().slice(0, 400);
    if (!cleanQuery) return [];

    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await geminiService.generateEmbedding(cleanQuery, {
        fastInteractive: true,
        timeoutMs: 3000,
        context: { tenantId, taskType: "EMBEDDING_GENERATION" },
      });
    } catch {
      queryEmbedding = null;
    }

    // 1. Try Hybrid RRF RPC
    try {
      const { data: rpcRows, error } = await supabase.rpc("search_compliance_evidence_rrf", {
        p_tenant_id: tenantId,
        p_query_text: cleanQuery,
        p_query_embedding: queryEmbedding,
        p_match_count: limit,
        p_rrf_k: 60,
      });

      if (!error && Array.isArray(rpcRows) && rpcRows.length > 0) {
        return (rpcRows as Record<string, unknown>[]).map((r) => {
          const health = computeEvidenceHealth({
            status: String(r.status || "ACTIVE"),
            expiry_date: (r.expiry_date as string | null) ?? null,
          });
          return {
            evidence_item_id: String(r.evidence_item_id),
            chunk_id: String(r.chunk_id),
            title: String(r.title || ""),
            category: (r.category as EvidenceCategory) || "OTHER",
            owner_department: (r.owner_department as ComplianceDepartment) || "COMPLIANCE",
            status: (r.status as EvidenceStatus) || "ACTIVE",
            computed_health: health.computed_health,
            expiry_date: (r.expiry_date as string | null) ?? null,
            file_name: (r.file_name as string | null) ?? null,
            chunk_text: String(r.chunk_text || ""),
            score: Number(r.rrf_score || 0),
          };
        });
      }
    } catch (err) {
      logger.warn("Evidence RRF RPC fallback triggered", {
        tenantId,
        error: (err as Error).message,
      });
    }

    // 2. Deterministic lexical fallback directly over active evidence items
    const { data: items } = await supabase
      .from("compliance_evidence_items")
      .select("id, title, description, category, owner_department, status, expiry_date, file_name, extracted_text")
      .eq("tenant_id", tenantId)
      .not("status", "in", '("ARCHIVED","SUPERSEDED")')
      .limit(100);

    if (!items || items.length === 0) return [];

    const tokens = Array.from(
      new Set(
        cleanQuery
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length >= 4 && !STOP_WORDS.has(t))
      )
    );
    if (tokens.length === 0) return [];

    const scored: EvidenceSearchHit[] = [];
    for (const row of items as Record<string, unknown>[]) {
      const haystack = `${row.title || ""} ${row.description || ""} ${row.extracted_text || ""}`.toLowerCase();
      let matched = 0;
      for (const tok of tokens) {
        if (haystack.includes(tok)) matched += 1;
      }
      if (matched === 0) continue;

      const score = matched / Math.max(tokens.length, 3);
      if (score < 0.2 && matched < 2) continue;

      const health = computeEvidenceHealth({
        status: String(row.status || "ACTIVE"),
        expiry_date: (row.expiry_date as string | null) ?? null,
      });

      scored.push({
        evidence_item_id: String(row.id),
        chunk_id: String(row.id),
        title: String(row.title || ""),
        category: (row.category as EvidenceCategory) || "OTHER",
        owner_department: (row.owner_department as ComplianceDepartment) || "COMPLIANCE",
        status: (row.status as EvidenceStatus) || "ACTIVE",
        computed_health: health.computed_health,
        expiry_date: (row.expiry_date as string | null) ?? null,
        file_name: (row.file_name as string | null) ?? null,
        chunk_text: String(row.extracted_text || row.description || row.title || "").slice(0, 1200),
        score,
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

const STOP_WORDS = new Set([
  "what", "when", "where", "which", "with", "that", "this", "from", "have",
  "does", "your", "company", "please", "provide", "confirm", "describe",
  "detail", "explain", "whether", "about", "there", "their", "been", "into",
  "under", "over", "each", "more", "most", "such", "ensure", "policy",
]);

export const evidenceService = new EvidenceService();
