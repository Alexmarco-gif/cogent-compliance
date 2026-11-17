"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Check,
  Globe,
} from "lucide-react";
import type { BillingInterval, PlanSlug } from "@/contracts/billing.contracts";

interface SubscriptionData {
  plan: {
    slug: string;
    name: string;
    price_usd_cents: number;
    monthly_audit_limit: number;
    seat_limit: number;
    url_drift_monitor_limit: number;
    features: {
      export_unwatermarked: boolean;
      cco_approval_lock: boolean;
      url_drift_monitoring: boolean;
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

const PLAN_OPTIONS: Array<{
  slug: Exclude<PlanSlug, "evaluation">;
  name: string;
  subtitle: string;
  monthlyUsd: number;
  annualMonthlyUsd: number;
  annualTotalUsd: number;
  recommended?: boolean;
  highlights: string[];
}> = [
  {
    slug: "growth",
    name: "Growth",
    subtitle: "For seed fintechs, digital lenders, and emerging MFBs.",
    monthlyUsd: 149,
    annualMonthlyUsd: 119,
    annualTotalUsd: 1428,
    highlights: [
      "25 campaign reviews / month",
      "3 team seats with roles",
      "Unlimited compliant rewrites",
      "Unwatermarked filing PDFs",
    ],
  },
  {
    slug: "scale",
    name: "Scale",
    subtitle: "For growth-stage fintechs, MMOs, and commercial institutions.",
    monthlyUsd: 449,
    annualMonthlyUsd: 359,
    annualTotalUsd: 4308,
    recommended: true,
    highlights: [
      "Unlimited campaign reviews",
      "10 team seats + CCO sign-off lock",
      "15 live URL drift monitors",
      "2-year evidence retention",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    subtitle: "For Tier-1 commercial banks and financial holding groups.",
    monthlyUsd: 1499,
    annualMonthlyUsd: 1199,
    annualTotalUsd: 14388,
    highlights: [
      "Unlimited seats & campaign reviews",
      "Unlimited live URL drift monitors",
      "Custom internal policy libraries",
      "7-year archival retention",
    ],
  },
];

function formatDetailedTrialRemaining(sub: SubscriptionData): string {
  const hoursTotal = sub.trialHoursRemaining ?? sub.trialDaysRemaining * 24;
  if (sub.isTrialExpired || sub.status === "past_due" || hoursTotal <= 0) {
    return "Your 7-day evaluation period has expired. Upgrade below to restore compliance audits.";
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
  const checkoutStatus = searchParams.get("checkout");
  const checkoutRef =
    searchParams.get("reference") || searchParams.get("trxref") || searchParams.get("ref");

  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [fxRate, setFxRate] = useState<number>(1550.0);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanSlug | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<{
    status: "idle" | "verifying" | "verified" | "failed";
    message?: string;
  }>({ status: "idle" });

  const loadBilling = useCallback(async () => {
    setLoadingSub(true);
    try {
      const [entRes, plansRes] = await Promise.all([
        fetch("/api/marketing-shield/v1/billing/entitlements", { cache: "no-store" }),
        fetch("/api/marketing-shield/v1/billing/plans", { cache: "no-store" }),
      ]);
      if (entRes.ok) {
        const json = await entRes.json();
        setSubData(json.subscription);
      }
      if (plansRes.ok) {
        const plansJson = await plansRes.json();
        if (plansJson.fx_rate) {
          setFxRate(plansJson.fx_rate);
        }
      }
    } catch (err) {
      console.error("Failed to fetch billing state", err);
    } finally {
      setLoadingSub(false);
    }
  }, []);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId) return;
    loadBilling();
  }, [clerkLoaded, isSignedIn, orgId, loadBilling]);

  // Verify Paystack transaction automatically upon returning from hosted checkout
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId) return;
    if (checkoutStatus !== "success" || !checkoutRef) return;

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
  }, [clerkLoaded, isSignedIn, orgId, checkoutStatus, checkoutRef]);

  const handleCheckout = async (slug: PlanSlug) => {
    setCheckoutLoading(slug);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: slug, billingInterval }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorization_url) {
        throw new Error(data.error || "Unable to initiate Paystack checkout");
      }
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout error");
      setCheckoutLoading(null);
    }
  };

  const formatNaira = (usd: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Math.round(usd * fxRate));

  const plan = subData?.plan;
  const isTrial = subData?.isTrial ?? true;
  const isExpired =
    Boolean(subData?.isTrialExpired) ||
    subData?.status === "past_due" ||
    (isTrial && subData !== null && (subData.trialHoursRemaining ?? subData.trialDaysRemaining * 24) <= 0);

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
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Payment not yet confirmed:</span> {verifyState.message}{" "}
            Reference: <span className="font-mono">{checkoutRef}</span>.
          </div>
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
            <a
              href="#workspace-plans"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
            >
              <span>{isExpired ? "Upgrade Now" : "Change Plan"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
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
            <a
              href="#workspace-plans"
              className={`whitespace-nowrap font-semibold hover:underline ${
                isExpired ? "text-rose-900" : "text-zinc-950"
              }`}
            >
              {isExpired ? "Upgrade plan →" : "View plans →"}
            </a>
          </div>
        )}

        {/* Entitlements & Usage Limits */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <span>PDF Dossiers</span>
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
              {plan?.features.export_unwatermarked
                ? "Ready for regulatory filing"
                : "Evaluation stamp applied"}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Upgrade Selector (Settled via Paystack) */}
      <div id="workspace-plans" className="bg-white rounded-xl border border-zinc-200 p-6 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Upgrade Workspace Plan</h3>
            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-zinc-400" />
              <span>Settled via Paystack at ₦{fxRate.toLocaleString()}/$1</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-medium ${
                billingInterval === "monthly" ? "text-zinc-950" : "text-zinc-400"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() =>
                setBillingInterval((prev) => (prev === "monthly" ? "annual" : "monthly"))
              }
              className="w-10 h-5 rounded-full bg-zinc-900 p-0.5 transition-colors relative cursor-pointer"
              aria-label="Toggle billing interval"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  billingInterval === "annual" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-xs font-medium ${
                billingInterval === "annual" ? "text-zinc-950" : "text-zinc-400"
              }`}
            >
              Annual
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Save 20%
            </span>
          </div>
        </div>

        {checkoutError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {checkoutError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_OPTIONS.map((option) => {
            const usd =
              billingInterval === "annual" ? option.annualMonthlyUsd : option.monthlyUsd;
            const totalUsd =
              billingInterval === "annual" ? option.annualTotalUsd : option.monthlyUsd;
            const isCurrent =
              !isTrial && subData?.status === "active" && plan?.slug === option.slug;

            return (
              <div
                key={option.slug}
                className={`rounded-xl p-5 flex flex-col justify-between ${
                  option.recommended
                    ? "border-2 border-zinc-950 bg-zinc-50/40"
                    : "border border-zinc-200 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-950">{option.name}</h4>
                    {option.recommended && (
                      <span className="px-2 py-0.5 rounded bg-zinc-950 text-white text-[10px] font-semibold uppercase tracking-wide">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-zinc-500 mt-1 min-h-[32px]">
                    {option.subtitle}
                  </p>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-zinc-950 tabular-nums">
                        ${usd.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-zinc-400">/ month</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      {formatNaira(totalUsd)}/{billingInterval === "annual" ? "yr" : "mo"}
                    </div>
                  </div>

                  <ul className="mt-4 pt-4 border-t border-zinc-100 space-y-2 text-[11.5px] text-zinc-700">
                    {option.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || checkoutLoading === option.slug}
                  onClick={() => handleCheckout(option.slug)}
                  className={`mt-5 w-full py-2 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    option.recommended
                      ? "bg-zinc-950 hover:bg-zinc-800 text-white"
                      : "border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900"
                  }`}
                >
                  {isCurrent
                    ? "Current Plan"
                    : checkoutLoading === option.slug
                      ? "Preparing Paystack..."
                      : `Choose ${option.name}`}
                </button>
              </div>
            );
          })}
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
              <span className="font-medium text-zinc-900">Campaign Reviews</span>
              <p className="text-zinc-500 text-[11px]">
                Review promotional copy, flyers, and landing pages against statutory standards
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              ENABLED
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900">Unwatermarked PDF Dossiers</span>
              <p className="text-zinc-500 text-[11px]">
                Export filing-ready compliance records without preview watermarks
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border shrink-0 ${
                plan?.features.export_unwatermarked
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              {plan?.features.export_unwatermarked ? "ENABLED" : "UPGRADE REQUIRED"}
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
              Processed via Paystack with Naira (NGN) and USD card settlement.
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
                Manage or upgrade your active subscription plan above
              </div>
            </div>
          </div>
          <a
            href="#workspace-plans"
            className="text-xs font-medium text-zinc-950 hover:underline shrink-0"
          >
            Update plan →
          </a>
        </div>
      </div>
    </div>
  );
}
