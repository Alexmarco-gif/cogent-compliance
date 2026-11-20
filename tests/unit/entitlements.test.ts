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

    it("accurately counts down remaining days and hours for a 3-day-old workspace", async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

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
                    trial_started_at: threeDaysAgo,
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

      const info = await entitlementsService.getTenantSubscriptionInfo(tenantId);
      expect(info.isTrial).toBe(true);
      expect(info.isTrialExpired).toBe(false);
      expect(info.status).toBe("trialing");
      expect(info.trialDaysRemaining).toBe(4);
      expect(info.trialHoursRemaining).toBeGreaterThanOrEqual(95);
      expect(info.trialHoursRemaining).toBeLessThanOrEqual(96);
    });
  });

  describe("Dual-Engine Live Search & Cross-Border Entitlements (Document 14 & 15)", () => {
    it("grants Evaluation Pilot 3 Nigeria paid live web searches and signals Gemini fallback once exhausted", async () => {
      const rpcMock = vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ allowed: true, current_count: 1, remaining: 2 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ allowed: false, current_count: 3, remaining: 0 }],
          error: null,
        });

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        rpc: rpcMock,
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { created_at: new Date().toISOString(), settings: {} },
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

      // Cross-border KE is still blocked on Evaluation Pilot before hitting RPC
      const blockedKe = await entitlementsService.authorizeAndConsumeLiveSearch(tenantId, ["KE"]);
      expect(blockedKe.allowed).toBe(false);
      expect(blockedKe.feature).toBe("cross_border_research");
      expect(rpcMock).not.toHaveBeenCalled();

      // Search 1 of 3 on NG is allowed with paid Dual-Engine
      const firstSearch = await entitlementsService.authorizeAndConsumeLiveSearch(tenantId, ["NG"]);
      expect(firstSearch.allowed).toBe(true);
      expect(firstSearch.planSlug).toBe("evaluation");
      expect(firstSearch.limit).toBe(3);
      expect(firstSearch.remaining).toBe(2);
      expect(rpcMock).toHaveBeenCalledWith(
        "consume_live_search_quota",
        expect.objectContaining({
          p_tenant_id: tenantId,
          p_billing_period: "0000-00",
          p_monthly_limit: 3,
        }),
      );

      // After all 3 paid searches are exhausted, signal standard Gemini fallback (no Exa/SerpAPI)
      const fourthSearch = await entitlementsService.authorizeAndConsumeLiveSearch(tenantId, ["NG"]);
      expect(fourthSearch.allowed).toBe(false);
      expect(fourthSearch.fallbackToGeminiSearch).toBe(true);
      expect(fourthSearch.limit).toBe(3);
      expect(fourthSearch.remaining).toBe(0);
    });

    it("allows NG-only on Growth and blocks KE cross-border requests before hitting quota RPC", async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: [{ allowed: true, current_count: 15, remaining: 85 }],
        error: null,
      });

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        rpc: rpcMock,
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
          if (table === "subscription_plans") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
        }),
      } as any);

      const blockedKe = await entitlementsService.authorizeAndConsumeLiveSearch(tenantId, ["NG", "KE"]);
      expect(blockedKe.allowed).toBe(false);
      expect(blockedKe.feature).toBe("cross_border_research");
      expect(rpcMock).not.toHaveBeenCalled();

      const allowedNg = await entitlementsService.authorizeAndConsumeLiveSearch(tenantId, ["NG"]);
      expect(allowedNg.allowed).toBe(true);
      expect(allowedNg.currentCount).toBe(15);
      expect(allowedNg.remaining).toBe(85);
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });

    it("fails closed when consume_live_search_quota RPC returns an error", async () => {
      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "connection timeout" },
        }),
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
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          };
        }),
      } as any);

      const res = await entitlementsService.authorizeAndConsumeLiveSearch(tenantId, ["KE"]);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Unable to verify monthly live search quota");
    });

    it("does not allow a stale/past_due tenant_subscriptions row to mask an active tenant settings subscription mirror", async () => {
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
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  status: "past_due",
                  billing_interval: "monthly",
                  current_period_end: new Date(Date.now() - 86400000 * 2).toISOString(),
                  subscription_plans: [{ slug: "growth" }],
                },
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          };
        }),
      } as any);

      const info = await entitlementsService.getTenantSubscriptionInfo(tenantId);
      expect(info.status).toBe("active");
      expect(info.plan.slug).toBe("scale");
    });
  });
});
