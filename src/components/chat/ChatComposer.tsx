"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  Loader2,
  Globe,
  FileImage,
  Percent,
  Video,
  ClipboardCheck,
  FileText,
  Tag,
} from "lucide-react";
import { extractApiError } from "@/lib/api-client";

export interface ProductOption {
  id: string;
  product_name: string;
  product_type: string;
}

export interface ChatComposerProps {
  onSendMessage: (content: string) => Promise<boolean | void>;
  onAssetUploaded?: (assetId: string, filename: string) => Promise<void>;
  conversationId?: string;
  disabled?: boolean;
  isZeroState?: boolean;
  products?: ProductOption[];
  selectedProductId?: string | null;
  onSelectProduct?: (productId: string | null) => void;
}

const STARTER_CARDS = [
  {
    icon: FileImage,
    title: "Audit a campaign flyer",
    subtitle: "Extract text and check ARCON rules",
    prompt:
      "Review this promotional campaign copy for CBN, FCCPC, and ARCON compliance: ",
    prefillOnly: true,
  },
  {
    icon: Percent,
    title: "Verify loan APR & fees",
    subtitle: "Check copy against internal rate card",
    prompt:
      "What are the mandatory APR and fee disclosure requirements under FCCPC DEON Regulations for digital lenders?",
    prefillOnly: false,
  },
  {
    icon: Video,
    title: "Screen influencer script",
    subtitle: "Check FCCPC & ARCON disclosure rules",
    prompt:
      "What are the ARCON ASP pre-vetting and influencer disclosure requirements for digital financial campaigns in Nigeria?",
    prefillOnly: false,
  },
  {
    icon: Globe,
    title: "Scan live landing page",
    subtitle: "Check URL copy for compliance gaps",
    prompt: "Inspect this live promotional landing page URL for regulatory compliance: https://",
    prefillOnly: true,
  },
  {
    icon: ClipboardCheck,
    title: "CBN disclosure checklist",
    subtitle: "Consumer Protection Framework mandates",
    prompt:
      "Can a Nigerian bank or fintech advertise '0% interest' without disclosing management fees and total cost of credit under CBN Consumer Protection Regulations?",
    prefillOnly: false,
  },
  {
    icon: FileText,
    title: "Prepare audit dossier",
    subtitle: "2-year FCCPC retention requirements",
    prompt:
      "What promotional records and sign-off evidence must be retained for 2 years under FCCPC consumer protection regulations and NDPA 2023 marketing opt-out rules?",
    prefillOnly: false,
  },
];

export function ChatComposer({
  onSendMessage,
  onAssetUploaded,
  conversationId,
  disabled,
  isZeroState = false,
  products = [],
  selectedProductId = null,
  onSelectProduct,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || disabled) return;

    const text = content.trim();
    const sent = await onSendMessage(text);
    if (sent !== false) {
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
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
          mime_type: file.type || "application/pdf",
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

      if (!presigned_upload_url.includes("mock")) {
        const putRes = await fetch(presigned_upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed (HTTP ${putRes.status})`);
        }
      }

      const completeRes = await fetch(`/api/marketing-shield/v1/assets/${asset_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_assess: true }),
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

      if (onAssetUploaded) {
        await onAssetUploaded(asset_id, file.name);
      }

      await onSendMessage(
        `Uploaded campaign asset "${file.name}". Please review the extracted copy against CBN, FCCPC, and ARCON requirements.`,
      );
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={isZeroState ? "w-full max-w-2xl mx-auto" : "w-full max-w-3xl mx-auto"}>
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

      {/* Unified Multi-Line Composer Dock */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-zinc-200 bg-white shadow-xs focus-within:border-zinc-400 transition-colors p-3"
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste ad copy, upload a flyer, or ask a CBN / FCCPC compliance question..."
          disabled={disabled || isUploading}
          rows={isZeroState ? 2 : 1}
          className="w-full resize-none bg-transparent px-1 py-1 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:outline-hidden min-h-[40px] max-h-[180px] leading-relaxed"
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
        />

        <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[12px] font-medium text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-600" />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span>{isUploading ? "Uploading..." : "Attach flyer / PDF"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setContent((prev) =>
                  prev.trim()
                    ? prev
                    : "Review this landing page URL for compliance: https://",
                );
                textareaRef.current?.focus();
              }}
              disabled={disabled || isUploading}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[12px] font-medium text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Globe className="h-3.5 w-3.5 text-zinc-500" />
              <span>Scan URL</span>
            </button>

            {onSelectProduct && (
              <label
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                  selectedProductId
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                }`}
              >
                <Tag
                  className={`h-3.5 w-3.5 shrink-0 ${
                    selectedProductId ? "text-zinc-200" : "text-zinc-500"
                  }`}
                />
                <select
                  aria-label="Reference approved product"
                  value={selectedProductId || ""}
                  onChange={(e) => onSelectProduct(e.target.value || null)}
                  disabled={disabled || isUploading}
                  className={`bg-transparent text-[12px] font-medium focus:outline-hidden cursor-pointer max-w-[170px] truncate ${
                    selectedProductId ? "text-white" : "text-zinc-700"
                  }`}
                >
                  <option value="" className="text-zinc-900 bg-white">
                    {products.length > 0 ? "Ref: Product rate card" : "No products added"}
                  </option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id} className="text-zinc-900 bg-white">
                      {prod.product_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={!content.trim() || disabled || isUploading}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              content.trim() && !disabled && !isUploading
                ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* 2x3 Hairline Starter Grid (Zero State Only) */}
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
                  if (card.prefillOnly) {
                    setContent(card.prompt);
                    textareaRef.current?.focus();
                  } else {
                    void onSendMessage(card.prompt);
                  }
                }}
                className="text-left p-3.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-900">
                  <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
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
