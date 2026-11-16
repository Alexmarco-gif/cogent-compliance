"use client";

import React from "react";
import { FileText, BookOpen, Globe, ExternalLink, Paperclip } from "lucide-react";
import type {
  CitationItem,
  ExecutionPlanStep,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import {
  AgentExecutionPlanCard,
  AutonomousAnalystWorkbench,
} from "@/components/chat/AutonomousAnalystWorkbench";

export interface MessageAttachmentChip {
  assetId?: string;
  filename: string;
}

export interface AdaptiveMessageRendererProps {
  content: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  citations?: CitationItem[];
  planSteps?: ExecutionPlanStep[];
  structuredReport?: StructuredComplianceReport;
  attachments?: MessageAttachmentChip[];
  onInspectEvidence?: (clauseId: string) => void;
  onApplyCompliantRewrite?: (rewrittenCopy: string) => Promise<void> | void;
  onApproveAndSealDossier?: (rewrittenCopy: string) => Promise<void> | void;
  isStreaming?: boolean;
}

export function AdaptiveMessageRenderer({
  content,
  role,
  citations = [],
  planSteps = [],
  structuredReport,
  attachments = [],
  onInspectEvidence,
  onApplyCompliantRewrite,
  onApproveAndSealDossier,
  isStreaming,
}: AdaptiveMessageRendererProps) {
  if (role === "USER") {
    return (
      <div className="max-w-3xl mx-auto flex justify-end my-4">
        <div className="max-w-[80%] rounded-2xl bg-zinc-100 border border-zinc-200/80 px-4 py-2.5 text-[14px] text-zinc-950 leading-relaxed space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((att, idx) => (
                <span
                  key={att.assetId || `${att.filename}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[12px] font-medium text-zinc-700"
                >
                  <Paperclip className="h-3 w-3 text-zinc-500 shrink-0" />
                  <span className="truncate max-w-[220px]">{att.filename}</span>
                </span>
              ))}
            </div>
          )}
          {content && <p className="whitespace-pre-wrap">{content}</p>}
        </div>
      </div>
    );
  }

  const renderedContent = renderMarkdownToTypography(content);

  return (
    <div className="max-w-3xl mx-auto my-5 space-y-4">
      {/* Autonomous Multi-Step Execution Plan */}
      {planSteps.length > 0 && <AgentExecutionPlanCard steps={planSteps} />}

      {/* Unboxed Editorial Prose on White Canvas */}
      <div className="space-y-3 text-[14.5px] text-zinc-800 leading-relaxed font-sans">
        {renderedContent}
        {isStreaming && (
          <span className="inline-block h-3.5 w-1.5 animate-pulse bg-zinc-900 ml-1 align-middle" />
        )}
      </div>

      {/* Autonomous Analyst Workbench (Problem -> Risk -> Fix + KFS + 1-Click HITL) */}
      {structuredReport && (
        <AutonomousAnalystWorkbench
          report={structuredReport}
          onInspectEvidence={onInspectEvidence}
          onApplyCompliantRewrite={onApplyCompliantRewrite}
          onApproveAndSealDossier={onApproveAndSealDossier}
        />
      )}

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

interface ListEntry {
  text: string;
  indented: boolean;
}

/**
 * Semantic Markdown parser respecting DOC-10-ACPC typography rules.
 */
function renderMarkdownToTypography(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let blockquoteBuffer: string[] = [];
  let listBuffer: { type: "ul" | "ol"; items: ListEntry[] } | null = null;
  let tableBuffer: string[] = [];
  let codeBlockBuffer: { lang: string; lines: string[] } | null = null;

  const flushCodeBlock = () => {
    if (!codeBlockBuffer) return;
    const rawCode = codeBlockBuffer.lines.join("\n").trimEnd();
    const lang = codeBlockBuffer.lang;
    nodes.push(
      <div
        key={`code-${nodes.length}`}
        className="my-3 rounded-lg border border-zinc-200 bg-zinc-50/90 overflow-hidden"
      >
        {lang && lang.toLowerCase() !== "text" && lang.toLowerCase() !== "plaintext" && (
          <div className="px-3.5 py-1.5 border-b border-zinc-200/80 bg-zinc-100/70 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            {lang}
          </div>
        )}
        <pre className="p-3.5 overflow-x-auto text-[12.5px] font-mono text-zinc-800 leading-relaxed whitespace-pre-wrap break-words">
          <code>{rawCode}</code>
        </pre>
      </div>,
    );
    codeBlockBuffer = null;
  };

  const flushBlockquote = () => {
    if (blockquoteBuffer.length > 0) {
      nodes.push(
        <blockquote
          key={`bq-${nodes.length}`}
          className="border-l-2 border-zinc-300 bg-zinc-50 pl-4 pr-3 py-2.5 my-2 text-[13.5px] text-zinc-700 italic rounded-r-md leading-relaxed space-y-1"
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
    if (!listBuffer) return;
    const Tag = listBuffer.type === "ul" ? "ul" : "ol";
    const listStyle = listBuffer.type === "ul" ? "list-disc" : "list-decimal";
    nodes.push(
      <Tag
        key={`${listBuffer.type}-${nodes.length}`}
        className={`my-2 ${listStyle} list-outside ml-5 space-y-1.5 text-zinc-800`}
      >
        {listBuffer.items.map((item, idx) => (
          <li
            key={idx}
            className={`leading-relaxed ${item.indented ? "ml-5 list-[circle]" : ""}`}
          >
            {parseInlineFormatting(item.text)}
          </li>
        ))}
      </Tag>,
    );
    listBuffer = null;
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const parseRow = (row: string) => {
        const stripped = row.trim().replace(/^\|/, "").replace(/\|$/, "");
        return stripped.split("|").map((cell) => cell.trim());
      };

      const isSeparatorRow = (row: string) =>
        /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(row) ||
        /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(row);

      const headers = parseRow(tableBuffer[0] || "");
      const hasSeparator = isSeparatorRow(tableBuffer[1] || "");
      const bodyRows = tableBuffer
        .slice(hasSeparator ? 2 : 1)
        .filter((row) => !isSeparatorRow(row))
        .map(parseRow)
        .filter((r) => r.some((cell) => cell.length > 0));

      if (headers.length > 0 && bodyRows.length > 0) {
        nodes.push(
          <div
            key={`tbl-${nodes.length}`}
            className="my-3 overflow-x-auto rounded-lg border border-zinc-200"
          >
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-medium">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 align-top">
                      {parseInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-zinc-700 align-top">
                        {parseInlineFormatting(row[cIdx] ?? "")}
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

    // 1. Fenced code block toggle (``` or ```lang)
    const fenceMatch = /^```([\w-]*)\s*$/.exec(trimmed);
    if (fenceMatch) {
      if (codeBlockBuffer) {
        flushCodeBlock();
      } else {
        flushTable();
        flushBlockquote();
        flushList();
        codeBlockBuffer = { lang: fenceMatch[1] || "", lines: [] };
      }
      continue;
    }

    if (codeBlockBuffer) {
      codeBlockBuffer.lines.push(line);
      continue;
    }

    // 2. Skip ASCII grid border rows (+-----+-----+) outside code blocks
    if (/^\+[-+=]+\+\s*$/.test(trimmed)) {
      flushBlockquote();
      flushList();
      continue;
    }

    // 3. Markdown tables (lines with pipes)
    const isTableLine =
      (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) ||
      (tableBuffer.length > 0 && trimmed.startsWith("|"));

    if (isTableLine) {
      flushBlockquote();
      flushList();
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    // 4. Horizontal rules / long dashed or equals dividers
    if (/^(?:[-*_]{3,}|={4,})\s*$/.test(trimmed)) {
      flushBlockquote();
      flushList();
      nodes.push(<hr key={`hr-${nodes.length}`} className="my-4 border-zinc-200" />);
      continue;
    }

    // 5. Blockquotes
    if (trimmed.startsWith(">")) {
      flushList();
      blockquoteBuffer.push(trimmed.replace(/^>\s*/, ""));
      continue;
    } else {
      flushBlockquote();
    }

    // 6. Unordered lists (including indented sub-bullets)
    const ulMatch = /^(\s*)[-*•]\s+(.+)$/.exec(line);
    if (ulMatch) {
      const indented = (ulMatch[1] || "").length >= 2;
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push({ text: ulMatch[2] || "", indented });
      continue;
    }

    // 7. Ordered lists
    const olMatch = /^(\s*)\d+[.)]\s+(.+)$/.exec(line);
    if (olMatch) {
      const indented = (olMatch[1] || "").length >= 2;
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push({ text: olMatch[2] || "", indented });
      continue;
    }

    flushList();

    // 8. Headings (# through ######)
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1]?.length || 3;
      const headingText = headingMatch[2] || "";
      if (level === 1) {
        nodes.push(
          <h2
            key={`h1-${nodes.length}`}
            className="text-[18px] font-semibold tracking-tight text-zinc-950 mt-5 mb-2"
          >
            {parseInlineFormatting(headingText)}
          </h2>,
        );
      } else if (level === 2) {
        nodes.push(
          <h3
            key={`h2-${nodes.length}`}
            className="text-[16px] font-semibold tracking-tight text-zinc-950 mt-5 mb-1.5"
          >
            {parseInlineFormatting(headingText)}
          </h3>,
        );
      } else if (level === 3) {
        nodes.push(
          <h3
            key={`h3-${nodes.length}`}
            className="text-[15px] font-semibold tracking-tight text-zinc-950 mt-4 mb-1.5"
          >
            {parseInlineFormatting(headingText)}
          </h3>,
        );
      } else {
        nodes.push(
          <h4
            key={`h4-${nodes.length}`}
            className="text-[13.5px] font-semibold text-zinc-900 mt-3.5 mb-1"
          >
            {parseInlineFormatting(headingText)}
          </h4>,
        );
      }
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

  flushCodeBlock();
  flushTable();
  flushBlockquote();
  flushList();

  return nodes;
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-zinc-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-zinc-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono text-[12px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-zinc-300 underline-offset-2 text-zinc-900 hover:decoration-zinc-700 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}
