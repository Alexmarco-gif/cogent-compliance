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
    "Plain-English answers about campaign reviews, compliant rewrites, team sign-off roles, live webpage monitoring, and Paystack billing.",
  alternates: {
    canonical: "/resources/faq",
  },
  openGraph: {
    title: "FAQ | Cogent",
    description:
      "Answers to common questions from Nigerian financial marketing, legal, and compliance leaders.",
    url: "/resources/faq",
  },
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col">
      <div className="relative overflow-hidden cogent-hero-wash border-b border-slate-200/75">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-arch-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                ANSWERS &amp; CLARITY
              </span>
              <h1 className="mt-4 text-[36px] sm:text-[48px] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-950">
                Common questions,{" "}
                <span className="text-[#1D63ED]">answered simply.</span>
              </h1>
              <p className="mt-4 text-[16px] leading-[1.6] text-slate-600">
                Straightforward explanations of how Cogent fits into your marketing, legal, and compliance workflow before and after every launch.
              </p>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <FaqExplorer items={COMPLIANCE_FAQS} showHeader={false} showFilter={true} />
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
