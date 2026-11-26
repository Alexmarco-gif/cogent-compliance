"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ClipboardCheck,
  Plus,
  Search,
  Upload,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  X,
  Loader2,
  FolderLock,
  BookMarked,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { ChatWorkspaceSkeleton } from "@/components/shell/WorkspaceSkeletons";
import {
  DDQ_REQUESTER_TYPES,
  REQUESTER_TYPE_LABELS,
  type DdqEngagementRecord,
  type DdqRequesterType,
} from "@/contracts/ddq.contracts";
import { extractApiError } from "@/lib/api-client";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  INGESTING: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_CCO_REVIEW: "bg-amber-50 text-amber-800 border-amber-200",
  PENDING_EXECUTIVE_SIGNOFF: "bg-purple-50 text-purple-800 border-purple-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUBMITTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  FOLLOW_UP: "bg-amber-50 text-amber-800 border-amber-200",
  CLOSED_APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CLOSED_CONDITIONAL: "bg-amber-100 text-amber-900 border-amber-300",
  CLOSED_REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

function DdqRegisterContent() {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();

  const [items, setItems] = useState<DdqEngagementRecord[]>([]);
  const [summary, setSummary] = useState({
    active_ddqs: 0,
    total_questions: 0,
    auto_matched_total: 0,
    open_gaps_total: 0,
    ready_for_signoff: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // New DDQ Intake Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [requesterType, setRequesterType] = useState<DdqRequesterType>("SPONSOR_BANK");
  const [referenceCode, setReferenceCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [autoProcess, setAutoProcess] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDdqs = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setLoading(false);
      return;
    }
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (search.trim()) qs.set("search", search.trim());

      const res = await fetch(`/api/marketing-shield/v1/ddqs?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Failed to load DDQ Register");
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
  }, [isSignedIn, orgId, statusFilter, search]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchDdqs();
  }, [isLoaded, fetchDdqs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !institution.trim()) return;
    if (!file && !rawText.trim()) {
      alert("Please upload a DDQ file (.xlsx, .docx, .pdf, .csv) or paste questionnaire questions.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("requesting_institution", institution.trim());
      form.append("requester_type", requesterType);
      if (referenceCode.trim()) form.append("reference_code", referenceCode.trim());
      if (contactName.trim()) form.append("contact_name", contactName.trim());
      if (contactEmail.trim()) form.append("contact_email", contactEmail.trim());
      if (dueDate) form.append("due_date", dueDate);
      if (rawText.trim()) form.append("raw_text", rawText.trim());
      form.append("auto_process", autoProcess ? "true" : "false");
      if (file) form.append("file", file);

      const res = await fetch("/api/marketing-shield/v1/ddqs", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Failed to register DDQ engagement");
      }

      const createdId = json.data?.engagement?.id;
      setModalOpen(false);
      if (createdId) {
        router.push(`/ddqs/${createdId}`);
      } else {
        await fetchDdqs();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceShell section="Operations" title="DDQ Operations">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              DDQ Operations Register
            </h1>
            <p className="text-sm text-zinc-500">
              Ingest 150+ question Sponsor Bank, Partner &amp; Regulator DDQs, auto-match approved answers, route gaps across departments, and export filled Excel + Annexure packs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/knowledge-base?tab=evidence"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md"
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>Evidence Vault</span>
            </Link>
            <Link
              href="/knowledge-base?tab=qa-library"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Q&amp;A Library</span>
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New DDQ Intake</span>
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <div className="text-[11px] font-medium text-zinc-500">Active DDQs</div>
            <div className="text-2xl font-semibold text-zinc-950 mt-1">{summary.active_ddqs}</div>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <div className="text-[11px] font-medium text-zinc-500">Questions Tracked</div>
            <div className="text-2xl font-semibold text-zinc-950 mt-1">{summary.total_questions}</div>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <div className="text-[11px] font-medium text-blue-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Q&amp;A Auto-Matched
            </div>
            <div className="text-2xl font-semibold text-blue-700 mt-1">
              {summary.auto_matched_total}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <div className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Open Evidence Gaps
            </div>
            <div className="text-2xl font-semibold text-amber-700 mt-1">
              {summary.open_gaps_total}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready for Sign-Off
            </div>
            <div className="text-2xl font-semibold text-emerald-700 mt-1">
              {summary.ready_for_signoff}
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by bank name, DDQ title, or reference code..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="UNDER_CCO_REVIEW">Under CCO Review</option>
            <option value="PENDING_EXECUTIVE_SIGNOFF">Pending Executive Sign-Off</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="FOLLOW_UP">Follow-Up</option>
            <option value="CLOSED_APPROVED">Closed — Approved</option>
          </select>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Register List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading DDQ Register...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-12 text-center space-y-3">
            <ClipboardCheck className="w-9 h-9 text-zinc-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">
                No DDQ engagements registered yet
              </h3>
              <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                Promote a Supervisory &amp; Partner DDQ draft straight from Copilot Chat — or upload a Sponsor Bank Excel workbook (.xlsx), Word questionnaire (.docx), or PDF here to track questions, evidence gaps, and sign-offs.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Questionnaire</span>
              </button>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Draft DDQ in Chat</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200">
            {items.map((ddq) => {
              const total = Math.max(ddq.total_questions, 1);
              const pctAnswered = Math.round((ddq.answered_count / total) * 100);
              const pctValidated = Math.round((ddq.validated_count / total) * 100);
              const promotedFromChat = Boolean(
                (ddq.metadata as Record<string, unknown> | undefined)?.promoted_from_chat
              );

              return (
                <Link
                  key={ddq.id}
                  href={`/ddqs/${ddq.id}`}
                  className="block p-5 hover:bg-zinc-50/80 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-sm font-semibold text-zinc-950 truncate">
                          {ddq.title}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {ddq.source_format}
                        </span>
                        {promotedFromChat && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Promoted from Chat
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                            STATUS_BADGE[ddq.status] || STATUS_BADGE.DRAFT
                          }`}
                        >
                          {ddq.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-800">
                          {ddq.requesting_institution}
                        </span>
                        <span>·</span>
                        <span>{REQUESTER_TYPE_LABELS[ddq.requester_type]}</span>
                        {ddq.reference_code && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[11px]">{ddq.reference_code}</span>
                          </>
                        )}
                        {ddq.due_date && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-zinc-700">
                              <Clock className="w-3 h-3" />
                              Due {ddq.due_date}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="w-44 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-600 font-medium">
                            {ddq.total_questions} Qs · {pctValidated}% CCO validated
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-600"
                            style={{ width: `${pctValidated}%` }}
                          />
                          <div
                            className="h-full bg-blue-400"
                            style={{ width: `${Math.max(0, pctAnswered - pctValidated)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{ddq.auto_matched_count} Q&amp;A reused</span>
                          <span className={ddq.evidence_gap_count > 0 ? "text-amber-700 font-medium" : "text-emerald-700"}>
                            {ddq.evidence_gap_count} gaps
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New DDQ Intake Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  Register New DDQ Engagement
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Supports 150–500+ question Excel (.xlsx), Word (.docx), PDF, CSV, or pasted text.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    DDQ Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., 2026 Annual Sponsor Bank Compliance DDQ"
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Requesting Institution *
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g., Providus Bank / Wema Bank / NIBSS"
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Requester Type
                  </label>
                  <select
                    value={requesterType}
                    onChange={(e) => setRequesterType(e.target.value as DdqRequesterType)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    {DDQ_REQUESTER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {REQUESTER_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Submission Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Bank Reference Code
                  </label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="e.g., PROV-DDQ-2026-04"
                    className="w-full px-2.5 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Bank Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g., Head of Partner Oversight"
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Bank Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="oversight@sponsorbank.com"
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/70 space-y-2">
                <label className="block text-xs font-semibold text-zinc-800">
                  Upload Questionnaire File (.xlsx, .docx, .pdf, .csv)
                </label>
                <p className="text-[11px] text-zinc-500">
                  Uploading an Excel (.xlsx) preserves every sheet, row, and answer column so Cogent writes completed answers directly back into the bank&apos;s original template.
                </p>
                <input
                  type="file"
                  accept=".xlsx,.docx,.pdf,.csv,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-zinc-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-200 file:text-xs file:font-medium file:bg-white hover:file:bg-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Or Paste DDQ Questions Directly
                </label>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={"SECTION 1: AML/CFT CONTROLS\n1. Do you have a Board-approved AML/CFT policy?\n2. State your NFIU CTR and STR filing timelines under MLPPA 2022.\nSECTION 2: CYBERSECURITY\n3. How frequently do you conduct independent VAPT?"}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md font-mono"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-zinc-700 bg-blue-50/60 border border-blue-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoProcess}
                  onChange={(e) => setAutoProcess(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <strong>Auto-match Q&amp;A Library &amp; ground from Evidence Vault immediately.</strong>{" "}
                  Questions over 20 run durably in background batches via Inngest; fresh approved answers reuse instantaneously while missing evidence is tagged for departmental owners.
                </span>
              </label>

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
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Ingest &amp; Launch DDQ Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

export default function DdqRegisterPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <DdqRegisterContent />
    </Suspense>
  );
}
