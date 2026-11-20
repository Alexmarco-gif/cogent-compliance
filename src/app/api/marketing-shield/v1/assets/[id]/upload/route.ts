/**
 * Cogent Marketing Shield - Same-Origin Asset Upload Proxy Route
 * Document Reference: Document 07 (Section 6.1), Document 08 (Phase 7)
 *
 * Provides a tenant-authenticated server-to-server R2 upload fallback when
 * direct browser PUT requests to presigned R2 URLs are blocked by bucket CORS.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { r2StorageService, R2StorageService } from "@/modules/asset-processing/r2.storage";
import { logger } from "@/lib/logger";
import type { SupportedMimeType } from "@/contracts/api.contracts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PUT(
  req: NextRequest,
  routeProps: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const resolvedParams = await routeProps.params;
  const assetId = resolvedParams.id;

  try {
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "asset.upload");

    if (!assetId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_FAILED", message: "Asset ID is required", request_id: requestId },
        },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();
    const { data: asset, error: assetErr } = await supabase
      .from("campaign_assets")
      .select("id, tenant_id, storage_key, mime_type, sha256_hash, file_size_bytes")
      .eq("tenant_id", tenant.tenantId)
      .eq("id", assetId)
      .maybeSingle();

    if (assetErr || !asset) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ASSET_NOT_FOUND", message: "Campaign asset upload session not found.", request_id: requestId },
        },
        { status: 404 }
      );
    }

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EMPTY_UPLOAD", message: "Uploaded file payload is empty.", request_id: requestId },
        },
        { status: 400 }
      );
    }

    if (asset.sha256_hash && !R2StorageService.verifySha256(buffer, asset.sha256_hash)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CHECKSUM_MISMATCH",
            message: "Uploaded file checksum does not match upload session.",
            request_id: requestId,
          },
        },
        { status: 400 }
      );
    }

    const declaredMime = asset.mime_type as SupportedMimeType;
    const magic = R2StorageService.verifyMagicBytes(buffer, declaredMime);
    if (!magic.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: magic.isHostilePayload ? "HOSTILE_FILE_REJECTED" : "INVALID_FILE_SIGNATURE",
            message: magic.reason || "File binary signature does not match declared file type.",
            request_id: requestId,
          },
        },
        { status: 400 }
      );
    }

    await r2StorageService.putObjectBuffer(asset.storage_key, buffer, asset.mime_type);

    const shouldInlineExtract = req.nextUrl.searchParams.get("extract") === "1";
    let extraction: unknown = undefined;
    if (shouldInlineExtract) {
      const { assetExtractorService } = await import(
        "@/modules/asset-processing/asset-extractor.service"
      );
      extraction = await assetExtractorService.extractAsset({
        tenantId: tenant.tenantId,
        assetId,
        buffer,
      });
    }

    logger.info("Uploaded asset via server proxy to R2", {
      tenantId: tenant.tenantId,
      assetId,
      storageKey: asset.storage_key,
      sizeBytes: buffer.length,
      inlineExtracted: shouldInlineExtract,
      requestId,
    });

    return NextResponse.json({
      success: true,
      data: {
        asset_id: assetId,
        storage_key: asset.storage_key,
        file_size_bytes: buffer.length,
        ...(extraction ? { extraction } : {}),
      },
    });
  } catch (err) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message, request_id: requestId },
        },
        { status: err.statusCode }
      );
    }

    const message = err instanceof Error ? err.message : "Asset upload failed";
    logger.error("Server-side asset upload proxy failed", {
      assetId,
      error: message,
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: { code: "ASSET_UPLOAD_FAILED", message, request_id: requestId },
      },
      { status: 500 }
    );
  }
}
