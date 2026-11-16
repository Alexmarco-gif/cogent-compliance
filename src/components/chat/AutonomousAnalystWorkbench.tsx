"use client";

import React, { useState, useEffect } from "react";
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
  Pencil,
  Eye,
  Printer,
  Scale,
} from "lucide-react";
import type {
  BlindSpotFindingItem,
  CitationItem,
  ExecutionPlanStep,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";

export interface AgentExecutionPlanProps {
  steps: ExecutionPlanStep[];
  citationCount?: number;
}

/**
 * Collapsed Thought Pill (Linear / Vanta style):
 * While running, displays active step progress. Once all 5 steps complete,
 * collapses into a single subtle badge: "✓ Audited X sources & 3 locks (click to expand)".
 */
export function AgentExecutionPlanCard({
  steps,
  citationCount = 0,
}: AgentExecutionPlanProps) {
  const completedCount = steps ? steps.filter((s) => s.status === "COMPLETED").length : 0;
  const isAllDone = Boolean(steps && steps.length > 0 && completedCount === steps.length);
  const [expanded, setExpanded] = useState(!isAllDone);

  useEffect(() => {
    if (isAllDone) {
      setExpanded(false);
    }
  }, [isAllDone]);

  if (!steps || steps.length === 0) return null;

  const runningStep = steps.find((s) => s.status === "RUNNING") || steps[steps.length - 1];

  return (
    <div className="my-2.5">
      <div className="inline-flex flex-col w-full rounded-lg border border-[#E5E7EB] bg-zinc-50/80 px-3 py-2 text-[12px] transition-all">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            {isAllDone ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 text-zinc-700 animate-spin shrink-0" />
            )}

            {isAllDone ? (
              <span className="font-medium text-zinc-700 truncate">
                Audited {citationCount > 0 ? `${citationCount} statutory sources & ` : ""}
                3 deterministic locks across {steps.length} verification steps
              </span>
            ) : (
              <span className="font-medium text-zinc-900 truncate">
                Step {runningStep?.step_number}/{steps.length}: {runningStep?.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-zinc-500">
            <span>{expanded ? "Hide trace" : "Inspect trace"}</span>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-[#E5E7EB] space-y-1.5">
            {steps.map((step) => (
              <div
                key={step.step_id}
                className="flex items-start justify-between gap-3 text-[11.5px]"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="font-mono text-[10.5px] text-zinc-400 mt-0.5">
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
                  className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded ${
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
    </div>
  );
}

/**
 * Formats internal finding codes into crisp Silicon Valley SaaS issue titles.
 */
function formatFindingHeadline(
  finding: BlindSpotFindingItem,
  aprAudit?: StructuredComplianceReport["pre_flight_gate"]["apr_audit"]
): string {
  const code = finding.finding_code.toUpperCase();
  if (code.includes("APR_DRIP_PRICING") || code.includes("APR_MISMATCH")) {
    if (aprAudit) {
      return `Drip Pricing & APR Mismatch — ${aprAudit.effective_nominal_apr}% vs ${aprAudit.advertised_implied_apr}% p.a.`;
    }
    return "Drip Pricing & Effective APR Mismatch";
  }
  if (code.includes("SHORT_TENOR") || code.includes("PLAY_STORE")) {
    return `Google Play Store <60-Day Loan Tenor Ban${aprAudit ? ` (${aprAudit.tenor_days}d Tenor)` : ""}`;
  }
  if (code.includes("ARCON") || code.includes("ASP")) {
    return "Missing Mandatory ARCON ASP Pre-Vetting Certificate ID";
  }
  if (code.includes("FONT") || code.includes("MICROSCOPIC") || code.includes("VISUAL")) {
    return "Illegible Fine-Print Disclaimer Ratio (<12% Headline Height)";
  }
  if (code.includes("DECEPTIVE_FREE") || code.includes("ZERO_INTEREST") || code.includes("RATE_MISMATCH")) {
    return `Rate Card Truth Mismatch${finding.exact_quote ? ` ("${finding.exact_quote.slice(0, 28)}")` : ""}`;
  }
  if (code.includes("UNQUALIFIED") || code.includes("GUARANTEE") || code.includes("PROHIBITED")) {
    return `Prohibited Absolute Claim${finding.exact_quote ? ` ("${finding.exact_quote.slice(0, 28)}")` : ""}`;
  }
  if (code.includes("LICENSE")) {
    return "Missing Mandatory CBN Regulatory License Disclosure";
  }
  if (code.includes("TERMS") || code.includes("DISCLOSURE")) {
    return "Missing Mandatory Terms & Conditions / APR Qualifier";
  }
  if (code.includes("CONTACT_LIST") || code.includes("PRIVACY") || code.includes("NDPA")) {
    return "Unlawful Contact-List Scraping / NDPA Consent Violation";
  }

  return code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extracts a compact inline citation badge label (e.g. "FCCPA §115" or "CBN CPF §3.2.3").
 */
function formatShortStatuteBadge(violatedStatute: string): string {
  const clean = violatedStatute.split("/")[0]?.trim() || violatedStatute;
  if (clean.length <= 28) return clean;
  const secMatch = clean.match(/(CBN|FCCPA|FCCPC|ARCON|NDPA|NDPC|SEC)[^§]*?(§\s*[\d.]+|Section\s+[\d.]+|Reg\.?\s*[\d.]+)/i);
  if (secMatch?.[1] && secMatch[2]) {
    return `${secMatch[1].toUpperCase()} ${secMatch[2].replace(/Section\s+/i, "§")}`;
  }
  return clean.slice(0, 26).trim() + "…";
}

/**
 * Parses ARCON ASP memo text into structured letterhead fields with zero raw markdown symbols.
 */
function parseArconMemoFields(rawMemo: string): Array<{ label: string; value: string }> {
  const lines = rawMemo
    .split("\n")
    .map((l) => l.replace(/^[-*#]+\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);

  const fields: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    if (/^ARCON ADVERTISING STANDARDS PANEL/i.test(line)) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 48) {
      const label = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (label && value) {
        fields.push({ label, value });
      }
    } else {
      fields.push({ label: "Attestation Note", value: line });
    }
  }
  return fields;
}

/**
 * Renders the compliant rewrite with emerald-green diff highlights on inserted statutory
 * disclosures, APR figures, and credit-assessment qualifiers.
 */
function renderHighlightedCompliantRewrite(copy: string): React.ReactNode {
  const cleanCopy = copy
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .trim();

  const highlightPattern =
    /(subject to (?:KYC and )?credit (?:assessment|appraisal)(?: and eligibility verification)?|Effective APR:\s*[\d.]+%\s*p\.a\.|Net Disbursed:\s*₦[\d,]+(?:\.\d{2})?|Total Repayable:\s*₦[\d,]+(?:\.\d{2})?|Licensed by the Central Bank of Nigeria(?:\s*\(CBN\))?|Terms and Conditions apply\.?|\[ARCON\/ASP[^\]]+\])/gi;

  const lines = cleanCopy.split("\n");
  return (
    <div className="space-y-2 text-[13px] text-zinc-900 leading-relaxed font-sans">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-1" />;
        const parts = line.split(highlightPattern);
        return (
          <p key={lIdx} className="leading-relaxed">
            {parts.map((part, pIdx) => {
              if (!part) return null;
              if (highlightPattern.test(part)) {
                highlightPattern.lastIndex = 0;
                return (
                  <span
                    key={pIdx}
                    className="inline-block rounded bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.2 text-emerald-900 font-medium"
                    title="Inserted by Cogent Compliance Engine"
                  >
                    {part}
                  </span>
                );
              }
              highlightPattern.lastIndex = 0;
              return <React.Fragment key={pIdx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export interface AutonomousAnalystWorkbenchProps {
  report: StructuredComplianceReport;
  citations?: CitationItem[];
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
  // Progressive disclosure: only #1 most critical finding (index 0) is expanded by default
  const [expandedFindingIdx, setExpandedFindingIdx] = useState<number | null>(0);
  const [isEditingRewrite, setIsEditingRewrite] = useState(false);
  const [editableRewrite, setEditableRewrite] = useState(
    report.artifacts.compliant_rewrite?.rewritten_copy || ""
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [applyingRewrite, setApplyingRewrite] = useState(false);
  const [rewriteApplied, setRewriteApplied] = useState(false);
  const [sealingDossier, setSealingDossier] = useState(false);
  const [dossierSealed, setDossierSealed] = useState(false);

  const { pre_flight_gate, blind_spot_findings, artifacts } = report;
  const apr = pre_flight_gate.apr_audit;

  useEffect(() => {
    if (report.artifacts.compliant_rewrite?.rewritten_copy) {
      setEditableRewrite(report.artifacts.compliant_rewrite.rewritten_copy);
    }
  }, [report.artifacts.compliant_rewrite?.rewritten_copy]);

  // Sort findings by severity (CRITICAL -> HIGH -> MEDIUM -> LOW)
  const severityWeight: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  const sortedFindings = [...blind_spot_findings].sort(
    (a, b) => (severityWeight[a.severity] ?? 4) - (severityWeight[b.severity] ?? 4)
  );

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
        editableRewrite.trim() ||
        artifacts.compliant_rewrite?.rewritten_copy ||
        "Verified compliant campaign copy.";
      await onApproveAndSealDossier(targetCopy);
      setDossierSealed(true);
    } finally {
      setSealingDossier(false);
    }
  };

  const gateMeta =
    pre_flight_gate.verdict === "BLOCK"
      ? {
          badgeBg: "bg-rose-600 text-white",
          accentDot: "bg-rose-600",
          icon: <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />,
          label: "PRE-FLIGHT GATE: BLOCK (DO NOT PUBLISH)",
        }
      : pre_flight_gate.verdict === "CONDITIONAL"
        ? {
            badgeBg: "bg-amber-600 text-white",
            accentDot: "bg-amber-500",
            icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
            label: "PRE-FLIGHT GATE: CONDITIONAL (REDLINES REQUIRED)",
          }
        : {
            badgeBg: "bg-emerald-600 text-white",
            accentDot: "bg-emerald-600",
            icon: <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />,
            label: "PRE-FLIGHT GATE: PASS (READY FOR SIGN-OFF)",
          };

  const arconFields = artifacts.arcon_asp_memo
    ? parseArconMemoFields(artifacts.arcon_asp_memo)
    : [];

  return (
    <div className="my-3 space-y-4">
      {/* =====================================================================
          ZONE A: STICKY TOP VERDICT BAR (Linear / Stripe Crisp White Card)
         ===================================================================== */}
      <div className="sticky top-0 z-10 rounded-xl border border-[#E5E7EB] bg-white/95 backdrop-blur-xs p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {gateMeta.icon}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] font-bold tracking-tight text-zinc-950">
                  {gateMeta.label}
                </span>
              </div>
              {report.campaign_context?.product_name && (
                <p className="text-[11.5px] text-zinc-500">
                  Matched Rate Card:{" "}
                  <strong className="font-medium text-zinc-800">
                    {report.campaign_context.product_name}
                  </strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 3 Compact Lock Pills */}
            <div className="hidden xl:flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-zinc-50/80 px-2.5 py-1 text-[11px]">
                <span className="text-zinc-500">Prohibited Terms:</span>
                <strong
                  className={`font-mono ${
                    pre_flight_gate.lock_summary.lock1_prohibited_terms === "PASS"
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {pre_flight_gate.lock_summary.lock1_prohibited_terms}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-zinc-50/80 px-2.5 py-1 text-[11px]">
                <span className="text-zinc-500">Rate Card:</span>
                <strong
                  className={`font-mono ${
                    pre_flight_gate.lock_summary.lock2_product_rate_match === "PASS"
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {pre_flight_gate.lock_summary.lock2_product_rate_match}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-zinc-50/80 px-2.5 py-1 text-[11px]">
                <span className="text-zinc-500">Disclosures:</span>
                <strong
                  className={`font-mono ${
                    pre_flight_gate.lock_summary.lock3_mandatory_disclosures === "PASS"
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {pre_flight_gate.lock_summary.lock3_mandatory_disclosures}
                </strong>
              </span>
            </div>

            <span className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-zinc-50 border border-[#E5E7EB] text-zinc-800">
              Risk Score: <strong>{pre_flight_gate.risk_score}/100</strong>
            </span>
            <span
              className={`font-mono text-[11px] font-semibold px-2.5 py-1 rounded-md ${gateMeta.badgeBg}`}
            >
              {pre_flight_gate.verdict}
            </span>
          </div>
        </div>

        {/* Responsive Lock Pills for screens < xl */}
        <div className="grid grid-cols-3 gap-2 xl:hidden">
          <div className="rounded-lg bg-zinc-50/80 border border-[#E5E7EB] px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 truncate">Lock 1: Terms</span>
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
          <div className="rounded-lg bg-zinc-50/80 border border-[#E5E7EB] px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 truncate">Lock 2: Rate Card</span>
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
          <div className="rounded-lg bg-zinc-50/80 border border-[#E5E7EB] px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 truncate">Lock 3: Disclosures</span>
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

        {/* Locked Deterministic CBN APR & Drip-Pricing Bar (Single Source of Truth) */}
        {apr && (
          <div className="rounded-lg bg-zinc-50/70 border border-[#E5E7EB] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-zinc-900">
                <Calculator className="h-3.5 w-3.5 text-zinc-600" />
                <span>
                  Deterministic CBN APR & Drip-Pricing Engine ({apr.product_name})
                </span>
              </div>
              {apr.drip_pricing_detected && (
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  DRIP PRICING / APR MISMATCH
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-[12px]">
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
                <p className="text-[10.5px] text-zinc-500">Upfront Fee Deducted</p>
                <p className="font-mono font-semibold text-zinc-900">
                  ₦{apr.upfront_fees_ngn.toLocaleString("en-NG")}
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

      {/* =====================================================================
          SPLIT-PANE WORKSPACE: ZONE B (Left 45%) & ZONE C (Right 55%)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ZONE B: LEFT COLUMN — SCANNABLE ISSUE QUEUE (Accordion Rows) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-semibold text-zinc-900">
              Silent Blind-Spot Queue ({sortedFindings.length}{" "}
              {sortedFindings.length === 1 ? "Finding" : "Findings"})
            </span>
            <span className="font-mono text-[10.5px] text-zinc-500">
              Click row to expand
            </span>
          </div>

          {sortedFindings.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-[12.5px] text-zinc-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Zero statutory blind spots or rate-card discrepancies detected.</span>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-white divide-y divide-[#E5E7EB] overflow-hidden shadow-2xs">
              {sortedFindings.map((finding, idx) => {
                const isExpanded = expandedFindingIdx === idx;
                const headline = formatFindingHeadline(finding, apr);
                const shortStatute = formatShortStatuteBadge(finding.violated_statute);

                return (
                  <div key={`${finding.finding_code}_${idx}`} className="bg-white">
                    {/* 1-Line Accordion Issue Row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setExpandedFindingIdx(isExpanded ? null : idx)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedFindingIdx(isExpanded ? null : idx);
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                        isExpanded ? "bg-zinc-50/90" : "hover:bg-zinc-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span
                          className={`shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            finding.severity === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : finding.severity === "HIGH"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-[12.5px] font-medium text-zinc-900 truncate">
                          {headline}
                        </span>
                      </div>

                      {/* Inline Hover Citation Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (finding.regulatory_clause_id && onInspectEvidence) {
                            onInspectEvidence(finding.regulatory_clause_id);
                          } else {
                            setExpandedFindingIdx(isExpanded ? null : idx);
                          }
                        }}
                        title={`${finding.violated_statute} — Click to inspect statutory provision`}
                        className="shrink-0 font-mono text-[10.5px] px-2 py-0.5 rounded border border-[#E5E7EB] bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                      >
                        [{shortStatute}]
                      </button>
                    </div>

                    {/* Expanded 3-Part Card: What You Missed -> What It Costs You -> One-Click Fix */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-2 bg-zinc-50/40 border-t border-[#E5E7EB] space-y-2.5 text-[12px]">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span className="font-mono text-[10.5px] text-zinc-500">
                            Code: {finding.finding_code}
                          </span>
                          <span className="font-mono text-[10.5px] text-zinc-600">
                            {finding.violated_statute}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="rounded-lg bg-white border border-[#E5E7EB] p-2.5">
                            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                              1. What You Missed (Blind Spot)
                            </p>
                            <p className="text-zinc-800 leading-relaxed">
                              {finding.what_you_missed}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white border border-rose-200/80 p-2.5">
                            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
                              2. What It Costs You (Penalty)
                            </p>
                            <p className="text-zinc-800 leading-relaxed">
                              {finding.what_it_costs_you}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white border border-emerald-200/90 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                                3. One-Click Resolution
                              </p>
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
                            <p className="text-zinc-800 leading-relaxed">
                              {finding.one_click_fix}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ZONE C: RIGHT COLUMN — THE "DELIVERABLES" STUDIO CANVAS */}
        {(artifacts.compliant_rewrite ||
          artifacts.kfs_table ||
          artifacts.arcon_asp_memo) && (
          <div className="lg:col-span-7 rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-2xs flex flex-col">
            {/* Studio Header & Tabs */}
            <div className="bg-zinc-50/90 border-b border-[#E5E7EB] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
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
                    <span>Compliant Copy & Diff</span>
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

            {/* Studio Body */}
            <div className="p-4 flex-1">
              {/* TAB 1: COMPLIANT REWRITE & DIFF */}
              {activeTab === "REWRITE" && artifacts.compliant_rewrite && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-zinc-600 uppercase">
                          Compliant Flyer / Social / Landing Copy
                        </span>
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                          Green = Inserted Disclosures
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingRewrite(!isEditingRewrite)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E5E7EB] bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 cursor-pointer"
                        >
                          {isEditingRewrite ? (
                            <>
                              <Eye className="h-3 w-3" />
                              <span>Preview Diff</span>
                            </>
                          ) : (
                            <>
                              <Pencil className="h-3 w-3" />
                              <span>Edit Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => copyText("rewrite_main", editableRewrite)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E5E7EB] bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 cursor-pointer"
                        >
                          {copiedKey === "rewrite_main" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isEditingRewrite ? (
                      <textarea
                        value={editableRewrite}
                        onChange={(e) => setEditableRewrite(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-[13px] text-zinc-900 font-sans leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                      />
                    ) : (
                      <div className="rounded-lg bg-zinc-50/60 border border-[#E5E7EB] p-3.5">
                        {renderHighlightedCompliantRewrite(editableRewrite)}
                      </div>
                    )}
                  </div>

                  {artifacts.compliant_rewrite.sms_160_char && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
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
                      <div className="rounded-lg bg-zinc-50 border border-[#E5E7EB] px-3 py-2 text-[12px] font-mono text-zinc-900">
                        {artifacts.compliant_rewrite.sms_160_char}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CBN KEY FACTS STATEMENT (KFS) DOCUMENT PREVIEW */}
              {activeTab === "KFS" && artifacts.kfs_table && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB]">
                    <div>
                      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                        Central Bank of Nigeria • Consumer Protection Framework (Annex 1)
                      </p>
                      <h4 className="text-[13.5px] font-semibold text-zinc-950">
                        Mandatory Key Facts Statement — {artifacts.kfs_table.product_name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyText("kfs_md", artifacts.kfs_table?.markdown_table || "")
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 cursor-pointer"
                      >
                        {copiedKey === "kfs_md" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Copied KFS</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy KFS</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => typeof window !== "undefined" && window.print()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 cursor-pointer"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                    <table className="w-full text-left text-[12px] border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-[#E5E7EB] text-zinc-600">
                          <th className="px-3 py-2 font-semibold">KFS Disclosure Item</th>
                          <th className="px-3 py-2 font-semibold">Verified Schedule Value</th>
                          <th className="px-3 py-2 font-semibold">Statutory Authority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] bg-white">
                        {artifacts.kfs_table.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/60">
                            <td className="px-3 py-2 font-medium text-zinc-900">
                              {row.field}
                            </td>
                            <td className="px-3 py-2 text-zinc-800">{row.value}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                              {row.statutoryBasis}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ARCON ASP VETTING MEMO (OFFICIAL LETTERHEAD COMPONENT) */}
              {activeTab === "ASP" && artifacts.arcon_asp_memo && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-zinc-900 text-white flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          ARCON Act 2022 §54 • Advertising Standards Panel (ASP)
                        </p>
                        <h4 className="text-[13.5px] font-semibold text-zinc-950">
                          Pre-Vetting Substantiation Dossier
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyText("asp_memo", artifacts.arcon_asp_memo || "")
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 cursor-pointer"
                    >
                      {copiedKey === "asp_memo" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied Dossier</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Dossier</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-lg border border-[#E5E7EB] divide-y divide-[#E5E7EB] bg-white">
                    {arconFields.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-3.5 py-2.5 text-[12px]"
                      >
                        <div className="sm:col-span-4 font-mono text-[11px] font-semibold text-zinc-600">
                          {item.label}
                        </div>
                        <div className="sm:col-span-8 text-zinc-900 leading-relaxed">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Studio Footer — Anchored Bottom-Right HITL Action Bar */}
            {(onApplyCompliantRewrite || onApproveAndSealDossier) && (
              <div className="bg-zinc-50/90 border-t border-[#E5E7EB] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500">
                  2-Year FCCPC Reg. 32 Tamper-Evident Audit Trail
                </span>

                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {onApplyCompliantRewrite && artifacts.compliant_rewrite && (
                    <button
                      type="button"
                      disabled={applyingRewrite || rewriteApplied}
                      onClick={() => handleApplyRewrite(editableRewrite)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E5E7EB] bg-white hover:bg-zinc-100 text-zinc-900 text-[12px] font-medium transition-colors disabled:opacity-60 cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-medium transition-colors disabled:opacity-60 cursor-pointer"
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
    </div>
  );
}
