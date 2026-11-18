import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { DEFAULT_PLANS } from "@/modules/billing/paystack.service";
import { FEATURE_GATE_TYPES } from "@/contracts/billing.contracts";
import {
  buildInternalEnterprisePlan,
  isInternalOverride,
  isInternalWorkspaceRuntimeEnabled,
  matchesPlatformOwner,
} from "@/modules/billing/internal-workspace.service";

const OWNER = "owner@example.com";
const prodEnv = { VERCEL_ENV: "production", PLATFORM_OWNER_EMAIL: OWNER };

function clerkUser(id: string, email: string, status: string = "verified") {
  return { id, emailAddresses: [{ emailAddress: email, verification: { status } }] };
}

describe("Internal Workspace - runtime gate", () => {
  it("is enabled on Vercel production and preview with an owner email", () => {
    expect(isInternalWorkspaceRuntimeEnabled(prodEnv)).toBe(true);
    expect(isInternalWorkspaceRuntimeEnabled({ ...prodEnv, VERCEL_ENV: "preview" })).toBe(true);
  });

  it("is disabled locally / in development", () => {
    expect(isInternalWorkspaceRuntimeEnabled({ PLATFORM_OWNER_EMAIL: OWNER })).toBe(false);
    expect(
      isInternalWorkspaceRuntimeEnabled({ VERCEL_ENV: "development", PLATFORM_OWNER_EMAIL: OWNER }),
    ).toBe(false);
  });

  it("is disabled when no owner email is configured", () => {
    expect(isInternalWorkspaceRuntimeEnabled({ VERCEL_ENV: "production" })).toBe(false);
  });
});

describe("Internal Workspace - owner identity", () => {
  it("accepts the verified owner email (case-insensitive)", () => {
    expect(matchesPlatformOwner(clerkUser("user_1", "Owner@Example.com"), prodEnv)).toBe(true);
  });

  it("rejects an unverified owner email", () => {
    expect(matchesPlatformOwner(clerkUser("user_1", OWNER, "unverified"), prodEnv)).toBe(false);
  });

  it("rejects any other email", () => {
    expect(matchesPlatformOwner(clerkUser("user_2", "teammate@example.com"), prodEnv)).toBe(false);
  });

  it("rejects when the pinned Clerk user ID does not match", () => {
    const env = { ...prodEnv, PLATFORM_OWNER_CLERK_USER_ID: "user_owner" };
    expect(matchesPlatformOwner(clerkUser("user_other", OWNER), env)).toBe(false);
    expect(matchesPlatformOwner(clerkUser("user_owner", OWNER), env)).toBe(true);
  });

  it("rejects everyone outside production/preview", () => {
    expect(
      matchesPlatformOwner(clerkUser("user_1", OWNER), { PLATFORM_OWNER_EMAIL: OWNER }),
    ).toBe(false);
  });
});

describe("Internal Workspace - unlimited plan", () => {
  it("removes every quota and enables every feature", () => {
    const plan = buildInternalEnterprisePlan({ ...DEFAULT_PLANS.enterprise, seat_limit: 50 });
    expect(plan.slug).toBe("enterprise");
    expect(plan.monthly_audit_limit).toBe(-1);
    expect(plan.seat_limit).toBe(-1);
    expect(plan.url_drift_monitor_limit).toBe(-1);
    expect(plan.monthly_live_search_limit).toBe(-1);
    expect(plan.allowed_search_jurisdictions).toContain("GLOBAL");
    expect(plan.features.cco_approval_lock).toBe(true);
    expect(plan.features.export_unwatermarked).toBe(true);
    expect(plan.features.cross_border_research).toBe(true);
  });

  it("only recognises the exact override value", () => {
    expect(isInternalOverride("internal_enterprise")).toBe(true);
    expect(isInternalOverride("enterprise")).toBe(false);
    expect(isInternalOverride(null)).toBe(false);
  });
});

describe("Internal Workspace - entitlement resolution", () => {
  const tenantId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockTenant(row: Record<string, unknown>) {
    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: row }),
          };
        }
        // Everything else (plans, subscriptions, usage) behaves as empty
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ count: 0 }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }),
    } as never);
  }

  it("returns active unlimited Enterprise even when the trial expired long ago", async () => {
    mockTenant({
      created_at: "2020-01-01T00:00:00.000Z",
      settings: { trial_started_at: "2020-01-01T00:00:00.000Z" },
      billing_override: "internal_enterprise",
    });

    const info = await entitlementsService.getTenantSubscriptionInfo(tenantId);
    expect(info.isInternal).toBe(true);
    expect(info.isTrial).toBe(false);
    expect(info.status).toBe("active");
    expect(info.plan.slug).toBe("enterprise");
    expect(info.plan.monthly_audit_limit).toBe(-1);
  });

  it("allows every feature gate without limits", async () => {
    mockTenant({
      created_at: "2020-01-01T00:00:00.000Z",
      settings: {},
      billing_override: "internal_enterprise",
    });

    for (const feature of FEATURE_GATE_TYPES) {
      const result = await entitlementsService.checkTenantEntitlement(tenantId, feature);
      expect(result.allowed, feature).toBe(true);
    }
  });

  it("does not affect normal tenants without the override", async () => {
    mockTenant({
      created_at: "2020-01-01T00:00:00.000Z",
      settings: { trial_started_at: "2020-01-01T00:00:00.000Z" },
      billing_override: null,
    });

    const info = await entitlementsService.getTenantSubscriptionInfo(tenantId);
    expect(info.isInternal).toBeUndefined();
    expect(info.plan.slug).toBe("evaluation");
    expect(info.isTrialExpired).toBe(true);
  });
});
