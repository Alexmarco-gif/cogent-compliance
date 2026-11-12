"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft, Paperclip, Loader2, FileUp } from "lucide-react";

export interface ChatComposerProps {
  onSendMessage: (content: string) => Promise<void>;
  onAssetUploaded?: (assetId: string, filename: string) => Promise<void>;
  conversationId?: string;
  disabled?: boolean;
  showStarterPrompts?: boolean;
}

const STARTER_PROMPTS = [
  {
    title: "FCCPC APR & Fee Disclosures",
    prompt: "What are the mandatory APR and total fee disclosure requirements under FCCPC DEON Regulations for digital lenders?",
  },
  {
    title: "CBN 0% Interest & Cost of Credit",
    prompt: "Can a Nigerian bank or fintech advertise '0% interest' without disclosing management fees and total cost of credit under CBN Consumer Protection Regulations?",
  },
  {
    title: "ARCON ASP Vetting & Influencer Rules",
    prompt: "What are the ARCON ASP pre-vetting requirements and penalties for publishing digital marketing campaigns without vetting approval?",
  },
  {
    title: "NDPC Consent & Marketing Opt-Out",
    prompt: "What are the statutory requirements under NDPA 2023 for promotional SMS and unsolicited consumer financial marketing?",
  },
];

export function ChatComposer({
  onSendMessage,
  onAssetUploaded,
  conversationId,
  disabled,
  showStarterPrompts,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea based on input content
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
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSendMessage(text);
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
      // 1. Compute SHA-256 hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256_hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // 2. Obtain presigned upload session
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

      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok || !sessionJson.success) {
        throw new Error(sessionJson.error?.message || "Failed to create upload session");
      }

      const { asset_id, presigned_upload_url } = sessionJson.data;

      // 3. Upload binary directly to R2 (or fallback if mock URL)
      if (!presigned_upload_url.includes("mock")) {
        await fetch(presigned_upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }

      // 4. Complete upload & queue extraction
      const completeRes = await fetch(`/api/marketing-shield/v1/assets/${asset_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_assess: true }),
      });

      const completeJson = await completeRes.json();
      if (!completeRes.ok || !completeJson.success) {
        throw new Error(completeJson.error?.message || "Failed to finalize asset extraction");
      }

      // 5. Notify parent callback
      if (onAssetUploaded) {
        await onAssetUploaded(asset_id, file.name);
      }

      // 6. Send automatic conversational trigger
      await onSendMessage(
        `[Attached Promotional Asset: "${file.name}"] Please extract layout text, verify deterministic mechanical locks, and run compliance assessment against CBN, FCCPC, and ARCON rules.`
      );
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {/* Starter Prompts (shown when conversation is new/empty) */}
      {showStarterPrompts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pb-2">
          {STARTER_PROMPTS.map((starter, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(starter.prompt)}
              disabled={disabled}
              className="text-left p-3 rounded-xl border border-slate-200/80 bg-surface hover:bg-slate-50 hover:border-slate-300 transition-all text-xs shadow-2xs group cursor-pointer"
            >
              <span className="font-semibold text-slate-800 block text-[11px] group-hover:text-brand-primary transition-colors">
                {starter.title}
              </span>
              <p className="text-slate-500 mt-1 line-clamp-2 text-[11px] leading-relaxed">
                {starter.prompt}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px] flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border border-slate-300 bg-surface shadow-xs focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all"
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a Nigerian regulatory question, query Golden 50 Vault, or drop promotional copy/flyer..."
          disabled={disabled || isUploading}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3.5 pr-28 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden min-h-[52px] max-h-[180px] leading-relaxed"
        />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
        />

        <div className="absolute right-2.5 bottom-2.5 flex items-center space-x-1.5">
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-brand-primary hover:bg-slate-100 transition-colors cursor-pointer"
            title="Upload Promotional Flyer or Document (PNG, JPG, PDF, DOCX)"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </button>

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={!content.trim() || disabled || isUploading}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all cursor-pointer ${
              content.trim() && !disabled && !isUploading
                ? "bg-brand-primary text-white hover:bg-brand-hover shadow-2xs"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
        <span className="flex items-center space-x-1">
          <CornerDownLeft className="h-3 w-3" />
          <span>Press Enter to send, Shift+Enter for new line</span>
        </span>
        <span className="flex items-center gap-1.5">
          <FileUp className="h-3 w-3 text-slate-400" />
          <span>Direct R2 Upload • Magic-Byte Verified</span>
        </span>
      </div>
    </div>
  );
}
