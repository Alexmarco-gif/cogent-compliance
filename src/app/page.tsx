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
  title: "Cogent | Fintech & Regulatory Compliance Management Software Nigeria",
  description:
    "Fintech and banking compliance software for Nigeria and Africa. Track CBN circulars, update AML policies, pass sponsor-bank due diligence, and clear FCCPC, NDPC, and ARCON launches in minutes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cogent | Fintech & Regulatory Compliance Management Software Nigeria",
    description:
      "Turn CBN, SEC, NDPC, and FCCPC circulars into finished product checklists, updated AML policies, sponsor-bank audit replies, and cleared launches in minutes.",
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
        "Regulatory compliance management software helping Nigerian and African fintechs, digital lenders, and banks track CBN, SEC, NDPC, and FCCPC rules, update AML policies, answer audits, and clear launches.",
    },
    {
      "@type": "FAQPage",
      mainEntity: COMPLIANCE_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
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
              FINTECH &amp; BANKING COMPLIANCE SOFTWARE · NIGERIA &amp; AFRICA
            </p>

            <h1
              style={{ animationDelay: "60ms" }}
              className="animate-cogent-enter mx-auto mt-4 max-w-4xl text-[36px] sm:text-[50px] lg:text-[62px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#0B1220]"
            >
              End compliance friction and the daily operational tug-of-war.{" "}
              <span className="block text-[#1D4ED8] mt-1 sm:mt-2">
                Turn 5-day CBN, AML &amp; FCCPC bottlenecks into minutes.
              </span>
            </h1>

            <p
              style={{ animationDelay: "120ms" }}
              className="animate-cogent-enter mx-auto mt-5 max-w-3xl text-[16.5px] sm:text-[18.5px] leading-[1.6] text-slate-600"
            >
              Track Nigerian and African central bank circulars, update AML/CFT policies, answer sponsor-bank due-diligence questionnaires, and clear digital lending or payment launches—without the week-long wait.
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
