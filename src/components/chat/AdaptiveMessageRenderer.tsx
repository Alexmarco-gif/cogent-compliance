"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  BookOpen,
  Globe,
  ExternalLink,
  Paperclip,
  Sparkles,
  Table2,
  Stamp,
  Scale,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type {
  CitationItem,
  ComplianceArtifactItem,
  ComplianceArtifactType,
  ExecutionPlanStep,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import { AgentExecutionPlanCard } from "@/components/chat/AutonomousAnalystWorkbench";

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
  wideRail?: boolean;
  onInspectEvidence?: (clauseId: string) => void;
  onOpenArtifactCanvas?: (
    artifactType: ComplianceArtifactType,
    report: StructuredComplianceReport
  ) => void;
  onApplyCompliantRewrite?: (rewrittenCopy: string) => Promise<boolean | void> | boolean | void;
  onApproveAndSealDossier?: (rewrittenCopy: string) => Promise<boolean | void> | boolean | void;
  isStreaming?: boolean;
}

/**
 * Sanitizes raw LLM markdown before passing to react-markdown + remark-gfm:
 * - Unwraps ```text / ```markdown fences so tables and prose render natively
 * - Strips ASCII box-drawing borders (+---+---+, =====)
 */
export function sanitizeEditorialMarkdown(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/```(?:text|plaintext|markdown|md)?\n([\s\S]*?)```/gi, "$1")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^\+[-+=]+\+\s*$/.test(trimmed)) return false;
      if (/^\|[-=+]+\|\s*$/.test(trimmed) && !trimmed.includes("---")) return false;
      if (/^={4,}\s*$/.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

/**
 * Client-side sanitizer & semantic deduplicator for source chips.
 * Strips OCR double-word stutter (e.g. "35.35.AnAn advertiser,advertiser, pr..." -> "Section 35")
 * and collapses duplicate chunks from the same statutory provision.
 */
export function cleanAndDeduplicateCitations(rawCitations: CitationItem[]): CitationItem[] {
  const cleanLabel = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    let s = raw.replace(/\s+/g, " ").trim();
    s = s.replace(/\[P(?:age)?[^\]]*\]?/gi, "").replace(/\[[^\]]*$/g, "").trim();
    const stutterMatch = s.match(/^(\d+(?:\.\d+)*)\.\1\.?(?:\s+|(?=[A-Za-z]))/);
    if (stutterMatch?.[1]) {
      return `Section ${stutterMatch[1]}`;
    }
    s = s
      .replace(/\b([A-Za-z]{2,})\1\b/g, "$1")
      .replace(/\b([A-Za-z]{2,})\s*,\s*\1\b/gi, "$1");
    const leadingNumMatch = s.match(/^(\d+(?:\.\d+)*)\.?\s*[A-Za-z]/);
    if (leadingNumMatch?.[1] && s.length > 42) {
      return `Section ${leadingNumMatch[1]}`;
    }
    const partMatch = s.match(/^(PART\s+[IVXLC0-9]+)\s*[—–-]\s*(.+)$/i);
    if (partMatch?.[1] && partMatch[2]) {
      const partLabel = partMatch[1].toUpperCase();
      const partTitle = partMatch[2]
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 44)
        .trim();
      return `${partLabel} — ${partTitle}`;
    }
    return s.length > 56 ? `${s.slice(0, 53).trim()}...` : s;
  };

  const unique: CitationItem[] = [];
  const seenKeys = new Set<string>();

  for (const cit of rawCitations) {
    const cleanedClause = cleanLabel(cit.clause_reference);
    const cleanedTitle = cleanLabel(cit.instrument_title) || cit.instrument_title;
    const cleanedRule = cleanLabel(cit.rule_title) || cit.rule_title;

    const idKey = cit.regulatory_clause_id || cit.retrieved_url || "";
    const hasSemanticLabel = Boolean(
      cleanedTitle || cleanedRule || cit.page_title || cleanedClause
    );
    const semanticKey = hasSemanticLabel
      ? [
          cit.source_class,
          (cit.regulator || "").toUpperCase(),
          (cleanedTitle || cleanedRule || cit.page_title || "").toLowerCase(),
          (cleanedClause || "").toLowerCase(),
        ].join("::")
      : `${cit.source_class}::${idKey}`;

    if (seenKeys.has(semanticKey)) {
      continue;
    }
    seenKeys.add(semanticKey);

    unique.push({
      ...cit,
      ...(cleanedClause ? { clause_reference: cleanedClause } : {}),
      ...(cleanedTitle ? { instrument_title: cleanedTitle } : {}),
      ...(cleanedRule ? { rule_title: cleanedRule } : {}),
    });
  }

  return unique;
}

