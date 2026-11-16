/**
 * Cogent Marketing Shield - 23-Tool Autonomous Nigerian Compliance Analyst Registry
 * Document Reference: Document 04 (Section 7.1, 7.2), Document 05, Document 13 (Section 4)
 *
 * Exposes all 17 Document 04 tools + 6 Document 13 Nigerian Deterministic & Forensic Analyst tools.
 */

import { FunctionDeclaration, Type } from "@google/genai";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import { remediationService } from "@/modules/campaigns/remediation.service";
import { productService } from "@/modules/knowledge-base/product.service";
import { playbookService } from "@/modules/knowledge-base/playbook.service";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import { claimExtractorEngine } from "@/modules/compliance-assessment/claim-extractor";
import {
  aprCalculatorService,
  RatePeriodType,
} from "@/modules/compliance-assessment/apr-calculator.service";
import { visualForensicsService } from "@/modules/asset-processing/visual-forensics.service";
import { appStoreAuditorService } from "@/modules/compliance-assessment/app-store-auditor.service";
import { licenseScopeService } from "@/modules/compliance-assessment/license-scope.service";
import { kfsGeneratorService } from "@/modules/compliance-assessment/kfs-generator.service";
import { precedentMemoryService } from "@/modules/ai-orchestration/precedent-memory.service";
import { KnowledgeDocumentType } from "@/contracts/knowledge-product.contracts";
import { RewriteTone } from "@/contracts/remediation.contracts";
import { logger } from "@/lib/logger";

export interface ToolExecutionContext {
  tenantId: string;
  userId?: string;
  conversationId?: string;
}

/**
 * Complete 23-Tool Gemini Function Declarations for Autonomous Compliance Workflows.
 */
