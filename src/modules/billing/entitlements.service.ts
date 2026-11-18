/**
 * Cogent Compliance Platform - Marketing Shield
 * Contextual Feature Gating & Entitlements Engine
 * Document Reference: Document 11 (Section 5) & Document 08 (Phase 6 / Phase 12)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  DEFAULT_PLANS,
  paystackBillingService,
} from "./paystack.service";
import { buildInternalEnterprisePlan, isInternalOverride } from "./internal-workspace.service";
import {
  EntitlementCheckResult,
  FeatureGateType,
  PlanSlug,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/contracts/billing.contracts";

export interface TenantSubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialStartedAt: Date;
  trialEndsAt: Date;
  trialDaysRemaining: number;
  trialHoursRemaining: number;
  /** True for owner-flagged Internal Workspaces (unlimited Enterprise, never billed). */
  isInternal?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERNAL_PERIOD_MS = 10 * 365 * DAY_MS;
const HOUR_MS = 60 * 60 * 1000;

export class EntitlementsService {
  /**
   * Retrieves all active subscription plans
   */
  public async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_usd_cents", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d) => {
          const fallback = DEFAULT_PLANS[(d.slug as PlanSlug) || "evaluation"] || DEFAULT_PLANS.evaluation;
          return {
            id: d.id,
            slug: d.slug as PlanSlug,
            name: d.name,
            price_usd_cents: d.price_usd_cents,
            price_usd_annual_cents: d.price_usd_annual_cents,
            paystack_plan_code_monthly: d.paystack_plan_code_monthly,
            paystack_plan_code_annual: d.paystack_plan_code_annual,
            monthly_audit_limit: d.monthly_audit_limit,
            seat_limit: d.seat_limit,
            url_drift_monitor_limit: d.url_drift_monitor_limit,
            monthly_live_search_limit:
              typeof d.monthly_live_search_limit === "number"
                ? d.monthly_live_search_limit
                : fallback.monthly_live_search_limit,
            allowed_search_jurisdictions: Array.isArray(d.allowed_search_jurisdictions)
              ? d.allowed_search_jurisdictions
              : fallback.allowed_search_jurisdictions,
            retention_days: d.retention_days,
            features: {
              ...fallback.features,
              ...(d.features || {}),
            },
            is_active: d.is_active,
          };
        });
      }
    } catch (err) {
      logger.warn("Using default plans seed for getAvailablePlans", { err });
    }

    return Object.values(DEFAULT_PLANS);
  }

  /**
   * Resolves the authoritative subscription state for a tenant.
   * Checks database table `tenant_subscriptions` first, then tenant settings JSONB fallback.
   */
  public async getTenantSubscriptionInfo(tenantId: string): Promise<TenantSubscriptionInfo> {
    const supabase = createAdminSupabaseClient();
    const evaluationPlan = DEFAULT_PLANS.evaluation;

    // 1. Fetch tenant creation date, Clerk org ID & settings
    let tenantCreatedAt = new Date();
    let tenantSettings: Record<string, unknown> = {};
    let clerkOrgId: string | null = null;
    let hasTenantRow = false;
    let billingOverride: unknown = null;

    try {
      // select("*") so environments where the billing_override migration has not run yet still resolve
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .maybeSingle();

      if (tenant) {
        hasTenantRow = true;
        billingOverride = (tenant as Record<string, unknown>).billing_override ?? null;
        if (tenant.created_at) {
          const parsedCreated = new Date(tenant.created_at);
          if (!Number.isNaN(parsedCreated.getTime())) {
            tenantCreatedAt = parsedCreated;
          }
        }
        if (typeof tenant.clerk_org_id === "string") {
          clerkOrgId = tenant.clerk_org_id;
        }
        if (tenant.settings && typeof tenant.settings === "object") {
          tenantSettings = tenant.settings as Record<string, unknown>;
        }
      }
    } catch (err) {
      logger.warn("Could not fetch tenant metadata for subscription resolution", { tenantId, err });
    }

    // 1b. Owner-flagged Internal Workspace: unlimited Enterprise, no trial, no Paystack.
    if (isInternalOverride(billingOverride)) {
      let basePlan: SubscriptionPlan = DEFAULT_PLANS.enterprise;
      try {
        basePlan = await paystackBillingService.getPlan("enterprise");
      } catch {
        // Fall back to the bundled Enterprise definition
      }
      const now = new Date();
      return {
        plan: buildInternalEnterprisePlan(basePlan),
        status: "active",
        currentPeriodEnd: new Date(now.getTime() + INTERNAL_PERIOD_MS),
        isTrial: false,
        isTrialExpired: false,
        trialStartedAt: tenantCreatedAt,
        trialEndsAt: tenantCreatedAt,
        trialDaysRemaining: 0,
        trialHoursRemaining: 0,
        isInternal: true,
      };
    }

    // Anchor trial start to explicit settings.trial_started_at, or earliest of tenant.created_at & Clerk org.createdAt
    let trialStart = tenantCreatedAt;
    const rawTrialStart = tenantSettings.trial_started_at;
    let shouldPersistTrialStart = false;

    if (typeof rawTrialStart === "string") {
      const parsedTrialStart = new Date(rawTrialStart);
      if (!Number.isNaN(parsedTrialStart.getTime())) {
        trialStart = parsedTrialStart;
      } else {
        shouldPersistTrialStart = hasTenantRow;
      }
    } else if (hasTenantRow) {
      shouldPersistTrialStart = true;
      if (
        clerkOrgId &&
        clerkOrgId !== "org_demo_1111" &&
        process.env.NODE_ENV !== "test"
      ) {
        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          const org = await client.organizations.getOrganization({
            organizationId: clerkOrgId,
          });
          if (org?.createdAt) {
            const clerkCreated = new Date(org.createdAt);
            if (!Number.isNaN(clerkCreated.getTime()) && clerkCreated < trialStart) {
              trialStart = clerkCreated;
            }
          }
        } catch {
          // Non-blocking fallback to tenant.created_at
        }
      }
    }

    if (shouldPersistTrialStart && process.env.NODE_ENV !== "test") {
      try {
        const { data: freshTenant } = await supabase
          .from("tenants")
          .select("settings")
          .eq("id", tenantId)
          .maybeSingle();
        const latestSettings =
          freshTenant?.settings && typeof freshTenant.settings === "object"
            ? (freshTenant.settings as Record<string, unknown>)
            : tenantSettings;
        if (typeof latestSettings.trial_started_at !== "string") {
          await supabase
            .from("tenants")
            .update({
              settings: {
                ...latestSettings,
                trial_started_at: trialStart.toISOString(),
              },
            })
            .eq("id", tenantId);
        }
        tenantSettings = {
          ...latestSettings,
          trial_started_at:
            typeof latestSettings.trial_started_at === "string"
              ? latestSettings.trial_started_at
              : trialStart.toISOString(),
        };
      } catch {
        // Non-blocking persistence of trial anchor
      }
    }

    const trialEnd = new Date(trialStart.getTime() + 7 * DAY_MS);
    const now = new Date();
    const remainingMs = Math.max(0, trialEnd.getTime() - now.getTime());
    const isTrialExpiredByClock = remainingMs <= 0;
    const trialHoursRemaining = Math.floor(remainingMs / HOUR_MS);
    const trialDaysRemaining = isTrialExpiredByClock ? 0 : Math.ceil(remainingMs / DAY_MS);

    // 2. Try querying tenant_subscriptions table
    const settingsSub = tenantSettings.subscription as
      | {
          plan_slug?: PlanSlug;
          status?: SubscriptionStatus;
          current_period_end?: string;
        }
      | undefined;

    try {
      const { data: sub, error } = await supabase
        .from("tenant_subscriptions")
        .select("status, billing_interval, current_period_end, subscription_plans(*)")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!error && sub) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawPlanJoin = sub.subscription_plans as any;
        const planData = Array.isArray(rawPlanJoin) ? rawPlanJoin[0] : rawPlanJoin;
        const planSlug = (planData?.slug || settingsSub?.plan_slug || "evaluation") as PlanSlug;
        const plan = await paystackBillingService.getPlan(planSlug);
        const currentPeriodEnd = new Date(sub.current_period_end || trialEnd);
        const isActive = sub.status === "active" && currentPeriodEnd > now;

        if (isActive || !(settingsSub?.plan_slug && settingsSub.status === "active")) {
          return {
            plan,
            status: isActive ? "active" : (sub.status as SubscriptionStatus),
            currentPeriodEnd,
            isTrial: false,
            isTrialExpired: false,
            trialStartedAt: trialStart,
            trialEndsAt: trialEnd,
            trialDaysRemaining,
            trialHoursRemaining,
          };
        }
      }
    } catch {
      // Table may not exist yet, fallback to tenant settings
    }

    // 3. Check tenant.settings.subscription fallback
    if (settingsSub?.plan_slug && settingsSub.status === "active") {
      const plan = await paystackBillingService.getPlan(settingsSub.plan_slug);
      const periodEnd = settingsSub.current_period_end
        ? new Date(settingsSub.current_period_end)
        : trialEnd;

      if (periodEnd > now) {
        return {
          plan,
          status: "active",
          currentPeriodEnd: periodEnd,
          isTrial: false,
          isTrialExpired: false,
          trialStartedAt: trialStart,
          trialEndsAt: trialEnd,
          trialDaysRemaining,
          trialHoursRemaining,
        };
      }
    }

    // 4. Default: Evaluation Pilot (7-day trial)
    const isTrialExpired = isTrialExpiredByClock;
    return {
      plan: evaluationPlan,
      status: isTrialExpired ? "past_due" : "trialing",
      currentPeriodEnd: trialEnd,
      isTrial: true,
      isTrialExpired,
      trialStartedAt: trialStart,
      trialEndsAt: trialEnd,
      trialDaysRemaining,
      trialHoursRemaining,
    };
  }

  /**
   * Evaluates feature entitlements according to Document 11 Section 5 rules:
   * - run_audit: monthly quota check
   * - export_unwatermarked: requires Growth or higher
   * - cco_approval_lock: requires Scale or Enterprise
   * - url_drift_monitoring: requires Scale or Enterprise
   */
  public async checkTenantEntitlement(
    tenantId: string,
    feature: FeatureGateType,
  ): Promise<EntitlementCheckResult> {
    const subInfo = await this.getTenantSubscriptionInfo(tenantId);
    const { plan, status, isTrial, trialDaysRemaining } = subInfo;

    // 1. If trial has expired and account has no active subscription
    if (isTrial && status === "past_due") {
      return {
        allowed: false,
        feature,
        reason: "Your 7-day Evaluation Pilot has expired. Upgrade to Growth or Scale to continue.",
        planSlug: plan.slug,
        status,
        trialDaysRemaining: 0,
      };
    }

    // 2. Feature: export_unwatermarked
    if (feature === "export_unwatermarked") {
      if (plan.slug === "evaluation" || !plan.features.export_unwatermarked) {
        return {
          allowed: false,
          feature,
          reason: "Unwatermarked statutory PDF dossiers require a Growth, Scale, or Enterprise plan.",
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }
      return {
        allowed: true,
        feature,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    // 3. Feature: cco_approval_lock (Separation of duties)
    if (feature === "cco_approval_lock") {
      if (plan.slug !== "scale" && plan.slug !== "enterprise") {
        return {
          allowed: false,
          feature,
          reason: "CCO Separation-of-Duties Approval Locks require a Scale or Enterprise plan.",
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }
      return {
        allowed: true,
        feature,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    // 4. Feature: url_drift_monitoring
    if (feature === "url_drift_monitoring") {
      const limit = plan.url_drift_monitor_limit;
      if (limit === 0) {
        return {
          allowed: false,
          feature,
          reason: "Real-time post-publication URL drift monitoring requires a Scale or Enterprise plan.",
          currentCount: 0,
          limit: 0,
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      // Check active drift monitors count
      let currentCount = 0;
      try {
        const supabase = createAdminSupabaseClient();
        const { count, error: countErr } = await supabase
          .from("campaign_drift_monitors")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId);

        currentCount = !countErr && typeof count === "number" ? count : 0;
      } catch {
        currentCount = 0;
      }

      if (limit !== -1 && currentCount >= limit) {
        return {
          allowed: false,
          feature,
          reason: `URL drift monitor quota reached (${currentCount}/${limit} active URLs). Upgrade to Enterprise for unlimited monitoring.`,
          currentCount,
          limit,
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      return {
        allowed: true,
        feature,
        currentCount,
        limit,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    // 5. Feature: run_audit
    if (feature === "run_audit") {
      const limit = plan.monthly_audit_limit;
      if (limit === -1) {
        return {
          allowed: true,
          feature,
          limit: -1,
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      // Count assessments created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let currentCount = 0;
      try {
        const supabase = createAdminSupabaseClient();
        const { count } = await supabase
          .from("campaign_assessments")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", startOfMonth.toISOString());

        currentCount = count || 0;
      } catch {
        currentCount = 0;
      }

      if (currentCount >= limit) {
        return {
          allowed: false,
          feature,
          reason: `Monthly audit quota reached (${currentCount}/${limit}). Upgrade your plan to continue running compliance audits.`,
          currentCount,
          limit,
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      return {
        allowed: true,
        feature,
        currentCount,
        limit,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    // 6. Feature: live_web_search (Paid Exa AI + SerpAPI Nigeria & Africa)
    if (feature === "live_web_search") {
      const limit =
        typeof plan.monthly_live_search_limit === "number"
          ? plan.monthly_live_search_limit
          : plan.features.monthly_live_search_limit ?? 0;
      const allowedJurisdictions = plan.allowed_search_jurisdictions ?? [];

      if (plan.slug === "evaluation" || !plan.features.live_web_search || limit === 0) {
        return {
          allowed: false,
          feature,
          reason:
            "Real-time Nigerian & Pan-African Web Search (Exa AI + SerpAPI) requires a Growth ($149/mo) or Scale ($449/mo) plan. Your query will search our 141 verified Nigerian statutory documents.",
          currentCount: 0,
          limit: 0,
          remaining: 0,
          allowedJurisdictions: [],
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      const currentCount = await this.getCurrentMonthLiveSearchCount(tenantId);
      if (limit !== -1 && currentCount >= limit) {
        return {
          allowed: false,
          feature,
          reason: `Monthly live regulatory web search quota reached (${currentCount}/${limit}). Upgrade to Scale or Enterprise for higher capacity.`,
          currentCount,
          limit,
          remaining: 0,
          allowedJurisdictions,
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      return {
        allowed: true,
        feature,
        currentCount,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount),
        allowedJurisdictions,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    // 7. Feature: cross_border_research (Pan-African GH/KE/ZA/RW/EG jurisdictions)
    if (feature === "cross_border_research") {
      const allowedJurisdictions = plan.allowed_search_jurisdictions ?? [];
      if (
        (plan.slug !== "scale" && plan.slug !== "enterprise") ||
        !plan.features.cross_border_research
      ) {
        return {
          allowed: false,
          feature,
          reason:
            "Pan-African Cross-Border Regulatory Search (Kenya, Ghana, South Africa, Rwanda, Egypt) requires a Scale ($449/mo) or Enterprise plan.",
          allowedJurisdictions,
          planSlug: plan.slug,
          status,
          trialDaysRemaining,
        };
      }

      return {
        allowed: true,
        feature,
        allowedJurisdictions,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    return {
      allowed: true,
      feature,
      planSlug: plan.slug,
      status,
      trialDaysRemaining,
    };
  }

  public getCurrentBillingPeriod(now: Date = new Date()): string {
    return now.toISOString().slice(0, 7); // 'YYYY-MM' UTC
  }

  public async getCurrentMonthLiveSearchCount(tenantId: string): Promise<number> {
    const billingPeriod = this.getCurrentBillingPeriod();
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("live_web_search_usage")
        .select("search_count")
        .eq("tenant_id", tenantId)
        .eq("billing_period", billingPeriod)
        .maybeSingle();

      if (!error && data && typeof data.search_count === "number") {
        return data.search_count;
      }
    } catch {
      // Fallback to 0 when usage ledger row does not exist yet
    }
    return 0;
  }

  /**
   * Returns complete live search quota snapshot for UI pills, sidebar meter, and /search/quota endpoint.
   */
  public async getLiveSearchQuotaSnapshot(tenantId: string) {
    const [liveCheck, crossBorderCheck] = await Promise.all([
      this.checkTenantEntitlement(tenantId, "live_web_search"),
      this.checkTenantEntitlement(tenantId, "cross_border_research"),
    ]);

    return {
      plan_slug: liveCheck.planSlug || "evaluation",
      live_web_allowed: liveCheck.allowed,
      cross_border_allowed: crossBorderCheck.allowed,
      allowed_jurisdictions: liveCheck.allowedJurisdictions || [],
      used_this_month: liveCheck.currentCount ?? 0,
      monthly_limit: liveCheck.limit ?? 0,
      remaining: liveCheck.remaining ?? 0,
      trial_locked_reason: liveCheck.allowed ? null : (liveCheck.reason ?? null),
    };
  }

  /**
   * Atomically authorizes live search (plan + jurisdiction scope) and consumes 1 quota credit via PostgreSQL RPC.
   * Zero client trust; fail-closed if quota RPC fails or is exhausted.
   */
  public async authorizeAndConsumeLiveSearch(
    tenantId: string,
    requestedJurisdictions: string[] = ["NG"],
    increment: number = 1,
  ): Promise<EntitlementCheckResult> {
    const subInfo = await this.getTenantSubscriptionInfo(tenantId);
    const { plan, status, isTrial, trialDaysRemaining } = subInfo;

    if (isTrial && status === "past_due") {
      return {
        allowed: false,
        feature: "live_web_search",
        reason: "Your 7-day Evaluation Pilot has expired. Upgrade to Growth or Scale to use Live Search.",
        currentCount: 0,
        limit: 0,
        remaining: 0,
        allowedJurisdictions: [],
        planSlug: plan.slug,
        status,
        trialDaysRemaining: 0,
      };
    }

    const limit =
      typeof plan.monthly_live_search_limit === "number"
        ? plan.monthly_live_search_limit
        : plan.features.monthly_live_search_limit ?? 0;

    if (plan.slug === "evaluation" || !plan.features.live_web_search || limit === 0) {
      return {
        allowed: false,
        feature: "live_web_search",
        reason:
          "Live Nigerian & Pan-African Web Search (Exa AI + SerpAPI) is available on Growth and Scale plans.",
        currentCount: 0,
        limit: 0,
        remaining: 0,
        allowedJurisdictions: [],
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    const allowedJurisdictions = plan.allowed_search_jurisdictions ?? ["NG"];
    const normalizedRequested =
      requestedJurisdictions.length > 0 ? requestedJurisdictions : ["NG"];
    const hasGlobal = allowedJurisdictions.includes("GLOBAL");
    const disallowedJurisdictions = hasGlobal
      ? []
      : normalizedRequested.filter((code) => !allowedJurisdictions.includes(code));

    if (disallowedJurisdictions.length > 0) {
      return {
        allowed: false,
        feature: "cross_border_research",
        reason: `Jurisdiction scope (${disallowedJurisdictions.join(", ")}) requires a Scale ($449/mo) or Enterprise plan. Your ${plan.name} plan supports: ${allowedJurisdictions.join(", ")}.`,
        allowedJurisdictions,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    const billingPeriod = this.getCurrentBillingPeriod();
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase.rpc("consume_live_search_quota", {
      p_tenant_id: tenantId,
      p_billing_period: billingPeriod,
      p_monthly_limit: limit,
      p_increment: increment,
    });

    if (error) {
      logger.error("consume_live_search_quota RPC failed (failing closed)", {
        tenantId,
        billingPeriod,
        error,
      });
      return {
        allowed: false,
        feature: "live_web_search",
        reason: "Unable to verify monthly live search quota at this time.",
        allowedJurisdictions,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const allowed = Boolean(row?.allowed);
    const currentCount = typeof row?.current_count === "number" ? row.current_count : 0;
    const remaining = typeof row?.remaining === "number" ? row.remaining : 0;

    if (!allowed) {
      return {
        allowed: false,
        feature: "live_web_search",
        reason: `Monthly live regulatory web search quota reached (${currentCount}/${limit}). Upgrade your plan for additional searches.`,
        currentCount,
        limit,
        remaining: 0,
        allowedJurisdictions,
        planSlug: plan.slug,
        status,
        trialDaysRemaining,
      };
    }

    return {
      allowed: true,
      feature: "live_web_search",
      currentCount,
      limit,
      remaining,
      allowedJurisdictions,
      planSlug: plan.slug,
      status,
      trialDaysRemaining,
    };
  }
}

export const entitlementsService = new EntitlementsService();
export const checkTenantEntitlement = (
  tenantId: string,
  feature: FeatureGateType,
) => entitlementsService.checkTenantEntitlement(tenantId, feature);
