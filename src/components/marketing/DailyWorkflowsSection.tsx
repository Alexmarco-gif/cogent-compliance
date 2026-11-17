import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  DAILY_WORKFLOW_LEDGER,
  REGULATOR_METRICS,
} from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function DailyWorkflowsSection() {
  return (
    <section
      id="workflows"
      className="border-y border-slate-200 bg-[#FAFBFD] py-20 lg:py-24 scroll-mt-16"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            eyebrow="THE DAILY BOTTLENECK"
            titleLeading="Why compliance work takes 3 to 10 days—and"
            titleAccent="how Cogent compresses it to minutes."
            description="Financial rules span seven overlapping agencies and hundreds of unindexed PDF circulars. Cogent turns slow manual digging into ready-to-sign deliverables."
          />
        </RevealOnScroll>

        {/* Architectural Hairline Ledger Table (Clean Editorial, Zero Generic Cards) */}
        <RevealOnScroll delayMs={80}>
          <div className="mt-12 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Desktop Column Header */}
            <div className="hidden lg:grid lg:grid-cols-12 border-b border-slate-200 bg-slate-50 px-6 py-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
              <div className="col-span-4">Core Compliance Workflow</div>
              <div className="col-span-4">How It Stalls Today (3–10 Days)</div>
              <div className="col-span-4">Finished Deliverable with Cogent</div>
            </div>

            <div className="divide-y divide-slate-200">
              {DAILY_WORKFLOW_LEDGER.map((row) => (
                <div
                  key={row.number}
                  className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-12 lg:gap-8 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Column 1: Workflow + Audience */}
                  <div className="lg:col-span-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                        {row.number}
                      </span>
                      <span className="font-mono text-[10.5px] text-slate-400">
                        · {row.audience}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[16.5px] font-semibold leading-snug text-[#0B1220]">
                      {row.workflow}
                    </h3>
                    <span className="mt-2.5 inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
                      {row.cogentSpeed}
                    </span>
                  </div>

                  {/* Column 2: Today Pain */}
                  <div className="lg:col-span-4">
                    <p className="lg:hidden font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Today (3–10 Days)
                    </p>
                    <p className="text-[13.5px] leading-relaxed text-slate-600">
                      {row.todayPain}
                    </p>
                  </div>

                  {/* Column 3: Finished Output */}
                  <div className="lg:col-span-4">
                    <p className="lg:hidden font-mono text-[10px] uppercase tracking-wider text-[#1D4ED8] mb-1">
                      With Cogent
                    </p>
                    <p className="text-[13.5px] leading-relaxed font-medium text-[#0B1220]">
                      {row.outputProduced}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Overlapping Agencies Bar */}
        <RevealOnScroll delayMs={120}>
          <div className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-slate-400">
                Unified Statutory Scope Across Nigeria &amp; Pan-African Regulators
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {REGULATOR_METRICS.map((reg) => (
                  <span
                    key={reg.acronym}
                    title={reg.focus}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-[#0B1220]"
                  >
                    <span className="text-[#1D4ED8]">{reg.acronym}</span>
                    <span className="hidden md:inline font-normal text-slate-500">
                      · {reg.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <Link
              href="/solutions"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D4ED8] hover:underline shrink-0"
            >
              <span>Explore by institution type</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
