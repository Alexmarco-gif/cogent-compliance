/**
 * Cogent Marketing Shield - Cloudflare R2 Private Object Storage Service
 * Document Reference: Document 07 (Section 6.1) & Document 08 (Phase 4)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { SupportedMimeType } from "@/contracts/api.contracts";

export interface PresignedUploadConfig {
  tenantId: string;
  assetId: string;
  filename: string;
  mimeType: SupportedMimeType;
  fileSizeBytes: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  maxSizeBytes: number;
}

export interface MagicByteValidationResult {
  valid: boolean;
  detectedMimeType: string | null;
  isHostilePayload: boolean;
  reason?: string;
}

export class R2StorageService {
  private client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || "cogent-marketing-shield-assets";

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  /**
   * Generates a tenant-scoped presigned PUT URL for direct client upload to Cloudflare R2.
   * Key pattern: tenants/{tenant_id}/assets/{asset_id}/{sanitized_filename}
   */
  public async generatePresignedUploadUrl(
    config: PresignedUploadConfig,
  ): Promise<PresignedUploadResult> {
    const sanitizedFilename = config.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `tenants/${config.tenantId}/assets/${config.assetId}/${sanitizedFilename}`;
    const expiresInSeconds = 900; // 15 minutes TTL

    // In testing/offline without client, generate mock presigned URL
    if (!this.client) {
      return {
        uploadUrl: `https://mock-r2.local/${this.bucketName}/${storageKey}?mock_presigned=true`,
        storageKey,
        expiresInSeconds,
        maxSizeBytes: config.fileSizeBytes,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: config.mimeType,
      ContentLength: config.fileSizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });

    logger.info("Generated R2 presigned upload URL", {
      tenantId: config.tenantId,
      assetId: config.assetId,
      storageKey,
      mimeType: config.mimeType,
    });

    return {
      uploadUrl,
      storageKey,
      expiresInSeconds,
      maxSizeBytes: config.fileSizeBytes,
    };
  }

  /**
   * Generates a short-lived presigned GET URL for secure, authorized asset download.
   */
  public async generatePresignedDownloadUrl(
    storageKey: string,
    expiresInSeconds: number = 900,
  ): Promise<string> {
    if (!this.client) {
      return `https://mock-r2.local/${this.bucketName}/${storageKey}?mock_download=true`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Deletes an asset from Cloudflare R2.
   */
  public async deleteAsset(storageKey: string): Promise<void> {
    if (!this.client) {
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    await this.client.send(command);
    logger.info("Deleted asset from R2", { storageKey });
  }

  /**
   * Inspects binary buffer magic bytes to verify genuine file type and reject disguised executables/SVGs/HTML.
   * Document 07 Section 6.1 specification:
   * - PNG: 89 50 4E 47 0D 0A 1A 0A
   * - JPEG: FF D8 FF
   * - WEBP: RIFF ... WEBP
   * - PDF: %PDF- (25 50 44 46 2D)
   * - DOCX: 50 4B 03 04 (PK\x03\x04 ZIP archive)
   * - Rejects: MZ (exe/dll), SVG (<svg), HTML (<!DOCTYPE, <html, <script)
   */
  public static verifyMagicBytes(
    buffer: Buffer,
    declaredMimeType: SupportedMimeType,
  ): MagicByteValidationResult {
    if (buffer.length < 4) {
      return {
        valid: false,
        detectedMimeType: null,
        isHostilePayload: false,
        reason: "File buffer too short for binary signature inspection (< 4 bytes)",
      };
    }

    const header = buffer.subarray(0, Math.min(buffer.length, 512));

    // 1. Hostile executable check: MZ (4D 5A)
    if (header[0] === 0x4d && header[1] === 0x5a) {
      return {
        valid: false,
        detectedMimeType: "application/x-dosexec",
        isHostilePayload: true,
        reason: "Hostile binary rejected: Disguised Windows executable (MZ header)",
      };
    }

    // 2. Hostile SVG / HTML check: <svg, <?xml ... <svg, <!DOCTYPE, <html, <script
    const textHeader = header.toString("utf-8").toLowerCase();
    if (
      textHeader.includes("<svg") ||
      textHeader.includes("<!doctype html") ||
      textHeader.includes("<html") ||
      textHeader.includes("<script")
    ) {
      return {
        valid: false,
        detectedMimeType: textHeader.includes("<svg") ? "image/svg+xml" : "text/html",
        isHostilePayload: true,
        reason: "Hostile payload rejected: Disguised SVG or HTML/Script content detected in binary header",
      };
    }

    // 3. Inspect genuine signatures according to declared MIME type
    switch (declaredMimeType) {
      case "image/png": {
        const isPng =
          buffer.length >= 8 &&
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47 &&
          buffer[4] === 0x0d &&
          buffer[5] === 0x0a &&
          buffer[6] === 0x1a &&
          buffer[7] === 0x0a;

        return {
          valid: isPng,
          detectedMimeType: isPng ? "image/png" : "application/octet-stream",
          isHostilePayload: false,
          reason: isPng ? undefined : "PNG magic bytes mismatch",
        };
      }

      case "image/jpeg": {
        const isJpeg =
          buffer.length >= 3 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff;

        return {
          valid: isJpeg,
          detectedMimeType: isJpeg ? "image/jpeg" : "application/octet-stream",
          isHostilePayload: false,
          reason: isJpeg ? undefined : "JPEG magic bytes mismatch",
        };
      }

      case "image/webp": {
        const isRiff =
          buffer.length >= 12 &&
          buffer[0] === 0x52 && // R
          buffer[1] === 0x49 && // I
          buffer[2] === 0x46 && // F
          buffer[3] === 0x46; // F

        const isWebp =
          buffer[8] === 0x57 && // W
          buffer[9] === 0x45 && // E
          buffer[10] === 0x42 && // B
          buffer[11] === 0x50; // P

        const valid = isRiff && isWebp;
        return {
          valid,
          detectedMimeType: valid ? "image/webp" : "application/octet-stream",
          isHostilePayload: false,
          reason: valid ? undefined : "WEBP RIFF magic bytes mismatch",
        };
      }

      case "application/pdf": {
        // %PDF- (25 50 44 46 2D)
        const isPdf =
          buffer.length >= 5 &&
          buffer[0] === 0x25 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x44 &&
          buffer[3] === 0x46 &&
          buffer[4] === 0x2d;

        return {
          valid: isPdf,
          detectedMimeType: isPdf ? "application/pdf" : "application/octet-stream",
          isHostilePayload: false,
          reason: isPdf ? undefined : "PDF '%PDF-' magic bytes mismatch",
        };
      }

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        // PK\x03\x04 (50 4B 03 04) - ZIP container for docx
        const isZip =
          buffer.length >= 4 &&
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x03 &&
          buffer[3] === 0x04;

        return {
          valid: isZip,
          detectedMimeType: isZip
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/octet-stream",
          isHostilePayload: false,
          reason: isZip ? undefined : "DOCX PK ZIP magic bytes mismatch",
        };
      }

      default:
        return {
          valid: false,
          detectedMimeType: null,
          isHostilePayload: false,
          reason: `Unsupported declared MIME type: ${declaredMimeType}`,
        };
    }
  }

  /**
   * Computes SHA-256 digest of a binary buffer and verifies exact match with client declaration.
   */
  public static verifySha256(buffer: Buffer, declaredHash: string): boolean {
    const computedHash = crypto.createHash("sha256").update(buffer).digest("hex");
    return computedHash.toLowerCase() === declaredHash.toLowerCase();
  }
}

export const r2StorageService = new R2StorageService();
