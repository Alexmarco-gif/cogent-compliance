"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  FileImage,
  BookOpen,
  Globe,
  Paperclip,
  Sparkles,
  Table2,
  Stamp,
  Scale,
  ArrowUpRight,
  CornerDownRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Lock,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type {
  CitationItem,
  ComplianceArtifactItem,
  ComplianceArtifactType,
  ExecutionPlanStep,
  FollowUpSuggestion,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import {
  ThinkingTraceHeader,
  type SearchTraceItem,
} from "@/components/chat/ThinkingTraceHeader";
import { deduplicateCitations } from "@/lib/ai/citation-formatter";
import { sanitizeAssistantOutput } from "@/lib/ai/output-sanitizer";

export interface MessageAttachmentChip {
  assetId?: string;
  filename: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  previewUrl?: string;
}

export interface SearchTrackPill {
  track: string;
  label: string;
  status: "RUNNING" | "COMPLETED" | "SKIPPED" | "TIMEOUT";
  resultCount?: number;
  cacheHit?: boolean;
}

export interface EntitlementBlockedBanner {
  feature: "live_web_search" | "cross_border_research";
  reason: string;
  upgrade_plan: "growth" | "scale";
}

export interface WorkProductBannerRef {
  work_product_id: string;
  artifact_type: string;
  workflow_type: string;
  title: string;
  version_number: number;
}

export interface AdaptiveMessageRendererProps {
  messageId?: string;
  content: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  citations?: CitationItem[];
  followUps?: FollowUpSuggestion[];
  feedback?: "up" | "down" | null;
  isLatestAssistantMessage?: boolean;
  canEdit?: boolean;
  planSteps?: ExecutionPlanStep[];
  structuredReport?: StructuredComplianceReport;
  attachments?: MessageAttachmentChip[];
  searchTracks?: SearchTrackPill[];
  searchTraces?: SearchTraceItem[];
  thinkingStartedAt?: number;
  thinkingDurationMs?: number;
  entitlementBlocked?: EntitlementBlockedBanner;
  workProductRef?: WorkProductBannerRef;
  wideRail?: boolean;
  onInspectEvidence?: (clauseId: string) => void;
  onOpenSources?: (citations: CitationItem[]) => void;
  onSelectFollowUp?: (suggestion: FollowUpSuggestion) => void;
  onFeedback?: (rating: "up" | "down" | null) => void;
  onEditMessage?: (
    messageId: string,
    newContent: string
  ) => Promise<boolean | void> | boolean | void;
  onOpenArtifactCanvas?: (
    artifactType: ComplianceArtifactType,
    report: StructuredComplianceReport
  ) => void;
  onOpenWorkProduct?: (workProductId: string, artifactType?: string) => void;
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
  const scrubbed = sanitizeAssistantOutput(raw);
  return scrubbed
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
  return deduplicateCitations(rawCitations);
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
const INLINE_CITATION_SPLIT_RE =
  /(\[(?:CBN|FCCPC|FCCPA|DEON|ARCON|NDPC|NDPA|GAID|NFIU|MLPPA|NDIC|SEC|BOFIA|ISA|CBK|ODPC|BoG|BOG|DPC|SARB|FSCA|BNR|CBE)[^\]]{1,64}\])/g;
const INLINE_CITATION_MATCH_RE =
  /^\[(?:CBN|FCCPC|FCCPA|DEON|ARCON|NDPC|NDPA|GAID|NFIU|MLPPA|NDIC|SEC|BOFIA|ISA|CBK|ODPC|BoG|BOG|DPC|SARB|FSCA|BNR|CBE)[^\]]{1,64}\]$/i;

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
    const parts = child.split(INLINE_CITATION_SPLIT_RE);
    if (parts.length === 1) return child;

    return parts.map((part, i) => {
      if (INLINE_CITATION_MATCH_RE.test(part)) {
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
                : `${cleanRef} — Regulatory Citation`
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

function formatAttachmentSize(bytes?: number | null): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(att: MessageAttachmentChip): boolean {
  if (att.mimeType && att.mimeType.toLowerCase().startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(att.filename);
}

function resolveAttachmentBadge(att: MessageAttachmentChip): {
  label: string;
  badgeClass: string;
  kind: "image" | "pdf" | "doc" | "file";
} {
  const mime = (att.mimeType || "").toLowerCase();
  const lower = att.filename.toLowerCase();
  if (isImageAttachment(att)) {
    return {
      label: "IMAGE",
      badgeClass: "bg-zinc-900 text-white border-zinc-900",
      kind: "image",
    };
  }
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    return {
      label: "PDF",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      kind: "pdf",
    };
  }
  if (
    mime.includes("wordprocessingml") ||
    mime === "application/msword" ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    return {
      label: lower.endsWith(".doc") ? "DOC" : "DOCX",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      kind: "doc",
    };
  }
  const ext = lower.includes(".") ? lower.split(".").pop()?.toUpperCase().slice(0, 5) : null;
  return {
    label: ext || "FILE",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    kind: "file",
  };
}

export function AdaptiveMessageRenderer({
  messageId,
  content,
  role,
  citations = [],
  followUps = [],
  feedback = null,
  isLatestAssistantMessage = false,
  canEdit = false,
  planSteps = [],
  structuredReport,
  attachments = [],
  searchTracks = [],
  searchTraces = [],
  thinkingStartedAt,
  thinkingDurationMs,
  entitlementBlocked,
  workProductRef,
  onInspectEvidence,
  onOpenSources,
  onSelectFollowUp,
  onFeedback,
  onEditMessage,
  onOpenArtifactCanvas,
  onOpenWorkProduct,
  isStreaming,
}: AdaptiveMessageRendererProps) {
  const [copiedAnswer, setCopiedAnswer] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState(content);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [lightboxImage, setLightboxImage] = React.useState<{
    src: string;
    filename: string;
  } | null>(null);
  const [brokenPreviewKeys, setBrokenPreviewKeys] = React.useState<Record<string, boolean>>({});
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing) {
      setEditDraft(content);
      requestAnimationFrame(() => {
        const el = editTextareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
        }
      });
    }
  }, [isEditing, content]);

  React.useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage]);

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

  const sourceBuckets = React.useMemo(() => {
    const hasVault = dedupedCitations.some((c) => c.source_class === "VERIFIED_OFFICIAL_SOURCE");
    const hasPlaybook = dedupedCitations.some((c) => c.source_class === "INTERNAL_PLAYBOOK");
    const hasWeb = dedupedCitations.some((c) => c.source_class === "LIVE_WEB_INTELLIGENCE");
    return { hasVault, hasPlaybook, hasWeb };
  }, [dedupedCitations]);

  const handleCopyAnswer = React.useCallback(async () => {
    if (!sanitizedMarkdown) return;
    try {
      await navigator.clipboard.writeText(sanitizedMarkdown);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  }, [sanitizedMarkdown]);

  const handleSaveEdit = React.useCallback(async () => {
    const trimmed = editDraft.trim();
    if (!trimmed || !messageId || !onEditMessage || isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      const result = await onEditMessage(messageId, trimmed);
      if (result !== false) {
        setIsEditing(false);
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  }, [editDraft, messageId, onEditMessage, isSubmittingEdit]);

  // Strictly single-column centered editorial reading stream (Claude / ChatGPT Canvas style)
  if (role === "USER") {
    const canShowEditButton = Boolean(canEdit && messageId && onEditMessage && !isStreaming && !isEditing);

    return (
      <>
        <div className="max-w-3xl w-full mx-auto flex flex-col items-end my-4 group">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-end gap-2 max-w-[88%] sm:max-w-[80%]">
              {attachments.map((att, idx) => {
                const key = att.assetId || `${att.filename}-${idx}`;
                const badge = resolveAttachmentBadge(att);
                const sizeLabel = formatAttachmentSize(att.fileSizeBytes);
                const assetContentUrl = att.assetId
                  ? `/api/marketing-shield/v1/assets/${att.assetId}/content`
                  : undefined;
                const imageSrc = att.previewUrl || assetContentUrl;
                const showImagePreview =
                  badge.kind === "image" && Boolean(imageSrc) && !brokenPreviewKeys[key];

                if (badge.kind === "image") {
                  if (showImagePreview && imageSrc) {
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLightboxImage({ src: imageSrc, filename: att.filename })}
                        className="group/att w-[210px] sm:w-[240px] text-left rounded-xl overflow-hidden border border-zinc-200 bg-white hover:border-zinc-300 shadow-xs transition-all cursor-pointer"
                        title={`Preview ${att.filename}`}
                      >
                        <div className="relative h-32 w-full bg-zinc-100 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageSrc}
                            alt={att.filename}
                            onError={() =>
                              setBrokenPreviewKeys((prev) => ({ ...prev, [key]: true }))
                            }
                            className="h-full w-full object-cover group-hover/att:scale-[1.02] transition-transform duration-200"
                          />
                        </div>
                        <div className="px-2.5 py-2 flex items-center justify-between gap-2 bg-white border-t border-zinc-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileImage className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate text-[12px] font-medium text-zinc-900">
                              {att.filename}
                            </span>
                          </div>
                          {sizeLabel && (
                            <span className="font-mono text-[10.5px] text-zinc-400 shrink-0">
                              {sizeLabel}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-xs min-w-[200px] max-w-[280px]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 shrink-0">
                        <FileImage className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-zinc-900">
                          {att.filename}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Image{sizeLabel ? ` • ${sizeLabel}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                }

                const cardInner = (
                  <>
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-[10px] font-bold shrink-0 ${badge.badgeClass}`}
                    >
                      {badge.kind === "pdf" || badge.kind === "doc" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-zinc-900">
                        {att.filename}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {badge.label}
                        {sizeLabel ? ` • ${sizeLabel}` : ""}
                      </p>
                    </div>
                    {assetContentUrl && (
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400 group-hover/file:text-zinc-800 shrink-0 transition-colors" />
                    )}
                  </>
                );

                return assetContentUrl ? (
                  <a
                    key={key}
                    href={assetContentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/file flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white hover:border-[#1D4ED8]/40 hover:bg-blue-50/30 px-3 py-2 shadow-xs min-w-[210px] max-w-[290px] transition-colors"
                    title={`Open ${att.filename}`}
                  >
                    {cardInner}
                  </a>
                ) : (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-xs min-w-[210px] max-w-[290px]"
                  >
                    {cardInner}
                  </div>
                );
              })}
            </div>
          )}

          {isEditing ? (
            <div className="w-full max-w-[92%] sm:max-w-[84%] rounded-2xl border border-[#1D4ED8]/45 ring-2 ring-[#1D4ED8]/10 bg-white p-3 shadow-sm space-y-2.5">
              <textarea
                ref={editTextareaRef}
                value={editDraft}
                onChange={(e) => {
                  setEditDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 260)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setIsEditing(false);
                    setEditDraft(content);
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSaveEdit();
                  }
                }}
                rows={2}
                disabled={isSubmittingEdit}
                className="w-full resize-none bg-transparent text-[14px] text-zinc-950 leading-relaxed focus:outline-none"
                aria-label="Edit message"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
                <span className="text-[11px] text-zinc-500">
                  Saving will update this message and regenerate the response below.
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditDraft(content);
                    }}
                    disabled={isSubmittingEdit}
                    className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[12px] font-medium text-zinc-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit()}
                    disabled={isSubmittingEdit || !editDraft.trim()}
                    className="px-3 py-1 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-zinc-200 disabled:text-zinc-400 text-[12px] font-medium text-white transition-colors cursor-pointer"
                  >
                    {isSubmittingEdit ? "Resending..." : "Save & Resend"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {content && (
                <div className="max-w-[85%] sm:max-w-[78%] rounded-2xl bg-zinc-100 border border-zinc-200/80 px-4 py-2.5 text-[14px] text-zinc-950 leading-relaxed break-words">
                  <p className="whitespace-pre-wrap">{content}</p>
                </div>
              )}

              {canShowEditButton && (
                <div className="mt-1 flex items-center justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    title="Edit & resend message"
                    aria-label="Edit & resend message"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.filename}
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between text-white px-1">
                <span className="truncate text-[13px] font-medium">{lightboxImage.filename}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={lightboxImage.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[12px] text-white transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setLightboxImage(null)}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.src}
                alt={lightboxImage.filename}
                className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain bg-zinc-900 border border-white/10 shadow-2xl"
              />
            </div>
          </div>
        )}
      </>
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
      {/* 1. Unified THINKING / VERIFIED Badge + Live Elapsed Timer + Collapsible Search Traces */}
      <ThinkingTraceHeader
        isStreaming={isStreaming}
        startedAt={thinkingStartedAt}
        durationMs={thinkingDurationMs}
        traces={searchTraces}
        planSteps={planSteps}
        searchTracks={searchTracks}
        citationCount={dedupedCitations.length}
      />

      {/* 1c. Server-Enforced Entitlement Blocked Banner (with Vault fallback active) */}
      {entitlementBlocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[12px] text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {entitlementBlocked.reason}
              </p>
              <p className="text-amber-800 text-[11.5px]">
                Statutory Vault &amp; internal policy grounding remain active for this answer.
              </p>
            </div>
          </div>
          <Link
            href={`/settings/billing?upgrade=${entitlementBlocked.upgrade_plan}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[11.5px] font-medium shrink-0 self-start sm:self-center"
          >
            <span>Upgrade to {entitlementBlocked.upgrade_plan === "scale" ? "Scale" : "Growth"}</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
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

      {/* 4b. Persisted Regulatory Work Product Deliverable Card */}
      {workProductRef && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() =>
              onOpenWorkProduct?.(workProductRef.work_product_id, workProductRef.artifact_type)
            }
            className="w-full group text-left rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 hover:border-zinc-300 px-4 py-3 shadow-sm transition-all flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-zinc-900 text-white shrink-0">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    {workProductRef.workflow_type.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700">
                    v{workProductRef.version_number}
                  </span>
                </div>
                <p className="text-[13.5px] font-semibold text-zinc-950 truncate mt-0.5">
                  {workProductRef.title}
                </p>
                <p className="text-[11.5px] text-zinc-500 mt-0.5">
                  Editable inline deliverable • Exportable to PDF &amp; Word (.docx)
                </p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 group-hover:border-zinc-400 font-mono text-[11px] font-medium text-zinc-900">
              <span>Open Studio</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      )}

      {/* 5. Compact Action Bar + Clickable "N sources" Pill (Perplexity-style) */}
      {!isStreaming && (sanitizedMarkdown || dedupedCitations.length > 0) && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-zinc-500">
          <div className="flex flex-wrap items-center gap-1">
            {sanitizedMarkdown && (
              <button
                type="button"
                onClick={handleCopyAnswer}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Copy response"
                aria-label="Copy response"
              >
                {copiedAnswer ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}

            {onFeedback && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(feedback === "up" ? null : "up")}
                  className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors cursor-pointer ${
                    feedback === "up"
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Helpful response"
                  aria-label="Helpful response"
                  aria-pressed={feedback === "up"}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(feedback === "down" ? null : "down")}
                  className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors cursor-pointer ${
                    feedback === "down"
                      ? "text-rose-700 bg-rose-50"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Needs improvement"
                  aria-label="Needs improvement"
                  aria-pressed={feedback === "down"}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {dedupedCitations.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenSources) {
                    onOpenSources(dedupedCitations);
                  } else {
                    const firstVaultId = dedupedCitations.find(
                      (c) => c.source_class === "VERIFIED_OFFICIAL_SOURCE" && c.regulatory_clause_id
                    )?.regulatory_clause_id;
                    if (firstVaultId) onInspectEvidence?.(firstVaultId);
                  }
                }}
                className="ml-1 inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white hover:bg-zinc-50 hover:border-zinc-300 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 transition-colors cursor-pointer"
                title="View all verified statutes, playbooks, and regulatory sources"
              >
                <span className="flex items-center -space-x-1">
                  {sourceBuckets.hasVault && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-white ring-1 ring-white">
                      <FileText className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {sourceBuckets.hasPlaybook && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-zinc-800 ring-1 ring-white">
                      <BookOpen className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {sourceBuckets.hasWeb && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-white">
                      <Globe className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
                <span>
                  {dedupedCitations.length}{" "}
                  {dedupedCitations.length === 1 ? "source" : "sources"}
                </span>
              </button>
            )}
          </div>

          {workProductRef && onOpenWorkProduct && (
            <button
              type="button"
              onClick={() =>
                onOpenWorkProduct(workProductRef.work_product_id, workProductRef.artifact_type)
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <span>Open Work Product</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 6. Contextual Follow-Up Actions & Drill-Down Questions (latest message only) */}
      {!isStreaming && isLatestAssistantMessage && followUps.length > 0 && onSelectFollowUp && (
        <div className="pt-3 border-t border-zinc-200/70 space-y-1">
          {followUps.map((item) => {
            const isWorkflow = item.kind === "workflow";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectFollowUp(item)}
                className="w-full group flex items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {isWorkflow ? (
                    <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-950 mt-0.5 shrink-0 transition-colors" />
                  ) : (
                    <CornerDownRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900 mt-0.5 shrink-0 transition-colors" />
                  )}
                  <span className="text-[13.5px] leading-snug text-zinc-700 group-hover:text-zinc-950 transition-colors">
                    {item.label}
                  </span>
                </div>
                {isWorkflow && item.badge_label && (
                  <span className="shrink-0 mt-0.5 inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600 group-hover:border-zinc-300 group-hover:text-zinc-900">
                    {item.badge_label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
