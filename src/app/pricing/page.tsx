"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  BillingInterval,
  PlanSlug,
} from "@/contracts/billing.contracts";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Check, ArrowRight, Globe, Info } from "lucide-react";

interface CurrentSubBanner {
  planSlug: string;
  planName: string;
  status: string;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  trialHoursRemaining: number;
}

const PLAN_MATRIX_ROWS = [
  {
    feature: "Monthly Campaign Audits",
    evaluation: "3 (7-day pilot)",
    growth: "25 / month",
    scale: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Team Seats (RBAC Roles)",
    evaluation: "2 Seats",
    growth: "3 Seats",
    scale: "10 Seats",
    enterprise: "Unlimited",
  },
  {
    feature: "Compliant Channel Rewrites",
    evaluation: "10 Rewrites",
    growth: "Unlimited",
    scale: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Internal Product Rate Cards",
    evaluation: "1 Schedule",
    growth: "5 Schedules",
    scale: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Statutory PDF Audit Dossiers",
    evaluation: "Watermarked Preview",
    growth: "Unwatermarked PDF",
    scale: "Signed SHA-256 PDF",
    enterprise: "Custom Branded PDF",
  },
  {
    feature: "Live URL Drift Monitors",
    evaluation: "—",
    growth: "—",
    scale: "15 Monitors",
    enterprise: "Unlimited",
  },
  {
    feature: "Dual-Control CCO Sign-Off",
    evaluation: "—",
    growth: "Role Permissions",
    scale: "Enforced CCO Lock",
    enterprise: "Custom Approval Chains",
  },
  {
    feature: "Regulatory Evidence Retention",
    evaluation: "7 Days",
    growth: "90 Days",
    scale: "2 Years (FCCPC Reg. 32)",
    enterprise: "7 Years (BOFIA)",
  },
];

