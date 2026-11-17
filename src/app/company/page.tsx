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
    "Meet Odion O. Alex (CEO) and Gift Chinedu Nduka (CSO), Co-Founders of Stem Systems—building decision intelligence and regulatory confidence for Nigerian financial institutions.",
  alternates: {
    canonical: "/company",
  },
  openGraph: {
    title: "Company & Co-Founders | Stem Systems & Cogent",
    description:
      "Meet the Co-Founders of Stem Systems and explore how we protect customer rates, data privacy, and governance.",
    url: "/company",
  },
};

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Private per Organization",
    description:
      "Your rate schedules, draft ads, and compliance dossiers live inside an isolated workspace restricted strictly to your team.",
  },
  {
    icon: Users,
    title: "Role Separation Built In",
    description:
      "Growth and Marketing teams draft quickly while Legal Counsel and your Chief Compliance Officer hold final publication approval.",
  },
  {
    icon: Database,
    title: "Permanent Audit Trail",
    description:
      "Every approved campaign stores its exact wording, time, approver name, and verification record so inspections are effortless.",
  },
  {
    icon: ShieldCheck,
    title: "Your Data Stays Yours",
    description:
      "Your internal pricing schedules and unreleased promotional campaigns are never pooled with other institutions or sold.",
  },
];

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col">
      <div className="relative overflow-hidden cogent-hero-wash border-b border-slate-200/75">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-arch-grid"
        />
        <MarketingHeader />

        {/* Leadership Spotlight Hero (ref/w4.png layout with Odion O. Alex & Gift Chinedu Nduka) */}
        <section className="relative z-10 pt-10 pb-20 sm:pt-14 lg:pb-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                STEM SYSTEMS LEADERSHIP
              </span>
              <h1 className="mt-4 text-[36px] sm:text-[50px] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-950">
                Built to give Nigerian teams{" "}
                <span className="text-[#1D63ED]">clarity before launch.</span>
              </h1>
              <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.6] text-slate-600">
                Stem Systems builds Cogent so ambitious fintechs, lenders, and banks navigate shifting rules with confidence rather than guesswork.
              </p>
            </div>

            <FounderSpotlight />
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* Trust & Security Pillars */}
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <RevealOnScroll>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeader
                  badge="SECURITY & GOVERNANCE"
                  titleLeading="Engineered for bank and"
                  titleAccent="compliance team scrutiny"
                  description="Institutions trust us with unreleased launches and private rate cards—so strict data boundaries sit at the core of our product."
                />

                <Link
                  href="/platform#signoff"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D63ED] hover:underline shrink-0"
                >
                  <span>See how team approvals work</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </RevealOnScroll>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
              {TRUST_PILLARS.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <RevealOnScroll key={pillar.title} delayMs={idx * 80}>
                    <div className="h-full rounded-2xl cogent-glass-card p-6 sm:p-7 hover:border-blue-200 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1D63ED]">
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <h2 className="mt-4 text-[18px] font-semibold text-slate-950">
                        {pillar.title}
                      </h2>
                      <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                        {pillar.description}
                      </p>
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
