"use client";

import React, { useState } from "react";
import { FindingCard, Finding } from "./FindingCard";
import { CheckCircle2 } from "lucide-react";

interface Tab3Props {
  findings: Finding[];
  onEvidenceClick: (clauseId: string) => void;
  onRemediateClick?: (finding: Finding) => void;
}

export const Tab3FindingsList: React.FC<Tab3Props> = ({
  findings,
  onEvidenceClick,
  onRemediateClick,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity === "ALL") return true;
    return f.severity === filterSeverity;
  });

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severity === "LOW" || f.severity === "INFORMATIONAL").length;

  return (
    <div className="space-y-6 p-6">
      {/* Header and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">
            Automated 7-Layer Guardrails Breakdown
          </span>
          <h3 className="text-[16px] font-semibold text-zinc-900 mt-0.5">
            Compliance Findings ({findings.length})
          </h3>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterSeverity("ALL")}
            className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${
              filterSeverity === "ALL"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            All ({findings.length})
          </button>
          {criticalCount > 0 && (
            <button
              onClick={() => setFilterSeverity("CRITICAL")}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                filterSeverity === "CRITICAL"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              Critical ({criticalCount})
            </button>
          )}
          {highCount > 0 && (
            <button
              onClick={() => setFilterSeverity("HIGH")}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                filterSeverity === "HIGH"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              High ({highCount})
            </button>
          )}
          {mediumCount > 0 && (
            <button
              onClick={() => setFilterSeverity("MEDIUM")}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                filterSeverity === "MEDIUM"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Medium ({mediumCount})
            </button>
          )}
          {lowCount > 0 && (
            <button
              onClick={() => setFilterSeverity("LOW")}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                filterSeverity === "LOW"
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Low ({lowCount})
            </button>
          )}
        </div>
      </div>

      {/* Findings List or Clean Slate */}
      {filteredFindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 p-12 text-center bg-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-[15px] font-semibold text-zinc-900">
            Zero Breaches Identified
          </h4>
          <p className="mt-1 text-[13px] text-zinc-500 max-w-sm">
            All promotional representations and statutory disclosures meet active Nigerian regulatory standards.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onEvidenceClick={onEvidenceClick}
              onRemediateClick={onRemediateClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
