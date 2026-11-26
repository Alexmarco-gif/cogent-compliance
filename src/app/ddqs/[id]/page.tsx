"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Sparkles,
  Download,
  FileSpreadsheet,
  FolderArchive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Users,
  Paperclip,
  MessageSquarePlus,
  Search,
  BookMarked,
  Loader2,
  Save,
  RefreshCw,
  X,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { ChatWorkspaceSkeleton } from "@/components/shell/WorkspaceSkeletons";
import {
  COMPLIANCE_DEPARTMENTS,
  DDQ_ENGAGEMENT_STATUSES,
  DEPARTMENT_LABELS,
  DOMAIN_LABELS,
  REQUESTER_TYPE_LABELS,
  SIGNOFF_ROLE_LABELS,
  type ComplianceDepartment,
  type DdqEngagementStatus,
  type DdqQuestionRecord,
  type DdqSignoffRole,
  type EvidenceItemRecord,
} from "@/contracts/ddq.contracts";
import type { DdqDetailPayload } from "@/modules/ddq/ddq.service";
import { extractApiError } from "@/lib/api-client";
import { LinkedWorkProductCard } from "@/components/work-products/LinkedWorkProductCard";

type WorkbenchTab = "questions" | "matrix" | "annexures" | "signoff" | "followups";

