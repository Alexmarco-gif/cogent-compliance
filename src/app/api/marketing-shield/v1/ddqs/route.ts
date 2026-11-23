/**
 * Cogent Compliance Operations - DDQ Engagements Register API
 * GET  /api/marketing-shield/v1/ddqs
 * POST /api/marketing-shield/v1/ddqs (supports multipart/form-data .xlsx/.docx/.pdf/.csv upload OR JSON)
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, createErrorResponse } from "@/lib/api-handler";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { ddqService } from "@/modules/ddq/ddq.service";
import {
  createDdqEngagementSchema,
  type DdqRequesterType,
} from "@/contracts/ddq.contracts";
import type { StandardErrorCode } from "@/contracts/api.contracts";

const MAX_DDQ_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (req, { tenant }) => {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") || undefined;
    const search = sp.get("search") || undefined;
    return ddqService.listEngagements(tenant.tenantId, { status, search });
  }
);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  try {
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "campaign.create");

    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const uploaded = formData.get("file");
      let filePayload: { buffer: Buffer; fileName: string; mimeType: string } | undefined;

      if (uploaded instanceof File && uploaded.size > 0) {
        if (uploaded.size > MAX_DDQ_UPLOAD_BYTES) {
          return createErrorResponse(
            "VALIDATION_FAILED",
            "Questionnaire file exceeds 25MB maximum upload size.",
            400,
            requestId
          );
        }
        const arrayBuffer = await uploaded.arrayBuffer();
        filePayload = {
          buffer: Buffer.from(arrayBuffer),
          fileName: uploaded.name || "questionnaire.xlsx",
          mimeType: uploaded.type || "application/octet-stream",
        };
      }

      const parsed = createDdqEngagementSchema.safeParse({
        title: String(formData.get("title") || filePayload?.fileName || "").trim(),
        requesting_institution: String(formData.get("requesting_institution") || "").trim(),
        requester_type:
          (String(formData.get("requester_type") || "SPONSOR_BANK") as DdqRequesterType) ||
          "SPONSOR_BANK",
        reference_code: String(formData.get("reference_code") || "").trim() || undefined,
        contact_name: String(formData.get("contact_name") || "").trim() || undefined,
        contact_email: String(formData.get("contact_email") || "").trim() || undefined,
        due_date: String(formData.get("due_date") || "").trim() || null,
        raw_text: String(formData.get("raw_text") || "").trim() || undefined,
        auto_process: String(formData.get("auto_process") ?? "true") !== "false",
      });

      if (!parsed.success) {
        return createErrorResponse(
          "VALIDATION_FAILED",
          "Invalid DDQ upload payload",
          400,
          requestId,
          parsed.error.errors.map((e) => ({ field: e.path.join("."), issue: e.message }))
        );
      }

      const result = await ddqService.createEngagement(
        tenant.tenantId,
        tenant.userId,
        tenant.orgName,
        parsed.data,
        filePayload
      );

      return NextResponse.json(
        {
          success: true,
          data: result,
          meta: { request_id: requestId, timestamp: new Date().toISOString() },
        },
        { status: 201 }
      );
    }

    const jsonBody = await req.json().catch(() => null);
    const parsed = createDdqEngagementSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return createErrorResponse(
        "VALIDATION_FAILED",
        "Invalid DDQ JSON payload",
        400,
        requestId,
        parsed.error.errors.map((e) => ({ field: e.path.join("."), issue: e.message }))
      );
    }

    const result = await ddqService.createEngagement(
      tenant.tenantId,
      tenant.userId,
      tenant.orgName,
      parsed.data
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        meta: { request_id: requestId, timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthTenancyError) {
      return createErrorResponse(err.code as StandardErrorCode, err.message, err.statusCode, requestId);
    }
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      err instanceof Error ? err.message : "Failed to create DDQ engagement",
      500,
      requestId
    );
  }
}
