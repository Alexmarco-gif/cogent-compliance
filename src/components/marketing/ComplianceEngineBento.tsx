import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

export function ComplianceEngineBento() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Deterministic Compliance Engine"
            title={
              <>
                Five verification layers{" "}
                <span className="font-serif italic font-normal text-zinc-700">
                  built outside the LLM
                </span>
              </>
            }
            description="Cogent separates legal reasoning from deterministic enforcement. Statutory citations, rate math, visual ratios, license rules, and audit hashes execute in dedicated TypeScript engines."
          />
          <Link
            href="/platform"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-950 hover:text-[#2A4BFF] transition-colors shrink-0"
          >
            <span>Inspect platform architecture</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Card 1: 7 cols — Three-Source Grounding Stack */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-zinc-500">
                01 · HYBRID RRF STATUTORY GROUNDING
              </span>
              <h3 className="mt-2.5 text-[21px] font-semibold tracking-tight text-zinc-950">
                Three-Source Legal &amp; Institutional Intelligence
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-600 max-w-xl">
                Every audit combines official Golden 50 statutes (Class A), your institution&apos;s private rate cards &amp; playbooks (Class C), and live official `.gov.ng` circulars (Class D)—eliminating invented circular citations.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Class A · Vault
                </p>
                <p className="mt-1 text-[13px] font-semibold text-zinc-950">
                  141 Statutory PDFs
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  CBN · FCCPC · ARCON · NDPC · SEC
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Class C · Tenant
                </p>
                <p className="mt-1 text-[13px] font-semibold text-zinc-950">
                  Private Rate Cards
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  RLS-isolated playbooks
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Class D · Live Web
                </p>
                <p className="mt-1 text-[13px] font-semibold text-zinc-950">
                  .gov.ng Radar
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  Superseded filter active
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: 5 cols — Deterministic APR / IRR Engine */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-zinc-500">
                02 · LOCK 2 &amp; DRIP-PRICING AUDITOR
              </span>
              <h3 className="mt-2.5 text-[21px] font-semibold tracking-tight text-zinc-950">
                Deterministic Net-Disbursed APR Engine
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
                LLMs never estimate financial percentages. Cogent calculates true net cash disbursed, total cost of credit, and annualized IRR in strict TypeScript.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-white font-mono">
              <div className="flex items-center justify-between text-[10.5px] text-zinc-400 border-b border-zinc-800 pb-2">
                <span>FCCPA §115 RATE CHECK</span>
                <span className="text-rose-400 font-semibold">VARIANCE DETECTED</span>
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Net Disbursed (after 1.5% fee)</span>
                  <span className="tabular-nums text-white">₦49,250.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Repayable (30d @ 4.5%)</span>
                  <span className="tabular-nums text-white">₦52,250.00</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800">
                  <span className="text-zinc-300">Effective Annualized APR</span>
                  <span className="tabular-nums font-semibold text-emerald-400">79.8% p.a.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 4 cols — Flyer OCR & Fine-Print Forensics */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-zinc-500">
                03 · GEMINI VISION FORENSICS
              </span>
              <h3 className="mt-2.5 text-[19px] font-semibold tracking-tight text-zinc-950">
                Flyer OCR &amp; Fine-Print Ratios
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                Extracts bounding boxes on PNG/PDF flyers, flags buried disclaimers under 12% headline height, and checks ARCON ASP IDs.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Disclaimer Height Ratio</span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 font-semibold">
                  0.07 &lt; 0.12
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">ARCON ASP ID</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 font-semibold">
                  UNVETTED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">NDIC MFB Qualifier</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-semibold">
                  ₦2,000,000 OK
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: 4 cols — App Store & 10-Tier License Matrix */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-zinc-500">
                04 · APP STORE &amp; LICENSE LOCKS
              </span>
              <h3 className="mt-2.5 text-[19px] font-semibold tracking-tight text-zinc-950">
                Play Store &amp; BOFIA Scope Matrix
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                Catches &lt;60-day Play Store loan rejections, contact scraping cues, and cross-license violations across 10 Nigerian license tiers.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Play Tenor Floor (&ge;60d)</span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 font-semibold">
                  BLOCK (14d)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">PSB Direct Credit Check</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-semibold">
                  BOFIA §2
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">NDPA Contact Scraping</span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 font-semibold">
                  PROHIBITED
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: 4 cols — Dual Control & Drift Sentinels */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-zinc-500">
                05 · EVIDENCE &amp; DRIFT SENTINEL
              </span>
              <h3 className="mt-2.5 text-[19px] font-semibold tracking-tight text-zinc-950">
                2-Year Dossiers &amp; Live URL Radar
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                Separates Marketing from CCO approval (`approval.decide`), seals SHA-256 PDFs, and re-audits live URLs every 6–24h for drift.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Dossier Hash Chain</span>
                <span className="text-zinc-900 font-semibold">8f4c...e91a</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">FCCPC Reg. 32 Vault</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-semibold">
                  2–7 YR ARCHIVE
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">URL Drift Monitor</span>
                <span className="text-[#2A4BFF] font-semibold">SYNCED · 6H</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
