"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Layers,
  Loader2,
  XCircle,
  Globe,
} from "lucide-react";

interface SubscriptionData {
  plan: {
    slug: string;
    name: string;
    price_usd_cents: number;
    monthly_audit_limit: number;
    seat_limit: number;
    url_drift_monitor_limit: number;
    monthly_live_search_limit?: number;
    allowed_search_jurisdictions?: string[];
    features: {
      export_unwatermarked: boolean;
      cco_approval_lock: boolean;
      url_drift_monitoring: boolean;
      live_web_search?: boolean;
      cross_border_research?: boolean;
      work_product_docx_export?: boolean;
    };
  };
  status: string;
  currentPeriodEnd: string;
  isTrial: boolean;
  isTrialExpired?: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  trialDaysRemaining: number;
  trialHoursRemaining?: number;
}

interface SearchQuotaData {
  live_web_allowed: boolean;
  cross_border_allowed: boolean;
  allowed_jurisdictions: string[];
  used_this_month: number;
  monthly_limit: number;
  remaining: number;
}

function formatDetailedTrialRemaining(sub: SubscriptionData): string {
  const hoursTotal = sub.trialHoursRemaining ?? sub.trialDaysRemaining * 24;
  if (sub.isTrialExpired || sub.status === "past_due" || hoursTotal <= 0) {
    return "Your 7-day evaluation period has expired. Upgrade to restore compliance audits.";
  }
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;
  const endDate = sub.trialEndsAt || sub.currentPeriodEnd;
  const formattedEnd = endDate
    ? new Date(endDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const remainingLabel =
    days <= 0
      ? `${hours} hour${hours === 1 ? "" : "s"} remaining`
      : hours === 0
        ? `${days} day${days === 1 ? "" : "s"} remaining`
        : `${days}d ${hours}h remaining`;

  return formattedEnd
    ? `7-day evaluation active: ${remainingLabel} (ends ${formattedEnd}).`
    : `7-day evaluation active: ${remainingLabel}.`;
}

export function BillingPlanTab() {
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const searchParams = useSearchParams();
  const checkoutRef =
    searchParams.get("reference") || searchParams.get("trxref") || searchParams.get("ref");

  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [searchQuota, setSearchQuota] = useState<SearchQuotaData | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [ownerState, setOwnerState] = useState<{ isInternal: boolean; isDemoTenant?: boolean } | null>(
    null,
  );
  const [ownerToggle, setOwnerToggle] = useState<{ saving: boolean; error?: string }>({
    saving: false,
  });
  const [verifyState, setVerifyState] = useState<{
    status: "idle" | "verifying" | "verified" | "failed";
    message?: string;
  }>({ status: "idle" });

  const loadBilling = useCallback(async () => {
    setLoadingSub(true);
    try {
      const [entRes, quotaRes] = await Promise.all([
        fetch("/api/marketing-shield/v1/billing/entitlements", { cache: "no-store" }),
        fetch("/api/marketing-shield/v1/search/quota", { cache: "no-store" }),
      ]);
      if (entRes.ok) {
        const json = await entRes.json();
        setSubData(json.subscription);
      }
      if (quotaRes.ok) {
        const qJson = await quotaRes.json();
        if (qJson?.data) {
          setSearchQuota(qJson.data);
        } else if (typeof qJson?.monthly_limit === "number") {
          setSearchQuota(qJson);
        }
      }
    } catch (err) {
      console.error("Failed to fetch billing state", err);
    } finally {
      setLoadingSub(false);
    }
  }, []);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;
    if (!orgId) {
      setLoadingSub(false);
      return;
    }
    loadBilling();
  }, [clerkLoaded, isSignedIn, orgId, loadBilling]);

  // Owner-only Internal Workspace control (endpoint returns 404 for everyone else, so nothing renders)
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId) return;
    let cancelled = false;
    fetch("/api/marketing-shield/v1/admin/internal-workspace", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setOwnerState(json?.isOwner ? { isInternal: Boolean(json.isInternal), isDemoTenant: json.isDemoTenant } : null);
      })
      .catch(() => {
        if (!cancelled) setOwnerState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, orgId]);

  const toggleInternalWorkspace = useCallback(
    async (enabled: boolean) => {
      setOwnerToggle({ saving: true });
      try {
        const res = await fetch("/api/marketing-shield/v1/admin/internal-workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setOwnerToggle({ saving: false, error: json.error || "Unable to update workspace." });
          return;
        }
        setOwnerState((prev) => ({ ...(prev || {}), isInternal: Boolean(json.isInternal) }));
        setOwnerToggle({ saving: false });
        loadBilling();
        window.dispatchEvent(new Event("cogent:billing-updated"));
      } catch (err) {
        setOwnerToggle({
          saving: false,
          error: err instanceof Error ? err.message : "Unable to update workspace.",
        });
      }
    },
    [loadBilling],
  );

  // Verify Paystack transaction automatically whenever returning with a Paystack reference
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId) return;
    if (!checkoutRef) return;

    let cancelled = false;
    async function verifyCheckout() {
      setVerifyState({ status: "verifying" });
      try {
        const res = await fetch("/api/marketing-shield/v1/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: checkoutRef }),
        });
        const json = await res.json();
        if (cancelled) return;

        if (res.ok && json.verified) {
          if (json.subscription) {
            setSubData(json.subscription);
          }
          setVerifyState({
            status: "verified",
            message: `Payment verified via Paystack. Your ${json.planSlug || "paid"} plan is now active.`,
          });
          loadBilling();
          window.dispatchEvent(new Event("cogent:billing-updated"));
        } else {
          setVerifyState({
            status: "failed",
            message:
              json.message ||
              json.error ||
              "Paystack has not confirmed payment for this reference yet.",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setVerifyState({
            status: "failed",
            message: err instanceof Error ? err.message : "Unable to verify payment status.",
          });
        }
      }
    }

    verifyCheckout();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, orgId, checkoutRef, loadBilling]);

  const plan = subData?.plan;
  const isTrial = subData?.isTrial ?? true;
  const isExpired =
    Boolean(subData?.isTrialExpired) ||
    subData?.status === "past_due" ||
    (isTrial && subData !== null && (subData.trialHoursRemaining ?? subData.trialDaysRemaining * 24) <= 0);

  const liveSearchLimit =
    searchQuota?.monthly_limit ?? plan?.monthly_live_search_limit ?? 0;
  const liveSearchEnabled =
    searchQuota?.live_web_allowed ?? Boolean(plan?.features.live_web_search);
  const crossBorderEnabled =
    searchQuota?.cross_border_allowed ?? Boolean(plan?.features.cross_border_research);
  const docxExportEnabled = Boolean(
    plan?.features.work_product_docx_export ?? plan?.features.export_unwatermarked,
  );


  return (
    <div className="space-y-6">

      {verifyState.status === "verifying" && (
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-zinc-600 animate-spin shrink-0" />
          <div className="text-xs">
            Verifying your Paystack transaction{" "}
            <span className="font-mono font-semibold">{checkoutRef}</span>...
          </div>
        </div>
      )}

      {verifyState.status === "verified" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">{verifyState.message}</span> Reference:{" "}
            <span className="font-mono">{checkoutRef}</span>.
          </div>
        </div>
      )}

      {verifyState.status === "failed" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">Payment not yet confirmed:</span> {verifyState.message}{" "}
              Reference: <span className="font-mono">{checkoutRef}</span>.
            </div>
          </div>
          <Link
            href="/pricing"
            className="text-xs font-semibold text-zinc-950 hover:underline whitespace-nowrap shrink-0"
          >
            Retry Checkout →
          </Link>
        </div>
      )}

      {/* Main Plan Overview Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Current Plan
            </div>
            <h2 className="text-2xl font-semibold text-zinc-950 mt-1 flex items-center gap-2.5">
              {loadingSub ? "Loading plan..." : plan?.name || "Evaluation Pilot"}
              {subData && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide border ${
                    subData.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isExpired
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-zinc-100 text-zinc-700 border-zinc-200"
                  }`}
                >
                  {isExpired ? "EXPIRED" : subData.status}
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {loadingSub
                ? "Checking active workspace subscription..."
                : isTrial && subData
                  ? formatDetailedTrialRemaining(subData)
                  : `Active subscription${subData?.currentPeriodEnd ? ` · Renews ${new Date(subData.currentPeriodEnd).toLocaleDateString()}` : ""}.`}
            </p>
          </div>

          <div className="sm:text-right flex flex-col sm:items-end gap-2">
            <div>
              <div className="text-2xl font-semibold text-zinc-950 tabular-nums">
                ${plan ? (plan.price_usd_cents / 100).toFixed(0) : "0"}
                <span className="text-xs text-zinc-400 font-normal"> / month</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Settled in NGN via Paystack
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
            >
              <span>{isExpired ? "Upgrade Now" : "Change Plan"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {!loadingSub && isTrial && subData && (
          <div
            className={`mt-4 p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
              isExpired
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-zinc-50 border-zinc-200 text-zinc-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {isExpired ? (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
              )}
              <span>{formatDetailedTrialRemaining(subData)}</span>
            </div>
            <Link
              href="/pricing"
              className={`whitespace-nowrap font-semibold hover:underline ${
                isExpired ? "text-rose-900" : "text-zinc-950"
              }`}
            >
              {isExpired ? "Upgrade plan →" : "View plans →"}
            </Link>
          </div>
        )}

        {/* Entitlements & Usage Limits */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600 mb-2">
              <span>Monthly Reviews</span>
              <Layers className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-semibold text-zinc-950 tabular-nums">
              {plan?.monthly_audit_limit === -1 ? (
                "Unlimited"
              ) : (
                <span>
                  {plan?.monthly_audit_limit ?? 3}{" "}
                  <span className="text-xs text-zinc-400 font-normal">limit</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {plan?.monthly_audit_limit === -1
                ? "No monthly cap"
                : "Upgrade for higher limits"}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600 mb-2">
              <span>Live Web Search</span>
              <Globe className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-semibold text-zinc-950 tabular-nums">
              {!liveSearchEnabled ? (
                "Vault Only"
              ) : liveSearchLimit === -1 ? (
                "Unlimited"
              ) : (
                <span>
                  {searchQuota?.used_this_month ?? 0}/{liveSearchLimit}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {!liveSearchEnabled
                ? "Exa + SerpAPI on Growth+"
                : (searchQuota?.allowed_jurisdictions || plan?.allowed_search_jurisdictions || ["NG"]).join(", ")}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600 mb-2">
              <span>URL Drift Monitors</span>
              <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-semibold text-zinc-950 tabular-nums">
              {plan?.url_drift_monitor_limit === -1
                ? "Unlimited"
                : plan?.url_drift_monitor_limit === 0
                  ? "0 URLs"
                  : `${plan?.url_drift_monitor_limit ?? 0} URLs`}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {plan?.url_drift_monitor_limit === 0
                ? "Included on Scale & Enterprise"
                : "Active landing page monitors"}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600 mb-2">
              <span>PDF &amp; Word Exports</span>
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-sm font-semibold text-zinc-950">
              {plan?.features.export_unwatermarked ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Unwatermarked
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Preview Watermark
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {docxExportEnabled
                ? "Word (.docx), PDF & Markdown"
                : "Evaluation stamp applied"}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Access Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-950 mb-1">Plan Capabilities</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Features enabled for your current workspace tier.
        </p>

        <div className="divide-y divide-zinc-100 text-xs">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">Campaign Reviews &amp; Statutory Vault</span>
              <p className="text-zinc-500 text-[11px]">
                Review promotional copy, flyers, and landing pages against 141 verified Nigerian statutory documents
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              ENABLED
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">Live Regulatory Web Search (Exa AI + SerpAPI)</span>
              <p className="text-zinc-500 text-[11px]">
                Real-time search across official regulator portals, top African law firms, and breaking enforcement news
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border shrink-0 ${
                liveSearchEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              {liveSearchEnabled
                ? liveSearchLimit === -1
                  ? "UNLIMITED"
                  : `${liveSearchLimit}/MO`
                : "GROWTH+"}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">Pan-African Cross-Border Search</span>
              <p className="text-zinc-500 text-[11px]">
                Compare regulatory rules across Nigeria (NG), Kenya (KE), Ghana (GH), South Africa (ZA), Rwanda (RW), and Egypt (EG)
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border shrink-0 ${
                crossBorderEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              {crossBorderEnabled ? "ENABLED" : "SCALE+"}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">Unwatermarked PDF &amp; Word (.docx) Exports</span>
              <p className="text-zinc-500 text-[11px]">
                Export filing-ready compliance dossiers and editable Word work products without preview watermarks
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border shrink-0 ${
                plan?.features.export_unwatermarked
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              {plan?.features.export_unwatermarked ? "ENABLED" : "GROWTH+"}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">CCO Sign-Off Workflow</span>
              <p className="text-zinc-500 text-[11px]">
                Require Legal Counsel or CCO sign-off before campaign publication
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border shrink-0 ${
                plan?.features.cco_approval_lock
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              {plan?.features.cco_approval_lock ? "ENABLED" : "SCALE+"}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">Live URL Drift Monitoring</span>
              <p className="text-zinc-500 text-[11px]">
                Monitor published campaign pages for changes after approval
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border shrink-0 ${
                plan?.features.url_drift_monitoring
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              {plan?.features.url_drift_monitoring ? "ENABLED" : "SCALE+"}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Payment Method</h3>
            <p className="text-xs text-zinc-500">
              Processed via Paystack with Card, Pay with Bank, USSD, and NGN settlement.
            </p>
          </div>
          <div className="h-7 px-2.5 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center text-[10px] font-semibold text-zinc-600 font-mono">
            PAYSTACK
          </div>
        </div>

        <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-zinc-500" />
            <div>
              <div className="font-medium text-zinc-900">Card &amp; Bank Settlement</div>
              <div className="text-zinc-500 text-[11px]">
                Manage or upgrade your active subscription plan
              </div>
            </div>
          </div>
          <Link
            href="/pricing"
            className="text-xs font-medium text-zinc-950 hover:underline shrink-0"
          >
            Update plan →
          </Link>
        </div>
      </div>

      {/* Owner-only: Internal Workspace control (only rendered for the platform owner) */}
      {ownerState && !ownerState.isDemoTenant && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Internal Workspace</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                Only you can see this. When on, this workspace has unlimited Enterprise access with
                no trial or billing. Use it for walkthroughs, demos and marketing. Teammates you
                invite get the same access here. Nothing in the app marks it as internal.
              </p>
              {ownerToggle.error && (
                <p className="text-xs text-rose-700 mt-2">{ownerToggle.error}</p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ownerState.isInternal}
              aria-label="Toggle Internal Workspace"
              disabled={ownerToggle.saving}
              onClick={() => toggleInternalWorkspace(!ownerState.isInternal)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                ownerState.isInternal ? "bg-emerald-600" : "bg-zinc-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  ownerState.isInternal ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
