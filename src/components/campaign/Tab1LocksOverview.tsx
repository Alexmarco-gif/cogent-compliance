"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Percent,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface Breach {
  lockNumber: number;
  lockName: string;
  breachType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  matchedText: string;
  explanation: string;
  statutoryReference?: string;
}

export interface LockResult {
  passed: boolean;
  lock1_prohibited_terms?: {
    passed: boolean;
    breaches: Breach[];
  };
  lock2_product_rate_match?: {
    passed: boolean;
    breaches: Breach[];
  };
  lock3_mandatory_disclosures?: {
    passed: boolean;
    breaches: Breach[];
    missingDisclosures: string[];
  };
  totalBreachCount?: number;
}

interface Tab1Props {
  assessment: {
    id: string;
    overall_risk_level: string;
    summary?: string;
    lockResults?: LockResult;
    created_at?: string;
  } | null;
  campaign: {
    id: string;
    campaign_name: string;
    channel: string;
    risk_level: string;
  };
  onSwitchTab?: (tab: "locks" | "assets" | "findings") => void;
}

export const Tab1LocksOverview: React.FC<Tab1Props> = ({
  assessment,
  campaign,
  onSwitchTab,
}) => {
  const lockData = assessment?.lockResults;
  const lock1 = lockData?.lock1_prohibited_terms;
  const lock2 = lockData?.lock2_product_rate_match;
  const lock3 = lockData?.lock3_mandatory_disclosures;

  const riskLevel = assessment?.overall_risk_level || campaign.risk_level || "PENDING";

  return (
    <div className="space-y-6 p-6">
      {/* Executive Risk Banner */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[12px] font-medium tracking-wider uppercase text-zinc-500">
              Autonomous Risk Assessment
            </span>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-zinc-900">
              {campaign.campaign_name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide uppercase border ${
                riskLevel === "CRITICAL"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : riskLevel === "HIGH"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : riskLevel === "LOW"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
              }`}
            >
              {riskLevel === "CRITICAL" || riskLevel === "HIGH" ? (
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-current" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-current" />
              )}
              {riskLevel} RISK
            </span>
          </div>
        </div>

        {assessment?.summary && (
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-600 border-t border-zinc-100 pt-3">
            {assessment.summary}
          </p>
        )}
      </div>

      {/* 3 Deterministic Mechanical Locks Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            3 Deterministic Mechanical Locks
          </h4>
          <span className="text-[12px] font-mono text-zinc-400">
            Document 05 §6 Code-Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Lock 1 Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg border ${
                    lock1?.passed
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}
                >
                  {lock1?.passed ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <ShieldAlert className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h5 className="text-[15px] font-semibold text-zinc-900">
                    Lock 1: Prohibited Lexicon Scanner
                  </h5>
                  <p className="text-[12.5px] text-zinc-500">
                    CBN CPF §4.2, ARCON ASP & FCCPA statutory prohibited deceptive claims
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border ${
                  lock1?.passed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {lock1?.passed ? "PASSED" : "FAILED"}
              </span>
            </div>

            {lock1 && !lock1.passed && lock1.breaches.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                {lock1.breaches.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-lg bg-red-50/60 p-3 text-[13px] border border-red-100"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                        <span className="font-semibold text-red-900 font-mono">
                          &ldquo;{b.matchedText}&rdquo;
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-red-200/60 text-red-800 font-mono">
                          {b.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-red-700 text-[12.5px] leading-snug">
                        {b.explanation}
                      </p>
                    </div>
                    {b.statutoryReference && (
                      <span className="text-[11px] font-mono text-zinc-500 shrink-0 ml-3">
                        {b.statutoryReference}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lock 2 Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg border ${
                    lock2?.passed
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-amber-50 border-amber-200 text-amber-600"
                  }`}
                >
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-[15px] font-semibold text-zinc-900">
                    Lock 2: Product Truth & Rate Matcher
                  </h5>
                  <p className="text-[12.5px] text-zinc-500">
                    Compares advertised rates, fees, and tenors against institutional truth
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border ${
                  lock2?.passed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {lock2?.passed ? "PASSED" : "FAILED"}
              </span>
            </div>

            {lock2 && !lock2.passed && lock2.breaches.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                {lock2.breaches.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-lg bg-amber-50/60 p-3 text-[13px] border border-amber-100"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-900">
                          {b.breachType}
                        </span>
                      </div>
                      <p className="mt-1 text-amber-800 text-[12.5px] leading-snug">
                        {b.explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lock 3 Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg border ${
                    lock3?.passed
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}
                >
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-[15px] font-semibold text-zinc-900">
                    Lock 3: Mandatory Statutory Disclosures
                  </h5>
                  <p className="text-[12.5px] text-zinc-500">
                    Licensing statements, NDIC deposit insurance, and T&C disclosures
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border ${
                  lock3?.passed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {lock3?.passed ? "PASSED" : "FAILED"}
              </span>
            </div>

            {lock3 && !lock3.passed && lock3.missingDisclosures?.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                <span className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">
                  Missing Mandatory Disclosures:
                </span>
                {lock3.missingDisclosures.map((disc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-zinc-50 p-2.5 text-[13px] border border-zinc-200/80 text-zinc-800 font-serif italic"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    &ldquo;{disc}&rdquo;
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {onSwitchTab && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => onSwitchTab("assets")}
            className="px-4 py-2 text-[13px] font-medium rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors"
          >
            Inspect OCR Bounding Boxes →
          </button>
          <button
            onClick={() => onSwitchTab("findings")}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            View Detailed Findings →
          </button>
        </div>
      )}
    </div>
  );
};
