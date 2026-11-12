/**
 * Cogent Marketing Shield - API Gateway Handler & Envelope Unit Tests
 * Document Reference: Document 04 (Section 2) & Document 08 (Phase 4)
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";

describe("API Gateway Route Wrapper (createApiHandler)", () => {
  it("should wrap successful handler data in standard Document 04 JSON envelope", async () => {
    const handler = createApiHandler(
      { isPublic: true },
      async (_req, ctx) => {
        return { message: "Health check passed", tenant: ctx.tenant.orgSlug };
      },
    );

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/health", {
      headers: { "x-request-id": "11111111-2222-3333-4444-555555555555" },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("11111111-2222-3333-4444-555555555555");

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.message).toBe("Health check passed");
    expect(json.meta.request_id).toBe("11111111-2222-3333-4444-555555555555");
    expect(json.meta.timestamp).toBeDefined();
  });

  it("should reject state-changing calls missing Idempotency-Key when requireIdempotency is true", async () => {
    const handler = createApiHandler(
      { isPublic: true, requireIdempotency: true },
      async () => ({ success: true }),
    );

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    });

    const res = await handler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_FAILED");
    expect(json.error.details[0].field).toBe("headers.idempotency-key");
  });

  it("should validate request body with Zod and format field errors on invalid payload", async () => {
    const bodySchema = z.object({
      campaign_title: z.string().min(5, "Campaign title must have at least 5 characters"),
      budget_ngn: z.number().positive("Budget must be greater than zero"),
    });

    const handler = createApiHandler(
      { isPublic: true, bodySchema },
      async (_req, ctx) => ctx.body,
    );

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({ campaign_title: "Ad", budget_ngn: -500 }),
    });

    const res = await handler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_FAILED");
    expect(json.error.details).toHaveLength(2);
    expect(json.error.details[0].field).toBe("campaign_title");
    expect(json.error.details[1].field).toBe("budget_ngn");
  });

  it("should catch AuthTenancyError and map to proper HTTP status and standard error envelope", async () => {
    const handler = createApiHandler(
      { isPublic: true },
      async () => {
        throw new AuthTenancyError(
          "APPROVAL_NOT_PERMITTED",
          "Role MARKETING_GROWTH lacks approval authority",
          403,
        );
      },
    );

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/approvals", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await handler(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("APPROVAL_NOT_PERMITTED");
    expect(json.error.message).toContain("Role MARKETING_GROWTH lacks approval authority");
  });
});
