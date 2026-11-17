"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

export interface PublicVaultInstrumentDTO {
  regulatorAcronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  title: string;
  instrumentType: string;
  instrumentNumber: string;
  description: string;
  effectiveDate: string;
  sourceUrl: string;
  shortHash: string;
  sampleClause?: {
    reference: string;
    text: string;
  };
}

export interface PublicRegulatorSummary {
  acronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  name: string;
  domain: string;
  pdfCount: number;
  instrumentCount: number;
}

interface VaultExplorerProps {
  regulators: PublicRegulatorSummary[];
  instruments: PublicVaultInstrumentDTO[];
  initialRegulator?: string;
}

export function VaultExplorer({
  regulators,
  instruments,
  initialRegulator,
}: VaultExplorerProps) {
  const validInitial = regulators.some((r) => r.acronym === initialRegulator?.toUpperCase())
    ? (initialRegulator!.toUpperCase() as PublicRegulatorSummary["acronym"])
    : "ALL";

  const [selectedRegulator, setSelectedRegulator] = useState<string>(validInitial);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instruments.filter((item) => {
      const matchesReg =
        selectedRegulator === "ALL" || item.regulatorAcronym === selectedRegulator;
      if (!matchesReg) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.instrumentNumber.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.regulatorAcronym.toLowerCase().includes(q)
      );
    });
  }, [instruments, selectedRegulator, query]);

  return (
    <div className="space-y-8">
      {/* Filter Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter instruments by regulator">
          <button
            type="button"
            role="tab"
            aria-selected={selectedRegulator === "ALL"}
            onClick={() => setSelectedRegulator("ALL")}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
              selectedRegulator === "ALL"
                ? "bg-zinc-950 text-white"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white"
            }`}
          >
            All Regulators ({instruments.length})
          </button>

          {regulators.map((reg) => {
            const active = selectedRegulator === reg.acronym;
            return (
              <button
                key={reg.acronym}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedRegulator(reg.acronym)}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white"
                }`}
              >
                {reg.acronym} ({reg.instrumentCount})
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search circulars, acts, or IDs..."
            aria-label="Search regulatory instruments"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-[13.5px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-zinc-500">
        <span>
          Showing <strong className="text-zinc-950">{filtered.length}</strong> cataloged instruments
          {selectedRegulator !== "ALL" ? ` for ${selectedRegulator}` : ""}
        </span>
        <span className="font-mono text-[11px] text-zinc-400">
          Indexed Vault Storage: 141 PDFs · Lifecycle: CURRENT
        </span>
      </div>

      {/* Instrument Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-[15px] font-medium text-zinc-950">
            No statutory instruments matched &ldquo;{query}&rdquo;.
          </p>
          <p className="mt-1 text-[13.5px] text-zinc-500">
            Try clearing the search query or switching to All Regulators.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedRegulator("ALL");
            }}
            className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50 cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <article
              key={`${item.regulatorAcronym}-${item.instrumentNumber}-${item.title}`}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-950">
                      {item.regulatorAcronym}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">
                      {item.instrumentType}
                    </span>
                  </div>
                  <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800">
                    CURRENT
                  </span>
                </div>

                <h2 className="mt-3 text-[17px] font-semibold leading-snug text-zinc-950">
                  {item.title}
                </h2>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  {item.instrumentNumber} · Effective {item.effectiveDate}
                </p>

                <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-600">
                  {item.description}
                </p>

                {item.sampleClause && (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.07em] text-zinc-500">
                      Indexed Clause · {item.sampleClause.reference}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-700">
                      &ldquo;{item.sampleClause.text}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5 font-mono text-[11px] text-zinc-400">
                <span>SHA-256: {item.shortHash}</span>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-sans text-[12px] font-medium text-zinc-700 hover:text-[#2A4BFF] transition-colors"
                >
                  <span>Official Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
