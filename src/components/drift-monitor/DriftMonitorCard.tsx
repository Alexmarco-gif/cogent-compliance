"use client";

import React from "react";
import {
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  FileSearch,
} from "lucide-react";
import { CampaignDriftMonitor, DriftDetails } from "@/contracts/drift.contracts";

interface DriftMonitorCardProps {
  monitor: CampaignDriftMonitor;
  onInspect: (monitor: CampaignDriftMonitor) => void;
  onCheck: (monitorId: string) => Promise<void>;
  onDelete: (monitorId: string) => Promise<void>;
  isChecking?: boolean;
}

export const DriftMonitorCard: React.FC<DriftMonitorCardProps> = ({
  monitor,
  onInspect,
  onCheck,
  onDelete,
  isChecking,
}) => {
  const isDrift = monitor.status === "DRIFT_DETECTED";
  const details = monitor.drift_details as DriftDetails | undefined;
  const discrepancies = details?.discrepancies || [];

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4">
      {/* Top row: Campaign title & Status pill */}
      <div className="flex items-start justify-between space-x-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-zinc-900 truncate max-w-sm">
              {monitor.campaign_title || "Monitored Campaign"}
            </h3>
            {monitor.revision_number && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                Rev #{monitor.revision_number}
              </span>
            )}
          </div>
          <a
            href={monitor.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-primary hover:underline flex items-center space-x-1 font-mono truncate max-w-md"
          >
            <span className="truncate">{monitor.published_url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 shrink-0 ${
            isDrift
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {isDrift ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          <span>{isDrift ? "DRIFT DETECTED" : "COMPLIANT"}</span>
        </span>
      </div>

      {/* Middle row: Stats & discrepancy highlights */}
      <div className="bg-zinc-50/80 rounded-lg p-3 border border-zinc-150 text-xs space-y-2">
        <div className="flex items-center justify-between text-zinc-600">
          <span className="flex items-center space-x-1.5">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span>
              Last Checked:{" "}
              {monitor.last_checked_at
                ? new Date(monitor.last_checked_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })
                : "Pending first check"}
            </span>
          </span>
          {details?.divergence_score !== undefined && (
            <span className="font-mono text-zinc-500">
              Score: {(details.divergence_score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {isDrift && discrepancies.length > 0 && (
          <div className="pt-1 border-t border-zinc-200/80">
            <p className="text-[11px] text-red-600 font-medium">
              ⚠️ {discrepancies.length} discrepancy(s) detected:{" "}
              <span className="text-zinc-700 font-normal truncate">
                {discrepancies[0]?.description}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Bottom row: Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
        <button
          onClick={() => onInspect(monitor)}
          className="flex items-center space-x-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <FileSearch className="h-3.5 w-3.5 text-zinc-500" />
          <span>Inspect Diff</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onCheck(monitor.id)}
            disabled={isChecking}
            className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Checking..." : "Check Now"}</span>
          </button>
          <button
            onClick={() => onDelete(monitor.id)}
            className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete Monitor"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
