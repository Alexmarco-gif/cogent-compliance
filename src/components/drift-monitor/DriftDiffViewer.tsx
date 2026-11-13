"use client";

import React from "react";
import { AlertTriangle, CheckCircle, ShieldAlert, ArrowRight, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center space-x-3">
            {isDrift ? (
              <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {monitor.campaign_title || "Monitored Campaign"} — Post-Publication Drift Diff
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                    isDrift
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
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
                className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isChecking ? "Checking Live URL..." : "Re-inspect Live URL"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
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
                ? "bg-red-50/60 border-red-200 text-red-900"
                : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
            }`}
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isDrift
                  ? "Post-Publication Drift Detected: Live promotional page diverges from approved truth."
                  : "Post-Publication Integrity Verified: Live promotional page matches approved baseline."}
              </p>
              <p className="mt-1 text-zinc-600">
                {details?.summary ||
                  "Inspection evaluates live page against Lock 1 (Prohibited Terms), Lock 2 (Product Truth), and Lock 3 (Mandatory Disclosures)."}
              </p>
            </div>
          </div>

          {/* Discrepancy Breakdown */}
          {discrepancies.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
                Identified Regulatory Discrepancies ({discrepancies.length})
              </h3>
              <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-200 text-xs">
                {discrepancies.map((d, idx) => (
                  <div key={idx} className="p-3 bg-zinc-50/40 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            d.severity === "CRITICAL"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
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
                          <span className="text-red-700">Live: {d.actualValue}</span>
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
            <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/30 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                  Approved Revision Baseline
                </span>
                <span className="text-[10px] font-mono bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded">
                  Revision #{monitor.revision_number || 1}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                SHA-256: {details?.approved_sha256_hash?.slice(0, 16) || "N/A"}...
              </p>
              <div className="p-3 bg-white border border-zinc-200 rounded text-xs text-zinc-700 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {details?.approved_text_length
                  ? `[Approved snapshot recorded with length ${details.approved_text_length} chars]`
                  : "Approved baseline content active."}
              </div>
            </div>

            {/* Right: Live Published URL */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/30 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                  Live Published Webpage
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isDrift ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  Divergence: {((details?.divergence_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                SHA-256: {details?.live_sha256_hash?.slice(0, 16) || "N/A"}...
              </p>
              <div className="p-3 bg-white border border-zinc-200 rounded text-xs text-zinc-700 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {details?.live_text_length
                  ? `[Live text extracted: ${details.live_text_length} chars. Fingerprint: ${details.live_sha256_hash?.slice(0, 12)}...]`
                  : "Live URL fetched via SSRF-safe snapshotter."}
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
