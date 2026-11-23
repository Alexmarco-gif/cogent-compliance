"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import {
  POLICY_APPROVAL_TIERS,
  POLICY_APPROVAL_TIER_LABELS,
  POLICY_DOMAINS,
  POLICY_DOMAIN_LABELS,
  POLICY_LIFECYCLE_STATUSES,
  type CompliancePolicyRecord,
  type PolicyApprovalTier,
  type PolicyDashboardSummary,
  type PolicyDomain,
  type PolicyLifecycleStatus,
} from "@/contracts/policy.contracts";
import type { WorkProductRecord } from "@/contracts/work-product.contracts";
import { extractApiError } from "@/lib/api-client";

const STATUS_BADGE_MAP: Record<PolicyLifecycleStatus, { label: string; className: string }> = {
  INITIATED: { label: "Initiated", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  DRAFTING: { label: "Drafting", className: "bg-blue-50 text-blue-700 border-blue-200" },
  STAKEHOLDER_REVIEW: {
    label: "Stakeholder Review",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  COMPLIANCE_VALIDATION: {
    label: "Compliance QA",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  AWAITING_APPROVAL: {
    label: "Awaiting Approval",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PUBLISHED: { label: "Published", className: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  IMPLEMENTING: {
    label: "Implementing",
    className: "bg-teal-50 text-teal-800 border-teal-200",
  },
  ACTIVE_MONITORING: {
    label: "Active Monitoring",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  SUPERSEDED: { label: "Superseded", className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  RETIRED: { label: "Retired", className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

const TIER_SHORT_LABEL: Record<PolicyApprovalTier, string> = {
  TIER_1_CCO: "Tier 1 · CCO",
  TIER_2_COMMITTEE: "Tier 2 · Committee",
  TIER_3_BOARD: "Tier 3 · Board",
};

export function PolicyDashboardClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<PolicyDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Create / Import modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [workProducts, setWorkProducts] = useState<WorkProductRecord[]>([]);
  const [formTitle, setFormTitle] = useState("");
  const [formDomain, setFormDomain] = useState<PolicyDomain>("AML_CFT_CPF");
  const [formDepartment, setFormDepartment] = useState("Compliance");
  const [formApprovalTier, setFormApprovalTier] = useState<PolicyApprovalTier>("TIER_3_BOARD");
  const [formReviewMonths, setFormReviewMonths] = useState(12);
  const [formTriggerSource, setFormTriggerSource] = useState<
    "REGULATORY_CHANGE" | "AUDIT_FINDING" | "NEW_PRODUCT" | "PERIODIC_REVIEW" | "INCIDENT" | "MANUAL"
  >("REGULATORY_CHANGE");
  const [formTriggerRef, setFormTriggerRef] = useState("");
  const [formWorkProductId, setFormWorkProductId] = useState("");
  const [formMarkdown, setFormMarkdown] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (domainFilter) params.set("domain", domainFilter);
      if (overdueOnly) params.set("overdue_only", "true");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/marketing-shield/v1/policies?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(extractApiError(res.status, json, "Failed to load Policy Register").message);
      }
      setSummary(json.data as PolicyDashboardSummary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, domainFilter, overdueOnly, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDashboard();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchDashboard]);

  const openInitiateModal = async () => {
    setModalOpen(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/work-products?limit=25");
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data?.items)) {
        const policyWps = (json.data.items as WorkProductRecord[]).filter(
          (w) => w.workflow_type === "POLICY_GAP_REDLINE" || w.workflow_type === "POLICY_DRAFT_NEW",
        );
        setWorkProducts(policyWps);
      }
    } catch {
      // Non-fatal: modal still works for manual initiation
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setCreateError("Please enter a policy title.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          domain: formDomain,
          owner_department: formDepartment.trim() || "Compliance",
          approval_tier: formApprovalTier,
          review_cycle_months: formReviewMonths,
          change_type: formWorkProductId ? "AMENDMENT" : "NEW_POLICY",
          trigger_source: formTriggerSource,
          trigger_reference: formTriggerRef.trim() || undefined,
          source_work_product_id: formWorkProductId || undefined,
          markdown_content: formMarkdown.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(extractApiError(res.status, json, "Failed to initiate policy").message);
      }
      const createdId = json.data?.policy?.id;
      setModalOpen(false);
      if (createdId) {
        router.push(`/policies/${createdId}`);
      } else {
        void fetchDashboard();
      }
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const kpis = summary?.kpis || {
    total_policies: 0,
    under_review: 0,
    awaiting_approval: 0,
    overdue_reviews: 0,
    published_active: 0,
    open_feasibility_blockers: 0,
    open_implementation_tasks: 0,
    pending_attestations: 0,
  };
  const policies: CompliancePolicyRecord[] = summary?.policies || [];
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <WorkspaceShell
      section="Governance"
      title="Policy Workflow & Register"
      rightActions={
        <div className="flex items-center gap-2">
          <Link
            href="/chat?new=1"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Draft / Redline with AI</span>
          </Link>
          <button
            type="button"
            onClick={() => void openInitiateModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 text-white text-[12.5px] font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Initiate Policy</span>
          </button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Primary 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Total Policies</span>
              <FileText className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-950">
                {kpis.total_policies}
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                {kpis.published_active} published
              </span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Under Review</span>
              <Users className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-950">
                {kpis.under_review}
              </span>
              <span className="text-xs text-zinc-500">
                {kpis.open_feasibility_blockers} open blocker
                {kpis.open_feasibility_blockers === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Awaiting Approval</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-950">
                {kpis.awaiting_approval}
              </span>
              <span className="text-xs text-zinc-500">CCO / Committee / Board</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Overdue Reviews</span>
              <AlertTriangle
                className={`h-4 w-4 ${kpis.overdue_reviews > 0 ? "text-rose-600" : "text-zinc-400"}`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl font-semibold tracking-tight ${
                  kpis.overdue_reviews > 0 ? "text-rose-600" : "text-zinc-950"
                }`}
              >
                {kpis.overdue_reviews}
              </span>
              <span className="text-xs text-zinc-500">
                {kpis.open_implementation_tasks} open task
                {kpis.open_implementation_tasks === 1 ? "" : "s"} · {kpis.pending_attestations}{" "}
                pending attest.
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by policy ref, title, or department..."
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-zinc-200 rounded-md text-zinc-700"
            >
              <option value="">All Lifecycle Stages</option>
              {POLICY_LIFECYCLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_BADGE_MAP[s].label}
                </option>
              ))}
            </select>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-zinc-200 rounded-md text-zinc-700"
            >
              <option value="">All Domains</option>
              {POLICY_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {POLICY_DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer select-none px-2">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Overdue only</span>
            </label>
          </div>
        </div>

        {/* Policy Workflow Queue Table */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Policy Workflow Queue</h2>
              <p className="text-xs text-zinc-500">
                End-to-end governed lifecycle from Initiation &amp; Clean Compilation to Three-Lines
                Review, Statutory QA, Delegated Approval, Publication, and Operational Controls.
              </p>
            </div>
          </div>

          {error && (
            <div className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading Policy Register...</span>
            </div>
          ) : policies.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3">
              <div className="mx-auto h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                <FileCheck2 className="h-5 w-5 text-zinc-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900">
                  No policies in the register yet
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Initiate a new compliance policy or promote an AI-generated Policy Gap Redline
                  from Studio to compile clean policy versions, route Three-Lines reviews, and
                  enforce statutory QA &amp; Board approvals.
                </p>
              </div>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void openInitiateModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Initiate Policy</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    <th className="py-2.5 px-4">Policy Ref &amp; Title</th>
                    <th className="py-2.5 px-4">Domain</th>
                    <th className="py-2.5 px-4">Owner / Dept</th>
                    <th className="py-2.5 px-4">Delegated Authority</th>
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4">Next Review</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-[13px]">
                  {policies.map((pol) => {
                    const badge = STATUS_BADGE_MAP[pol.status] || STATUS_BADGE_MAP.DRAFTING;
                    const overdue =
                      pol.next_review_date &&
                      pol.next_review_date < todayIso &&
                      pol.status !== "RETIRED" &&
                      pol.status !== "SUPERSEDED";
                    return (
                      <tr
                        key={pol.id}
                        className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                        onClick={() => router.push(`/policies/${pol.id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] text-zinc-500">
                            {pol.policy_ref_no}
                          </div>
                          <div className="font-medium text-zinc-950">{pol.title}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-600">
                          {POLICY_DOMAIN_LABELS[pol.domain] || pol.domain}
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-700">
                          <div className="font-medium">{pol.owner_department}</div>
                          <div className="text-zinc-400 text-[11px]">
                            {pol.owner_name || pol.owner_user_id.slice(0, 14)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {TIER_SHORT_LABEL[pol.approval_tier]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {pol.next_review_date ? (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                overdue ? "text-rose-600 font-semibold" : "text-zinc-600"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {pol.next_review_date}
                            </span>
                          ) : (
                            <span className="text-zinc-400">Pending approval</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/policies/${pol.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Initiate Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  Initiate Compliance Policy Workflow
                </h3>
                <p className="text-xs text-zinc-500">
                  Register a new policy or import a Policy Redline / Draft directly from Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-5 space-y-4">
              {createError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {createError}
                </div>
              )}

              {workProducts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Import from Studio Work Product (Optional)
                  </label>
                  <select
                    value={formWorkProductId}
                    onChange={(e) => {
                      const wpId = e.target.value;
                      setFormWorkProductId(wpId);
                      const chosen = workProducts.find((w) => w.id === wpId);
                      if (chosen && !formTitle.trim()) {
                        setFormTitle(chosen.title);
                      }
                    }}
                    className="w-full h-9 px-3 text-xs bg-zinc-50 border border-zinc-200 rounded-md"
                  >
                    <option value="">— Start fresh / paste policy draft —</option>
                    {workProducts.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        [{wp.workflow_type === "POLICY_DRAFT_NEW" ? "Draft" : "Redline"}] {wp.title}{" "}
                        (v{wp.version_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Policy Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Know Your Customer (KYC) & AML/CFT/CPF Policy"
                  className="w-full h-9 px-3 text-xs border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Regulatory Domain
                  </label>
                  <select
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value as PolicyDomain)}
                    className="w-full h-9 px-2.5 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    {POLICY_DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {POLICY_DOMAIN_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Policy Owner Department
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="Compliance"
                    className="w-full h-9 px-3 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Delegated Approval Tier (DoA)
                  </label>
                  <select
                    value={formApprovalTier}
                    onChange={(e) => setFormApprovalTier(e.target.value as PolicyApprovalTier)}
                    className="w-full h-9 px-2.5 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    {POLICY_APPROVAL_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {POLICY_APPROVAL_TIER_LABELS[tier]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Review Cycle (Months)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formReviewMonths}
                    onChange={(e) => setFormReviewMonths(Number(e.target.value) || 12)}
                    className="w-full h-9 px-3 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Trigger Source
                  </label>
                  <select
                    value={formTriggerSource}
                    onChange={(e) =>
                      setFormTriggerSource(e.target.value as typeof formTriggerSource)
                    }
                    className="w-full h-9 px-2.5 text-xs border border-zinc-200 rounded-md bg-white"
                  >
                    <option value="REGULATORY_CHANGE">Regulatory Circular / Change</option>
                    <option value="AUDIT_FINDING">Audit Finding</option>
                    <option value="NEW_PRODUCT">New Product / Service Launch</option>
                    <option value="PERIODIC_REVIEW">Periodic Review Cycle</option>
                    <option value="INCIDENT">Compliance Incident</option>
                    <option value="MANUAL">Manual Governance Initiation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Trigger Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTriggerRef}
                    onChange={(e) => setFormTriggerRef(e.target.value)}
                    placeholder="e.g., REG-2026-014 / CBN Circular"
                    className="w-full h-9 px-3 text-xs border border-zinc-200 rounded-md"
                  />
                </div>
              </div>

              {!formWorkProductId && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Initial Policy or Redline Markdown (Optional)
                  </label>
                  <textarea
                    rows={5}
                    value={formMarkdown}
                    onChange={(e) => setFormMarkdown(e.target.value)}
                    placeholder="Paste existing policy text or a 6-part Policy Gap Redline package to auto-extract clauses, statutory clocks, and P0-P3 remediation tasks..."
                    className="w-full p-2.5 text-xs font-mono border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-400"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Initiate Workflow</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
