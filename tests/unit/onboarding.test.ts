import { describe, it, expect, vi, beforeEach } from "vitest";
import { onboardingService } from "@/modules/onboarding/onboarding.service";
import * as supabaseModule from "@/lib/supabase";

describe("OnboardingService & 60-Second Progressive Engine", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 1: 1-Click Institution Scope Configuration", () => {
    it("persists multi-selected regulatory scopes to tenant settings", async () => {
      let updatedSettings: any = null;

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  name: "First Bank of Nigeria",
                  settings: { onboarding_step: 0 },
                },
              }),
              update: vi.fn().mockImplementation((payload: any) => {
                updatedSettings = payload.settings;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const res = await onboardingService.saveInstitutionScope(tenantId, {
        scopes: ["DIGITAL_LENDING", "PAYMENTS_SWITCHING"],
        organization_name: "First Bank of Nigeria",
      });

      expect(res.success).toBe(true);
      expect(res.scopes).toEqual(["DIGITAL_LENDING", "PAYMENTS_SWITCHING"]);
      expect(updatedSettings?.active_regulatory_scopes).toEqual([
        "DIGITAL_LENDING",
        "PAYMENTS_SWITCHING",
      ]);
      expect(updatedSettings?.onboarding_step).toBe(1);
    });

    it("persists creator_role to tenant_memberships when userId and creator_role are supplied", async () => {
      let upsertedMembership: any = null;

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { name: "Acme Bank", settings: {} },
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === "tenant_memberships") {
            return {
              upsert: vi.fn().mockImplementation((payload: any) => {
                upsertedMembership = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const res = await onboardingService.saveInstitutionScope(
        tenantId,
        {
          scopes: ["DIGITAL_LENDING"],
          organization_name: "Acme Bank",
          creator_role: "MARKETING_GROWTH",
        },
        "user_creator_123",
      );

      expect(res.success).toBe(true);
      expect(res.role).toBe("MARKETING_GROWTH");
      expect(upsertedMembership?.role).toBe("MARKETING_GROWTH");
      expect(upsertedMembership?.user_id).toBe("user_creator_123");
      expect(upsertedMembership?.status).toBe("ACTIVE");
    });
  });

  describe("Step 2: Seed Product Truth (Rate Card)", () => {
    it("inserts custom product parameters into campaign_products and advances step", async () => {
      let insertedProduct: any = null;
      let updatedSettings: any = null;

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "campaign_products") {
            return {
              insert: vi.fn().mockImplementation((payload: any) => {
                insertedProduct = payload;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: "prod_000000000001" },
                    error: null,
                  }),
                };
              }),
            };
          }
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { settings: { onboarding_step: 1 } },
              }),
              update: vi.fn().mockImplementation((payload: any) => {
                updatedSettings = payload.settings;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const res = await onboardingService.seedProductTruth(tenantId, {
        product_name: "Quick Salary Advance",
        monthly_interest_rate_percent: 3.5,
        mandatory_fees_percent: 1.0,
        fee_description: "1.0% processing fee",
        skip: false,
      });

      expect(res.success).toBe(true);
      expect(res.productId).toBe("prod_000000000001");
      expect(insertedProduct?.product_name).toBe("Quick Salary Advance");
      expect(insertedProduct?.interest_rate_monthly).toBe(3.5);
      expect(insertedProduct?.annual_percentage_rate).toBe(42.0);
      expect(updatedSettings?.onboarding_step).toBe(2);
    });

    it("seeds default sample loan parameters when user chooses 'Skip for now'", async () => {
      let insertedProduct: any = null;

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "campaign_products") {
            return {
              insert: vi.fn().mockImplementation((payload: any) => {
                insertedProduct = payload;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: "prod_sample_0001" },
                    error: null,
                  }),
                };
              }),
            };
          }
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { settings: { onboarding_step: 1 } },
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const res = await onboardingService.seedProductTruth(tenantId, {
        product_name: "",
        monthly_interest_rate_percent: 0,
        mandatory_fees_percent: 0,
        skip: true,
      });

      expect(res.success).toBe(true);
      expect(insertedProduct?.product_name).toBe("Sample Quick Credit Loan");
      expect(insertedProduct?.interest_rate_monthly).toBe(4.5);
      expect(insertedProduct?.metadata?.is_sample).toBe(true);
    });
  });

  describe("Step 3: Complete Onboarding", () => {
    it("marks onboarding as completed with timestamp and sets step 3", async () => {
      let updatedSettings: any = null;

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { settings: { onboarding_step: 2 } },
              }),
              update: vi.fn().mockImplementation((payload: any) => {
                updatedSettings = payload.settings;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const res = await onboardingService.completeOnboarding(tenantId);
      expect(res.success).toBe(true);
      expect(res.completedAt).toBeDefined();
      expect(updatedSettings?.onboarding_step).toBe(3);
      expect(updatedSettings?.onboarding_completed_at).toBeDefined();
    });

    it("rejects non-admin post-onboarding scope edits and blocks creator_role privilege escalation", async () => {
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  name: "Acme Bank",
                  settings: { onboarding_step: 3, onboarding_completed_at: "2026-11-12T00:00:00Z" },
                },
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      await expect(
        onboardingService.saveInstitutionScope(
          tenantId,
          {
            scopes: ["DIGITAL_LENDING"],
            organization_name: "Acme Bank",
            creator_role: "CHIEF_COMPLIANCE_OFFICER",
          },
          "user_invited_1",
          "org_1",
          { role: "MARKETING_GROWTH", isAdmin: false },
        ),
      ).rejects.toThrow(/Only workspace administrators/i);
    });

    it("blocks non-admin creator_role escalation in multi-member workspaces even before onboarding completes", async () => {
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  name: "Acme Bank",
                  settings: { onboarding_step: 1 },
                },
              }),
            };
          }
          if (table === "tenant_memberships") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      await expect(
        onboardingService.saveInstitutionScope(
          tenantId,
          {
            scopes: ["DIGITAL_LENDING"],
            organization_name: "Acme Bank",
            creator_role: "CHIEF_COMPLIANCE_OFFICER",
          },
          "user_invited_2",
          "org_1",
          { role: "MARKETING_GROWTH", isAdmin: false },
        ),
      ).rejects.toThrow(/Only workspace administrators can change workspace roles/i);
    });
  });
});
