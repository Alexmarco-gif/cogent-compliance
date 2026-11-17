import React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PLAN_STEPS } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function ThreeStepPlan() {
  return (
    <section
      id="how-it-works"
      className="border-b border-slate-200 bg-[#FAFBFD] py-20 lg:py-24 scroll-mt-16"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            eyebrow="HOW IT WORKS"
            titleLeading="Three clear steps from regulatory question"
            titleAccent="to export-ready work product."
            description="Upload your internal policies and rate sheets once. Every research request, policy update, and launch check runs inside the same organization-isolated workspace."
          />
        </RevealOnScroll>

        <RevealOnScroll delayMs={80}>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 rounded-xl border border-slate-200 bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden shadow-xs">
            {PLAN_STEPS.map((item) => (
              <div
                key={item.step}
                className="p-6 sm:p-8 flex flex-col justify-between bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-mono text-[12px] font-semibold tracking-wider text-[#1D4ED8]">
                      STEP {item.step}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  </div>

                  <h3 className="mt-5 text-[19px] font-semibold leading-snug text-[#0B1220]">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 font-mono text-[11px] font-medium text-emerald-800">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <span>{item.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        <RevealOnScroll delayMs={140}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1D4ED8] px-6 text-[13.5px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/solutions"
              className="inline-flex h-11 items-center rounded-md border border-slate-200 bg-white px-5 text-[13.5px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              See Solutions by License
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
