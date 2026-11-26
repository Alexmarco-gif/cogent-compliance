"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  Layers,
  Loader2,
  MessageSquareWarning,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import {
  POLICY_APPROVAL_TIER_LABELS,
  POLICY_DOMAIN_LABELS,
  type PolicyDetailBundle,
  type PolicyQaValidationReport,
  type PolicyTaskStatus,
  type StructuredPolicyRedlinePayload,
} from "@/contracts/policy.contracts";
import { CANONICAL_ROLE_CATALOG } from "@/modules/auth-tenancy/roles";
import type { CanonicalRole } from "@/modules/auth-tenancy/types";
import { extractApiError } from "@/lib/api-client";
import { LinkedWorkProductCard } from "@/components/work-products/LinkedWorkProductCard";

type DetailTab = "compiler" | "review" | "approvals" | "publication" | "operations";

const LIFECYCLE_STAGES = [
  { key: "INITIATED", label: "Initiation" },
  { key: "DRAFTING", label: "Draft & Compiler" },
  { key: "STAKEHOLDER_REVIEW", label: "3-Lines Review" },
  { key: "COMPLIANCE_VALIDATION", label: "Statutory QA" },
  { key: "AWAITING_APPROVAL", label: "DoA Approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "PUBLISHED", label: "Published & Live Ops" },
];

export function PolicyDetailClient({ policyId }: { policyId: string }) {
  const [bundle, setBundle] = useState<PolicyDetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("compiler");

  // Compiler state
  const [acceptedMap, setAcceptedMap] = useState<Record<string, boolean>>({});
  const [showCleanDoc, setShowCleanDoc] = useState(true);

  // Stakeholder review state
  const [reviewerRole, setReviewerRole] = useState<CanonicalRole>("TECHNOLOGY_LEAD");
  const [reviewerDept, setReviewerDept] = useState("Technology");
  const [reviewerName, setReviewerName] = useState("");
  const [commentClauseRef, setCommentClauseRef] = useState("1.1");
  const [commentType, setCommentType] = useState<
    "GENERAL" | "LEGAL_ISSUE" | "RISK_CONCERN" | "FEASIBILITY_BLOCKER" | "AUDIT_OBSERVATION" | "EDITORIAL"
  >("FEASIBILITY_BLOCKER");
  const [commentText, setCommentText] = useState("");
  const [blockerImpact, setBlockerImpact] = useState("");
  const [resolutionNotesMap, setResolutionNotesMap] = useState<Record<string, string>>({});

  // Approval state
  const [decisionReason, setDecisionReason] = useState("");
  const [boardMinutesRef, setBoardMinutesRef] = useState("");
  const [copiedBoardPack, setCopiedBoardPack] = useState(false);

  // Publication state
  const [attestDept, setAttestDept] = useState("Operations");
  const [attestName, setAttestName] = useState("Onboarding Operations Team");
  const [attestTraining, setAttestTraining] = useState(true);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/policies/${policyId}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(extractApiError(res.status, json, "Failed to load policy detail").message);
      }
      const data = json.data as PolicyDetailBundle;
      setBundle(data);

      const sp = (data.current_version?.structured_payload || {}) as Partial<StructuredPolicyRedlinePayload>;
      if (Array.isArray(sp.clauses)) {
        const nextMap: Record<string, boolean> = {};
        for (const c of sp.clauses) {
          nextMap[c.clause_reference] = c.accepted !== false;
        }
        setAcceptedMap(nextMap);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const structuredPayload = useMemo(() => {
    return (bundle?.current_version?.structured_payload || {}) as Partial<StructuredPolicyRedlinePayload>;
  }, [bundle]);

  const qaReport = useMemo(() => {
    const raw = bundle?.current_version?.qa_validation_report;
    if (raw && typeof raw === "object" && "checks" in raw) {
      return raw as PolicyQaValidationReport;
    }
    return null;
  }, [bundle]);

  const runAction = async (
    key: string,
    url: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    successMsg: string,
  ) => {
    setBusyAction(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(extractApiError(res.status, json, "Action failed").message);
      }
      setNotice(successMsg);
      await loadDetail();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <WorkspaceShell section="Policy Workflow" title="Loading Policy...">
        <div className="py-20 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Hydrating Policy Lifecycle Workspace...</span>
        </div>
      </WorkspaceShell>
    );
  }

  if (!bundle) {
    return (
      <WorkspaceShell section="Policy Workflow" title="Policy Not Found">
        <div className="max-w-xl mx-auto mt-16 p-6 bg-white border border-zinc-200 rounded-xl text-center space-y-3">
          <ShieldAlert className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-zinc-900">{error || "Policy not found"}</p>
          <Link
            href="/policies"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Policy Register</span>
          </Link>
        </div>
      </WorkspaceShell>
    );
  }

  const {
    policy,
    current_version: version,
    obligation_mappings: obligations,
    review_assignments: reviews,
    clause_comments: comments,
    approval_steps: approvalSteps,
    controls,
    operational_clocks: clocks,
    implementation_tasks: tasks,
    attestations,
  } = bundle;

  const clauses = Array.isArray(structuredPayload.clauses) ? structuredPayload.clauses : [];
  const openBlockers = comments.filter((c) => c.is_feasibility_blocker && c.status === "OPEN");
  const ackedAttestations = attestations.filter(
    (a) => a.status === "ACKNOWLEDGED" || a.status === "TRAINING_COMPLETED",
  ).length;

  const currentStageIdx = Math.max(
    0,
    LIFECYCLE_STAGES.findIndex((s) =>
      policy.status === "IMPLEMENTING" || policy.status === "ACTIVE_MONITORING"
        ? s.key === "PUBLISHED"
        : s.key === policy.status,
    ),
  );

  return (
    <WorkspaceShell
      section={`Policy Workflow · ${policy.policy_ref_no}`}
      title={policy.title}
      rightActions={
        <div className="flex items-center gap-2">
          <Link
            href="/policies"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Register</span>
          </Link>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 text-white">
            v{version?.version_number || 1}.0 · {policy.status.replace(/_/g, " ")}
          </span>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">
        {/* Policy Metadata Header & Lifecycle Stepper */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span className="font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                {policy.policy_ref_no}
              </span>
              <span>·</span>
              <span>{POLICY_DOMAIN_LABELS[policy.domain]}</span>
              <span>·</span>
              <span>Owner: {policy.owner_department}</span>
              <span>·</span>
              <span className="font-medium text-zinc-900">
                {POLICY_APPROVAL_TIER_LABELS[policy.approval_tier]}
              </span>
              {policy.effective_date && (
                <>
                  <span>·</span>
                  <span>Effective: {policy.effective_date}</span>
                </>
              )}
              {policy.next_review_date && (
                <>
                  <span>·</span>
                  <span>Next Review: {policy.next_review_date}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {openBlockers.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  {openBlockers.length} Open Blocker{openBlockers.length === 1 ? "" : "s"}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                  version?.qa_validation_status === "PASSED"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : version?.qa_validation_status === "FAILED"
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-zinc-100 border-zinc-200 text-zinc-600"
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                QA: {version?.qa_validation_status || "PENDING"}
              </span>
            </div>
          </div>

          {/* 7-Step Visual Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isCompleted = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              return (
                <div
                  key={stage.key}
                  className={`px-2.5 py-2 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                    isCurrent
                      ? "bg-zinc-950 text-white border-zinc-950"
                      : isCompleted
                        ? "bg-emerald-50/70 text-emerald-800 border-emerald-200"
                        : "bg-zinc-50 text-zinc-500 border-zinc-200"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? "bg-white text-zinc-950 font-bold"
                        : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  <span className="truncate">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <LinkedWorkProductCard
          workProductId={version?.source_work_product_id || null}
          fallbackTitle={policy.title}
          fallbackMarkdown={version?.source_work_product_id ? version?.markdown_content || null : null}
          registerLabel="Policy Workflow"
        />

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Operational Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto">
          {[
            { id: "compiler" as const, label: "1. Draft & Clean Compiler", icon: Sparkles },
            {
              id: "review" as const,
              label: `2. Stakeholder Review (${reviews.length})`,
              icon: Users,
            },
            { id: "approvals" as const, label: "3. Statutory QA & DoA Approval", icon: ShieldCheck },
            {
              id: "publication" as const,
              label: `4. Publication & Attestations (${ackedAttestations}/${attestations.length})`,
              icon: Send,
            },
            {
              id: "operations" as const,
              label: `5. Controls, Clocks & Tasks (${controls.length + clocks.length + tasks.length})`,
              icon: Layers,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: DRAFT & CLEAN POLICY COMPILER */}
        {activeTab === "compiler" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Accept Redlines → Compile Clean vNext Policy
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Toggle clauses from the structured redline payload and compile an
                      approval-ready institutional policy without manual copy-paste.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction === "compile"}
                    onClick={() =>
                      void runAction(
                        "compile",
                        `/api/marketing-shield/v1/policies/${policy.id}/compile`,
                        "POST",
                        {
                          version_id: version?.id,
                          accepted_clause_refs: Object.entries(acceptedMap)
                            .filter(([, ok]) => ok)
                            .map(([ref]) => ref),
                          include_governance_clauses: true,
                          include_operational_clocks_appendix: true,
                        },
                        "Clean vNext Policy compiled and obligation mappings refreshed.",
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-60 shrink-0 cursor-pointer"
                  >
                    {busyAction === "compile" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>Compile Clean vNext</span>
                  </button>
                </div>

                {clauses.length > 0 ? (
                  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    {clauses.map((c) => {
                      const accepted = acceptedMap[c.clause_reference] !== false;
                      return (
                        <div
                          key={c.clause_reference}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                            accepted
                              ? "bg-emerald-50/40 border-emerald-200"
                              : "bg-zinc-50 border-zinc-200 opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-zinc-900">
                                Clause {c.clause_reference}
                              </span>
                              <span className="text-zinc-500">{c.section_heading}</span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-medium text-zinc-700">
                                {c.owner_department}
                              </span>
                            </div>
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) =>
                                  setAcceptedMap((prev) => ({
                                    ...prev,
                                    [c.clause_reference]: e.target.checked,
                                  }))
                                }
                              />
                              <span>{accepted ? "Accept Redline" : "Retain Prior"}</span>
                            </label>
                          </div>
                          {c.statutory_breach && (
                            <p className="text-[11px] text-rose-700">
                              <strong>Gap:</strong> {c.statutory_breach}
                            </p>
                          )}
                          <p className="text-zinc-800">
                            <strong>Compliant Text:</strong> {c.compliant_replacement_text}
                          </p>
                          {c.governing_authority && (
                            <p className="text-[11px] text-blue-700 font-medium">
                              Statutory Basis: {c.governing_authority}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 py-4">
                    No 5-column redline clauses detected yet. Click &ldquo;Compile Clean vNext&rdquo;
                    to package the current draft with institutional document control headers.
                  </p>
                )}
              </div>

              {/* Regulatory Obligation Mappings */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-950">
                  Regulatory Obligation Mappings ({obligations.length})
                </h3>
                {obligations.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Compile the policy to populate regulatory-to-policy traceability records.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {obligations.map((ob) => (
                      <div key={ob.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="font-medium text-zinc-900">
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 mr-1.5">
                              {ob.regulator}
                            </span>
                            {ob.instrument_title}
                          </div>
                          <p className="text-zinc-600 mt-0.5">{ob.obligation_summary}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shrink-0">
                          {ob.coverage_status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Clean Compiled Policy Preview */}
            <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-950">
                  {showCleanDoc ? "Clean Compiled Policy vNext" : "Source Redline / Draft"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCleanDoc((prev) => !prev)}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Switch to {showCleanDoc ? "Source Draft" : "Clean Compiled"}
                </button>
              </div>
              <div className="prose prose-xs max-w-none max-h-[680px] overflow-y-auto border border-zinc-100 rounded-lg p-3.5 bg-zinc-50/40 text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(showCleanDoc && version?.clean_compiled_markdown) ||
                    version?.markdown_content ||
                    "_No policy content available._"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CROSS-FUNCTIONAL STAKEHOLDER REVIEW (THREE LINES OF DEFENSE) */}
        {activeTab === "review" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-950">
                  Assign Cross-Functional Reviewers
                </h3>
                <p className="text-xs text-zinc-500">
                  Route across First Line (Ops, Tech, InfoSec, Product), Second Line (Legal, Risk),
                  and Third Line (Internal Audit — strictly advisory-only to preserve independence).
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                      Three-Lines Role
                    </label>
                    <select
                      value={reviewerRole}
                      onChange={(e) => {
                        const r = e.target.value as CanonicalRole;
                        setReviewerRole(r);
                        const meta = CANONICAL_ROLE_CATALOG.find((item) => item.role === r);
                        if (meta) setReviewerDept(meta.department);
                      }}
                      className="w-full h-9 px-2.5 text-xs border border-zinc-200 rounded-md bg-white"
                    >
                      {CANONICAL_ROLE_CATALOG.filter(
                        (r) => r.role !== "WORKSPACE_ADMIN" && r.role !== "BOARD_MEMBER",
                      ).map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.label} ({r.defenseLineLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={reviewerDept}
                        onChange={(e) => setReviewerDept(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs border border-zinc-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                        Reviewer Name
                      </label>
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="Optional name"
                        className="w-full h-9 px-2.5 text-xs border border-zinc-200 rounded-md"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busyAction === "assign_reviewer"}
                    onClick={() =>
                      void runAction(
                        "assign_reviewer",
                        `/api/marketing-shield/v1/policies/${policy.id}/reviews`,
                        "POST",
                        {
                          action: "ASSIGN_REVIEWERS",
                          version_id: version?.id,
                          due_days: 7,
                          reviewers: [
                            {
                              reviewer_department: reviewerDept.trim() || "Operations",
                              reviewer_role: reviewerRole,
                              reviewer_name: reviewerName.trim() || undefined,
                            },
                          ],
                        },
                        `Assigned ${reviewerDept} (${reviewerRole}) to Stakeholder Review.`,
                      )
                    }
                    className="w-full h-9 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
                  >
                    Add Stakeholder Reviewer
                  </button>
                </div>

                {/* Assigned Reviewers List */}
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  {reviews.length === 0 ? (
                    <p className="text-xs text-zinc-400">No reviewers assigned yet.</p>
                  ) : (
                    reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                            <span>{rev.reviewer_department}</span>
                            {rev.is_advisory_only && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                                Advisory Only (3rd Line)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {rev.reviewer_role} · {rev.status.replace(/_/g, " ")}
                          </div>
                        </div>
                        {rev.status !== "SIGNED_OFF" && rev.status !== "APPROVED_WITH_COMMENTS" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runAction(
                                `complete_${rev.id}`,
                                `/api/marketing-shield/v1/policies/${policy.id}/reviews`,
                                "PATCH",
                                {
                                  action: "COMPLETE_ASSIGNMENT",
                                  assignment_id: rev.id,
                                  status: rev.is_advisory_only
                                    ? "APPROVED_WITH_COMMENTS"
                                    : "SIGNED_OFF",
                                  summary_notes: "Reviewed and confirmed departmental alignment.",
                                },
                                `${rev.reviewer_department} review recorded.`,
                              )
                            }
                            className="px-2.5 py-1 rounded bg-white border border-zinc-300 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                          >
                            {rev.is_advisory_only ? "Record Observation" : "Sign Off"}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Clause-Level Comments & Feasibility Blockers */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                  <MessageSquareWarning className="h-4 w-4 text-amber-600" />
                  <span>Clause-Level Comments &amp; Feasibility Blockers</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={commentClauseRef}
                    onChange={(e) => setCommentClauseRef(e.target.value)}
                    placeholder="Clause Ref (e.g. 2.1)"
                    className="h-8 px-2.5 text-xs border border-zinc-200 rounded-md"
                  />
                  <select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as typeof commentType)}
                    className="h-8 px-2.5 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    <option value="FEASIBILITY_BLOCKER">Feasibility Blocker (Spawns P1 Task)</option>
                    <option value="LEGAL_ISSUE">Legal Issue</option>
                    <option value="RISK_CONCERN">Risk Concern</option>
                    <option value="AUDIT_OBSERVATION">Internal Audit Observation</option>
                    <option value="GENERAL">General Comment</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="e.g., Existing onboarding API cannot block account activation until automated BVN webhook is upgraded..."
                  className="w-full p-2.5 text-xs border border-zinc-200 rounded-md"
                />
                {commentType === "FEASIBILITY_BLOCKER" && (
                  <input
                    type="text"
                    value={blockerImpact}
                    onChange={(e) => setBlockerImpact(e.target.value)}
                    placeholder="Operational/System impact summary..."
                    className="w-full h-8 px-2.5 text-xs border border-amber-200 bg-amber-50/40 rounded-md"
                  />
                )}
                <button
                  type="button"
                  disabled={busyAction === "add_comment" || commentText.trim().length < 5}
                  onClick={async () => {
                    await runAction(
                      "add_comment",
                      `/api/marketing-shield/v1/policies/${policy.id}/reviews`,
                      "POST",
                      {
                        action: "ADD_COMMENT",
                        version_id: version?.id,
                        clause_reference: commentClauseRef.trim() || "General",
                        comment_type: commentType,
                        is_feasibility_blocker: commentType === "FEASIBILITY_BLOCKER",
                        blocker_impact: blockerImpact.trim() || undefined,
                        comment_text: commentText.trim(),
                        spawn_remediation_task: commentType === "FEASIBILITY_BLOCKER",
                      },
                      commentType === "FEASIBILITY_BLOCKER"
                        ? "Feasibility Blocker logged and P1 Remediation Task auto-spawned."
                        : "Clause comment logged.",
                    );
                    setCommentText("");
                    setBlockerImpact("");
                  }}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                >
                  Post Clause Comment
                </button>

                <div className="pt-2 border-t border-zinc-100 space-y-2.5">
                  {comments.length === 0 ? (
                    <p className="text-xs text-zinc-400">No clause comments recorded yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          c.is_feasibility_blocker && c.status === "OPEN"
                            ? "bg-rose-50/60 border-rose-200"
                            : "bg-zinc-50/60 border-zinc-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-medium text-zinc-900">
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-zinc-200">
                              Clause {c.clause_reference}
                            </span>
                            <span>{c.author_department}</span>
                            {c.is_feasibility_blocker && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-semibold">
                                FEASIBILITY BLOCKER
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-zinc-600">{c.status}</span>
                        </div>
                        <p className="text-zinc-800">{c.comment_text}</p>
                        {c.resolution_notes && (
                          <p className="text-[11px] text-emerald-700">
                            <strong>Resolution:</strong> {c.resolution_notes}
                          </p>
                        )}
                        {c.status === "OPEN" && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={resolutionNotesMap[c.id] || ""}
                              onChange={(e) =>
                                setResolutionNotesMap((prev) => ({
                                  ...prev,
                                  [c.id]: e.target.value,
                                }))
                              }
                              placeholder="Resolution / exception mitigation notes..."
                              className="flex-1 h-7 px-2 text-[11px] border border-zinc-200 rounded bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(
                                  `resolve_${c.id}`,
                                  `/api/marketing-shield/v1/policies/${policy.id}/reviews`,
                                  "PATCH",
                                  {
                                    action: "RESOLVE_COMMENT",
                                    comment_id: c.id,
                                    status: "RESOLVED",
                                    resolution_notes:
                                      resolutionNotesMap[c.id]?.trim() ||
                                      "Resolved via policy amendment and remediation task.",
                                  },
                                  "Comment resolved.",
                                )
                              }
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 cursor-pointer"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STATUTORY QA GATE & DELEGATED APPROVAL + BOARD PACK */}
        {activeTab === "approvals" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Statutory Floor QA Gate */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Stage 5 — Post-Draft Statutory Floor QA Gate
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Fail-closed check ensuring stakeholder edits did not weaken NFIU 5yr
                      retention, NDPA 72h breach notice, CBN Day-0 KYC, or leave open blockers.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction === "run_qa"}
                    onClick={() =>
                      void runAction(
                        "run_qa",
                        `/api/marketing-shield/v1/policies/${policy.id}/qa`,
                        "POST",
                        { version_id: version?.id, strict_evidence_markers: true },
                        "Post-Draft Statutory Floor QA Gate executed.",
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 shrink-0 cursor-pointer"
                  >
                    {busyAction === "run_qa" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    <span>Run Statutory QA</span>
                  </button>
                </div>

                {qaReport ? (
                  <div className="space-y-2">
                    <div
                      className={`p-2.5 rounded-lg border text-xs font-medium ${
                        qaReport.passed
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {qaReport.summary}
                    </div>
                    {qaReport.checks.map((chk) => (
                      <div
                        key={chk.check_code}
                        className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/40 flex items-start gap-2 text-xs"
                      >
                        {chk.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-medium text-zinc-900">
                            {chk.label}{" "}
                            <span className="text-[10px] font-mono text-zinc-500">
                              [{chk.severity}]
                            </span>
                          </div>
                          <p className="text-zinc-600 text-[11px]">{chk.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    QA gate has not been executed on this version yet.
                  </p>
                )}
              </div>

              {/* Multi-Tier Delegated Approval Chain */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Stage 6 — Multi-Tier Delegated Approval (DoA)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {POLICY_APPROVAL_TIER_LABELS[policy.approval_tier]}
                    </p>
                  </div>
                  {approvalSteps.length === 0 && (
                    <button
                      type="button"
                      disabled={
                        busyAction === "submit_approval" ||
                        version?.qa_validation_status !== "PASSED"
                      }
                      onClick={() =>
                        void runAction(
                          "submit_approval",
                          `/api/marketing-shield/v1/policies/${policy.id}/approvals`,
                          "POST",
                          {
                            action: "SUBMIT",
                            version_id: version?.id,
                            approval_tier: policy.approval_tier,
                          },
                          "Policy routed for Delegated Approval and Board Pack auto-assembled.",
                        )
                      }
                      className="px-3 py-1.5 rounded-md bg-purple-700 text-white text-xs font-medium hover:bg-purple-800 disabled:opacity-40 cursor-pointer"
                    >
                      Submit &amp; Assemble Board Pack
                    </button>
                  )}
                </div>

                {approvalSteps.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={decisionReason}
                        onChange={(e) => setDecisionReason(e.target.value)}
                        placeholder="Decision rationale (required, min 5 chars)"
                        className="h-8 px-2.5 text-xs border border-zinc-200 rounded-md"
                      />
                      <input
                        type="text"
                        value={boardMinutesRef}
                        onChange={(e) => setBoardMinutesRef(e.target.value)}
                        placeholder="Board / Committee Minutes Ref (optional)"
                        className="h-8 px-2.5 text-xs border border-zinc-200 rounded-md"
                      />
                    </div>

                    {approvalSteps.map((step) => (
                      <div
                        key={step.id}
                        className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-zinc-900">
                            Step {step.step_order}: {step.approver_label}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Required Role: {step.approver_role} · Status: {step.status}
                            {step.board_minutes_ref ? ` · Minutes: ${step.board_minutes_ref}` : ""}
                          </div>
                        </div>
                        {step.status === "PENDING" ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(
                                  `approve_${step.id}`,
                                  `/api/marketing-shield/v1/policies/${policy.id}/approvals`,
                                  "POST",
                                  {
                                    action: "DECIDE",
                                    version_id: version?.id,
                                    step_id: step.id,
                                    decision: "APPROVED",
                                    decision_reason:
                                      decisionReason.trim() ||
                                      "Approved in accordance with institutional DoA and statutory QA verification.",
                                    board_minutes_ref: boardMinutesRef.trim() || undefined,
                                    enforce_dual_control: false,
                                  },
                                  `Step ${step.step_order} approved.`,
                                )
                              }
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(
                                  `reject_${step.id}`,
                                  `/api/marketing-shield/v1/policies/${policy.id}/approvals`,
                                  "POST",
                                  {
                                    action: "DECIDE",
                                    version_id: version?.id,
                                    step_id: step.id,
                                    decision: "REJECTED",
                                    decision_reason:
                                      decisionReason.trim() || "Returned to drafting for revisions.",
                                    enforce_dual_control: false,
                                  },
                                  `Step ${step.step_order} rejected and returned to Drafting.`,
                                )
                              }
                              className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-medium hover:bg-rose-700 cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {step.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Assembled Board Pack */}
            <div className="lg:col-span-6 bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-zinc-500" />
                  <span>Auto-Assembled Board / Committee Approval Pack</span>
                </h3>
                {version?.board_pack_markdown && (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(version.board_pack_markdown || "");
                      setCopiedBoardPack(true);
                      setTimeout(() => setCopiedBoardPack(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    {copiedBoardPack ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedBoardPack ? "Copied" : "Copy Pack"}</span>
                  </button>
                )}
              </div>
              <div className="prose prose-xs max-w-none max-h-[650px] overflow-y-auto border border-zinc-100 rounded-lg p-3.5 bg-zinc-50/40 text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {version?.board_pack_markdown ||
                    "_Pass Statutory Floor QA and submit for Delegated Approval to auto-assemble the formal Board Pack (Executive Summary, QA Certification, Three-Lines Review Log, and Resolution Wording)._"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PUBLICATION, DELTA BRIEF & EMPLOYEE ATTESTATIONS */}
        {activeTab === "publication" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-950">
                  Stage 7 — Publish &amp; Operationalize Policy
                </h3>
                <p className="text-xs text-zinc-500">
                  Publishes the approved policy to the controlled repository, generates a
                  &ldquo;What Changed&rdquo; Delta Brief, compiles live Controls / Clocks / P0–P3
                  Tasks, dispatches Employee Attestations, and syncs to Cogent Knowledge Base.
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={attestName}
                    onChange={(e) => setAttestName(e.target.value)}
                    placeholder="Target recipient / team name"
                    className="w-full h-8 px-2.5 text-xs border border-zinc-200 rounded-md"
                  />
                  <input
                    type="text"
                    value={attestDept}
                    onChange={(e) => setAttestDept(e.target.value)}
                    placeholder="Target department"
                    className="w-full h-8 px-2.5 text-xs border border-zinc-200 rounded-md"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={attestTraining}
                      onChange={(e) => setAttestTraining(e.target.checked)}
                    />
                    <span>Require mandatory training completion before effective rollout</span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={
                    busyAction === "publish" ||
                    (version?.status !== "APPROVED" && version?.status !== "PUBLISHED")
                  }
                  onClick={() =>
                    void runAction(
                      "publish",
                      `/api/marketing-shield/v1/policies/${policy.id}/publish`,
                      "POST",
                      {
                        version_id: version?.id,
                        sync_to_knowledge_base: true,
                        compile_operational_objects: true,
                        attestation_due_days: 14,
                        attestation_recipients: attestName.trim()
                          ? [
                              {
                                recipient_name: attestName.trim(),
                                department: attestDept.trim() || "Operations",
                                requires_training: attestTraining,
                              },
                            ]
                          : [],
                      },
                      "Policy published, Delta Brief generated, Controls/Clocks/Tasks compiled, and Attestations dispatched.",
                    )
                  }
                  className="w-full h-9 rounded-md bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 disabled:opacity-40 cursor-pointer"
                >
                  Publish &amp; Compile Live Operations
                </button>
              </div>

              {/* Employee Attestations Ledger */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Employee Attestations ({ackedAttestations}/{attestations.length})
                  </h3>
                </div>
                {attestations.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Publish the approved policy to dispatch employee attestations.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attestations.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-medium text-zinc-900">{att.recipient_name}</div>
                          <div className="text-[11px] text-zinc-500">
                            {att.department} · {att.status.replace(/_/g, " ")}
                            {att.requires_training ? " · Training Required" : ""}
                          </div>
                        </div>
                        {att.status === "PENDING" || att.status === "OVERDUE" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void runAction(
                                `attest_${att.id}`,
                                `/api/marketing-shield/v1/policies/${policy.id}/operations`,
                                "PATCH",
                                {
                                  entity: "ATTESTATION",
                                  attestation_id: att.id,
                                  training_completed: att.requires_training,
                                },
                                "Employee attestation recorded with SHA-256 proof.",
                              )
                            }
                            className="px-2.5 py-1 rounded bg-zinc-950 text-white text-[11px] font-medium hover:bg-zinc-800 cursor-pointer"
                          >
                            Record Attestation
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Publication Delta Brief */}
            <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950">
                Automated &ldquo;What Changed&rdquo; Publication Delta Brief
              </h3>
              <div className="prose prose-xs max-w-none max-h-[640px] overflow-y-auto border border-zinc-100 rounded-lg p-3.5 bg-zinc-50/40 text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {version?.delta_brief_markdown ||
                    "_Publish the approved policy to generate the department-targeted What Changed Delta Brief._"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE OPERATIONAL CONTROLS, STATUTORY CLOCKS & IMPLEMENTATION TASKS */}
        {activeTab === "operations" && (
          <div className="space-y-5">
            {/* Statutory Operational Clocks */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Live Statutory Operational Clocks ({clocks.length})</span>
              </h3>
              {clocks.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Publish the policy to compile Section 3 statutory SLAs into live operational
                  clocks.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] uppercase text-zinc-500">
                        <th className="py-2 pr-3">Event / Trigger</th>
                        <th className="py-2 pr-3">Binding SLA</th>
                        <th className="py-2 pr-3">Owner Dept</th>
                        <th className="py-2">Governing Authority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {clocks.map((cl) => (
                        <tr key={cl.id}>
                          <td className="py-2.5 pr-3 font-medium text-zinc-900">
                            {cl.event_trigger}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-blue-800">{cl.binding_sla}</td>
                          <td className="py-2.5 pr-3 text-zinc-600">{cl.owner_department}</td>
                          <td className="py-2.5 text-zinc-600">{cl.governing_authority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* P0-P3 Implementation Tasks */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                <span>Live P0–P3 Implementation &amp; Remediation Tasks ({tasks.length})</span>
              </h3>
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Tasks compile automatically from Section 5 Remediation Schedules and Stage 4
                  Feasibility Blockers.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              t.priority === "P0"
                                ? "bg-rose-100 text-rose-800"
                                : t.priority === "P1"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="font-semibold text-zinc-950">{t.title}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Owner: {t.accountable_owner} ({t.owner_department}) · Target:{" "}
                          {t.target_deadline || "TBD"} · Source: {t.source_type.replace(/_/g, " ")}
                        </div>
                      </div>
                      <select
                        value={t.status}
                        onChange={(e) =>
                          void runAction(
                            `task_${t.id}`,
                            `/api/marketing-shield/v1/policies/${policy.id}/operations`,
                            "PATCH",
                            {
                              entity: "TASK",
                              task_id: t.id,
                              status: e.target.value as PolicyTaskStatus,
                            },
                            `Task marked ${e.target.value}.`,
                          )
                        }
                        className="h-8 px-2 text-xs border border-zinc-200 rounded-md bg-white"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="VERIFIED">VERIFIED</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Operational Controls (Policy vs. Procedure vs. Control) */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-indigo-600" />
                <span>Live Operational Controls — Policy vs. Procedure vs. Control ({controls.length})</span>
              </h3>
              {controls.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Publish the policy to compile accepted clauses into live operational controls.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {controls.map((ctrl) => (
                    <div
                      key={ctrl.id}
                      className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-zinc-900">
                          {ctrl.control_code} (Clause {ctrl.clause_reference})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                          {ctrl.control_type} · {ctrl.automation_level}
                        </span>
                      </div>
                      <p className="text-zinc-800">
                        <strong>Policy Rule:</strong> {ctrl.policy_rule_summary}
                      </p>
                      <p className="text-zinc-600">
                        <strong>Procedure:</strong> {ctrl.procedure_steps}
                      </p>
                      <p className="text-zinc-700">
                        <strong>Enforcing Control:</strong> {ctrl.control_statement}
                      </p>
                      <div className="text-[11px] text-zinc-500 pt-1.5 border-t border-zinc-200/70 flex items-center justify-between gap-2">
                        <span>
                          Owner: {ctrl.owner_department} · {ctrl.test_frequency}
                        </span>
                        <select
                          aria-label={`Control ${ctrl.control_code} status`}
                          value={ctrl.status}
                          onChange={(e) =>
                            void runAction(
                              `ctrl_${ctrl.id}`,
                              `/api/marketing-shield/v1/policies/${policy.id}/operations`,
                              "PATCH",
                              {
                                entity: "CONTROL",
                                control_id: ctrl.id,
                                status: e.target.value,
                              },
                              `Control ${ctrl.control_code} updated to ${e.target.value}.`,
                            )
                          }
                          className="h-6 px-1.5 text-[11px] border border-zinc-200 rounded bg-white text-zinc-800"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="NEEDS_REMEDIATION">NEEDS REMEDIATION</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="RETIRED">RETIRED</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
