import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { LICENSE_VERTICALS } from "@/data/marketing-scenarios";

export const metadata: Metadata = {
  title: "Solutions | Tailored to Your Financial License",
  description:
    "Compliance workflows built for Nigerian Digital Lenders, Microfinance Banks, Commercial Banks, PSBs, Mobile Money Operators, and SEC WealthTechs.",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    title: "Solutions by License Tier | Cogent",
    description:
      "Rules and examples tailored for Digital Lenders, MFBs, Commercial Banks, PSBs, and SEC Operators.",
    url: "/solutions",
  },
};

const ANCHOR_MAP: Record<string, string> = {
  lenders: "digital-lenders",
  banking: "banking",
  payments: "payments",
  wealthtech: "wealthtech",
};

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col">
      <div className="relative overflow-hidden cogent-hero-wash border-b border-slate-200/75">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-arch-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                SOLUTIONS BY LICENSE
              </span>
              <h1 className="mt-4 text-[36px] sm:text-[50px] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-950">
                Calibrated to your{" "}
                <span className="text-[#1D63ED]">exact Nigerian license.</span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-[1.6] text-slate-600">
                A unit microfinance bank, a digital lender, and a payment service bank face completely different marketing rules. Cogent configures the right guardrails automatically for your sector.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {LICENSE_VERTICALS.map((v) => (
                  <a
                    key={v.id}
                    href={`#${ANCHOR_MAP[v.id] ?? v.id}`}
                    className="rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-blue-300 hover:text-[#1D63ED] transition-colors shadow-2xs"
                  >
                    {v.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8 space-y-10">
            {LICENSE_VERTICALS.map((sector, index) => (
              <RevealOnScroll key={sector.id} delayMs={index * 60}>
                <div
                  id={ANCHOR_MAP[sector.id] ?? sector.id}
                  className="scroll-mt-24 rounded-[28px] cogent-glass-tray p-6 sm:p-9"
                >
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-6 space-y-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#1D63ED] px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white">
                          {sector.label}
                        </span>
                        <span className="text-[12px] font-medium text-slate-500">
                          {sector.licenseTiers}
                        </span>
                      </div>

                      <h2 className="text-[26px] sm:text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-950">
                        {sector.headline}
                      </h2>

                      <p className="text-[15px] leading-relaxed text-slate-600">
                        {sector.description}
                      </p>

                      <ul className="space-y-2.5 pt-1">
                        {sector.blindSpotsCaught.map((spot) => (
                          <li
                            key={spot}
                            className="flex items-start gap-2.5 text-[14px] leading-relaxed text-slate-800"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{spot}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2">
                        <Link
                          href="/sign-up"
                          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D63ED] hover:underline"
                        >
                          <span>Start checking {sector.label.toLowerCase()} campaigns</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Right Clean Before / After Proof Specimen */}
                    <div className="lg:col-span-6">
                      <div className="rounded-2xl cogent-glass-card p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[11.5px]">
                          <span className="font-semibold text-slate-900">
                            {sector.sampleCase.label}
                          </span>
                          <span className="text-slate-400">
                            {sector.regulators.join(" · ")}
                          </span>
                        </div>

                        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Issue Spotted Before Launch</span>
                          </div>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-rose-950">
                            {sector.sampleCase.riskFlag}
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-rose-700">
                            Covered by: {sector.sampleCase.statute}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>How Cogent Resolves It</span>
                          </div>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-emerald-950 font-medium">
                            {sector.sampleCase.cleanFix}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
