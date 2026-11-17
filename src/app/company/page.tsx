import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, Lock, ShieldCheck, Users } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { FounderSpotlight } from "@/components/marketing/FounderSpotlight";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Company & Leadership",
  description:
    "Meet the leadership and trust architecture behind Stem-Cogent and Cogent Marketing Shield—built for Nigerian regulated financial institutions.",
  alternates: {
    canonical: "/company",
  },
  openGraph: {
    title: "Company & Leadership | Cogent",
    description:
      "Institutional mission, leadership spotlight, and multi-tenant security architecture of Cogent Marketing Shield.",
    url: "/company",
  },
};

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "PostgreSQL Row-Level Security",
    description:
      "Every rate schedule, internal compliance playbook, campaign revision, and evidence dossier is strictly scoped by tenant_id with composite foreign keys and RLS isolation.",
  },
  {
    icon: Users,
    title: "Dual-Control 5-Role RBAC",
    description:
      "Separates Marketing/Growth creation from Legal Counsel and Chief Compliance Officer decision authority (`approval.decide`), eliminating self-approval risk.",
  },
  {
    icon: Database,
    title: "Private Object Storage & SHA-256 Chain",
    description:
      "Uploaded campaign creatives and generated PDF compliance dossiers are isolated per tenant in private object storage with tamper-evident SHA-256 audit hashing.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Cross-Tenant Model Training",
    description:
      "Your internal pricing schedules, fees, and draft campaigns are never pooled across financial institutions or used to train external foundation models.",
  },
];

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Leadership Spotlight Hero (ref/w4.png layout discipline) */}
        <section className="marketing-cobalt-wash border-b border-zinc-200 pt-14 pb-20 sm:pt-20 lg:pb-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Leadership &amp; Institutional Mission
              </p>
              <h1 className="mt-3 text-[36px] sm:text-[50px] font-semibold leading-[1.08] tracking-[-0.03em] text-zinc-950">
                Built for Nigerian{" "}
                <span className="font-serif italic font-normal text-zinc-800">
                  regulatory authority.
                </span>
              </h1>
              <p className="mt-4 text-[15.5px] sm:text-[17px] leading-[1.6] text-zinc-600">
                Stem-Cogent builds supervisory compliance infrastructure so high-growth financial teams and Chief Compliance Officers ship campaigns with deterministic proof.
              </p>
            </div>

            <FounderSpotlight />
          </div>
        </section>

        {/* Enterprise Trust & Security Governance */}
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeader
                eyebrow="Trust & Tenancy Governance"
                title={
                  <>
                    Engineered for bank, MFB, and{" "}
                    <span className="font-serif italic font-normal text-zinc-700">
                      CCO scrutiny
                    </span>
                  </>
                }
                description="Institutional buyers evaluate security and auditability first. Cogent enforces isolation at the database, storage, and permission layers."
              />

              <Link
                href="/platform#governance"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-950 hover:text-[#2A4BFF] transition-colors shrink-0"
              >
                <span>Inspect 7-Layer Guardrails</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
              {TRUST_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 sm:p-7"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800">
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </div>
                    <h2 className="mt-4 text-[18px] font-semibold text-zinc-950">
                      {pillar.title}
                    </h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
                      {pillar.description}
                    </p>
                  </div>
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
