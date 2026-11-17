/**
 * Cogent Regulatory Intelligence Platform
 * Work Product PDF, DOCX & Markdown Export Endpoint
 * POST /api/marketing-shield/v1/work-products/[id]/export (metadata + download URL)
 * GET  /api/marketing-shield/v1/work-products/[id]/export?format=pdf|docx|md (direct binary download)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppApiError, createApiHandler, createErrorResponse } from "@/lib/api-handler";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { exportWorkProductSchema } from "@/contracts/work-product.contracts";
import { workProductExportService } from "@/modules/work-products/work-product-export.service";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export const POST = createApiHandler(
  {
    bodySchema: exportWorkProductSchema,
    requiredPermission: "dossier.download",
  },
  async (_req, context) => {
    const rawId = Array.isArray(context.params.id)
      ? context.params.id[0]
      : context.params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid work product UUID", 400);
    }

    try {
      const exported = await workProductExportService.exportWorkProduct(
        context.tenant.tenantId,
        context.tenant.userId,
        parsedId.data,
        context.body.format
      );

      const hasR2 = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_ACCOUNT_ID);
      const effectiveDownloadUrl = hasR2
        ? exported.download_url
        : `/api/marketing-shield/v1/work-products/${parsedId.data}/export?format=${exported.format}`;

      return {
        work_product_id: exported.work_product_id,
        format: exported.format,
        filename: exported.filename,
        content_type: exported.content_type,
        storage_key: exported.storage_key,
        download_url: effectiveDownloadUrl,
        file_size_bytes: exported.file_size_bytes,
        file_sha256: exported.file_sha256,
        watermarked: exported.watermarked,
        generated_at: exported.generated_at,
      };
    } catch (err) {
      const msg = (err as Error).message || "Export failed";
      if (msg.toLowerCase().includes("not found")) {
        throw new AppApiError("NOT_FOUND", "Work product not found", 404);
      }
      if (msg.includes("DOCX_EXPORT_UPGRADE_REQUIRED")) {
        throw new AppApiError("FORBIDDEN", msg, 403);
      }
      throw err;
    }
  }
);

export async function GET(
  req: NextRequest,
  routeProps: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  try {
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "dossier.download");

    const { id } = await routeProps.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return createErrorResponse("VALIDATION_FAILED", "Invalid work product UUID", 400, requestId);
    }

    const formatParam = req.nextUrl.searchParams.get("format") || "pdf";
    const parsedFormat = exportWorkProductSchema.safeParse({ format: formatParam });
    if (!parsedFormat.success) {
      return createErrorResponse(
        "VALIDATION_FAILED",
        "Export format query parameter must be 'pdf', 'docx', or 'md'",
        400,
        requestId
      );
    }

    const exported = await workProductExportService.exportWorkProduct(
      tenant.tenantId,
      tenant.userId,
      parsedId.data,
      parsedFormat.data.format
    );

    return new NextResponse(new Uint8Array(exported.buffer), {
      status: 200,
      headers: {
        "Content-Type": exported.content_type,
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
        "Content-Length": String(exported.file_size_bytes),
        "X-File-SHA256": exported.file_sha256,
        "X-Watermarked": String(exported.watermarked),
        "X-Request-ID": requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    if (err instanceof AuthTenancyError) {
      return createErrorResponse(err.code, err.message, err.statusCode, requestId);
    }
    const msg = (err as Error).message || "Export download failed";
    if (msg.toLowerCase().includes("not found")) {
      return createErrorResponse("NOT_FOUND", "Work product not found", 404, requestId);
    }
    if (msg.includes("DOCX_EXPORT_UPGRADE_REQUIRED")) {
      return createErrorResponse("FORBIDDEN", msg, 403, requestId);
    }
    return createErrorResponse("INTERNAL_SERVER_ERROR", msg, 500, requestId);
  }
}
