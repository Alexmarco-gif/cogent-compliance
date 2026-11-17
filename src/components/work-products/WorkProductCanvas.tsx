"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  FileText,
  Globe,
  History,
  Loader2,
  Lock,
  Pencil,
  Save,
  ShieldCheck,
} from "lucide-react";
import type {
  WorkflowType,
  WorkProductCitation,
  WorkProductEvidenceGap,
  WorkProductGuardrailReport,
  WorkProductRecord,
  WorkProductStatus,
} from "@/contracts/work-product.contracts";
import type { WorkProductRevisionRecord } from "@/modules/work-products/work-product.service";
import { extractApiError } from "@/lib/api-client";
import { WordStyleEditor } from "@/components/work-products/WordStyleEditor";

export interface WorkProductCanvasProps {
  workProductId: string;
  onInspectEvidence?: (clauseId: string) => void;
  onWorkProductUpdated?: (wp: WorkProductRecord) => void;
}

const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  PRODUCT_STRUCTURING_MEMO: "Product Structuring Memo",
  POLICY_GAP_REDLINE: "Policy Gap & SOP Redline",
  SUPERVISORY_DDQ_RESPONSE: "Supervisory / Partner DDQ",
  CROSS_BORDER_COMPARISON: "Cross-Border Expansion Matrix",
  CAMPAIGN_COMPLIANCE_KIT: "Campaign Compliance Kit",
};

const STATUS_STYLE: Record<WorkProductStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  REVIEWED: "bg-amber-50 text-amber-800 border-amber-200",
  FINALIZED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function filterDdqMarkdownGapsOnly(markdown: string): string {
  const blocks = markdown.split(/\n{2,}/);
  const gapBlocks = blocks.filter((b) =>
    /NEEDS_INTERNAL_EVIDENCE|\[GAP|Evidence Gap|Missing Internal/i.test(b),
  );
  if (gapBlocks.length === 0) {
    return "_No `[NEEDS_INTERNAL_EVIDENCE]` markers found in this response draft._";
  }
  return gapBlocks.join("\n\n");
}

function highlightInlineComplianceMarkers(text: string): React.ReactNode {
  const parts = text.split(/(\[NEEDS_INTERNAL_EVIDENCE\]|\[UNVERIFIED_EXTERNAL_URL_REMOVED\])/g);
  if (parts.length === 1) return text;
  return parts.map((part, idx) => {
    if (part === "[NEEDS_INTERNAL_EVIDENCE]") {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 font-mono text-[11px] font-semibold text-amber-900"
        >
          NEEDS INTERNAL EVIDENCE
        </span>
      );
    }
    if (part === "[UNVERIFIED_EXTERNAL_URL_REMOVED]") {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 font-mono text-[11px] font-semibold text-rose-700"
        >
          UNGROUNDED LINK STRIPPED
        </span>
      );
    }
    return part;
  });
}

