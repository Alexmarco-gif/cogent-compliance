"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  FileText,
  Check,
  Copy,
  Download,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  STUDIO_WORKFLOW_CASES,
  type StudioWorkflowCase,
} from "@/data/marketing-scenarios";

export function HeroIntelligenceStudio() {
  const [activeId, setActiveId] = useState<StudioWorkflowCase["id"]>("structuring");
  const [liveWebActive, setLiveWebActive] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeCase =
    STUDIO_WORKFLOW_CASES.find((item) => item.id === activeId) ??
    STUDIO_WORKFLOW_CASES[0]!;

  const handleSelectCase = (item: StudioWorkflowCase) => {
    setActiveId(item.id);
    setLiveWebActive(item.liveWebEnabled);
    setCopied(false);
  };

  const handleCopy = async () => {
    const text = [
      activeCase.artifactTitle,
      "",
      ...activeCase.artifactSections.map((s) => `${s.heading}\n${s.body}`),
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback gracefully when clipboard API is blocked
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mt-12 sm:mt-14 text-left">
      {/* Workflow Selector Strip */}
      <div className="mx-auto max-w-[1160px] flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Core Compliance Workflows">
          {STUDIO_WORKFLOW_CASES.map((item, idx) => {
            const active = item.id === activeCase.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectCase(item)}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer border ${
                  active
                    ? "border-[#0B1220] bg-[#0B1220] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#0B1220]"
                }`}
              >
                <span
                  className={`font-mono text-[10.5px] ${
                    active ? "text-blue-300" : "text-slate-400"
                  }`}
                >
                  0{idx + 1}
                </span>
                <span>{item.tabLabel}</span>
              </button>
            );
          })}
        </div>

        <span className="font-mono text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1">
          {activeCase.timeSavedBadge}
        </span>
      </div>

      {/* Crisp 50/50 Split-Screen Intelligence & Document Studio Frame */}
      <div className="mt-4 mx-auto max-w-[1160px] rounded-xl cogent-studio-frame overflow-hidden">
        {/* Top Studio Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="font-semibold text-[#0B1220]">
              Cogent Workspace
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">{activeCase.roleLabel}</span>
          </div>

          {/* Interactive Live Regulatory Search Pill matching user's Part 3 Composer Dock spec */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLiveWebActive((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                liveWebActive
                  ? "border-[#1D4ED8]/30 bg-blue-50 text-[#1D4ED8]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
              title="Parallel retrieval across 141 verified PDFs + Live NG & African regulatory search"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Live Regulatory Search (NG &amp; Africa)</span>
              <span className="ml-1 rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px]">
                {liveWebActive ? "ON" : "VAULT ONLY"}
              </span>
            </button>
          </div>
        </div>

        {/* 50/50 Dual Pane Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT PANE: Prompt, Multi-Source Search Trace & Cited Answer */}
          <div className="lg:col-span-6 p-5 sm:p-6 bg-white flex flex-col justify-between">
            <div className="space-y-5">
              {/* User Question */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Prompt · {activeCase.roleLabel}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#0B1220] font-medium">
                  &ldquo;{activeCase.userPrompt}&rdquo;
                </p>
              </div>

              {/* Active Search Sources Strip */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-2">
                  Parallel Grounded Sources Synthesized
                </p>
                <div className="space-y-1.5">
                  {activeCase.sourcesUsed.map((src) => (
                    <div
                      key={src.tag}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-1.5 text-[12px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-semibold text-[#1D4ED8] shrink-0">
                          {src.tag}
                        </span>
                        <span className="truncate font-medium text-slate-800">
                          {src.label}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] text-slate-500 shrink-0">
                        {src.domain}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Executive Synthesis */}
              <div className="space-y-2.5 pt-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Executive Answer
                </p>
                <ul className="space-y-2">
                  {activeCase.synthesisBullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-700"
                    >
                      <span className="mt-2 h-1 w-1 rounded-full bg-[#1D4ED8] shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {!liveWebActive && (
              <div className="mt-5 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] text-slate-600">
                <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>
                  Vault-only mode searches your 141 verified Nigerian documents &amp; internal manuals. Live web discovery activates on Growth &amp; Scale plans.
                </span>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Finished Editable Work Product Document Canvas */}
          <div className="lg:col-span-6 p-5 sm:p-6 bg-[#FAFBFD] flex flex-col justify-between">
            <div>
              {/* Document Header + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1D4ED8]" />
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                    {activeCase.artifactType}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3 w-3" />
                    <span>PDF / DOCX</span>
                  </Link>
                </div>
              </div>

              {/* Document Title */}
              <h3 className="mt-4 text-[16px] font-semibold text-[#0B1220]">
                {activeCase.artifactTitle}
              </h3>

              {/* Formatted Document Body */}
              <div className="mt-4 space-y-3">
                {activeCase.artifactSections.map((sec) => {
                  const isRedline = sec.highlight === "redline";
                  const isAddition = sec.highlight === "addition";
                  return (
                    <div
                      key={sec.heading}
                      className={`rounded-lg border p-3.5 ${
                        isRedline
                          ? "border-rose-200 bg-rose-50/70"
                          : isAddition
                            ? "border-emerald-200 bg-emerald-50/50"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <p
                        className={`text-[11.5px] font-semibold ${
                          isRedline
                            ? "text-rose-800"
                            : isAddition
                              ? "text-emerald-800"
                              : "text-slate-900"
                        }`}
                      >
                        {sec.heading}
                      </p>
                      <p
                        className={`mt-1.5 text-[12.5px] leading-relaxed ${
                          isRedline
                            ? "text-rose-950 line-through"
                            : isAddition
                              ? "text-emerald-950"
                              : "text-slate-700"
                        }`}
                      >
                        {sec.body}
                      </p>
                    </div>
                  );
                })}

                {/* Cross-Border Comparison Matrix Table when applicable */}
                {activeCase.matrixRows && (
                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2 px-3 font-medium">Requirement</th>
                          <th className="py-2 px-3 font-semibold text-[#0B1220]">Nigeria (CBN)</th>
                          <th className="py-2 px-3 font-semibold text-[#1D4ED8]">Kenya (CBK)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeCase.matrixRows.map((row) => (
                          <tr key={row.metric}>
                            <td className="py-2 px-3 font-medium text-slate-800">{row.metric}</td>
                            <td className="py-2 px-3 text-slate-600">{row.nigeria}</td>
                            <td className="py-2 px-3 text-slate-700">{row.kenya}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3.5 text-[12px]">
              <span className="text-slate-500">
                Editable inside Split-Screen Studio
              </span>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:underline"
              >
                <span>Draft yours in workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
