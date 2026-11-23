/**
 * Cogent Compliance Operations - Central Evidence Repository API
 * GET  /api/marketing-shield/v1/evidence
 * POST /api/marketing-shield/v1/evidence (supports multipart/form-data file upload OR JSON)
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, createErrorResponse } from "@/lib/api-handler";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { evidenceService } from "@/modules/evidence/evidence.service";
import {
  createEvidenceItemSchema,
  type ComplianceDepartment,
  type EvidenceCategory,
} from "@/contracts/ddq.contracts";
import type { StandardErrorCode } from "@/contracts/api.contracts";

const MAX_EVIDENCE_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (req, { tenant }) => {
    const sp = req.nextUrl.searchParams;
    const category = (sp.get("category") as EvidenceCategory) || undefined;
    const owner_department = (sp.get("owner_department") as ComplianceDepartment) || undefined;
    const status = sp.get("status") || undefined;
    const search = sp.get("search") || undefined;
    const include_archived = sp.get("include_archived") === "true";

    return evidenceService.listEvidenceItems(tenant.tenantId, {
      category,
      owner_department,
      status,
      search,
      include_archived,
    });
  }
);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  try {
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "knowledge.write");

    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const uploaded = formData.get("file");
      let filePayload: { buffer: Buffer; fileName: string; mimeType: string } | undefined;

      if (uploaded instanceof File && uploaded.size > 0) {
        if (uploaded.size > MAX_EVIDENCE_UPLOAD_BYTES) {
          return createErrorResponse(
            "VALIDATION_FAILED",
            "Evidence file exceeds 25MB maximum upload size.",
            400,
            requestId
          );
        }
        const arrayBuffer = await uploaded.arrayBuffer();
        filePayload = {
          buffer: Buffer.from(arrayBuffer),
          fileName: uploaded.name || "evidence.pdf",
          mimeType: uploaded.type || "application/octet-stream",
        };
      }

      const tagsRaw = String(formData.get("tags") || "").trim();
      const tags = tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const parsed = createEvidenceItemSchema.safeParse({
        title: String(formData.get("title") || filePayload?.fileName || "").trim(),
        description: String(formData.get("description") || "").trim() || undefined,
        category: (String(formData.get("category") || "OTHER") as EvidenceCategory) || "OTHER",
        owner_department:
          (String(formData.get("owner_department") || "COMPLIANCE") as ComplianceDepartment) ||
          "COMPLIANCE",
        owner_name: String(formData.get("owner_name") || "").trim() || undefined,
        effective_date: String(formData.get("effective_date") || "").trim() || null,
        expiry_date: String(formData.get("expiry_date") || "").trim() || null,
        review_cycle_days: Number(formData.get("review_cycle_days") || 365) || 365,
        parent_evidence_id: String(formData.get("parent_evidence_id") || "").trim() || undefined,
        extracted_text: String(formData.get("extracted_text") || "").trim() || undefined,
        tags,
      });

      if (!parsed.success) {
        return createErrorResponse(
          "VALIDATION_FAILED",
          "Invalid evidence payload",
          400,
          requestId,
          parsed.error.errors.map((e) => ({ field: e.path.join("."), issue: e.message }))
        );
      }

      const item = await evidenceService.createEvidenceItem(
        tenant.tenantId,
        tenant.userId,
        parsed.data,
        filePayload
      );

      return NextResponse.json(
        {
          success: true,
          data: item,
          meta: { request_id: requestId, timestamp: new Date().toISOString() },
        },
        { status: 201 }
      );
    }

    // JSON request body
    const jsonBody = await req.json().catch(() => null);
    const parsed = createEvidenceItemSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return createErrorResponse(
        "VALIDATION_FAILED",
        "Invalid evidence JSON payload",
        400,
        requestId,
        parsed.error.errors.map((e) => ({ field: e.path.join("."), issue: e.message }))
      );
    }

    const item = await evidenceService.createEvidenceItem(
      tenant.tenantId,
      tenant.userId,
      parsed.data
    );

    return NextResponse.json(
      {
        success: true,
        data: item,
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
      err instanceof Error ? err.message : "Failed to register evidence item",
      500,
      requestId
    );
  }
}
