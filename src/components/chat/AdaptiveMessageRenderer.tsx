"use client";

import React from "react";
import { ShieldCheck, BookOpen, Globe2, ExternalLink } from "lucide-react";
import type { CitationItem } from "@/contracts/conversation.contracts";

export interface AdaptiveMessageRendererProps {
  content: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  citations?: CitationItem[];
  onInspectEvidence?: (clauseId: string) => void;
  isStreaming?: boolean;
}

export function AdaptiveMessageRenderer({
  content,
  role,
  citations = [],
  onInspectEvidence,
  isStreaming,
}: AdaptiveMessageRendererProps) {
  if (role === "USER") {
    return (
      <div className="flex justify-end my-4">
        <div className="max-w-2xl rounded-2xl bg-brand-navy px-5 py-3.5 text-sm text-white shadow-2xs leading-relaxed">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  // Parse markdown into clean elements (subheadings, blockquotes, lists, paragraphs, code blocks)
  const renderedContent = renderMarkdownToTypography(content);

  return (
    <div className="my-6 space-y-4">
      {/* Assistant Message Bubble / Canvas */}
      <div className="rounded-xl border border-slate-200/80 bg-surface p-6 shadow-2xs space-y-4">
        {/* Rendered Semantic Text Content */}
        <div className="space-y-3 text-sm text-slate-800 leading-relaxed font-sans">
          {renderedContent}
          {isStreaming && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-brand-primary ml-1 align-middle" />
          )}
        </div>

        {/* Source Separation: Verified Citations Strip */}
        {citations.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Verified Authority & Citations
              </span>
              <span className="text-[11px] text-slate-400">
                {citations.length} {citations.length === 1 ? "source" : "sources"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {citations.map((citation, index) => {
                if (citation.source_class === "VERIFIED_OFFICIAL_SOURCE") {
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        citation.regulatory_clause_id &&
                        onInspectEvidence?.(citation.regulatory_clause_id)
                      }
                      className="inline-flex items-center space-x-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-2xs group cursor-pointer"
                      title="Inspect verbatim statutory text in Evidence Drawer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold text-[11px] text-blue-900">
                        [{citation.regulator || "VAULT"}]
                      </span>
                      <span className="font-medium truncate max-w-[240px]">
                        {citation.clause_reference || citation.instrument_title}
                      </span>
                      <span className="text-[10px] text-blue-500 font-mono group-hover:underline">
                        Inspect →
                      </span>
                    </button>
                  );
                }

                if (citation.source_class === "INTERNAL_PLAYBOOK") {
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1.5 rounded-md border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs text-purple-800 shadow-2xs"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="font-semibold text-[11px] text-purple-900">
                        [PLAYBOOK]
                      </span>
                      <span className="font-medium truncate max-w-[240px]">
                        {citation.rule_title}
                      </span>
                    </span>
                  );
                }

                if (citation.source_class === "LIVE_WEB_INTELLIGENCE") {
                  return (
                    <a
                      key={index}
                      href={citation.retrieved_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 rounded-md border border-cyan-200 bg-cyan-50/80 px-2.5 py-1 text-xs text-cyan-800 hover:bg-cyan-100 transition-colors shadow-2xs"
                    >
                      <Globe2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                      <span className="font-semibold text-[11px] text-cyan-900">[LIVE WEB]</span>
                      <span className="font-medium truncate max-w-[220px]">
                        {citation.page_title}
                      </span>
                      <ExternalLink className="h-3 w-3 text-cyan-500 shrink-0" />
                    </a>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Lightweight Markdown-to-JSX parser strictly respecting DOC-10-ACPC guidelines:
 * - Subheadings (###)
 * - Blockquotes (legal excerpts)
 * - Lists (bulleted & numbered)
 * - Monospace styling for currency & statutory sections
 */
function renderMarkdownToTypography(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let blockquoteBuffer: string[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushBlockquote = () => {
    if (blockquoteBuffer.length > 0) {
      nodes.push(
        <blockquote
          key={`bq-${nodes.length}`}
          className="border-l-2 border-slate-400 bg-slate-50/80 pl-4 py-2 my-2 text-xs text-slate-700 italic rounded-r leading-relaxed"
        >
          {blockquoteBuffer.map((line, idx) => (
            <p key={idx}>{parseInlineFormatting(line)}</p>
          ))}
        </blockquote>
      );
      blockquoteBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer) {
      if (listBuffer.type === "ul") {
        nodes.push(
          <ul key={`ul-${nodes.length}`} className="my-2 list-disc list-inside space-y-1 text-slate-800 pl-2">
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        nodes.push(
          <ol key={`ol-${nodes.length}`} className="my-2 list-decimal list-inside space-y-1 text-slate-800 pl-2">
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
      }
      listBuffer = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushList();
      blockquoteBuffer.push(trimmed.replace(/^>\s*/, ""));
      continue;
    } else {
      flushBlockquote();
    }

    // Unordered List
    if (/^[-*]\s+/.test(trimmed)) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushList();

    // Headings
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={`h3-${nodes.length}`}
          className="text-sm font-semibold tracking-tight text-slate-900 mt-5 mb-2 uppercase"
        >
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h4
          key={`h4-${nodes.length}`}
          className="text-xs font-bold tracking-wider uppercase text-slate-700 mt-4 mb-2"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h4>
      );
      continue;
    }

    // Empty lines
    if (!trimmed) {
      continue;
    }

    // Standard Paragraph
    nodes.push(
      <p key={`p-${nodes.length}`} className="leading-relaxed">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  }

  flushBlockquote();
  flushList();

  return nodes;
}

/**
 * Handles inline bolding (**text**), code/monospace (`code`), and currency symbols (₦).
 */
function parseInlineFormatting(text: string): React.ReactNode {
  // Split on bold (**...**) and backticks (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="font-mono text-xs bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
