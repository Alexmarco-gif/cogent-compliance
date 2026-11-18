/**
 * Cogent Marketing Shield - Conversation, Autonomous Analyst & SSE Contracts
 * Document Reference: Document 04 (Section 3, Section 7), Document 08 (Phase 6), Document 13
 */

import { z } from "zod";
import { jurisdictionCodeSchema } from "./search.contracts";
import { WORKFLOW_TYPES, WORK_PRODUCT_ARTIFACT_TYPES } from "./work-product.contracts";

export const conversationContextTypeEnum = z.enum([
  "GENERAL",
  "REGULATORY",
  "CAMPAIGN",
  "WORKFLOW_RESEARCH",
  "POLICY_REDLINE",
  "DDQ_RESPONSE",
  "CROSS_BORDER",
]);
export const conversationStatusEnum = z.enum(["ACTIVE", "ARCHIVED", "CLOSED"]);
export const messageRoleEnum = z.enum(["USER", "ASSISTANT", "SYSTEM", "TOOL"]);
export const messageContentTypeEnum = z.enum(["TEXT", "STRUCTURED", "MIXED"]);
export const messageStatusEnum = z.enum(["PENDING", "STREAMING", "COMPLETED", "FAILED"]);

export const sourceClassEnum = z.enum([
  "VERIFIED_OFFICIAL_SOURCE",
  "INTERNAL_PLAYBOOK",
  "LIVE_WEB_INTELLIGENCE",
]);

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).default("New Compliance Consultation"),
  context_type: conversationContextTypeEnum.default("GENERAL"),
  active_campaign_id: z.string().uuid().nullable().optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(255),
});

export const listConversationsQuerySchema = z.object({
  status: conversationStatusEnum.default("ACTIVE").optional(),
  limit: z.coerce.number().min(1).max(50).default(20).optional(),
  cursor: z.string().optional(),
});

export const sendMessageStreamSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(15000),
  attachment_asset_ids: z.array(z.string().uuid()).default([]).optional(),
  campaign_urls: z.array(z.string().url()).default([]).optional(),
  active_campaign_id: z.string().uuid().nullable().optional(),
  referenced_product_id: z.string().uuid().nullable().optional(),
  referenced_knowledge_doc_id: z.string().uuid().nullable().optional(),
  enable_live_web_search: z.boolean().default(false).optional(),
  search_jurisdictions: z.array(jurisdictionCodeSchema).default(["NG"]).optional(),
  workflow_hint: z.enum(WORKFLOW_TYPES).optional(),
  replace_from_message_id: z.string().uuid().optional(),
});

export interface PersistedMessageAttachment {
  asset_id: string;
  filename: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
}

export const searchRegulatoryEvidenceArgsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  regulators: z.array(z.enum(["CBN", "FCCPC", "ARCON", "NDPC", "SEC"])).optional(),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  include_superseded: z.boolean().default(false).optional(),
  limit: z.number().int().min(1).max(15).default(5).optional(),
});

export const getRegulatoryProvisionArgsSchema = z.object({
  regulatory_clause_id: z.string().uuid("Invalid regulatory_clause_id UUID"),
});

