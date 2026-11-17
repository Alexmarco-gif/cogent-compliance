/**
 * Cogent Regulatory Intelligence Platform
 * Production SaaS Route, Schema Alignment & Edge-Case Security Audit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as supabaseModule from "@/lib/supabase";
import * as tenantResolverModule from "@/modules/auth-tenancy/tenant.resolver";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { PlaybookService } from "@/modules/knowledge-base/playbook.service";
import { PaystackBillingService } from "@/modules/billing/paystack.service";
import { StatutoryToolExecutor } from "@/modules/ai-orchestration/tools/statutory-tools";
import { POST as checkoutPost } from "@/app/api/marketing-shield/v1/billing/checkout/route";
import { POST as verifyPost } from "@/app/api/marketing-shield/v1/billing/verify/route";
import { POST as onboardingScopePost } from "@/app/api/marketing-shield/v1/onboarding/scope/route";
import { POST as onboardingTruthPost } from "@/app/api/marketing-shield/v1/onboarding/product-truth/route";
import { POST as streamPost } from "@/app/api/marketing-shield/v1/conversations/[id]/messages/stream/route";
import { GET as provisionGet } from "@/app/api/marketing-shield/v1/statutory/provisions/[id]/route";

describe("Production SaaS Route & DB Schema Alignment Audit", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const userId = "user_audit_01";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("enforces URL drift monitor quotas using real campaign_drift_monitors table", async () => {
    const queriedTables: string[] = [];
    const mockSupabase = {
      from: vi.fn((table: string) => {
        queriedTables.push(table);
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                created_at: new Date().toISOString(),
                settings: {
                  subscription: {
                    plan_slug: "scale",
                    status: "active",
                    current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
                  },
                },
              },
              error: null,
            }),
          };
        }
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === "subscription_plans") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === "campaign_drift_monitors") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 15, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }),
    };

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue(mockSupabase as any);

    const svc = new EntitlementsService();
    const res = await svc.checkTenantEntitlement(tenantId, "url_drift_monitoring");

    expect(queriedTables).toContain("campaign_drift_monitors");
    expect(queriedTables).not.toContain("drift_monitors");
    expect(res.allowed).toBe(false);
    expect(res.currentCount).toBe(15);
    expect(res.limit).toBe(15);
  });

  it("calls real PostgreSQL RPC search_knowledge_chunks_rrf in PlaybookService", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({
      data: [
        {
          chunk_id: "chk_1",
          document_id: "doc_1",
          chunk_index: 0,
          chunk_text: "Mandatory AML onboarding KYC checks apply.",
          document_title: "Internal AML Policy",
          rrf_score: 0.032,
        },
      ],
      error: null,
    });
    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      rpc: rpcSpy,
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as any);

    const svc = new PlaybookService();
    const geminiModule = await import("@/modules/ai-orchestration/gemini.service");
    vi.spyOn(geminiModule.geminiService, "generateEmbedding").mockResolvedValue(
      new Array(768).fill(0.01),
    );

    const out = await svc.searchInstitutionalKnowledge(tenantId, "AML KYC", undefined, 5);
    expect(rpcSpy).toHaveBeenCalledWith(
      "search_knowledge_chunks_rrf",
      expect.objectContaining({
        p_tenant_id: tenantId,
        query_text: "AML KYC",
      }),
    );
    expect(out.chunks).toHaveLength(1);
  });

  it("queries regulatory_obligations -> applicability_rules via obligation_id cleanly", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "regulatory_obligations") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "ob_1",
                  clause_id: "cl_1",
                  obligation_type: "DISCLOSURE",
                  applicability_description: "Applies to Tier-1 digital lenders.",
                  severity: "HIGH",
                },
              ],
              error: null,
            }),
          };
        }
        if (table === "applicability_rules") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "rule_1",
                  obligation_id: "ob_1",
                  institution_type: "DIGITAL_LENDING",
                  product_type: "CONSUMER_LOAN",
                  channel: "MOBILE_APP",
                  conditions: { description: "Mandatory APR disclosure for digital lenders." },
                },
              ],
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue(mockSupabase as any);

    const executor = new StatutoryToolExecutor();
    const res = await executor.assessRegulatoryApplicability(
      {
        regulatory_clause_ids: ["cl_1"],
        institution_type: "DIGITAL_LENDING",
        channel: "MOBILE_APP",
      },
      { tenantId, userId },
    );

    expect(res.success).toBe(true);
    const assessments = res.assessments as Array<Record<string, unknown>>;
    expect(assessments).toHaveLength(1);
    expect(assessments[0]?.applicability_status).toBe("CONDITIONALLY_APPLICABLE");
    expect(assessments[0]?.matched_rules_count).toBe(1);
    expect(String(assessments[0]?.reason)).toContain("APR disclosure");
  });

  it("detects Supabase insert error in Paystack processChargeSuccess and runs fallback ledger", async () => {
    const updateTenantSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "subscription_plans") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === "billing_transactions") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: { message: "transient insert failure" } }),
          };
        }
        if (table === "tenant_subscriptions") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
            update: updateTenantSpy,
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue(mockSupabase as any);

    const billing = new PaystackBillingService();
    const out = await billing.processChargeSuccess({
      event: "charge.success",
      data: {
        reference: "COG_ERR_TEST_01",
        amount: 23095000,
        currency: "NGN",
        status: "success",
        metadata: {
          tenant_id: tenantId,
          plan_slug: "growth",
          billing_interval: "monthly",
        },
      },
    } as any);

    expect(out.processed).toBe(true);
    // Fallback recorded reference in tenants.settings.billing_transactions AND mirrored subscription
    expect(updateTenantSpy).toHaveBeenCalledTimes(2);
  });

  it("returns HTTP 400 (never 500) for malformed JSON bodies on custom authenticated routes", async () => {
    vi.spyOn(tenantResolverModule, "resolveTenantContext").mockResolvedValue({
      tenantId,
      userId,
      clerkOrgId: "org_test",
      clerkUserId: userId,
      orgSlug: "test-org",
      orgName: "Test Institution",
      role: "WORKSPACE_ADMIN",
      permissions: new Set(["conversation.create", "conversation.read", "tenant.admin"]),
      status: "ACTIVE",
    });

    const malformedReq = (url: string) =>
      new NextRequest(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad-json",
      });

    const r1 = await checkoutPost(malformedReq("http://localhost:3000/api/marketing-shield/v1/billing/checkout"));
    expect(r1.status).toBe(400);

    const r2 = await verifyPost(malformedReq("http://localhost:3000/api/marketing-shield/v1/billing/verify"));
    expect(r2.status).toBe(400);

    const r3 = await onboardingScopePost(malformedReq("http://localhost:3000/api/marketing-shield/v1/onboarding/scope"));
    expect(r3.status).toBe(400);

    const r4 = await onboardingTruthPost(malformedReq("http://localhost:3000/api/marketing-shield/v1/onboarding/product-truth"));
    expect(r4.status).toBe(400);

    // Mock conversation lookup & active subscription for stream route malformed body check
    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "marketing_conversations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "conv_1", tenant_id: tenantId, created_by: userId, context_type: "GENERAL" },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { created_at: new Date().toISOString(), settings: {} },
            error: null,
          }),
        };
      }),
    } as any);

    const r5 = await streamPost(
      malformedReq("http://localhost:3000/api/marketing-shield/v1/conversations/conv_1/messages/stream"),
      { params: Promise.resolve({ id: "conv_1" }) },
    );
    expect(r5.status).toBe(400);
  });

  it("returns HTTP 404 (not 500) when statutory provision ID does not exist", async () => {
    vi.spyOn(tenantResolverModule, "resolveTenantContext").mockResolvedValue({
      tenantId,
      userId,
      clerkOrgId: "org_test",
      clerkUserId: userId,
      orgSlug: "test-org",
      orgName: "Test Institution",
      role: "COMPLIANCE_ANALYST",
      permissions: new Set(["conversation.read"]),
      status: "ACTIVE",
    });

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      })),
    } as any);

    const res = await provisionGet(
      new NextRequest("http://localhost:3000/api/marketing-shield/v1/statutory/provisions/00000000-0000-4000-8000-000000000099"),
      { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000099" }) },
    );
    expect(res.status).toBe(404);
  });
});
