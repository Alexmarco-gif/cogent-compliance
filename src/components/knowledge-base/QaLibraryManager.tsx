"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
  Sparkles,
  BookMarked,
  X,
  Loader2,
} from "lucide-react";
import {
  COMPLIANCE_DEPARTMENTS,
  DDQ_DOMAINS,
  DEPARTMENT_LABELS,
  DOMAIN_LABELS,
  type ComplianceDepartment,
  type DdqDomain,
  type QaLibraryEntryRecord,
} from "@/contracts/ddq.contracts";
import { extractApiError } from "@/lib/api-client";

export function QaLibraryManager() {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const [items, setItems] = useState<QaLibraryEntryRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, fresh: 0, stale: 0, total_reuses: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [domain, setDomain] = useState<DdqDomain>("AML_CFT");
  const [ownerDept, setOwnerDept] = useState<ComplianceDepartment>("COMPLIANCE");
  const [reviewCycleDays, setReviewCycleDays] = useState(180);
  const [submitting, setSubmitting] = useState(false);

  const fetchQa = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setLoading(false);
      return;
    }
    try {
      const qs = new URLSearchParams();
      if (domainFilter) qs.set("domain", domainFilter);
      if (staleOnly) qs.set("stale_only", "true");
      if (search.trim()) qs.set("search", search.trim());

      const res = await fetch(`/api/marketing-shield/v1/qa-library?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Failed to load Q&A Library");
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
  }, [isSignedIn, orgId, domainFilter, staleOnly, search]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchQa();
  }, [isLoaded, fetchQa]);

  const openCreate = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setDomain("AML_CFT");
    setOwnerDept("COMPLIANCE");
    setReviewCycleDays(180);
    setModalOpen(true);
  };

  const openEdit = (entry: QaLibraryEntryRecord) => {
    setEditingId(entry.id);
    setQuestion(entry.canonical_question);
    setAnswer(entry.approved_answer);
    setDomain(entry.domain);
    setOwnerDept(entry.owner_department);
    setReviewCycleDays(180);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/marketing-shield/v1/qa-library/${editingId}`
        : "/api/marketing-shield/v1/qa-library";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical_question: question.trim(),
          approved_answer: answer.trim(),
          domain,
          owner_department: ownerDept,
          review_cycle_days: reviewCycleDays,
          ...(editingId ? { revalidate: true } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Failed to save Q&A Library entry");
      }

      setModalOpen(false);
      await fetchQa();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevalidate = async (id: string) => {
    const res = await fetch(`/api/marketing-shield/v1/qa-library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revalidate: true, review_cycle_days: 180 }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error?.message || "Unable to revalidate entry");
      return;
    }
    await fetchQa();
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this Q&A entry? It will no longer auto-match future DDQs.")) return;
    const res = await fetch(`/api/marketing-shield/v1/qa-library/${id}`, { method: "DELETE" });
    if (res.ok) await fetchQa();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">
            Approved Q&amp;A Knowledge Library
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            CCO-validated canonical DDQ answers that automatically populate future Sponsor Bank &amp; Partner questionnaires with staleness protection.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Approved Q&amp;A</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <div className="text-[11px] font-medium text-zinc-500">Approved Answers</div>
          <div className="text-lg font-semibold text-zinc-950 mt-0.5">{summary.total}</div>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <div className="text-[11px] font-medium text-emerald-700">Fresh &amp; Auto-Reusable</div>
          <div className="text-lg font-semibold text-emerald-700 mt-0.5">{summary.fresh}</div>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <div className="text-[11px] font-medium text-amber-700">Stale (Review Due)</div>
          <div className="text-lg font-semibold text-amber-700 mt-0.5">{summary.stale}</div>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <div className="text-[11px] font-medium text-blue-700">Total DDQ Auto-Reuses</div>
          <div className="text-lg font-semibold text-blue-700 mt-0.5">{summary.total_reuses}×</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search approved questions & answers..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-900"
          />
        </div>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md bg-white"
        >
          <option value="">All Compliance Domains</option>
          {DDQ_DOMAINS.map((d) => (
            <option key={d} value={d}>
              {DOMAIN_LABELS[d]}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 px-2.5 py-1.5 border border-zinc-200 rounded-md bg-white cursor-pointer">
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => setStaleOnly(e.target.checked)}
          />
          <span>Stale only</span>
        </label>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading Approved Q&amp;A Library...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-zinc-200 rounded-lg space-y-2">
          <BookMarked className="w-7 h-7 text-zinc-400 mx-auto" />
          <p className="text-sm font-medium text-zinc-800">No approved Q&amp;A entries yet</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Add canonical answers here—or promote CCO-validated answers directly from any DDQ Engagement. Every future bank DDQ automatically matches and reuses fresh answers in seconds.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-lg border border-zinc-200 bg-white space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {DOMAIN_LABELS[entry.domain]}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {DEPARTMENT_LABELS[entry.owner_department]}
                    </span>
                    {entry.is_stale ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        Stale — Review Needed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Fresh
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      Reused {entry.times_reused}×
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-950">{entry.canonical_question}</h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {entry.is_stale && (
                    <button
                      type="button"
                      onClick={() => handleRevalidate(entry.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Revalidate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="px-2.5 py-1 text-[11px] font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(entry.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md cursor-pointer"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 rounded-md p-3 border border-zinc-100 whitespace-pre-wrap">
                {entry.approved_answer}
              </p>

              {entry.is_stale && entry.staleness_reasons.length > 0 && (
                <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200 rounded-md px-3 py-1.5">
                  <strong>Staleness Alert:</strong> {entry.staleness_reasons.join(" ")}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 text-[10.5px] text-zinc-400">
                <span>Review due: {entry.review_due_at.slice(0, 10)}</span>
                <span>·</span>
                <span>Linked evidence artifacts: {entry.linked_evidence_ids.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-950">
                {editingId ? "Edit & Revalidate Approved Q&A" : "Add Approved Q&A Entry"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Canonical DDQ Question *
                </label>
                <textarea
                  required
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Do you screen customers and transactions against domestic and international sanctions lists?"
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  CCO-Approved Canonical Answer *
                </label>
                <textarea
                  required
                  rows={5}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Provide the verified institutional response grounded in active policies and Nigerian statutory rules..."
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value as DdqDomain)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    {DDQ_DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {DOMAIN_LABELS[d]}
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
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Review Cycle (days)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={730}
                    value={reviewCycleDays}
                    onChange={(e) => setReviewCycleDays(Number(e.target.value) || 180)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
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
                  <span>Save Approved Q&amp;A</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
