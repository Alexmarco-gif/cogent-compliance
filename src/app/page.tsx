import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HeroWorkbenchDemo } from "@/components/marketing/HeroWorkbenchDemo";
import { RegulatorStrip } from "@/components/marketing/RegulatorStrip";
import { ExposureContrastGrid } from "@/components/marketing/ExposureContrastGrid";
import { LicenseVerticalSwitcher } from "@/components/marketing/LicenseVerticalSwitcher";
import { ComplianceEngineBento } from "@/components/marketing/ComplianceEngineBento";
import { StudioWalkthrough } from "@/components/marketing/StudioWalkthrough";
import { AdoptionSteps } from "@/components/marketing/AdoptionSteps";
import { CompetitorComparisonTable } from "@/components/marketing/CompetitorComparisonTable";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: "Cogent | Nigerian Regulatory Compliance Operating System",
  description:
    "Pre-publication marketing compliance, deterministic APR verification, flyer OCR forensics, and 2-year SHA-256 dossiers across CBN, FCCPC, ARCON, NDPC, and SEC.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cogent | Nigerian Regulatory Compliance Operating System",
    description:
      "Audit loan flyers, product rate cards, app store listings, and live URLs against 141 verified Nigerian regulatory PDFs before publication.",
    url: "/",
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Stem-Cogent",
      url: siteUrl,
      sameAs: ["https://github.com/Alexmarco-gif/cogent-compliance"],
    },
    {
      "@type": "SoftwareApplication",
      name: "Cogent Marketing Shield",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Supervisory compliance and regulatory intelligence operating system for Nigerian financial institutions covering CBN, FCCPC, ARCON, NDPC, and SEC.",
      offers: {
        "@type": "Offer",
        price: "149",
        priceCurrency: "USD",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <MarketingHeader />

      <main className="flex-1">
        {/* Section 1: Hero & Interactive Workbench Stage */}
        <section className="marketing-cobalt-wash border-b border-zinc-200/80 pt-14 pb-20 sm:pt-20 lg:pt-24 lg:pb-28">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Supervisory Compliance Operating System · Nigeria
            </p>

            <h1 className="mx-auto mt-4 max-w-4xl text-[38px] sm:text-[52px] lg:text-[62px] font-semibold leading-[1.06] tracking-[-0.03em] text-zinc-950">
              Regulatory certainty for{" "}
              <span className="font-serif italic font-normal text-zinc-800">
                every campaign
              </span>{" "}
              before it ships.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[16px] sm:text-[18px] leading-[1.6] text-zinc-600">
              Audit loan flyers, product rate cards, app store listings, and live URLs against 141 verified CBN, FCCPC, ARCON, NDPC, and SEC instruments—with deterministic APR checks and SHA-256 audit dossiers.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-zinc-950 px-6 text-[14px] font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                <span>Start 7-Day Evaluation</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-[14px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
              >
                Explore Platform Architecture
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-zinc-500">
              <span>3 Live Audits in 7-Day Pilot</span>
              <span aria-hidden="true">·</span>
              <span>Deterministic Locks 1–3</span>
              <span aria-hidden="true">·</span>
              <span>Human CCO Sign-Off Enforced</span>
            </div>

            {/* Interactive Live Product Demonstration */}
            <HeroWorkbenchDemo />
          </div>
        </section>

        {/* Section 2: Indexed Statutory Corpus Strip */}
        <RegulatorStrip />

        {/* Section 3: Exposure & Industry Contrast Band */}
        <ExposureContrastGrid />

        {/* Section 4: License-Aware Institutional Switcher */}
        <LicenseVerticalSwitcher />

        {/* Section 5: 5-Layer Deterministic Engine Bento */}
        <ComplianceEngineBento />

        {/* Section 6: Interactive 4-Step Studio Walkthrough */}
        <StudioWalkthrough />

        {/* Section 7: 4-Step Rollout Flow */}
        <AdoptionSteps />

        {/* Section 8: Institutional Comparison Matrix */}
        <CompetitorComparisonTable />

        {/* Section 9: High-Contrast Executive CTA */}
        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
