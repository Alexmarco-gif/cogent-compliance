import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

const QUEUE_ITEMS = [
  {
    title: "USD Virtual Card Structuring Memo",
    meta: "CBN FX · NDPA §41 · FCCPC Disclosures",
    status: "Export Ready",
    tone: "emerald" as const,
  },
  {
    title: "AML Policy v2.5 — Clause Redlines",
    meta: "Matched against latest CBN/NFIU circulars",
    status: "3 Clauses Updated",
    tone: "blue" as const,
  },
  {
    title: "Sponsor-Bank Due-Diligence Reply (Q1–Q40)",
    meta: "Grounded in internal SOPs & BOFIA 2020",
    status: "CCO Sign-Off",
    tone: "slate" as const,
  },
  {
    title: "QuickCash Flyer + Live Pricing Watcher",
    meta: "Checked against 4.5%/mo rate card · Daily watch",
    status: "Cleared",
    tone: "emerald" as const,
  },
];

export function ExecutiveCtaBanner() {
  return (
    <section className="border-t border-slate-200 bg-[#FAFBFD] py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <RevealOnScroll>
          <div className="rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-sm">
            {/* Left Deep Ink Action Pane with Blue Accent */}
            <div className="lg:col-span-6 bg-[#0B1220] p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between">
              <div>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-blue-400">
                  GET STARTED IN MINUTES
                </p>
                <h2 className="mt-4 text-[30px] sm:text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
                  Turn week-long compliance bottlenecks into five-minute work product.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
                  Create your private workspace in minutes. Draft your first structuring memo, compare an updated CBN circular against your AML manual, or verify a launch free.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1D4ED8] px-6 text-[13.5px] font-semibold text-white hover:bg-[#2563EB] transition-colors"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/company"
                    className="inline-flex h-11 items-center rounded-md border border-slate-700 bg-transparent px-5 text-[13.5px] font-medium text-slate-200 hover:bg-slate-800/60 transition-colors"
                  >
                    About Stem Systems
                  </Link>
                </div>

                <p className="font-mono text-[11px] text-slate-400">
                  No credit card required · 7-day evaluation · Complete Nigerian Statutory Scope
                </p>
              </div>
            </div>

            {/* Right Architectural Deliverable Queue */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200">
              <div className="rounded-lg border border-slate-200 bg-[#FAFBFD] overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[#1D4ED8]" />
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B1220]">
                      Workspace Deliverables
                    </span>
                  </div>
                  <span className="font-mono text-[10.5px] text-slate-500">
                    NG &amp; Africa Scope
                  </span>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  {QUEUE_ITEMS.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#0B1220]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                          {item.meta}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 shrink-0 rounded px-2 py-0.5 font-mono text-[10.5px] font-semibold border ${
                          item.tone === "emerald"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : item.tone === "blue"
                              ? "border-blue-200 bg-blue-50 text-[#1D4ED8]"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {item.tone === "emerald" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
