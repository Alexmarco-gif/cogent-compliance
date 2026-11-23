/**
 * Cogent Compliance Operations - DDQ Submission Pack Exporter API
 * GET /api/marketing-shield/v1/ddqs/[id]/export?format=xlsx|zip
 * - format=xlsx: Round-trip filled sponsor bank Excel workbook (+ Annexures & Sign-Off tab)
 * - format=zip:  Complete Submission Pack (filled .xlsx + Executive Sign-Off Certificate +
 *                Annexures Schedule CSV + actual Evidence Vault Annexures A–Z)
 */

import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/api-handler";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { auditService } from "@/modules/audit/audit.service";
import { ddqService } from "@/modules/ddq/ddq.service";
import { ddqExportService } from "@/modules/ddq/ddq-export.service";
import type { StandardErrorCode } from "@/contracts/api.contracts";

export async function GET(
  req: NextRequest,
  routeProps: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  try {
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "dossier.download");

    const { id: ddqId } = await routeProps.params;
    const format = (req.nextUrl.searchParams.get("format") || "xlsx").toLowerCase();

    const exportCtx = await ddqService.getExportContext(tenant.tenantId, tenant.orgName, ddqId);
    if (!exportCtx) {
      return createErrorResponse("NOT_FOUND", "DDQ engagement not found", 404, requestId);
    }

    if (format === "zip") {
      const bundle = await ddqExportService.generateSubmissionZipBundle(exportCtx);

      await auditService.appendEvent({
        tenantId: tenant.tenantId,
        actorId: tenant.userId,
        actorType: "USER",
        action: "DDQ_SUBMISSION_PACK_EXPORTED",
        entityType: "DDQ_ENGAGEMENT",
        entityId: ddqId,
        eventData: {
          format: "ZIP",
          fileName: bundle.fileName,
          snapshotSha256: bundle.snapshotSha256,
          annexuresCount: exportCtx.annexures.length,
        },
      });

      return new NextResponse(new Uint8Array(bundle.buffer), {
        status: 200,
        headers: {
          "Content-Type": bundle.mimeType,
          "Content-Disposition": `attachment; filename="${bundle.fileName}"`,
          "X-Snapshot-SHA256": bundle.snapshotSha256,
          "x-request-id": requestId,
        },
      });
    }

    const xlsx = await ddqExportService.generateCompletedXlsx(exportCtx);

    await auditService.appendEvent({
      tenantId: tenant.tenantId,
      actorId: tenant.userId,
      actorType: "USER",
      action: "DDQ_XLSX_EXPORTED",
      entityType: "DDQ_ENGAGEMENT",
      entityId: ddqId,
      eventData: {
        format: "XLSX",
        fileName: xlsx.fileName,
        questionCount: exportCtx.questions.length,
      },
    });

    return new NextResponse(new Uint8Array(xlsx.buffer), {
      status: 200,
      headers: {
        "Content-Type": xlsx.mimeType,
        "Content-Disposition": `attachment; filename="${xlsx.fileName}"`,
        "x-request-id": requestId,
      },
    });
  } catch (err) {
    if (err instanceof AuthTenancyError) {
      return createErrorResponse(err.code as StandardErrorCode, err.message, err.statusCode, requestId);
    }
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      err instanceof Error ? err.message : "Failed to export DDQ submission package",
      500,
      requestId
    );
  }
}
