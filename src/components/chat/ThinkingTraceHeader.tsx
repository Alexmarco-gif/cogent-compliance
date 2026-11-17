"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import type { ExecutionPlanStep } from "@/contracts/conversation.contracts";

export interface SearchTraceItem {
  id: string;
  label: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "TIMEOUT";
  detail?: string;
}

export interface SearchTrackSummary {
  track: string;
  label: string;
  status: "RUNNING" | "COMPLETED" | "SKIPPED" | "TIMEOUT";
  resultCount?: number;
  cacheHit?: boolean;
}

export interface ThinkingTraceHeaderProps {
  isStreaming?: boolean;
  startedAt?: number;
  durationMs?: number;
  traces?: SearchTraceItem[];
  planSteps?: ExecutionPlanStep[];
  searchTracks?: SearchTrackSummary[];
  citationCount?: number;
}

function formatTraceStepTitle(step: ExecutionPlanStep): string {
  const title = step.title.trim();
  if (step.summary && step.status === "COMPLETED") {
    return `${title} — ${step.summary}`;
  }
  return title;
}

export function ThinkingTraceHeader({
  isStreaming = false,
  startedAt,
  durationMs,
  traces = [],
  planSteps = [],
  searchTracks = [],
  citationCount = 0,
}: ThinkingTraceHeaderProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [userExpandedOverride, setUserExpandedOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isStreaming || !startedAt) return;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, [isStreaming, startedAt]);

  // Reset manual toggle when a new stream starts on this component
  useEffect(() => {
    if (isStreaming) {
      setUserExpandedOverride(null);
    }
  }, [isStreaming]);

  const mergedTraces = useMemo<SearchTraceItem[]>(() => {
    const items: SearchTraceItem[] = [];
    const seen = new Set<string>();

    const pushItem = (item: SearchTraceItem) => {
      const key = item.id;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    };

    for (const tr of traces) {
      pushItem(tr);
    }

    for (const st of searchTracks) {
      const status: SearchTraceItem["status"] =
        st.status === "TIMEOUT"
          ? "TIMEOUT"
          : st.status === "RUNNING"
            ? "RUNNING"
            : "COMPLETED";
      const detail =
        typeof st.resultCount === "number" && st.status === "COMPLETED"
          ? `${st.resultCount} source${st.resultCount === 1 ? "" : "s"}${st.cacheHit ? " · cached" : ""}`
          : st.status === "TIMEOUT"
            ? "timed out"
            : undefined;
      pushItem({
        id: `track:${st.track}`,
        label: st.label,
        status,
        detail,
      });
    }

    for (const step of planSteps) {
      if (step.status === "PENDING") continue;
      pushItem({
        id: `step:${step.step_id}`,
        label: formatTraceStepTitle(step),
        status: step.status === "RUNNING" ? "RUNNING" : "COMPLETED",
      });
    }

    if (items.length === 0 && isStreaming) {
      items.push({
        id: "initial_routing",
        label: "Analyzing compliance query & Nigerian statutory scope",
        status: "RUNNING",
      });
    }

    return items;
  }, [traces, searchTracks, planSteps, isStreaming]);

  // Do not clutter historical messages that lack any execution/search metadata
  if (!isStreaming && mergedTraces.length === 0 && durationMs === undefined) {
    return null;
  }

  const computedDurationMs =
    durationMs !== undefined
      ? durationMs
      : startedAt
        ? Math.max(0, nowMs - startedAt)
        : 0;
  const formattedSeconds = `${(computedDurationMs / 1000).toFixed(1)}s`;

  const isExpanded = userExpandedOverride !== null ? userExpandedOverride : isStreaming;

  return (
    <div className="space-y-2">
      {/* Status Badge + Monospace Live Timer (ads.JPG pattern adapted to Cogent light theme) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {isStreaming ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/75 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase text-indigo-700">
            <Loader2 className="h-3 w-3 animate-spin text-indigo-600 shrink-0" />
            <span>THINKING</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
            <span>VERIFIED</span>
          </span>
        )}

        {(startedAt || durationMs !== undefined) && (
          <span className="font-mono tabular-nums text-[12.5px] font-medium text-zinc-500">
            {formattedSeconds}
          </span>
        )}

        {!isStreaming && citationCount > 0 && (
          <span className="text-[12px] text-zinc-400">
            · {citationCount} {citationCount === 1 ? "source" : "sources"}
          </span>
        )}
      </div>

      {/* Collapsible Search Traces */}
      {mergedTraces.length > 0 && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setUserExpandedOverride((prev) => !(prev ?? isStreaming))}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer select-none"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            )}
            <span>Search traces</span>
            {!isExpanded && (
              <span className="font-mono text-[11px] text-zinc-400">
                ({mergedTraces.length})
              </span>
            )}
          </button>

          {isExpanded && (
            <div className="space-y-1.5 pl-1 pt-0.5">
              {mergedTraces.map((trace) => {
                const isRunning = trace.status === "RUNNING";
                return (
                  <div
                    key={trace.id}
                    className="flex items-center justify-between gap-3 text-[12.5px] leading-snug"
                    title={trace.label}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Search
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isRunning
                            ? "text-indigo-600 animate-pulse"
                            : trace.status === "FAILED" || trace.status === "TIMEOUT"
                              ? "text-amber-600"
                              : "text-zinc-400"
                        }`}
                      />
                      <span
                        className={`truncate ${
                          isRunning ? "text-zinc-900 font-medium" : "text-zinc-600"
                        }`}
                      >
                        {trace.label}
                      </span>
                    </div>
                    {trace.detail && (
                      <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                        {trace.detail}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