/**
 * Builds the clickable deliverable descriptors for the message footer.
 */
function resolveDeliverableCards(
  report?: StructuredComplianceReport
): ComplianceArtifactItem[] {
  if (!report) return [];
  if (report.compliance_artifacts && report.compliance_artifacts.length > 0) {
    return report.compliance_artifacts;
  }

  const cards: ComplianceArtifactItem[] = [];
  const apr = report.pre_flight_gate.apr_audit;
  const fin = report.computed_financials;
  const effectiveApr = fin?.effective_apr_percent ?? apr?.effective_nominal_apr;
  const netCash = fin?.net_disbursed_cash_ngn ?? apr?.net_disbursed_ngn;

  if (report.artifacts.compliant_rewrite) {
    cards.push({
      id: "artifact_compliant_rewrite",
      type: "compliant_ad_rewrite",
      title: "Compliant Ad Copy & Redline Diff",
      subtitle: "Layer-6 Lock Verified • Social, Flyer & 160-Char SMS Variants",
      badge_label: "VERIFIED REWRITE",
    });
  }

  if (report.artifacts.kfs_table) {
    cards.push({
      id: "artifact_cbn_kfs",
      type: "cbn_kfs_statement",
      title: `Mandatory CBN Key Facts Statement (${report.artifacts.kfs_table.product_name})`,
      subtitle:
        effectiveApr !== undefined && netCash !== undefined
          ? `Locked APR: ${effectiveApr}% p.a. • Net Cash: ₦${netCash.toLocaleString("en-NG")}`
          : "12-Row Statutory Disclosure Schedule (CBN CPF Annex 1)",
      badge_label: "CBN KFS SCHEDULE",
    });
  }

  if (report.artifacts.arcon_asp_memo) {
    cards.push({
      id: "artifact_arcon_memo",
      type: "arcon_vetting_memo",
      title: "ARCON ASP Pre-Vetting Substantiation Memo",
      subtitle: "ARCON Act 2022 §54 & AISOP Statutory Clearance Dossier",
      badge_label: "ARCON ASP DOSSIER",
    });
  }

  cards.push({
    id: "artifact_audit_dossier",
    type: "audit_dossier_summary",
    title: "Deterministic Lock & Blind-Spot Audit Matrix",
    subtitle: `${report.blind_spot_findings.length} ${
      report.blind_spot_findings.length === 1 ? "Finding" : "Findings"
    } • Pre-Flight Verdict: ${report.pre_flight_gate.verdict} (${report.pre_flight_gate.risk_score}/100)`,
    badge_label: `VERDICT: ${report.pre_flight_gate.verdict}`,
  });

  return cards;
}

/**
 * Decorates inline text children to turn bracketed statutory references like
 * [FCCPA §115], [CBN CPF §3.2.1], [ARCON Act §54] into interactive citation pills.
 */
function renderChildrenWithInlineCitations(
  children: React.ReactNode,
  citations: CitationItem[],
  onInspectEvidence?: (clauseId: string) => void
): React.ReactNode {
  const firstClauseId = citations.find(
    (c) => c.source_class === "VERIFIED_OFFICIAL_SOURCE" && c.regulatory_clause_id
  )?.regulatory_clause_id;

  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const regex = /(\[(?:CBN|FCCPC|FCCPA|ARCON|NDPC|NDPA|SEC|BOFIA|ISA)[^\]]{1,42}\])/g;
    const parts = child.split(regex);
    if (parts.length === 1) return child;

    return parts.map((part, i) => {
      if (regex.test(part)) {
        const cleanRef = part.slice(1, -1).trim();
        const matchedCit = citations.find(
          (c) =>
            c.source_class === "VERIFIED_OFFICIAL_SOURCE" &&
            c.regulator &&
            cleanRef.toUpperCase().includes(c.regulator.toUpperCase())
        );
        const targetClauseId = matchedCit?.regulatory_clause_id || firstClauseId;

        return (
          <button
            key={i}
            type="button"
            onClick={() => targetClauseId && onInspectEvidence?.(targetClauseId)}
            title={
              matchedCit
                ? `${matchedCit.regulator} — ${matchedCit.instrument_title || ""} (${matchedCit.clause_reference || cleanRef})`
                : `${cleanRef} — Verified Nigerian Statutory Provision`
            }
            className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-100/90 hover:bg-zinc-200/80 font-mono text-[11px] font-medium text-zinc-800 align-baseline transition-colors cursor-pointer"
          >
            {cleanRef}
          </button>
        );
      }
      return part;
    });
  });
}

