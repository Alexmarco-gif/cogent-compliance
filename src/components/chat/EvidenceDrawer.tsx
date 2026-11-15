"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Copy, Check, FileText } from "lucide-react";

export interface EvidenceDrawerProps {
  clauseId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface StatutoryProvisionDetails {
  regulatory_clause_id: string;
  clause_reference: string;
  verbatim_text: string;
  page_number?: number;
  instrument_title: string;
  instrument_type?: string;
  instrument_number?: string;
  regulator_acronym: string;
  regulator_name?: string;
  official_domain?: string;
  file_sha256?: string;
  source_url?: string;
  effective_date?: string;
  lifecycle_status: string;
}

export function EvidenceDrawer({ clauseId, isOpen, onClose }: EvidenceDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<StatutoryProvisionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (!isOpen || !clauseId) {
      setDetails(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/marketing-shield/v1/statutory/provisions/${clauseId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          if (json.success && json.data) {
            setDetails(json.data);
          } else {
            setError(json.error?.message || "Failed to load provision");
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load statutory provision");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clauseId, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const copyHashToClipboard = () => {
    if (details?.file_sha256) {
      navigator.clipboard.writeText(details.file_sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/25 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-[440px] bg-white shadow-xl border-l border-zinc-200 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-700">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3 className="text-[13.5px] font-semibold text-zinc-950">
                  Statutory Provision
                </h3>
                <p className="text-[11.5px] text-zinc-500">
                  Official regulatory text
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors cursor-pointer"
              aria-label="Close source drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading && (
              <div className="py-16 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
                <p className="mt-3 text-[12px] text-zinc-500">
                  Loading statutory text...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 text-[12.5px] text-rose-700">
                {error}
              </div>
            )}

            {details && !loading && (
              <>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white text-zinc-900 border border-zinc-200">
                      {details.regulator_acronym}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {details.lifecycle_status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-[13.5px] font-semibold text-zinc-950">
                      {details.instrument_title}
                    </h4>
                    {details.instrument_number && (
                      <p className="text-[11.5px] text-zinc-500 font-mono mt-0.5">
                        {details.instrument_number}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-zinc-200">
                    <div>
                      <span className="text-zinc-400 block text-[11px]">Effective Date</span>
                      <span className="font-medium text-zinc-800">
                        {details.effective_date || "Current"}
                      </span>
                    </div>
                    {details.page_number && (
                      <div>
                        <span className="text-zinc-400 block text-[11px]">Source Page</span>
                        <span className="font-medium text-zinc-800">
                          Page {details.page_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11.5px] font-mono font-medium uppercase tracking-wider text-zinc-500">
                    {details.clause_reference}
                  </h4>

                  <div className="rounded-lg border border-zinc-200 bg-white p-4 text-[12.5px] font-mono leading-relaxed text-zinc-800 whitespace-pre-wrap select-text">
                    {details.verbatim_text}
                  </div>
                </div>

                {details.file_sha256 && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-zinc-700">
                        Source File SHA-256
                      </span>
                      <button
                        onClick={copyHashToClipboard}
                        className="flex items-center gap-1 text-[11.5px] text-zinc-700 hover:text-zinc-950 font-medium transition-colors cursor-pointer"
                      >
                        {copiedHash ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-700" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-zinc-600 break-all bg-white border border-zinc-200 p-2 rounded">
                      {details.file_sha256}
                    </p>
                  </div>
                )}

                {details.source_url && (
                  <div className="pt-1">
                    <a
                      href={details.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-900 hover:underline"
                    >
                      <span>View official publication</span>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
