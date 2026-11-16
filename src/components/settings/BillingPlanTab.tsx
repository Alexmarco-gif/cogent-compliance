"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

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
  trialDaysRemaining: number;
}

export function BillingPlanTab() {
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const checkoutRef = searchParams.get("ref");

  const [subData, setSubData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId) return;
    async function loadBilling() {
      try {
        const res = await fetch("/api/marketing-shield/v1/billing/entitlements");
        if (res.ok) {
          const json = await res.json();
          setSubData(json.subscription);
        }
      } catch (err) {
        console.error("Failed to fetch billing state", err);
      }
    }
    loadBilling();
  }, [clerkLoaded, isSignedIn, orgId]);

  const plan = subData?.plan;
  const isTrial = subData?.isTrial ?? true;
  const trialDays = subData?.trialDaysRemaining ?? 7;

  return (
    <div className="space-y-6">
      {checkoutStatus === "success" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Payment confirmed via Paystack.</span> Your subscription has been updated. Reference:{" "}
            <span className="font-mono">{checkoutRef || "CONFIRMED"}</span>.
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
              {plan?.name || "Evaluation"}
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide border ${
                  subData?.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                {subData?.status || "trialing"}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {isTrial
                ? `7-day evaluation active. ${trialDays} days remaining.`
                : "Active subscription."}
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
              <span>Change Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {isTrial && (
          <div className="mt-4 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
              <span>
                Evaluation ends in <strong>{trialDays} days</strong>. Upgrade to unlock unlimited reviews and unwatermarked PDF dossiers.
              </span>
            </div>
            <Link
              href="/pricing"
              className="whitespace-nowrap font-semibold text-zinc-950 hover:underline"
            >
              View plans →
            </Link>
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
    </div>
  );
}
