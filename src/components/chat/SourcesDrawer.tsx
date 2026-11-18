"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  FileText,
  BookOpen,
  Globe,
  ExternalLink,
  Search,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { CitationItem } from "@/contracts/conversation.contracts";
import {
  deduplicateCitations,
  formatSourceEntry,
  type FormattedSourceEntry,
  type SourceTierGroup,
} from "@/lib/ai/citation-formatter";

export interface SourcesDrawerProps {
  citations: CitationItem[];
  isOpen: boolean;
  onClose: () => void;
  onInspectEvidence?: (clauseId: string) => void;
}

const GROUP_META: Record<
  SourceTierGroup,
  { label: string; description: string }
> = {
  STATUTORY_VAULT: {
    label: "Official Statutory Vault",
    description: "Verified primary statutes, circulars & regulatory guidelines",
  },
  INTERNAL_PLAYBOOK: {
    label: "Internal Playbooks & Schedules",
    description: "Institution-approved rate cards and compliance rules",
  },
  OFFICIAL_REGULATOR_WEB: {
    label: "Official Regulator Sources",
    description: "Published guidance from central bank and supervisory websites",
  },
  LEGAL_AND_PRESS: {
    label: "Legal & Industry References",
    description: "Corroborating legal briefs and regulatory coverage",
  },
};

const GROUP_ORDER: SourceTierGroup[] = [
  "STATUTORY_VAULT",
  "INTERNAL_PLAYBOOK",
  "OFFICIAL_REGULATOR_WEB",
  "LEGAL_AND_PRESS",
];

export function SourcesDrawer({
  citations,
  isOpen,
  onClose,
  onInspectEvidence,
}: SourcesDrawerProps) {
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFilterQuery("");
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const formattedEntries = useMemo(() => {
    const deduped = deduplicateCitations(citations);
    return deduped.map((cit) => formatSourceEntry(cit));
  }, [citations]);

  const filteredEntries = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return formattedEntries;
    return formattedEntries.filter(
      (entry) =>
        entry.primaryTitle.toLowerCase().includes(q) ||
        (entry.subtitle || "").toLowerCase().includes(q) ||
        entry.badgeLabel.toLowerCase().includes(q)
    );
  }, [formattedEntries, filterQuery]);

  const groupedEntries = useMemo(() => {
    const buckets: Record<SourceTierGroup, FormattedSourceEntry[]> = {
      STATUTORY_VAULT: [],
      INTERNAL_PLAYBOOK: [],
      OFFICIAL_REGULATOR_WEB: [],
      LEGAL_AND_PRESS: [],
    };
    for (const entry of filteredEntries) {
      buckets[entry.tierGroup].push(entry);
    }
    return buckets;
  }, [filteredEntries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Sources">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/25 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-[460px] bg-white shadow-xl border-l border-zinc-200 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-700">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3 className="text-[13.5px] font-semibold text-zinc-950">
                  Sources ({formattedEntries.length})
                </h3>
                <p className="text-[11.5px] text-zinc-500">
                  Statutory citations, internal rules &amp; regulatory references
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors cursor-pointer"
              aria-label="Close sources drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Filter */}
          {formattedEntries.length > 6 && (
            <div className="px-6 py-3 border-b border-zinc-100 bg-white">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter sources by regulator, statute, or domain..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/70 pl-8 pr-3 py-1.5 text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Grouped Source List */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-[12.5px] text-zinc-500">
                No sources match &ldquo;{filterQuery}&rdquo;.
              </div>
            ) : (
              GROUP_ORDER.map((groupKey) => {
                const items = groupedEntries[groupKey];
                if (!items || items.length === 0) return null;
                const meta = GROUP_META[groupKey];

                return (
                  <section key={groupKey} className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <h4 className="text-[11.5px] font-semibold uppercase tracking-wider text-zinc-600">
                          {meta.label}
                        </h4>
                        <p className="text-[11px] text-zinc-400">{meta.description}</p>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                        {items.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {items.map((entry, idx) => {
                        if (entry.tierGroup === "STATUTORY_VAULT" && entry.clauseId) {
                          return (
                            <button
                              key={`${entry.clauseId}-${idx}`}
                              type="button"
                              onClick={() => {
                                onInspectEvidence?.(entry.clauseId!);
                              }}
                              className="w-full group text-left rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 px-3.5 py-2.5 transition-all flex items-start justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold text-zinc-900">
                                      {entry.badgeLabel}
                                    </span>
                                    {entry.subtitle && (
                                      <span className="text-[11px] text-zinc-500 truncate">
                                        {entry.subtitle}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[12.5px] font-medium text-zinc-900 leading-snug break-words">
                                    {entry.primaryTitle}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 mt-1 shrink-0" />
                            </button>
                          );
                        }

                        if (entry.tierGroup === "INTERNAL_PLAYBOOK") {
                          return (
                            <div
                              key={`pb-${idx}`}
                              className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 flex items-start gap-2.5"
                            >
                              <BookOpen className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-zinc-200 font-mono text-[10px] font-semibold text-zinc-800">
                                    {entry.badgeLabel}
                                  </span>
                                  {entry.subtitle && (
                                    <span className="text-[11px] text-zinc-500 truncate">
                                      {entry.subtitle}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12.5px] font-medium text-zinc-900 leading-snug break-words">
                                  {entry.primaryTitle}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        const isOfficial = entry.tierGroup === "OFFICIAL_REGULATOR_WEB";
                        return (
                          <a
                            key={`web-${idx}`}
                            href={entry.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 px-3.5 py-2.5 transition-all flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <Globe
                                className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                                  isOfficial ? "text-emerald-600" : "text-zinc-400"
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[10px] font-semibold ${
                                      isOfficial
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                    }`}
                                  >
                                    {entry.badgeLabel}
                                  </span>
                                  {entry.hostname && (
                                    <span className="font-mono text-[11px] text-zinc-500 truncate">
                                      {entry.hostname}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12.5px] font-medium text-zinc-900 leading-snug break-words">
                                  {entry.primaryTitle}
                                </p>
                              </div>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 mt-1 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
