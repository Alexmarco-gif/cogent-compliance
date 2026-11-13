"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Upload,
  BookOpen,
  FileText,
  AlertTriangle,
  Clock,
  Layers,
  X,
} from "lucide-react";
import type {
  KnowledgeDocument,
  KnowledgeDocumentType,
} from "@/contracts/knowledge-product.contracts";

export function PlaybookUploader() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<KnowledgeDocumentType>("MARKETING_POLICY");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing-shield/v1/knowledge-base/documents");
      if (!res.ok) throw new Error("Failed to load knowledge documents");
      const data = await res.json();
      setDocuments(data || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        document_type: documentType,
        description: description.trim() || undefined,
        initial_content: content.trim(),
        effective_date: effectiveDate,
        version_number: 1,
      };

      const res = await fetch("/api/marketing-shield/v1/knowledge-base/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to register playbook document");
      }

      setModalOpen(false);
      setTitle("");
      setDescription("");
      setContent("");
      await fetchDocuments();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
            Internal Playbooks & Policy Manuals
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Proprietary institutional marketing policies, brand guidelines, and SOPs indexed into private vector chunks.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md shadow-xs transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Playbook</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500">Loading playbook documents...</div>
      ) : documents.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg">
          <BookOpen className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
          <p className="text-xs font-medium text-zinc-700">No internal playbooks uploaded yet.</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Upload your company&apos;s marketing policies, social media guidelines, or compliance SOPs to power institutional AI Q&A.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-xs hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {doc.document_type}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        doc.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{doc.description}</p>
                  )}
                </div>
              </div>

              {/* Chunks & Rules Count Bar */}
              <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-50 rounded border border-zinc-100 text-xs">
                <div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-zinc-400" />
                    <span>Chunks</span>
                  </div>
                  <div className="font-semibold text-zinc-800 mt-0.5">
                    {doc.chunk_count !== undefined ? doc.chunk_count : "Indexed"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-zinc-400" />
                    <span>Extracted Rules</span>
                  </div>
                  <div className="font-semibold text-zinc-800 mt-0.5">
                    {doc.rule_count !== undefined ? doc.rule_count : "Indexed"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>Effective</span>
                  </div>
                  <div className="font-semibold text-zinc-800 mt-0.5">
                    {doc.effective_date || "Current"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Playbook Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Upload Internal Marketing Playbook</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 2026 Digital Lending Fair Practice Playbook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Document Category</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as KnowledgeDocumentType)}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 focus:outline-hidden"
                  >
                    <option value="MARKETING_POLICY">Marketing Policy</option>
                    <option value="BRAND_GUIDELINE">Brand Guideline</option>
                    <option value="PRODUCT_DISCLOSURE">Product Disclosure</option>
                    <option value="SOP">Standard Operating Procedure (SOP)</option>
                    <option value="OTHER">Other Institutional Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief summary of policy coverage and applicability..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Playbook Policy Text * (Will be chunked into 250-800 token vectors)
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Paste internal policy clauses, marketing rules, mandatory disclosures, and prohibited brand statements here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 focus:outline-hidden font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-zinc-600 hover:text-zinc-800 rounded border border-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-white bg-zinc-900 hover:bg-zinc-800 rounded font-semibold disabled:opacity-50"
                >
                  {submitting ? "Processing Chunks & Rules..." : "Ingest & Index Playbook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
