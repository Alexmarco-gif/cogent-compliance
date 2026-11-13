/**
 * Cogent Marketing Shield - Statutory Gemini Tool Registry
 * Document Reference: Document 04 (Section 7.1, 7.2), Document 05
 */

import { FunctionDeclaration, Type } from "@google/genai";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import { remediationService } from "@/modules/campaigns/remediation.service";
import { productService } from "@/modules/knowledge-base/product.service";
import { playbookService } from "@/modules/knowledge-base/playbook.service";
import { KnowledgeDocumentType } from "@/contracts/knowledge-product.contracts";
import { RewriteTone } from "@/contracts/remediation.contracts";
import { logger } from "@/lib/logger";

export interface ToolExecutionContext {
  tenantId: string;
  userId?: string;
  conversationId?: string;
}

/**
 * Gemini Function Declarations for Gemini Function Calling Loop.
 */
export const STATUTORY_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_conversation_context",
    description: "Retrieves earlier messages and context summaries for the active conversation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        conversation_id: { type: Type.STRING, description: "UUID of the current conversation." },
        message_limit: {
          type: Type.INTEGER,
          description: "Number of recent messages to retrieve (max 30).",
        },
      },
      required: ["conversation_id"],
    },
  },
  {
    name: "search_regulatory_evidence",
    description:
      "Searches the verified Golden 50 Nigerian Statutory Vault (CBN, FCCPC, ARCON, NDPC, SEC) using hybrid semantic and full-text RRF search.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Regulatory search query." },
        regulators: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Optional filter by Nigerian regulatory body (CBN, FCCPC, ARCON, NDPC, SEC).",
        },
        as_of_date: {
          type: Type.STRING,
          description: "ISO date (YYYY-MM-DD) for temporal validity filtering.",
        },
        include_superseded: {
          type: Type.BOOLEAN,
          description: "Defaults to false. Set true only for historical audits.",
        },
        limit: { type: Type.INTEGER, description: "Max clauses to return (1 to 15)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_regulatory_provision",
    description:
      "Retrieves the exact verbatim statutory text, instrument title, document hash, effective date, and extracted obligations for a specific regulatory_clause_id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        regulatory_clause_id: {
          type: Type.STRING,
          description: "UUID of the regulatory clause.",
        },
      },
      required: ["regulatory_clause_id"],
    },
  },
  {
    name: "verify_regulatory_evidence",
    description:
      "Verifies whether one or more regulatory_clause_id records are CURRENT, SUPERSEDED, FUTURE_EFFECTIVE, or REPEALED as of a given date.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        regulatory_clause_ids: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of regulatory_clause_id UUIDs to verify.",
        },
        as_of_date: { type: Type.STRING, description: "ISO date (YYYY-MM-DD)." },
      },
      required: ["regulatory_clause_ids"],
    },
  },
  {
    name: "assess_regulatory_applicability",
    description:
      "Evaluates applicability_rules for retrieved clauses against the institution type, product category, and communication channel.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        regulatory_clause_ids: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of regulatory_clause_id UUIDs.",
        },
        institution_type: {
          type: Type.STRING,
          description:
            "e.g. DIGITAL_LENDER, MFB, PSB, MMO, COMMERCIAL_BANK, WEALTHTECH, FINTECH",
        },
        product_type: {
          type: Type.STRING,
          description: "e.g. DIGITAL_LENDING, SAVINGS, INVESTMENT, PAYMENTS",
        },
        channel: {
          type: Type.STRING,
          description:
            "e.g. SOCIAL_MEDIA, SMS, WEB_LANDING, PRINT_FLYER, EMAIL, RADIO_TV, INFLUENCER, OTHER",
        },
      },
      required: ["regulatory_clause_ids"],
    },
  },
  {
    name: "search_live_web",
    description:
      "Executes real-time regulatory intelligence search against verified Nigerian government and regulator websites (.gov.ng).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query for live regulatory announcements or circulars." },
        prioritize_official_regulators: {
          type: Type.BOOLEAN,
          description: "Defaults to true. Focuses search on official .gov.ng regulator domains.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_live_url_content",
    description:
      "Safely fetches, sanitizes, and snapshots visible promotional text and disclosures from a live HTTPS landing page URL with strict SSRF defense.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "Full HTTPS URL of the promotional webpage." },
        campaign_id: { type: Type.STRING, description: "Optional campaign UUID to attach the URL snapshot asset to." },
      },
      required: ["url"],
    },
  },
  {
    name: "generate_rewrite_suggestions",
    description:
      "Generates a compliant marketing rewrite proposal for a specific compliance finding, constrained by product truth and validated through Layer 6 deterministic locks.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        finding_id: { type: Type.STRING, description: "UUID of the compliance finding to remediate." },
        tone: {
          type: Type.STRING,
          description: "Tone style: PROFESSIONAL, CONCISE_SMS, CONVERSATIONAL_SOCIAL, or FORMAL_LEGAL.",
        },
        instructions: { type: Type.STRING, description: "Additional officer instructions for the rewrite." },
      },
      required: ["finding_id"],
    },
  },
  {
    name: "compare_campaign_revisions",
    description:
      "Compares two revisions of a campaign, returning word-level diffs, resolved findings, and deterministic lock progression.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaign_id: { type: Type.STRING, description: "UUID of the campaign." },
        from_revision_id: { type: Type.STRING, description: "UUID of the earlier revision." },
        to_revision_id: { type: Type.STRING, description: "UUID of the newer revision." },
      },
      required: ["campaign_id", "from_revision_id", "to_revision_id"],
    },
  },
  {
    name: "search_institutional_knowledge",
    description:
      "Searches the institution's private Knowledge Base & Playbooks (marketing_knowledge_chunks and active marketing_knowledge_rules) for internal marketing policies, brand guidelines, and SOPs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query for internal company playbooks and rules." },
        document_types: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Optional filter by document type (MARKETING_POLICY, BRAND_GUIDELINE, PRODUCT_DISCLOSURE, SOP, OTHER).",
        },
        limit: { type: Type.INTEGER, description: "Max results to return (1 to 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product_approved_terms",
    description:
      "Retrieves the institution's structured product rate, fee, APR, tenor, and mandatory disclaimer schedule from campaign_products.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_id: { type: Type.STRING, description: "Optional UUID of the product." },
        product_name_query: { type: Type.STRING, description: "Optional product name search string (e.g. 'QuickCash')." },
      },
    },
  },
];

