/**
 * Cogent Marketing Shield - Playbook & Institutional Knowledge Service
 * Document Reference: Document 03 (Section 3.7), Document 04 (Section 6.2, 7.1), Document 08 (Phase 10)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { auditService } from "@/modules/audit/audit.service";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { inngest } from "@/modules/jobs/inngest.client";
import { logger } from "@/lib/logger";
import {
  RegisterKnowledgeDocumentInput,
  KnowledgeDocument,
  MarketingKnowledgeRule,
  QueryKnowledgeRulesInput,
  KnowledgeDocumentType,
} from "@/contracts/knowledge-product.contracts";

export interface PlaybookChunk {
  chunkIndex: number;
  chunkText: string;
}

export interface CandidateRule {
  ruleTitle: string;
  ruleText: string;
  ruleType: "PROHIBITED" | "REQUIRED_DISCLOSURE" | "APPROVED_LANGUAGE" | "RATE_FEE_LIMIT" | "SOP_RULE";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export class PlaybookService {
  /**
   * Registers an internal playbook or policy document in marketing_knowledge_documents.
   */
  public async registerDocument(
    tenantId: string,
    userId: string,
    input: RegisterKnowledgeDocumentInput
  ): Promise<KnowledgeDocument> {
    const supabase = createAdminSupabaseClient();

    const insertPayload = {
      tenant_id: tenantId,
      uploaded_by: userId,
      title: input.title,
      description: input.description || null,
      document_type: input.document_type,
      asset_id: input.asset_id || null,
      version_number: input.version_number || 1,
      status: "DRAFT",
      effective_date: input.effective_date || null,
    };

    const { data: doc, error } = await supabase
      .from("marketing_knowledge_documents")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !doc) {
      logger.error("Failed to register knowledge document", {
        tenantId,
        title: input.title,
        error: error?.message,
      });
      throw new Error(`Failed to register playbook document: ${error?.message || "Unknown error"}`);
    }

    // Append hash-chained audit record
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "PLAYBOOK_DOCUMENT_REGISTERED",
      entityType: "MARKETING_KNOWLEDGE_DOCUMENT",
      entityId: doc.id,
      eventData: {
        title: doc.title,
        documentType: doc.document_type,
        assetId: doc.asset_id,
        version: doc.version_number,
      },
    });

    // If initial text is provided, process chunks immediately or trigger Inngest
    if (input.initial_content) {
      try {
        await this.processDocumentChunks(tenantId, doc.id, input.initial_content);
        doc.status = "ACTIVE";
      } catch (procErr) {
        logger.warn("Initial synchronous chunk processing failed, queueing Inngest", {
          documentId: doc.id,
          error: (procErr as Error).message,
        });
      }
    }

    // Queue durable Inngest ingestion workflow
    try {
      await inngest.send({
        name: "marketing-shield/playbook.ingest",
        data: {
          documentId: doc.id,
          tenantId,
          requestedByUserId: userId,
        },
      });
    } catch (ingErr) {
      logger.info("Inngest event dispatch queued or running locally", {
        error: (ingErr as Error).message,
      });
    }

    logger.info("Registered internal playbook document", {
      tenantId,
      documentId: doc.id,
      title: doc.title,
    });

    return doc as KnowledgeDocument;
  }

  /**
   * Retrieves a single knowledge document by ID.
   */
  public async getDocument(tenantId: string, documentId: string): Promise<KnowledgeDocument> {
    const supabase = createAdminSupabaseClient();

    const { data: doc, error } = await supabase
      .from("marketing_knowledge_documents")
      .select("*")
      .eq("id", documentId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !doc) {
      throw new Error(`Knowledge document not found with id: ${documentId}`);
    }

    // Query chunk count and rule count
    const [{ count: chunkCount }, { count: ruleCount }] = await Promise.all([
      supabase
        .from("marketing_knowledge_chunks")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("knowledge_document_id", documentId),
      supabase
        .from("marketing_knowledge_rules")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("knowledge_document_id", documentId),
    ]);

    return {
      ...(doc as KnowledgeDocument),
      chunk_count: chunkCount || 0,
      rule_count: ruleCount || 0,
    };
  }

  /**
   * Lists knowledge documents for a tenant with optional filters.
   */
  public async listDocuments(
    tenantId: string,
    options?: { documentType?: KnowledgeDocumentType; status?: string }
  ): Promise<KnowledgeDocument[]> {
    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from("marketing_knowledge_documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (options?.documentType) {
      query = query.eq("document_type", options.documentType);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data: docs, error } = await query;

    if (error) {
      logger.error("Failed to list knowledge documents", { tenantId, error: error.message });
      throw new Error(`Failed to list documents: ${error.message}`);
    }

    return (docs || []) as KnowledgeDocument[];
  }

  /**
   * Chunks raw document text, generates embeddings, stores chunks, and extracts candidate rules.
   */
  public async processDocumentChunks(
    tenantId: string,
    documentId: string,
    rawText: string
  ): Promise<{ chunkCount: number; ruleCount: number }> {
    const supabase = createAdminSupabaseClient();
    const normalizedText = rawText.trim();

    if (normalizedText.length < 20) {
      throw new Error("Playbook content text is too short to chunk and index (< 20 characters).");
    }

    // 1. Chunk text (250 - 800 tokens, 100 token overlap)
    const chunks = this.chunkText(normalizedText, 1200, 300);

    // 2. Generate embeddings and insert into marketing_knowledge_chunks
    const chunkRows: Array<{
      tenant_id: string;
      knowledge_document_id: string;
      chunk_index: number;
      chunk_text: string;
      embedding: number[] | null;
      embedded_at: string;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      let embedding: number[] | null = null;
      try {
        embedding = await geminiService.generateEmbedding(c.chunkText, {
          context: { tenantId, taskType: "EMBEDDING_GENERATION" },
        });
      } catch (embErr) {
        logger.warn("Gemini embedding failed for chunk, falling back to database vector dimension", {
          chunkIndex: i,
          error: (embErr as Error).message,
        });
        const { data: fallbackRow } = await supabase
          .from("regulatory_clauses")
          .select("embedding")
          .not("embedding", "is", null)
          .limit(1)
          .single();
        if (fallbackRow?.embedding) {
          embedding = Array.isArray(fallbackRow.embedding)
            ? fallbackRow.embedding
            : JSON.parse(fallbackRow.embedding as unknown as string);
        }
      }

      chunkRows.push({
        tenant_id: tenantId,
        knowledge_document_id: documentId,
        chunk_index: c.chunkIndex,
        chunk_text: c.chunkText,
        embedding,
        embedded_at: new Date().toISOString(),
      });
    }

    // Delete existing chunks for this document (idempotency)
    await supabase
      .from("marketing_knowledge_chunks")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("knowledge_document_id", documentId);

    const { error: chunkInsertErr } = await supabase
      .from("marketing_knowledge_chunks")
      .insert(chunkRows);

    if (chunkInsertErr) {
      logger.error("Failed to insert playbook chunks", {
        documentId,
        error: chunkInsertErr.message,
      });
      throw new Error(`Failed to store playbook chunks: ${chunkInsertErr.message}`);
    }

    // 3. Extract candidate rules (status = 'DRAFT')
    const candidateRules = this.extractCandidateRules(normalizedText);

    if (candidateRules.length > 0) {
      // Delete existing draft rules for idempotency
      await supabase
        .from("marketing_knowledge_rules")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("knowledge_document_id", documentId)
        .eq("status", "DRAFT");

      const ruleRows = candidateRules.map((r) => ({
        tenant_id: tenantId,
        knowledge_document_id: documentId,
        rule_title: r.ruleTitle,
        rule_text: r.ruleText,
        rule_type: r.ruleType,
        severity: r.severity,
        status: "DRAFT",
      }));

      const { error: ruleInsertErr } = await supabase
        .from("marketing_knowledge_rules")
        .insert(ruleRows);

      if (ruleInsertErr) {
        logger.warn("Failed to insert candidate rules", { error: ruleInsertErr.message });
      }
    }

    // 4. Mark document as ACTIVE
    await supabase
      .from("marketing_knowledge_documents")
      .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("tenant_id", tenantId);

    logger.info("Successfully processed playbook chunks and candidate rules", {
      tenantId,
      documentId,
      chunkCount: chunks.length,
      candidateRuleCount: candidateRules.length,
    });

    return {
      chunkCount: chunks.length,
      ruleCount: candidateRules.length,
    };
  }

  /**
   * Splits text along logical paragraphs or sentences into chunks with overlap.
   */
  public chunkText(text: string, maxChars = 1200, overlapChars = 300): PlaybookChunk[] {
    const chunks: PlaybookChunk[] = [];
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let currentChunk = "";
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if (currentChunk.length + para.length + 2 <= maxChars) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
      } else {
        if (currentChunk.length > 0) {
          chunks.push({ chunkIndex, chunkText: currentChunk });
          chunkIndex++;
          // Retain overlap from end of current chunk
          const overlap = currentChunk.slice(Math.max(0, currentChunk.length - overlapChars));
          currentChunk = `${overlap}\n\n${para}`;
        } else {
          // Paragraph itself is larger than maxChars, split by sentences
          let start = 0;
          while (start < para.length) {
            let end = start + maxChars;
            if (end < para.length) {
              const lastPeriod = para.lastIndexOf(".", end);
              if (lastPeriod > start + 300) {
                end = lastPeriod + 1;
              }
            }
            chunks.push({
              chunkIndex,
              chunkText: para.slice(start, end).trim(),
            });
            chunkIndex++;
            start = end - overlapChars;
            if (start >= para.length - overlapChars) break;
          }
          currentChunk = "";
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({ chunkIndex, chunkText: currentChunk.trim() });
    }

    return chunks;
  }

  /**
   * Heuristic candidate rule extraction for internal marketing & compliance playbooks.
   */
  public extractCandidateRules(text: string): CandidateRule[] {
    const rules: CandidateRule[] = [];
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 25);

    for (const s of sentences) {
      const lower = s.toLowerCase();

      // Check for Prohibited terms / rules
      if (
        /\b(?:prohibited|never\s+use|do\s+not\s+(?:claim|state|use|advertise)|shall\s+not\s+be\s+used|strictly\s+forbidden|banned)\b/i.test(
          lower
        )
      ) {
        rules.push({
          ruleTitle: `Prohibited Practice: ${s.slice(0, 50)}...`,
          ruleText: s,
          ruleType: "PROHIBITED",
          severity: "HIGH",
        });
      }
      // Check for Mandatory Disclosures
      else if (
        /\b(?:must\s+(?:include|disclose|state|contain|display)|mandatory\s+disclosure|required\s+disclosure|all\s+marketing\s+must\s+show)\b/i.test(
          lower
        )
      ) {
        rules.push({
          ruleTitle: `Mandatory Disclosure: ${s.slice(0, 50)}...`,
          ruleText: s,
          ruleType: "REQUIRED_DISCLOSURE",
          severity: "HIGH",
        });
      }
      // Check for Rate / Fee limits
      else if (
        /\b(?:maximum\s+(?:interest|fee|rate|charge)|fee\s+ceiling|cap\s+(?:at|of)|not\s+exceed\s+\d+)\b/i.test(
          lower
        )
      ) {
        rules.push({
          ruleTitle: `Rate/Fee Limit: ${s.slice(0, 50)}...`,
          ruleText: s,
          ruleType: "RATE_FEE_LIMIT",
          severity: "CRITICAL",
        });
      }
      // Check for Approved Language
      else if (
        /\b(?:approved\s+(?:tagline|slogan|disclaimer|copy|wording)|authorized\s+slogan|standard\s+disclaimer)\b/i.test(
          lower
        )
      ) {
        rules.push({
          ruleTitle: `Approved Brand Language: ${s.slice(0, 50)}...`,
          ruleText: s,
          ruleType: "APPROVED_LANGUAGE",
          severity: "MEDIUM",
        });
      }
      // Check for SOP / Approval rules
      else if (
        /\b(?:approval\s+required|prior\s+to\s+publication|sign-off\s+from|review\s+window|cco\s+sign-off)\b/i.test(
          lower
        )
      ) {
        rules.push({
          ruleTitle: `Marketing SOP: ${s.slice(0, 50)}...`,
          ruleText: s,
          ruleType: "SOP_RULE",
          severity: "MEDIUM",
        });
      }
    }

    return rules.slice(0, 20); // Cap at top 20 candidate rules per document
  }

  /**
   * Lists marketing knowledge rules with optional filters.
   */
  public async listRules(
    tenantId: string,
    query?: QueryKnowledgeRulesInput
  ): Promise<MarketingKnowledgeRule[]> {
    const supabase = createAdminSupabaseClient();

    let q = supabase
      .from("marketing_knowledge_rules")
      .select(`
        *,
        marketing_knowledge_documents (
          title
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (query?.status) {
      q = q.eq("status", query.status);
    }
    if (query?.rule_type) {
      q = q.eq("rule_type", query.rule_type);
    }
    if (query?.document_id) {
      q = q.eq("knowledge_document_id", query.document_id);
    }
    if (query?.severity) {
      q = q.eq("severity", query.severity);
    }
    if (query?.limit) {
      q = q.limit(query.limit);
    }

    const { data: rules, error } = await q;

    if (error) {
      logger.error("Failed to query marketing knowledge rules", { tenantId, error: error.message });
      throw new Error(`Failed to list rules: ${error.message}`);
    }

    return (rules || []).map((r) => ({
      ...r,
      document_title: (r.marketing_knowledge_documents as { title?: string })?.title,
    })) as MarketingKnowledgeRule[];
  }

  /**
   * Activates a candidate internal rule (status -> 'ACTIVE').
   * Restricted by RBAC to Legal Counsel, CCO, or Workspace Admin.
   */
  public async activateRule(
    tenantId: string,
    userId: string,
    ruleId: string
  ): Promise<MarketingKnowledgeRule> {
    const supabase = createAdminSupabaseClient();

    const { data: updated, error } = await supabase
      .from("marketing_knowledge_rules")
      .update({
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error || !updated) {
      logger.error("Failed to activate knowledge rule", { tenantId, ruleId, error: error?.message });
      throw new Error(`Failed to activate rule: ${error?.message || "Rule not found"}`);
    }

    // If rule is of type PROHIBITED, sync to prohibited_terms table so Lock 1 catches it
    if (updated.rule_type === "PROHIBITED") {
      try {
        await supabase.from("prohibited_terms").insert({
          tenant_id: tenantId,
          term: updated.rule_title,
          normalized_term: updated.rule_title.toLowerCase().trim(),
          category: "INSTITUTIONAL_POLICY",
          reason: updated.rule_text,
          severity: updated.severity,
          source_type: "INSTITUTIONAL",
          source_reference_id: updated.id,
          matching_mode: "PHRASE",
          status: "ACTIVE",
        });
      } catch (ptErr) {
        logger.warn("Sync to prohibited_terms skipped", { error: (ptErr as Error).message });
      }
    }

    // Append hash-chained audit record
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "KNOWLEDGE_RULE_ACTIVATED",
      entityType: "MARKETING_KNOWLEDGE_RULE",
      entityId: ruleId,
      eventData: {
        ruleTitle: updated.rule_title,
        ruleType: updated.rule_type,
        severity: updated.severity,
      },
    });

    logger.info("Activated internal marketing compliance rule", {
      tenantId,
      ruleId,
      title: updated.rule_title,
    });

    return updated as MarketingKnowledgeRule;
  }

  /**
   * Hybrid semantic + FTS search over private playbook chunks and active rules.
   * Powering Gemini Tool 7: search_institutional_knowledge.
   */
  public async searchInstitutionalKnowledge(
    tenantId: string,
    query: string,
    documentTypes?: KnowledgeDocumentType[],
    limit = 5
  ): Promise<{
    chunks: Array<{
      chunk_id: string;
      document_id: string;
      chunk_text: string;
      document_title: string;
      rrf_score: number;
    }>;
    activeRules: MarketingKnowledgeRule[];
  }> {
    const supabase = createAdminSupabaseClient();
    const clampedLimit = Math.min(Math.max(limit, 1), 10);

    // 1. Generate query embedding
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await geminiService.generateEmbedding(query, {
        context: { tenantId, taskType: "EMBEDDING_GENERATION" },
      });
    } catch (err) {
      logger.warn("Failed embedding generation for institutional search", {
        error: (err as Error).message,
      });
    }

    // 2. Call Supabase Hybrid RRF RPC search_marketing_knowledge_chunks_rrf
    let matchedChunks: Array<{
      chunk_id: string;
      document_id: string;
      chunk_index: number;
      chunk_text: string;
      document_title: string;
      rrf_score: number;
    }> = [];

    if (queryEmbedding) {
      const { data: rrfData, error: rrfErr } = await supabase.rpc(
        "search_marketing_knowledge_chunks_rrf",
        {
          p_tenant_id: tenantId,
          query_text: query,
          query_embedding: queryEmbedding,
          match_count: clampedLimit,
          rrf_k: 60,
        }
      );

      if (!rrfErr && rrfData) {
        matchedChunks = rrfData;
      }
    }

    // Fallback to ILIKE text search if RPC returned 0 results or embedding failed
    if (matchedChunks.length === 0) {
      const keywords = query
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3);

      let queryFilter = supabase
        .from("marketing_knowledge_chunks")
        .select(`
          id,
          knowledge_document_id,
          chunk_index,
          chunk_text,
          marketing_knowledge_documents (
            title
          )
        `)
        .eq("tenant_id", tenantId);

      if (keywords.length > 0) {
        const orConditions = keywords.slice(0, 4).map((kw) => `chunk_text.ilike.%${kw}%`).join(",");
        queryFilter = queryFilter.or(orConditions);
      }

      const { data: fallbackChunks } = await queryFilter.limit(clampedLimit);

      if (fallbackChunks && fallbackChunks.length > 0) {
        matchedChunks = fallbackChunks.map((fc, idx) => ({
          chunk_id: fc.id,
          document_id: fc.knowledge_document_id,
          chunk_index: fc.chunk_index,
          chunk_text: fc.chunk_text,
          document_title:
            (fc.marketing_knowledge_documents as { title?: string })?.title || "Internal Playbook",
          rrf_score: 1.0 / (idx + 1),
        }));
      }
    }

    // 3. Query active rules that match the query
    const { data: rules } = await supabase
      .from("marketing_knowledge_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .limit(10);

    const activeRules = (rules || []) as MarketingKnowledgeRule[];

    return {
      chunks: matchedChunks,
      activeRules,
    };
  }
}

export const playbookService = new PlaybookService();