export const STATUTORY_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  // 1. get_conversation_context
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
  // 2. get_campaign_context
  {
    name: "get_campaign_context",
    description:
      "Retrieves campaign metadata, current revision text, linked product terms, assets, and deterministic lock statuses.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaign_id: { type: Type.STRING, description: "UUID of the campaign." },
        revision_id: {
          type: Type.STRING,
          description: "Optional specific revision UUID. Defaults to current_revision_id.",
        },
      },
      required: ["campaign_id"],
    },
  },
  // 3. search_regulatory_evidence
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
          description:
            "Optional filter by Nigerian regulatory body (CBN, FCCPC, ARCON, NDPC, SEC).",
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
  // 4. get_regulatory_provision
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
  // 5. verify_regulatory_evidence
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
  // 6. assess_regulatory_applicability
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
  // 7. search_institutional_knowledge
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
          description:
            "Optional filter by document type (MARKETING_POLICY, BRAND_GUIDELINE, PRODUCT_DISCLOSURE, SOP, OTHER).",
        },
        limit: { type: Type.INTEGER, description: "Max results to return (1 to 10)." },
      },
      required: ["query"],
    },
  },
  // 8. get_product_approved_terms
  {
    name: "get_product_approved_terms",
    description:
      "Retrieves the institution's structured product rate, fee, APR, tenor, and mandatory disclaimer schedule from campaign_products.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_id: { type: Type.STRING, description: "Optional UUID of the product." },
        product_name_query: {
          type: Type.STRING,
          description: "Optional product name search string (e.g. 'QuickCash').",
        },
      },
    },
  },
  // 9. search_live_web
  {
    name: "search_live_web",
    description:
      "Performs real-time live web search and intelligence retrieval across the Nigerian internet, covering official CBN/FCCPC/ARCON/NDPC/SEC circulars and enforcement news.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Search query for live intelligence, market news, corporate actions, or regulatory circulars.",
        },
        prioritize_official_regulators: {
          type: Type.BOOLEAN,
          description:
            "Optional flag to highlight official regulator perspectives (.gov.ng) alongside broader intelligence.",
        },
      },
      required: ["query"],
    },
  },
  // 10. fetch_live_url_content
  {
    name: "fetch_live_url_content",
    description:
      "Safely fetches, sanitizes, and snapshots visible promotional text and disclosures from a live HTTPS landing page URL with strict SSRF defense.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "Full HTTPS URL of the promotional webpage." },
        campaign_id: {
          type: Type.STRING,
          description: "Optional campaign UUID to attach the URL snapshot asset to.",
        },
      },
      required: ["url"],
    },
  },
  // 11. get_campaign_asset_content
  {
    name: "get_campaign_asset_content",
    description:
      "Retrieves extracted text, page numbers, and OCR segments (with bounding-box provenance) for an uploaded flyer, PDF, or DOCX asset.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        asset_id: { type: Type.STRING, description: "UUID of the campaign asset." },
      },
      required: ["asset_id"],
    },
  },
  // 12. extract_campaign_claims
  {
    name: "extract_campaign_claims",
    description:
      "Extracts and categorizes discrete promotional claims from a campaign revision's text and attached assets across the 11 controlled statutory claim categories.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaign_id: { type: Type.STRING, description: "UUID of the campaign." },
        revision_id: { type: Type.STRING, description: "UUID of the campaign revision." },
      },
      required: ["campaign_id", "revision_id"],
    },
  },
  // 13. run_deterministic_compliance_locks
  {
    name: "run_deterministic_compliance_locks",
    description:
      "Executes Deterministic Lock 1 (Prohibited Terms), Lock 2 (Product Rate/Fee Schedule Match against campaign_products), and Lock 3 (Mandatory Disclosures Check).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaign_id: { type: Type.STRING, description: "Optional UUID of the campaign." },
        revision_id: { type: Type.STRING, description: "Optional UUID of the campaign revision." },
        content_text: {
          type: Type.STRING,
          description: "Optional direct promotional copy to scan if no revision_id is provided.",
        },
        product_id: {
          type: Type.STRING,
          description: "Optional product UUID to verify rates and fees against.",
        },
      },
    },
  },
  // 14. assess_campaign_compliance
  {
    name: "assess_campaign_compliance",
    description:
      "Runs the complete Autonomous Campaign Assessment pipeline (Deterministic Locks + APR Math + Statutory Retrieval + 7-Layer Guardrails) and persists compliance_findings.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaign_id: { type: Type.STRING, description: "UUID of the campaign." },
        revision_id: { type: Type.STRING, description: "UUID of the campaign revision to assess." },
        include_live_web_check: {
          type: Type.BOOLEAN,
          description: "Set true if real-time regulatory updates should also be checked.",
        },
      },
      required: ["campaign_id", "revision_id"],
    },
  },
  // 15. get_compliance_findings
  {
    name: "get_compliance_findings",
    description:
      "Retrieves all persisted compliance_findings and linked finding_evidence records for a campaign revision.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaign_id: { type: Type.STRING, description: "UUID of the campaign." },
        revision_id: { type: Type.STRING, description: "Optional UUID of the campaign revision." },
      },
      required: ["campaign_id"],
    },
  },
  // 16. generate_rewrite_suggestions
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
          description:
            "Tone style: PROFESSIONAL, CONCISE_SMS, CONVERSATIONAL_SOCIAL, or FORMAL_LEGAL.",
        },
        instructions: {
          type: Type.STRING,
          description: "Additional officer instructions for the rewrite.",
        },
      },
      required: ["finding_id"],
    },
  },
  // 17. compare_campaign_revisions
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
  // 18. calculate_effective_apr_and_drip_fees
  {
    name: "calculate_effective_apr_and_drip_fees",
    description:
      "Deterministic CBN & FCCPC DEON financial math engine. Computes true Effective APR, IRR, Net Disbursed Cash, Total Cost of Credit, and catches 'Marketing vs. App' rate mismatches and hidden drip pricing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        principal_ngn: {
          type: Type.NUMBER,
          description: "Loan principal in NGN (defaults to 50000).",
        },
        advertised_rate_percent: {
          type: Type.NUMBER,
          description: "Headline interest rate percentage advertised in the ad (e.g. 5 for 5%).",
        },
        advertised_rate_period: {
          type: Type.STRING,
          description: "DAILY, MONTHLY, ANNUAL, or FLAT_PER_TENOR.",
        },
        tenor_days: {
          type: Type.INTEGER,
          description: "Loan repayment tenor in calendar days (e.g. 15, 30, 90).",
        },
        processing_fee_percent: {
          type: Type.NUMBER,
          description: "Upfront processing fee percentage.",
        },
        processing_fee_flat_ngn: {
          type: Type.NUMBER,
          description: "Flat processing/admin fee in Naira (e.g. 2500).",
        },
        management_fee_percent: {
          type: Type.NUMBER,
          description: "Management or insurance fee percentage.",
        },
        daily_penalty_percent: {
          type: Type.NUMBER,
          description: "Daily late payment penalty percentage.",
        },
        product_id: {
          type: Type.STRING,
          description: "Optional product_id to pull hidden fees/tenors from campaign_products.",
        },
      },
      required: ["advertised_rate_percent", "tenor_days"],
    },
  },
  // 19. audit_flyer_visual_forensics
  {
    name: "audit_flyer_visual_forensics",
    description:
      "Audits an uploaded promotional flyer's bounding boxes and OCR text for microscopic fine print (< 12% of headline height), missing ARCON ASP Pre-Vetting Certificate ID, and unqualified NDIC claims.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        asset_id: {
          type: Type.STRING,
          description: "UUID of the uploaded campaign asset.",
        },
        flyer_text: {
          type: Type.STRING,
          description: "Optional flyer text if auditing inline copy without an asset_id.",
        },
      },
    },
  },
  // 20. audit_app_store_listing
  {
    name: "audit_app_store_listing",
    description:
      "Audits Google Play / Apple App Store descriptions or landing page copy against Google Play Nigeria Personal Loan Rules (< 60 days repayment ban, mandatory KFS example), FCCPC DEON contact-scraping ban, and NDPC GAID 2025 dark-pattern consent.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        listing_text: {
          type: Type.STRING,
          description: "App store description or landing page copy to audit.",
        },
        product_id: {
          type: Type.STRING,
          description: "Optional product UUID to cross-reference tenor and APR bounds.",
        },
      },
      required: ["listing_text"],
    },
  },
  // 21. verify_license_scope_matrix
  {
    name: "verify_license_scope_matrix",
    description:
      "Verifies whether the financial products promoted in the campaign (lending, deposit-taking, investment yields, nationwide operations) are permitted under the institution's CBN/FCCPC/SEC license tier.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content_text: {
          type: Type.STRING,
          description: "Promotional copy to check against license boundaries.",
        },
        license_tier: {
          type: Type.STRING,
          description:
            "Optional license tier override (e.g. PSB_PAYMENT_SERVICE_BANK, MMO_MOBILE_MONEY, MFB_STATE, FCCPC_DIGITAL_LENDER).",
        },
      },
      required: ["content_text"],
    },
  },
  // 22. generate_kfs_and_channel_kit
  {
    name: "generate_kfs_and_channel_kit",
    description:
      "Deterministically generates a CBN-compliant Key Facts Statement (KFS) table, 160-character SMS copy, Lock-verified Social flyer copy, and an ARCON ASP Pre-Vetting Substantiation Memo.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_id: {
          type: Type.STRING,
          description: "Optional UUID of the product in campaign_products.",
        },
        product_name: {
          type: Type.STRING,
          description: "Product name if no product_id is specified.",
        },
        principal_ngn: {
          type: Type.NUMBER,
          description: "Sample loan principal in Naira (default 50000).",
        },
        interest_rate_percent: {
          type: Type.NUMBER,
          description: "Interest rate percentage.",
        },
        tenor_days: {
          type: Type.INTEGER,
          description: "Repayment tenor in days.",
        },
        processing_fee_flat_ngn: {
          type: Type.NUMBER,
          description: "Flat processing fee in Naira.",
        },
      },
    },
  },
  // 23. recall_institutional_precedents
  {
    name: "recall_institutional_precedents",
    description:
      "Recalls the institution's regulatory license profile, active product rate cards, and historical CCO/Legal approval rejections and compliance precedents across conversations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic_query: {
          type: Type.STRING,
          description: "Topic or product query to match against institutional memory.",
        },
      },
      required: ["topic_query"],
    },
  },
];

