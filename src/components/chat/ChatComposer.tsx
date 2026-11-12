"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft } from "lucide-react";

export interface ChatComposerProps {
  onSendMessage: (content: string) => Promise<void>;
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
  disabled,
  showStarterPrompts,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          placeholder="Ask a Nigerian regulatory question, query Golden 50 Vault, or paste promo copy..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3.5 pr-20 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden min-h-[52px] max-h-[180px] leading-relaxed"
        />

        <div className="absolute right-2.5 bottom-2.5 flex items-center space-x-1.5">
          <button
            type="submit"
            disabled={!content.trim() || disabled}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all cursor-pointer ${
              content.trim() && !disabled
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
        <span>Grounded in CBN, FCCPC, ARCON, NDPC & SEC Vaults</span>
      </div>
    </div>
  );
}
