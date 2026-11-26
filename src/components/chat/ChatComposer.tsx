"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Globe,
  FileImage,
  FileText,
  FileCheck2,
  Scale,
  BookOpen,
  Tag,
  X,
  Lock,
  Plus,
  Upload,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import { CogentPulseIndicator } from "@/components/shell/WorkspaceSkeletons";
import { extractApiError } from "@/lib/api-client";
import {
  resolveUploadMimeType,
  type SupportedUploadMimeType,
} from "@/lib/upload-mime";
import type {
  SearchJurisdiction,
  SearchQuotaSnapshot,
} from "@/contracts/search.contracts";
import type { WorkflowType } from "@/contracts/work-product.contracts";

export { resolveUploadMimeType, type SupportedUploadMimeType };

export interface ProductOption {
  id: string;
  product_name: string;
  product_type: string;
}

export interface KnowledgeDocOption {
  id: string;
  title: string;
  document_type: string;
}

export interface PendingAttachment {
  assetId: string;
  filename: string;
  mimeType: SupportedUploadMimeType;
  fileSizeBytes?: number;
  previewUrl?: string;
  extractedText?: string;
}

const VERCEL_SERVER_PROXY_LIMIT_BYTES = 4_500_000;

const JURISDICTION_SOURCES: Array<{
  code: SearchJurisdiction;
  flag: string;
  name: string;
  regulators: string;
}> = [
  { code: "NG", flag: "🇳🇬", name: "Nigeria", regulators: "CBN, SEC, NDPC, FCCPC, ARCON" },
  { code: "KE", flag: "🇰🇪", name: "Kenya", regulators: "CBK, CMA, ODPC" },
  { code: "GH", flag: "🇬🇭", name: "Ghana", regulators: "Bank of Ghana, SEC" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", regulators: "SARB, FSCA" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda", regulators: "BNR" },
  { code: "EG", flag: "🇪🇬", name: "Egypt", regulators: "CBE, FRA" },
  { code: "AFRICA_REGIONAL", flag: "🌍", name: "Pan-Africa", regulators: "Cross-border frameworks" },
];

const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  PRODUCT_STRUCTURING_MEMO: "Structuring Memo",
  POLICY_GAP_REDLINE: "Policy Redline",
  POLICY_DRAFT_NEW: "Draft New Policy",
  SUPERVISORY_DDQ_RESPONSE: "Supervisory DDQ",
  CROSS_BORDER_COMPARISON: "Cross-Border Matrix",
  CAMPAIGN_COMPLIANCE_KIT: "Campaign Clearance",
  GENERAL_COMPLIANCE_DOCUMENT: "Compliance Document",
};

export interface ChatComposerProps {
  onSendMessage: (
    content: string,
    options?: {
      attachmentAssetIds?: string[];
      attachments?: PendingAttachment[];
      enableLiveWebSearch?: boolean;
      searchJurisdictions?: SearchJurisdiction[];
      referencedKnowledgeDocId?: string;
      workflowHint?: WorkflowType;
    },
  ) => Promise<boolean | void>;
  onAssetUploaded?: (
    assetId: string,
    filename: string,
    extractedText?: string,
  ) => Promise<void>;
  conversationId?: string;
  disabled?: boolean;
  isZeroState?: boolean;
  products?: ProductOption[];
  selectedProductId?: string | null;
  onSelectProduct?: (productId: string | null) => void;
  knowledgeDocs?: KnowledgeDocOption[];
  selectedKnowledgeDocId?: string | null;
  onSelectKnowledgeDoc?: (docId: string | null) => void;
  liveSearchQuota?: SearchQuotaSnapshot | null;
  enableLiveWebSearch?: boolean;
  onToggleLiveWebSearch?: (enabled: boolean) => void;
  searchJurisdictions?: SearchJurisdiction[];
  onSelectJurisdictions?: (jurisdictions: SearchJurisdiction[]) => void;
  workflowHint?: WorkflowType | null;
  onSelectWorkflowHint?: (workflow: WorkflowType | null) => void;
  prefillText?: string | null;
  onPrefillConsumed?: () => void;
  wideRail?: boolean;
}

