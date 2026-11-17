import React from "react";
import { Check, Globe, Database, BookOpen } from "lucide-react";
import { DUAL_SEARCH_TRACKS } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function DualSearchArchitecture() {
  const icons = [Database, Globe, BookOpen];

  return (
    <section id="dual-search" className="bg-white py-20 lg:py-24 scroll-mt-16">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <RevealOnScroll>
          <SectionHeader
            eyebrow="DUAL-ENGINE REGULATORY INTELLIGENCE"
            titleLeading="Why standard tools miss Nigerian"
            titleAccent="and African regulatory portals."
            description="Government portals bury critical circulars inside nested PDFs with poor search indexing. Cogent runs three specialized retrieval tracks in parallel inside one prompt."
          />
        </RevealOnScroll>

        {/* Architectural 3-Column Grid Divided by Clean 1px Hairlines */}
        <RevealOnScroll delayMs={90}>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 rounded-xl border border-slate-200 bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
            {DUAL_SEARCH_TRACKS.map((track, idx) => {
              const Icon = icons[idx] ?? Database;
              return (
                <div key={track.code} className="p-6 sm:p-8 flex flex-col justify-between">
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

                    <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
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

                  <div className="mt-6 pt-3 border-t border-slate-100">
                    <span className="font-mono text-[11px] text-slate-500">
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
