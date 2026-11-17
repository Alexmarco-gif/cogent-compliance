"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  FileText,
  Calculator,
} from "lucide-react";
import { HERO_SCENARIOS, type HeroScenario } from "@/data/marketing-scenarios";

function renderHighlightedText(copy: string, highlights: string[]) {
  if (!highlights.length) return copy;
  const escaped = highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = copy.split(regex);

  return parts.map((part, idx) => {
    const isMatch = highlights.some((h) => h.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <span
          key={idx}
          className="inline rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-emerald-900 font-medium"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderFlaggedText(copy: string, phrase: string) {
  const idx = copy.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return copy;
  const before = copy.slice(0, idx);
  const match = copy.slice(idx, idx + phrase.length);
  const after = copy.slice(idx + phrase.length);
  return (
    <>
      {before}
      <mark className="rounded bg-rose-50 border-b-2 border-rose-600 px-1 py-0.5 text-rose-950 font-medium">
        {match}
      </mark>
      {after}
    </>
  );
}

export function HeroWorkbenchDemo() {
  const [activeId, setActiveId] = useState<HeroScenario["id"]>("flyer");
  const [resolvedMap, setResolvedMap] = useState<Record<string, boolean>>({});

  const scenario = HERO_SCENARIOS.find((s) => s.id === activeId) ?? HERO_SCENARIOS[0]!;
  const isResolved = Boolean(resolvedMap[scenario.id]);

  const toggleResolved = () => {
    setResolvedMap((prev) => ({
      ...prev,
      [scenario.id]: !prev[scenario.id],
    }));
  };

  return (
    <div className="mx-auto mt-10 max-w-[1040px] rounded-2xl border border-zinc-200 bg-white marketing-frame-shadow overflow-hidden text-left">
      {/* Workbench Chrome Top Bar */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Compliance audit scenarios">
          {HERO_SCENARIOS.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(item.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-950 hover:border-zinc-300"
                }`}
              >
                {item.tabLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2A4BFF]" />
          <span>{scenario.channelBadge}</span>
        </div>
      </div>

      {/* Main Split Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Campaign Copy / Diff Canvas */}
        <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-zinc-200 p-5 sm:p-7 flex flex-col justify-between bg-white">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-400">
                  {isResolved ? "Revision #2 · Lock-Verified Copy" : scenario.submittedTitle}
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-zinc-950">
                  {scenario.campaignTitle}
                </h3>
              </div>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-zinc-600">
                {scenario.productMatched}
              </span>
            </div>

            {/* Document Preview Sheet */}
            <div className="mt-4 rounded-xl border border-zinc-200 bg-[#FAFAFA] p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2.5 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-600">
                  <FileText className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{isResolved ? "Compliant Channel Draft" : "Original Promotional Input"}</span>
                </span>
                <span
                  className={`font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                    isResolved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {isResolved ? "REVISION #2 · PASSED" : "BREACHES DETECTED"}
                </span>
              </div>

              <p className="text-[14px] leading-[1.65] text-zinc-900">
                {isResolved
                  ? renderHighlightedText(scenario.compliantRewrite, scenario.rewriteHighlights)
                  : renderFlaggedText(scenario.submittedCopy, scenario.flaggedPhrase)}
              </p>
            </div>

            {/* APR Telemetry Strip (when applicable) */}
            {scenario.aprSummary && (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3.5">
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-500">
                  <Calculator className="h-3.5 w-3.5 text-[#2A4BFF]" />
                  <span>Deterministic APR &amp; Drip-Pricing Audit</span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                  <div>
                    <span className="block text-[11px] text-zinc-400">Advertised</span>
                    <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                      {scenario.aprSummary.advertised}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zinc-400">True Effective APR</span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        isResolved ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {scenario.aprSummary.effective}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zinc-400">Net Disbursed</span>
                    <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                      {scenario.aprSummary.netDisbursed}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zinc-400">Total Repayable</span>
                    <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                      {scenario.aprSummary.totalRepayable}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Problem -> Consequence Strip */}
          <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                What You Missed
              </p>
              <p className="mt-1 leading-relaxed text-zinc-700">{scenario.blindSpot}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-rose-700">
                Regulatory Exposure
              </p>
              <p className="mt-1 leading-relaxed text-zinc-700">{scenario.consequence}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Flight Gate & Action Control */}
        <div className="lg:col-span-5 bg-zinc-50/80 p-5 sm:p-7 flex flex-col justify-between">
          <div>
            {/* Pre-Flight Verdict Header */}
            <div
              className={`rounded-xl border p-4 transition-colors duration-200 ${
                isResolved
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-rose-200 bg-rose-50/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isResolved ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-rose-700" />
                  )}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-600">
                      Pre-Flight Gate
                    </p>
                    <p
                      className={`text-[15px] font-semibold tracking-tight ${
                        isResolved ? "text-emerald-950" : "text-rose-950"
                      }`}
                    >
                      {isResolved ? "PASS — Ready for CCO Sign-Off" : `${scenario.initialVerdict} — Publication Halted`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block font-mono text-[10px] uppercase text-zinc-500">Risk</span>
                  <span
                    className={`font-mono text-[16px] font-semibold tabular-nums ${
                      isResolved ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {isResolved ? scenario.resolvedRiskScore : scenario.riskScore}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Deterministic Locks 1-3 */}
            <div className="mt-4 space-y-2">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-500">
                Deterministic Lock Execution
              </p>

              {[scenario.locks.lock1, scenario.locks.lock2, scenario.locks.lock3].map(
                (lock) => {
                  const passed = isResolved ? true : lock.initial === "PASS";
                  return (
                    <div
                      key={lock.label}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[12.5px]"
                    >
                      <span className="font-medium text-zinc-800">{lock.label}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10.5px] font-semibold ${
                          passed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {passed ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {/* Statutory Provenance Chips */}
            <div className="mt-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-500">
                Verified Statutory Authorities
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scenario.statutes.map((statute) => (
                  <span
                    key={statute}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-800"
                  >
                    [{statute}]
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Remediation Button */}
          <div className="mt-5 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={toggleResolved}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                isResolved
                  ? "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                  : "bg-zinc-950 text-white hover:bg-zinc-800"
              }`}
            >
              {isResolved ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Original Breach</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Apply Lock-Verified Rewrite</span>
                </>
              )}
            </button>
            <p className="mt-2 text-center font-mono text-[10.5px] text-zinc-400">
              Interactive simulation of Cogent&apos;s Layer-6 self-corrected rewrite engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
