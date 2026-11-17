import React from "react";
import Link from "next/link";
import { ArrowRight, UploadCloud, Search, FileCheck, Check } from "lucide-react";
import { PLAN_STEPS } from "@/data/marketing-scenarios";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

const STEP_ICONS = [UploadCloud, Search, FileCheck];

export function ThreeStepPlan() {
  return (
    <section
      id="how-it-works"
      className="border-t border-slate-200 bg-white py-20 lg:py-24 scroll-mt-16"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Two-tone Centered Header matching hg.JPG style */}
        <RevealOnScroll>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[30px] sm:text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#0B1220]">
              Three clear steps.{" "}
              <span className="font-normal text-slate-500 block sm:inline">
                From regulatory question to export-ready work product.
              </span>
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] leading-[1.6] text-slate-600">
              Upload your internal policies and rate sheets once. Every research request, policy update, and launch check runs inside the same organization-isolated workspace.
            </p>
          </div>
        </RevealOnScroll>

        {/* 3 Modular Cards matching hg.JPG grid style */}
        <RevealOnScroll delayMs={80}>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLAN_STEPS.map((item, idx) => {
              const Icon = STEP_ICONS[idx] ?? UploadCloud;
              return (
                <div
                  key={item.step}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-[#FAFBFD] p-7 sm:p-8 shadow-xs hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0B1220] shadow-2xs">
                        <Icon className="h-5 w-5 text-slate-800" strokeWidth={1.75} />
                      </div>
                      <span className="font-mono text-[12px] font-bold tracking-wider text-[#1D4ED8]">
                        STEP {item.step}
                      </span>
                    </div>

                    <h3 className="mt-6 text-[18px] font-semibold leading-snug text-[#0B1220]">
                      {item.title}
                    </h3>

                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 border-t border-slate-200/60 pt-4 font-mono text-[11px] font-medium text-emerald-800">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                    <span>{item.outcome}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>

        <RevealOnScroll delayMs={140}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
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
