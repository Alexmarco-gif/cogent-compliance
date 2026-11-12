"use client";

import React from "react";
import { Loader2, CheckCircle2, Search, Database, Globe } from "lucide-react";

export interface ToolActivityProps {
  toolName: string;
  displayLabel: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  summary?: string;
}

export function ToolActivityPill({
  toolName,
  displayLabel,
  status,
  summary,
}: ToolActivityProps) {
  const getToolIcon = () => {
    if (toolName.includes("search_regulatory") || toolName.includes("provision")) {
      return <Database className="h-3.5 w-3.5 text-blue-600" />;
    }
    if (toolName.includes("live_web")) {
      return <Globe className="h-3.5 w-3.5 text-cyan-600" />;
    }
    return <Search className="h-3.5 w-3.5 text-slate-600" />;
  };

  if (status === "RUNNING") {
    return (
      <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-2xs text-xs text-slate-700 animate-pulse">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
        <span className="font-medium text-[11px] text-slate-600">{displayLabel}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs text-slate-600">
      {getToolIcon()}
      <span className="font-medium text-[11px] text-slate-700">
        {summary || `Executed ${toolName}`}
      </span>
      <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-1" />
    </div>
  );
}
