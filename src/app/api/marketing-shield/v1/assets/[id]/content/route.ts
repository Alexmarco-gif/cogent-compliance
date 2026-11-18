/**
 * Cogent Compliance Platform
 * Authenticated Tenant-Scoped Asset Preview & File Content Route
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  routeProps: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const resolvedParams = await routeProps.params;
  const assetId = resolvedParams.id;

  try {
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "conversation.read");

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
    const { data: asset, error } = await supabase
      .from("campaign_assets")
      .select("id, tenant_id, original_filename, mime_type, storage_key, file_size_bytes")
      .eq("tenant_id", tenant.tenantId)
      .eq("id", assetId)
      .maybeSingle();

    if (error || !asset || !asset.storage_key) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ASSET_NOT_FOUND", message: "Asset not found", request_id: requestId },
        },
        { status: 404 }
      );
    }

    const forceDownload = req.nextUrl.searchParams.get("download") === "1";
    const safeFilename = String(asset.original_filename || "attachment").replace(/[^a-zA-Z0-9._ -]/g, "_");
    const disposition = forceDownload ? "attachment" : "inline";

    try {
      const buffer = await r2StorageService.getObjectBuffer(asset.storage_key);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": asset.mime_type || "application/octet-stream",
          "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      const signedUrl = await r2StorageService.generatePresignedDownloadUrl(asset.storage_key, 900);
      if (signedUrl.includes("mock-r2.local")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ASSET_PREVIEW_UNAVAILABLE",
              message: "Binary preview is not available in local mock storage mode.",
              request_id: requestId,
            },
          },
          { status: 404 }
        );
      }
      return NextResponse.redirect(signedUrl, {
        status: 302,
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      });
    }
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

    logger.error("Asset content fetch failed", {
      requestId,
      assetId,
      error: (err as Error).message,
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load asset content", request_id: requestId },
      },
      { status: 500 }
    );
  }
}
