"use client";

import React, { useState } from "react";
import { Loader2, ChevronRight, ChevronDown, Check } from "lucide-react";

export interface ToolActivityProps {
  toolName: string;
  displayLabel: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  summary?: string;
  wideRail?: boolean;
}

function humanizeToolName(toolName: string): string {
  if (toolName.includes("search_regulatory") || toolName.includes("provision")) {
    return "Checking statutory provisions";
  }
  if (toolName.includes("live_web") || toolName.includes("fetch_live")) {
    return "Searching live web & statutory updates";
  }
  if (toolName.includes("knowledge") || toolName.includes("playbook") || toolName.includes("product")) {
    return "Checking internal playbooks and rate cards";
  }
  if (toolName.includes("lock") || toolName.includes("assess")) {
    return "Running compliance checks";
  }
  return "Reviewing compliance sources";
}

export function ToolActivityPill({
  toolName,
  displayLabel,
  status,
  summary,
  wideRail = false,
}: ToolActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const railWidth = wideRail ? "max-w-5xl w-full mx-auto" : "max-w-3xl w-full mx-auto";

  if (status === "RUNNING") {
    return (
      <div className={railWidth}>
        <div className="inline-flex items-center gap-2 text-[12px] text-zinc-500 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
          <span>{displayLabel || humanizeToolName(toolName)}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={railWidth}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-800 transition-colors py-1 cursor-pointer"
      >
        <Check className="h-3.5 w-3.5 text-emerald-700" />
        <span>{summary || humanizeToolName(toolName)}</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-1 pl-5 text-[11.5px] font-mono text-zinc-400">
          {toolName}
        </div>
      )}
    </div>
  );
}
