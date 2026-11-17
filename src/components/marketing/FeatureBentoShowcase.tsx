"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Globe,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function FeatureBentoShowcase() {
  return (
    <section id="features" className="bg-white py-20 lg:py-28 scroll-mt-20">
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            badge="BUILT FOR LAUNCH DAY"
            titleLeading="Everything your team checks"
            titleAccent="in one calm workspace"
            description="Every feature is shown as the real review card your marketing and compliance teams use together before hitting publish."
          />
        </RevealOnScroll>

        {/* Outer Ice-Blue Glass Tray matching reference 4befad */}
        <RevealOnScroll delayMs={100}>
          <div className="mt-12 rounded-[28px] cogent-glass-tray p-4 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Card 1 (Wide Top Left): Flyer & Ad Pre-Check with Live Scan Beam */}
              <div className="lg:col-span-7 rounded-2xl cogent-glass-card p-6 sm:p-7 flex flex-col justify-between overflow-hidden group hover:border-blue-300/70 transition-all duration-300">
                {/* Visual Stage */}
                <div className="relative h-[195px] rounded-xl border border-slate-100 bg-gradient-to-br from-[#F8FAFF] to-[#EEF4FF] p-4 overflow-hidden flex items-center justify-center">
                  {/* Subtle animated blue scan line */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-transparent via-[#1D63ED]/15 to-transparent animate-cogent-scan"
                  />

                  <div className="relative z-10 w-full max-w-[420px] space-y-2.5">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-transform duration-500 group-hover:-translate-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-900">
                          Instagram Loan Flyer.png
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                          <AlertTriangle className="h-3 w-3" />
                          Risky claim
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-slate-500">
                        &ldquo;Instant cash in 3 mins ·{" "}
                        <span className="rounded bg-rose-100/80 px-1 font-medium text-rose-800 line-through">
                          0% hidden charges
                        </span>
                        &rdquo;
                      </p>
                    </div>

                    <div className="ml-6 rounded-xl border border-emerald-200 bg-white p-3 shadow-md shadow-emerald-950/5 transition-transform duration-500 group-hover:translate-x-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <Sparkles className="h-3 w-3" />
                          Suggested compliant copy
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <p className="mt-1 text-[11.5px] text-slate-700">
                        &ldquo;4.5%/mo + 1.5% setup fee · Subject to credit check. Terms apply.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-[19px] font-semibold text-slate-950">
                    Catch risky claims &amp; write clean fixes fast
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                    Drop in any flyer, banner, or social caption. Cogent spots banned guarantees, missing disclaimers, or tiny fine print—and drafts a safe alternative on the spot.
                  </p>
                </div>
              </div>

              {/* Card 2 (Top Right): Approved Rate Card Matcher */}
              <div className="lg:col-span-5 rounded-2xl cogent-glass-card p-6 sm:p-7 flex flex-col justify-between overflow-hidden group hover:border-blue-300/70 transition-all duration-300">
                <div className="relative h-[195px] rounded-xl border border-slate-100 bg-gradient-to-br from-[#F8FAFF] to-[#F3F0FF] p-4 flex flex-col items-center justify-center gap-2.5 overflow-hidden">
                  <div className="w-full max-w-[290px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm animate-cogent-float">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Your Approved Rate Card</span>
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-[#1D63ED]">
                        Verified
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950 tabular-nums">
                      4.5%/mo + 1.5% fee · 65–180 days
                    </p>
                  </div>

                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1D63ED] text-white shadow-sm">
                    <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                  </div>

                  <div className="w-full max-w-[290px] rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-slate-900">Ad Numbers Match</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accurate
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-[19px] font-semibold text-slate-950">
                    Never publish the wrong rate or fee
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                    Ads are compared directly against your real product numbers so hidden fee phrasing or short repayment promises never slip out.
                  </p>
                </div>
              </div>

              {/* Card 3 (Bottom Left): Dual-Control Sign-Off Trail */}
              <div className="lg:col-span-5 rounded-2xl cogent-glass-card p-6 sm:p-7 flex flex-col justify-between overflow-hidden group hover:border-blue-300/70 transition-all duration-300">
                <div className="relative h-[185px] rounded-xl border border-slate-100 bg-gradient-to-br from-[#F8FAFF] to-[#EEF4FF] p-4 flex flex-col items-center justify-center overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 shadow-sm">
                        MK
                      </div>
                      <span className="mt-1.5 text-[10.5px] font-medium text-slate-500">
                        Marketing
                      </span>
                    </div>

                    <div className="h-0.5 w-6 sm:w-8 bg-blue-200 relative">
                      <span className="absolute -top-1 right-0 h-2.5 w-2.5 rounded-full bg-[#1D63ED] animate-pulse" />
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-[12px] font-bold text-[#1D63ED] shadow-sm animate-cogent-float-slow">
                        LC
                      </div>
                      <span className="mt-1.5 text-[10.5px] font-medium text-slate-500">
                        Legal
                      </span>
                    </div>

                    <div className="h-0.5 w-6 sm:w-8 bg-emerald-300" />

                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1D63ED] text-white shadow-lg shadow-blue-600/25">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="mt-1.5 text-[10.5px] font-semibold text-[#1D63ED]">
                        CCO Approved
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs">
                    Final approval locked to Compliance · Saved for audit
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-[19px] font-semibold text-slate-950">
                    Clear sign-off between teams
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                    Marketing prepares campaigns quickly while Legal or Compliance holds final sign-off—keeping a permanent record for regulators.
                  </p>
                </div>
              </div>

              {/* Card 4 (Wide Bottom Right): Always-On Page Watcher */}
              <div className="lg:col-span-7 rounded-2xl cogent-glass-card p-6 sm:p-7 flex flex-col justify-between overflow-hidden group hover:border-blue-300/70 transition-all duration-300">
                <div className="relative h-[185px] rounded-xl border border-slate-100 bg-gradient-to-br from-[#F8FAFF] to-[#EEF4FF] p-4 flex flex-col items-center justify-center gap-2.5 overflow-hidden">
                  <div className="w-full max-w-[430px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1D63ED]">
                        <Globe className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-slate-900">
                          yourbank.ng/personal-loans
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Checked automatically · Matches approved copy
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live OK
                    </span>
                  </div>

                  <div className="w-full max-w-[430px] rounded-xl border border-amber-200/90 bg-white/95 px-4 py-2.5 shadow-sm flex items-center justify-between gap-3 transition-transform duration-300 group-hover:translate-x-1">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-900">
                        yourbank.ng/fixed-deposit
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Alert: Terms link changed after last website deploy
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10.5px] font-semibold text-amber-700">
                      Notified
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-[19px] font-semibold text-slate-950">
                    Know immediately if a live page changes
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                    Once approved campaigns go live, Cogent watches your published pages and alerts your team right away if rates or legal disclosures ever drop off.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