export function WorkProductCanvas({
  workProductId,
  onInspectEvidence,
  onWorkProductUpdated,
}: WorkProductCanvasProps) {
  const [workProduct, setWorkProduct] = useState<WorkProductRecord | null>(null);
  const [revisions, setRevisions] = useState<WorkProductRevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Default to live Word-style WYSIWYG editing directly on the document page (uiq.jpg)
  const [editMode, setEditMode] = useState(true);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [showGapsOnly, setShowGapsOnly] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveStateLabel, setSaveStateLabel] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "docx" | "md" | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<{
    type: "error" | "upgrade";
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const lastSavedSnapshotRef = useRef<{ title: string; markdown: string }>({
    title: "",
    markdown: "",
  });

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [exportMenuOpen]);

  const loadWorkProduct = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/work-products/${workProductId}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.work_product) {
        const parsed = extractApiError(res.status, json, "Failed to load work product.");
        setLoadError(parsed.message);
        return;
      }
      const wp: WorkProductRecord = json.data.work_product;
      setWorkProduct(wp);
      setRevisions(json.data.revisions || []);
      setDraftTitle(wp.title);
      setDraftMarkdown(wp.markdown_content);
      setPreviewVersion(null);
      setEditMode(true);
      lastSavedSnapshotRef.current = {
        title: wp.title,
        markdown: wp.markdown_content,
      };
    } catch {
      setLoadError("Network error while loading work product.");
    } finally {
      setLoading(false);
    }
  }, [workProductId]);

  useEffect(() => {
    void loadWorkProduct();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [loadWorkProduct]);

  const persistPatch = useCallback(
    async (payload: {
      title?: string;
      markdown_content?: string;
      status?: WorkProductStatus;
      change_summary?: string;
    }) => {
      setSaving(true);
      setExportNotice(null);
      try {
        const res = await fetch(`/api/marketing-shield/v1/work-products/${workProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.data?.work_product) {
          const parsed = extractApiError(res.status, json, "Unable to save changes.");
          setExportNotice({ type: "error", message: parsed.message });
          return;
        }
        const updated: WorkProductRecord = json.data.work_product;
        const newRev: WorkProductRevisionRecord | undefined = json.data.revision;
        setWorkProduct(updated);
        if (newRev) {
          setRevisions((prev) => [newRev, ...prev.filter((r) => r.id !== newRev.id)]);
        }
        lastSavedSnapshotRef.current = {
          title: updated.title,
          markdown: updated.markdown_content,
        };
        setSaveStateLabel(`Saved v${updated.version_number}`);
        onWorkProductUpdated?.(updated);
      } catch {
        setExportNotice({ type: "error", message: "Network error saving work product revision." });
      } finally {
        setSaving(false);
      }
    },
    [workProductId, onWorkProductUpdated],
  );

  // Debounced auto-save when editing in the Word-style document canvas
  useEffect(() => {
    if (!editMode || previewVersion !== null || showGapsOnly || !workProduct) return;
    if (
      draftTitle === lastSavedSnapshotRef.current.title &&
      draftMarkdown === lastSavedSnapshotRef.current.markdown
    ) {
      return;
    }
    if (draftTitle.trim().length < 3 || draftMarkdown.trim().length < 10) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStateLabel("Unsaved edits...");
    autoSaveTimerRef.current = setTimeout(() => {
      void persistPatch({
        title: draftTitle.trim(),
        markdown_content: draftMarkdown,
        change_summary: "Studio Canvas Word edit",
      });
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editMode, previewVersion, showGapsOnly, draftTitle, draftMarkdown, workProduct, persistPatch]);

  const handleExport = async (format: "pdf" | "docx" | "md") => {
    if (exportingFormat) return;
    setExportingFormat(format);
    setExportMenuOpen(false);
    setExportNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/work-products/${workProductId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        const parsed = extractApiError(
          res.status,
          json,
          "Editable Word (.docx) export requires Growth, Scale, or Enterprise plan.",
        );
        setExportNotice({ type: "upgrade", message: parsed.message });
        return;
      }
      if (!res.ok || !json.success || !json.data?.download_url) {
        const parsed = extractApiError(res.status, json, `Failed to export ${format.toUpperCase()}.`);
        setExportNotice({ type: "error", message: parsed.message });
        return;
      }
      const dlUrl: string = json.data.download_url;
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = json.data.filename || `work-product.${format}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setExportNotice({
        type: "error",
        message: `Network error exporting ${format.toUpperCase()} artifact.`,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const displayedMarkdown = useMemo(() => {
    const base =
      previewVersion !== null
        ? revisions.find((r) => r.version_number === previewVersion)?.markdown_content ||
          draftMarkdown
        : draftMarkdown;
    if (showGapsOnly) {
      return filterDdqMarkdownGapsOnly(base);
    }
    return base;
  }, [previewVersion, revisions, draftMarkdown, showGapsOnly]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[12.5px] text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span>Loading work product deliverable...</span>
      </div>
    );
  }

  if (loadError || !workProduct) {
    return (
      <div className="p-6 text-[13px] text-rose-700 bg-rose-50/70 m-4 rounded-xl border border-rose-200">
        {loadError || "Work product deliverable unavailable."}
      </div>
    );
  }

  const citations = (workProduct.citations || []) as WorkProductCitation[];
  const evidenceGaps = (workProduct.evidence_gaps || []) as WorkProductEvidenceGap[];
  const guardrails = (workProduct.guardrail_report || {}) as Partial<WorkProductGuardrailReport>;
  const needsEvidenceMatches = (draftMarkdown.match(/\[NEEDS_INTERNAL_EVIDENCE\]/g) || []).length;
  const totalGapsCount = Math.max(evidenceGaps.length, needsEvidenceMatches);
  const isHistoricalPreview =
    previewVersion !== null && previewVersion !== workProduct.version_number;
  const isEditorReadOnly = !editMode || isHistoricalPreview || showGapsOnly;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-zinc-50/60">
      {/* Top Deliverable Document Header (uiq.jpg editorial bar) */}
      <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 bg-white space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white">
              {WORKFLOW_LABELS[workProduct.workflow_type] || workProduct.workflow_type}
            </span>
            <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-800">
              v{workProduct.version_number}
            </span>
            {(workProduct.jurisdiction_scope || ["NG"]).map((jur) => (
              <span
                key={jur}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700"
              >
                {jur}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {saveStateLabel && (
              <span className="font-mono text-[10.5px] text-zinc-500 mr-1">
                {saving ? "Saving..." : saveStateLabel}
              </span>
            )}

            {revisions.length > 0 && (
              <label className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-700 border border-zinc-200 bg-white rounded-md px-2 py-1">
                <History className="h-3 w-3 text-zinc-500" />
                <select
                  aria-label="Revision history"
                  value={previewVersion ?? workProduct.version_number}
                  onChange={(e) => {
                    const ver = Number(e.target.value);
                    setPreviewVersion(ver === workProduct.version_number ? null : ver);
                  }}
                  className="bg-transparent outline-none focus:outline-none focus-visible:outline-none cursor-pointer"
                >
                  {revisions.map((rev) => (
                    <option key={rev.id} value={rev.version_number}>
                      v{rev.version_number}
                      {rev.version_number === workProduct.version_number ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <select
              aria-label="Work product review status"
              value={workProduct.status}
              disabled={saving}
              onChange={(e) =>
                void persistPatch({
                  status: e.target.value as WorkProductStatus,
                  change_summary: `Status changed to ${e.target.value}`,
                })
              }
              className={`font-mono text-[10.5px] font-semibold px-2 py-1 rounded-md border cursor-pointer outline-none focus:outline-none focus-visible:outline-none ${
                STATUS_STYLE[workProduct.status]
              }`}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="FINALIZED">FINALIZED</option>
            </select>
          </div>
        </div>

        {/* Document Title + Save Draft / Publish Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!isEditorReadOnly ? (
            <input
              type="text"
              aria-label="Document title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-transparent hover:border-zinc-200 focus:border-zinc-300 bg-transparent focus:bg-white px-2 py-1 -ml-2 text-[15px] font-semibold text-zinc-950 outline-none focus:outline-none focus-visible:outline-none transition-colors"
            />
          ) : (
            <h3 className="text-[15px] font-semibold text-zinc-950 truncate flex-1">
              {workProduct.title}
            </h3>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {workProduct.workflow_type === "SUPERVISORY_DDQ_RESPONSE" && totalGapsCount > 0 && (
              <button
                type="button"
                onClick={() => setShowGapsOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors cursor-pointer ${
                  showGapsOnly
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Gaps Only ({totalGapsCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPreviewVersion(null);
                setShowGapsOnly(false);
                setEditMode((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
            >
              {editMode ? (
                <>
                  <Eye className="h-3 w-3" />
                  <span>Read Mode</span>
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3" />
                  <span>Edit Document</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={saving || isHistoricalPreview}
              onClick={() =>
                void persistPatch({
                  title: draftTitle.trim(),
                  markdown_content: draftMarkdown,
                  change_summary: "Saved draft snapshot",
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-800 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span>Save as draft (v{workProduct.version_number + 1})</span>
            </button>

            {workProduct.status !== "FINALIZED" && (
              <button
                type="button"
                disabled={saving || isHistoricalPreview}
                onClick={() =>
                  void persistPatch({
                    title: draftTitle.trim(),
                    markdown_content: draftMarkdown,
                    status: "FINALIZED",
                    change_summary: "Finalized compliance deliverable",
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-[11.5px] font-medium text-white cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Finalize</span>
              </button>
            )}
          </div>
        </div>

        {/* Guardrail Verification Strip */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded border ${
              guardrails.passed !== false
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>
              {guardrails.passed !== false
                ? "Citation & Legal-Floor Guardrails Verified"
                : "Review Legal Floor / Citation Warnings"}
            </span>
          </span>

          {typeof guardrails.stripped_ungrounded_urls?.length === "number" &&
            guardrails.stripped_ungrounded_urls.length > 0 && (
              <span className="font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                {guardrails.stripped_ungrounded_urls.length} ungrounded URL(s) stripped
              </span>
            )}

          {Array.isArray(guardrails.legal_floor_warnings) &&
            guardrails.legal_floor_warnings.map((w, idx) => (
              <span
                key={idx}
                className="font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200"
              >
                {w}
              </span>
            ))}
        </div>

        {isHistoricalPreview && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-[11.5px] text-amber-900">
            <span>
              Previewing historical snapshot <strong>v{previewVersion}</strong> (read-only).
            </span>
            <button
              type="button"
              onClick={() => {
                setDraftMarkdown(displayedMarkdown);
                setPreviewVersion(null);
                setEditMode(true);
              }}
              className="font-medium underline cursor-pointer"
            >
              Restore into Editor
            </button>
          </div>
        )}
      </div>

      {/* Main Word-Style WYSIWYG Document Workbench */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        <div className="max-w-[780px] mx-auto space-y-5">
          {showGapsOnly ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-6 sm:px-8 text-[13.5px] text-zinc-800 leading-[1.7] font-sans break-words shadow-xs">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="my-2 leading-[1.68]">
                      {React.Children.map(children, (child) =>
                        typeof child === "string"
                          ? highlightInlineComplianceMarkers(child)
                          : child,
                      )}
                    </p>
                  ),
                }}
              >
                {displayedMarkdown}
              </ReactMarkdown>
            </div>
          ) : (
            <WordStyleEditor
              markdown={displayedMarkdown}
              onChange={(nextMd) => {
                if (!isEditorReadOnly) {
                  setDraftMarkdown(nextMd);
                }
              }}
              readOnly={isEditorReadOnly}
              documentKey={`${workProduct.id}:${previewVersion ?? "live"}`}
            />
          )}

          {/* Evidence Gaps Matrix */}
          {evidenceGaps.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-amber-900">
                Internal Evidence Gaps Flagged ({evidenceGaps.length})
              </p>
              <div className="space-y-2">
                {evidenceGaps.map((gap, idx) => (
                  <div
                    key={`${gap.gap_code}-${idx}`}
                    className="rounded-lg border border-amber-200/80 bg-white p-2.5 text-[12px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-900">{gap.section_or_question}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-zinc-700 mt-1">{gap.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Citations Footer */}
          {citations.length > 0 && (
            <div className="pt-3 border-t border-zinc-200 space-y-2">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                Verified Citations &amp; Provenance ({citations.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {citations.map((cit, idx) => {
                  if (cit.retrieved_url) {
                    return (
                      <a
                        key={idx}
                        href={cit.retrieved_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11.5px] text-zinc-800"
                      >
                        <Globe className="h-3 w-3 text-zinc-500" />
                        <span className="font-mono text-[10.5px] font-semibold">
                          {cit.trust_tier === "OFFICIAL_REGULATOR_WEB" ? "OFFICIAL WEB" : "LIVE WEB"}
                        </span>
                        <span className="truncate max-w-[180px]">{cit.badge_label}</span>
                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                      </a>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => cit.regulatory_clause_id && onInspectEvidence?.(cit.regulatory_clause_id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 px-2.5 py-1 text-[11.5px] text-zinc-800 cursor-pointer"
                    >
                      <FileText className="h-3 w-3 text-zinc-500" />
                      <span className="font-mono text-[10.5px] font-semibold">
                        {cit.regulator || "VAULT"}
                      </span>
                      <span className="truncate max-w-[180px]">{cit.badge_label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Notice / Upgrade CTA */}
      {exportNotice && (
        <div
          className={`mx-4 mb-2 rounded-lg border px-3 py-2 text-[12px] flex items-center justify-between gap-2 ${
            exportNotice.type === "upgrade"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span>{exportNotice.message}</span>
          {exportNotice.type === "upgrade" && (
            <Link
              href="/settings/billing?upgrade=growth"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 text-white text-[11px] font-medium shrink-0"
            >
              <span>Upgrade</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* Persistent Work Product Export Footer (PDF, Word DOCX, Markdown) */}
      <div className="px-4 py-3 border-t border-zinc-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>SHA-256: {workProduct.source_hash_sha256.slice(0, 12)}…</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(displayedMarkdown).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-[12px] font-medium cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={exportingFormat !== null}
            onClick={() => void handleExport("pdf")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 text-[12px] font-medium cursor-pointer disabled:opacity-50"
          >
            {exportingFormat === "pdf" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            disabled={exportingFormat !== null}
            onClick={() => void handleExport("docx")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-medium cursor-pointer disabled:opacity-50"
          >
            {exportingFormat === "docx" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-zinc-300" />
            )}
            <span>Export Word (.docx)</span>
          </button>

          {/* More Export Menu (Markdown .md) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              disabled={exportingFormat !== null}
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-[12px] font-medium cursor-pointer disabled:opacity-50"
              title="More export formats"
            >
              <span>.md</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {exportMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 bottom-full mb-2 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg z-30 text-[12px]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport("md")}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-zinc-800 cursor-pointer"
                >
                  <FileCode2 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Export Markdown (.md)</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport("docx")}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-zinc-800 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Export Word (.docx)</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport("pdf")}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-zinc-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Export PDF (.pdf)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
