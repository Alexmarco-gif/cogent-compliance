"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Globe,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import {
  EXPANSION_OPERATING_MODELS,
  EXPANSION_OPERATING_MODEL_LABELS,
  EXPANSION_PRODUCT_SCOPES,
  EXPANSION_PRODUCT_SCOPE_LABELS,
  EXPANSION_PROGRAM_STATUSES,
  EXPANSION_STAGES,
  EXPANSION_STAGE_META,
  type ExpansionDashboardSummary,
  type ExpansionOperatingModel,
  type ExpansionProductScope,
  type ExpansionProgramStatus,
  type ExpansionStage,
} from "@/contracts/expansion.contracts";
import type { WorkProductRecord } from "@/contracts/work-product.contracts";
import { extractApiError } from "@/lib/api-client";

const STATUS_BADGE_MAP: Record<ExpansionProgramStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active Build", className: "bg-blue-50 text-blue-700 border-blue-200" },
  ON_HOLD: { label: "On Hold", className: "bg-amber-50 text-amber-800 border-amber-200" },
  GO_LIVE_PENDING: {
    label: "Go-Live Gate Pending",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  LIVE: { label: "Live Operations", className: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  SUSPENDED: { label: "Suspended", className: "bg-red-50 text-red-700 border-red-200" },
  ARCHIVED: { label: "Archived", className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

const ANCHOR_CORRIDORS = [
  { code: "GH", name: "Ghana", regulator: "Bank of Ghana (BoG) · Act 987 & Act 1044" },
  { code: "KE", name: "Kenya", regulator: "Central Bank of Kenya (CBK) · NPS Act & POCAMLA" },
  { code: "ZA", name: "South Africa", regulator: "SARB / FSCA / FIC / POPIA" },
  { code: "RW", name: "Rwanda", regulator: "National Bank of Rwanda (BNR)" },
  { code: "SN", name: "Senegal (WAEMU)", regulator: "BCEAO / UEMOA" },
  { code: "GB", name: "United Kingdom", regulator: "FCA / PSR / UK GDPR" },
  { code: "AE", name: "United Arab Emirates", regulator: "CBUAE / DFSA / ADGM" },
  { code: "US", name: "United States", regulator: "FinCEN / CFPB / State MTL" },
];

export function ExpansionDashboardClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<ExpansionDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("");

  // Initiate Expansion Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [workProducts, setWorkProducts] = useState<WorkProductRecord[]>([]);

  const [formHomeJurisdiction, setFormHomeJurisdiction] = useState("NG");
  const [formTargetJurisdiction, setFormTargetJurisdiction] = useState("GH");
  const [formCustomCountry, setFormCustomCountry] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formProductScope, setFormProductScope] = useState<ExpansionProductScope>("PAYMENTS");
  const [formOperatingModel, setFormOperatingModel] =
    useState<ExpansionOperatingModel>("DIRECT_LICENSE");
  const [formRationale, setFormRationale] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formWorkProductId, setFormWorkProductId] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (stageFilter) params.set("stage", stageFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/marketing-shield/v1/expansions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(
          extractApiError(res.status, json, "Failed to load Cross-Border Expansion OS").message,
        );
      }
      setSummary(json.data as ExpansionDashboardSummary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, stageFilter, searchQuery]);

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
        const cbWps = (json.data.items as WorkProductRecord[]).filter(
          (w) => w.workflow_type === "CROSS_BORDER_COMPARISON",
        );
        setWorkProducts(cbWps);
      }
    } catch {
      // Non-fatal
    }
  };

  const handleCreateExpansion = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCode =
      formTargetJurisdiction === "CUSTOM"
        ? formCustomCountry.trim()
        : formTargetJurisdiction;
    if (!targetCode) {
      setCreateError("Please select or enter a target expansion country.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/expansions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim() || undefined,
          home_jurisdiction: formHomeJurisdiction,
          target_jurisdiction: targetCode,
          product_scope: formProductScope,
          operating_model: formOperatingModel,
          operating_model_rationale: formRationale.trim() || undefined,
          target_launch_date: formTargetDate || null,
          source_work_product_id: formWorkProductId || null,
          auto_populate_blueprint: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(
          extractApiError(res.status, json, "Failed to initiate expansion program").message,
        );
      }
      const createdId = json.data?.program?.id;
      setModalOpen(false);
      if (createdId) {
        router.push(`/expansions/${createdId}`);
      } else {
        await fetchDashboard();
      }
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const getStageLabel = (stage: ExpansionStage) =>
    EXPANSION_STAGE_META.find((m) => m.stage === stage)?.shortLabel || stage;

  return (
    <WorkspaceShell title="Cross-Border Expansion OS">
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Globe className="h-3.5 w-3.5 text-zinc-700" />
                <span>Cross-Border Compliance Operating System · Stages 1–8</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
                Multi-Country Expansion & Market Operations
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Manage market-entry obligations, licensing, Group → Local policy localisation, country risk appetite, pre-launch validation gates, and post-launch regulatory reporting.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
                <span>Research New Corridor in Copilot</span>
              </Link>
              <button
                type="button"
                onClick={openInitiateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Initiate Country Expansion</span>
              </button>
            </div>
          </div>

          {/* 8-Stage Lifecycle Architecture Banner */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                8-Stage Controlled Cross-Border Compliance Lifecycle
              </span>
              <span className="text-xs text-zinc-500">
                Global Group Framework → Local Country Implementation
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {EXPANSION_STAGE_META.map((s) => (
                <div
                  key={s.stage}
                  className="rounded-lg border border-zinc-150 bg-zinc-50/70 p-2.5 text-left"
                >
                  <div className="text-[11px] font-semibold text-zinc-900">{s.shortLabel}</div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                    {s.deliverable}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-500">Total Corridors</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">
                {summary?.kpis.total_programs ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">Tracked jurisdictions</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-500">Active Builds</div>
              <div className="mt-1 text-2xl font-semibold text-blue-700">
                {summary?.kpis.active_expansions ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">Stages 1–6 in progress</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-500">Live Markets</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">
                {summary?.kpis.live_markets ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">CCO Go-Live approved</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-500">Critical Gaps</div>
              <div className="mt-1 text-2xl font-semibold text-amber-700">
                {summary?.kpis.critical_blockers ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">Mandatory obligations</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-500">Open Reg Changes</div>
              <div className="mt-1 text-2xl font-semibold text-purple-700">
                {summary?.kpis.open_regulatory_changes ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">Stage 8 Ripple alerts</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-500">Overdue Filings</div>
              <div className="mt-1 text-2xl font-semibold text-red-600">
                {summary?.kpis.overdue_filings ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">Stage 7 reporting calendar</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, reference code (EXP-NG-GH-001), or corridor..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none"
            >
              <option value="">All Lifecycle Stages (1–8)</option>
              {EXPANSION_STAGES.map((st) => (
                <option key={st} value={st}>
                  {getStageLabel(st)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none"
            >
              <option value="">All Program Statuses</option>
              {EXPANSION_PROGRAM_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_BADGE_MAP[st].label}
                </option>
              ))}
            </select>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Program List */}
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-16">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              <span className="ml-2 text-xs text-zinc-500">
                Loading Cross-Border Expansion programs...
              </span>
            </div>
          ) : !summary || summary.programs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
              <Globe className="mx-auto h-9 w-9 text-zinc-400" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                No Cross-Border Expansion Programs Initiated Yet
              </h3>
              <p className="mx-auto mt-1 max-w-lg text-xs text-zinc-500">
                Launch a structured 8-stage expansion programme (e.g., Nigeria → Ghana under Bank of Ghana Act 987, or Nigeria → Kenya under CBK NPS Regulations) pre-seeded with statutory obligations, 8 policy localisation pillars, risk registers, 10 cross-functional workstreams, and the 6-question CCO Go-Live Readiness Gate.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={openInitiateModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Initiate First Country Expansion (Ghana / Kenya / Global)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {summary.programs.map((prog) => {
                const statusBadge = STATUS_BADGE_MAP[prog.status];
                return (
                  <Link
                    key={prog.id}
                    href={`/expansions/${prog.id}`}
                    className="group block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800">
                            {prog.program_ref_no}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700">
                            Stage: {getStageLabel(prog.current_stage)}
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] text-zinc-600">
                            {EXPANSION_OPERATING_MODEL_LABELS[prog.operating_model]}
                          </span>
                        </div>

                        <h2 className="text-base font-semibold text-zinc-900 group-hover:text-zinc-700">
                          {prog.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span>
                            Corridor:{" "}
                            <strong className="text-zinc-800">
                              {prog.home_jurisdiction} → {prog.target_country_name} (
                              {prog.target_jurisdiction})
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Product:{" "}
                            <strong className="text-zinc-700">
                              {EXPANSION_PRODUCT_SCOPE_LABELS[prog.product_scope]}
                            </strong>
                          </span>
                          {prog.primary_regulators?.length > 0 && (
                            <>
                              <span>·</span>
                              <span>Regulators: {prog.primary_regulators.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Readiness Score & Quick Metrics */}
                      <div className="flex items-center gap-4 sm:text-right">
                        <div>
                          <div className="text-[11px] font-medium text-zinc-500">
                            CCO Go-Live Readiness
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 sm:justify-end">
                            {prog.readiness_score >= 85 ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ShieldAlert className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="text-lg font-bold text-zinc-900">
                              {prog.readiness_score}%
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700" />
                      </div>
                    </div>

                    {/* Progress Pills across Stages */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs sm:grid-cols-4">
                      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                        <span className="text-zinc-500">Obligations Mapped</span>
                        <span className="font-semibold text-zinc-800">
                          {prog.obligations_count}
                          {prog.critical_gaps_count > 0 && (
                            <span className="ml-1 text-red-600">
                              ({prog.critical_gaps_count} gap)
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                        <span className="text-zinc-500">Policies Localised</span>
                        <span className="font-semibold text-zinc-800">
                          {prog.localised_policies_count}/{prog.total_localisations_count || 8}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                        <span className="text-zinc-500">Pre-Launch Tests</span>
                        <span className="font-semibold text-zinc-800">
                          {prog.passed_tests_count}/{prog.total_tests_count || 7} Passed
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                        <span className="text-zinc-500">Open Reg Changes</span>
                        <span className="font-semibold text-zinc-800">
                          {prog.open_changes_count}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Initiate Country Expansion Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Initiate Cross-Border Country Expansion Program
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Seeds all 8 operational stages, regulatory obligations, 8 policy localisation pillars, risk register, 10 workstreams, 7 validation tests, and 13 core compliance artefacts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpansion} className="mt-4 space-y-4">
              {createError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Home Market (Group Framework)
                  </label>
                  <select
                    value={formHomeJurisdiction}
                    onChange={(e) => setFormHomeJurisdiction(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
                  >
                    <option value="NG">Nigeria (CBN / NDPC / FCCPC / NFIU)</option>
                    <option value="KE">Kenya (CBK / ODPC / FRC)</option>
                    <option value="GH">Ghana (BoG / DPC / FIC)</option>
                    <option value="ZA">South Africa (SARB / FSCA / FIC)</option>
                    <option value="GB">United Kingdom (FCA / PSR / ICO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Target Expansion Jurisdiction
                  </label>
                  <select
                    value={formTargetJurisdiction}
                    onChange={(e) => setFormTargetJurisdiction(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
                  >
                    {ANCHOR_CORRIDORS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code}) — {c.regulator}
                      </option>
                    ))}
                    <option value="CUSTOM">Other Global Jurisdiction (Enter Country / Code)</option>
                  </select>
                </div>
              </div>

              {formTargetJurisdiction === "CUSTOM" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Custom Target Country Name or ISO Code
                  </label>
                  <input
                    type="text"
                    value={formCustomCountry}
                    onChange={(e) => setFormCustomCountry(e.target.value)}
                    placeholder="e.g., Tanzania, Egypt, Singapore, Canada, Brazil..."
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Regulated Product Scope
                  </label>
                  <select
                    value={formProductScope}
                    onChange={(e) => setFormProductScope(e.target.value as ExpansionProductScope)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
                  >
                    {EXPANSION_PRODUCT_SCOPES.map((sc) => (
                      <option key={sc} value={sc}>
                        {EXPANSION_PRODUCT_SCOPE_LABELS[sc]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Stage 2 Operating Model Structure
                  </label>
                  <select
                    value={formOperatingModel}
                    onChange={(e) =>
                      setFormOperatingModel(e.target.value as ExpansionOperatingModel)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
                  >
                    {EXPANSION_OPERATING_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {EXPANSION_OPERATING_MODEL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Program Title (Optional — auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Nigeria → Ghana Cross-Border Remittance & PSP Expansion"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Operating Model Rationale / Licensing Strategy
                </label>
                <textarea
                  rows={2}
                  value={formRationale}
                  onChange={(e) => setFormRationale(e.target.value)}
                  placeholder="e.g., Phase 1 launch via licensed Ghanaian partner bank while BoG Enhanced PSP licence application is under review..."
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Target Go-Live Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Link Copilot Cross-Border Matrix (Optional)
                  </label>
                  <select
                    value={formWorkProductId}
                    onChange={(e) => setFormWorkProductId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
                  >
                    <option value="">None — Use Statutory Jurisdiction Blueprint</option>
                    {workProducts.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {wp.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning 8-Stage Blueprint...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Initiate Expansion Program</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
