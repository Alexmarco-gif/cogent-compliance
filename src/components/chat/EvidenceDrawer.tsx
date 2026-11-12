"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldCheck, ExternalLink, Copy, Check, FileText } from "lucide-react";

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
        if (isMounted) setError(err.message || "Failed to connect to statutory vault");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clauseId, isOpen]);

  // Handle escape key
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-lg bg-surface shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Statutory Evidence Drawer
                </h3>
                <p className="text-xs text-slate-500">
                  Class A Pre-Verified Sovereign Authority
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close Evidence Drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="py-16 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-primary" />
                <p className="mt-3 text-xs text-slate-500">
                  Loading verified statutory provision...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                {error}
              </div>
            )}

            {details && !loading && (
              <>
                {/* Regulator & Lifecycle Metadata Card */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      {details.regulator_acronym}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {details.lifecycle_status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {details.instrument_title}
                    </h4>
                    {details.instrument_number && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {details.instrument_number}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Effective Date</span>
                      <span className="font-medium text-slate-700">
                        {details.effective_date || "Current"}
                      </span>
                    </div>
                    {details.page_number && (
                      <div>
                        <span className="text-slate-400 block text-[11px]">Source Page</span>
                        <span className="font-medium text-slate-700">
                          Page {details.page_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Reference & Verbatim Statutory Text */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      {details.clause_reference}
                    </h4>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-surface p-4 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap select-text shadow-2xs">
                    {details.verbatim_text}
                  </div>
                </div>

                {/* Cryptographic SHA-256 Fingerprint */}
                {details.file_sha256 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Document SHA-256 Hash
                      </span>
                      <button
                        onClick={copyHashToClipboard}
                        className="flex items-center space-x-1 text-[11px] text-brand-primary hover:text-brand-hover font-medium transition-colors"
                      >
                        {copiedHash ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Hash</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-slate-600 break-all bg-white border border-slate-200/80 p-2 rounded">
                      {details.file_sha256}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Cryptographically verified against the official source PDF on disk.
                    </p>
                  </div>
                )}

                {/* Official Source Link */}
                {details.source_url && (
                  <div className="pt-2">
                    <a
                      href={details.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-xs font-medium text-brand-primary hover:text-brand-hover transition-colors"
                    >
                      <span>View Official Gazette / Publication</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
