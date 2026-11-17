import React from "react";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import {
  VaultExplorer,
  type PublicRegulatorSummary,
  type PublicVaultInstrumentDTO,
} from "@/components/marketing/VaultExplorer";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { REGULATOR_METRICS } from "@/data/marketing-scenarios";
import {
  GOLDEN_50_INSTRUMENTS,
  REGULATORY_BODIES,
} from "@/modules/regulatory-vault/golden50.data";

export const metadata: Metadata = {
  title: "Golden 50 Statutory Vault",
  description:
    "Browse Cogent's indexed Nigerian regulatory corpus across CBN, FCCPC, SEC, ARCON, and NDPC with SHA-256 document provenance.",
  alternates: {
    canonical: "/regulatory-vault",
  },
  openGraph: {
    title: "Golden 50 Statutory Vault | Cogent",
    description:
      "Search 141 verified statutory PDFs and Golden 50 regulatory instruments across CBN, FCCPC, ARCON, NDPC, and SEC.",
    url: "/regulatory-vault",
  },
};

interface RegulatoryVaultPageProps {
  searchParams: Promise<{ regulator?: string }>;
}

export default async function RegulatoryVaultPage({
  searchParams,
}: RegulatoryVaultPageProps) {
  const resolvedParams = await searchParams;

  const pdfCountByReg = new Map(
    REGULATOR_METRICS.map((m) => [m.acronym, m.sourceCount])
  );

  const instruments: PublicVaultInstrumentDTO[] = GOLDEN_50_INSTRUMENTS.map((inst) => {
    const firstClause = inst.clauses?.[0];
    return {
      regulatorAcronym: inst.regulatorAcronym,
      title: inst.title,
      instrumentType: inst.instrument_type,
      instrumentNumber: inst.instrument_number,
      description: inst.description,
      effectiveDate: inst.effective_date,
      sourceUrl: inst.source_url,
      shortHash: `${inst.document_hash.slice(0, 8)}...${inst.document_hash.slice(-6)}`,
      sampleClause: firstClause
        ? {
            reference: firstClause.clause_reference,
            text: firstClause.clause_text,
          }
        : undefined,
    };
  });

  const regulators: PublicRegulatorSummary[] = REGULATORY_BODIES.map((body) => ({
    acronym: body.acronym,
    name: body.name,
    domain: body.official_domain,
    pdfCount: pdfCountByReg.get(body.acronym) ?? 0,
    instrumentCount: instruments.filter((i) => i.regulatorAcronym === body.acronym).length,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero Band */}
        <section className="marketing-cobalt-wash border-b border-zinc-200 py-14 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-zinc-500">
                Class A Verifiable Legal Grounding
              </p>
              <h1 className="mt-3 text-[34px] sm:text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-zinc-950">
                The Nigerian{" "}
                <span className="font-serif italic font-normal text-zinc-800">
                  Statutory Vault
                </span>
              </h1>
              <p className="mt-4 text-[16px] leading-[1.6] text-zinc-600">
                Inspect the official Nigerian acts, CBN circulars, FCCPC digital lending guidelines, ARCON advertising codes, NDPA privacy rules, and SEC directives embedded inside Cogent&apos;s retrieval vault.
              </p>
            </div>

            {/* Summary KPI Bar */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {regulators.map((reg) => (
                <div
                  key={reg.acronym}
                  className="rounded-xl border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-semibold text-zinc-950">
                      {reg.acronym}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#2A4BFF]">
                      {reg.pdfCount} PDFs
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-zinc-600 line-clamp-1">
                    {reg.name}
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] text-zinc-400">
                    {reg.instrumentCount} core instruments · {reg.domain}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Explorer */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <VaultExplorer
              regulators={regulators}
              instruments={instruments}
              initialRegulator={resolvedParams.regulator}
            />
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
