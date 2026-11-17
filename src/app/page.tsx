import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HeroProductBoard } from "@/components/marketing/HeroProductBoard";
import { StoryStakesSection } from "@/components/marketing/StoryStakesSection";
import { FeatureBentoShowcase } from "@/components/marketing/FeatureBentoShowcase";
import { ThreeStepPlan } from "@/components/marketing/ThreeStepPlan";
import { FaqExplorer } from "@/components/marketing/FaqExplorer";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { COMPLIANCE_FAQS } from "@/data/marketing-scenarios";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: "Cogent | Ship Financial Campaigns Without Compliance Surprises",
  description:
    "Check loan flyers, ads, app store listings, and landing pages against CBN, FCCPC, ARCON, NDPC, and SEC rules before launch.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cogent | Ship Financial Campaigns Without Compliance Surprises",
    description:
      "Check loan flyers, ads, app store listings, and landing pages against Nigerian financial rules before going live.",
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
        "Pre-launch marketing compliance review platform helping Nigerian banks, digital lenders, and fintech teams check ads, flyers, and live pages before publication.",
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      {/* Luminous Hero Canvas with Architectural Grid & Floating Pill Navbar */}
      <div className="relative overflow-hidden cogent-hero-wash border-b border-slate-200/75">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-arch-grid"
        />

        <MarketingHeader />

        <section className="relative z-10 pt-10 pb-20 sm:pt-14 lg:pt-16 lg:pb-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8 text-center">
            {/* Spark-Blue Category Pill matching Reference 1.png & 3dc8c2 */}
            <div className="animate-cogent-enter">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/90 px-3 py-1 text-[11.5px] font-semibold text-slate-700 shadow-xs backdrop-blur-sm">
                <span className="rounded-full bg-[#1D63ED] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  CBN · FCCPC · ARCON
                </span>
                <span>For Nigerian lenders, banks &amp; fintechs</span>
              </span>
            </div>

            {/* Two-Tone 5-Second Grunt Test Display Headline */}
            <h1
              style={{ animationDelay: "70ms" }}
              className="animate-cogent-enter mx-auto mt-6 max-w-4xl text-[40px] sm:text-[54px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.035em] text-slate-950"
            >
              Launch campaigns fast.{" "}
              <span className="block text-[#1D63ED]">
                Without the compliance fear.
              </span>
            </h1>

            {/* StoryBrand Clear Value Proposition */}
            <p
              style={{ animationDelay: "130ms" }}
              className="animate-cogent-enter mx-auto mt-5 max-w-2xl text-[16px] sm:text-[18px] leading-[1.6] text-slate-600"
            >
              Check every flyer, social ad, app store page, and pricing link against Nigerian rules before it goes live—so your team publishes on time without surprise fines or takedowns.
            </p>

            {/* Primary & Secondary CTAs */}
            <div
              style={{ animationDelay: "190ms" }}
              className="animate-cogent-enter mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/sign-up"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#1D63ED] px-7 text-[14.5px] font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-[#1552CC] transition-all"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-6 text-[14.5px] font-medium text-slate-700 hover:border-slate-300 hover:bg-white transition-colors"
              >
                See How It Works
              </a>
            </div>

            {/* Quiet Reassurance Line */}
            <p
              style={{ animationDelay: "240ms" }}
              className="animate-cogent-enter mt-4 text-[12.5px] font-medium text-slate-500"
            >
              Start free in minutes · Built by Stem Systems · No card required
            </p>

            {/* Interactive Product Board Showcase with 1–6 Hotspots */}
            <div style={{ animationDelay: "300ms" }} className="animate-cogent-enter">
              <HeroProductBoard />
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* Section 2: StoryBrand Villain, Stakes & Guide */}
        <StoryStakesSection />

        {/* Section 3: Animated Layered Glass Bento Features */}
        <FeatureBentoShowcase />

        {/* Section 4: Simple 3-Step Plan */}
        <ThreeStepPlan />

        {/* Section 5: 2-Column Common Questions Accordion */}
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <FaqExplorer items={COMPLIANCE_FAQS} showHeader={true} showFilter={false} />
          </div>
        </section>

        {/* Section 6: Luminous Split Closing CTA */}
        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