const STARTER_CARDS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  prompt: string;
  workflowHint: WorkflowType;
  prefillOnly: boolean;
}> = [
  {
    icon: Scale,
    title: "Product Structuring Memo",
    subtitle: "Multi-agency rules, limits & disclosures",
    prompt:
      "We want to launch a USD virtual card & BNPL wallet feature in Nigeria. What CBN FX/payment rules, NDPC data transfer rules, and FCCPC credit disclosures apply? Output a complete Statutory Structuring Memo.",
    workflowHint: "PRODUCT_STRUCTURING_MEMO",
    prefillOnly: false,
  },
  {
    icon: BookOpen,
    title: "Policy Gap & SOP Redline",
    subtitle: "Diff internal policy vs latest circulars",
    prompt:
      "Compare our internal AML / Operations policy against the latest CBN & NFIU guidelines and draft exact redlined policy replacement clauses.",
    workflowHint: "POLICY_GAP_REDLINE",
    prefillOnly: true,
  },
  {
    icon: FileText,
    title: "Draft New Compliance Policy",
    subtitle: "Board-ready policy, controls & clocks",
    prompt:
      "Draft a complete, Board-ready KYC & AML/CFT/CPF Policy for our Nigerian fintech covering CBN, NFIU, and NDPC statutory floors, Three Lines of Defense, operational controls, statutory clocks, and a Board adoption resolution.",
    workflowHint: "POLICY_DRAFT_NEW",
    prefillOnly: true,
  },
  {
    icon: FileCheck2,
    title: "Supervisory & Partner DDQ",
    subtitle: "Citation-backed bank / audit responses",
    prompt:
      "Draft formal citation-backed responses with [NEEDS_INTERNAL_EVIDENCE] flags for this sponsor bank / CBN supervisory compliance questionnaire:\n",
    workflowHint: "SUPERVISORY_DDQ_RESPONSE",
    prefillOnly: true,
  },
  {
    icon: Globe,
    title: "Cross-Border Expansion",
    subtitle: "Compare NG vs KE, GH & ZA licensing",
    prompt:
      "Compare Nigerian CBN PSP/PSSP licensing capital requirements and settlement rules against Kenya (CBK) and Ghana (BoG) Payment Service Provider frameworks.",
    workflowHint: "CROSS_BORDER_COMPARISON",
    prefillOnly: false,
  },
  {
    icon: FileImage,
    title: "Audit a campaign flyer",
    subtitle: "Extract text & verify CBN/ARCON locks",
    prompt:
      "Review this promotional campaign copy for CBN, FCCPC, and ARCON compliance: ",
    workflowHint: "CAMPAIGN_COMPLIANCE_KIT",
    prefillOnly: true,
  },
  {
    icon: FileText,
    title: "Scan live landing page",
    subtitle: "Check URL disclosures & KFS terms",
    prompt: "Inspect this live promotional landing page URL for regulatory compliance: https://",
    workflowHint: "CAMPAIGN_COMPLIANCE_KIT",
    prefillOnly: true,
  },
];