export function AdaptiveMessageRenderer({
  content,
  role,
  citations = [],
  planSteps = [],
  structuredReport,
  attachments = [],
  onInspectEvidence,
  onOpenArtifactCanvas,
  isStreaming,
}: AdaptiveMessageRendererProps) {
  const dedupedCitations = React.useMemo(
    () => cleanAndDeduplicateCitations(citations),
    [citations]
  );

  const sanitizedMarkdown = React.useMemo(
    () => sanitizeEditorialMarkdown(content),
    [content]
  );

  const deliverableCards = React.useMemo(
    () => resolveDeliverableCards(structuredReport),
    [structuredReport]
  );

  // Strictly single-column centered editorial reading stream (Claude / ChatGPT Canvas style)
  if (role === "USER") {
    return (
      <div className="max-w-3xl w-full mx-auto flex justify-end my-4">
        <div className="max-w-[85%] sm:max-w-[78%] rounded-2xl bg-zinc-100 border border-zinc-200/80 px-4 py-2.5 text-[14px] text-zinc-950 leading-relaxed space-y-2 break-words">
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

  const verdict = structuredReport?.pre_flight_gate.verdict;
  const aprAudit = structuredReport?.pre_flight_gate.apr_audit;
  const fin = structuredReport?.computed_financials;
  const matchedProductName =
    structuredReport?.campaign_context?.product_name ||
    fin?.product_name ||
    aprAudit?.product_name;
  const effectiveApr = fin?.effective_apr_percent ?? aprAudit?.effective_nominal_apr;
  const impliedApr = fin?.advertised_implied_apr_percent ?? aprAudit?.advertised_implied_apr;

  const hasMarkdownTableInContent = /\|.+\|\n\|[-:\s|]+\|/.test(sanitizedMarkdown);

  return (
    <div className="max-w-3xl w-full mx-auto my-6 space-y-4 min-w-0">
      {/* 1. Collapsed Reasoning / Tool Trace Pill */}
      {planSteps.length > 0 && (
        <AgentExecutionPlanCard
          steps={planSteps}
          citationCount={dedupedCitations.length}
          matchedProductName={matchedProductName}
        />
      )}

      {/* 2. Compact 1-Line Inline Verdict Pill (ONLY when auditing an asset, campaign, or rate card) */}
      {structuredReport && verdict && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-1.5 text-[12px]">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {verdict === "BLOCK" ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                <ShieldAlert className="h-3 w-3 shrink-0" />
                <span>HOLD BEFORE PUBLISHING</span>
              </span>
            ) : verdict === "CONDITIONAL" ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>CONDITIONAL (REDLINES REQUIRED)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span>COMPLIANT FOR PUBLICATION</span>
              </span>
            )}

            {matchedProductName && (
              <span className="text-zinc-600 truncate">
                Rate Card: <strong className="font-medium text-zinc-900">{matchedProductName}</strong>
              </span>
            )}

            {effectiveApr !== undefined && (
              <span className="font-mono text-[11px] text-zinc-700">
                • True APR: <strong>{effectiveApr}%</strong>
                {impliedApr !== undefined && impliedApr !== effectiveApr
                  ? ` (vs ${impliedApr}% implied)`
                  : ""}
              </span>
            )}
          </div>

          {onOpenArtifactCanvas && (
            <button
              type="button"
              onClick={() =>
                onOpenArtifactCanvas("compliant_ad_rewrite", structuredReport)
              }
              className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-zinc-700 hover:text-zinc-950 cursor-pointer shrink-0"
            >
              <span>Open Artifact Canvas</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* 3. Full Single-Column Editorial Narrative (react-markdown + remark-gfm) */}
      {sanitizedMarkdown && (
        <div className="text-[14.5px] text-zinc-800 leading-[1.7] font-sans break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950 mt-6 mb-2">
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2 className="text-[17px] font-semibold tracking-tight text-zinc-950 mt-6 mb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[15.5px] font-semibold tracking-tight text-zinc-950 mt-5 mb-1.5">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-[14px] font-semibold text-zinc-900 mt-4 mb-1">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="my-2.5 leading-[1.7] text-zinc-800">
                  {renderChildrenWithInlineCitations(
                    children,
                    dedupedCitations,
                    onInspectEvidence
                  )}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="my-2.5 list-disc list-outside ml-5 space-y-1.5 text-zinc-800">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2.5 list-decimal list-outside ml-5 space-y-1.5 text-zinc-800">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-[1.65] pl-0.5">
                  {renderChildrenWithInlineCitations(
                    children,
                    dedupedCitations,
                    onInspectEvidence
                  )}
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-950">{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-zinc-900 bg-zinc-50/90 pl-4 pr-3 py-2.5 my-3 rounded-r-lg text-[13.5px] text-zinc-800 space-y-1">
                  {children}
                </blockquote>
              ),
              code: ({ className, children }) => {
                const isBlock = Boolean(className && className.includes("language-"));
                if (isBlock) {
                  return (
                    <pre className="my-3 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 overflow-x-auto font-mono text-[12.5px] text-zinc-800 leading-relaxed">
                      <code>{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="font-mono text-[12.5px] bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.5 rounded text-zinc-900">
                    {children}
                  </code>
                );
              },
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
                  <table className="w-full text-left text-[13px] border-collapse">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-600 font-semibold">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-zinc-200 bg-white">{children}</tbody>
              ),
              tr: ({ children }) => <tr className="hover:bg-zinc-50/50">{children}</tr>,
              th: ({ children }) => (
                <th className="px-3.5 py-2.5 align-top font-semibold text-zinc-700">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3.5 py-2.5 align-top text-zinc-800">
                  {renderChildrenWithInlineCitations(
                    children,
                    dedupedCitations,
                    onInspectEvidence
                  )}
                </td>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-zinc-300 underline-offset-2 text-zinc-900 hover:decoration-zinc-800 transition-colors"
                >
                  {children}
                </a>
              ),
            }}
          >
            {sanitizedMarkdown}
          </ReactMarkdown>

          {isStreaming && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-zinc-900 ml-1 align-middle" />
          )}
        </div>
      )}

      {/* 3b. Native Single-Column Financial Comparison Table (if canonical financials exist and LLM didn't inline a Markdown table) */}
      {!isStreaming &&
        structuredReport &&
        !hasMarkdownTableInContent &&
        (fin || aprAudit) && (
          <div className="my-4 overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5">Financial Metric</th>
                  <th className="px-3.5 py-2.5">Advertised / Implied</th>
                  <th className="px-3.5 py-2.5">Active Rate Card / CBN KFS Truth</th>
                  <th className="px-3.5 py-2.5">Statutory Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                <tr>
                  <td className="px-3.5 py-2 font-medium text-zinc-900">Sample Principal</td>
                  <td className="px-3.5 py-2 font-mono text-zinc-700">
                    ₦{(fin?.principal_ngn ?? aprAudit?.principal_ngn ?? 0).toLocaleString("en-NG")}
                  </td>
                  <td className="px-3.5 py-2 font-mono font-semibold text-zinc-900">
                    ₦{(fin?.net_disbursed_cash_ngn ?? aprAudit?.net_disbursed_ngn ?? 0).toLocaleString("en-NG")} Net Disbursed
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11.5px] text-zinc-500">
                    FCCPC DEON Reg. 18
                  </td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 font-medium text-zinc-900">Upfront Processing & Admin Fees</td>
                  <td className="px-3.5 py-2 text-zinc-600">Omitted / Undisclosed in Headline</td>
                  <td className="px-3.5 py-2 font-mono font-semibold text-zinc-900">
                    ₦{(fin?.total_upfront_fees_ngn ?? aprAudit?.upfront_fees_ngn ?? 0).toLocaleString("en-NG")}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11.5px] text-zinc-500">
                    CBN Guide to Charges
                  </td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 font-medium text-zinc-900">Annualized Percentage Rate (APR)</td>
                  <td className="px-3.5 py-2 font-mono text-zinc-700">
                    {impliedApr ?? 0}% p.a. (implied)
                  </td>
                  <td className="px-3.5 py-2 font-mono font-bold text-rose-600">
                    {effectiveApr ?? 0}% Effective APR p.a.
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11.5px] text-zinc-500">
                    FCCPA §115 / CBN CPF §3.2.1
                  </td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 font-medium text-zinc-900">
                    Total Repayable ({fin?.tenor_days ?? aprAudit?.tenor_days ?? 30} Days)
                  </td>
                  <td className="px-3.5 py-2 text-zinc-600">Not Disclosed Upfront</td>
                  <td className="px-3.5 py-2 font-mono font-semibold text-zinc-900">
                    ₦{(fin?.total_repayable_ngn ?? aprAudit?.total_repayment_ngn ?? 0).toLocaleString("en-NG")}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11.5px] text-zinc-500">
                    CBN KFS Annex 1
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      {/* 4. Sleek Horizontal Clickable Deliverable / Artifact Cards (Open in External Right-Hand Canvas Drawer) */}
      {structuredReport && deliverableCards.length > 0 && (
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="font-mono font-semibold uppercase tracking-wider text-zinc-600">
              Interactive Compliance Deliverables (Click to open in Artifact Canvas)
            </span>
            <span className="font-mono text-zinc-400">
              {deliverableCards.length} Studio {deliverableCards.length === 1 ? "Artifact" : "Artifacts"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {deliverableCards.map((card) => {
              const icon =
                card.type === "compliant_ad_rewrite" ? (
                  <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
                ) : card.type === "cbn_kfs_statement" ? (
                  <Table2 className="h-4 w-4 text-zinc-800 shrink-0" />
                ) : card.type === "arcon_vetting_memo" ? (
                  <Stamp className="h-4 w-4 text-zinc-800 shrink-0" />
                ) : (
                  <Scale className="h-4 w-4 text-zinc-800 shrink-0" />
                );

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onOpenArtifactCanvas?.(card.type, structuredReport)}
                  className="group text-left rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50/90 hover:border-zinc-300 px-3.5 py-3 shadow-sm transition-all flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-100/90 border border-zinc-200/80 group-hover:bg-white transition-colors">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-zinc-500">
                          {card.badge_label}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-zinc-950 truncate mt-0.5">
                        {card.title}
                      </p>
                      <p className="text-[11.5px] text-zinc-500 truncate mt-0.5">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 mt-1 inline-flex items-center gap-0.5 font-mono text-[10.5px] font-medium text-zinc-500 group-hover:text-zinc-950">
                    <span>Open</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Clean, Deduplicated Statutory & Institutional Source Chips */}
      {dedupedCitations.length > 0 && (
        <div className="pt-3 border-t border-zinc-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">
              Verified Sources & Statutory Grounding
            </span>
            <span className="font-mono text-zinc-500">
              {dedupedCitations.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {dedupedCitations.map((citation, index) => {
              if (citation.source_class === "VERIFIED_OFFICIAL_SOURCE") {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      citation.regulatory_clause_id &&
                      onInspectEvidence?.(citation.regulatory_clause_id)
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 px-2.5 py-1 text-[11.5px] text-zinc-800 transition-colors cursor-pointer shadow-sm"
                    title={`${citation.regulator || "STATUTE"} — ${citation.instrument_title || ""} (${citation.clause_reference || "Click to inspect statutory provision"})`}
                  >
                    <FileText className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="font-mono text-[10.5px] font-semibold text-zinc-900">
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 text-[11.5px] text-zinc-700"
                  >
                    <BookOpen className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="font-mono text-[10.5px] font-semibold text-zinc-900">
                      PLAYBOOK
                    </span>
                    <span className="truncate max-w-[220px] text-zinc-600">
                      {citation.rule_title ||
                        citation.instrument_title ||
                        "Approved Schedule"}
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11.5px] text-zinc-700 transition-colors shadow-sm"
                    title="Open live web source"
                  >
                    <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="font-mono text-[10.5px] font-semibold text-zinc-900">
                      LIVE WEB
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
