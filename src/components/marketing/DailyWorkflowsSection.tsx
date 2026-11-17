"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Scale,
  ClipboardCheck,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  DAILY_WORKFLOW_LEDGER,
  type WorkflowCompressionRow,
} from "@/data/marketing-scenarios";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

const AUTO_ADVANCE_MS = 5500;

const WORKFLOW_ICONS = [FileText, Scale, ClipboardCheck, Globe, ShieldCheck];

export function DailyWorkflowsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRow: WorkflowCompressionRow =
    DAILY_WORKFLOW_LEDGER[activeIndex] ?? DAILY_WORKFLOW_LEDGER[0]!;
  const ActiveIcon = WORKFLOW_ICONS[activeIndex] ?? FileText;

  // Auto-advance loop line-to-line matching asdo.JPG reference
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % DAILY_WORKFLOW_LEDGER.length);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const handleSelect = (idx: number) => {
    setActiveIndex(idx);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  return (
    <section
      id="workflows"
      className="border-y border-slate-200 bg-[#FAFBFD] py-20 lg:py-24 scroll-mt-16"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Centered Section Header per delete.JPG (red-marked text removed) */}
        <RevealOnScroll>
          <div className="mx-auto max-w-3xl text-center mb-10 sm:mb-12">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
              THE DAILY BOTTLENECK
            </p>
            <h2 className="mt-3 text-[30px] sm:text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#0B1220]">
              Why compliance work takes 3 to 10 days—{" "}
              <span className="text-[#1D4ED8] block sm:inline">
                and how Cogent compresses it to minutes.
              </span>
            </h2>
          </div>
        </RevealOnScroll>

        {/* Split Interactive Stage Inspired by asdo.JPG */}
        <RevealOnScroll delayMs={80}>
          <div
            className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-900/10 bg-[#0B1220] shadow-2xl lg:grid-cols-12"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Left Dark Column: Progressive Animated List (asdo.JPG style) */}
            <div className="flex flex-col justify-between border-b border-white/10 p-7 sm:p-10 lg:col-span-5 lg:border-b-0 lg:border-r">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#38BDF8]">
                    BENCHMARKS · WORKFLOW COMPRESSION
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-blue-300">
                    <span className="relative flex h-2 w-2">
                      {!isPaused && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      )}
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#38BDF8]" />
                    </span>
                    <span>{isPaused ? "Paused" : "Auto-playing"}</span>
                  </span>
                </div>

                <h3 className="mt-4 font-serif text-[26px] sm:text-[32px] font-normal leading-tight text-white">
                  Five daily workflows. <br />
                  <span className="italic text-slate-400">Compressed to minutes.</span>
                </h3>

                <p className="mt-3 text-[13.5px] leading-relaxed text-slate-300">
                  Select a workflow or watch the live line-to-line comparison of how financial teams operate today versus with Cogent.
                </p>

                {/* Animated Line-by-Line List */}
                <div className="mt-8 space-y-2" role="tablist" aria-label="Workflows">
                  {DAILY_WORKFLOW_LEDGER.map((row, idx) => {
                    const isActive = idx === activeIndex;
                    const Icon = WORKFLOW_ICONS[idx] ?? FileText;

                    return (
                      <button
                        key={row.number}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleSelect(idx)}
                        className={`group relative flex w-full flex-col items-start rounded-lg p-3 text-left transition-all cursor-pointer ${
                          isActive
                            ? "bg-white/10 text-white shadow-inner"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                      >
                        {/* Left Active Indicator Line with Animated Fill */}
                        <div
                          className={`absolute inset-y-2 left-0 w-1 rounded-r transition-all duration-300 ${
                            isActive ? "bg-[#38BDF8]" : "bg-transparent group-hover:bg-white/20"
                          }`}
                        />

                        <div className="flex w-full items-center justify-between pl-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`font-mono text-[11px] font-bold ${
                                isActive ? "text-[#38BDF8]" : "text-slate-500"
                              }`}
                            >
                              {row.number}
                            </span>
                            <span
                              className={`text-[14px] font-medium leading-snug ${
                                isActive ? "font-semibold text-white" : "text-slate-300"
                              }`}
                            >
                              {row.workflow}
                            </span>
                          </div>

                          <span
                            className={`font-mono text-[11px] shrink-0 ${
                              isActive ? "text-emerald-400 font-semibold" : "text-slate-500"
                            }`}
                          >
                            {row.cogentSpeed}
                          </span>
                        </div>

                        {/* Expanded details when active */}
                        {isActive && (
                          <div className="mt-2 pl-6 animate-cogent-enter">
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400">
                              {row.audience}
                            </span>
                            {/* Subtle line progress indicator */}
                            {!isPaused && (
                              <div className="mt-2 h-0.5 w-full overflow-hidden rounded bg-white/10">
                                <div
                                  className="h-full bg-[#38BDF8] transition-all"
                                  style={{
                                    animation: `cogentProgress ${AUTO_ADVANCE_MS}ms linear infinite`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-4 text-[12px] text-slate-400">
                <span className="font-mono text-[11px] text-[#38BDF8]">
                  Step 0{activeIndex + 1} of 0{DAILY_WORKFLOW_LEDGER.length}
                </span>{" "}
                · Click any line to inspect
              </div>
            </div>

            {/* Right Light Column: Comparative Canvas & Work Product Preview */}
            <div className="flex flex-col justify-between bg-white p-7 sm:p-10 lg:col-span-7">
              <div key={activeRow.number} className="animate-cogent-enter space-y-6">
                {/* Header of Active Workflow */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1220] text-white">
                      <ActiveIcon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                        {activeRow.audience}
                      </p>
                      <h4 className="text-[18px] sm:text-[20px] font-semibold text-[#0B1220]">
                        {activeRow.workflow}
                      </h4>
                    </div>
                  </div>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[11.5px] font-semibold text-emerald-800">
                    Accelerated: {activeRow.cogentSpeed}
                  </span>
                </div>

                {/* Comparative Grid: Today (Stalled) vs With Cogent */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* How It Stalls Today */}
                  <div className="flex flex-col justify-between rounded-xl border border-rose-200 bg-rose-50/40 p-5">
                    <div>
                      <div className="flex items-center gap-2 text-rose-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                          How It Stalls Today (3–10 Days)
                        </span>
                      </div>
                      <p className="mt-3 text-[13.5px] leading-relaxed text-slate-700">
                        {activeRow.todayPain}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 border-t border-rose-200/60 pt-3 font-mono text-[11px] text-rose-700">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Bottleneck: 3 to 10 days</span>
                    </div>
                  </div>

                  {/* Finished Deliverable with Cogent */}
                  <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                          Finished Deliverable with Cogent
                        </span>
                      </div>
                      <p className="mt-3 text-[13.5px] leading-relaxed font-medium text-[#0B1220]">
                        {activeRow.outputProduced}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 border-t border-emerald-200/60 pt-3 font-mono text-[11px] font-semibold text-emerald-800">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Delivered in {activeRow.cogentSpeed}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Studio Output Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="font-mono text-[10.5px] font-semibold uppercase text-slate-500">
                      Ready-to-sign deliverable format
                    </span>
                    <span className="font-mono text-[10px] text-[#1D4ED8] font-medium">
                      Verified Statutory Grounding
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-slate-700 border border-slate-200">
                      CBN &amp; BOFIA 2020
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-slate-700 border border-slate-200">
                      NDPA 2023 §41
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-slate-700 border border-slate-200">
                      FCCPC DEON
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-slate-700 border border-slate-200">
                      WORM Audit Dossier
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Strip */}
              <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[12.5px] text-slate-500">
                  Ready to test with your internal policies and rate cards?
                </span>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1D4ED8] hover:underline"
                >
                  <span>Test this workflow in 5 minutes</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