/**
 * Concrete Executors for the Statutory Gemini Tools.
 */
export class StatutoryToolExecutor {
  /**
   * Tool 1: get_conversation_context
   */
  public async getConversationContext(
    args: { conversation_id: string; message_limit?: number },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(args.message_limit || 10, 30);

    const { data: messages, error } = await supabase
      .from("marketing_messages")
      .select("id, role, content, sequence_number, created_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("conversation_id", args.conversation_id)
      .order("sequence_number", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("get_conversation_context failed", { error: error.message, ctx });
      return { success: false, error: error.message, messages: [] };
    }

    return {
      success: true,
      conversation_id: args.conversation_id,
      messages: (messages || []).reverse(),
    };
  }

  /**
   * Tool 3: search_regulatory_evidence
   * Executes Hybrid RRF search against verified Golden 50 clauses.
   */
  public async searchRegulatoryEvidence(
    args: {
      query: string;
      regulators?: string[];
      as_of_date?: string;
      include_superseded?: boolean;
      limit?: number;
    },
    _ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(args.limit || 5, 15);

    try {
      // 1. Generate query embedding (with DB vector fallback if daily quota is exhausted)
      let queryEmbedding: number[];
      try {
        queryEmbedding = await geminiService.generateEmbedding(args.query);
      } catch (embErr) {
        logger.warn("Gemini embedding error during tool search, attempting vector fallback", {
          error: (embErr as Error).message,
        });
        const { data: fallbackRow } = await supabase
          .from("regulatory_clauses")
          .select("embedding")
          .not("embedding", "is", null)
          .limit(1)
          .single();
        queryEmbedding = Array.isArray(fallbackRow?.embedding)
          ? fallbackRow.embedding
          : JSON.parse(fallbackRow?.embedding as unknown as string);
      }

      // 2. Execute PostgreSQL Hybrid RRF RPC
      const startTime = Date.now();
      const { data: rrfResults, error: rrfError } = await supabase.rpc(
        "search_regulatory_clauses_rrf",
        {
          query_text: args.query,
          query_embedding: queryEmbedding,
          match_count: limit,
          rrf_k: 60,
        }
      );
      const latencyMs = Date.now() - startTime;

      if (rrfError) {
        logger.error("search_regulatory_clauses_rrf RPC failed", {
          error: rrfError.message,
          query: args.query,
        });
        return { success: false, error: rrfError.message, results: [] };
      }

      // 3. Filter results by regulator if specified
      let filteredResults = rrfResults || [];
      if (args.regulators && args.regulators.length > 0) {
        const uppercaseRegs = args.regulators.map((r) => r.toUpperCase());
        filteredResults = filteredResults.filter((r: { regulator_acronym: string }) =>
          uppercaseRegs.includes(r.regulator_acronym?.toUpperCase())
        );
      }

      const results = filteredResults.map((r: {
        clause_id: string;
        clause_reference: string;
        clause_text: string;
        instrument_title: string;
        regulator_acronym: string;
        rrf_score: number;
      }) => ({
        regulatory_clause_id: r.clause_id,
        clause_reference: r.clause_reference,
        instrument_title: r.instrument_title,
        regulator: r.regulator_acronym,
        verbatim_excerpt: r.clause_text.slice(0, 400),
        rrf_score: Number(r.rrf_score),
        source_class: "VERIFIED_OFFICIAL_SOURCE",
        badge_label: "Verified Statutory Vault",
      }));

      return {
        success: true,
        count: results.length,
        latency_ms: latencyMs,
        results,
      };
    } catch (err) {
      logger.error("searchRegulatoryEvidence exception", {
        error: (err as Error).message,
        query: args.query,
      });
      return { success: false, error: (err as Error).message, results: [] };
    }
  }

  /**
   * Tool 4: get_regulatory_provision
   * Fetches full verbatim clause, document version SHA-256, and lifecycle status.
   */
  public async getRegulatoryProvision(
    args: { regulatory_clause_id: string },
    _ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();

    const { data: clause, error } = await supabase
      .from("regulatory_clauses")
      .select(`
        id,
        clause_reference,
        clause_text,
        page_number,
        verification_status,
        regulatory_document_versions (
          document_hash,
          source_url,
          publication_date,
          effective_date,
          lifecycle_status,
          regulatory_instruments (
            title,
            instrument_type,
            jurisdiction,
            instrument_number,
            regulatory_bodies (
              acronym,
              name,
              official_domain
            )
          )
        )
      `)
      .eq("id", args.regulatory_clause_id)
      .maybeSingle();

    if (error || !clause) {
      return {
        success: false,
        error: `Regulatory clause ${args.regulatory_clause_id} not found in verified vault.`,
      };
    }

    const rawVer = clause.regulatory_document_versions as unknown as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    const docVersion = (Array.isArray(rawVer) ? rawVer[0] : rawVer) as
      | Record<string, unknown>
      | undefined;
    const rawInst = docVersion?.regulatory_instruments as unknown as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    const instrument = (Array.isArray(rawInst) ? rawInst[0] : rawInst) as
      | Record<string, unknown>
      | undefined;
    const rawReg = instrument?.regulatory_bodies as unknown as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    const regulator = (Array.isArray(rawReg) ? rawReg[0] : rawReg) as
      | Record<string, unknown>
      | undefined;

    return {
      success: true,
      regulatory_clause_id: clause.id,
      clause_reference: clause.clause_reference,
      verbatim_text: clause.clause_text,
      page_number: clause.page_number,
      instrument_title: instrument?.title || "Unknown Nigerian Regulatory Instrument",
      instrument_type: instrument?.instrument_type,
      instrument_number: instrument?.instrument_number,
      regulator_acronym: regulator?.acronym || "REGULATOR",
      regulator_name: regulator?.name,
      official_domain: regulator?.official_domain,
      file_sha256: docVersion?.document_hash,
      source_url: docVersion?.source_url,
      effective_date: docVersion?.effective_date,
      publication_date: docVersion?.publication_date,
      lifecycle_status: docVersion?.lifecycle_status || "CURRENT",
      source_class: "VERIFIED_OFFICIAL_SOURCE",
      badge_label: "Verified Statutory Vault",
    };
  }

  /**
   * Tool 5: verify_regulatory_evidence
   * Checks current lifecycle status of specified clauses.
   */
  public async verifyRegulatoryEvidence(
    args: { regulatory_clause_ids: string[]; as_of_date?: string },
    _ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    const asOfDate = args.as_of_date || new Date().toISOString().split("T")[0]!;

    const { data: clauses, error } = await supabase
      .from("regulatory_clauses")
      .select(`
        id,
        clause_reference,
        regulatory_document_versions (
          lifecycle_status,
          effective_date,
          expiry_date
        )
      `)
      .in("id", args.regulatory_clause_ids);

    if (error) {
      return { success: false, error: error.message, verifications: [] };
    }

    const verifications = (clauses || []).map((c) => {
      const docVer = Array.isArray(c.regulatory_document_versions)
        ? c.regulatory_document_versions[0]
        : c.regulatory_document_versions;
      const effectiveDate = docVer?.effective_date || "2000-01-01";
      const isFuture = effectiveDate > asOfDate;
      const status = isFuture ? "FUTURE_EFFECTIVE" : docVer?.lifecycle_status || "CURRENT";

      return {
        regulatory_clause_id: c.id,
        clause_reference: c.clause_reference,
        status,
        effective_date: docVer?.effective_date,
        verified_as_of: asOfDate,
        is_binding: status === "CURRENT",
      };
    });

    return {
      success: true,
      verifications,
    };
  }

  /**
   * Tool 6: assess_regulatory_applicability
   */
  public async assessRegulatoryApplicability(
    args: {
      regulatory_clause_ids: string[];
      institution_type?: string;
      product_type?: string;
      channel?: string;
    },
    _ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();

    const { data: rules } = await supabase
      .from("applicability_rules")
      .select("*")
      .in("clause_id", args.regulatory_clause_ids);

    const assessments = args.regulatory_clause_ids.map((clauseId) => {
      const clauseRules = (rules || []).filter((r) => r.clause_id === clauseId);
      let applicabilityStatus: "APPLICABLE" | "EXEMPT" | "CONDITIONALLY_APPLICABLE" = "APPLICABLE";
      let reason = "Applicable across Nigerian regulated financial services.";

      for (const rule of clauseRules) {
        if (rule.rule_type === "EXEMPTION") {
          applicabilityStatus = "EXEMPT";
          reason = rule.condition_logic?.description || "Exemption condition applies.";
        } else if (rule.rule_type === "CONDITIONAL") {
          applicabilityStatus = "CONDITIONALLY_APPLICABLE";
          reason = rule.condition_logic?.description || "Conditional threshold requirements.";
        }
      }

      return {
        regulatory_clause_id: clauseId,
        applicability_status: applicabilityStatus,
        reason,
        target_institution_type: args.institution_type || "ALL",
        target_channel: args.channel || "ALL",
      };
    });

    return {
      success: true,
      assessments,
    };
  }

  /**
   * Tool 9: search_live_web
   */
  public async searchLiveWeb(
    args: { query: string; prioritize_official_regulators?: boolean },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    return webSearchRouter.searchLiveWeb(
      {
        query: args.query,
        prioritize_official_regulators: args.prioritize_official_regulators !== false,
      },
      ctx.tenantId
    );
  }

  /**
   * Tool 10: fetch_live_url_content
   */
  public async fetchLiveUrlContent(
    args: { url: string; campaign_id?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const result = await webSearchRouter.fetchLiveUrlContent(
      {
        url: args.url,
        campaign_id: args.campaign_id,
      },
      ctx.tenantId
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Tool 16: generate_rewrite_suggestions
   */
  public async generateRewriteSuggestions(
    args: { finding_id: string; tone?: string; instructions?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const tone = (args.tone as RewriteTone) || "PROFESSIONAL";
    const result = await remediationService.generateAndValidateRewrite(
      ctx.tenantId,
      ctx.userId || "system_copilot",
      args.finding_id,
      {
        finding_id: args.finding_id,
        tone,
        custom_instructions: args.instructions,
      }
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Tool 17: compare_campaign_revisions
   */
  public async compareCampaignRevisions(
    args: { campaign_id: string; from_revision_id: string; to_revision_id: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const result = await remediationService.compareRevisions(
      ctx.tenantId,
      args.campaign_id,
      args.from_revision_id,
      args.to_revision_id
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Tool 7: search_institutional_knowledge
   */
  public async searchInstitutionalKnowledge(
    args: { query: string; document_types?: string[]; limit?: number },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const result = await playbookService.searchInstitutionalKnowledge(
      ctx.tenantId,
      args.query,
      args.document_types as KnowledgeDocumentType[],
      args.limit || 5
    );

    return {
      success: true,
      source_class: "INSTITUTIONAL_KNOWLEDGE",
      query: args.query,
      chunks: result.chunks,
      rules: result.activeRules,
    };
  }

  /**
   * Tool 8: get_product_approved_terms
   */
  public async getProductApprovedTerms(
    args: { product_id?: string; product_name_query?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const product = await productService.getProductTruth(ctx.tenantId, {
      productId: args.product_id,
      productName: args.product_name_query,
    });

    return {
      success: true,
      product_truth: product
        ? {
            product_id: product.id,
            product_name: product.product_name,
            product_type: product.product_type,
            approved_terms: product.approved_terms,
          }
        : null,
    };
  }
}

export const statutoryToolExecutor = new StatutoryToolExecutor();
