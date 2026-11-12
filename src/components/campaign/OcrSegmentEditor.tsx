"use client";

import React, { useState } from "react";
import { Edit3, Check, X, Loader2 } from "lucide-react";

interface OcrSegmentEditorProps {
  assetId: string;
  segmentId: string;
  initialText: string;
  segmentIndex: number;
  onSave: (newText: string) => void;
  onClose: () => void;
}

export const OcrSegmentEditor: React.FC<OcrSegmentEditorProps> = ({
  assetId,
  segmentId,
  initialText,
  segmentIndex,
  onSave,
  onClose,
}) => {
  const [text, setText] = useState(initialText);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/marketing-shield/v1/assets/${assetId}/segments/${segmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text_content: text.trim(),
            correction_reason: reason.trim() || "Manual OCR correction",
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update OCR segment");
      }

      onSave(text.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-blue-600" />
            <h4 className="text-[15px] font-semibold text-zinc-900">
              Correct OCR Segment #{segmentIndex + 1}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Corrected Text Content
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              required
              className="w-full rounded-lg border border-zinc-300 p-3 text-[14px] leading-relaxed text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Reason for Correction (Audited in Compliance Ledger)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Corrected blurry APR percentage from flyer fine print"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-[13px] text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-[13px] font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !text.trim()}
              className="inline-flex items-center px-4 py-1.5 text-[13px] font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Save & Re-Verify
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