const SOURCE_PILL: Record<string, { label: string; cls: string }> = {
  QA_LIBRARY_EXACT: { label: "Q&A Reused", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  QA_LIBRARY_STALE: { label: "Stale Q&A", cls: "bg-amber-50 text-amber-800 border-amber-300" },
  AI_EVIDENCE_GROUNDED: { label: "Evidence Grounded", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  AI_GAP_FLAGGED: { label: "Needs Evidence", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  MANUAL: { label: "Manual", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  NONE: { label: "Pending", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

function DdqWorkbenchContent() {
  const params = useParams<{ id: string }>();
  const ddqId = String(params?.id || "");
  const { isLoaded, isSignedIn, orgId } = useAuth();

  const [detail, setDetail] = useState<DdqDetailPayload | null>(null);
  const [vaultItems, setVaultItems] = useState<EvidenceItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("questions");

  // Question filters & active selection
  const [searchQ, setSearchQ] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Active Question Editor state
  const [answerText, setAnswerText] = useState("");
  const [assignedDept, setAssignedDept] = useState<ComplianceDepartment>("COMPLIANCE");
  const [assignedUserName, setAssignedUserName] = useState("");
  const [assignedEmail, setAssignedEmail] = useState("");
  const [questionDueDate, setQuestionDueDate] = useState("");
  const [groundingClass, setGroundingClass] = useState<DdqQuestionRecord["grounding_classification"]>("MISSING_EVIDENCE");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [selectedEvidenceToLink, setSelectedEvidenceToLink] = useState("");

  // Action states
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [routingMatrix, setRoutingMatrix] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Follow-up form
  const [followupQuery, setFollowupQuery] = useState("");
  const [followupRound, setFollowupRound] = useState(1);
  const [followupDue, setFollowupDue] = useState("");
  const [followupResponses, setFollowupResponses] = useState<Record<string, string>>({});

  // Sign-off comment drafts
  const [signoffComments, setSignoffComments] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadDetail = useCallback(async () => {
    if (!isSignedIn || !orgId || !ddqId) return;
    try {
      const [ddqRes, evRes] = await Promise.all([
        fetch(`/api/marketing-shield/v1/ddqs/${ddqId}`),
        fetch(`/api/marketing-shield/v1/evidence`),
      ]);
      const ddqJson = await ddqRes.json().catch(() => ({}));
      if (!ddqRes.ok || ddqJson.success === false) {
        const parsed = extractApiError(ddqRes.status, ddqJson, "Failed to load DDQ workspace");
        throw new Error(parsed.message);
      }
      const payload = ddqJson.data as DdqDetailPayload;
      setDetail(payload);

      const evJson = await evRes.json().catch(() => ({}));
      if (evRes.ok && evJson.success !== false) {
        setVaultItems(evJson.data?.items || []);
      }

      if (!selectedQuestionId && payload.questions.length > 0) {
        setSelectedQuestionId(payload.questions[0]!.id);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, orgId, ddqId, selectedQuestionId]);

  useEffect(() => {
    if (!isLoaded) return;
    loadDetail();
  }, [isLoaded, loadDetail]);

  const filteredQuestions = useMemo(() => {
    if (!detail) return [];
    return detail.questions.filter((q) => {
      if (deptFilter && q.assigned_department !== deptFilter) return false;
      if (gapsOnly && !q.evidence_gap_flag && q.status !== "NEEDS_EVIDENCE") return false;
      if (searchQ.trim()) {
        const s = searchQ.trim().toLowerCase();
        const hay = `${q.question_code} ${q.section_name || ""} ${q.question_text} ${q.final_answer || q.draft_answer || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [detail, deptFilter, gapsOnly, searchQ]);

  const activeQuestion = useMemo(() => {
    if (!detail) return null;
    return (
      detail.questions.find((q) => q.id === selectedQuestionId) ||
      filteredQuestions[0] ||
      detail.questions[0] ||
      null
    );
  }, [detail, selectedQuestionId, filteredQuestions]);

  // Sync editor fields when selected question changes
  useEffect(() => {
    if (!activeQuestion) return;
    setAnswerText(activeQuestion.final_answer || activeQuestion.draft_answer || "");
    setAssignedDept(activeQuestion.assigned_department);
    setAssignedUserName(activeQuestion.assigned_user_name || "");
    setAssignedEmail(activeQuestion.assigned_email || "");
    setQuestionDueDate(activeQuestion.due_date || "");
    setGroundingClass(activeQuestion.grounding_classification);
    setReviewerNotes(activeQuestion.reviewer_notes || "");
    setSelectedEvidenceToLink("");
  }, [activeQuestion]);

  const handleRunBatchDraft = async (singleQuestionId?: string) => {
    setProcessingBatch(true);
    try {
      const res = await fetch(`/api/marketing-shield/v1/ddqs/${ddqId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          singleQuestionId
            ? { question_ids: [singleQuestionId], force_redraft: true }
            : { limit: 25, force_redraft: false }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Processing failed");
      }
      const d = json.data || {};
      showToast(
        d.queued
          ? "Queued background batch drafting via Inngest."
          : `Processed ${d.processed || 0} question(s): ${d.auto_matched_qa || 0} Q&A reused, ${d.evidence_grounded || 0} grounded, ${d.gaps_flagged || 0} gaps flagged.`
      );
      await loadDetail();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleSaveQuestion = async (opts?: {
    validateAsCco?: boolean;
    promoteToQaLibrary?: boolean;
    linkEvidenceId?: string;
    unlinkEvidenceId?: string;
  }) => {
    if (!activeQuestion) return;
    setSavingQuestion(true);
    try {
      const res = await fetch(
        `/api/marketing-shield/v1/ddqs/${ddqId}/questions/${activeQuestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            final_answer: answerText,
            assigned_department: assignedDept,
            assigned_user_name: assignedUserName || null,
            assigned_email: assignedEmail || null,
            due_date: questionDueDate || null,
            grounding_classification: groundingClass,
            reviewer_notes: reviewerNotes || null,
            ...(opts?.linkEvidenceId ? { link_evidence_ids: [opts.linkEvidenceId] } : {}),
            ...(opts?.unlinkEvidenceId ? { unlink_evidence_ids: [opts.unlinkEvidenceId] } : {}),
            ...(opts?.validateAsCco ? { validate_as_cco: true } : {}),
            ...(opts?.promoteToQaLibrary ? { promote_to_qa_library: true } : {}),
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Failed saving question");
      }

      if (opts?.promoteToQaLibrary) {
        showToast("Validated & saved to Approved Q&A Knowledge Library for future DDQs!");
      } else if (opts?.validateAsCco) {
        showToast("Question marked CCO Validated.");
      } else if (opts?.linkEvidenceId) {
        showToast("Evidence artifact linked & Annexure assigned.");
      } else {
        showToast("Question updates saved.");
      }

      await loadDetail();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleAutoRouteDepartments = async () => {
    setRoutingMatrix(true);
    try {
      const res = await fetch(`/api/marketing-shield/v1/ddqs/${ddqId}/questions/bulk-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_route_by_domain: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Auto-routing failed");
      }
      showToast(`Auto-routed ${json.data?.updated_count || 0} questions to departmental owners.`);
      await loadDetail();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRoutingMatrix(false);
    }
  };

  const handleUpdateEngagementStatus = async (status: DdqEngagementStatus) => {
    const res = await fetch(`/api/marketing-shield/v1/ddqs/${ddqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`DDQ status updated to ${status.replace(/_/g, " ")}.`);
      await loadDetail();
    }
  };

  const handleSignoffDecision = async (
    role: DdqSignoffRole,
    status: "APPROVED" | "REJECTED" | "WAIVED"
  ) => {
    const res = await fetch(`/api/marketing-shield/v1/ddqs/${ddqId}/signoffs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signoff_role: role,
        status,
        comments: signoffComments[role] || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      alert(json.error?.message || "Unable to record sign-off decision");
      return;
    }
    showToast(`${SIGNOFF_ROLE_LABELS[role]} marked ${status} (cryptographically hashed).`);
    await loadDetail();
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupQuery.trim()) return;
    const res = await fetch(`/api/marketing-shield/v1/ddqs/${ddqId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        round_number: followupRound,
        requester_query: followupQuery.trim(),
        due_date: followupDue || null,
      }),
    });
    if (res.ok) {
      setFollowupQuery("");
      showToast("Bank follow-up clarification logged.");
      await loadDetail();
    }
  };

  const handleResolveFollowup = async (followupId: string, status: "ANSWERED" | "RESOLVED") => {
    const res = await fetch(`/api/marketing-shield/v1/ddqs/${ddqId}/followups`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followup_id: followupId,
        response_text: followupResponses[followupId] || undefined,
        status,
      }),
    });
    if (res.ok) {
      showToast(`Follow-up marked ${status}.`);
      await loadDetail();
    }
  };

  if (loading) {
    return (
      <WorkspaceShell section="Operations" title="DDQ Workbench">
        <div className="py-20 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading DDQ Operations Workbench...</span>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !detail) {
    return (
      <WorkspaceShell section="Operations" title="DDQ Workbench">
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
          <Link href="/ddqs" className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to DDQ Register
          </Link>
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error || "DDQ engagement not found."}
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  const { engagement, readiness } = detail;

  return (
    <WorkspaceShell section="Operations" title={engagement.title}>
      <div className="max-w-7xl mx-auto px-5 py-6 space-y-5">
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 bg-zinc-950 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Top Command Header */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <Link
                href="/ddqs"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
              >
                <ArrowLeft className="w-3 h-3" />
                DDQ Register
              </Link>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg font-semibold text-zinc-950">{engagement.title}</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {engagement.source_format}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span className="font-medium text-zinc-800">{engagement.requesting_institution}</span>
                <span>·</span>
                <span>{REQUESTER_TYPE_LABELS[engagement.requester_type]}</span>
                {engagement.due_date && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-zinc-700">
                      <Clock className="w-3 h-3" />
                      Due {engagement.due_date}
                    </span>
                  </>
                )}
                <span>·</span>
                <span>{engagement.total_questions} Questions</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={engagement.status}
                onChange={(e) => handleUpdateEngagementStatus(e.target.value as DdqEngagementStatus)}
                className="px-2.5 py-1.5 text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-md"
              >
                {DDQ_ENGAGEMENT_STATUSES.filter((s) => s !== "ARCHIVED").map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleRunBatchDraft()}
                disabled={processingBatch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md disabled:opacity-50 cursor-pointer"
              >
                {processingBatch ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Run AI Match &amp; Draft</span>
              </button>

              <a
                href={`/api/marketing-shield/v1/ddqs/${ddqId}/export?format=xlsx`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export .xlsx</span>
              </a>

              <a
                href={`/api/marketing-shield/v1/ddqs/${ddqId}/export?format=zip`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-md"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Submission Pack (.zip)</span>
              </a>
            </div>
          </div>

          {/* Live Progress Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-zinc-100">
            <div className="px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <div className="text-[10.5px] text-zinc-500">Drafted / Answered</div>
              <div className="text-sm font-semibold text-zinc-950">{readiness.percent_answered}%</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <div className="text-[10.5px] text-emerald-700">CCO Validated</div>
              <div className="text-sm font-semibold text-emerald-800">{readiness.percent_validated}%</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <div className="text-[10.5px] text-blue-700">Q&amp;A Library Reused</div>
              <div className="text-sm font-semibold text-blue-800">{engagement.auto_matched_count}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-amber-50/60 border border-amber-100">
              <div className="text-[10.5px] text-amber-800">Open Evidence Gaps</div>
              <div className="text-sm font-semibold text-amber-900">{readiness.open_evidence_gaps}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <div className="text-[10.5px] text-zinc-500">Attached Annexures</div>
              <div className="text-sm font-semibold text-zinc-950">
                {detail.annexures.length}
                {readiness.expired_annexures_count > 0 && (
                  <span className="ml-1 text-[10px] text-rose-700">
                    ({readiness.expired_annexures_count} expired!)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const meta = (engagement.metadata || {}) as Record<string, unknown>;
          const wpId =
            typeof meta.source_work_product_id === "string" ? meta.source_work_product_id : null;
          const convId =
            typeof meta.source_conversation_id === "string" ? meta.source_conversation_id : null;
          const fallbackMd =
            typeof meta.source_markdown_content === "string" ? meta.source_markdown_content : null;
          const fallbackTitle =
            typeof meta.source_document_title === "string"
              ? meta.source_document_title
              : engagement.title;
          return (
            <LinkedWorkProductCard
              workProductId={wpId}
              conversationId={convId}
              fallbackTitle={fallbackTitle}
              fallbackMarkdown={fallbackMd}
              registerLabel="DDQ Operations"
            />
          );
        })()}

        {/* 5 Operational Tabs */}
        <div className="flex items-center gap-6 border-b border-zinc-200 overflow-x-auto">
          {(
            [
              { id: "questions", label: `Questions & Responses (${detail.questions.length})`, icon: Sparkles },
              { id: "matrix", label: `Responsibility Matrix (${detail.department_matrix.length})`, icon: Users },
              { id: "annexures", label: `Annexures A–Z (${detail.annexures.length})`, icon: Paperclip },
              { id: "signoff", label: `Executive Sign-Off & Export`, icon: ShieldCheck },
              { id: "followups", label: `Follow-Up Register (${detail.followups.length})`, icon: MessageSquarePlus },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Questions & Responses Master-Detail Workbench */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Filter questions, codes, or answers..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-md"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-md"
              >
                <option value="">All Departments</option>
                {COMPLIANCE_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={gapsOnly}
                  onChange={(e) => setGapsOnly(e.target.checked)}
                />
                <span>Evidence Gaps Only</span>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Question List */}
              <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl overflow-hidden max-h-[72vh] overflow-y-auto divide-y divide-zinc-100">
                {filteredQuestions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    No questions match your current filter.
                  </div>
                ) : (
                  filteredQuestions.map((q) => {
                    const isActive = activeQuestion?.id === q.id;
                    const pill = SOURCE_PILL[q.answer_source] ?? {
                      label: "Pending",
                      cls: "bg-zinc-100 text-zinc-500 border-zinc-200",
                    };
                    const isValidated = q.status === "CCO_VALIDATED" || q.status === "APPROVED";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedQuestionId(q.id)}
                        className={`w-full text-left p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                          isActive ? "bg-blue-50/60 border-l-2 border-l-blue-700" : "hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[11px] font-semibold text-zinc-900">
                              {q.question_code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 truncate">
                              {DEPARTMENT_LABELS[q.assigned_department]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-1.5 py-0.5 text-[10px] rounded border ${pill.cls}`}>
                              {pill.label}
                            </span>
                            {isValidated && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-800 line-clamp-2 leading-snug">
                          {q.question_text}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Question Detail & Response Editor */}
              <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
                {!activeQuestion ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    Select a question on the left to review, assign, attach evidence, and validate.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 pb-3 border-b border-zinc-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white">
                            {activeQuestion.question_code}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            {DOMAIN_LABELS[activeQuestion.domain]}
                          </span>
                          {activeQuestion.source_sheet_name && (
                            <span className="text-[10.5px] font-mono text-zinc-400">
                              {activeQuestion.source_sheet_name} · Row {activeQuestion.source_row_number}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRunBatchDraft(activeQuestion.id)}
                          disabled={processingBatch}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${processingBatch ? "animate-spin" : ""}`} />
                          Re-Draft with AI
                        </button>
                      </div>
                      <p className="text-sm font-medium text-zinc-950 leading-relaxed">
                        {activeQuestion.question_text}
                      </p>
                    </div>

                    {/* Evidence Gap Warning */}
                    {activeQuestion.evidence_gap_flag && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Internal Evidence Gap Flagged</div>
                          <div className="text-[11.5px] mt-0.5">
                            {activeQuestion.evidence_gap_reason ||
                              "Attach verified supporting documentation from the Central Evidence Vault or record departmental confirmation before CCO validation."}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Response Editor */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-800">
                          Institution Response
                        </label>
                        <select
                          value={groundingClass}
                          onChange={(e) =>
                            setGroundingClass(
                              e.target.value as DdqQuestionRecord["grounding_classification"]
                            )
                          }
                          className="px-2 py-1 text-[11px] border border-zinc-200 rounded bg-zinc-50"
                        >
                          <option value="VERIFIED_EVIDENCE">Verified Evidence</option>
                          <option value="MANAGEMENT_ASSERTION">Management Assertion</option>
                          <option value="PROSPECTIVE_COMMITMENT">Prospective Commitment</option>
                          <option value="MISSING_EVIDENCE">Missing Evidence</option>
                        </select>
                      </div>
                      <textarea
                        rows={6}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Draft or review the verified DDQ response..."
                        className="w-full px-3 py-2.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 leading-relaxed"
                      />
                    </div>

                    {/* Statutory Citations */}
                    {activeQuestion.statutory_citations && activeQuestion.statutory_citations.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                          Applicable Nigerian Statutory References
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeQuestion.statutory_citations.map((c, idx) => (
                            <span
                              key={idx}
                              title={c.summary}
                              className="px-2 py-0.5 text-[10.5px] font-mono rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {c.authority} · {c.reference}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Departmental Assignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-100">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                          Owner Department
                        </label>
                        <select
                          value={assignedDept}
                          onChange={(e) => setAssignedDept(e.target.value as ComplianceDepartment)}
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md bg-white"
                        >
                          {COMPLIANCE_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {DEPARTMENT_LABELS[d]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                          Assigned Person
                        </label>
                        <input
                          type="text"
                          value={assignedUserName}
                          onChange={(e) => setAssignedUserName(e.target.value)}
                          placeholder="e.g., Chinedu (CISO)"
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                          Internal Due Date
                        </label>
                        <input
                          type="date"
                          value={questionDueDate}
                          onChange={(e) => setQuestionDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md"
                        />
                      </div>
                    </div>

                    {/* Linked Evidence Vault Artifacts */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <label className="block text-xs font-semibold text-zinc-800">
                        Supporting Evidence &amp; Annexures
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(activeQuestion.evidence_links || []).map((link) => (
                          <span
                            key={link.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            <Paperclip className="w-3 h-3" />
                            <strong>{link.annexure_label}:</strong>{" "}
                            {link.evidence_item?.title || "Evidence Artifact"}
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveQuestion({ unlinkEvidenceId: link.evidence_item_id })
                              }
                              className="text-emerald-700 hover:text-rose-700 ml-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedEvidenceToLink}
                          onChange={(e) => setSelectedEvidenceToLink(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md bg-white"
                        >
                          <option value="">Attach document from Central Evidence Vault...</option>
                          {vaultItems.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title} (v{ev.version_number} · {ev.computed_health})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedEvidenceToLink || savingQuestion}
                          onClick={() =>
                            handleSaveQuestion({ linkEvidenceId: selectedEvidenceToLink })
                          }
                          className="px-3 py-1.5 text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-md disabled:opacity-40 cursor-pointer"
                        >
                          Link Annexure
                        </button>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-200">
                      <button
                        type="button"
                        disabled={savingQuestion}
                        onClick={() => handleSaveQuestion()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-md cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Draft
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={savingQuestion}
                          onClick={() => handleSaveQuestion({ validateAsCco: true })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CCO Validate
                        </button>
                        <button
                          type="button"
                          disabled={savingQuestion}
                          onClick={() =>
                            handleSaveQuestion({ validateAsCco: true, promoteToQaLibrary: true })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-md cursor-pointer"
                        >
                          <BookMarked className="w-3.5 h-3.5" />
                          Validate &amp; Save to Q&amp;A Library
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Departmental Responsibility Matrix */}
        {activeTab === "matrix" && (
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  DDQ Departmental Responsibility Matrix
                </h2>
                <p className="text-xs text-zinc-500">
                  The CCO owns submission integrity while each department supplies factual information and verified evidence.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoRouteDepartments}
                disabled={routingMatrix}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md cursor-pointer"
              >
                {routingMatrix && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Auto-Route All by Domain</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {detail.department_matrix.map((row) => {
                const pct = row.total > 0 ? Math.round((row.validated / row.total) * 100) : 0;
                return (
                  <button
                    key={row.department}
                    type="button"
                    onClick={() => {
                      setDeptFilter(row.department);
                      setActiveTab("questions");
                    }}
                    className="text-left p-4 rounded-lg border border-zinc-200 hover:border-zinc-900 transition-colors bg-white space-y-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-950">
                        {DEPARTMENT_LABELS[row.department]}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {row.total} Qs
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{row.validated} validated</span>
                      <span className={row.needs_evidence > 0 ? "text-amber-700 font-medium" : "text-emerald-700"}>
                        {row.needs_evidence} gaps
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Annexures A-Z Schedule */}
        {activeTab === "annexures" && (
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  Submission Annexures Schedule (Annexures A–Z)
                </h2>
                <p className="text-xs text-zinc-500">
                  Every Evidence Vault document cited by questions in this DDQ is bundled automatically into the downloadable Submission Pack (.zip).
                </p>
              </div>
              <Link
                href="/knowledge-base?tab=evidence"
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Upload New Evidence →
              </Link>
            </div>

            {detail.annexures.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                No Evidence Vault documents attached yet. Link supporting documents on individual questions in Tab 1.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
                {detail.annexures.map((ax) => (
                  <div key={ax.evidence_item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {ax.annexure_label}
                        </span>
                        <span className="text-sm font-medium text-zinc-950">
                          {ax.evidence_item.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          v{ax.evidence_item.version_number}
                        </span>
                        {ax.evidence_item.computed_health === "EXPIRED" && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-300">
                            EXPIRED — BLOCKS SUBMISSION
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex flex-wrap gap-x-3">
                        <span>{DEPARTMENT_LABELS[ax.evidence_item.owner_department]}</span>
                        <span>·</span>
                        <span>Expires: {ax.evidence_item.expiry_date || "No Expiry"}</span>
                        <span>·</span>
                        <span>Cited by: {ax.question_codes.join(", ")}</span>
                      </div>
                    </div>
                    {ax.evidence_item.sha256_hash && (
                      <span className="font-mono text-[10px] text-zinc-400">
                        SHA256: {ax.evidence_item.sha256_hash.slice(0, 14)}…
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Executive Sign-Off & Submission Export */}
        {activeTab === "signoff" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
              <div className="pb-3 border-b border-zinc-200">
                <h2 className="text-sm font-semibold text-zinc-950">
                  Multi-Executive Sign-Off Gate
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Each executive decision binds cryptographically to response snapshot{" "}
                  <code className="font-mono text-[11px] text-zinc-800">
                    {readiness.snapshot_sha256.slice(0, 16)}…
                  </code>
                </p>
              </div>

              <div className="space-y-3">
                {detail.signoffs.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-lg border border-zinc-200 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-zinc-950">
                          {SIGNOFF_ROLE_LABELS[s.signoff_role]}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {s.decided_at
                            ? `Decided ${s.decided_at.slice(0, 16).replace("T", " ")}Z · Snapshot ${(s.snapshot_sha256 || "").slice(0, 12)}…`
                            : "Awaiting executive attestation"}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full border ${
                          s.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : s.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={signoffComments[s.signoff_role] ?? s.comments ?? ""}
                        onChange={(e) =>
                          setSignoffComments((prev) => ({
                            ...prev,
                            [s.signoff_role]: e.target.value,
                          }))
                        }
                        placeholder="Optional attestation note or conditions..."
                        className="flex-1 px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSignoffDecision(s.signoff_role, "APPROVED")}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSignoffDecision(s.signoff_role, "REJECTED")}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSignoffDecision(s.signoff_role, "WAIVED")}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-md cursor-pointer"
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Readiness & Export Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-950">Submission Readiness</h3>
                {readiness.ready_for_submission ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All questions validated, annexures valid, and sign-offs complete.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {readiness.blockers.map((b, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 flex items-start gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-100 space-y-2">
                  <a
                    href={`/api/marketing-shield/v1/ddqs/${ddqId}/export?format=xlsx`}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Completed Excel (.xlsx)</span>
                  </a>
                  <a
                    href={`/api/marketing-shield/v1/ddqs/${ddqId}/export?format=zip`}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-md"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Download Full Submission Pack (.zip)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Post-Submission Follow-Up Register */}
        {activeTab === "followups" && (
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Bank Clarification &amp; Follow-Up Register
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Track post-submission questions, conditional approval items, and additional evidence requests from {engagement.requesting_institution}.
              </p>
            </div>

            <form onSubmit={handleCreateFollowup} className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                    Requester Follow-Up Query *
                  </label>
                  <input
                    type="text"
                    required
                    value={followupQuery}
                    onChange={(e) => setFollowupQuery(e.target.value)}
                    placeholder="e.g., Provide signed NIBSS settlement reconciliation for last 30 days"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Round #</label>
                  <input
                    type="number"
                    min={1}
                    value={followupRound}
                    onChange={(e) => setFollowupRound(Number(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={followupDue}
                    onChange={(e) => setFollowupDue(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md cursor-pointer"
              >
                Log Follow-Up Request
              </button>
            </form>

            <div className="space-y-3">
              {detail.followups.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No post-submission follow-ups logged yet.
                </div>
              ) : (
                detail.followups.map((f) => (
                  <div key={f.id} className="p-4 rounded-lg border border-zinc-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 text-zinc-700">
                          Round {f.round_number}
                        </span>
                        <span className="text-xs font-semibold text-zinc-900">
                          {f.requester_query}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                        {f.status}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={followupResponses[f.id] ?? f.response_text ?? ""}
                      onChange={(e) =>
                        setFollowupResponses((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                      placeholder="Draft clarification response..."
                      className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveFollowup(f.id, "ANSWERED")}
                        className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded cursor-pointer"
                      >
                        Save Answer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveFollowup(f.id, "RESOLVED")}
                        className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

export default function DdqWorkbenchPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <DdqWorkbenchContent />
    </Suspense>
  );
}
