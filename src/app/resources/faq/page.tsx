import React from "react";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { FaqExplorer } from "@/components/marketing/FaqExplorer";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { COMPLIANCE_FAQS } from "@/data/marketing-scenarios";

export const metadata: Metadata = {
  title: "FAQ | Common Questions",
  description:
    "Straightforward answers about Nigerian & African regulatory search, AML policy comparisons, split-screen work product drafting, role governance, and workspace security.",
  alternates: {
    canonical: "/resources/faq",
  },
  openGraph: {
    title: "FAQ | Cogent",
    description:
      "Answers to common questions from Nigerian and African General Counsel, Chief Compliance Officers, and fintech product teams.",
    url: "/resources/faq",
  },
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                ANSWERS &amp; CLARITY
              </p>
              <h1 className="mt-4 text-[36px] sm:text-[48px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0B1220]">
                Common questions,{" "}
                <span className="text-[#1D4ED8]">answered simply.</span>
              </h1>
              <p className="mt-4 text-[16px] leading-[1.6] text-slate-600">
                Plain explanations of how Cogent searches Nigerian and African rules, updates internal policies, drafts formal replies, and clears campaigns.
              </p>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <FaqExplorer items={COMPLIANCE_FAQS} showHeader={false} showFilter={true} />
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
