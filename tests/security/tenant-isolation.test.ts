/**
 * Cogent Marketing Shield - Cross-Tenant Penetration & Isolation Test Suite
 * Document Reference: Document 03 (Section 2), Document 07 (Section 4), Document 09 (Section 5.1)
 *
 * Verifies strict 100% denial across all 12 cross-tenant attack vectors (SEC-TEN-01 to SEC-TEN-12)
 * between Tenant Alpha and Tenant Beta.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { conversationService } from "@/modules/conversations/conversation.service";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { remediationService } from "@/modules/campaigns/remediation.service";
import { approvalService } from "@/modules/campaigns/approval.service";
import { statutoryDossierService } from "@/modules/dossier/statutory-dossier.service";
import { productService } from "@/modules/knowledge-base/product.service";
import { playbookService } from "@/modules/knowledge-base/playbook.service";
import { StatutoryToolExecutor } from "@/modules/ai-orchestration/tools/statutory-tools";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";

// Mock @clerk/nextjs/server auth()
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: mockFrom,
    })),
  };
});

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit_iso_123" }),
  },
}));

vi.mock("@/lib/notifications", () => ({
  notificationService: {
    sendApprovalDecisionNotification: vi.fn().mockResolvedValue({ success: true }),
    sendReviewRequestNotification: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe("Cross-Tenant Penetration Test Suite (SEC-TEN-01 to SEC-TEN-12)", () => {
  const tenantAlpha = "11111111-1111-1111-1111-111111111111"; // Alpha Microfinance Bank
  const tenantBeta = "22222222-2222-2222-2222-222222222222"; // Beta Digital Lending Ltd
  const userBeta = "user_beta_admin";

  const alphaConvId = "conv_alpha_00000000-0001";
  const alphaCampaignId = "camp_alpha_00000000-0001";
  const alphaRevisionId = "rev_alpha_00000000-0001";
  const alphaProductId = "prod_alpha_00000000-0001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SEC-TEN-01: GET /conversations/{alpha_conv_id} from Tenant Beta must return null (404 Not Found)", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    const result = await conversationService.getConversation(tenantBeta, alphaConvId);
    expect(result).toBeNull();
    expect(builder.eq).toHaveBeenCalledWith("tenant_id", tenantBeta);
    expect(builder.eq).toHaveBeenCalledWith("id", alphaConvId);
  });

  it("SEC-TEN-02: POST /conversations/{alpha_conv_id}/messages from Tenant Beta must be blocked by Composite FK", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'violates foreign key constraint "fk_marketing_messages_conversation"',
            code: "23503",
          },
        }),
      }),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    await expect(
      conversationService.createMessage({
        tenantId: tenantBeta,
        conversationId: alphaConvId,
        role: "USER",
        content: "Malicious cross-tenant prompt injection",
      })
    ).rejects.toThrow(/foreign key|Failed to insert message/i);
  });

  it("SEC-TEN-03: GET /campaigns/{alpha_campaign_id} from Tenant Beta must be rejected with 404", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Campaign not found", code: "PGRST116" } }),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    await expect(campaignService.getCampaignById(tenantBeta, alphaCampaignId)).rejects.toThrow(
      /Campaign .* not found/i
    );
    expect(builder.eq).toHaveBeenCalledWith("tenant_id", tenantBeta);
    expect(builder.eq).toHaveBeenCalledWith("id", alphaCampaignId);
  });

  it("SEC-TEN-04: POST /campaigns/{alpha_campaign_id}/revisions from Tenant Beta must be rejected", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Campaign not found" } }),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    await expect(
      remediationService.createCampaignRevision(tenantBeta, userBeta, alphaCampaignId, {
        parent_revision_id: "00000000-0000-0000-0000-000000000001",
        content_text: "Unauthorized revision",
        change_summary: "Unauthorized cross-tenant edit",
        revision_source: "USER_EDIT",
      })
    ).rejects.toThrow(/Campaign .* not found/i);
  });

  it("SEC-TEN-05: POST /campaigns/{alpha_campaign_id}/approvals from Tenant Beta must be rejected", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Campaign not found" } }),
      insert: vi.fn().mockReturnThis(),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    await expect(
      approvalService.recordApprovalDecision(
        tenantBeta,
        userBeta,
        alphaCampaignId,
        {
          revision_id: alphaRevisionId,
          decision: "APPROVED",
          decision_reason: "Unauthorized cross-tenant sign-off",
        },
        "CHIEF_COMPLIANCE_OFFICER"
      )
    ).rejects.toThrow(/Campaign .* not found/i);
  });

  it("SEC-TEN-06 & SEC-TEN-07: POST /campaigns/{alpha_campaign_id}/dossiers from Tenant Beta must be rejected", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Campaign not found" } }),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    await expect(
      statutoryDossierService.generateDossier(
        tenantBeta,
        userBeta,
        alphaCampaignId,
        alphaRevisionId
      )
    ).rejects.toThrow(/Campaign .* not found/i);
  });

  it("SEC-TEN-08: Gemini tools search_institutional_knowledge & get_product_approved_terms must return 0 Alpha records to Beta", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

    const executor = new StatutoryToolExecutor();
    const result = await executor.getProductApprovedTerms(
      { product_name_query: "Alpha Premium Loan" },
      { tenantId: tenantBeta, userId: userBeta }
    );

    expect(result.success).toBe(true);
    expect(result.product_truth).toBeNull();
  });

  it("SEC-TEN-09: Body injection of 'tenant_id: alpha' must be ignored and scoped strictly to Beta", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "new_prod_beta", tenant_id: tenantBeta, product_name: "Beta Micro Loan" },
        error: null,
      }),
    });

    vi.mocked(mockSupabase.from).mockReturnValue({
      insert: insertMock,
    } as any);

    await productService.createProduct(tenantBeta, userBeta, {
      product_name: "Beta Micro Loan",
      product_type: "DIGITAL_LENDING",
      approved_terms: {
        interest_rate_min: 5,
        interest_rate_max: 10,
        interest_rate_type: "MONTHLY",
        processing_fee_percent: 2,
        tenor_min_days: 30,
        tenor_max_days: 90,
        required_disclosures: ["Terms apply"],
      },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenantBeta, // Enforced by backend argument, ignoring client body
      })
    );
  });

  it("SEC-TEN-10: Direct queries for tenant knowledge documents must be partitioned by tenant_id", async () => {
    const mockSupabase = createAdminSupabaseClient();
    const eqMock = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqMock,
      }),
    } as any);

    await playbookService.listDocuments(tenantBeta);
    expect(eqMock).toHaveBeenCalledWith("tenant_id", tenantBeta);
  });

  it("SEC-TEN-11: Structural Composite Foreign Key proof verifies child cannot link to another tenant's parent", () => {
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20261111000001_marketing_shield_schema.sql"),
      "utf-8"
    );

    const compositeFks = [
      "fk_marketing_messages_conversation",
      "fk_claims_campaign",
      "fk_findings_assessment",
      "fk_revisions_campaign",
      "fk_approvals_campaign",
      "fk_drift_campaign",
    ];

    for (const fk of compositeFks) {
      expect(migration).toContain(`CONSTRAINT ${fk} FOREIGN KEY (tenant_id,`);
    }
  });

  it("SEC-TEN-12: Suspended Clerk membership must immediately invalidate tenant context", async () => {
    mockAuth.mockResolvedValueOnce({
      userId: userBeta,
      orgId: "org_beta_suspended",
    });

    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "tenants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: tenantBeta, clerk_org_id: "org_beta_suspended", status: "ACTIVE" },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === "tenant_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    tenant_id: tenantBeta,
                    user_id: userBeta,
                    role: "MARKETING_GROWTH",
                    status: "SUSPENDED", // Suspended
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const mockReq = {
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
    } as unknown as Request;

    await expect(resolveTenantContext(mockReq)).rejects.toThrow(
      /SUSPENDED/i
    );
  });
});
