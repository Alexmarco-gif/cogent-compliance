"use client";

import React from "react";
import { CalendarClock, CheckCircle2, Plus, Scale, Target, Trash2 } from "lucide-react";
import {
  CONTENT_PILLARS,
  CONTENT_PILLAR_META,
  TARGET_PERSONAS,
  TARGET_PERSONA_META,
  WORKFLOW_STAGES,
  WORKFLOW_STAGE_META,
  WORKFLOW_TRACKS,
  WORKFLOW_TRACK_META,
  type ContentPillar,
  type TargetPersona,
  type WorkflowStage,
  type WorkflowTrack,
} from "@/contracts/resources.contracts";
import { calculatePriorityScore } from "@/modules/resources/resources-playbook.helpers";
import { toDateInputValue, type EditorFormState } from "./editor-types";

const REGULATOR_OPTIONS = ["CBN", "SEC", "NDPC", "FCCPC", "NFIU", "ARCON", "CAC", "CBK", "BoG"];

interface ResourceBriefPanelProps {
  form: EditorFormState;
  setForm: React.Dispatch<React.SetStateAction<EditorFormState>>;
  onApplyPillarTemplate: (pillar: ContentPillar) => void;
}

export function ResourceBriefPanel({
  form,
  setForm,
  onApplyPillarTemplate,
}: ResourceBriefPanelProps) {
  const priority = calculatePriorityScore(
    form.priorityUrgency,
    form.priorityCommercial,
    form.priorityWinnability,
  );

  const toggleRegulator = (reg: string) => {
    setForm((prev) => ({
      ...prev,
      regulators: prev.regulators.includes(reg)
        ? prev.regulators.filter((r) => r !== reg)
        : [...prev.regulators, reg],
    }));
  };

  const addSource = () => {
    setForm((prev) => ({
      ...prev,
      authoritativeSources: [...prev.authoritativeSources, { title: "", code: "", url: "" }],
    }));
  };

  const updateSource = (idx: number, field: "title" | "code" | "url", value: string) => {
    setForm((prev) => ({
      ...prev,
      authoritativeSources: prev.authoritativeSources.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const removeSource = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      authoritativeSources: prev.authoritativeSources.filter((_, i) => i !== idx),
    }));
  };

  const markAuditedToday = () => {
    const now = new Date();
    const plus30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const monthYear = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    setForm((prev) => ({
      ...prev,
      lastStatutoryAuditAt: toDateInputValue(now.toISOString()),
      refreshDueAt: toDateInputValue(plus30.toISOString()),
      updateCalloutNote:
        prev.updateCalloutNote.trim() ||
        `Updated ${monthYear}: Verified against active CBN, NDPC, SEC & FCCPC directives.`,
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Phase 1 Strategy & Priority Scoring */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[#1D4ED8]" />
              <h3 className="text-[14px] font-semibold text-[#0B1220]">
                Phase 1 · Strategy, ICP Persona &amp; Pillar Alignment
              </h3>
            </div>
            {form.contentPillar && (
              <button
                type="button"
                onClick={() => onApplyPillarTemplate(form.contentPillar as ContentPillar)}
                className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11.5px] font-semibold text-[#1D4ED8] hover:bg-blue-100 cursor-pointer"
              >
                Load {CONTENT_PILLAR_META[form.contentPillar as ContentPillar].code} Template
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Content Pillar (Target Ratio)
              </label>
              <select
                value={form.contentPillar}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    contentPillar: e.target.value as ContentPillar | "",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="">Select Content Pillar...</option>
                {CONTENT_PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {CONTENT_PILLAR_META[p].code}: {CONTENT_PILLAR_META[p].shortLabel} (
                    {CONTENT_PILLAR_META[p].targetPercent}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Primary ICP Persona
              </label>
              <select
                value={form.targetPersona}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    targetPersona: e.target.value as TargetPersona | "",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="">Select Target Persona...</option>
                {TARGET_PERSONAS.map((persona) => (
                  <option key={persona} value={persona}>
                    {TARGET_PERSONA_META[persona].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Workflow Speed Track
              </label>
              <select
                value={form.workflowTrack}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    workflowTrack: e.target.value as WorkflowTrack | "",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="">Select Track...</option>
                {WORKFLOW_TRACKS.map((track) => (
                  <option key={track} value={track}>
                    {WORKFLOW_TRACK_META[track].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Editorial Workflow Stage
              </label>
              <select
                value={form.workflowStage}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    workflowStage: e.target.value as WorkflowStage,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
              >
                {WORKFLOW_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {WORKFLOW_STAGE_META[stage].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.targetPersona && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3.5 py-2.5 text-[12px] text-slate-700">
              <strong className="text-[#1D4ED8]">Winning Hook Angle:</strong>{" "}
              {TARGET_PERSONA_META[form.targetPersona as TargetPersona].hookAngle}
            </div>
          )}

          {/* 3-Factor Priority Scorer */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-600">
                3-Factor Priority Score (Greenlight ≥ 11/15)
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11.5px] font-semibold ${
                  priority.greenlit
                    ? "bg-emerald-100 text-emerald-800"
                    : priority.hasAllFactors
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-200 text-slate-700"
                }`}
              >
                {priority.greenlit && <CheckCircle2 className="h-3.5 w-3.5" />}
                {priority.total} / 15 {priority.greenlit ? "· GREENLIGHT" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  ["priorityUrgency", "Urgency / Velocity (U)"],
                  ["priorityCommercial", "Commercial Fit (C)"],
                  ["priorityWinnability", "SERP Winnability (W)"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <p className="text-[11px] font-medium text-slate-600 mb-1.5">{label}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, [field]: score }))}
                        className={`flex-1 rounded-md py-1 font-mono text-[12px] font-semibold transition-colors cursor-pointer ${
                          form[field] === score
                            ? "bg-[#1D4ED8] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase 2: Keyword Intelligence & Content Brief */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-[14px] font-semibold text-[#0B1220]">
            Phase 2 · Keyword Intelligence &amp; Research Brief
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-[11.5px] font-medium text-slate-600">
                Primary Target Keyword (Checked in H1 &amp; First 100 Words)
              </label>
              <input
                type="text"
                value={form.primaryKeyword}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryKeyword: e.target.value }))}
                placeholder="e.g., CBN data localization deadline Nigeria"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Target Word Count
              </label>
              <input
                type="number"
                min={200}
                max={15000}
                value={form.targetWordCount}
                onChange={(e) => setForm((prev) => ({ ...prev, targetWordCount: e.target.value }))}
                placeholder="1800"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-mono focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-600">
              Secondary &amp; Semantic Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={form.secondaryKeywordsText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, secondaryKeywordsText: e.target.value }))
              }
              placeholder="CBN payment transaction data storage Nigeria, local hosting rules fintech, NDPA data localization"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-600">
              SERP Gap Analysis &amp; Information Gain (What Competitors Lack)
            </label>
            <textarea
              rows={2}
              value={form.serpGapNotes}
              onChange={(e) => setForm((prev) => ({ ...prev, serpGapNotes: e.target.value }))}
              placeholder="e.g., Current top results are unindexed 40-page CBN PDFs with no actionable PSSP/MMO checklist or penalty table."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-600">
              Cogent Product Tie-In (Which Workflow Solves This in &lt; 5 Mins)
            </label>
            <textarea
              rows={2}
              value={form.productTieIn}
              onChange={(e) => setForm((prev) => ({ ...prev, productTieIn: e.target.value }))}
              placeholder="e.g., Workflow 02: Upload existing AML manual -> Cogent flags outdated CBN/NFIU clauses & exports DOCX redline."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Right: Regulatory Snapshot & Phase 6 Freshness */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#1D4ED8]" />
            <h3 className="text-[14px] font-semibold text-[#0B1220]">
              Regulatory Snapshot Card (Rendered on Article)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Circular / Statute Reference Code
              </label>
              <input
                type="text"
                value={form.circularCode}
                onChange={(e) => setForm((prev) => ({ ...prev, circularCode: e.target.value }))}
                placeholder="e.g., BSD/DIR/PUB/LAB/019/002"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Effective / Compliance Deadline
              </label>
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1.5">
              Regulators Covered
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REGULATOR_OPTIONS.map((reg) => {
                const active = form.regulators.includes(reg);
                return (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => toggleRegulator(reg)}
                    className={`rounded-md px-2.5 py-1 font-mono text-[11.5px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[#1D4ED8] text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#1D4ED8]"
                    }`}
                  >
                    {reg}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Statutory Sources */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-semibold text-slate-600">
                Primary Statutory Sources (Official .gov.ng Links)
              </label>
              <button
                type="button"
                onClick={addSource}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Add Source
              </button>
            </div>

            {form.authoritativeSources.length === 0 ? (
              <p className="text-[12px] text-slate-400">
                Add cited acts, circulars, and official .gov.ng links to display in the Regulatory
                Snapshot and boost E-E-A-T QA.
              </p>
            ) : (
              <div className="space-y-2">
                {form.authoritativeSources.map((src, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={src.title}
                        onChange={(e) => updateSource(idx, "title", e.target.value)}
                        placeholder="e.g., Nigeria Data Protection Act (NDPA) 2023"
                        className="flex-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[12px] focus:border-[#1D4ED8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSource(idx)}
                        className="rounded p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={src.code || ""}
                        onChange={(e) => updateSource(idx, "code", e.target.value)}
                        placeholder="Section / Code (e.g., §41)"
                        className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11.5px] focus:border-[#1D4ED8] focus:outline-none"
                      />
                      <input
                        type="url"
                        value={src.url || ""}
                        onChange={(e) => updateSource(idx, "url", e.target.value)}
                        placeholder="https://www.cbn.gov.ng/..."
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-[11.5px] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Phase 6: 30-Day Freshness & Refresh SOP */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#1D4ED8]" />
              <h3 className="text-[14px] font-semibold text-[#0B1220]">
                Phase 6 · 30-Day Freshness &amp; Addendum
              </h3>
            </div>
            <button
              type="button"
              onClick={markAuditedToday}
              className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              Audited Today (+30d)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Last Statutory Audit
              </label>
              <input
                type="date"
                value={form.lastStatutoryAuditAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastStatutoryAuditAt: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600">
                Next Refresh Due
              </label>
              <input
                type="date"
                value={form.refreshDueAt}
                onChange={(e) => setForm((prev) => ({ ...prev, refreshDueAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-600">
              Top-of-Article Regulatory Update Callout (Optional)
            </label>
            <textarea
              rows={2}
              value={form.updateCalloutNote}
              onChange={(e) => setForm((prev) => ({ ...prev, updateCalloutNote: e.target.value }))}
              placeholder="e.g., Updated Nov 2026: Incorporates CBN's latest addendum extending the compliance window."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
