"use client";

import React, { useState, useEffect } from "react";
import { X, Globe, AlertCircle } from "lucide-react";

interface CampaignOption {
  id: string;
  title: string;
  status: string;
  approved_revision_id?: string | null;
}

export interface ProductOption {
  id: string;
  product_name: string;
  product_type: string;
}

export type CreateMonitorSubmission =
  | {
      mode: "existing";
      campaign_id: string;
      published_url: string;
    }
  | {
      mode: "new";
      published_url: string;
      campaign_name: string;
      product_id?: string;
      baseline_copy?: string;
    };

interface CreateMonitorModalProps {
  campaigns: CampaignOption[];
  products?: ProductOption[];
  onClose: () => void;
  onSubmit: (input: CreateMonitorSubmission) => Promise<void>;
  isLoading?: boolean;
}

export const CreateMonitorModal: React.FC<CreateMonitorModalProps> = ({
  campaigns,
  products = [],
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [mode, setMode] = useState<"existing" | "new">(
    campaigns.length > 0 ? "existing" : "new"
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || "");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [baselineCopy, setBaselineCopy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firstCampaign = campaigns[0];
    if (firstCampaign && !selectedCampaignId) {
      setSelectedCampaignId(firstCampaign.id);
    }
  }, [campaigns, selectedCampaignId]);

  const busy = Boolean(isLoading || submitting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = publishedUrl.trim();
    if (!trimmedUrl) {
      setError("Please enter the live published URL.");
      return;
    }

    let normalizedUrl = trimmedUrl;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    if (!normalizedUrl.startsWith("https://")) {
      setError("Only HTTPS promotional URLs are permitted for drift monitoring.");
      return;
    }

    let parsedHost = "";
    try {
      const parsed = new URL(normalizedUrl);
      parsedHost = parsed.hostname;
    } catch {
      setError("Please enter a valid HTTPS URL (e.g. https://thestemgrid.com/).");
      return;
    }

    if (mode === "existing" && !selectedCampaignId) {
      setError("Please select a campaign or switch to New URL Baseline.");
      return;
    }

    const derivedName = campaignName.trim() || `${parsedHost} Landing Monitor`;
    if (mode === "new" && derivedName.length < 3) {
      setError("Baseline name must be at least 3 characters.");
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "existing") {
        await onSubmit({
          mode: "existing",
          campaign_id: selectedCampaignId,
          published_url: normalizedUrl,
        });
      } else {
        await onSubmit({
          mode: "new",
          published_url: normalizedUrl,
          campaign_name: derivedName,
          product_id: selectedProductId || undefined,
          baseline_copy: baselineCopy.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to create drift monitor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-700">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Link Published URL
              </h2>
              <p className="text-xs text-zinc-500">
                Monitor a live webpage against a campaign baseline or Product Truth
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`py-1.5 px-3 rounded-md font-medium transition-colors cursor-pointer ${
                mode === "existing"
                  ? "bg-white text-zinc-950 shadow-2xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Existing Campaign ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`py-1.5 px-3 rounded-md font-medium transition-colors cursor-pointer ${
                mode === "new"
                  ? "bg-white text-zinc-950 shadow-2xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              New URL Baseline
            </button>
          </div>

          {mode === "existing" ? (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Campaign Baseline
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
              >
                {campaigns.length === 0 ? (
                  <option value="">No campaigns yet — switch to New URL Baseline</option>
                ) : (
                  campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.status})
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Monitor Label <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. StemGrid Salary Advance Landing Page"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
                />
              </div>

              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Product Rate Card <span className="text-zinc-400 font-normal">(optional, for Lock 2)</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
                  >
                    <option value="">Auto-match or statutory-only check</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Expected Approved Copy <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste approved promotional copy to diff against, or leave blank to audit live page copy directly against Nigerian statutory locks & Product Truth."
                  value={baselineCopy}
                  onChange={(e) => setBaselineCopy(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900 resize-y"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Live Published URL
            </label>
            <div className="relative">
              <Globe className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                inputMode="url"
                placeholder="https://thestemgrid.com/"
                value={publishedUrl}
                onChange={(e) => setPublishedUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 placeholder-zinc-400 font-mono outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Must be a publicly reachable HTTPS URL. An initial live check runs immediately.
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || (mode === "existing" && campaigns.length === 0)}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busy ? "Linking & Checking..." : "Start Monitoring"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
