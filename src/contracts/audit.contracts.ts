/**
 * Cogent Marketing Shield - Cryptographic Audit Ledger Contracts
 * Document Reference: Document 07 (Section 8.1)
 */

import { z } from "zod";
import { CANONICAL_ROLES } from "@/modules/auth-tenancy/types";

export const AuditActionSchema = z.enum([
  "CONVERSATION_CREATED",
  "CAMPAIGN_CREATED",
  "CAMPAIGN_UPDATED",
  "CAMPAIGN_STATUS_CHANGED",
  "ASSET_UPLOADED",
  "ASSET_VERIFIED",
  "ASSESSMENT_EXECUTED",
  "REVISION_PROPOSED",
  "REVIEW_REQUESTED",
  "REVISION_APPROVED",
  "REVISION_REJECTED",
  "KNOWLEDGE_RULE_CREATED",
  "KNOWLEDGE_RULE_PUBLISHED",
  "PRODUCT_TRUTH_UPDATED",
  "USER_ROLE_CHANGED",
  "SECURITY_ALERT_TRIGGERED",
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditEntityTypeSchema = z.enum([
  "CONVERSATION",
  "CAMPAIGN",
  "ASSET",
  "ASSESSMENT",
  "FINDING",
  "REVISION",
  "APPROVAL",
  "KNOWLEDGE_DOCUMENT",
  "KNOWLEDGE_RULE",
  "PRODUCT",
  "TENANT",
  "USER",
]);

export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;

export const CreateAuditEventSchema = z.object({
  action: AuditActionSchema,
  entity_type: AuditEntityTypeSchema,
  entity_id: z.string().uuid(),
  payload: z.record(z.unknown()).default({}),
});

export type CreateAuditEventRequest = z.infer<typeof CreateAuditEventSchema>;

export const AuditEventResponseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  actor_id: z.string(),
  actor_role: z.enum(CANONICAL_ROLES),
  payload: z.record(z.unknown()),
  previous_state_hash: z.string(),
  new_state_hash: z.string(),
  created_at: z.string().datetime(),
});

export type AuditEventResponse = z.infer<typeof AuditEventResponseSchema>;
