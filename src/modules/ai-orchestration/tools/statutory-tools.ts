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
import { statutoryReferenceMatrix } from "@/modules/compliance-assessment/statutory-reference-matrix";
import { precedentMemoryService } from "@/modules/ai-orchestration/precedent-memory.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { workProductService } from "@/modules/work-products/work-product.service";
import {
  AFRICA_JURISDICTION_REGISTRY,
  extractTargetJurisdictionsFromPrompt,
  planMultiJurisdictionSearchQueries,
  resolveJurisdictionDescriptor,
} from "@/modules/live-web-intelligence/africa-regulators";
import {
  matchApplicableOperationalClocks,
  matchAuthoritativeNigerianProvisions,
  matchSubClauseGapTemplates,
} from "@/modules/regulatory-vault/nigerian-statutory-matrix";
import { KnowledgeDocumentType } from "@/contracts/knowledge-product.contracts";
import { RewriteTone } from "@/contracts/remediation.contracts";
import {
  type SearchJurisdiction,
} from "@/contracts/search.contracts";
import {
  WORKFLOW_TYPES,
  WORK_PRODUCT_ARTIFACT_TYPES,
  type WorkflowType,
  type WorkProductArtifactType,
  type WorkProductCitation,
  type WorkProductEvidenceGap,
  type WorkProductStatus,
} from "@/contracts/work-product.contracts";
import { logger } from "@/lib/logger";