export default function PricingPage() {
  const { isLoaded: authLoaded, isSignedIn, orgId } = useAuth();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [fxRate, setFxRate] = useState<number>(1550.0);
  const [currentSub, setCurrentSub] = useState<CurrentSubBanner | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanSlug | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/marketing-shield/v1/billing/plans", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.fx_rate) {
            setFxRate(data.fx_rate);
          }
        }
      } catch (err) {
        console.error("Failed to load plans", err);
      }
    }
    fetchPlans();
  }, []);

  useEffect(() => {
    if (!authLoaded || !isSignedIn || !orgId) return;
    async function fetchCurrentSubscription() {
      try {
        const res = await fetch("/api/marketing-shield/v1/billing/entitlements", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.subscription) {
            setCurrentSub({
              planSlug: json.subscription.plan?.slug || "evaluation",
              planName: json.subscription.plan?.name || "Evaluation Pilot",
              status: json.subscription.status || "trialing",
              isTrial: Boolean(json.subscription.isTrial),
              isTrialExpired: Boolean(json.subscription.isTrialExpired),
              trialDaysRemaining: json.subscription.trialDaysRemaining ?? 0,
              trialHoursRemaining: json.subscription.trialHoursRemaining ?? 0,
            });
          }
        }
      } catch {
        // Non-blocking
      }
    }
    fetchCurrentSubscription();
  }, [authLoaded, isSignedIn, orgId]);

  const handleCheckout = async (slug: PlanSlug) => {
    if (slug === "evaluation") {
      if (authLoaded && !isSignedIn) {
        window.location.href = "/sign-up";
        return;
      }
      window.location.href = isSignedIn && orgId ? "/chat" : "/onboarding";
      return;
    }

    if (authLoaded && !isSignedIn) {
      window.location.href = "/sign-in?redirect_url=/pricing";
      return;
    }

    if (authLoaded && isSignedIn && !orgId) {
      window.location.href = "/onboarding";
      return;
    }

    setCheckoutLoading(slug);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/marketing-shield/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: slug,
          billingInterval,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.authorization_url) {
        throw new Error(data.error || "Unable to initiate Paystack checkout");
      }

      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout error";
      setCheckoutError(msg);
      setCheckoutLoading(null);
    }
  };

  const formatNaira = (kobo: number) => {
    const naira = kobo / 100;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(naira);
  };

  const isCurrentActivePaid = (slug: PlanSlug) =>
    currentSub !== null &&
    !currentSub.isTrial &&
    currentSub.status === "active" &&
    currentSub.planSlug === slug;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950 flex flex-col">
      <MarketingHeader />

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950">
            Plans for Compliance Teams
          </h1>
          <p className="max-w-xl mx-auto text-sm text-zinc-600 mt-2.5">
            Pre-publication marketing reviews and evidence dossiers across CBN, FCCPC, ARCON, NDPC, and SEC requirements.
          </p>

          {currentSub && (
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 text-white text-xs">
              <span className="font-medium">
                Current workspace plan: {currentSub.planName}
              </span>
              <span className="text-zinc-300">·</span>
              <span
                className={
                  currentSub.isTrialExpired
                    ? "text-rose-300 font-semibold"
                    : "text-emerald-300"
                }
              >
                {currentSub.isTrial
                  ? currentSub.isTrialExpired ||
                    currentSub.trialHoursRemaining <= 0
                    ? "7-day trial expired"
                    : `${Math.floor(currentSub.trialHoursRemaining / 24)}d ${currentSub.trialHoursRemaining % 24}h left`
                  : "Active"}
              </span>
            </div>
          )}

          {/* Live FX Rate Indicator */}
          <div className="mt-4 flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-xs text-zinc-600 font-mono">
              <Globe className="h-3.5 w-3.5 text-zinc-500" />
              <span>Settled via Paystack at ₦{fxRate.toLocaleString()}/$1</span>
            </div>
          </div>

          {/* Interval Selector Toggle */}
          <div className="mt-7 flex items-center justify-center gap-3">
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
                setBillingInterval((prev) =>
                  prev === "monthly" ? "annual" : "monthly"
                )
              }
              className="w-11 h-6 rounded-full bg-zinc-900 p-0.5 transition-colors relative cursor-pointer"
              aria-label="Toggle Billing Interval"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  billingInterval === "annual" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
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
            <div className="mt-4 max-w-md mx-auto p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {checkoutError}
            </div>
          )}
        </div>

        {/* Plan Cards Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Evaluation */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Pilot
              </div>
              <h3 className="text-lg font-semibold text-zinc-950">Evaluation</h3>
              <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">
                Initial testing and sample campaign reviews.
              </p>

              <div className="mt-5 mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-zinc-950 tabular-nums">
                    $0
                  </span>
                  <span className="text-xs text-zinc-400">/ 7 days</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  ₦0 • No card required
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>3 Campaign Reviews</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>2 Seats</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>10 Compliant Rewrites</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>1 Product Schedule</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="w-3.5 text-center font-medium">–</span>
                  <span>Watermarked PDF preview</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="w-3.5 text-center font-medium">–</span>
                  <span>URL drift monitoring</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => handleCheckout("evaluation")}
                disabled={currentSub?.planSlug === "evaluation" && currentSub.isTrial}
                className="w-full py-2.5 rounded-md border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer"
              >
                {currentSub?.planSlug === "evaluation"
                  ? currentSub.isTrialExpired
                    ? "7-Day Trial Expired"
                    : "Active 7-Day Trial"
                  : "Start 7-Day Evaluation"}
              </button>
            </div>
          </div>

          {/* 2. Growth */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Starter
              </div>
              <h3 className="text-lg font-semibold text-zinc-950">Growth</h3>
              <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">
                For seed fintechs, digital lenders, and emerging MFBs.
              </p>

              <div className="mt-5 mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-zinc-950 tabular-nums">
                    ${billingInterval === "annual" ? "119" : "149"}
                  </span>
                  <span className="text-xs text-zinc-400">/ month</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {billingInterval === "annual"
                    ? `${formatNaira(Math.round(1428 * fxRate * 100))}/yr billed ($1,428/yr)`
                    : `${formatNaira(Math.round(149 * fxRate * 100))}/mo`}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-zinc-800 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>25 Reviews / month</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>3 Seats (Role Permissions)</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Rewrites</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>5 Product Schedules</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-800 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Unwatermarked PDF Dossiers</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>90-Day Audit Retention</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => handleCheckout("growth")}
                disabled={checkoutLoading === "growth" || isCurrentActivePaid("growth")}
                className="w-full py-2.5 rounded-md border border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-950 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCurrentActivePaid("growth")
                  ? "Current Plan"
                  : checkoutLoading === "growth"
                    ? "Preparing..."
                    : "Choose Growth"}
              </button>
            </div>
          </div>

          {/* 3. Scale */}
          <div className="bg-white rounded-xl border-2 border-zinc-950 p-6 flex flex-col justify-between relative">
            <div className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded bg-zinc-950 text-white text-[10px] font-semibold uppercase tracking-wider">
              Recommended
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Pro
              </div>
              <h3 className="text-lg font-semibold text-zinc-950">Scale</h3>
              <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">
                For Series A/B fintechs, MMOs, and commercial institutions.
              </p>

              <div className="mt-5 mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-zinc-950 tabular-nums">
                    ${billingInterval === "annual" ? "359" : "449"}
                  </span>
                  <span className="text-xs text-zinc-400">/ month</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {billingInterval === "annual"
                    ? `${formatNaira(Math.round(4308 * fxRate * 100))}/yr billed ($4,308/yr)`
                    : `${formatNaira(Math.round(449 * fxRate * 100))}/mo`}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-zinc-950 font-semibold">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Campaign Reviews</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>10 Seats</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-900 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>15 Live URL Drift Monitors</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>CCO Sign-Off Workflow</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Signed PDF Dossiers</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>2-Year Record Retention</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => handleCheckout("scale")}
                disabled={checkoutLoading === "scale" || isCurrentActivePaid("scale")}
                className="w-full py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCurrentActivePaid("scale") ? (
                  "Current Plan"
                ) : (
                  <>
                    <span>
                      {checkoutLoading === "scale" ? "Redirecting..." : "Choose Scale"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4. Enterprise */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Custom
              </div>
              <h3 className="text-lg font-semibold text-zinc-950">Enterprise</h3>
              <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">
                For Tier-1 commercial banks and holding groups.
              </p>

              <div className="mt-5 mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-zinc-950 tabular-nums">
                    ${billingInterval === "annual" ? "1,199" : "1,499"}
                  </span>
                  <span className="text-xs text-zinc-400">/ month</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {billingInterval === "annual"
                    ? `${formatNaira(Math.round(14388 * fxRate * 100))}/yr billed ($14,388/yr)`
                    : `${formatNaira(Math.round(1499 * fxRate * 100))}/mo`}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-zinc-800 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Seats &amp; Reviews</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-800 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Drift Monitors</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Custom Policy Libraries</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Custom Branded PDF Dossiers</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>7-Year BOFIA Retention</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Dedicated Account Support</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => handleCheckout("enterprise")}
                disabled={
                  checkoutLoading === "enterprise" || isCurrentActivePaid("enterprise")
                }
                className="w-full py-2.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCurrentActivePaid("enterprise")
                  ? "Current Plan"
                  : checkoutLoading === "enterprise"
                    ? "Preparing..."
                    : "Choose Enterprise"}
              </button>
            </div>
          </div>
        </div>

        {/* Paystack Settlement & Channel Note */}
        <div className="max-w-4xl mx-auto mt-8 bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-3 text-xs text-zinc-600">
          <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-zinc-900">Paystack Checkout Channels:</span>{" "}
            Supports Card, Bank, Transfer, USSD, OPay, and Zap. If{" "}
            <strong>Pay with Transfer</strong> displays &ldquo;Unable to process transaction&rdquo; in test/sandbox mode or for higher Naira tiers, select <strong>Card</strong> or <strong>Bank</strong> inside the Paystack checkout window.
          </div>
        </div>

        {/* Regulatory Cost Reference Table */}
        <div className="max-w-4xl mx-auto mt-10 bg-white rounded-xl border border-zinc-200 p-7">
          <h3 className="text-base font-semibold text-zinc-950 mb-1">
            Regulatory Exposure Reference
          </h3>
          <p className="text-xs text-zinc-500 mb-5">
            Standard statutory penalties and external review costs compared with pre-publication review.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-medium">
                  <th className="py-2.5 pr-4">Area</th>
                  <th className="py-2.5 pr-4">Typical Exposure / Cost</th>
                  <th className="py-2.5">With Cogent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-950">
                    ARCON Unvetted Ad Penalty
                  </td>
                  <td className="py-3 pr-4 text-rose-700 font-mono">
                    ₦1,000,000 – ₦3,000,000 per ad
                  </td>
                  <td className="py-3 text-emerald-700 font-medium">
                    Pre-checked with ARCON ASP citations
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-950">
                    FCCPC Deceptive Claim Fine
                  </td>
                  <td className="py-3 pr-4 text-rose-700 font-mono">
                    Up to ₦100,000,000 or 1% turnover
                  </td>
                  <td className="py-3 text-emerald-700 font-medium">
                    Rate, fee, and disclosure verification
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-950">
                    External Legal Retainer
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 font-mono">
                    ₦1,500,000 – ₦5,000,000 / mo (5–10 days)
                  </td>
                  <td className="py-3 text-emerald-700 font-medium">
                    From $149/mo with immediate feedback
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Plan Feature Matrix */}
        <div className="max-w-5xl mx-auto mt-10 bg-white rounded-xl border border-zinc-200 p-7">
          <h3 className="text-base font-semibold text-zinc-950 mb-1">
            Full Plan Entitlements Matrix
          </h3>
          <p className="text-xs text-zinc-500 mb-5">
            Transparent quotas across seats, audit volume, live URL drift monitors, and dossier retention.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-medium">
                  <th className="py-2.5 pr-4">Capability</th>
                  <th className="py-2.5 px-3">Evaluation</th>
                  <th className="py-2.5 px-3">Growth</th>
                  <th className="py-2.5 px-3 text-zinc-950 font-semibold">Scale</th>
                  <th className="py-2.5 pl-3">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {PLAN_MATRIX_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 pr-4 font-medium text-zinc-950">
                      {row.feature}
                    </td>
                    <td className="py-3 px-3 text-zinc-600">{row.evaluation}</td>
                    <td className="py-3 px-3 text-zinc-700">{row.growth}</td>
                    <td className="py-3 px-3 font-semibold text-zinc-950">
                      {row.scale}
                    </td>
                    <td className="py-3 pl-3 text-zinc-700">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing & Paystack FAQ */}
        <div className="max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h4 className="text-xs font-semibold text-zinc-950">
              How does USD display &amp; Paystack Naira settlement work?
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Plans are benchmarked in USD and converted at checkout using the live Paystack NGN FX rate (₦{fxRate.toLocaleString()}/$1) so Nigerian institutions settle seamlessly via local Naira cards or bank transfer.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h4 className="text-xs font-semibold text-zinc-950">
              Can we invite Legal &amp; Marketing seats during the pilot?
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Yes. The 7-day Evaluation includes 2 seats so Marketing and Compliance Counsel can test dual-control submissions together before upgrading.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h4 className="text-xs font-semibold text-zinc-950">
              Do we lose historical dossiers if we upgrade or switch intervals?
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              No. Existing SHA-256 dossiers, campaign revisions, and audit records stay preserved in your isolated tenant vault across upgrades.
            </p>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
