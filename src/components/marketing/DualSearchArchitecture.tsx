import React from "react";
import {
  Database,
  Globe,
  Compass,
  BookOpen,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

interface IntelligenceCard {
  icon: React.ElementType;
  title: string;
  description: string;
}

const INTELLIGENCE_CARDS: IntelligenceCard[] = [
  {
    icon: Database,
    title: "Curated statutory vault",
    description:
      "Clause-level retrieval across 141+ codified Nigerian instruments—CBN BOFIA 2020, Consumer Protection Framework, FCCPC Digital Lending Rules, NDPA 2023, and the ARCON advertising code.",
  },
  {
    icon: Globe,
    title: "Targeted live circular crawler",
    description:
      "Bypasses broken government website search bars to index circular codes (such as BSD/DIR/GEN/...) and sudden gazettes directly from cbn.gov.ng, sec.gov.ng, and ndpc.gov.ng within hours.",
  },
  {
    icon: Compass,
    title: "Pan-African central bank monitoring",
    description:
      "Full-text circular extraction across Central Bank of Kenya (cbk.go.ke), Bank of Ghana (bog.gov.gh), and SARB South Africa for instant cross-border licensing and capital requirement comparisons.",
  },
  {
    icon: BookOpen,
    title: "Tier-1 legal briefing synthesis",
    description:
      "Ingests practical regulatory briefings and enforcement precedents from top Nigerian financial law firms (Banwo & Ighodalo, Aluko & Oyebode, Templars, Udo Udoma) directly into your memo.",
  },
  {
    icon: Lock,
    title: "Organization data boundaries",
    description:
      "Your internal AML manuals, product rate schedules, unreleased feature roadmaps, and sponsor-bank audit replies stay strictly isolated to your organization vault and are never pooled or trained on.",
  },
  {
    icon: ShieldCheck,
    title: "Defensible citation grounding",
    description:
      "Zero hallucinated rules. Every bullet and clause Cogent drafts links to an exact circular reference number, gazette paragraph, or statutory clause you can hand directly to the Board or Regulator.",
  },
];

export function DualSearchArchitecture() {
  return (
    <section id="dual-search" className="bg-[#FAFBFD] py-20 lg:py-24 scroll-mt-16">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Two-tone Centered Header matching hg.JPG */}
        <RevealOnScroll>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[30px] sm:text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#0B1220]">
              Dual-engine regulatory intelligence.{" "}
              <span className="font-normal text-slate-500 block sm:inline">
                Why standard tools miss Nigerian &amp; African regulatory portals.
              </span>
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] leading-[1.6] text-slate-600">
              Government portals bury critical circulars inside nested PDFs with broken search. Cogent runs parallel specialized tracks across codified statutes, live government domains, and pan-African central banks.
            </p>
          </div>
        </RevealOnScroll>

        {/* 3x2 Modular Card Grid matching hg.JPG layout */}
        <RevealOnScroll delayMs={90}>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INTELLIGENCE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-7 sm:p-8 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-[#0B1220]">
                      <Icon className="h-5 w-5 text-slate-800" strokeWidth={1.75} />
                    </div>

                    <h3 className="mt-6 text-[17px] font-semibold leading-snug text-[#0B1220]">
                      {card.title}
                    </h3>

                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-600">
                      {card.description}
                    </p>
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
