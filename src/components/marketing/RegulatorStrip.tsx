import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { REGULATOR_METRICS } from "@/data/marketing-scenarios";

export function RegulatorStrip() {
  return (
    <section
      aria-label="Indexed Nigerian Statutory Regulators"
      className="border-y border-zinc-200 bg-zinc-50"
    >
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.09em] text-zinc-500">
            Grounded across 141 official Nigerian regulatory PDFs &amp; Golden 50 instruments
          </p>
          <Link
            href="/regulatory-vault"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-zinc-900 hover:text-[#2A4BFF] transition-colors"
          >
            <span>Browse Statutory Vault</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {REGULATOR_METRICS.map((reg) => (
            <Link
              key={reg.acronym}
              href={`/regulatory-vault?regulator=${reg.acronym}`}
              className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[16px] font-semibold tracking-tight text-zinc-950 group-hover:text-[#2A4BFF] transition-colors">
                  {reg.acronym}
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-zinc-900">
                  {reg.sourceCount} PDFs
                </span>
              </div>
              <p className="mt-1.5 text-[12px] font-medium leading-snug text-zinc-700 line-clamp-1">
                {reg.name}
              </p>
              <p className="mt-1 font-mono text-[10.5px] text-zinc-400">
                {reg.domain}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
