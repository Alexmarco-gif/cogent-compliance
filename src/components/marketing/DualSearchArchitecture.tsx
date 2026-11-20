import React from "react";
import { Check, Globe, Database, BookOpen } from "lucide-react";
import { DUAL_SEARCH_TRACKS } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function DualSearchArchitecture() {
  const icons = [Database, Globe, BookOpen];

  return (
    <section id="dual-search" className="bg-white py-20 lg:py-24 scroll-mt-16 border-b border-slate-200">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            eyebrow="AUTOMATED REGULATORY TRACKING"
            titleLeading="Why manual search misses CBN,"
            titleAccent="SEC, NDPC, and FCCPC circulars."
            description="Government portals bury new directives inside unindexed PDFs. Cogent searches active Nigerian financial statutes alongside live .gov.ng circulars and African central bank guides in one place."
          />
        </RevealOnScroll>

        {/* Architectural 3-Column Grid with Signature Colors & Hairline Borders */}
        <RevealOnScroll delayMs={90}>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 rounded-xl border border-slate-200 bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden shadow-xs">
            {DUAL_SEARCH_TRACKS.map((track, idx) => {
              const Icon = icons[idx] ?? Database;
              return (
                <div key={track.code} className="p-6 sm:p-8 flex flex-col justify-between bg-[#FAFBFD] hover:bg-white transition-colors">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#1D4ED8]">
                        {track.code}
                      </span>
                      <Icon className="h-4 w-4 text-slate-400" strokeWidth={1.7} />
                    </div>

                    <h3 className="mt-4 text-[19px] font-semibold leading-snug text-[#0B1220]">
                      {track.title}
                    </h3>

                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-600">
                      {track.purpose}
                    </p>

                    <ul className="mt-5 space-y-2.5 border-t border-slate-200/70 pt-4">
                      {track.examples.map((ex) => (
                        <li
                          key={ex}
                          className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-700"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-200/70">
                    <span className="inline-block rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1D4ED8]">
                      {track.tierNote}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
