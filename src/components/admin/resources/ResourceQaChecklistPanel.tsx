"use client";

import React from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { ResourceSeoQaReport } from "@/modules/resources/resources-playbook.helpers";
import type { EditorFormState } from "./editor-types";

interface ResourceQaChecklistPanelProps {
  form: EditorFormState;
  setForm: React.Dispatch<React.SetStateAction<EditorFormState>>;
  qaReport: ResourceSeoQaReport;
}

export function ResourceQaChecklistPanel({
  form,
  setForm,
  qaReport,
}: ResourceQaChecklistPanelProps) {
  const pct = Math.round((qaReport.passedCount / qaReport.totalCount) * 100);
  const targetWords = Number.parseInt(form.targetWordCount, 10) || 1500;

  const toggleManualCheck = (
    field: "qaStatutoryAccuracyVerified" | "qaRepealedRuleChecked",
    checked: boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: checked,
      qaReviewedAt: checked ? new Date().toISOString() : prev.qaReviewedAt,
    }));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
          <h3 className="text-[13.5px] font-semibold text-[#0B1220]">
            12-Point Maker-Checker QA
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
            qaReport.readyToPublish
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          {qaReport.passedCount} / {qaReport.totalCount}
        </span>
      </div>

      {/* Progress Bar & Live Counters */}
      <div className="space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all ${
              qaReport.readyToPublish ? "bg-emerald-500" : "bg-[#1D4ED8]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10.5px]">
          <div className="rounded bg-slate-50 px-2 py-1 border border-slate-100">
            <span className="block text-slate-400">WORDS</span>
            <span className="font-semibold text-[#0B1220]">
              {qaReport.wordCount}
              <span className="text-slate-400">/{targetWords}</span>
            </span>
          </div>
          <div className="rounded bg-slate-50 px-2 py-1 border border-slate-100">
            <span className="block text-slate-400">INT LINKS</span>
            <span className="font-semibold text-[#0B1220]">{qaReport.internalLinkCount}/3</span>
          </div>
          <div className="rounded bg-slate-50 px-2 py-1 border border-slate-100">
            <span className="block text-slate-400">.GOV.NG</span>
            <span className="font-semibold text-[#0B1220]">{qaReport.govOutlinkCount}/2</span>
          </div>
        </div>
      </div>

      {/* Manual Checker Sign-Off Controls */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
          SME CHECKER SIGN-OFF
        </p>
        <label className="flex items-start gap-2 text-[12px] text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={form.qaStatutoryAccuracyVerified}
            onChange={(e) => toggleManualCheck("qaStatutoryAccuracyVerified", e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
          />
          <span>Statutory codes, sections &amp; dates verified against primary sources</span>
        </label>
        <label className="flex items-start gap-2 text-[12px] text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={form.qaRepealedRuleChecked}
            onChange={(e) => toggleManualCheck("qaRepealedRuleChecked", e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
          />
          <span>Repealed / superseded circular check completed</span>
        </label>
        <input
          type="text"
          value={form.qaReviewerName}
          onChange={(e) => setForm((prev) => ({ ...prev, qaReviewerName: e.target.value }))}
          placeholder="Checker / Legal Reviewer Name (optional)"
          className="w-full rounded-md border border-blue-200/80 bg-white px-2.5 py-1 text-[11.5px] focus:border-[#1D4ED8] focus:outline-none"
        />
      </div>

      {/* Automated 10-Point Live Checks */}
      <ul className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
        {qaReport.gates
          .filter((g) => g.mode === "auto")
          .map((gate) => (
            <li
              key={gate.id}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-[11.5px] hover:bg-slate-50"
            >
              {gate.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p
                  className={`font-medium leading-tight ${
                    gate.passed ? "text-slate-700" : "text-[#0B1220]"
                  }`}
                >
                  {gate.label}
                </p>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{gate.detail}</p>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
