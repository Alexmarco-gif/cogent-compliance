/**
 * Cogent Resources Hub - Dedicated Cloudflare R2 Media Storage Service
 *
 * Uses a SEPARATE Cloudflare R2 account/bucket configured exclusively via:
 *   - RESOURCES_R2_ACCOUNT_ID
 *   - RESOURCES_R2_ACCESS_KEY_ID
 *   - RESOURCES_R2_SECRET_ACCESS_KEY
 *   - RESOURCES_R2_BUCKET_NAME
 *   - RESOURCES_R2_PUBLIC_URL_PREFIX (optional public CDN / r2.dev domain)
 *
 * NEVER falls back to the core compliance SaaS R2_* account or Supabase Storage.
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { R2StorageService } from "@/modules/asset-processing/r2.storage";
import { logger } from "@/lib/logger";

export const RESOURCES_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type ResourcesAllowedMimeType = (typeof RESOURCES_ALLOWED_MIME_TYPES)[number];

export const MAX_RESOURCE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_RESOURCE_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

export function isResourcesAllowedMimeType(value: string): value is ResourcesAllowedMimeType {
  return (RESOURCES_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

function sanitizeEnvValue(raw: string | undefined, keyName: string): string {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith(`${keyName}=`)) {
    cleaned = cleaned.slice(keyName.length + 1).trim();
  }
  return cleaned.replace(/^['"]+|['"]+$/g, "").trim();
}

export function getResourcesR2Config(env: Record<string, string | undefined> = process.env) {
  const accountId = sanitizeEnvValue(env.RESOURCES_R2_ACCOUNT_ID, "RESOURCES_R2_ACCOUNT_ID");
  const accessKeyId = sanitizeEnvValue(env.RESOURCES_R2_ACCESS_KEY_ID, "RESOURCES_R2_ACCESS_KEY_ID");
  const secretAccessKey = sanitizeEnvValue(
    env.RESOURCES_R2_SECRET_ACCESS_KEY,
    "RESOURCES_R2_SECRET_ACCESS_KEY",
  );
  const bucketName = sanitizeEnvValue(env.RESOURCES_R2_BUCKET_NAME, "RESOURCES_R2_BUCKET_NAME");
  const publicUrlPrefix = sanitizeEnvValue(
    env.RESOURCES_R2_PUBLIC_URL_PREFIX,
    "RESOURCES_R2_PUBLIC_URL_PREFIX",
  ).replace(/\/+$/, "");

  const configured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
  return {
    configured,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrlPrefix: publicUrlPrefix || null,
  };
}

export function isResourcesR2Configured(env: Record<string, string | undefined> = process.env): boolean {
  return getResourcesR2Config(env).configured;
}

export function isValidResourcesStorageKey(storageKey: string): boolean {
  const trimmed = storageKey.trim();
  if (!trimmed.startsWith("resources/")) return false;
  if (trimmed.includes("..") || trimmed.includes("\\") || trimmed.startsWith("/")) return false;
  return /^resources\/[a-zA-Z0-9/._-]+$/.test(trimmed);
}

export interface UploadedResourceMediaResult {
  storageKey: string;
  publicUrl: string;
  mimeType: ResourcesAllowedMimeType;
  sizeBytes: number;
}

export class ResourcesMediaService {
  private client: S3Client | null = null;
  private bucketName: string = "";
  private publicUrlPrefix: string | null = null;
  private initializedKey: string = "";

  private ensureClient(): {
    client: S3Client;
    bucketName: string;
    publicUrlPrefix: string | null;
  } {
    const cfg = getResourcesR2Config();
    if (!cfg.configured) {
      throw new Error(
        "Resources R2 storage is not configured. Set RESOURCES_R2_ACCOUNT_ID, RESOURCES_R2_ACCESS_KEY_ID, RESOURCES_R2_SECRET_ACCESS_KEY, and RESOURCES_R2_BUCKET_NAME.",
      );
    }

    const cacheKey = `${cfg.accountId}:${cfg.accessKeyId}:${cfg.bucketName}:${cfg.publicUrlPrefix || ""}`;
    if (!this.client || this.initializedKey !== cacheKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
        },
      });
      this.bucketName = cfg.bucketName;
      this.publicUrlPrefix = cfg.publicUrlPrefix;
      this.initializedKey = cacheKey;
    }

    return {
      client: this.client,
      bucketName: this.bucketName,
      publicUrlPrefix: this.publicUrlPrefix,
    };
  }

  public buildPublicUrl(storageKey: string): string {
    const cfg = getResourcesR2Config();
    if (cfg.publicUrlPrefix) {
      return `${cfg.publicUrlPrefix}/${storageKey}`;
    }
    return `/api/marketing-shield/v1/resources/media/${storageKey}`;
  }

  public async uploadMedia(params: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<UploadedResourceMediaResult> {
    if (!isResourcesAllowedMimeType(params.mimeType)) {
      throw new Error(
        `Unsupported file type "${params.mimeType}". Allowed: PNG, JPEG, WEBP, PDF.`,
      );
    }

    const maxBytes =
      params.mimeType === "application/pdf" ? MAX_RESOURCE_PDF_BYTES : MAX_RESOURCE_IMAGE_BYTES;
    if (params.buffer.length === 0) {
      throw new Error("Uploaded file is empty.");
    }
    if (params.buffer.length > maxBytes) {
      throw new Error(
        `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit for ${params.mimeType}.`,
      );
    }

    const magic = R2StorageService.verifyMagicBytes(params.buffer, params.mimeType);
    if (!magic.valid) {
      throw new Error(magic.reason || "File binary signature failed validation.");
    }

    const { client, bucketName } = this.ensureClient();
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const sanitizedName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
    const id = crypto.randomUUID().slice(0, 12);
    const storageKey = `resources/${yyyy}/${mm}/${id}-${sanitizedName}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: params.buffer,
        ContentType: params.mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    logger.info("Uploaded resource media to dedicated Resources R2", {
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    });

    return {
      storageKey,
      publicUrl: this.buildPublicUrl(storageKey),
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }

  public async getMediaObject(storageKey: string): Promise<{
    buffer: Buffer;
    contentType: string;
  } | null> {
    if (!isValidResourcesStorageKey(storageKey)) {
      return null;
    }

    const { client, bucketName } = this.ensureClient();
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
        }),
      );
      if (!response.Body) return null;
      const bytes = await response.Body.transformToByteArray();
      return {
        buffer: Buffer.from(bytes),
        contentType: response.ContentType || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
}

export const resourcesMediaService = new ResourcesMediaService();