export interface ToolExecutionContext {
  tenantId: string;
  userId?: string;
  conversationId?: string;
  quotaPreConsumed?: boolean;
  liveWebEngineMode?: "DUAL_ENGINE" | "STANDARD_GEMINI_FALLBACK";
  planSlug?: string;
  allowedLiveUrls?: string[];
  hasInternalKnowledgeRefs?: boolean;
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
      "Performs paid-tier real-time web search across open web sources (news portals, legal commentary, blogs, fintech documentation, and company sites) plus Nigerian, Pan-African, and Global regulatory portals (e.g. CBN, SEC, NDPC, FCCPC, NFIU, BoG, CBK, SARB/FSCA, BNR, CBE, FCA, MAS, BCEAO, and any central bank or authority worldwide) using dual-engine SerpAPI & Exa AI retrieval. Fail-closed on unsubscribed evaluation plans.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Focused live web search query for any website, regulatory circular, act, bill, legal briefing, news, company info, or cross-border compliance topic.",
        },
        jurisdictions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Optional ISO country codes or jurisdiction identifiers for ANY country globally (e.g. NG, KE, GH, ZA, RW, EG, SN, CI, TZ, UG, GB, US, SG, AE, EU, GLOBAL). Defaults to ['NG'] or auto-detected countries in the query.",
        },
        include_news: {
          type: Type.BOOLEAN,
          description: "Include live regulatory enforcement and legislative news (default true).",
        },
        prioritize_official_regulators: {
          type: Type.BOOLEAN,
          description:
            "Optional flag (defaults to false). Set true when searching for primary central bank circulars, gazetted acts, or licensing schedules.",
        },
      },
      required: ["query"],
    },
  },
  // 10. fetch_live_url_content
  {
    name: "fetch_live_url_content",
    description:
      "Safely fetches, parses (HTML or PDF regulatory circulars/guidelines), sanitizes, and snapshots visible text and disclosures from a live HTTPS URL with strict SSRF defense.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "Full HTTPS URL of the webpage or official PDF circular/guideline.",
        },
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
          description: "Management or administrative fee percentage.",
        },
        insurance_fee_percent: {
          type: Type.NUMBER,
          description: "Upfront credit-life or compulsory insurance fee percentage (e.g. 1.5 for 1.5%).",
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
  // 24. match_product_rate_card
  {
    name: "match_product_rate_card",
    description:
      "Autonomously queries internal workspace Product Rate Cards when a product, loan, fee, or campaign is mentioned or uploaded, returning approved interest rates, processing fees, tenors, and mandatory disclosures.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_id: {
          type: Type.STRING,
          description: "Optional UUID of the product rate card.",
        },
        query_or_copy: {
          type: Type.STRING,
          description: "Product name, campaign copy, or prompt text to match against active rate cards.",
        },
      },
    },
  },
  // 25. calculate_cbn_apr_and_drip_pricing
  {
    name: "calculate_cbn_apr_and_drip_pricing",
    description:
      "Deterministic math engine computing canonical computedFinancials (principal, itemizedUpfrontFees, totalUpfrontFees, netDisbursedCash, nominalInterest, totalCostOfCredit, totalRepayable, effectiveApr, effectiveCompoundEar, tenorDays) per CBN Consumer Protection Regulations 2019, CBN Guide to Charges 2020 Part 2(A), & FCCPC DEON rules.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        principal_ngn: {
          type: Type.NUMBER,
          description: "Loan principal in NGN (defaults to 50000).",
        },
        advertised_rate_percent: {
          type: Type.NUMBER,
          description: "Headline interest rate percentage advertised in the ad or rate card.",
        },
        advertised_rate_period: {
          type: Type.STRING,
          description: "DAILY, MONTHLY, ANNUAL, or FLAT_PER_TENOR.",
        },
        tenor_days: {
          type: Type.INTEGER,
          description: "Loan repayment tenor in calendar days (e.g. 15, 30, 61, 90).",
        },
        processing_fee_percent: {
          type: Type.NUMBER,
          description: "Upfront processing fee percentage.",
        },
        processing_fee_flat_ngn: {
          type: Type.NUMBER,
          description: "Flat processing/admin fee in Naira.",
        },
        management_fee_percent: {
          type: Type.NUMBER,
          description: "Management or administrative fee percentage.",
        },
        insurance_fee_percent: {
          type: Type.NUMBER,
          description: "Upfront credit-life or compulsory insurance fee percentage (e.g. 1.5 for 1.5%).",
        },
        daily_penalty_percent: {
          type: Type.NUMBER,
          description: "Daily late payment penalty percentage.",
        },
        product_id: {
          type: Type.STRING,
          description: "Optional product_id to cross-reference hidden fees/tenors from campaign_products.",
        },
      },
      required: ["advertised_rate_percent", "tenor_days"],
    },
  },
  // 26. search_nigerian_regulations
  {
    name: "search_nigerian_regulations",
    description:
      "Retrieves exact statutory provisions from CBN, FCCPC (FCCPA 2018 / DEON), ARCON (ARCON Act / ASP Code), NDPC (NDPA 2023 / GAID), SEC, and internal institutional playbooks.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Search query for Nigerian statutory rules and institutional playbooks.",
        },
        regulators: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Optional regulator filter: CBN, FCCPC, ARCON, NDPC, SEC.",
        },
        limit: {
          type: Type.INTEGER,
          description: "Max statutory provisions to return (default 5).",
        },
      },
      required: ["query"],
    },
  },
  // 27. scan_live_url_or_creative
  {
    name: "scan_live_url_or_creative",
    description:
      "Extracts claims, fine print, disclosures, and visual/OCR elements from a live URL, Google Play/App Store listing, or uploaded flyer asset.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "Optional live HTTPS URL to fetch and scan.",
        },
        asset_id: {
          type: Type.STRING,
          description: "Optional uploaded flyer/PDF/DOCX asset UUID to inspect.",
        },
        creative_text: {
          type: Type.STRING,
          description: "Optional ad copy or app store listing text to scan directly.",
        },
        product_id: {
          type: Type.STRING,
          description: "Optional product UUID to cross-reference rates and tenors.",
        },
      },
    },
  },
  // 28. create_compliance_artifact
  {
    name: "create_compliance_artifact",
    description:
      "Emits a structured interactive compliance deliverable (cbn_kfs_statement, compliant_ad_rewrite, arcon_vetting_memo, or audit_dossier_summary) into the external right-hand Artifact Canvas Drawer.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        artifact_type: {
          type: Type.STRING,
          description:
            "One of: cbn_kfs_statement, compliant_ad_rewrite, arcon_vetting_memo, audit_dossier_summary.",
        },
        product_id: {
          type: Type.STRING,
          description: "Optional product UUID for locking financial schedule truth.",
        },
        product_name: {
          type: Type.STRING,
          description: "Optional product name.",
        },
        principal_ngn: {
          type: Type.NUMBER,
          description: "Optional principal in NGN.",
        },
        interest_rate_percent: {
          type: Type.NUMBER,
          description: "Optional nominal interest rate percentage.",
        },
        tenor_days: {
          type: Type.INTEGER,
          description: "Optional repayment tenor in days.",
        },
        processing_fee_flat_ngn: {
          type: Type.NUMBER,
          description: "Optional flat upfront processing fee in NGN.",
        },
      },
      required: ["artifact_type"],
    },
  },
  // 29. compare_policy_against_regulation
  {
    name: "compare_policy_against_regulation",
    description:
      "Compares an internal corporate policy/SOP document (or pasted policy text) against governing Nigerian regulations in the Statutory Vault and identifies outdated clauses requiring redlines.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        knowledge_doc_id: {
          type: Type.STRING,
          description: "Optional UUID of an uploaded marketing_knowledge_documents record.",
        },
        policy_text: {
          type: Type.STRING,
          description: "Optional raw policy clause excerpt to gap-analyze.",
        },
        regulation_query: {
          type: Type.STRING,
          description: "Target CBN/NDPC/FCCPC/SEC/NFIU regulatory standard or circular topic.",
        },
        regulators: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Optional regulator filter (e.g. ['CBN', 'NDPC', 'NFIU']).",
        },
      },
      required: ["regulation_query"],
    },
  },
  // 30. parse_and_answer_ddq_questions
  {
    name: "parse_and_answer_ddq_questions",
    description:
      "Parses numbered bank, NIBSS, or regulator audit/DDQ questions, retrieves matching internal playbooks + product schedules + statutory clauses, and flags unverified operational claims with [NEEDS_INTERNAL_EVIDENCE].",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ddq_text: {
          type: Type.STRING,
          description: "Raw text of the supervisory audit query or bank DDQ questionnaire.",
        },
        asset_id: {
          type: Type.STRING,
          description: "Optional uploaded PDF/DOCX asset UUID containing the questionnaire.",
        },
        knowledge_doc_id: {
          type: Type.STRING,
          description: "Optional internal policy document UUID to ground operational answers.",
        },
      },
    },
  },
  // 31. compare_african_jurisdictions
  {
    name: "compare_african_jurisdictions",
    description:
      "Cross-references regulatory requirements across any African or global jurisdictions (e.g. Nigeria CBN, Kenya CBK, Ghana BoG, South Africa SARB/FSCA, Rwanda BNR, Egypt CBE, Senegal/UEMOA BCEAO, UK FCA, Singapore MAS, UAE, US, EU, or any country worldwide) for cross-border expansion matrices. Requires Scale or Enterprise tier for multi-country live search.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: "Licensing, capital, settlement, AML, or data localization topic to compare.",
        },
        jurisdictions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Jurisdiction codes or country names to compare across any African or global markets (e.g. ['NG', 'KE', 'GH', 'ZA'] or ['NG', 'GB', 'SG']).",
        },
        product_type: {
          type: Type.STRING,
          description: "Optional fintech product category (e.g. PSSP, MMO, IMTO, DIGITAL_LENDING).",
        },
      },
      required: ["topic", "jurisdictions"],
    },
  },
  // 32. upsert_work_product_artifact
  {
    name: "upsert_work_product_artifact",
    description:
      "Persists or updates an editable compliance work product deliverable (Statutory Structuring Memo, Policy Gap Redline, Supervisory DDQ Response, or Cross-Border Matrix) in the right-hand 50/50 Studio Canvas with SHA-256 sealing and version history.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        work_product_id: {
          type: Type.STRING,
          description: "Optional existing work_product_artifacts UUID to create a new revision on.",
        },
        workflow_type: {
          type: Type.STRING,
          description:
            "One of: PRODUCT_STRUCTURING_MEMO, POLICY_GAP_REDLINE, POLICY_DRAFT_NEW, SUPERVISORY_DDQ_RESPONSE, CROSS_BORDER_COMPARISON, CAMPAIGN_COMPLIANCE_KIT.",
        },
        artifact_type: {
          type: Type.STRING,
          description:
            "One of: statutory_structuring_memo, policy_gap_redline, policy_draft_document, supervisory_ddq_response, cross_border_matrix, compliant_ad_rewrite, cbn_kfs_statement, arcon_vetting_memo, audit_dossier_summary.",
        },
        title: {
          type: Type.STRING,
          description: "Executive title for the Studio Canvas deliverable.",
        },
        jurisdiction_scope: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Jurisdictions covered across any African or global markets (e.g. ['NG'] or ['NG', 'KE', 'GH', 'ZA']).",
        },
        markdown_content: {
          type: Type.STRING,
          description: "Full formatted Markdown body of the work product.",
        },
        change_summary: {
          type: Type.STRING,
          description: "Optional summary of changes in this revision.",
        },
      },
      required: ["workflow_type", "artifact_type", "title", "markdown_content"],
    },
  },
];

