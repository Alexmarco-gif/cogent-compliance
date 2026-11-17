import React from "react";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { FaqExplorer } from "@/components/marketing/FaqExplorer";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { COMPLIANCE_FAQS } from "@/data/marketing-scenarios";

export const metadata: Metadata = {
  title: "Compliance & Product FAQ",
  description:
    "Answers to institutional questions on Nigerian statutory grounding, deterministic APR calculations, dual-control RBAC governance, and Paystack billing.",
  alternates: {
    canonical: "/resources/faq",
  },
  openGraph: {
    title: "Compliance & Product FAQ | Cogent",
    description:
      "How Cogent prevents hallucinated legal citations, computes effective APR, and settles in Naira via Paystack.",
    url: "/resources/faq",
  },
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        <section className="marketing-cobalt-wash border-b border-zinc-200 py-14 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-zinc-500">
                Institutional Knowledge &amp; Governance
              </p>
              <h1 className="mt-3 text-[34px] sm:text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-zinc-950">
                Frequently asked{" "}
                <span className="font-serif italic font-normal text-zinc-800">
                  compliance questions
                </span>
              </h1>
              <p className="mt-4 text-[16px] leading-[1.6] text-zinc-600">
                Clear documentation on statutory grounding, deterministic enforcement locks, tenant isolation, and Naira Paystack settlement.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <FaqExplorer items={COMPLIANCE_FAQS} />
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
