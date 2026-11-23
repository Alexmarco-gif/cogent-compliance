"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Upload,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileText,
  Search,
  CheckCircle2,
  Archive,
  X,
  FolderLock,
  Loader2,
} from "lucide-react";
import {
  COMPLIANCE_DEPARTMENTS,
  DEPARTMENT_LABELS,
  EVIDENCE_CATEGORIES,
  EVIDENCE_CATEGORY_LABELS,
  type ComplianceDepartment,
  type EvidenceCategory,
  type EvidenceItemRecord,
} from "@/contracts/ddq.contracts";
import { extractApiError } from "@/lib/api-client";

interface EvidenceSummary {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
  draft: number;
}

const HEALTH_BADGE: Record<EvidenceItemRecord["computed_health"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXPIRING_SOON: "bg-amber-50 text-amber-800 border-amber-200",
  EXPIRED: "bg-rose-50 text-rose-700 border-rose-200",
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  SUPERSEDED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  ARCHIVED: "bg-zinc-100 text-zinc-400 border-zinc-200",
};

export function EvidenceVaultManager() {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const [items, setItems] = useState<EvidenceItemRecord[]>([]);
  const [summary, setSummary] = useState<EvidenceSummary>({
    total: 0,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    draft: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [healthFilter, setHealthFilter] = useState<string>("");

  // Upload / Register Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EvidenceCategory>("AML_CFT_POLICY");
  const [ownerDept, setOwnerDept] = useState<ComplianceDepartment>("COMPLIANCE");
  const [ownerName, setOwnerName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [expiryDate, setExpiryDate] = useState("");
  const [tags, setTags] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parentEvidenceId, setParentEvidenceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvidence = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setLoading(false);
      return;
    }
    try {
      const qs = new URLSearchParams();
      if (categoryFilter) qs.set("category", categoryFilter);
      if (deptFilter) qs.set("owner_department", deptFilter);
      if (healthFilter) qs.set("status", healthFilter);
      if (search.trim()) qs.set("search", search.trim());

      const res = await fetch(`/api/marketing-shield/v1/evidence?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Failed to load Evidence Vault");
        throw new Error(parsed.message);
      }
      setItems(json.data?.items || []);
      if (json.data?.summary) setSummary(json.data.summary);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, orgId, categoryFilter, deptFilter, healthFilter, search]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchEvidence();
  }, [isLoaded, fetchEvidence]);

  const resetModal = () => {
    setTitle("");
    setDescription("");
    setCategory("AML_CFT_POLICY");
    setOwnerDept("COMPLIANCE");
    setOwnerName("");
    setEffectiveDate(new Date().toISOString().split("T")[0] || "");
    setExpiryDate("");
    setTags("");
    setExtractedText("");
    setFile(null);
    setParentEvidenceId(null);
  };

  const openNewVersionModal = (item: EvidenceItemRecord) => {
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category);
    setOwnerDept(item.owner_department);
    setOwnerName(item.owner_name || "");
    setEffectiveDate(new Date().toISOString().split("T")[0] || "");
    setExpiryDate("");
    setTags((item.tags || []).join(", "));
    setExtractedText("");
    setFile(null);
    setParentEvidenceId(item.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      if (description.trim()) form.append("description", description.trim());
      form.append("category", category);
      form.append("owner_department", ownerDept);
      if (ownerName.trim()) form.append("owner_name", ownerName.trim());
      if (effectiveDate) form.append("effective_date", effectiveDate);
      if (expiryDate) form.append("expiry_date", expiryDate);
      if (tags.trim()) form.append("tags", tags.trim());
      if (extractedText.trim()) form.append("extracted_text", extractedText.trim());
      if (parentEvidenceId) form.append("parent_evidence_id", parentEvidenceId);
      if (file) form.append("file", file);

      const res = await fetch("/api/marketing-shield/v1/evidence", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Failed to upload evidence artifact");
      }

      setModalOpen(false);
      resetModal();
      await fetchEvidence();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/marketing-shield/v1/evidence/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error?.message || "Unable to approve evidence item");
      return;
    }
    await fetchEvidence();
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this evidence artifact? Existing DDQ links will remain intact.")) return;
    const res = await fetch(`/api/marketing-shield/v1/evidence/${id}`, { method: "DELETE" });
    if (res.ok) await fetchEvidence();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">
            Central Compliance Evidence Repository
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Version-controlled policies, CBN licences, VAPT reports, NDPC CAR receipts, and reconciliations reused across DDQs &amp; audits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetModal();
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Evidence Artifact</span>
        </button>
      </div>

      {/* Health Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setHealthFilter("")}
          className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
            healthFilter === "" ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
          }`}
        >
          <div className="text-[11px] font-medium text-zinc-500">Total Artifacts</div>
          <div className="text-lg font-semibold text-zinc-950 mt-0.5">{summary.total}</div>
        </button>
        <button
          type="button"
          onClick={() => setHealthFilter(healthFilter === "ACTIVE" ? "" : "ACTIVE")}
          className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
            healthFilter === "ACTIVE" ? "border-emerald-600 bg-emerald-50/40" : "border-zinc-200 bg-white hover:bg-zinc-50"
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-700">Active &amp; Current</div>
          <div className="text-lg font-semibold text-emerald-700 mt-0.5">{summary.active}</div>
        </button>
        <button
          type="button"
          onClick={() => setHealthFilter(healthFilter === "EXPIRING_SOON" ? "" : "EXPIRING_SOON")}
          className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
            healthFilter === "EXPIRING_SOON" ? "border-amber-600 bg-amber-50/40" : "border-zinc-200 bg-white hover:bg-zinc-50"
          }`}
        >
          <div className="text-[11px] font-medium text-amber-700">Expiring ≤ 30d</div>
          <div className="text-lg font-semibold text-amber-700 mt-0.5">{summary.expiring_soon}</div>
        </button>
        <button
          type="button"
          onClick={() => setHealthFilter(healthFilter === "EXPIRED" ? "" : "EXPIRED")}
          className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
            healthFilter === "EXPIRED" ? "border-rose-600 bg-rose-50/40" : "border-zinc-200 bg-white hover:bg-zinc-50"
          }`}
        >
          <div className="text-[11px] font-medium text-rose-700">Expired (Action Needed)</div>
          <div className="text-lg font-semibold text-rose-700 mt-0.5">{summary.expired}</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies, licences, VAPT..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-900"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md bg-white focus:outline-none focus:border-zinc-900"
        >
          <option value="">All Evidence Categories</option>
          {EVIDENCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EVIDENCE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md bg-white focus:outline-none focus:border-zinc-900"
        >
          <option value="">All Owner Departments</option>
          {COMPLIANCE_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {DEPARTMENT_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading Evidence Vault...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-zinc-200 rounded-lg space-y-2">
          <FolderLock className="w-7 h-7 text-zinc-400 mx-auto" />
          <p className="text-sm font-medium text-zinc-800">No compliance evidence uploaded yet</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Upload your AML/CFT Policy, CBN licence letter, latest VAPT report, NDPC CAR filing receipt, and KYC SOP once—Cogent automatically maps and attaches them as Annexures A–Z on every sponsor bank DDQ.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white hover:bg-zinc-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-sm font-medium text-zinc-950 truncate">{item.title}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                    v{item.version_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                      HEALTH_BADGE[item.computed_health]
                    }`}
                  >
                    {item.computed_health.replace("_", " ")}
                  </span>
                  {item.approved_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Approved
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-zinc-500 line-clamp-1">{item.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                  <span>{EVIDENCE_CATEGORY_LABELS[item.category]}</span>
                  <span>·</span>
                  <span>{DEPARTMENT_LABELS[item.owner_department]}</span>
                  {item.owner_name && (
                    <>
                      <span>·</span>
                      <span>Owner: {item.owner_name}</span>
                    </>
                  )}
                  {item.expiry_date && (
                    <>
                      <span>·</span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          item.computed_health === "EXPIRED"
                            ? "text-rose-700 font-medium"
                            : item.computed_health === "EXPIRING_SOON"
                              ? "text-amber-700 font-medium"
                              : ""
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        Expires {item.expiry_date}
                        {item.days_until_expiry != null
                          ? item.days_until_expiry < 0
                            ? ` (${Math.abs(item.days_until_expiry)}d overdue)`
                            : ` (${item.days_until_expiry}d left)`
                          : ""}
                      </span>
                    </>
                  )}
                  {item.sha256_hash && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-[10px]">
                        SHA256: {item.sha256_hash.slice(0, 10)}…
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.approved_at && (
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openNewVersionModal(item)}
                  className="px-2.5 py-1 text-[11px] font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md cursor-pointer"
                >
                  New Version
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(item.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md cursor-pointer"
                  title="Archive"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-950">
                {parentEvidenceId ? "Upload Superseding Version" : "Upload Compliance Evidence Artifact"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Board-Approved AML/CFT Policy v3.2 or 2026 Annual VAPT Report"
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    {EVIDENCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {EVIDENCE_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Owner Department
                  </label>
                  <select
                    value={ownerDept}
                    onChange={(e) => setOwnerDept(e.target.value as ComplianceDepartment)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    {COMPLIANCE_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {DEPARTMENT_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g., Adebayo (CCO)"
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Expiry / Renewal Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Attach File (.pdf, .docx, .xlsx, .txt)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.md"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-200 file:text-xs file:font-medium file:bg-zinc-50 hover:file:bg-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Summary / Key Control Extract (optional — auto-extracted if file uploaded)
                </label>
                <textarea
                  rows={4}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder="Paste key policy provisions, licence numbers, VAPT attestation summary, or filing dates so AI grounds DDQ responses accurately..."
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., CBN, AML, Sponsor Bank, 2026"
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save to Evidence Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
