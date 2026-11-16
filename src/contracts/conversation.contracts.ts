/**
 * Cogent Marketing Shield - Conversation, Autonomous Analyst & SSE Contracts
 * Document Reference: Document 04 (Section 3, Section 7), Document 08 (Phase 6), Document 13
 */

import { z } from "zod";

export const conversationContextTypeEnum = z.enum(["GENERAL", "REGULATORY", "CAMPAIGN"]);
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
  content: z.string().min(1, "Message content cannot be empty").max(10000),
  attachment_asset_ids: z.array(z.string().uuid()).default([]).optional(),
  campaign_urls: z.array(z.string().url()).default([]).optional(),
  active_campaign_id: z.string().uuid().nullable().optional(),
  referenced_product_id: z.string().uuid().nullable().optional(),
});

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
  blind_spot_findings: BlindSpotFindingItem[];
  artifacts: {
    compliant_rewrite?: {
      channel: string;
      rewritten_copy: string;
      sms_160_char?: string;
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
}

export type SSEEvent =
  | {
      type: "message.started";
      data: {
        user_message_id: string;
        assistant_message_id: string;
        sequence_number: number;
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
        conversation_title?: string;
        structured_report?: StructuredComplianceReport;
      };
    }
  | {
      type: "message.failed";
      data: {
        error_code: string;
        message: string;
      };
    };
