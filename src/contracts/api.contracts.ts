/**
 * Cogent Marketing Shield - Canonical API Contracts & Standard Envelopes
 * Document Reference: Document 04 (Section 2.3)
 */

import { z } from "zod";

/**
 * Standard API error codes defined across Document 04 & Document 07.
 */
export const StandardErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "TENANT_CONTEXT_INVALID",
  "TENANT_SUSPENDED",
  "APPROVAL_NOT_PERMITTED",
  "SELF_APPROVAL_VIOLATION",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "ASSET_TYPE_UNSUPPORTED",
  "HASH_MISMATCH",
  "MALWARE_DETECTED",
  "AUDIT_INTEGRITY_VIOLATION",
  "INTERNAL_SERVER_ERROR",
]);

export type StandardErrorCode = z.infer<typeof StandardErrorCodeSchema>;

/**
 * Standard error detail schema.
 */
export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  issue: z.string(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

/**
 * Standard JSON metadata block present on all responses.
 */
export const ApiMetaSchema = z.object({
  request_id: z.string().uuid(),
  timestamp: z.string().datetime(),
});

export type ApiMeta = z.infer<typeof ApiMetaSchema>;

// Alias for backwards compatibility with health test
export const apiMetaSchema = ApiMetaSchema;

export const healthDataSchema = z.object({
  status: z.string(),
  service: z.string(),
  version: z.string(),
  architecture: z.string().optional(),
  environment: z.string().optional(),
  timestamp: z.string().optional(),
});

export type HealthData = z.infer<typeof healthDataSchema>;

/**
 * Standard JSON success envelope matching Document 04 Section 2.3.
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ApiMetaSchema,
  });
}

/**
 * Standard JSON error envelope matching Document 04 Section 2.3.
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: StandardErrorCodeSchema,
    message: z.string(),
    details: z.array(ApiErrorDetailSchema).optional(),
  }),
  meta: ApiMetaSchema,
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Standard paginated collection envelope.
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: z.object({
        limit: z.number().int().positive(),
        next_cursor: z.string().nullable(),
        has_more: z.boolean(),
        total_count: z.number().int().nonnegative().optional(),
      }),
    }),
    meta: ApiMetaSchema,
  });
}

// ==============================================================================
// Domain Enums & Schemas
// ==============================================================================

/**
 * Exact 11-state campaign lifecycle from Documents 01–04.
 */
export const CampaignStatusSchema = z.enum([
  "DRAFT",
  "INTAKE_PROCESSING",
  "ASSESSMENT_PENDING",
  "ASSESSMENT_COMPLETE",
  "REVISION_PROPOSED",
  "REVIEW_PENDING",
  "APPROVED_PENDING_PUBLICATION",
  "PUBLISHED",
  "ARCHIVED",
  "REJECTED",
  "RESUBMITTED",
]);

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

/**
 * Five Nigerian regulatory bodies governing marketing compliance.
 */
export const RegulatorCodeSchema = z.enum(["CBN", "FCCPC", "ARCON", "NDPC", "SEC"]);

export type RegulatorCode = z.infer<typeof RegulatorCodeSchema>;

/**
 * Finding severity classification.
 */
export const FindingSeveritySchema = z.enum([
  "CRITICAL_BREACH",
  "HIGH_RISK",
  "MEDIUM_RISK",
  "LOW_RISK",
  "OBSERVATION",
]);

export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/**
 * Supported asset MIME types with strict binary inspection.
 */
export const SupportedMimeTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type SupportedMimeType = z.infer<typeof SupportedMimeTypeSchema>;

/**
 * Claim categories extracted from marketing assets.
 */
export const ClaimCategorySchema = z.enum([
  "INTEREST_RATE_OR_APR",
  "FEES_AND_CHARGES",
  "SPEED_OR_TIMELINE",
  "SECURITY_OR_DEPOSIT_PROTECTION",
  "DISCLAIMER_SUFFICIENCY",
  "GENERAL_OMISSION",
]);

export type ClaimCategory = z.infer<typeof ClaimCategorySchema>;
