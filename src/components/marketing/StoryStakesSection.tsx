import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert, Clock3, ShieldCheck } from "lucide-react";
import { STORY_STAKES, REGULATOR_METRICS } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function StoryStakesSection() {
  const icons = [ShieldAlert, Clock3, ShieldCheck];

  return (
    <section className="border-y border-slate-200/75 bg-[#FAFBFD] py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            badge="WHY TEAMS SWITCH"
            titleLeading="Great financial products stall"
            titleAccent="when compliance slows you down"
            description="Launching without clear checks puts your license at risk—while waiting weeks for manual email reviews stalls growth."
          />
        </RevealOnScroll>

        {/* The 3 StoryBrand Problems: External, Internal, Philosophical */}
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STORY_STAKES.map((item, idx) => {
            const Icon = icons[idx] ?? ShieldCheck;
            const isBelieve = idx === 2;
            return (
              <RevealOnScroll key={item.title} delayMs={idx * 90}>
                <div
                  className={`h-full rounded-2xl border p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 ${
                    isBelieve
                      ? "border-blue-200 bg-gradient-to-br from-white to-blue-50/60 shadow-md shadow-blue-600/5"
                      : "border-slate-200/90 bg-white shadow-xs"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isBelieve
                        ? "bg-[#1D63ED] text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                  </div>
                  <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#1D63ED]">
                    {item.level}
                  </p>
                  <h3 className="mt-2 text-[19px] font-semibold leading-snug text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600">
                    {item.detail}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Guide Authority Strip (CBN, FCCPC, ARCON, NDPC, SEC + Stem Systems Bridge) */}
        <RevealOnScroll delayMs={150}>
          <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">
                Built as your trusted guide across Nigerian financial rules
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REGULATOR_METRICS.map((reg) => (
                  <div
                    key={reg.acronym}
                    title={reg.focus}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2"
                  >
                    <span className="text-[12px] font-bold text-[#1D63ED]">
                      {reg.acronym}
                    </span>
                    <span className="text-[12px] text-slate-600 hidden sm:inline">
                      {reg.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/company"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D63ED] hover:underline shrink-0"
            >
              <span>Meet Stem Systems &amp; Founders</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