/**
 * Concrete Executors for all 23 Statutory & Autonomous Analyst Tools.
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
   * Tool 2: get_campaign_context
   */
  public async getCampaignContext(
    args: { campaign_id: string; revision_id?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    const { data: campaign, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", args.campaign_id)
      .maybeSingle();

    if (error || !campaign) {
      return { success: false, error: `Campaign ${args.campaign_id} not found.` };
    }

    const targetRevId = args.revision_id || campaign.current_revision_id;
    const [revRes, assetsRes, assessRes] = await Promise.all([
      targetRevId
        ? supabase
            .from("campaign_revisions")
            .select("*")
            .eq("tenant_id", ctx.tenantId)
            .eq("id", targetRevId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("campaign_assets")
        .select("id, original_filename, mime_type, processing_status")
        .eq("tenant_id", ctx.tenantId)
        .eq("campaign_id", args.campaign_id),
      supabase
        .from("campaign_assessments")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .eq("campaign_id", args.campaign_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      success: true,
      campaign,
      revision: revRes.data || null,
      assets: assetsRes.data || [],
      latest_assessment: assessRes.data || null,
    };
  }

  /**
   * Tool 3: search_regulatory_evidence
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

      const startTime = Date.now();
      const candidateFetchCount =
        args.regulators && args.regulators.length > 0 ? 50 : Math.max(limit * 3, 25);
      const { data: rrfResults, error: rrfError } = await supabase.rpc(
        "search_regulatory_clauses_rrf",
        {
          query_text: args.query,
          query_embedding: queryEmbedding,
          match_count: candidateFetchCount,
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

      let filteredResults = rrfResults || [];
      if (args.regulators && args.regulators.length > 0) {
        const uppercaseRegs = args.regulators.map((r) => r.toUpperCase());
        filteredResults = filteredResults.filter((r: { regulator_acronym: string }) =>
          uppercaseRegs.includes(r.regulator_acronym?.toUpperCase())
        );
      }

      const results = filteredResults.slice(0, limit).map(
        (r: {
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
        })
      );

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
    const storeAndLandingAudit = appStoreAuditorService.auditListingOrLandingPage({
      listingText: result.content_text,
      url: args.url,
    });
    return {
      success: true,
      data: {
        ...result,
        blind_spot_audit: storeAndLandingAudit,
      },
    };
  }

  /**
   * Tool 11: get_campaign_asset_content
   */
  public async getCampaignAssetContent(
    args: { asset_id: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    const [extRes, segRes] = await Promise.all([
      supabase
        .from("asset_extractions")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .eq("asset_id", args.asset_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("asset_extraction_segments")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .eq("asset_id", args.asset_id)
        .order("segment_index", { ascending: true }),
    ]);

    const visualAudit = await visualForensicsService.auditAssetById(ctx.tenantId, args.asset_id);

    return {
      success: true,
      asset_id: args.asset_id,
      extraction: extRes.data || null,
      segments: segRes.data || [],
      visual_forensics: visualAudit,
    };
  }

  /**
   * Tool 12: extract_campaign_claims
   */
  public async extractCampaignClaims(
    args: { campaign_id: string; revision_id: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    const { data: rev } = await supabase
      .from("campaign_revisions")
      .select("content_text")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", args.revision_id)
      .maybeSingle();

    const claims = await claimExtractorEngine.extractClaims({
      tenantId: ctx.tenantId,
      campaignId: args.campaign_id,
      revisionId: args.revision_id,
      contentText: rev?.content_text || "",
    });

    return {
      success: true,
      campaign_id: args.campaign_id,
      revision_id: args.revision_id,
      claims,
    };
  }

  /**
   * Tool 13: run_deterministic_compliance_locks
   */
  public async runDeterministicComplianceLocks(
    args: {
      campaign_id?: string;
      revision_id?: string;
      content_text?: string;
      product_id?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    let contentText = args.content_text || "";

    if (!contentText && args.revision_id) {
      const { data: rev } = await supabase
        .from("campaign_revisions")
        .select("content_text")
        .eq("tenant_id", ctx.tenantId)
        .eq("id", args.revision_id)
        .maybeSingle();
      contentText = rev?.content_text || "";
    }

    const product = await productService.getProductTruth(ctx.tenantId, {
      productId: args.product_id,
    });
    const terms = product?.approved_terms || {};

    const lockResult = await mechanicalLocksEngine.executeLocks({
      tenantId: ctx.tenantId,
      campaignId: args.campaign_id,
      contentText,
      productTruth: product
        ? {
            productName: product.product_name,
            productType: product.product_type,
            interestRateMin: terms.interest_rate_min,
            interestRateMax: terms.interest_rate_max,
            interestRateType: terms.interest_rate_type,
            processingFeePercent: terms.processing_fee_percent,
            managementFeePercent: terms.management_fee_percent,
            tenorMinDays: terms.tenor_min_days,
            tenorMaxDays: terms.tenor_max_days,
            requiredDisclosures: terms.required_disclosures,
          }
        : null,
    });

    return {
      success: true,
      locks: lockResult,
    };
  }

  /**
   * Tool 14: assess_campaign_compliance
   */
  public async assessCampaignCompliance(
    args: { campaign_id: string; revision_id: string; include_live_web_check?: boolean },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const { campaignService } = await import("@/modules/campaigns/campaign.service");
    const result = await campaignService.triggerAssessment(
      ctx.tenantId,
      ctx.userId || "system_copilot",
      args.campaign_id,
      {
        revision_id: args.revision_id,
        include_live_web_check: Boolean(args.include_live_web_check),
      }
    );

    return {
      success: true,
      assessment: result,
    };
  }

  /**
   * Tool 15: get_compliance_findings
   */
  public async getComplianceFindings(
    args: { campaign_id: string; revision_id?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    let q = supabase
      .from("compliance_findings")
      .select("*, finding_evidence(*)")
      .eq("tenant_id", ctx.tenantId)
      .eq("campaign_id", args.campaign_id);

    if (args.revision_id) {
      q = q.eq("revision_id", args.revision_id);
    }

    const { data: findings, error } = await q;
    if (error) {
      return { success: false, error: error.message, findings: [] };
    }

    return {
      success: true,
      findings: findings || [],
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
   * Tool 18: calculate_effective_apr_and_drip_fees
   */
  public async calculateEffectiveAprAndDripFees(
    args: {
      principal_ngn?: number;
      advertised_rate_percent: number;
      advertised_rate_period?: string;
      tenor_days: number;
      processing_fee_percent?: number;
      processing_fee_flat_ngn?: number;
      management_fee_percent?: number;
      daily_penalty_percent?: number;
      product_id?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const product = args.product_id
      ? await productService.getProductTruth(ctx.tenantId, { productId: args.product_id })
      : null;
    const terms = product?.approved_terms || {};
    const customTerms = (terms.custom_terms || {}) as Record<string, unknown>;

    const result = aprCalculatorService.calculateEffectiveApr({
      productName: product?.product_name || "Credit Facility",
      principalNgn: args.principal_ngn ?? 50_000,
      advertisedRatePercent: args.advertised_rate_percent,
      advertisedRatePeriod: (args.advertised_rate_period as RatePeriodType) || "MONTHLY",
      tenorDays: args.tenor_days || terms.tenor_min_days || 30,
      processingFeePercent: args.processing_fee_percent ?? terms.processing_fee_percent ?? 0,
      processingFeeFlatNgn:
        args.processing_fee_flat_ngn ??
        (typeof customTerms.processing_fee_flat_ngn === "number"
          ? customTerms.processing_fee_flat_ngn
          : 0),
      managementFeePercent: args.management_fee_percent ?? terms.management_fee_percent ?? 0,
      dailyPenaltyPercent: args.daily_penalty_percent ?? terms.penalty_fee_percent ?? 0,
      deductFeesUpfront: true,
    });

    return {
      success: true,
      apr_audit: result,
    };
  }

  /**
   * Tool 19: audit_flyer_visual_forensics
   */
  public async auditFlyerVisualForensics(
    args: { asset_id?: string; flyer_text?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    if (args.asset_id) {
      const res = await visualForensicsService.auditAssetById(ctx.tenantId, args.asset_id);
      return { success: true, visual_forensics: res };
    }

    const res = visualForensicsService.evaluateSegments({
      tenantId: ctx.tenantId,
      fullText: args.flyer_text || "",
      segments: [],
    });
    return { success: true, visual_forensics: res };
  }

  /**
   * Tool 20: audit_app_store_listing
   */
  public async auditAppStoreListing(
    args: { listing_text: string; product_id?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const product = args.product_id
      ? await productService.getProductTruth(ctx.tenantId, { productId: args.product_id })
      : null;

    const res = appStoreAuditorService.auditListingOrLandingPage({
      listingText: args.listing_text,
      product,
    });

    return {
      success: true,
      app_store_audit: res,
    };
  }

  /**
   * Tool 21: verify_license_scope_matrix
   */
  public async verifyLicenseScopeMatrix(
    args: { content_text: string; license_tier?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const memory = await precedentMemoryService.loadInstitutionalMemory({
      tenantId: ctx.tenantId,
      userPrompt: args.content_text,
    });

    const res = licenseScopeService.verifyLicenseScope({
      contentText: args.content_text,
      licenseTier: args.license_tier || memory.licenseTier,
      activeRegulatoryScopes: memory.activeRegulatoryScopes,
    });

    return {
      success: true,
      license_audit: res,
    };
  }

  /**
   * Tool 22: generate_kfs_and_channel_kit
   */
  public async generateKfsAndChannelKit(
    args: {
      product_id?: string;
      product_name?: string;
      principal_ngn?: number;
      interest_rate_percent?: number;
      tenor_days?: number;
      processing_fee_flat_ngn?: number;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const product = await productService.getProductTruth(ctx.tenantId, {
      productId: args.product_id,
      productName: args.product_name,
    });

    const kit = kfsGeneratorService.generateKfsAndChannelKit({
      product,
      productName: args.product_name || product?.product_name,
      principalNgn: args.principal_ngn,
      interestRatePercent: args.interest_rate_percent,
      tenorDays: args.tenor_days,
      processingFeeFlatNgn: args.processing_fee_flat_ngn,
    });

    return {
      success: true,
      kfs_and_channel_kit: kit,
    };
  }

  /**
   * Tool 23: recall_institutional_precedents
   */
  public async recallInstitutionalPrecedents(
    args: { topic_query: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const memory = await precedentMemoryService.loadInstitutionalMemory({
      tenantId: ctx.tenantId,
      userPrompt: args.topic_query,
    });

    return {
      success: true,
      institutional_memory: {
        institution_name: memory.institutionName,
        license_tier: memory.licenseTier,
        active_regulatory_scopes: memory.activeRegulatoryScopes,
        auto_matched_product: memory.autoMatchedProduct,
        precedents: memory.precedents,
      },
    };
  }
}

export const statutoryToolExecutor = new StatutoryToolExecutor();
