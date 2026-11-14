"use client";

import React, { useState, useEffect } from "react";
import {
  BillingInterval,
  PlanSlug,
} from "@/contracts/billing.contracts";
import {
  ShieldCheck,
  Check,
  ArrowRight,
  Globe,
} from "lucide-react";

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [fxRate, setFxRate] = useState<number>(1550.0);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanSlug | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/marketing-shield/v1/billing/plans");
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

  const handleCheckout = async (slug: PlanSlug) => {
    if (slug === "evaluation") {
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

      // Redirect to Paystack secure checkout
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

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="w-full max-w-6xl text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2A4BFF] text-xs font-semibold mb-4">
          <ShieldCheck className="h-4 w-4" />
          <span>Value-Based Nigerian Regulatory Protection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B0F1A]">
          Predictable Pricing Anchor Against ₦100M+ Fines
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 mt-3">
          Deploy autonomous compliance safeguarding. 10x cheaper than an external legal retainer,
          instant turnaround, and 100% statutory coverage across FCCPC, CBN, ARCON, NDPC, and SEC.
        </p>

        {/* Live FX Rate Indicator */}
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-[#E4E4E7] text-xs text-neutral-600 shadow-sm font-mono">
          <Globe className="h-3.5 w-3.5 text-[#2A4BFF]" />
          <span>Dual-Currency Engine: USD Display • Settled via Paystack at ₦{fxRate.toLocaleString()}/$1</span>
        </div>

        {/* Interval Selector Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={`text-xs font-semibold ${
              billingInterval === "monthly" ? "text-[#0B0F1A]" : "text-neutral-400"
            }`}
          >
            Monthly Billing
          </span>
          <button
            onClick={() =>
              setBillingInterval((prev) => (prev === "monthly" ? "annual" : "monthly"))
            }
            className="w-12 h-6 rounded-full bg-[#0B0F1A] p-0.5 transition-colors relative"
            aria-label="Toggle Billing Interval"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                billingInterval === "annual" ? "translate-x-6 bg-[#2A4BFF]" : "translate-x-0"
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-semibold ${
                billingInterval === "annual" ? "text-[#0B0F1A]" : "text-neutral-400"
              }`}
            >
              Annual Billing
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              SAVE 20%
            </span>
          </div>
        </div>

        {checkoutError && (
          <div className="mt-4 max-w-md mx-auto p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {checkoutError}
          </div>
        )}
      </div>

      {/* Plan Cards Matrix */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Evaluation Pilot */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Pilot
            </div>
            <h3 className="text-xl font-bold text-[#0B0F1A]">Evaluation Pilot</h3>
            <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
              Instant sandbox evaluation for early testing and exploratory audits.
            </p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-[#0B0F1A]">$0</span>
                <span className="text-xs text-neutral-400">/ 7 days</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                ₦0 • Zero credit card required
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>3 Total Campaign Audits</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>2 Team Seats (Mktg + CCO)</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>10 Compliant Rewrites</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>1 Flagship Rate Card</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="w-4 text-center font-bold">✕</span>
                <span className="line-through">Watermarked PDF Only</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="w-4 text-center font-bold">✕</span>
                <span className="line-through">URL Drift Monitoring</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout("evaluation")}
              className="w-full py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-all"
            >
              Start 7-Day Pilot →
            </button>
          </div>
        </div>

        {/* 2. Growth (Starter) */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Starter
            </div>
            <h3 className="text-xl font-bold text-[#0B0F1A]">Growth</h3>
            <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
              Ideal for seed fintechs, digital lenders, and emerging MFBs.
            </p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-[#0B0F1A]">
                  ${billingInterval === "annual" ? "119" : "149"}
                </span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>
              <div className="text-[11px] text-[#2A4BFF] font-mono mt-0.5">
                {billingInterval === "annual"
                  ? `${formatNaira(Math.round(119 * fxRate * 100))}/mo (Billed $1,428/yr)`
                  : `${formatNaira(Math.round(149 * fxRate * 100))}/mo`}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">25 Audits / month</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>3 Seats (RBAC Enabled)</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Unlimited Rewrites</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>5 Rate Cards / Truth Rules</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">Unwatermarked PDF Dossiers</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>90-Day Audit Log Retention</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout("growth")}
              disabled={checkoutLoading === "growth"}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {checkoutLoading === "growth" ? "Preparing..." : "Upgrade to Growth"}
            </button>
          </div>
        </div>

        {/* 3. Scale (Pro — Most Popular) */}
        <div className="bg-white rounded-2xl border-2 border-[#2A4BFF] p-6 flex flex-col justify-between shadow-lg relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#2A4BFF] text-white text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
            MOST POPULAR
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#2A4BFF] mb-1">
              Scale (Pro)
            </div>
            <h3 className="text-xl font-bold text-[#0B0F1A]">Scale</h3>
            <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
              For Series A/B fintechs, MMOs, and commercial banking institutions.
            </p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-[#0B0F1A]">
                  ${billingInterval === "annual" ? "359" : "449"}
                </span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>
              <div className="text-[11px] text-[#2A4BFF] font-mono mt-0.5">
                {billingInterval === "annual"
                  ? `${formatNaira(Math.round(359 * fxRate * 100))}/mo (Billed $4,308/yr)`
                  : `${formatNaira(Math.round(449 * fxRate * 100))}/mo`}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-neutral-900 font-bold">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>UNLIMITED Campaign Audits</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>10 Seats (CCO Lock Enabled)</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-900 font-semibold">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>15 Live URL Drift Monitors</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>CCO Separation-of-Duties Locks</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Signed Cryptographic Dossiers</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>2-Year Retention (FCCPC Mandate)</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout("scale")}
              disabled={checkoutLoading === "scale"}
              className="w-full py-2.5 rounded-xl bg-[#2A4BFF] hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {checkoutLoading === "scale" ? "Redirecting..." : "Upgrade to Scale"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4. Enterprise */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
              Enterprise
            </div>
            <h3 className="text-xl font-bold text-[#0B0F1A]">Enterprise</h3>
            <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
              For Tier-1 commercial banks, conglomerates, and multinational groups.
            </p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-[#0B0F1A]">
                  ${billingInterval === "annual" ? "1,199" : "1,499"}
                </span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>
              <div className="text-[11px] text-[#2A4BFF] font-mono mt-0.5">
                {billingInterval === "annual"
                  ? `${formatNaira(Math.round(1199 * fxRate * 100))}/mo (Billed $14,388/yr)`
                  : `${formatNaira(Math.round(1499 * fxRate * 100))}/mo`}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">Unlimited Seats & Audits</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">Unlimited URL Drift Monitors</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Custom Corpora & Precedents</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Custom Co-Branded PDF Dossiers</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>7-Year Retention (BOFIA Mandate)</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Dedicated Manager (1h SLA)</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout("enterprise")}
              disabled={checkoutLoading === "enterprise"}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {checkoutLoading === "enterprise" ? "Preparing..." : "Contact Enterprise"}
            </button>
          </div>
        </div>
      </div>

      {/* ROI & Fine Comparison Table (Document 11 Section 3) */}
      <div className="w-full max-w-4xl mt-16 bg-white rounded-2xl border border-[#E4E4E7] p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#0B0F1A] mb-1">
          Why Cogent Delivers an Instant 10x ROI
        </h3>
        <p className="text-xs text-neutral-500 mb-6">
          Compare the cost of platform subscription against standard Nigerian regulatory penalties
          and traditional legal advisory.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-400 font-semibold uppercase">
                <th className="py-2.5">Risk / Service Area</th>
                <th className="py-2.5">Traditional Cost / Exposure</th>
                <th className="py-2.5 text-[#2A4BFF]">Cogent Marketing Shield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="py-3 font-semibold text-[#0B0F1A]">
                  ARCON Unvetted Ad Penalty
                </td>
                <td className="py-3 text-red-600 font-mono font-medium">
                  ₦1,000,000 – ₦3,000,000 per post / skit
                </td>
                <td className="py-3 text-emerald-700 font-semibold">
                  Pre-cleared with official ASP citations
                </td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-[#0B0F1A]">
                  FCCPC Deceptive Lending Penalty
                </td>
                <td className="py-3 text-red-600 font-mono font-medium">
                  Up to ₦100,000,000 or 1% of turnover
                </td>
                <td className="py-3 text-emerald-700 font-semibold">
                  100% Truth & APR disclosure verification
                </td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-[#0B0F1A]">
                  External Legal Firm Retainer
                </td>
                <td className="py-3 text-neutral-600 font-mono">
                  ₦1,500,000 – ₦5,000,000 / month (5-10 day turnaround)
                </td>
                <td className="py-3 text-emerald-700 font-semibold">
                  From $149/mo (Instant 3-second audits)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
