import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FileText } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { LICENSE_VERTICALS } from "@/data/marketing-scenarios";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: "Fintech & Banking Compliance Solutions Nigeria | CBN, FCCPC, SEC & NDPC",
  description:
    "Compliance management software tailored to Nigerian and African Digital Lenders, Commercial Banks, MFBs, PSSPs, MMOs, and SEC Operators—built for CBN circulars, AML policies, and FCCPC/NDPC rules.",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    title: "Fintech & Banking Compliance Solutions | Cogent",
    description:
      "Tailored CBN, FCCPC, NDPC, and SEC compliance workflows for Digital Lenders, MFBs, Commercial Banks, PSSPs, and WealthTech teams.",
    url: "/solutions",
  },
};

const SOLUTIONS_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name: "Solutions", item: `${siteUrl}/solutions` },
  ],
};

const ANCHOR_MAP: Record<string, string> = {
  lenders: "digital-lenders",
  banking: "banking",
  payments: "payments",
  wealthtech: "wealthtech",
};

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOLUTIONS_STRUCTURED_DATA) }}
      />
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                SOLUTIONS BY LICENSE TIER
              </p>
              <h1 className="mt-4 text-[36px] sm:text-[50px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0B1220]">
                Compliance software calibrated to your{" "}
                <span className="text-[#1D4ED8]">exact Nigerian or African license.</span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-[1.6] text-slate-600">
                A microfinance bank, an FCCPC-registered digital lender, a CBN payment processor (PSSP/MMO), and a SEC-regulated investment app face completely different rules. Cogent tailors circular tracking, AML policy updates, and launch sign-off checks to your exact license.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {LICENSE_VERTICALS.map((v) => (
                  <a
                    key={v.id}
                    href={`#${ANCHOR_MAP[v.id] ?? v.id}`}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-slate-300 hover:text-[#1D4ED8] transition-colors"
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
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 space-y-8">
            {LICENSE_VERTICALS.map((sector, index) => (
              <RevealOnScroll key={sector.id} delayMs={index * 50}>
                <div
                  id={ANCHOR_MAP[sector.id] ?? sector.id}
                  className="scroll-mt-24 rounded-xl border border-slate-200 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
                >
                  <div className="lg:col-span-6 p-6 sm:p-9 space-y-5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded bg-[#0B1220] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white">
                        {sector.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {sector.licenseTiers}
                      </span>
                    </div>

                    <h2 className="text-[24px] sm:text-[30px] font-semibold leading-[1.15] tracking-tight text-[#0B1220]">
                      {sector.headline}
                    </h2>

                    <p className="text-[14.5px] leading-relaxed text-slate-600">
                      {sector.description}
                    </p>

                    <ul className="space-y-2.5 pt-1">
                      {sector.workflowsAccelerated.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-800"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 flex flex-wrap items-center gap-5">
                      <Link
                        href={`/solutions/${sector.slug}`}
                        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D4ED8] hover:underline"
                      >
                        <span>Explore {sector.label} compliance guide</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/sign-up"
                        className="text-[13px] font-medium text-slate-600 hover:text-[#0B1220] hover:underline"
                      >
                        Start 7-day free trial
                      </Link>
                    </div>
                  </div>

                  {/* Right Deliverable Specimen */}
                  <div className="lg:col-span-6 bg-[#FAFBFD] p-6 sm:p-9 flex flex-col justify-between space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-[11.5px]">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-[#1D4ED8]" />
                        <span className="font-semibold text-[#0B1220]">
                          {sector.sampleCase.label}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] text-slate-500">
                        {sector.regulators.join(" · ")}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Compliance Request
                        </p>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#0B1220] font-medium">
                          {sector.sampleCase.taskDescription}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-[#1D4ED8]">
                          Grounded in: {sector.sampleCase.statute}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                          Work Product Generated
                        </p>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-emerald-950 font-medium">
                          {sector.sampleCase.deliverable}
                        </p>
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
