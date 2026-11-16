"use client";

import React from "react";
import { FileText, BookOpen, Globe, ExternalLink } from "lucide-react";
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
      <div className="max-w-3xl mx-auto flex justify-end my-4">
        <div className="max-w-[80%] rounded-2xl bg-zinc-100 border border-zinc-200/80 px-4 py-2.5 text-[14px] text-zinc-950 leading-relaxed">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  const renderedContent = renderMarkdownToTypography(content);

  return (
    <div className="max-w-3xl mx-auto my-5 space-y-4">
      {/* Unboxed Editorial Prose on White Canvas */}
      <div className="space-y-3 text-[14.5px] text-zinc-800 leading-relaxed font-sans">
        {renderedContent}
        {isStreaming && (
          <span className="inline-block h-3.5 w-1.5 animate-pulse bg-zinc-900 ml-1 align-middle" />
        )}
      </div>

      {/* Monochrome Citation Footnote Chips */}
      {citations.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 space-y-2">
          <div className="flex items-center justify-between text-[11.5px] text-zinc-400">
            <span className="font-medium text-zinc-500">Sources</span>
            <span className="font-mono">{citations.length}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-2.5 py-1 text-[12px] text-zinc-800 transition-colors cursor-pointer"
                    title="View full statutory provision"
                  >
                    <FileText className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="font-mono text-[11px] font-medium text-zinc-900">
                      {citation.regulator || "STATUTE"}
                    </span>
                    <span className="truncate max-w-[220px] text-zinc-600">
                      {citation.clause_reference || citation.instrument_title}
                    </span>
                  </button>
                );
              }

              if (citation.source_class === "INTERNAL_PLAYBOOK") {
                return (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[12px] text-zinc-700"
                  >
                    <BookOpen className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="font-medium text-zinc-900">Playbook</span>
                    <span className="truncate max-w-[220px] text-zinc-600">
                      {citation.rule_title || citation.instrument_title || "Approved Schedule"}
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-2.5 py-1 text-[12px] text-zinc-700 transition-colors"
                    title="Open live web source"
                  >
                    <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="font-mono text-[11px] font-medium text-zinc-900">
                      Live Web
                    </span>
                    <span className="truncate max-w-[220px] text-zinc-700">
                      {citation.page_title || citation.retrieved_url}
                    </span>
                    <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                  </a>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Semantic Markdown parser respecting DOC-10-ACPC typography rules.
 */
function renderMarkdownToTypography(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let blockquoteBuffer: string[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
  let tableBuffer: string[] = [];

  const flushBlockquote = () => {
    if (blockquoteBuffer.length > 0) {
      nodes.push(
        <blockquote
          key={`bq-${nodes.length}`}
          className="border-l-2 border-zinc-300 bg-zinc-50 pl-4 pr-3 py-2.5 my-2 text-[13.5px] text-zinc-700 italic rounded-r-md leading-relaxed"
        >
          {blockquoteBuffer.map((line, idx) => (
            <p key={idx}>{parseInlineFormatting(line)}</p>
          ))}
        </blockquote>,
      );
      blockquoteBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer) {
      if (listBuffer.type === "ul") {
        nodes.push(
          <ul
            key={`ul-${nodes.length}`}
            className="my-2 list-disc list-outside ml-5 space-y-1.5 text-zinc-800"
          >
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ul>,
        );
      } else {
        nodes.push(
          <ol
            key={`ol-${nodes.length}`}
            className="my-2 list-decimal list-outside ml-5 space-y-1.5 text-zinc-800"
          >
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ol>,
        );
      }
      listBuffer = null;
    }
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const parseRow = (row: string) =>
        row
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());

      const headers = parseRow(tableBuffer[0] || "");
      const bodyRows = tableBuffer
        .slice(2)
        .map(parseRow)
        .filter((r) => r.length > 0);

      if (headers.length > 0) {
        nodes.push(
          <div
            key={`tbl-${nodes.length}`}
            className="my-3 overflow-x-auto rounded-lg border border-zinc-200"
          >
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-medium">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2">
                      {parseInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-zinc-700">
                        {parseInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
    }
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushBlockquote();
      flushList();
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    if (trimmed.startsWith(">")) {
      flushList();
      blockquoteBuffer.push(trimmed.replace(/^>\s*/, ""));
      continue;
    } else {
      flushBlockquote();
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={`h3-${nodes.length}`}
          className="text-[15px] font-semibold tracking-tight text-zinc-950 mt-5 mb-1.5"
        >
          {trimmed.replace(/^###\s+/, "")}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h4
          key={`h4-${nodes.length}`}
          className="text-[13px] font-semibold tracking-wide uppercase text-zinc-500 mt-4 mb-1.5"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h4>,
      );
      continue;
    }

    if (!trimmed) {
      continue;
    }

    nodes.push(
      <p key={`p-${nodes.length}`} className="leading-relaxed">
        {parseInlineFormatting(trimmed)}
      </p>,
    );
  }

  flushTable();
  flushBlockquote();
  flushList();

  return nodes;
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-zinc-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-zinc-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="font-mono text-[12px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
