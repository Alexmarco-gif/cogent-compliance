"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function BillingSettingsContent() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const checkoutRef = searchParams.get("ref");

  const [subData, setSubData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
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
  }, []);

  const plan = subData?.plan;
  const isTrial = subData?.isTrial ?? true;
  const trialDays = subData?.trialDaysRemaining ?? 7;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/chat" className="hover:text-neutral-800">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-[#0B0F1A] font-semibold">Settings & Billing</span>
          </div>

          <Link
            href="/pricing"
            className="px-4 py-2 rounded-xl bg-[#2A4BFF] hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>Upgrade / Change Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Checkout Success Notification */}
        {checkoutStatus === "success" && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Payment Verified via Paystack!</span> Your subscription
              has been successfully updated. Reference:{" "}
              <span className="font-mono">{checkoutRef || "CONFIRMED"}</span>.
            </div>
          </div>
        )}

        {/* Main Plan Overview Card */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
            <div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Current Subscription Tier
              </div>
              <h2 className="text-2xl font-bold text-[#0B0F1A] mt-1 flex items-center gap-2">
                {plan?.name || "Evaluation Pilot"}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    subData?.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-[#2A4BFF]"
                  }`}
                >
                  {subData?.status || "trialing"}
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {isTrial
                  ? `Active 7-Day Pilot evaluation. ${trialDays} days remaining.`
                  : "Fully active enterprise subscription."}
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-extrabold text-[#0B0F1A]">
                ${plan ? (plan.price_usd_cents / 100).toFixed(0) : "0"}
                <span className="text-xs text-neutral-400 font-normal"> / month</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Settled in NGN Kobo via Paystack
              </div>
            </div>
          </div>

          {/* Trial Expiry Alert if on Pilot */}
          {isTrial && (
            <div className="mt-4 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#2A4BFF] flex-shrink-0" />
                <span>
                  Trial expires in <strong>{trialDays} days</strong>. Upgrade to Scale to unlock
                  unlimited audits and CCO approval locks.
                </span>
              </div>
              <Link
                href="/pricing"
                className="whitespace-nowrap font-bold text-[#2A4BFF] hover:underline"
              >
                Upgrade Now →
              </Link>
            </div>
          )}

          {/* Entitlements & Usage Limits */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Audit Limit */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2">
                <span>Monthly Audits</span>
                <Layers className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="text-xl font-bold text-[#0B0F1A]">
                {plan?.monthly_audit_limit === -1 ? (
                  "Unlimited"
                ) : (
                  <span>
                    3 <span className="text-xs text-neutral-400 font-normal">total</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                {plan?.monthly_audit_limit === -1
                  ? "Unlimited scans per month"
                  : "Upgrade for 25/mo or Unlimited"}
              </p>
            </div>

            {/* URL Drift Monitors */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2">
                <span>URL Drift Monitors</span>
                <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="text-xl font-bold text-[#0B0F1A]">
                {plan?.url_drift_monitor_limit === -1
                  ? "Unlimited"
                  : plan?.url_drift_monitor_limit === 0
                    ? "0 Live URLs"
                    : `${plan?.url_drift_monitor_limit} Live URLs`}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                {plan?.url_drift_monitor_limit === 0
                  ? "Gated to Scale & Enterprise"
                  : "Active post-publication monitors"}
              </p>
            </div>

            {/* Export Watermark */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2">
                <span>PDF Dossier Export</span>
                <FileText className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="text-sm font-bold text-[#0B0F1A]">
                {plan?.features.export_unwatermarked ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Unwatermarked
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Watermarked Pilot
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                {plan?.features.export_unwatermarked
                  ? "Ready for official regulatory filing"
                  : "Stamps evaluation watermark"}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Gating Matrix Card */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0B0F1A] mb-1">
            Active Feature Entitlements
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            Contextual permissions currently enforced across your workspace.
          </p>

          <div className="divide-y divide-neutral-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-800">
                  Compliance Audit Execution (run_audit)
                </span>
                <p className="text-neutral-500 text-[11px]">
                  Hybrid vector search & multi-agent regulatory reasoning
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                ACTIVE
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-800">
                  Unwatermarked Dossiers (export_unwatermarked)
                </span>
                <p className="text-neutral-500 text-[11px]">
                  Clean statutory compliance audit records without evaluation stamp
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold ${
                  plan?.features.export_unwatermarked
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {plan?.features.export_unwatermarked ? "ENABLED" : "LOCKED"}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-800">
                  CCO Separation-of-Duties Locks (cco_approval_lock)
                </span>
                <p className="text-neutral-500 text-[11px]">
                  Dual-authorization gate requiring CCO approval before deployment
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold ${
                  plan?.features.cco_approval_lock
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {plan?.features.cco_approval_lock ? "ENABLED" : "LOCKED (Scale+)"}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-800">
                  Post-Publication Drift Monitors (url_drift_monitoring)
                </span>
                <p className="text-neutral-500 text-[11px]">
                  Continuous synthetic URL re-verification against modified landing pages
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold ${
                  plan?.features.url_drift_monitoring
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {plan?.features.url_drift_monitoring ? "ENABLED" : "LOCKED (Scale+)"}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods & Invoicing */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0B0F1A]">Payment Methods & Settlement</h3>
              <p className="text-xs text-neutral-500">
                Powered by Paystack API v1 with automatic Naira (NGN) and USD card settlement.
              </p>
            </div>
            <div className="h-8 w-12 rounded bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-700 font-mono">
              CARD
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-neutral-400" />
              <div>
                <div className="font-semibold text-neutral-800">Primary Merchant Gateway</div>
                <div className="text-neutral-500 text-[11px]">
                  Paystack Recurring Subscription Engine (Dual-Currency NGN/USD)
                </div>
              </div>
            </div>
            <Link
              href="/pricing"
              className="text-xs font-semibold text-[#2A4BFF] hover:underline"
            >
              Update Payment Method →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-sm font-medium text-neutral-500">
          Loading Billing Settings...
        </div>
      }
    >
      <BillingSettingsContent />
    </Suspense>
  );
}
