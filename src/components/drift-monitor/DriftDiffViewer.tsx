"use client";

import React from "react";
import { AlertTriangle, CheckCircle, ArrowRight, X } from "lucide-react";
import { CampaignDriftMonitor, DriftDetails, DriftDiscrepancy } from "@/contracts/drift.contracts";

interface DriftDiffViewerProps {
  monitor: CampaignDriftMonitor;
  onClose: () => void;
  onRecheck?: () => void;
  isChecking?: boolean;
}

export const DriftDiffViewer: React.FC<DriftDiffViewerProps> = ({
  monitor,
  onClose,
  onRecheck,
  isChecking,
}) => {
  const details = monitor.drift_details as DriftDetails | undefined;
  const isDrift = monitor.status === "DRIFT_DETECTED";
  const discrepancies: DriftDiscrepancy[] = details?.discrepancies || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center space-x-3">
            {isDrift ? (
              <div className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-zinc-950">
                  {monitor.campaign_title || "Monitored Campaign"} — Drift Comparison
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${
                    isDrift
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {monitor.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono truncate max-w-xl">
                {monitor.published_url}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onRecheck && (
              <button
                onClick={onRecheck}
                disabled={isChecking}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isChecking ? "Checking Live URL..." : "Re-check Live URL"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Banner */}
          <div
            className={`p-4 rounded-lg border text-xs flex items-start space-x-3 ${
              isDrift
                ? "bg-rose-50/60 border-rose-200 text-rose-900"
                : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
            }`}
          >
            {isDrift ? (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            ) : (
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            )}
            <div>
              <p className="font-semibold">
                {isDrift
                  ? "Live webpage diverges from the approved revision."
                  : "Live webpage matches the approved revision."}
              </p>
              <p className="mt-1 text-zinc-600">
                {details?.summary ||
                  "Compares live claims, rates, fees, and mandatory disclosures against the approved baseline."}
              </p>
            </div>
          </div>

          {/* Discrepancy Breakdown */}
          {discrepancies.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
                Discrepancies ({discrepancies.length})
              </h3>
              <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-200 text-xs">
                {discrepancies.map((d, idx) => (
                  <div key={idx} className="p-3 bg-zinc-50/40 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            d.severity === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {d.severity}
                        </span>
                        <span className="font-semibold text-zinc-800">{d.type}</span>
                      </div>
                      <p className="text-zinc-600">{d.description}</p>
                      {d.expectedValue && (
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500 pt-1">
                          <span className="text-emerald-700">Expected: {d.expectedValue}</span>
                          <ArrowRight className="h-3 w-3 text-zinc-400" />
                          <span className="text-rose-700">Live: {d.actualValue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-Side Snapshot Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Approved Baseline */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/40 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                  {details?.baseline_type === "ACTIVE_REVISION" ? "Active Baseline" : "Approved Baseline"}
                </span>
                <span className="text-[10px] font-mono bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded">
                  Revision #{monitor.revision_number || 1}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                SHA-256: {details?.approved_sha256_hash?.slice(0, 16) || "N/A"}... ({details?.approved_text_length || 0} chars)
              </p>
              <div className="p-3 bg-white border border-zinc-200 rounded text-xs text-zinc-700 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {details?.approved_text_preview
                  ? details.approved_text_preview
                  : details?.approved_text_length
                  ? `Approved snapshot recorded (${details.approved_text_length} chars)`
                  : "No static baseline copy provided — live page is audited directly against Product Truth & Nigerian statutory locks."}
              </div>
            </div>

            {/* Right: Live Published URL */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/40 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                  Live Webpage
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isDrift
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  Divergence: {((details?.divergence_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                {details?.live_page_title ? `${details.live_page_title} • ` : ""}
                SHA-256: {details?.live_sha256_hash?.slice(0, 16) || "N/A"}... ({details?.live_text_length || 0} chars)
              </p>
              <div className="p-3 bg-white border border-zinc-200 rounded text-xs text-zinc-700 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {details?.live_text_preview
                  ? details.live_text_preview
                  : details?.live_text_length
                  ? `Live text extracted (${details.live_text_length} chars • ${details.live_sha256_hash?.slice(0, 12)}...)`
                  : "Live snapshot pending first check."}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
          <span>Last Checked: {monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleString() : "Never"}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
