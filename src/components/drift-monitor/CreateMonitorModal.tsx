"use client";

import React, { useState } from "react";
import { X, Globe, AlertCircle } from "lucide-react";
import { CreateDriftMonitorInput } from "@/contracts/drift.contracts";

interface CampaignOption {
  id: string;
  title: string;
  status: string;
  approved_revision_id?: string | null;
}

interface CreateMonitorModalProps {
  campaigns: CampaignOption[];
  onClose: () => void;
  onSubmit: (input: CreateDriftMonitorInput) => Promise<void>;
  isLoading?: boolean;
}

export const CreateMonitorModal: React.FC<CreateMonitorModalProps> = ({
  campaigns,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || "");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCampaignId) {
      setError("Please select an approved campaign.");
      return;
    }

    if (!publishedUrl.trim()) {
      setError("Please enter the live published URL.");
      return;
    }

    if (!publishedUrl.startsWith("https://")) {
      setError("Only HTTPS promotional URLs are permitted for drift monitoring.");
      return;
    }

    try {
      await onSubmit({
        campaign_id: selectedCampaignId,
        published_url: publishedUrl.trim(),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to create drift monitor.");
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
                Compare a live webpage against an approved campaign revision
              </p>
            </div>
          </div>
          <button
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

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Approved Campaign
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-900"
            >
              {campaigns.length === 0 ? (
                <option value="">No campaigns available</option>
              ) : (
                campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Live Published URL
            </label>
            <div className="relative">
              <Globe className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="url"
                placeholder="https://example.com/promos/salary-advance"
                value={publishedUrl}
                onChange={(e) => setPublishedUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 placeholder-zinc-400 font-mono focus:outline-hidden focus:border-zinc-900"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Must be a publicly reachable HTTPS URL.
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
              disabled={isLoading || campaigns.length === 0}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? "Linking URL..." : "Start Monitoring"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