export function ChatComposer({
  onSendMessage,
  conversationId,
  disabled,
  isZeroState = false,
  products = [],
  selectedProductId = null,
  onSelectProduct,
  knowledgeDocs = [],
  selectedKnowledgeDocId = null,
  onSelectKnowledgeDoc,
  liveSearchQuota = null,
  enableLiveWebSearch = false,
  onToggleLiveWebSearch,
  searchJurisdictions = ["NG"],
  onSelectJurisdictions,
  workflowHint = null,
  onSelectWorkflowHint,
  prefillText = null,
  onPrefillConsumed,
  wideRail = false,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [upgradePopover, setUpgradePopover] = useState<"live_search" | "cross_border" | null>(
    null,
  );
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<"knowledge" | "products" | "workflows" | null>(
    null,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuContainerRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const r2DirectBlockedRef = useRef(false);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  pendingAttachmentsRef.current = pendingAttachments;

  useEffect(() => {
    if (prefillText && prefillText.trim()) {
      setContent(prefillText);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefillText, onPrefillConsumed]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  useEffect(() => {
    return () => {
      for (const att of pendingAttachmentsRef.current) {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!plusMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        plusMenuContainerRef.current &&
        !plusMenuContainerRef.current.contains(e.target as Node)
      ) {
        setPlusMenuOpen(false);
        setActiveSubmenu(null);
      }
    };
    const handleKeyDownWindow = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlusMenuOpen(false);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDownWindow);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDownWindow);
    };
  }, [plusMenuOpen]);

  const canSend =
    (content.trim().length > 0 || pendingAttachments.length > 0) &&
    !disabled &&
    !isUploading;

  const liveSearchAllowed = Boolean(
    liveSearchQuota?.live_web_allowed || liveSearchQuota?.standard_fallback_available,
  );
  const isStandardWebFallback = Boolean(
    !liveSearchQuota?.live_web_allowed && liveSearchQuota?.standard_fallback_available,
  );
  const crossBorderAllowed = Boolean(liveSearchQuota?.cross_border_allowed);
  const activeJurisdiction = searchJurisdictions[0] || "NG";
  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;
  const selectedKnowledgeDoc = knowledgeDocs.find((d) => d.id === selectedKnowledgeDocId) || null;

  const removePendingAttachment = (assetId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.assetId === assetId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.assetId !== assetId);
    });
  };

  const handleToggleLiveSearchClick = () => {
    if (liveSearchQuota && !liveSearchAllowed) {
      setUpgradePopover((prev) => (prev === "live_search" ? null : "live_search"));
      onToggleLiveWebSearch?.(false);
      setPlusMenuOpen(false);
      return;
    }
    setUpgradePopover(null);
    onToggleLiveWebSearch?.(!enableLiveWebSearch);
  };

  const handleSelectJurisdictionSource = (nextJur: SearchJurisdiction) => {
    if (liveSearchQuota && !liveSearchAllowed) {
      setUpgradePopover("live_search");
      setPlusMenuOpen(false);
      return;
    }
    if (nextJur !== "NG" && liveSearchQuota && !liveSearchQuota.cross_border_allowed) {
      setUpgradePopover("cross_border");
      setPlusMenuOpen(false);
      return;
    }
    setUpgradePopover(null);
    onSelectJurisdictions?.([nextJur]);
    if (!enableLiveWebSearch) {
      onToggleLiveWebSearch?.(true);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;

    const currentAttachments = [...pendingAttachments];
    const attachmentAssetIds = currentAttachments.map((a) => a.assetId);
    const attachmentNames = currentAttachments.map((a) => a.filename).join(", ");
    const allImageAttachments =
      currentAttachments.length > 0 &&
      currentAttachments.every((a) => a.mimeType.startsWith("image/"));
    const text =
      content.trim() ||
      (allImageAttachments
        ? `Review the attached creative asset (${attachmentNames}) for CBN, FCCPC, and ARCON compliance.`
        : `Analyze the attached document (${attachmentNames}), summarize all key compliance obligations, risks, and action items, and prepare a structured compliance deliverable.`);

    // Clear composer immediately for responsive UX (preserve previewUrl for sent message card)
    setContent("");
    setPendingAttachments([]);
    setUpgradePopover(null);
    setPlusMenuOpen(false);
    setActiveSubmenu(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const sent = await onSendMessage(text, {
      attachmentAssetIds: attachmentAssetIds.length > 0 ? attachmentAssetIds : undefined,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      enableLiveWebSearch: Boolean(enableLiveWebSearch && liveSearchAllowed),
      searchJurisdictions:
        searchJurisdictions && searchJurisdictions.length > 0 ? searchJurisdictions : ["NG"],
      referencedKnowledgeDocId: selectedKnowledgeDocId || undefined,
      workflowHint: workflowHint || undefined,
    });

    if (sent === false) {
      // Restore draft on pre-flight failure
      setContent(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const uploadSingleFile = async (file: File): Promise<PendingAttachment> => {
    const mimeType = resolveUploadMimeType(file);
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256_hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const sessionRes = await fetch("/api/marketing-shield/v1/assets/upload-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        original_filename: file.name,
        mime_type: mimeType,
        file_size_bytes: file.size,
        sha256_hash,
      }),
    });

    const sessionJson = await sessionRes.json().catch(() => ({}));
    if (!sessionRes.ok || !sessionJson.success) {
      const parsed = extractApiError(
        sessionRes.status,
        sessionJson,
        "Failed to create upload session",
      );
      throw new Error(parsed.message);
    }

    const { asset_id, presigned_upload_url } = sessionJson.data;
    let inlineExtractedText: string | undefined;
    let inlineExtractionDone = false;

    if (!presigned_upload_url.includes("mock")) {
      let directUploadOk = false;
      let directUploadErrMsg: string | null = null;

      // Skip direct R2 PUT if CORS already blocked it in this session and file fits the fast inline proxy
      const canSkipDirect =
        r2DirectBlockedRef.current && file.size <= VERCEL_SERVER_PROXY_LIMIT_BYTES;

      if (!canSkipDirect) {
        try {
          const putRes = await fetch(presigned_upload_url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": mimeType },
          });
          if (putRes.ok) {
            directUploadOk = true;
          } else {
            directUploadErrMsg = `Direct storage upload failed (HTTP ${putRes.status})`;
          }
        } catch (directErr) {
          r2DirectBlockedRef.current = true;
          directUploadErrMsg =
            directErr instanceof Error ? directErr.message : "Direct storage upload failed";
        }
      }

      if (!directUploadOk) {
        if (file.size > VERCEL_SERVER_PROXY_LIMIT_BYTES) {
          throw new Error(
            `${directUploadErrMsg || "Direct storage upload was blocked"} and the file exceeds the 4.5 MB server upload proxy limit. Please upload a file <= 4.5 MB or configure CORS on the R2 bucket.`,
          );
        }

        // Fast single-hop proxy upload + inline extraction (avoids R2 re-download & second HTTP call)
        const proxyRes = await fetch(
          `/api/marketing-shield/v1/assets/${asset_id}/upload?extract=1`,
          {
            method: "PUT",
            body: file,
            headers: { "Content-Type": mimeType },
          },
        );
        const proxyJson = await proxyRes.json().catch(() => ({}));
        if (!proxyRes.ok || !proxyJson.success) {
          const parsed = extractApiError(
            proxyRes.status,
            proxyJson,
            directUploadErrMsg || `Upload failed (HTTP ${proxyRes.status})`,
          );
          throw new Error(parsed.message);
        }
        if (proxyJson.data?.extraction) {
          inlineExtractionDone = true;
          if (typeof proxyJson.data.extraction.extractedText === "string") {
            inlineExtractedText = proxyJson.data.extraction.extractedText;
          }
        }
      }
    }

    let extractedText = inlineExtractedText;
    if (!inlineExtractionDone) {
      // Chat turn performs the compliance assessment; skip duplicate auto_assess during attachment upload
      const completeRes = await fetch(`/api/marketing-shield/v1/assets/${asset_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_assess: false }),
      });

      const completeJson = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok || !completeJson.success) {
        const parsed = extractApiError(
          completeRes.status,
          completeJson,
          "Failed to process uploaded asset",
        );
        throw new Error(parsed.message);
      }

      extractedText =
        typeof completeJson.data?.extraction?.extractedText === "string"
          ? completeJson.data.extraction.extractedText
          : undefined;
    }

    const previewUrl = mimeType.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    return {
      assetId: asset_id,
      filename: file.name,
      mimeType,
      fileSizeBytes: file.size,
      previewUrl,
      extractedText,
    };
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || disabled) return;

    setIsUploading(true);
    setUploadingFiles(files.map((f) => f.name));
    setUploadError(null);

    try {
      // Upload all dropped/selected files in parallel instead of serially
      const uploaded = await Promise.all(files.map((file) => uploadSingleFile(file)));
      setPendingAttachments((prev) => [...prev, ...uploaded]);
      textareaRef.current?.focus();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await uploadFiles(files);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLFormElement>) => {
    if (disabled) return;
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    if (disabled) return;
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDraggingOver(false);
    if (disabled) return;
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      void uploadFiles(files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const files = e.clipboardData?.files ? Array.from(e.clipboardData.files) : [];
    if (files.length > 0) {
      e.preventDefault();
      void uploadFiles(files);
    }
  };

  const hasActiveTopContext =
    pendingAttachments.length > 0 ||
    isUploading ||
    (enableLiveWebSearch && liveSearchAllowed) ||
    Boolean(selectedKnowledgeDoc) ||
    Boolean(selectedProduct) ||
    Boolean(workflowHint);

  return (
    <div
      className={
        isZeroState
          ? "w-full max-w-2xl mx-auto relative"
          : wideRail
            ? "w-full max-w-5xl mx-auto relative"
            : "w-full max-w-3xl mx-auto relative"
      }
    >
      {uploadError && (
        <div className="mb-3 px-3.5 py-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-700 text-[12.5px] flex items-center justify-between gap-3">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="font-medium hover:underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Paid Live Web Search / Cross-Border Upgrade Popover */}
      {upgradePopover && (
        <div
          role="dialog"
          aria-label="Live Web Search Upgrade Notice"
          className="mb-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-[12.5px] text-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-950">
                {upgradePopover === "cross_border"
                  ? "Pan-African Cross-Border Search (KE, GH, ZA, RW, EG) requires Scale"
                  : "Live Regulatory Search (NG & Africa) requires Growth or Scale"}
              </p>
              <p className="text-zinc-600 mt-0.5">
                {upgradePopover === "cross_border"
                  ? "Scale unlocks cross-jurisdictional regulatory search across 6 African central banks ($449/mo)."
                  : "Growth ($149/mo) unlocks 100 monthly real-time CBN, SEC, NDPC & FCCPC searches alongside our verified Statutory Vault."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={
                upgradePopover === "cross_border"
                  ? "/settings/billing?upgrade=scale"
                  : "/settings/billing?upgrade=growth"
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-medium"
            >
              <span>Upgrade Plan</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setUpgradePopover(null)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 cursor-pointer"
              aria-label="Close upgrade notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Harvey-Style Silicon Valley Composer Dock with #1D4ED8 Brand Accents & Drag-Drop */}
      <form
        onSubmit={handleSubmit}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border bg-white transition-all p-3.5 ${
          isDraggingOver
            ? "border-[#1D4ED8] ring-4 ring-[#1D4ED8]/15 shadow-[0_8px_28px_-6px_rgba(29,78,216,0.22)]"
            : "border-zinc-200 shadow-[0_2px_14px_-4px_rgba(9,9,11,0.07)] focus-within:border-[#1D4ED8]/45 focus-within:ring-2 focus-within:ring-[#1D4ED8]/10 focus-within:shadow-[0_6px_24px_-8px_rgba(29,78,216,0.14)]"
        }`}
      >
        {isDraggingOver && (
          <div
            aria-label="Drop files to attach"
            className="absolute inset-1.5 z-20 rounded-xl border-2 border-dashed border-[#1D4ED8]/70 bg-blue-50/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-xs">
                <Upload className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-xs">
                <FileImage className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-xs">
                <FileText className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-xs">
                <FileCheck2 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-[13.5px] font-semibold text-[#1D4ED8]">
              Drop flyers, PDFs, or policy docs here
            </p>
            <p className="text-[11.5px] text-[#1E40AF]/80 mt-0.5">
              PNG, JPG, WEBP, PDF &amp; Word (.docx)
            </p>
          </div>
        )}

        {/* Top Context Chips Strip (Attachments + Web search + Policy/Rate Card) */}
        {hasActiveTopContext && (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {pendingAttachments.map((att) => (
              <div
                key={att.assetId}
                className="inline-flex items-center gap-2 rounded-lg border border-[#1D4ED8]/25 bg-blue-50/55 pl-1.5 pr-2 py-1 text-[12px] text-zinc-900 max-w-[240px]"
              >
                {att.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.previewUrl}
                    alt={att.filename}
                    className="h-5 w-5 rounded object-cover border border-[#1D4ED8]/30 shrink-0"
                  />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0 ml-0.5" />
                )}
                <span className="truncate font-medium text-zinc-900">{att.filename}</span>
                <button
                  type="button"
                  onClick={() => removePendingAttachment(att.assetId)}
                  className="rounded-full p-0.5 text-[#1D4ED8]/70 hover:bg-blue-100 hover:text-[#1D4ED8] transition-colors cursor-pointer shrink-0"
                  aria-label={`Remove ${att.filename}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {isUploading &&
              (uploadingFiles.length > 0 ? uploadingFiles : ["Document"]).map((name, idx) => (
                <div
                  key={`${name}-${idx}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#1D4ED8]/25 cogent-upload-shimmer px-2.5 py-1 text-[12px] text-[#1D4ED8] font-medium max-w-[240px]"
                >
                  <CogentPulseIndicator size="xs" tone="brand" />
                  <span className="truncate">{name}</span>
                </div>
              ))}

            {enableLiveWebSearch && liveSearchAllowed && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8]/25 bg-blue-50/75 px-2.5 py-1 text-[12px] font-medium text-[#1E3A8A]">
                <Globe className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0" />
                <span>{isStandardWebFallback ? "Standard web search" : "Web search"}</span>
                <span className="font-mono text-[10.5px] text-[#1D4ED8] bg-white/90 border border-[#1D4ED8]/25 rounded px-1">
                  {activeJurisdiction === "AFRICA_REGIONAL" ? "AFRICA" : activeJurisdiction}
                </span>
                {!isStandardWebFallback && liveSearchQuota && liveSearchQuota.monthly_limit > 0 && (
                  <span className="font-mono text-[10px] text-[#1D4ED8]/80">
                    ({liveSearchQuota.remaining}/{liveSearchQuota.monthly_limit})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onToggleLiveWebSearch?.(false)}
                  className="rounded-full p-0.5 text-[#1D4ED8] hover:bg-blue-100 hover:text-[#1E40AF] cursor-pointer"
                  aria-label="Disable live web search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedKnowledgeDoc && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8]/20 bg-blue-50/45 px-2.5 py-1 text-[12px] font-medium text-zinc-900 max-w-[220px]">
                <BookOpen className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0" />
                <span className="truncate">{selectedKnowledgeDoc.title}</span>
                {onSelectKnowledgeDoc && (
                  <button
                    type="button"
                    onClick={() => onSelectKnowledgeDoc(null)}
                    className="rounded-full p-0.5 text-[#1D4ED8]/70 hover:bg-blue-100 hover:text-[#1D4ED8] cursor-pointer shrink-0"
                    aria-label="Clear referenced policy document"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            )}

            {selectedProduct && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8]/20 bg-blue-50/45 px-2.5 py-1 text-[12px] font-medium text-zinc-900 max-w-[200px]">
                <Tag className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0" />
                <span className="truncate">{selectedProduct.product_name}</span>
                {onSelectProduct && (
                  <button
                    type="button"
                    onClick={() => onSelectProduct(null)}
                    className="rounded-full p-0.5 text-[#1D4ED8]/70 hover:bg-blue-100 hover:text-[#1D4ED8] cursor-pointer shrink-0"
                    aria-label="Clear referenced product rate card"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            )}

            {workflowHint && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8]/25 bg-blue-50/60 px-2.5 py-1 font-mono text-[11px] font-medium text-[#1D4ED8]">
                <Sparkles className="h-3 w-3 text-[#1D4ED8]" />
                <span>{WORKFLOW_LABELS[workflowHint] || workflowHint}</span>
                {onSelectWorkflowHint && (
                  <button
                    type="button"
                    onClick={() => onSelectWorkflowHint(null)}
                    className="text-[#1D4ED8]/70 hover:text-[#1E40AF] cursor-pointer"
                    aria-label="Clear workflow hint"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            pendingAttachments.length > 0
              ? "Add instructions for your attached flyers, PDFs, or policy docs..."
              : isZeroState
                ? "Ask Cogent a compliance question, clear a campaign, structure a product, or drop flyers/docs..."
                : "Ask a follow-up, refine the work product, or drop another document..."
          }
          disabled={disabled}
          rows={isZeroState ? 3 : 2}
          className="w-full resize-none border-0 bg-transparent px-1 py-1 text-[14px] text-zinc-950 placeholder:text-zinc-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 min-h-[48px] max-h-[180px] leading-relaxed"
        />

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
        />

        {/* Bottom Toolbar: + Files & sources on left, Ask Cogent on right */}
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap relative" ref={plusMenuContainerRef}>
            {/* Primary + Attachment & Sources Button */}
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={plusMenuOpen}
              onClick={() => {
                setPlusMenuOpen((prev) => !prev);
                setActiveSubmenu(null);
              }}
              disabled={disabled || isUploading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                plusMenuOpen
                  ? "bg-[#1D4ED8] text-white shadow-xs"
                  : "text-zinc-700 hover:bg-blue-50/70 hover:text-[#1D4ED8]"
              }`}
              title="Attach or drop files (flyers, PDFs, docs) or enable Web search sources"
            >
              {isUploading ? (
                <CogentPulseIndicator size="xs" tone="brand" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Files and sources</span>
            </button>

            {/* Quick Workflow Selector Pill */}
            {onSelectWorkflowHint && (
              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(true);
                  setActiveSubmenu("workflows");
                }}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-zinc-600 hover:bg-blue-50/70 hover:text-[#1D4ED8] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Workflows</span>
              </button>
            )}

            {/* + Popover Menu (Files, Knowledge Base, Rate Cards, Web Search & Jurisdictions) */}
            {plusMenuOpen && (
              <div
                role="menu"
                aria-label="Files and regulatory sources"
                className={`absolute left-0 z-50 w-[300px] sm:w-[320px] rounded-xl border border-zinc-200 bg-white shadow-xl py-1.5 text-[12.5px] text-zinc-800 ${
                  isZeroState ? "top-full mt-2" : "bottom-full mb-2"
                }`}
              >
                {activeSubmenu === "knowledge" ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setActiveSubmenu(null)}
                      className="w-full px-3 py-2 text-left text-[11.5px] font-semibold text-zinc-500 hover:text-zinc-900 border-b border-zinc-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>← Back to Files &amp; sources</span>
                    </button>
                    {knowledgeDocs.length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-zinc-500 space-y-2">
                        <p>No internal policies indexed yet.</p>
                        <Link
                          href="/knowledge-base"
                          className="inline-flex items-center gap-1 font-medium text-zinc-900 underline"
                        >
                          Upload policy in Knowledge Base
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="py-1">
                        {selectedKnowledgeDocId && onSelectKnowledgeDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectKnowledgeDoc(null);
                              setPlusMenuOpen(false);
                              setActiveSubmenu(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-zinc-50 font-medium cursor-pointer"
                          >
                            Clear selected policy
                          </button>
                        )}
                        {knowledgeDocs.map((doc) => {
                          const selected = doc.id === selectedKnowledgeDocId;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                onSelectKnowledgeDoc?.(selected ? null : doc.id);
                                setPlusMenuOpen(false);
                                setActiveSubmenu(null);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-zinc-900">{doc.title}</p>
                                <p className="text-[10.5px] text-zinc-400 font-mono">
                                  {doc.document_type}
                                </p>
                              </div>
                              {selected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : activeSubmenu === "products" ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setActiveSubmenu(null)}
                      className="w-full px-3 py-2 text-left text-[11.5px] font-semibold text-zinc-500 hover:text-zinc-900 border-b border-zinc-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>← Back to Files &amp; sources</span>
                    </button>
                    {products.length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-zinc-500 space-y-2">
                        <p>No product rate cards configured yet.</p>
                        <Link
                          href="/knowledge-base"
                          className="inline-flex items-center gap-1 font-medium text-zinc-900 underline"
                        >
                          Configure product truth
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="py-1">
                        {selectedProductId && onSelectProduct && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProduct(null);
                              setPlusMenuOpen(false);
                              setActiveSubmenu(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-zinc-50 font-medium cursor-pointer"
                          >
                            Clear selected rate card
                          </button>
                        )}
                        {products.map((prod) => {
                          const selected = prod.id === selectedProductId;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                onSelectProduct?.(selected ? null : prod.id);
                                setPlusMenuOpen(false);
                                setActiveSubmenu(null);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-zinc-900">
                                  {prod.product_name}
                                </p>
                                <p className="text-[10.5px] text-zinc-400 font-mono">
                                  {prod.product_type}
                                </p>
                              </div>
                              {selected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : activeSubmenu === "workflows" ? (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setActiveSubmenu(null)}
                      className="w-full px-3 py-2 text-left text-[11.5px] font-semibold text-zinc-500 hover:text-zinc-900 border-b border-zinc-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>← Back to Files &amp; sources</span>
                    </button>
                    {(Object.keys(WORKFLOW_LABELS) as WorkflowType[]).map((wf) => {
                      const active = workflowHint === wf;
                      return (
                        <button
                          key={wf}
                          type="button"
                          onClick={() => {
                            onSelectWorkflowHint?.(active ? null : wf);
                            setPlusMenuOpen(false);
                            setActiveSubmenu(null);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="font-medium text-zinc-900">{WORKFLOW_LABELS[wf]}</span>
                          {active && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Section 1: Files & Internal Vault */}
                    <div className="py-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setPlusMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Upload className="h-4 w-4 text-zinc-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900">Upload files</p>
                          <p className="text-[11px] text-zinc-400">
                            Flyers (PNG/JPG/WEBP), PDFs &amp; Word (.docx)
                          </p>
                        </div>
                      </button>

                      {onSelectKnowledgeDoc && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setActiveSubmenu("knowledge")}
                          className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <BookOpen className="h-4 w-4 text-zinc-600 shrink-0" />
                            <span className="font-medium text-zinc-900 truncate">
                              Add from Knowledge base
                            </span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {selectedKnowledgeDoc && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          </span>
                        </button>
                      )}

                      {onSelectProduct && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setActiveSubmenu("products")}
                          className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Tag className="h-4 w-4 text-zinc-600 shrink-0" />
                            <span className="font-medium text-zinc-900 truncate">
                              Attach Product Rate Card
                            </span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {selectedProduct && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Section 2: Sources (Web Search + Jurisdictional Regulators) */}
                    <div className="my-1 border-t border-zinc-100 pt-1.5">
                      <p className="px-3.5 py-1 text-[11px] font-medium text-zinc-400">Sources</p>

                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={Boolean(enableLiveWebSearch && liveSearchAllowed)}
                        onClick={handleToggleLiveSearchClick}
                        className="w-full px-3.5 py-2 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Globe
                            className={`h-4 w-4 shrink-0 ${
                              enableLiveWebSearch && liveSearchAllowed
                                ? "text-[#1D4ED8]"
                                : "text-zinc-600"
                            }`}
                          />
                          <span className="font-medium text-zinc-900">Web search</span>
                        </span>

                        {!liveSearchAllowed && liveSearchQuota ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-zinc-500">
                            <Lock className="h-3 w-3" />
                            <span>Growth</span>
                          </span>
                        ) : enableLiveWebSearch && liveSearchAllowed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-[#1D4ED8]/25 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#1D4ED8]">
                            <Check className="h-3 w-3" />
                            <span>
                              {isStandardWebFallback
                                ? "STANDARD"
                                : liveSearchQuota && liveSearchQuota.monthly_limit > 0
                                  ? `ON · ${liveSearchQuota.remaining}/${liveSearchQuota.monthly_limit}`
                                  : "ON"}
                            </span>
                          </span>
                        ) : isStandardWebFallback ? (
                          <span className="text-[10.5px] font-mono text-zinc-400">
                            Standard
                          </span>
                        ) : liveSearchQuota && liveSearchQuota.monthly_limit > 0 ? (
                          <span className="text-[10.5px] font-mono text-zinc-400">
                            {liveSearchQuota.remaining} left
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-mono text-zinc-400">
                            Live
                          </span>
                        )}
                      </button>

                      {/* Jurisdictional Regulatory Sources */}
                      {onSelectJurisdictions && (
                        <div className="mt-0.5 max-h-[190px] overflow-y-auto">
                          {JURISDICTION_SOURCES.map((jur) => {
                            const isSelected =
                              enableLiveWebSearch &&
                              liveSearchAllowed &&
                              activeJurisdiction === jur.code;
                            const isGated = jur.code !== "NG" && !crossBorderAllowed;

                            return (
                              <button
                                key={jur.code}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isSelected}
                                onClick={() => {
                                  handleSelectJurisdictionSource(jur.code);
                                  if (!isGated && liveSearchAllowed) {
                                    setPlusMenuOpen(false);
                                  }
                                }}
                                className={`w-full px-3.5 py-1.5 text-left hover:bg-zinc-50 flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected ? "bg-blue-50/50" : ""
                                }`}
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-[14px] leading-none shrink-0" aria-hidden="true">
                                    {jur.flag}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block font-medium text-zinc-900 truncate">
                                      {jur.name}
                                    </span>
                                    <span className="block text-[10.5px] text-zinc-400 truncate">
                                      {jur.regulators}
                                    </span>
                                  </span>
                                </span>

                                {isGated ? (
                                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                    Scale
                                  </span>
                                ) : isSelected ? (
                                  <Check className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSend}
            className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer shrink-0 ${
              canSend
                ? "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-xs"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            }`}
            aria-label="Ask Cogent"
          >
            {disabled ? <CogentPulseIndicator size="xs" tone="neutral" /> : null}
            <span>Ask Cogent</span>
          </button>
        </div>
      </form>

      {/* 2x3 Hairline Workflow & Compliance Starter Grid (Zero State Only) */}
      {isZeroState && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
          {STARTER_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelectWorkflowHint?.(card.workflowHint);
                  if (card.prefillOnly) {
                    setContent(card.prompt);
                    textareaRef.current?.focus();
                  } else {
                    void onSendMessage(card.prompt, {
                      enableLiveWebSearch: Boolean(
                        enableLiveWebSearch && liveSearchQuota?.live_web_allowed,
                      ),
                      searchJurisdictions,
                      referencedKnowledgeDocId: selectedKnowledgeDocId || undefined,
                      workflowHint: card.workflowHint,
                    });
                  }
                }}
                className="group text-left p-3.5 rounded-xl border border-zinc-200 bg-white hover:bg-blue-50/25 hover:border-[#1D4ED8]/35 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-900">
                  <Icon className="h-3.5 w-3.5 text-zinc-500 group-hover:text-[#1D4ED8] transition-colors shrink-0" />
                  <span className="truncate">{card.title}</span>
                </div>
                <p className="mt-1 text-[12px] text-zinc-500 line-clamp-1">
                  {card.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
