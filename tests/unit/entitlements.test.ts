import { describe, it, expect, vi, beforeEach } from "vitest";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import * as supabaseModule from "@/lib/supabase";

describe("EntitlementsService & Contextual Feature Gating", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Plan Definitions Retrieval", () => {
    it("returns all 4 canonical subscription tiers", async () => {
      const plans = await entitlementsService.getAvailablePlans();
      expect(plans.length).toBe(4);

      const slugs = plans.map((p) => p.slug);
      expect(slugs).toContain("evaluation");
      expect(slugs).toContain("growth");
      expect(slugs).toContain("scale");
      expect(slugs).toContain("enterprise");

      // Verify Scale plan is priced at $449/mo ($44,900 cents)
      const scale = plans.find((p) => p.slug === "scale");
      expect(scale?.price_usd_cents).toBe(44900);
      expect(scale?.price_usd_annual_cents).toBe(430800);
      expect(scale?.features.cco_approval_lock).toBe(true);
      expect(scale?.features.export_unwatermarked).toBe(true);
      expect(scale?.url_drift_monitor_limit).toBe(15);
    });
  });

  describe("Watermarking Feature Gate (export_unwatermarked)", () => {
    it("disallows unwatermarked PDF export for evaluation / trial pilot tenants", async () => {
      // Mock tenant on evaluation
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  created_at: new Date().toISOString(), // Brand new trial
                  settings: {},
                },
              }),
            };
          }
          if (table === "tenant_subscriptions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const check = await entitlementsService.checkTenantEntitlement(
        tenantId,
        "export_unwatermarked",
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Unwatermarked statutory PDF dossiers require");
    });

    it("allows unwatermarked PDF export for active Scale plan tenants", async () => {
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
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
              }),
            };
          }
          if (table === "tenant_subscriptions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const check = await entitlementsService.checkTenantEntitlement(
        tenantId,
        "export_unwatermarked",
      );
      expect(check.allowed).toBe(true);
      expect(check.planSlug).toBe("scale");
    });
  });

  describe("CCO Separation-of-Duties Lock Feature Gate (cco_approval_lock)", () => {
    it("disallows CCO approval lock for Growth tier tenants", async () => {
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  created_at: new Date().toISOString(),
                  settings: {
                    subscription: {
                      plan_slug: "growth",
                      status: "active",
                      current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
                    },
                  },
                },
              }),
            };
          }
          if (table === "tenant_subscriptions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const check = await entitlementsService.checkTenantEntitlement(
        tenantId,
        "cco_approval_lock",
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("require a Scale or Enterprise plan");
    });

    it("allows CCO approval lock for Scale tier tenants", async () => {
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
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
              }),
            };
          }
          if (table === "tenant_subscriptions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const check = await entitlementsService.checkTenantEntitlement(
        tenantId,
        "cco_approval_lock",
      );
      expect(check.allowed).toBe(true);
      expect(check.planSlug).toBe("scale");
    });
  });

  describe("7-Day Trial Expiration Enforcement", () => {
    it("blocks feature access when 7-day evaluation period has expired", async () => {
      // Created 10 days ago, no paid subscription
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  created_at: tenDaysAgo,
                  settings: {},
                },
              }),
            };
          }
          if (table === "tenant_subscriptions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as any);

      const check = await entitlementsService.checkTenantEntitlement(tenantId, "run_audit");
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Evaluation Pilot has expired");
      expect(check.trialDaysRemaining).toBe(0);
    });
  });
});
