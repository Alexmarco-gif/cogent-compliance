"use client";

/**
 * Cogent Compliance Platform
 * Reusable Promoted Chat Working Material Card
 * Mounted inside DDQ Operations, Policy Workflow, Feature Governance, and Cross-Border Expansion
 * detail workspaces so users can always inspect, export (PDF/DOCX/MD), or jump back to the
 * Chat conversation & Studio document they promoted into the operational register.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  MessageSquare,
} from "lucide-react";
import type { WorkProductRecord } from "@/contracts/work-product.contracts";
import { extractApiError } from "@/lib/api-client";

export interface LinkedWorkProductCardProps {
  workProductId?: string | null;
  conversationId?: string | null;
  fallbackTitle?: string | null;
  fallbackMarkdown?: string | null;
  registerLabel?: string;
}

export function LinkedWorkProductCard({
  workProductId,
  conversationId,
  fallbackTitle,
  fallbackMarkdown,
  registerLabel = "Compliance Register",
}: LinkedWorkProductCardProps) {
  const [workProduct, setWorkProduct] = useState<WorkProductRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | "md" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!workProductId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/marketing-shield/v1/work-products/${workProductId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.success && json.data?.work_product) {
          setWorkProduct(json.data.work_product as WorkProductRecord);
        }
      })
      .catch(() => {
        // Silent fallback to snapshot markdown if present
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workProductId]);

  if (!workProductId && !fallbackMarkdown) {
    return null;
  }

  const resolvedTitle = workProduct?.title || fallbackTitle || "Promoted Studio Working Document";
  const resolvedMarkdown = workProduct?.markdown_content || fallbackMarkdown || "";
  const resolvedConvId = workProduct?.conversation_id || conversationId || null;
  const resolvedVersion = workProduct?.version_number || 1;
  const resolvedStatus = workProduct?.status || "DRAFT";

  const handleExport = async (format: "pdf" | "docx" | "md") => {
    if (!workProductId || exporting) return;
    setExporting(format);
    setExportError(null);
    try {
      const res = await fetch(
        `/api/marketing-shield/v1/work-products/${workProductId}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.download_url) {
        const parsed = extractApiError(
          res.status,
          json,
          `Failed to export ${format.toUpperCase()}.`
        );
        setExportError(parsed.message);
        return;
      }
      const a = document.createElement("a");
      a.href = String(json.data.download_url);
      a.download = String(json.data.filename || `working-material.${format}`);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setExportError(`Network error exporting ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                Saved Chat Working Material
              </span>
              <span className="font-mono text-[10px] text-zinc-600 bg-white border border-zinc-200 rounded px-1.5 py-0.5">
                v{resolvedVersion} · {resolvedStatus}
              </span>
              {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
            </div>
            <p className="text-[13px] font-semibold text-zinc-950 truncate mt-1">
              {resolvedTitle}
            </p>
            <p className="text-[11px] text-zinc-500">
              Promoted from Copilot Studio into {registerLabel}. Always accessible for review and export.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {resolvedMarkdown && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 text-[11.5px] font-medium transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Hide Document</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>View Working Material</span>
                </>
              )}
            </button>
          )}

          {workProductId && (
            <>
              {(["pdf", "docx", "md"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => void handleExport(fmt)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-[11px] font-mono uppercase transition-colors cursor-pointer disabled:opacity-50"
                  title={`Export saved document as ${fmt.toUpperCase()}`}
                >
                  {exporting === fmt ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  <span>{fmt}</span>
                </button>
              ))}
            </>
          )}

          {resolvedConvId && (
            <Link
              href={`/chat?conversationId=${resolvedConvId}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11.5px] font-medium transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              <span>Source Chat</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {exportError && (
        <div className="px-4 py-2 text-[11.5px] text-rose-700 bg-rose-50 border-t border-rose-200">
          {exportError}
        </div>
      )}

      {expanded && resolvedMarkdown && (
        <div className="p-5 border-t border-zinc-200 bg-white max-h-[480px] overflow-y-auto prose prose-sm prose-zinc max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{resolvedMarkdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