export const verifyRegulatoryEvidenceArgsSchema = z.object({
  regulatory_clause_ids: z.array(z.string().uuid()).min(1),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const assessRegulatoryApplicabilityArgsSchema = z.object({
  regulatory_clause_ids: z.array(z.string().uuid()).min(1),
  institution_type: z.string().optional(),
  product_type: z.string().optional(),
  channel: z
    .enum([
      "SOCIAL_MEDIA",
      "SMS",
      "WEB_LANDING",
      "PRINT_FLYER",
      "EMAIL",
      "RADIO_TV",
      "INFLUENCER",
      "OTHER",
    ])
    .optional(),
});

export interface CitationItem {
  source_class: "VERIFIED_OFFICIAL_SOURCE" | "INTERNAL_PLAYBOOK" | "LIVE_WEB_INTELLIGENCE";
  badge_label: string;
  regulator?: string;
  instrument_title?: string;
  clause_reference?: string;
  regulatory_clause_id?: string;
  rule_title?: string;
  knowledge_rule_id?: string;
  page_title?: string;
  retrieved_url?: string;
  live_web_retrieval_id?: string;
  provider?: string;
  trust_tier?: "OFFICIAL_REGULATOR_WEB" | "VERIFIED_AFRICAN_LEGAL_MEDIA" | "GENERAL_LIVE_WEB";
  jurisdiction_code?: string;
  retrieved_at?: string;
}

export interface FollowUpSuggestion {
  id: string;
  kind: "workflow" | "question";
  label: string;
  prompt: string;
  workflow_hint?: (typeof WORKFLOW_TYPES)[number];
  badge_label?: string;
}

export interface ExecutionPlanStep {
  step_id: string;
  step_number: number;
  title: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  summary?: string;
}

export interface BlindSpotFindingItem {
  finding_id?: string;
  finding_code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  what_you_missed: string;
  what_it_costs_you: string;
  one_click_fix: string;
  violated_statute: string;
  exact_quote: string;
  regulatory_clause_id?: string;
}

export interface ComputedLoanExample {
  principal_ngn: number;
  processing_fee_ngn: number;
  insurance_fee_ngn: number;
  management_fee_ngn: number;
  total_upfront_fees_ngn: number;
  net_disbursed_cash_ngn: number;
  nominal_interest_ngn: number;
  total_cost_of_credit_ngn: number;
  total_repayable_ngn: number;
}

export interface ComputedFinancials {
  product_name: string;
  principal_ngn: number;
  itemized_upfront_fees: Array<{
    label: string;
    amount_ngn: number;
    basis: string;
  }>;
  total_upfront_fees_ngn: number;
  net_disbursed_cash_ngn: number;
  nominal_interest_ngn: number;
  advertised_rate_percent: number;
  advertised_rate_period: string;
  advertised_implied_apr_percent: number;
  total_cost_of_credit_ngn: number;
  total_repayable_ngn: number;
  /** Annualized total cost of credit on gross principal: (TCC / Principal) * (365 / Tenor) */
  effective_apr_percent: number;
  /** True simple annualised APR on actual net cash received (Actual/365): (TCC / NetDisbursed) * (365 / Tenor) */
  effective_net_disbursed_apr_percent: number;
  /** Exact 6-decimal simple annualised APR on net cash (Actual/365) */
  effective_net_disbursed_apr_exact_percent?: number;
  /** Periodic borrowing cost over the loan tenor: (TCC / NetDisbursed) * 100 */
  periodic_cost_rate_percent?: number;
  /** Compounded Effective Annual Rate (EAR) on net cash (Actual/365): ((Repayment / NetDisbursed)^(365 / Tenor) - 1) * 100 */
  effective_compound_ear_percent?: number;
  /** Exact 6-decimal Compounded EAR (Actual/365) */
  effective_compound_ear_exact_percent?: number;
  /** Simple annualised APR on net cash under 360-day / twelve 30-day periods convention */
  nominal_apr_360_percent?: number;
  /** Compounded EAR on net cash under 360-day / twelve 30-day periods convention */
  effective_ear_360_percent?: number;
  daily_penalty_percent?: number;
  monthly_equivalent_penalty_percent?: number;
  daily_late_fee_percent?: number;
  annualized_late_fee_percent?: number;
  formula_breakdown?: {
    period_cost_formula: string;
    simple_apr_formula: string;
    compound_ear_formula: string;
    late_fee_annualized_formula?: string;
  };
  tenor_days: number;
  drip_pricing_detected: boolean;
  short_tenor_violation: boolean;
  mfb_processing_fee_cap_violation?: boolean;
  excessive_penalty_violation?: boolean;
  unsubstantiated_insurance_fee?: boolean;
  /** Cash-flow schedules for all loan amounts mentioned in the campaign (e.g. ₦200,000 & ₦500,000) */
  loan_examples?: ComputedLoanExample[];
  /** Lawfully repriced redesign schedule (removing unlawful >1% processing fee, unsubstantiated insurance, and >1%/mo penal charge) */
  lawful_redesign_schedule?: {
    assumed_interest_rate_percent: number;
    tenor_days: number;
    processing_fee_ngn: number;
    insurance_fee_ngn: number;
    default_penalty_ngn: number;
    simple_annualised_apr_365_percent: number;
    effective_annual_rate_365_percent: number;
    examples: Array<{
      principal_ngn: number;
      net_received_ngn: number;
      interest_payable_ngn: number;
      total_cost_of_credit_ngn: number;
      total_repayment_ngn: number;
    }>;
  };
}

export type ComplianceArtifactType = (typeof WORK_PRODUCT_ARTIFACT_TYPES)[number];

export interface ComplianceArtifactItem {
  id: string;
  type: ComplianceArtifactType;
  title: string;
  subtitle: string;
  badge_label: string;
}

export interface StructuredComplianceReport {
  pre_flight_gate: {
    verdict: "PASS" | "CONDITIONAL" | "BLOCK";
    risk_score: number;
    lock_summary: {
      lock1_prohibited_terms: "PASS" | "FAIL";
      lock2_product_rate_match: "PASS" | "FAIL";
      lock3_mandatory_disclosures: "PASS" | "FAIL";
      total_breaches: number;
    };
    apr_audit?: {
      product_name: string;
      principal_ngn: number;
      tenor_days: number;
      advertised_implied_apr: number;
      effective_nominal_apr: number;
      effective_net_disbursed_apr: number;
      upfront_fees_ngn: number;
      net_disbursed_ngn: number;
      total_repayment_ngn: number;
      drip_pricing_detected: boolean;
      short_tenor_violation: boolean;
    } | null;
  };
  computed_financials?: ComputedFinancials | null;
  blind_spot_findings: BlindSpotFindingItem[];
  compliance_artifacts?: ComplianceArtifactItem[];
  artifacts: {
    compliant_rewrite?: {
      channel: string;
      rewritten_copy: string;
      sms_160_char?: string;
      web_landing_html?: string;
      verified_by_locks: boolean;
    };
    kfs_table?: {
      product_name: string;
      rows: Array<{
        field: string;
        value: string;
        statutoryBasis: string;
      }>;
      markdown_table: string;
    };
    arcon_asp_memo?: string;
  };
  campaign_context?: {
    campaign_id?: string | null;
    campaign_name?: string | null;
    revision_id?: string | null;
    revision_number?: number;
    product_id?: string | null;
    product_name?: string | null;
  } | null;
  work_product_id?: string | null;
}

export type SSEEvent =
  | {
      type: "message.started";
      data: {
        user_message_id: string;
        assistant_message_id: string;
        sequence_number: number;
        user_attachments?: PersistedMessageAttachment[];
      };
    }
  | {
      type: "plan.created";
      data: {
        steps: ExecutionPlanStep[];
      };
    }
  | {
      type: "plan.step_updated";
      data: {
        step_id: string;
        status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
        summary?: string;
      };
    }
  | {
      type: "search.track_started";
      data: {
        track: "VAULT_AND_PLAYBOOKS" | "SERPAPI_NG_AFRICA" | "EXA_NEURAL_EXTRACTION";
        label: string;
        jurisdictions: string[];
      };
    }
  | {
      type: "search.track_completed";
      data: {
        track: string;
        result_count: number;
        latency_ms: number;
        cache_hit: boolean;
        status: "COMPLETED" | "SKIPPED" | "TIMEOUT";
      };
    }
  | {
      type: "entitlement.blocked";
      data: {
        feature: "live_web_search" | "cross_border_research";
        reason: string;
        upgrade_plan: "growth" | "scale";
        vault_fallback_active: true;
      };
    }
  | {
      type: "work_product.created" | "work_product.updated";
      data: {
        work_product_id: string;
        artifact_type: string;
        workflow_type: string;
        title: string;
        version_number: number;
      };
    }
  | {
      type: "tool.started";
      data: {
        tool_call_id: string;
        tool_name: string;
        display_label: string;
      };
    }
  | {
      type: "tool.completed";
      data: {
        tool_call_id: string;
        tool_name: string;
        status: "COMPLETED" | "FAILED";
        summary: string;
      };
    }
  | {
      type: "campaign.created";
      data: {
        campaign_id: string;
        revision_id: string;
        revision_number: number;
        campaign_name: string;
        status: string;
      };
    }
  | {
      type: "assessment.completed";
      data: {
        assessment_id?: string;
        campaign_id?: string;
        revision_id?: string;
        overall_risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        structured_report: StructuredComplianceReport;
      };
    }
  | {
      type: "assistant.delta";
      data: {
        text_delta: string;
      };
    }
  | {
      type: "message.completed";
      data: {
        assistant_message_id: string;
        finish_reason: string;
        citations: CitationItem[];
        follow_ups?: FollowUpSuggestion[];
        conversation_title?: string;
        structured_report?: StructuredComplianceReport;
        work_product_id?: string;
      };
    }
  | {
      type: "message.failed";
      data: {
        error_code: string;
        message: string;
      };
    };

