/**
 * Cogent Marketing Shield - Campaign, Asset & Assessment Domain Contracts
 * Document Reference: Document 04 (Section 4), Document 05 (Section 6-8), Document 08 (Phase 7)
 */

import { z } from "zod";

/**
 * 11 Controlled Claim Categories (Document 05 Section 8 / Migration Schema)
 */
export const STATUTORY_CLAIM_CATEGORIES = [
  "INTEREST_RATE_OR_APR",
  "FEE_OR_CHARGE_REPRESENTATION",
  "GUARANTEED_APPROVAL_OR_RETURN",
  "SPEED_OR_INSTANT_DISBURSEMENT",
  "PROMOTIONAL_OFFER_OR_DISCOUNT",
  "ELIGIBILITY_OR_TENOR_TERM",
  "REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM",
  "SECURITY_OR_DATA_PRIVACY_CLAIM",
  "COMPARATIVE_OR_SUPERLATIVE_CLAIM",
  "MANDATORY_DISCLOSURE_OR_DISCLAIMER",
  "INFLUENCER_OR_TESTIMONIAL_REPRESENTATION",
] as const;

export type StatutoryClaimCategory = (typeof STATUTORY_CLAIM_CATEGORIES)[number];

export const CAMPAIGN_CHANNELS = [
  "SOCIAL_MEDIA",
  "SMS",
  "WEB_LANDING",
  "PRINT_FLYER",
  "EMAIL",
  "RADIO_TV",
  "INFLUENCER",
  "OTHER",
] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const DB_CAMPAIGN_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PROCESSING",
  "ASSESSMENT_IN_PROGRESS",
  "FINDINGS_AVAILABLE",
  "REVISION_REQUIRED",
  "RESUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export type DbCampaignStatus = (typeof DB_CAMPAIGN_STATUSES)[number];

export const RISK_LEVELS = ["PENDING", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const DB_FINDING_SEVERITIES = ["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type DbFindingSeverity = (typeof DB_FINDING_SEVERITIES)[number];

export const APPLICABILITY_STATUSES = [
  "VERIFIED",
  "POTENTIALLY_APPLICABLE",
  "APPLICABILITY_UNCERTAIN",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type ApplicabilityStatus = (typeof APPLICABILITY_STATUSES)[number];

/**
 * 1. Create Campaign Contract (Document 04 Section 4.1)
 */
export const createCampaignSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  campaign_name: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  campaign_type: z.string().default("PROMOTIONAL"),
  channel: z.enum(CAMPAIGN_CHANNELS).default("SOCIAL_MEDIA"),
  product_id: z.string().uuid().optional(),
  initial_content_text: z.string().max(50000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateCampaignInput = z.input<typeof createCampaignSchema>;

/**
 * 2. List Campaigns Query Schema (Document 04 Section 4.2)
 */
export const listCampaignsQuerySchema = z.object({
  status: z.enum(DB_CAMPAIGN_STATUSES).optional(),
  channel: z.enum(CAMPAIGN_CHANNELS).optional(),
  risk_level: z.enum(RISK_LEVELS).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type ListCampaignsQuery = z.input<typeof listCampaignsQuerySchema>;

/**
 * 3. Presigned Asset Upload Session (Document 04 Section 4.3)
 */
export const assetUploadSessionRequestSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  original_filename: z.string().min(1).max(255),
  mime_type: z.enum([
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  file_size_bytes: z.number().positive().max(52428800), // 50MB max
  sha256_hash: z.string().length(64).regex(/^[a-fA-F0-9]{64}$/, "Must be a valid hex SHA-256 hash"),
});

export type AssetUploadSessionRequest = z.input<typeof assetUploadSessionRequestSchema>;

export const assetUploadSessionResponseSchema = z.object({
  asset_id: z.string().uuid(),
  presigned_upload_url: z.string().url(),
  storage_key: z.string(),
  expires_in_seconds: z.number(),
  max_size_bytes: z.number(),
});

export type AssetUploadSessionResponse = z.infer<typeof assetUploadSessionResponseSchema>;

/**
 * 4. Complete Asset Upload & Trigger Extraction (Document 04 Section 4.3)
 */
export const completeAssetUploadSchema = z.object({
  auto_assess: z.boolean().default(true),
});

export type CompleteAssetUploadInput = z.input<typeof completeAssetUploadSchema>;

/**
 * 5. Update OCR Extraction Segment (Document 04 Section 4.3)
 */
export const updateExtractionSegmentSchema = z.object({
  text_content: z.string().min(1).max(5000),
  correction_reason: z.string().max(500).optional(),
});

export type UpdateExtractionSegmentInput = z.input<typeof updateExtractionSegmentSchema>;

/**
 * 6. Trigger Campaign Assessment (Document 04 Section 4.4)
 */
export const triggerAssessmentSchema = z.object({
  revision_id: z.string().uuid().optional(),
  include_live_web_check: z.boolean().default(false),
});

export type TriggerAssessmentInput = z.input<typeof triggerAssessmentSchema>;

/**
 * Normalized Bounding Box [ymin, xmin, ymax, xmax] in 0-1000 scale
 */
export const boundingBoxSchema = z.object({
  ymin: z.number().min(0).max(1000),
  xmin: z.number().min(0).max(1000),
  ymax: z.number().min(0).max(1000),
  xmax: z.number().min(0).max(1000),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type BoundingBox = z.infer<typeof boundingBoxSchema>;

/**
 * Structured Claim Extraction Schema
 */
export const extractedClaimSchema = z.object({
  claim_text: z.string().min(1),
  normalized_claim: z.string().optional(),
  claim_category: z.enum(STATUTORY_CLAIM_CATEGORIES),
  confidence: z.number().min(0).max(1).default(0.9),
  page_number: z.number().int().positive().default(1),
  bounding_box: boundingBoxSchema.optional(),
  source_type: z.enum(["DIRECT_TEXT", "OCR"]).default("DIRECT_TEXT"),
});

export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;