/**
 * Concrete Executors for all Statutory & Autonomous Analyst Tools.
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
   * Distills long prompts or marketing copy into a concise query suitable for
   * PostgreSQL websearch_to_tsquery and vector embedding.
   * Scans the entire prompt and prioritizes high-signal statutory & regulatory keywords.
   */
  private buildConciseSearchQuery(rawQuery: string): string {
    const clean = rawQuery
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\b[\w-]+\.(?:pdf|docx|doc|txt|md)\b/gi, " ")
      .replace(/[^\w\s%-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = clean.split(" ").filter(Boolean);
    if (words.length <= 14) return clean || rawQuery.trim();

    const stopWords = new Set([
      "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "do", "does", "for",
      "from", "get", "have", "how", "i", "if", "in", "into", "is", "it", "me", "my", "no",
      "not", "of", "on", "or", "our", "please", "review", "check", "audit", "this", "that",
      "the", "their", "them", "they", "to", "us", "we", "what", "when", "where", "which",
      "who", "will", "with", "would", "you", "your", "copy", "promotional", "campaign",
      "perform", "provide", "full", "attached", "internal", "showing", "every", "against",
    ]);

    const priorityTerms = new Set([
      "cbn", "ndpa", "ndpc", "fccpc", "deon", "gaid", "nfiu", "mlppa", "cpr", "sec",
      "firs", "cac", "naicom", "pencom", "nitda", "bvn", "nin", "kyc", "aml", "cft",
      "cpf", "str", "ctr", "ftr", "goaml", "consent", "bundled", "withdrawal", "dpia",
      "contacts", "sms", "gps", "penalty", "penal", "grace", "charges", "collection",
      "harassment", "retention", "breach", "localisation", "localization", "transfer",
      "dispute", "complaint", "chargeback", "dispense", "eft", "pssp", "mfb", "tier",
    ]);

    const highSignal: string[] = [];
    const generalKeywords: string[] = [];
    const seen = new Set<string>();

    for (const w of words) {
      const lower = w.toLowerCase();
      if (lower.length < 3 || stopWords.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      if (priorityTerms.has(lower)) {
        highSignal.push(w);
      } else {
        generalKeywords.push(w);
      }
    }

    const combined = [...highSignal, ...generalKeywords].slice(0, 22);
    return combined.length >= 3 ? combined.join(" ") : words.slice(0, 14).join(" ");
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
    const limit = Math.min(args.limit || 5, 25);
    const searchQuery = this.buildConciseSearchQuery(args.query);

    try {
      // 1. Generate query embedding fast (falls back within 3.5s if throttled)
      let queryEmbedding: number[];
      try {
        queryEmbedding = await geminiService.generateEmbedding(searchQuery, {
          fastInteractive: true,
        });
      } catch (embErr) {
        logger.warn("Gemini embedding skipped/fallback during interactive vault search", {
          error: (embErr as Error).message,
        });
        const { data: fallbackRow } = await supabase
          .from("regulatory_clauses")
          .select("embedding")
          .not("embedding", "is", null)
          .limit(1)
          .single();
        if (!fallbackRow?.embedding) {
          throw embErr;
        }
        queryEmbedding = Array.isArray(fallbackRow.embedding)
          ? fallbackRow.embedding
          : JSON.parse(fallbackRow.embedding as unknown as string);
      }

      const startTime = Date.now();
      const candidateFetchCount =
        args.regulators && args.regulators.length > 0 ? 50 : Math.max(limit * 3, 25);
      const { data: rrfResults, error: rrfError } = await supabase.rpc(
        "search_regulatory_clauses_rrf",
        {
          query_text: searchQuery,
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
    const { NIGERIAN_STATUTORY_PROVISIONS } = await import(
      "@/modules/regulatory-vault/nigerian-statutory-matrix"
    );
    const staticProv = NIGERIAN_STATUTORY_PROVISIONS.find(
      (p) => p.id === args.regulatory_clause_id
    );
    if (staticProv) {
      const crypto = await import("crypto");
      const hash = crypto
        .createHash("sha256")
        .update(staticProv.verbatimRuleExtract)
        .digest("hex");
      return {
        success: true,
        regulatory_clause_id: staticProv.id,
        clause_reference: staticProv.sectionCode,
        verbatim_text: staticProv.verbatimRuleExtract,
        page_number: null,
        instrument_title: staticProv.documentTitle,
        instrument_type: "STATUTE_OR_DIRECTIVE",
        instrument_number: staticProv.sectionCode,
        regulator_acronym: staticProv.authority,
        regulator_name: staticProv.authority,
        official_domain: staticProv.domain,
        file_sha256: hash,
        source_url: staticProv.officialUrl,
        effective_date: staticProv.effectiveDate,
        publication_date: staticProv.effectiveDate,
        lifecycle_status: "CURRENT",
        source_class: "VERIFIED_OFFICIAL_SOURCE",
        badge_label: "Verified Statutory Vault",
      };
    }

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

    const { data: obligations } = await supabase
      .from("regulatory_obligations")
      .select("id, clause_id, obligation_type, applicability_description, severity")
      .in("clause_id", args.regulatory_clause_ids);

    const obligationRows = (obligations || []) as Array<{
      id: string;
      clause_id: string;
      obligation_type?: string | null;
      applicability_description?: string | null;
      severity?: string | null;
    }>;

    const obligationIds = obligationRows.map((o) => o.id).filter(Boolean);
    let rules: Array<{
      id: string;
      obligation_id: string;
      institution_type?: string | null;
      product_type?: string | null;
      activity_type?: string | null;
      channel?: string | null;
      jurisdiction?: string | null;
      conditions?: Record<string, unknown> | null;
    }> = [];

    if (obligationIds.length > 0) {
      const { data: ruleRows } = await supabase
        .from("applicability_rules")
        .select(
          "id, obligation_id, institution_type, product_type, activity_type, channel, jurisdiction, conditions"
        )
        .in("obligation_id", obligationIds);
      rules = (ruleRows || []) as typeof rules;
    }

    const reqInstitution = args.institution_type?.toLowerCase();
    const reqProduct = args.product_type?.toLowerCase();
    const reqChannel = args.channel?.toLowerCase();

    const assessments = args.regulatory_clause_ids.map((clauseId) => {
      const clauseObligations = obligationRows.filter((o) => o.clause_id === clauseId);
      const clauseObIds = new Set(clauseObligations.map((o) => o.id));
      const clauseRules = rules.filter((r) => clauseObIds.has(r.obligation_id));

      let applicabilityStatus: "APPLICABLE" | "EXEMPT" | "CONDITIONALLY_APPLICABLE" = "APPLICABLE";
      let reason =
        clauseObligations[0]?.applicability_description ||
        "Applicable across Nigerian regulated financial services.";

      for (const rule of clauseRules) {
        const cond = (rule.conditions || {}) as Record<string, unknown>;
        const ruleInst = rule.institution_type?.toLowerCase();
        const ruleProd = rule.product_type?.toLowerCase();
        const ruleChan = rule.channel?.toLowerCase();

        const instMismatch = Boolean(reqInstitution && ruleInst && ruleInst !== "all" && ruleInst !== reqInstitution);
        const prodMismatch = Boolean(reqProduct && ruleProd && ruleProd !== "all" && ruleProd !== reqProduct);
        const chanMismatch = Boolean(reqChannel && ruleChan && ruleChan !== "all" && ruleChan !== reqChannel);

        if (cond.exempt === true || instMismatch || prodMismatch || chanMismatch) {
          applicabilityStatus = "EXEMPT";
          reason =
            (typeof cond.description === "string" && cond.description) ||
            "Institution/product scope falls outside this rule's applicability criteria.";
          break;
        }

        if (Object.keys(cond).length > 0 || rule.institution_type || rule.product_type || rule.channel) {
          applicabilityStatus = "CONDITIONALLY_APPLICABLE";
          reason =
            (typeof cond.description === "string" && cond.description) ||
            clauseObligations[0]?.applicability_description ||
            `Applies to ${[rule.institution_type, rule.product_type, rule.channel].filter(Boolean).join(" / ") || "targeted financial services"}.`;
        }
      }

      return {
        regulatory_clause_id: clauseId,
        applicability_status: applicabilityStatus,
        reason,
        matched_obligations_count: clauseObligations.length,
        matched_rules_count: clauseRules.length,
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
    args: {
      query: string;
      jurisdictions?: string[];
      include_news?: boolean;
      prioritize_official_regulators?: boolean;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const normalizedExplicit = (args.jurisdictions || [])
      .map((j) => resolveJurisdictionDescriptor(j).code)
      .filter((j) => j.length >= 2);
    const jurisdictions: SearchJurisdiction[] = extractTargetJurisdictionsFromPrompt(
      args.query,
      normalizedExplicit.length > 0 ? normalizedExplicit : ["NG"]
    );

    let engineMode: "DUAL_ENGINE" | "STANDARD_GEMINI_FALLBACK" =
      ctx.liveWebEngineMode || "DUAL_ENGINE";
    let effectivePlanSlug = ctx.planSlug;

    if (!ctx.quotaPreConsumed) {
      const auth = await entitlementsService.authorizeAndConsumeLiveSearch(
        ctx.tenantId,
        jurisdictions
      );
      effectivePlanSlug = auth.planSlug ?? effectivePlanSlug;

      if (!auth.allowed) {
        if (auth.fallbackToGeminiSearch) {
          engineMode = "STANDARD_GEMINI_FALLBACK";
        } else {
          return {
            source_class: "LIVE_WEB_INTELLIGENCE",
            status: "upgrade_required",
            upgrade_required: true,
            reason:
              auth.reason ||
              "Real-time Nigeria, Pan-African & Global web search requires an active Growth, Scale, or Enterprise plan.",
            results: [],
          };
        }
      }
    }

    if (engineMode === "STANDARD_GEMINI_FALLBACK") {
      const isMultiCountry = jurisdictions.length > 1;
      const fallbackResult = await webSearchRouter.searchWithStandardWebFallback(
        {
          query: args.query,
          jurisdictions,
          searchIntent: isMultiCountry ? "CROSS_BORDER" : "REGULATORY_CIRCULAR",
          includeNews: args.include_news !== false,
        },
        ctx.tenantId
      );

      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        status: "ok",
        web_summary: fallbackResult.webSummary,
        cache_hit: fallbackResult.cacheHit,
        providers_used: fallbackResult.providersUsed,
        results: fallbackResult.results.map((r) => ({
          live_web_retrieval_id: r.live_web_retrieval_id,
          page_title: r.page_title,
          retrieved_url: r.retrieved_url,
          snippet_content: r.full_content_excerpt || r.snippet_content,
          full_content_excerpt: r.full_content_excerpt,
          highlights: r.highlights,
          published_at: r.published_at,
          retrieved_at: r.retrieved_at,
          provider: r.provider,
          jurisdiction_code: r.jurisdiction_code,
          trust_tier: r.trust_tier,
          source_class: "LIVE_WEB_INTELLIGENCE",
        })),
      };
    }

    if (
      typeof webSearchRouter.isDualEngineActive === "function" &&
      webSearchRouter.isDualEngineActive()
    ) {
      const isMultiCountry = jurisdictions.length > 1;
      const africaResult = await webSearchRouter.searchAfricaLiveWeb(
        {
          query: args.query,
          jurisdictions,
          searchIntent: isMultiCountry ? "CROSS_BORDER" : "REGULATORY_CIRCULAR",
          includeNews: args.include_news !== false,
          timeoutMs: isMultiCountry ? 14000 : 8000,
          allowGeminiFallback: effectivePlanSlug !== "evaluation",
        },
        ctx.tenantId
      );

      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        status: "ok",
        web_summary: africaResult.webSummary,
        cache_hit: africaResult.cacheHit,
        providers_used: africaResult.providersUsed,
        results: africaResult.results.map((r) => ({
          live_web_retrieval_id: r.live_web_retrieval_id,
          page_title: r.page_title,
          retrieved_url: r.retrieved_url,
          snippet_content: r.full_content_excerpt || r.snippet_content,
          full_content_excerpt: r.full_content_excerpt,
          highlights: r.highlights,
          published_at: r.published_at,
          retrieved_at: r.retrieved_at,
          provider: r.provider,
          jurisdiction_code: r.jurisdiction_code,
          trust_tier: r.trust_tier,
          source_class: "LIVE_WEB_INTELLIGENCE",
        })),
      };
    }

    return webSearchRouter.searchLiveWeb(
      {
        query: args.query,
        jurisdictions,
        prioritize_official_regulators: args.prioritize_official_regulators === true,
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
      insurance_fee_percent?: number;
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
      insuranceFeePercent:
        args.insurance_fee_percent ??
        (typeof customTerms.insurance_fee_percent === "number"
          ? customTerms.insurance_fee_percent
          : 0),
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

  /**
   * Tool 24: match_product_rate_card
   */
  public async matchProductRateCard(
    args: { product_id?: string; query_or_copy?: string },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const memory = await precedentMemoryService.loadInstitutionalMemory({
      tenantId: ctx.tenantId,
      userPrompt: args.query_or_copy || "",
      explicitProductId: args.product_id || null,
    });

    const product =
      args.product_id
        ? await productService.getProductTruth(ctx.tenantId, { productId: args.product_id })
        : memory.autoMatchedProduct;

    return {
      success: true,
      institution_name: memory.institutionName,
      license_tier: memory.licenseTier,
      matched_product: product
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
   * Tool 25: calculate_cbn_apr_and_drip_pricing
   */
  public async calculateCbnAprAndDripPricing(
    args: {
      principal_ngn?: number;
      advertised_rate_percent: number;
      advertised_rate_period?: string;
      tenor_days: number;
      processing_fee_percent?: number;
      processing_fee_flat_ngn?: number;
      management_fee_percent?: number;
      product_id?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const res = await this.calculateEffectiveAprAndDripFees(args, ctx);
    const aprAudit = res.apr_audit as ReturnType<typeof aprCalculatorService.calculateEffectiveApr> | undefined;
    return {
      ...res,
      computed_financials: aprAudit?.computedFinancials || null,
    };
  }

  /**
   * Tool 26: search_nigerian_regulations
   */
  public async searchNigerianRegulations(
    args: { query: string; regulators?: string[]; limit?: number },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const [vaultRes, playbookRes] = await Promise.all([
      this.searchRegulatoryEvidence(
        {
          query: args.query,
          regulators: args.regulators,
          limit: args.limit || 5,
        },
        ctx
      ),
      this.searchInstitutionalKnowledge(
        {
          query: args.query,
          limit: 3,
        },
        ctx
      ).catch(() => ({ chunks: [], rules: [] })),
    ]);

    const referenceProvisions = statutoryReferenceMatrix.extractApplicableProvisions(args.query);

    return {
      success: true,
      statutory_provisions: vaultRes.results || [],
      statutory_reference_provisions: referenceProvisions,
      playbook_chunks: playbookRes.chunks || [],
      playbook_rules: playbookRes.rules || [],
    };
  }

  /**
   * Tool 27: scan_live_url_or_creative
   */
  public async scanLiveUrlOrCreative(
    args: {
      url?: string;
      asset_id?: string;
      creative_text?: string;
      product_id?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    if (args.url) {
      return this.fetchLiveUrlContent({ url: args.url }, ctx);
    }
    if (args.asset_id) {
      return this.getCampaignAssetContent({ asset_id: args.asset_id }, ctx);
    }
    const text = args.creative_text || "";
    const [visualRes, storeRes] = await Promise.all([
      this.auditFlyerVisualForensics({ flyer_text: text }, ctx),
      this.auditAppStoreListing({ listing_text: text, product_id: args.product_id }, ctx),
    ]);
    return {
      success: true,
      visual_forensics: visualRes.visual_forensics,
      app_store_audit: storeRes.app_store_audit,
    };
  }

  /**
   * Tool 28: create_compliance_artifact
   */
  public async createComplianceArtifact(
    args: {
      artifact_type: string;
      product_id?: string;
      product_name?: string;
      principal_ngn?: number;
      interest_rate_percent?: number;
      tenor_days?: number;
      processing_fee_flat_ngn?: number;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const kitRes = await this.generateKfsAndChannelKit(args, ctx);
    const kit = kitRes.kfs_and_channel_kit as ReturnType<
      typeof kfsGeneratorService.generateKfsAndChannelKit
    >;
    return {
      success: true,
      artifact_type: args.artifact_type,
      kfs_and_channel_kit: kit,
      computed_financials: kit?.aprSummary?.computedFinancials || null,
    };
  }

  /**
   * Tool 29: compare_policy_against_regulation
   */
  public async comparePolicyAgainstRegulation(
    args: {
      knowledge_doc_id?: string;
      policy_text?: string;
      regulation_query: string;
      regulators?: string[];
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    let policyTitle = "Internal Institutional Policy / SOP";
    let policyChunks: Array<{ chunk_index: number; chunk_text: string }> = [];

    if (args.knowledge_doc_id) {
      const [{ data: docRow }, { data: chunkRows }] = await Promise.all([
        supabase
          .from("marketing_knowledge_documents")
          .select("id, title, document_type, status")
          .eq("tenant_id", ctx.tenantId)
          .eq("id", args.knowledge_doc_id)
          .maybeSingle(),
        supabase
          .from("marketing_knowledge_chunks")
          .select("chunk_index, chunk_text")
          .eq("tenant_id", ctx.tenantId)
          .eq("knowledge_document_id", args.knowledge_doc_id)
          .order("chunk_index", { ascending: true })
          .limit(12),
      ]);
      if (docRow?.title) policyTitle = String(docRow.title);
      policyChunks = (chunkRows || []) as Array<{ chunk_index: number; chunk_text: string }>;
    }

    if (policyChunks.length === 0 && !args.policy_text) {
      const kbRes = await this.searchInstitutionalKnowledge(
        { query: args.regulation_query, limit: 6 },
        ctx
      ).catch(() => ({ chunks: [] }));
      const matchedChunks = (kbRes.chunks as Array<Record<string, unknown>>) || [];
      policyChunks = matchedChunks.map((c, idx) => ({
        chunk_index: Number(c.chunk_index ?? idx),
        chunk_text: String(c.chunk_text || ""),
      }));
    }

    const vaultRes = await this.searchRegulatoryEvidence(
      {
        query: args.regulation_query,
        regulators: args.regulators,
        limit: 12,
      },
      ctx
    );

    const vaultResults = (vaultRes.results as Array<Record<string, unknown>>) || [];
    const combinedPolicyText =
      args.policy_text ||
      policyChunks.map((c) => `[Section #${c.chunk_index + 1}] ${c.chunk_text}`).join("\n\n");

    const fullAnalysisCorpus = `${combinedPolicyText}\n${args.regulation_query}`;
    const referenceProvisions = statutoryReferenceMatrix.extractApplicableProvisions(
      `${args.regulation_query}\n${combinedPolicyText}`
    );
    const authoritativeProvisions = matchAuthoritativeNigerianProvisions(
      fullAnalysisCorpus,
      20
    );

    const existingClauseIds = new Set(
      vaultResults.map((r) => String(r.regulatory_clause_id || ""))
    );
    const enrichedStatutoryBenchmarks = [
      ...vaultResults,
      ...authoritativeProvisions
        .filter((p) => !existingClauseIds.has(p.id))
        .map((p) => ({
          regulatory_clause_id: p.id,
          clause_reference: p.sectionCode,
          instrument_title: p.documentTitle,
          regulator: p.authority,
          verbatim_excerpt: p.verbatimRuleExtract,
          statutory_floor_summary: p.statutoryFloorSummary,
          official_url: p.officialUrl,
          effective_date: p.effectiveDate,
          rrf_score: 0.95,
          source_class: "VERIFIED_OFFICIAL_SOURCE",
          badge_label: "Verified Statutory Vault",
        })),
    ];

    const matchedSubClauseTemplates = matchSubClauseGapTemplates(fullAnalysisCorpus);
    const matchedOperationalClocks = matchApplicableOperationalClocks(
      fullAnalysisCorpus,
      matchedSubClauseTemplates,
      authoritativeProvisions
    );

    const activeCategories = new Set([
      ...matchedSubClauseTemplates.map((t) => t.category),
      ...authoritativeProvisions.map((p) => p.category),
    ]);

    const dynamicScopeGuidance: string[] = [];
    if (
      activeCategories.has("DEBT_COLLECTION_AND_PENALTIES") ||
      /\b(pssp|lender\s+of\s+record|microfinance|mfb|lending|deon|loan|credit)\b/i.test(
        fullAnalysisCorpus
      )
    ) {
      dynamicScopeGuidance.push(
        "PSSP vs. Licensed Lender of Record (FCCPC DEON Regulations 2025 Regs. 8 & 10–13, eff. 21 July 2025): A CBN Payment Solution Service Provider (PSSP) licence authorizes payment processing/switching, NOT balance-sheet consumer lending. Any credit product must designate a licensed Lender of Record (e.g., partner CBN-licensed Microfinance Bank or Finance Company) under an FCCPC-approved DEON partnership agreement.",
        "Microfinance Bank Default Tariff Ceiling (CBN Guide to Charges eff. Jan 1, 2020 Part 2(A), Section 2.5 & Footnote 3; CBN CPR 2019 Reg. 4.6(b)–(c)): Default/penal rate is capped at 1% flat per month on the unpaid overdue amount and may only accrue after a mandatory minimum 3-day grace period following Day 1 default notice."
      );
    }
    if (activeCategories.has("AML_CFT_KYC_AND_NFIU")) {
      dynamicScopeGuidance.push(
        "Direct Applicability of CBN AML/CFT/CPF Regulations 2022: Regulated Nigerian Financial Institutions, MFBs, and Payment Service Providers (PSPs/PSSPs) are directly bound as reporting institutions and cannot rely on a partner bank's AML controls to excuse KYC waivers or delayed STR/CTR/FTR filings."
      );
    }
    if (
      activeCategories.has("CONSENT_AND_PERMISSIONS") ||
      activeCategories.has("DATA_RETENTION_LOCALISATION_AND_BREACH")
    ) {
      dynamicScopeGuidance.push(
        "Operative Status of NDPA 2023 & NDPC GAID 2025: NDPA 2023 (eff. 12 June 2023) and the NDPC General Application and Implementation Directive (GAID) 2025 (issued 20 March 2025; commenced 19 September 2025; Article 10 annual CAR deadline 31 March, not 15 March) are actively in force; CBN Payments Data Localisation Circular (15 June 2026) & FAQ (4 Nov 2026) mandate full in-country hosting compliance by 1 January 2027."
      );
    }

    const dynamicLegalFloors = Array.from(
      new Set(
        authoritativeProvisions.map(
          (p) => `${p.documentTitle} ${p.sectionCode}: ${p.statutoryFloorSummary}`
        )
      )
    );

    const officialRegulatorReferences = authoritativeProvisions.map((p) => ({
      id: p.id,
      authority: p.authority,
      title: `${p.documentTitle} — ${p.sectionCode}`,
      url: p.officialUrl,
      domain: p.domain,
      effective_date: p.effectiveDate,
      snippet: p.statutoryFloorSummary,
    }));

    return {
      success: true,
      source_class: "INTERNAL_PLAYBOOK",
      policy_title: policyTitle,
      knowledge_doc_id: args.knowledge_doc_id || null,
      policy_excerpt: combinedPolicyText.slice(0, 6000),
      policy_sections_count: policyChunks.length || (args.policy_text ? 1 : 0),
      statutory_benchmarks: enrichedStatutoryBenchmarks,
      statutory_reference_provisions: referenceProvisions,
      subclause_gap_matrix: matchedSubClauseTemplates,
      mandatory_operational_clocks: matchedOperationalClocks,
      official_regulator_references: officialRegulatorReferences,
      institutional_scope_guidance: dynamicScopeGuidance,
      legal_floors: dynamicLegalFloors,
    };
  }

  /**
   * Tool 30: parse_and_answer_ddq_questions
   */
  public async parseAndAnswerDdqQuestions(
    args: {
      ddq_text?: string;
      asset_id?: string;
      knowledge_doc_id?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const supabase = createAdminSupabaseClient();
    let rawDdqText = args.ddq_text || "";
    let attachmentLoaded = false;

    if (!rawDdqText && args.asset_id) {
      const { data: ext } = await supabase
        .from("asset_extractions")
        .select("extracted_text")
        .eq("tenant_id", ctx.tenantId)
        .eq("asset_id", args.asset_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      rawDdqText = String(ext?.extracted_text || "");
      attachmentLoaded = rawDdqText.trim().length > 0;
    }

    // Parse numbered / bulleted / Q1 (Topic): / Part B items up to 150 items
    const parsedQuestions = rawDdqText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          /^(?:\d+[.)]|\(\d+\)|[-*•]|Q\d+(?:\s*\([^)]+\))?[:.)]|PART\s+[A-Z]\b)/i.test(l) ||
          l.endsWith("?")
      )
      .map((l) => l.replace(/^(?:\d+[.)]|\(\d+\)|[-*•]|Q\d+(?:\s*\([^)]+\))?[:.)])\s*/i, "").trim())
      .filter((l) => l.length >= 8)
      .slice(0, 150);

    const questions = parsedQuestions.length > 0 ? parsedQuestions : [rawDdqText.trim()].filter(Boolean);

    const [kbRes, productRes, vaultRes, evidenceVaultRows, qaLibraryRows] = await Promise.all([
      this.searchInstitutionalKnowledge(
        { query: questions.slice(0, 12).join(" ").slice(0, 500) || "compliance policy", limit: 12 },
        ctx
      ).catch(() => ({ chunks: [], rules: [] })),
      productService.getProductTruth(ctx.tenantId, {}).catch(() => null),
      this.searchRegulatoryEvidence(
        { query: questions.slice(0, 12).join(" ").slice(0, 500) || "CBN AML KYC NDPA NIP Cybercrimes", limit: 10 },
        ctx
      ).catch(() => ({ results: [] })),
      Promise.resolve(
        supabase
          .from("compliance_evidence_items")
          .select("id, title, category, owner_department, status, expiry_date, extracted_text")
          .eq("tenant_id", ctx.tenantId)
          .limit(50)
      )
        .then((r) => (Array.isArray(r?.data) ? (r.data as Array<Record<string, unknown>>) : []))
        .catch(() => [] as Array<Record<string, unknown>>),
      Promise.resolve(
        supabase
          .from("ddq_qa_library")
          .select("id, canonical_question, approved_answer, domain, owner_department, status")
          .eq("tenant_id", ctx.tenantId)
          .limit(80)
      )
        .then((r) => (Array.isArray(r?.data) ? (r.data as Array<Record<string, unknown>>) : []))
        .catch(() => [] as Array<Record<string, unknown>>),
    ]);

    let explicitDocChunks: Array<Record<string, unknown>> = [];
    if (args.knowledge_doc_id) {
      const { data: docChunks } = await supabase
        .from("marketing_knowledge_chunks")
        .select("id, chunk_index, chunk_text")
        .eq("tenant_id", ctx.tenantId)
        .eq("knowledge_document_id", args.knowledge_doc_id)
        .order("chunk_index", { ascending: true })
        .limit(10);
      explicitDocChunks = (docChunks || []) as Array<Record<string, unknown>>;
    }

    const kbChunks = (kbRes.chunks as Array<Record<string, unknown>>) || [];
    const kbRules = (kbRes.rules as Array<Record<string, unknown>>) || [];
    const evidencePseudoChunks: Array<Record<string, unknown>> = evidenceVaultRows
      .filter((e) => e.status !== "ARCHIVED" && e.status !== "SUPERSEDED" && e.status !== "EXPIRED")
      .map((e) => ({
        id: e.id,
        chunk_text: `[Evidence Vault: ${e.title || ""}] ${e.extracted_text || ""}`,
      }));
    const qaPseudoChunks: Array<Record<string, unknown>> = qaLibraryRows
      .filter((q) => q.status === "ACTIVE")
      .map((q) => ({
        id: q.id,
        chunk_text: `[Approved Q&A: ${q.canonical_question || ""}] ${q.approved_answer || ""}`,
      }));

    const allInternalChunks = [
      ...explicitDocChunks,
      ...kbChunks,
      ...evidencePseudoChunks,
      ...qaPseudoChunks,
    ];
    const hasInternalEvidence =
      allInternalChunks.length > 0 || kbRules.length > 0 || Boolean(productRes);

    const evidenceGaps: WorkProductEvidenceGap[] = [];
    const questionAlignments = questions.map((q, idx) => {
      const tokens = q
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 4);

      const matchedChunks = allInternalChunks.filter((c) => {
        const txt = String(c.chunk_text || "").toLowerCase();
        return tokens.some((tok) => txt.includes(tok));
      });

      const grounded = matchedChunks.length > 0;
      if (!grounded) {
        evidenceGaps.push({
          gap_code: `DDQ_GAP_Q${idx + 1}`,
          section_or_question: `Q${idx + 1}: ${q.slice(0, 90)}`,
          description: "No matching internal policy, licence instrument, filing acknowledgement, or incident log found in workspace Knowledge Base.",
          severity: "HIGH",
          remediation_prompt: `Provide internal SOP, licence/filing receipt, or verified engineering/reconciliation evidence covering: ${q.slice(0, 120)}`,
        });
      }

      return {
        question_number: idx + 1,
        question: q,
        internal_evidence_found: grounded,
        marker: grounded ? "GROUNDED_INTERNAL" : "[NEEDS_INTERNAL_EVIDENCE]",
        matching_excerpts: matchedChunks.slice(0, 2).map((c) => String(c.chunk_text || "").slice(0, 350)),
      };
    });

    const referenceProvisions = statutoryReferenceMatrix.extractApplicableProvisions(rawDdqText);

    // Detect named attachment that was NOT uploaded/extracted
    const mentionedPdfMatch = rawDdqText.match(/["']?([\w.-]+\.(?:pdf|docx|xlsx|csv))["']?/i);
    const missingNamedDocument =
      mentionedPdfMatch?.[1] && !attachmentLoaded ? mentionedPdfMatch[1] : null;

    // Detect specific compliance traps in prompt
    const hasUnitMfbPartnerSignal =
      /\b(?:unit\s+(?:tier[- ]?[12]\s+)?mfb|microfinance\s+bank|\bmfb\b)\b/i.test(rawDdqText);
    const hasSupervisoryIncidentSignal =
      /\b(?:unauthori[sz]ed\s+(?:wallet\s+)?debit|failed\s+nip|supervisory\s+inquiry|48[- ]hour|restitution)\b/i.test(
        rawDdqText
      );

    const missingEvidenceChecklist: string[] = [];
    if (missingNamedDocument) {
      missingEvidenceChecklist.push(
        `Referenced attachment '${missingNamedDocument}' was not supplied in extracted form—explicitly state this in the cover note and do not fabricate facts from it.`
      );
    }
    if (!hasInternalEvidence) {
      missingEvidenceChecklist.push(
        "Licence instrument (reference number & issue date), signed sponsor-bank agreement, fund-flow diagram, bank mandates, and daily reconciliation reports",
        "DPO appointment/acceptance letter, NDPC registration/category receipt, and latest CAR filing acknowledgement",
        "Signed VAPT report, retest closure report, CISO appointment, and CBN 31 March annual cybersecurity self-assessment receipt",
        "Customer-level complaint/restitution register, NIBSS/NIP reconciliation split, NFIU goAML filing acknowledgements, and verified engineering root-cause chronology"
      );
    }

    return {
      success: true,
      parsed_questions_count: questions.length,
      has_internal_evidence: hasInternalEvidence,
      missing_named_document: missingNamedDocument,
      has_unit_mfb_partner_signal: hasUnitMfbPartnerSignal,
      has_supervisory_incident_signal: hasSupervisoryIncidentSignal,
      evidence_gaps_count: evidenceGaps.length,
      evidence_gaps: evidenceGaps,
      question_alignments: questionAlignments,
      statutory_benchmarks: (vaultRes.results as Array<Record<string, unknown>>) || [],
      statutory_reference_provisions: referenceProvisions,
      missing_evidence_checklist: missingEvidenceChecklist,
      evidence_honesty_directives: [
        "BOFIA 2020 & CBN Consumer Protection Regulations 2019 Regulation 7 Truthfulness Rule: NEVER invent operational incident dates, database migration deadlocks, exact unauthorized-debit counts, Naira refund amounts, ticket timestamps, or past STR/CAR/VAPT/DPO certifications not present in verified internal evidence.",
        "Explicitly distinguish (a) Completed & Evidenced Actions, (b) Gaps / Records Not Yet Supplied ([NEEDS_INTERNAL_EVIDENCE]), and (c) Prospective Commitments ('will implement'). Use safe [insert ...] placeholders for unverified fields.",
        ...(hasUnitMfbPartnerSignal
          ? [
              "Unit MFB Geographic Scope Check: Explicitly request written confirmation from the Sponsor Bank that the partnership, customer geography, virtual accounts, and product scope fall within its subsisting Unit MFB permissions and applicable CBN approvals (a nationwide app does not expand a Unit MFB's licensed scope).",
            ]
          : []),
        ...(hasSupervisoryIncidentSignal
          ? [
              "Unauthorised Debit vs. Failed NIP Separation: Cite Cybercrimes Act 2015 Section 37(3) (72-hour legal-authorisation or reversal duty from written customer notice; ₦5,000,000 fine) separately from CBN Instant EFT Regulation 2018 Sections 5.2(8) (10 minutes), 5.2(9) (1 hour post-settlement), 5.3(2)-(4) (60 seconds / 24h), 10.1.2 (3 working days), 11 (24-hour failed-NIP sanction), and 5.1(13) (daily NIBSS fraud returns).",
            ]
          : []),
      ],
    };
  }

  /**
   * Tool 31: compare_african_jurisdictions
   */
  public async compareAfricanJurisdictions(
    args: {
      topic: string;
      jurisdictions: string[];
      product_type?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const requested = (args.jurisdictions || [])
      .map((j) => resolveJurisdictionDescriptor(j).code)
      .filter((j) => j.length >= 2);
    const jurisdictions: SearchJurisdiction[] = extractTargetJurisdictionsFromPrompt(
      args.topic,
      requested.length > 0 ? requested : ["NG"]
    );

    const hasCrossBorder = jurisdictions.some((j) => j !== "NG");
    if (hasCrossBorder) {
      const gate = await entitlementsService.checkTenantEntitlement(
        ctx.tenantId,
        "cross_border_research"
      );
      if (!gate.allowed) {
        return {
          success: false,
          upgrade_required: true,
          feature: "cross_border_research",
          reason:
            gate.reason ||
            "Pan-African & Global cross-border comparison requires the Scale or Enterprise plan.",
          jurisdiction_profiles: jurisdictions.map(
            (j) => AFRICA_JURISDICTION_REGISTRY[j] || resolveJurisdictionDescriptor(j)
          ),
          statutory_vault_ng: [],
          live_results: [],
        };
      }
    }

    const vaultPromise = jurisdictions.includes("NG")
      ? this.searchRegulatoryEvidence({ query: args.topic, limit: 5 }, ctx).catch(() => ({
          results: [],
        }))
      : Promise.resolve({ results: [] });

    const combinedTopic = `${args.topic} ${args.product_type || ""}`.trim();
    const plannedSubQueries = planMultiJurisdictionSearchQueries(
      combinedTopic,
      jurisdictions,
      args.product_type
    );

    const liveSearchPromise = (async () => {
      if (
        typeof webSearchRouter.isDualEngineActive === "function" &&
        webSearchRouter.isDualEngineActive()
      ) {
        if (!ctx.quotaPreConsumed) {
          const auth = await entitlementsService.authorizeAndConsumeLiveSearch(
            ctx.tenantId,
            jurisdictions
          );
          if (!auth.allowed) {
            return {
              status: "upgrade_required",
              results: [],
            };
          }
        }
        const africaResult = await webSearchRouter.searchAfricaLiveWeb(
          {
            query: combinedTopic,
            jurisdictions,
            searchIntent: "CROSS_BORDER",
            includeNews: true,
            timeoutMs: 14000,
            subQueries: plannedSubQueries,
          },
          ctx.tenantId
        );
        return {
          status: "ok",
          web_summary: africaResult.webSummary,
          results: africaResult.results.map((r) => ({
            live_web_retrieval_id: r.live_web_retrieval_id,
            page_title: r.page_title,
            retrieved_url: r.retrieved_url,
            snippet_content: r.full_content_excerpt || r.snippet_content,
            full_content_excerpt: r.full_content_excerpt,
            highlights: r.highlights,
            published_at: r.published_at,
            retrieved_at: r.retrieved_at,
            provider: r.provider,
            jurisdiction_code: r.jurisdiction_code,
            trust_tier: r.trust_tier,
            source_class: "LIVE_WEB_INTELLIGENCE",
          })),
        };
      }
      return this.searchLiveWeb(
        {
          query: combinedTopic,
          jurisdictions,
          include_news: true,
        },
        ctx
      );
    })().catch(() => ({ status: "error", results: [] }));

    const [vaultRes, liveRes] = await Promise.all([vaultPromise, liveSearchPromise]);

    return {
      success: true,
      topic: args.topic,
      jurisdictions,
      jurisdiction_profiles: jurisdictions.map(
        (j) => AFRICA_JURISDICTION_REGISTRY[j] || resolveJurisdictionDescriptor(j)
      ),
      statutory_vault_ng: (vaultRes.results as Array<Record<string, unknown>>) || [],
      live_web_status: liveRes.status || "ok",
      live_results: (liveRes.results as Array<Record<string, unknown>>) || [],
    };
  }

  /**
   * Tool 32: upsert_work_product_artifact
   */
  public async upsertWorkProductArtifact(
    args: {
      work_product_id?: string;
      workflow_type: string;
      artifact_type: string;
      title: string;
      jurisdiction_scope?: string[];
      markdown_content: string;
      structured_payload?: Record<string, unknown>;
      citations?: WorkProductCitation[];
      evidence_gaps?: WorkProductEvidenceGap[];
      status?: string;
      change_summary?: string;
    },
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const workflowType = (WORKFLOW_TYPES as readonly string[]).includes(args.workflow_type)
      ? (args.workflow_type as WorkflowType)
      : "PRODUCT_STRUCTURING_MEMO";

    const artifactType = (WORK_PRODUCT_ARTIFACT_TYPES as readonly string[]).includes(
      args.artifact_type
    )
      ? (args.artifact_type as WorkProductArtifactType)
      : "statutory_structuring_memo";

    const jurisdictions: SearchJurisdiction[] = (
      args.jurisdiction_scope && args.jurisdiction_scope.length > 0
        ? args.jurisdiction_scope
        : ["NG"]
    )
      .map((j) => resolveJurisdictionDescriptor(j).code)
      .filter((j) => j.length >= 2);

    const status: WorkProductStatus =
      args.status === "REVIEWED" || args.status === "FINALIZED" || args.status === "ARCHIVED"
        ? args.status
        : "DRAFT";

    const { workProduct, created } = await workProductService.upsertWorkProduct(
      ctx.tenantId,
      ctx.userId || "system_copilot",
      {
        work_product_id: args.work_product_id,
        conversation_id: ctx.conversationId || null,
        workflow_type: workflowType,
        artifact_type: artifactType,
        title: args.title,
        jurisdiction_scope: jurisdictions.length > 0 ? jurisdictions : ["NG"],
        markdown_content: args.markdown_content,
        structured_payload: args.structured_payload || {},
        citations: args.citations || [],
        evidence_gaps: args.evidence_gaps || [],
        status,
        change_summary: args.change_summary,
      },
      {
        allowedLiveUrls: ctx.allowedLiveUrls,
        hasInternalKnowledgeRefs: ctx.hasInternalKnowledgeRefs,
      }
    );

    return {
      success: true,
      created,
      work_product: {
        id: workProduct.id,
        workflow_type: workProduct.workflow_type,
        artifact_type: workProduct.artifact_type,
        title: workProduct.title,
        version_number: workProduct.version_number,
        status: workProduct.status,
        evidence_gaps_count: workProduct.evidence_gaps?.length || 0,
        guardrail_report: workProduct.guardrail_report,
      },
    };
  }
}

export const statutoryToolExecutor = new StatutoryToolExecutor();
