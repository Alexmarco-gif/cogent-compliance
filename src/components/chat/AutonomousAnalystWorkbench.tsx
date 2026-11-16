"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Sparkles,
  FileCheck2,
  Calculator,
  Table2,
  Stamp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type {
  ExecutionPlanStep,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";

export interface AgentExecutionPlanProps {
  steps: ExecutionPlanStep[];
}

export function AgentExecutionPlanCard({ steps }: AgentExecutionPlanProps) {
  const [expanded, setExpanded] = useState(true);
  if (!steps || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === "COMPLETED").length;
  const isAllDone = completedCount === steps.length;

  return (
    <div className="my-3 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-[12.5px]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isAllDone ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 text-zinc-700 animate-spin shrink-0" />
          )}
          <span className="font-medium text-zinc-900">
            Autonomous Compliance Workflow Plan
          </span>
          <span className="font-mono text-[11px] text-zinc-500">
            ({completedCount}/{steps.length} steps)
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-zinc-200/70 space-y-1.5">
          {steps.map((step) => (
            <div
              key={step.step_id}
              className="flex items-start justify-between gap-3 text-[12px]"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="font-mono text-[11px] text-zinc-400 mt-0.5">
                  {step.step_number}.
                </span>
                <div className="min-w-0">
                  <p
                    className={
                      step.status === "COMPLETED"
                        ? "text-zinc-800 font-medium"
                        : step.status === "RUNNING"
                          ? "text-zinc-950 font-semibold"
                          : "text-zinc-400"
                    }
                  >
                    {step.title}
                  </p>
                  {step.summary && (
                    <p className="text-[11px] text-zinc-500 truncate">{step.summary}</p>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 font-mono text-[10.5px] px-1.5 py-0.5 rounded ${
                  step.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : step.status === "RUNNING"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {step.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface AutonomousAnalystWorkbenchProps {
  report: StructuredComplianceReport;
  onInspectEvidence?: (clauseId: string) => void;
  onApplyCompliantRewrite?: (rewrittenCopy: string) => Promise<void> | void;
  onApproveAndSealDossier?: (rewrittenCopy: string) => Promise<void> | void;
}

export function AutonomousAnalystWorkbench({
  report,
  onInspectEvidence,
  onApplyCompliantRewrite,
  onApproveAndSealDossier,
}: AutonomousAnalystWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<"REWRITE" | "KFS" | "ASP">("REWRITE");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [applyingRewrite, setApplyingRewrite] = useState(false);
  const [rewriteApplied, setRewriteApplied] = useState(false);
  const [sealingDossier, setSealingDossier] = useState(false);
  const [dossierSealed, setDossierSealed] = useState(false);

  const { pre_flight_gate, blind_spot_findings, artifacts } = report;
  const apr = pre_flight_gate.apr_audit;

  const copyText = (key: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyRewrite = async (copyToApply: string) => {
    if (!onApplyCompliantRewrite || applyingRewrite) return;
    setApplyingRewrite(true);
    try {
      await onApplyCompliantRewrite(copyToApply);
      setRewriteApplied(true);
    } finally {
      setApplyingRewrite(false);
    }
  };

  const handleSealDossier = async () => {
    if (!onApproveAndSealDossier || sealingDossier) return;
    setSealingDossier(true);
    try {
      const targetCopy =
        artifacts.compliant_rewrite?.rewritten_copy || "Verified compliant campaign copy.";
      await onApproveAndSealDossier(targetCopy);
      setDossierSealed(true);
    } finally {
      setSealingDossier(false);
    }
  };

  const gateStyles =
    pre_flight_gate.verdict === "BLOCK"
      ? {
          border: "border-rose-200",
          bg: "bg-rose-50/60",
          badgeBg: "bg-rose-600 text-white",
          icon: <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />,
          label: "PRE-FLIGHT GATE: BLOCK (DO NOT PUBLISH)",
        }
      : pre_flight_gate.verdict === "CONDITIONAL"
        ? {
            border: "border-amber-200",
            bg: "bg-amber-50/60",
            badgeBg: "bg-amber-600 text-white",
            icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
            label: "PRE-FLIGHT GATE: CONDITIONAL (REDLINES REQUIRED)",
          }
        : {
            border: "border-emerald-200",
            bg: "bg-emerald-50/60",
            badgeBg: "bg-emerald-600 text-white",
            icon: <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />,
            label: "PRE-FLIGHT GATE: PASS (READY FOR SIGN-OFF)",
          };

  return (
    <div className="my-4 space-y-4">
      {/* 1. Pre-Flight Approval Gate & Deterministic Lock Summary */}
      <div className={`rounded-xl border ${gateStyles.border} ${gateStyles.bg} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {gateStyles.icon}
            <span className="font-mono text-[11.5px] font-bold tracking-tight text-zinc-900">
              {gateStyles.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-800">
              Risk Score: <strong>{pre_flight_gate.risk_score}/100</strong>
            </span>
            <span
              className={`font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded ${gateStyles.badgeBg}`}
            >
              {pre_flight_gate.verdict}
            </span>
          </div>
        </div>

        {/* 3 Mechanical Locks Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div className="rounded-lg bg-white/90 border border-zinc-200/80 px-3 py-2 flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-600">Lock 1: Prohibited Terms</span>
            <span
              className={`font-mono font-semibold ${
                pre_flight_gate.lock_summary.lock1_prohibited_terms === "PASS"
                  ? "text-emerald-700"
                  : "text-rose-600"
              }`}
            >
              {pre_flight_gate.lock_summary.lock1_prohibited_terms}
            </span>
          </div>
          <div className="rounded-lg bg-white/90 border border-zinc-200/80 px-3 py-2 flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-600">Lock 2: Rate Card Match</span>
            <span
              className={`font-mono font-semibold ${
                pre_flight_gate.lock_summary.lock2_product_rate_match === "PASS"
                  ? "text-emerald-700"
                  : "text-rose-600"
              }`}
            >
              {pre_flight_gate.lock_summary.lock2_product_rate_match}
            </span>
          </div>
          <div className="rounded-lg bg-white/90 border border-zinc-200/80 px-3 py-2 flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-600">Lock 3: Disclosures</span>
            <span
              className={`font-mono font-semibold ${
                pre_flight_gate.lock_summary.lock3_mandatory_disclosures === "PASS"
                  ? "text-emerald-700"
                  : "text-rose-600"
              }`}
            >
              {pre_flight_gate.lock_summary.lock3_mandatory_disclosures}
            </span>
          </div>
        </div>

        {/* Deterministic APR & Drip-Pricing Strip */}
        {apr && (
          <div className="rounded-lg bg-white border border-zinc-200 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11.5px]">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                <Calculator className="h-3.5 w-3.5 text-zinc-600" />
                <span>
                  Deterministic CBN APR & Drip-Pricing Engine ({apr.product_name})
                </span>
              </div>
              {apr.drip_pricing_detected && (
                <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  DRIP PRICING / APR MISMATCH
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[12px]">
              <div>
                <p className="text-[10.5px] text-zinc-500">Flyer Implied APR</p>
                <p className="font-mono font-semibold text-zinc-900">
                  {apr.advertised_implied_apr}% p.a.
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-zinc-500">True Rate-Card APR</p>
                <p
                  className={`font-mono font-bold ${
                    apr.drip_pricing_detected ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {apr.effective_nominal_apr}% p.a.
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-zinc-500">Net Cash Disbursed</p>
                <p className="font-mono font-semibold text-zinc-900">
                  ₦{apr.net_disbursed_ngn.toLocaleString("en-NG")}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-zinc-500">
                  Total Repayable ({apr.tenor_days}d)
                </p>
                <p className="font-mono font-semibold text-zinc-900">
                  ₦{apr.total_repayment_ngn.toLocaleString("en-NG")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Silent Blind-Spot Cards (Problem -> Risk -> Fix) */}
      {blind_spot_findings.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-zinc-900">
              Silent Blind-Spot Detection ({blind_spot_findings.length} Findings)
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              Formula: What You Missed → What It Costs You → One-Click Fix
            </span>
          </div>

          {blind_spot_findings.map((finding, idx) => (
            <div
              key={`${finding.finding_code}_${idx}`}
              className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[10.5px] font-bold px-2 py-0.5 rounded ${
                      finding.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : finding.severity === "HIGH"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                    }`}
                  >
                    {finding.severity}
                  </span>
                  <span className="font-mono text-[11.5px] font-semibold text-zinc-900">
                    {finding.finding_code}
                  </span>
                </div>

                {finding.regulatory_clause_id ? (
                  <button
                    type="button"
                    onClick={() =>
                      finding.regulatory_clause_id &&
                      onInspectEvidence?.(finding.regulatory_clause_id)
                    }
                    className="font-mono text-[11px] text-zinc-600 hover:text-zinc-950 underline cursor-pointer"
                  >
                    {finding.violated_statute}
                  </button>
                ) : (
                  <span className="font-mono text-[11px] text-zinc-500">
                    {finding.violated_statute}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[12.5px]">
                <div className="rounded-lg bg-zinc-50 border border-zinc-200/70 p-2.5">
                  <p className="font-mono text-[10.5px] font-semibold uppercase text-zinc-500 mb-1">
                    1. What You Missed (Blind Spot)
                  </p>
                  <p className="text-zinc-800 leading-snug">{finding.what_you_missed}</p>
                </div>

                <div className="rounded-lg bg-rose-50/40 border border-rose-200/70 p-2.5">
                  <p className="font-mono text-[10.5px] font-semibold uppercase text-rose-700 mb-1">
                    2. What It Costs You (Penalty)
                  </p>
                  <p className="text-zinc-800 leading-snug">{finding.what_it_costs_you}</p>
                </div>

                <div className="rounded-lg bg-emerald-50/40 border border-emerald-200/70 p-2.5 flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-[10.5px] font-semibold uppercase text-emerald-800 mb-1">
                      3. One-Click Resolution
                    </p>
                    <p className="text-zinc-800 leading-snug">{finding.one_click_fix}</p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(`fix_${idx}`, finding.one_click_fix)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:underline cursor-pointer"
                    >
                      {copiedKey === `fix_${idx}` ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Fix</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Concrete Compliance Artifacts (Compliant Rewrite, CBN KFS Table, ARCON ASP Memo) */}
      {(artifacts.compliant_rewrite || artifacts.kfs_table || artifacts.arcon_asp_memo) && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="bg-zinc-50 border-b border-zinc-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {artifacts.compliant_rewrite && (
                <button
                  type="button"
                  onClick={() => setActiveTab("REWRITE")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                    activeTab === "REWRITE"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-200/60"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Compliant Rewrite & SMS</span>
                </button>
              )}

              {artifacts.kfs_table && (
                <button
                  type="button"
                  onClick={() => setActiveTab("KFS")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                    activeTab === "KFS"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-200/60"
                  }`}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  <span>CBN Key Facts Statement (KFS)</span>
                </button>
              )}

              {artifacts.arcon_asp_memo && (
                <button
                  type="button"
                  onClick={() => setActiveTab("ASP")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                    activeTab === "ASP"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-200/60"
                  }`}
                >
                  <Stamp className="h-3.5 w-3.5" />
                  <span>ARCON ASP Vetting Memo</span>
                </button>
              )}
            </div>

            {artifacts.compliant_rewrite?.verified_by_locks && (
              <span className="font-mono text-[10.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Verified by Locks 1–3
              </span>
            )}
          </div>

          <div className="p-3.5">
            {activeTab === "REWRITE" && artifacts.compliant_rewrite && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-semibold text-zinc-500 uppercase">
                      Compliant Flyer / Social / Landing Copy
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          "rewrite_main",
                          artifacts.compliant_rewrite?.rewritten_copy || ""
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11.5px] text-zinc-600 hover:text-zinc-950 cursor-pointer"
                    >
                      {copiedKey === "rewrite_main" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Rewrite</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-[12.5px] text-zinc-900 font-sans leading-relaxed">
                    {artifacts.compliant_rewrite.rewritten_copy}
                  </pre>
                </div>

                {artifacts.compliant_rewrite.sms_160_char && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-semibold text-zinc-500 uppercase">
                        160-Character Compliant SMS / USSD Variant (
                        {artifacts.compliant_rewrite.sms_160_char.length}/160 chars)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            "rewrite_sms",
                            artifacts.compliant_rewrite?.sms_160_char || ""
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11.5px] text-zinc-600 hover:text-zinc-950 cursor-pointer"
                      >
                        {copiedKey === "rewrite_sms" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy SMS</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-[12.5px] font-mono text-zinc-900">
                      {artifacts.compliant_rewrite.sms_160_char}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "KFS" && artifacts.kfs_table && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-zinc-500 uppercase">
                    CBN Mandatory Key Facts Statement ({artifacts.kfs_table.product_name})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText("kfs_md", artifacts.kfs_table?.markdown_table || "")
                    }
                    className="inline-flex items-center gap-1 text-[11.5px] text-zinc-600 hover:text-zinc-950 cursor-pointer"
                  >
                    {copiedKey === "kfs_md" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied KFS Table</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Markdown Table</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-left text-[12px] border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
                        <th className="px-3 py-2 font-medium">KFS Disclosure Item</th>
                        <th className="px-3 py-2 font-medium">Verified Value</th>
                        <th className="px-3 py-2 font-medium">Statutory Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {artifacts.kfs_table.rows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-medium text-zinc-900">
                            {row.field}
                          </td>
                          <td className="px-3 py-1.5 text-zinc-700">{row.value}</td>
                          <td className="px-3 py-1.5 font-mono text-[11px] text-zinc-500">
                            {row.statutoryBasis}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "ASP" && artifacts.arcon_asp_memo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-zinc-500 uppercase">
                    ARCON ASP Pre-Vetting Substantiation Memo
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("asp_memo", artifacts.arcon_asp_memo || "")}
                    className="inline-flex items-center gap-1 text-[11.5px] text-zinc-600 hover:text-zinc-950 cursor-pointer"
                  >
                    {copiedKey === "asp_memo" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied Memo</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Memo</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-[12.5px] text-zinc-900 font-sans leading-relaxed">
                  {artifacts.arcon_asp_memo}
                </pre>
              </div>
            )}
          </div>

          {/* 4. In-Thread Human-in-the-Loop (HITL) Execution Bar */}
          {(onApplyCompliantRewrite || onApproveAndSealDossier) && (
            <div className="bg-zinc-50 border-t border-zinc-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] text-zinc-500">
                Human-in-the-Loop Actions (2-Year FCCPC Reg. 32 Audit Trail)
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {onApplyCompliantRewrite && artifacts.compliant_rewrite && (
                  <button
                    type="button"
                    disabled={applyingRewrite || rewriteApplied}
                    onClick={() =>
                      handleApplyRewrite(artifacts.compliant_rewrite?.rewritten_copy || "")
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 text-[12px] font-medium transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {applyingRewrite ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
                    )}
                    <span>
                      {rewriteApplied
                        ? "Compliant Revision Saved"
                        : "Apply Compliant Rewrite"}
                    </span>
                  </button>
                )}

                {onApproveAndSealDossier && (
                  <button
                    type="button"
                    disabled={sealingDossier || dossierSealed}
                    onClick={handleSealDossier}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-medium transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {sealingDossier ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {dossierSealed
                        ? "Logged to 2-Year FCCPC Dossier"
                        : "Approve & Log to Audit Dossier"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
