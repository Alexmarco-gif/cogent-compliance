import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function ExecutiveCtaBanner() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-[28px] cogent-hero-wash border border-blue-200/70 cogent-browser-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-center">
              {/* Left StoryBrand Final Call to Action */}
              <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14">
                <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                  START TODAY
                </span>
                <h2 className="mt-4 text-[30px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] text-slate-950">
                  Launch every campaign{" "}
                  <span className="text-[#1D63ED]">with total confidence.</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600">
                  Stop guessing before every campaign goes live. Create your workspace in minutes and run your first flyer, ad, or webpage review free.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1D63ED] px-6 text-[14px] font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-[#1552CC] transition-colors"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/company"
                    className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    About Stem Systems
                  </Link>
                </div>
              </div>

              {/* Right Cropped Live Workspace Preview Card matching Reference 79ff85 Panel 06 */}
              <div className="lg:col-span-6 px-6 pb-6 pt-2 lg:py-10 lg:pr-10">
                <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-blue-900/10">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[12.5px] font-semibold text-slate-950">
                        Campaign Approval Queue
                      </span>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#1D63ED]">
                      3 Active
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-950">
                          SME Working Capital Promo
                        </p>
                        <p className="text-[11.5px] text-slate-500">
                          Rates, fee note &amp; CBN line verified
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Cleared
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-950">
                          Salary Advance Flyer
                        </p>
                        <p className="text-[11.5px] text-slate-500">
                          Clean rewrite ready for CCO approval
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#1D63ED]">
                        In Review
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-950">
                          Live Pricing Page Watcher
                        </p>
                        <p className="text-[11.5px] text-slate-500">
                          Checked daily · Zero unexpected edits
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        Protected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
