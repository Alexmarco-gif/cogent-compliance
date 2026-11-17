import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, Lock, ShieldCheck, Users } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { FounderSpotlight } from "@/components/marketing/FounderSpotlight";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export const metadata: Metadata = {
  title: "Company & Co-Founders | Stem Systems",
  description:
    "Meet Odion O. Alex (CEO) and Gift Chinedu Nduka (CSO), Co-Founders of Stem Systems—building regulatory intelligence and compliance execution software for Nigerian and African finance.",
  alternates: {
    canonical: "/company",
  },
  openGraph: {
    title: "Company & Co-Founders | Stem Systems & Cogent",
    description:
      "Meet the Co-Founders of Stem Systems and explore how we protect institutional manuals, regulatory research, and governance trails.",
    url: "/company",
  },
};

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Private per Organization",
    description:
      "Your internal AML manuals, rate schedules, audit questionnaires, and unreleased product plans stay isolated inside your own workspace.",
  },
  {
    icon: Users,
    title: "Role Separation Built In",
    description:
      "Product and Marketing teams run research and draft deliverables quickly while General Counsel and the CCO hold final approval authority.",
  },
  {
    icon: Database,
    title: "Permanent Audit Trail",
    description:
      "Every approved policy change, supervisory reply, and cleared launch stores exact wording, source citations, timestamps, and approver records.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Shared Training",
    description:
      "Your confidential business rules, sponsor-bank letters, and expansion roadmaps are never pooled with other institutions or sold.",
  },
];

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 pt-12 pb-20 sm:pt-16 lg:pb-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                STEM SYSTEMS LEADERSHIP
              </p>
              <h1 className="mt-4 text-[36px] sm:text-[50px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0B1220]">
                Built for speed.{" "}
                <span className="text-[#1D4ED8]">Grounded in rigor.</span>
              </h1>
              <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.6] text-slate-600">
                Stem Systems builds Cogent so Nigerian and African financial institutions turn week-long regulatory bottlenecks into five-minute clarity.
              </p>
            </div>

            <FounderSpotlight />
          </div>
        </section>
      </div>

      <main className="flex-1">
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <RevealOnScroll>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeader
                  eyebrow="SECURITY & GOVERNANCE"
                  titleLeading="Engineered for bank and"
                  titleAccent="compliance team scrutiny."
                  description="Institutions trust Cogent with unreleased products, internal AML policies, and sponsor-bank inquiries—strict data boundaries sit at our core."
                />

                <Link
                  href="/platform#launch-clearance"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D4ED8] hover:underline shrink-0"
                >
                  <span>Explore platform governance</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={80}>
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                {TRUST_PILLARS.map((pillar, idx) => {
                  const Icon = pillar.icon;
                  const borderClasses = [
                    idx < 2 ? "border-b border-slate-200" : "",
                    idx % 2 === 0 ? "md:border-r md:border-slate-200" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div key={pillar.title} className={`p-6 sm:p-8 ${borderClasses}`}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[#1D4ED8]">
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <h2 className="mt-4 text-[18px] font-semibold text-[#0B1220]">
                        {pillar.title}
                      </h2>
                      <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                        {pillar.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
