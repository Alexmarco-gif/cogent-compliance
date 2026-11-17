import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PLAN_STEPS } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function ThreeStepPlan() {
  return (
    <section
      id="how-it-works"
      className="border-t border-slate-200/75 bg-gradient-to-b from-white to-[#F7FAFF] py-20 lg:py-24 scroll-mt-20"
    >
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            badge="HOW IT WORKS"
            titleLeading="Three calm steps from draft"
            titleAccent="to a ready-to-launch campaign"
            description="No complex training needed. Set up your products once and every marketing check takes seconds."
          />
        </RevealOnScroll>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLAN_STEPS.map((item, index) => (
            <RevealOnScroll key={item.step} delayMs={index * 100}>
              <div className="relative h-full rounded-2xl cogent-glass-card p-6 sm:p-7 flex flex-col justify-between group hover:border-blue-300 transition-all duration-300 hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D63ED] text-[13px] font-bold text-white shadow-sm shadow-blue-600/25">
                      {item.step}
                    </span>
                    {index < PLAN_STEPS.length - 1 && (
                      <ArrowRight
                        className="hidden lg:block h-4 w-4 text-blue-300 group-hover:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <h3 className="mt-6 text-[20px] font-semibold leading-snug text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-[12px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{item.outcome}</span>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delayMs={180}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1D63ED] px-6 text-[14px] font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-[#1552CC] transition-colors"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/solutions"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-6 text-[14px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              See Solutions by License
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
