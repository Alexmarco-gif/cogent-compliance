"use client";

import React from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Wand2,
} from "lucide-react";

export interface FindingEvidence {
  id: string;
  evidence_type: string;
  regulatory_clause_id?: string;
  relevance_explanation?: string;
  verification_status?: string;
  regulatory_clauses?: {
    clause_reference?: string;
    verbatim_text?: string;
  };
}

export interface Finding {
  id: string;
  finding_code: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  finding_status: string;
  applicability_status: string;
  recommended_action: string;
  requires_human_review: boolean;
  claim_id?: string;
  finding_evidence?: FindingEvidence[];
}

interface FindingCardProps {
  finding: Finding;
  onEvidenceClick: (clauseId: string) => void;
  onRemediateClick?: (finding: Finding) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onEvidenceClick,
  onRemediateClick,
}) => {
  const isCritical = finding.severity === "CRITICAL";
  const isHigh = finding.severity === "HIGH";
  const isMedium = finding.severity === "MEDIUM";

  const clauseId = finding.finding_evidence?.[0]?.regulatory_clause_id;

  return (
    <div
      className={`rounded-xl border p-5 transition-all bg-white shadow-xs ${
        isCritical
          ? "border-red-200 hover:border-red-300"
          : isHigh
          ? "border-amber-200 hover:border-amber-300"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${
              isCritical
                ? "bg-red-50 text-red-700 border-red-200"
                : isHigh
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : isMedium
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-zinc-50 text-zinc-700 border-zinc-200"
            }`}
          >
            {isCritical || isHigh ? (
              <AlertTriangle className="h-3 w-3" />
            ) : isMedium ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <Info className="h-3 w-3" />
            )}
            {finding.severity}
          </span>

          <span className="font-mono text-[11px] font-medium text-zinc-500">
            {finding.finding_code}
          </span>

          {finding.applicability_status === "VERIFIED" && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3 w-3" />
              Verified Applicable
            </span>
          )}
        </div>

        {clauseId && (
          <button
            onClick={() => onEvidenceClick(clauseId)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <BookOpen className="h-3 w-3" />
            Evidence Drawer
          </button>
        )}
      </div>

      {/* Title */}
      <h4 className="mt-2 text-[15px] font-semibold text-zinc-900 tracking-tight">
        {finding.title}
      </h4>

      {/* Legal Rationale */}
      <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-700">
        {finding.description}
      </p>

      {/* Recommended Action Box */}
      {finding.recommended_action && (
        <div className="mt-3 rounded-lg bg-zinc-50 border border-zinc-200/80 p-3">
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-zinc-600">
            <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
            Remediation Action Required
          </div>
          <p className="mt-1 text-[13px] text-zinc-800 leading-snug">
            {finding.recommended_action}
          </p>
        </div>
      )}

      {/* Remediation Action Trigger */}
      {onRemediateClick && (
        <div className="mt-3 flex items-center justify-end pt-2 border-t border-zinc-100">
          <button
            onClick={() => onRemediateClick(finding)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[12px] font-semibold border border-blue-200 transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Remediate / AI Rewrite
          </button>
        </div>
      )}
    </div>
  );
};
