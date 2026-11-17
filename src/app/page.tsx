import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { RegulatoryScrollTicker } from "@/components/marketing/RegulatoryScrollTicker";
import { DailyWorkflowsSection } from "@/components/marketing/DailyWorkflowsSection";
import { DualSearchArchitecture } from "@/components/marketing/DualSearchArchitecture";
import { ThreeStepPlan } from "@/components/marketing/ThreeStepPlan";
import { FaqExplorer } from "@/components/marketing/FaqExplorer";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { COMPLIANCE_FAQS } from "@/data/marketing-scenarios";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: "Cogent | Ask Any Compliance Question. Clear Any Campaign.",
  description:
    "Ask any compliance question. Clear any campaign. Accelerate regulatory work from days to minutes across Nigerian & African financial regulations.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cogent | Ask Any Compliance Question. Clear Any Campaign.",
    description:
      "Accelerate regulatory work from days to minutes. Turn scattered Nigerian and African regulations into finished structuring memos, updated AML policies, regulator query responses, audit replies, and cleared launches.",
    url: "/",
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Stem Systems",
      url: siteUrl,
      founder: [
        { "@type": "Person", name: "Odion O. Alex" },
        { "@type": "Person", name: "Gift Chinedu Nduka" },
      ],
      sameAs: ["https://github.com/Alexmarco-gif/cogent-compliance"],
    },
    {
      "@type": "SoftwareApplication",
      name: "Cogent",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Regulatory intelligence and compliance workflow engine helping Nigerian and African fintechs, lenders, and banks research multi-agency rules, update AML policies, answer audits, and clear campaigns.",
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      {/* Crisp Editorial Architectural Canvas */}
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />

        <MarketingHeader />

        <section className="relative z-10 pt-12 pb-20 sm:pt-16 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
            <p className="animate-cogent-enter font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
              REGULATORY INTELLIGENCE · NIGERIA &amp; AFRICA
            </p>

            <h1
              style={{ animationDelay: "60ms" }}
              className="animate-cogent-enter mx-auto mt-4 max-w-4xl text-[36px] sm:text-[50px] lg:text-[62px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#0B1220]"
            >
              Ask any compliance question. Clear any campaign.{" "}
              <span className="block text-[#1D4ED8] mt-1 sm:mt-2">
                Accelerate regulatory work from days to minutes.
              </span>
            </h1>

            <p
              style={{ animationDelay: "120ms" }}
              className="animate-cogent-enter mx-auto mt-5 max-w-3xl text-[16.5px] sm:text-[18.5px] leading-[1.6] text-slate-600"
            >
              Turn scattered Nigerian and African regulations into finished structuring memos, updated AML policies, regulator query responses, audit replies, and cleared launches—without the week-long wait.
            </p>

            <div
              style={{ animationDelay: "180ms" }}
              className="animate-cogent-enter mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/sign-up"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-[#1D4ED8] px-6 text-[14px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#workflows"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-md border border-slate-200 bg-white px-6 text-[14px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                See the 5 Workflows
              </a>
            </div>

          </div>
        </section>

        {/* Full-width dark marquee ticker styled per scrool.JPG */}
        <RegulatoryScrollTicker />
      </div>

      <main className="flex-1">
        {/* Section 2: Days-to-Minutes Daily Compliance Workflow Ledger */}
        <DailyWorkflowsSection />

        {/* Section 3: Dual-Engine Regulatory Search Architecture */}
        <DualSearchArchitecture />

        {/* Section 4: Simple 3-Step Adoption */}
        <ThreeStepPlan />

        {/* Section 5: Executive Common Questions */}
        <section className="border-t border-slate-200 bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <FaqExplorer items={COMPLIANCE_FAQS} showHeader={true} showFilter={false} />
          </div>
        </section>

        {/* Section 6: Final Deep-Ink Split CTA */}
        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
