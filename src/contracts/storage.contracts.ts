/**
 * Cogent Marketing Shield - Storage & Asset Verification Contracts
 * Document Reference: Document 07 (Section 6.1)
 */

import { z } from "zod";
import { SupportedMimeTypeSchema } from "./api.contracts";

/**
 * Request body for generating a presigned PUT upload URL.
 */
export const CreatePresignedUploadSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, "Filename contains invalid characters"),
  mime_type: SupportedMimeTypeSchema,
  file_size_bytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024, "File size exceeds 25 MB limit"),
  campaign_id: z.string().uuid().optional(),
});

export type CreatePresignedUploadRequest = z.infer<typeof CreatePresignedUploadSchema>;

/**
 * Response returned to client for direct Cloudflare R2 upload.
 */
export const PresignedUploadResponseSchema = z.object({
  asset_id: z.string().uuid(),
  upload_url: z.string().url(),
  storage_key: z.string(),
  expires_in_seconds: z.number().int().default(900), // 15 minutes
  max_size_bytes: z.number().int(),
  required_headers: z.record(z.string()).default({}),
});

export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponseSchema>;

/**
 * Request payload when client notifies server that upload to R2 is complete.
 */
export const VerifyAssetUploadSchema = z.object({
  asset_id: z.string().uuid(),
  storage_key: z.string().min(1),
  sha256_hash: z
    .string()
    .length(64, "SHA-256 hash must be 64 hexadecimal characters")
    .regex(/^[a-fA-F0-9]{64}$/, "SHA-256 must be a valid hex digest"),
  declared_mime_type: SupportedMimeTypeSchema,
  file_size_bytes: z.number().int().positive(),
});

export type VerifyAssetUploadRequest = z.infer<typeof VerifyAssetUploadSchema>;

/**
 * Verification result after magic-byte & SHA-256 inspection.
 */
export const AssetVerificationResultSchema = z.object({
  asset_id: z.string().uuid(),
  verified: z.boolean(),
  detected_mime_type: z.string(),
  sha256_match: z.boolean(),
  file_size_bytes: z.number().int(),
  storage_key: z.string(),
});

export type AssetVerificationResult = z.infer<typeof AssetVerificationResultSchema>;
