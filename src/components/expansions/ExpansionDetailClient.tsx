"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe,
  Layers,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import {
  ARTEFACT_STATUSES,
  COUNTRY_GOVERNANCE_ROLES,
  COUNTRY_GOVERNANCE_ROLE_LABELS,
  EXPANSION_OPERATING_MODELS,
  EXPANSION_OPERATING_MODEL_LABELS,
  EXPANSION_PROGRAM_STATUSES,
  EXPANSION_RISK_CATEGORIES,
  EXPANSION_STAGES,
  EXPANSION_STAGE_META,
  FIT_PROPER_STATUSES,
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  LICENSING_STATUSES,
  LOCALISATION_STATUSES,
  OBLIGATION_GAP_STATUSES,
  OBLIGATION_STAGE_CATEGORIES,
  REG_CHANGE_STATUSES,
  REPORTING_FREQUENCIES,
  REPORTING_STATUSES,
  RISK_APPETITE_DECISIONS,
  RISK_STATUSES,
  VALIDATION_TEST_STATUSES,
  WORKSTREAM_PRIORITIES,
  WORKSTREAM_STATUSES,
  WORKSTREAM_TEAMS,
  WORKSTREAM_TEAM_LABELS,
  type ArtefactStatus,
  type CountryGovernanceRole,
  type ExpansionDetailBundle,
  type ExpansionOperatingModel,
  type ExpansionProgramStatus,
  type ExpansionRiskCategory,
  type ExpansionStage,
  type FitProperStatus,
  type GoLiveDecision,
  type IncidentCategory,
  type IncidentStatus,
  type LicensingStatus,
  type LocalisationStatus,
  type ObligationGapStatus,
  type ObligationStageCategory,
  type RegChangeStatus,
  type ReportingFrequency,
  type ReportingStatus,
  type RiskAppetiteDecision,
  type RiskStatus,
  type ValidationTestStatus,
  type WorkstreamPriority,
  type WorkstreamStatus,
  type WorkstreamTeam,
} from "@/contracts/expansion.contracts";
import { extractApiError } from "@/lib/api-client";

type WorkspaceTab =
  | "READINESS_OVERVIEW"
  | "STAGE_1_2_OBLIGATIONS"
  | "STAGE_3_LOCALISATION"
  | "STAGE_4_RISKS"
  | "STAGE_5_WORKSTREAMS"
  | "STAGE_6_VALIDATION_GATE"
  | "STAGE_7_8_LIVE_OPS"
  | "GOVERNANCE_ARTEFACTS";

export function ExpansionDetailClient({ expansionId }: { expansionId: string }) {
  const [bundle, setBundle] = useState<ExpansionDetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("READINESS_OVERVIEW");
  const [dossierMarkdown, setDossierMarkdown] = useState<string | null>(null);

  // Add Obligation quick form
  const [oblTitle, setOblTitle] = useState("");
  const [oblRegulator, setOblRegulator] = useState("");
  const [oblStatute, setOblStatute] = useState("");
  const [oblCategory, setOblCategory] = useState<ObligationStageCategory>("LICENSING");
  const [oblSummary, setOblSummary] = useState("");

  // Add Risk quick form
  const [riskTitle, setRiskTitle] = useState("");
  const [riskCategory, setRiskCategory] = useState<ExpansionRiskCategory>("MONEY_LAUNDERING");
  const [riskDesc, setRiskDesc] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetiteDecision>("MITIGATE");

  // Add Workstream quick form
  const [wsTitle, setWsTitle] = useState("");
  const [wsTeam, setWsTeam] = useState<WorkstreamTeam>("ENGINEERING");
  const [wsPriority, setWsPriority] = useState<WorkstreamPriority>("P1");
  const [wsDesc, setWsDesc] = useState("");
  const [wsEvidence, setWsEvidence] = useState("");

  // Stage 6 Go-Live Decision form
  const [gateDecision, setGateDecision] = useState<GoLiveDecision>("APPROVED_FOR_LAUNCH");
  const [gateNotes, setGateNotes] = useState("");

  // Stage 7/8 & Governance quick forms
  const [roleType, setRoleType] = useState<CountryGovernanceRole>("COUNTRY_COMPLIANCE_OFFICER");
  const [roleAssignee, setRoleAssignee] = useState("");
  const [roleEntity, setRoleEntity] = useState("");

  const [incTitle, setIncTitle] = useState("");
  const [incCategory, setIncCategory] = useState<IncidentCategory>("COMPLIANCE_BREACH");
  const [incDesc, setIncDesc] = useState("");

  const [chgRegulator, setChgRegulator] = useState("");
  const [chgTitle, setChgTitle] = useState("");
  const [chgSummary, setChgSummary] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/expansions/${expansionId}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(
          extractApiError(res.status, json, "Failed to load expansion programme").message,
        );
      }
      setBundle(json.data as ExpansionDetailBundle);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [expansionId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const mutateApi = async (
    key: string,
    url: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
  ) => {
    setBusyKey(key);
    setActionError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(extractApiError(res.status, json, "Operation failed").message);
      }
      setBundle(json.data as ExpansionDetailBundle);
      if (json.data?.generated_dossier_markdown) {
        setDossierMarkdown(json.data.generated_dossier_markdown as string);
      }
      return true;
    } catch (err) {
      setActionError((err as Error).message);
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <WorkspaceShell title="Cross-Border Expansion Control Plane">
        <div className="flex flex-1 items-center justify-center bg-[#FAFAFA]">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          <span className="ml-2 text-xs text-zinc-500">
            Loading 8-Stage Cross-Border Expansion Control Plane...
          </span>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !bundle) {
    return (
      <WorkspaceShell title="Cross-Border Expansion Control Plane">
        <div className="flex-1 bg-[#FAFAFA] p-8">
          <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-xs text-red-700">
            <p className="font-semibold">Unable to load Cross-Border Expansion Program</p>
            <p className="mt-1">{error || "Not found"}</p>
            <Link
              href="/expansions"
              className="mt-4 inline-flex items-center gap-1 font-medium underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Expansions Dashboard</span>
            </Link>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  const {
    program,
    readiness,
    country_roles,
    obligations,
    policy_localisations,
    risks,
    workstreams,
    validation_tests,
    go_live_gates,
    reporting_calendar,
    incidents,
    regulatory_changes,
    artefacts,
  } = bundle;

  return (
    <WorkspaceShell title={program.title}>
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Top Breadcrumb & Program Header */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/expansions"
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>All Corridors</span>
                  </Link>
                  <span className="text-zinc-300">/</span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800">
                    {program.program_ref_no}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                    {program.home_jurisdiction} → {program.target_country_name} (
                    {program.target_jurisdiction})
                  </span>
                </div>

                <h1 className="text-xl font-semibold text-zinc-900">{program.title}</h1>
                <p className="text-xs text-zinc-500">
                  Primary Regulators:{" "}
                  <strong className="text-zinc-700">
                    {program.primary_regulators.join(" · ")}
                  </strong>
                </p>
              </div>

              {/* Controls: Stage Selector, Operating Model & Readiness Badge */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium uppercase text-zinc-400">
                    Operating Model
                  </label>
                  <select
                    value={program.operating_model}
                    onChange={(e) =>
                      void mutateApi(
                        "op_model",
                        `/api/marketing-shield/v1/expansions/${program.id}`,
                        "PATCH",
                        { operating_model: e.target.value as ExpansionOperatingModel },
                      )
                    }
                    className="mt-0.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800"
                  >
                    {EXPANSION_OPERATING_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {EXPANSION_OPERATING_MODEL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase text-zinc-400">
                    Active Lifecycle Stage
                  </label>
                  <select
                    value={program.current_stage}
                    onChange={(e) =>
                      void mutateApi(
                        "stage",
                        `/api/marketing-shield/v1/expansions/${program.id}`,
                        "PATCH",
                        { current_stage: e.target.value as ExpansionStage },
                      )
                    }
                    className="mt-0.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800"
                  >
                    {EXPANSION_STAGE_META.map((s) => (
                      <option key={s.stage} value={s.stage}>
                        {s.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase text-zinc-400">
                    Program Status
                  </label>
                  <select
                    value={program.status}
                    onChange={(e) =>
                      void mutateApi(
                        "status",
                        `/api/marketing-shield/v1/expansions/${program.id}`,
                        "PATCH",
                        { status: e.target.value as ExpansionProgramStatus },
                      )
                    }
                    className="mt-0.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800"
                  >
                    {EXPANSION_PROGRAM_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-right">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500">
                    Readiness Score
                  </div>
                  <div className="flex items-center gap-1.5">
                    {readiness.go_live_eligible ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-lg font-bold text-zinc-900">
                      {readiness.overall_score}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 8-Stage Progress Stepper */}
            <div className="mt-5 grid grid-cols-2 gap-1.5 border-t border-zinc-100 pt-4 sm:grid-cols-4 lg:grid-cols-8">
              {EXPANSION_STAGE_META.map((s) => {
                const isCurrent = program.current_stage === s.stage;
                return (
                  <button
                    key={s.stage}
                    type="button"
                    onClick={() =>
                      void mutateApi(
                        `stage_${s.stage}`,
                        `/api/marketing-shield/v1/expansions/${program.id}`,
                        "PATCH",
                        { current_stage: s.stage },
                      )
                    }
                    className={`rounded-lg border p-2 text-left transition ${
                      isCurrent
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-zinc-50/70 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{s.shortLabel}</div>
                    <div
                      className={`mt-0.5 line-clamp-1 text-[10px] ${
                        isCurrent ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {s.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {actionError && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-xs font-medium underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 pb-2">
            {[
              {
                id: "READINESS_OVERVIEW" as const,
                label: `6-Question CCO Gate (${readiness.questions.filter((q) => q.status === "PASS").length}/6)`,
              },
              {
                id: "STAGE_1_2_OBLIGATIONS" as const,
                label: `Stages 1–2: Obligations & Licensing (${obligations.length})`,
              },
              {
                id: "STAGE_3_LOCALISATION" as const,
                label: `Stage 3: Policy Localisation (${policy_localisations.length}/8)`,
              },
              {
                id: "STAGE_4_RISKS" as const,
                label: `Stage 4: Country Risk Register (${risks.length})`,
              },
              {
                id: "STAGE_5_WORKSTREAMS" as const,
                label: `Stage 5: Workstreams & Controls (${workstreams.length})`,
              },
              {
                id: "STAGE_6_VALIDATION_GATE" as const,
                label: `Stage 6: Validation & Go-Live Sign-Off (${validation_tests.filter((t) => t.status === "PASSED").length}/${validation_tests.length})`,
              },
              {
                id: "STAGE_7_8_LIVE_OPS" as const,
                label: `Stages 7–8: Reporting, Incidents & Reg Changes (${reporting_calendar.length + regulatory_changes.length})`,
              },
              {
                id: "GOVERNANCE_ARTEFACTS" as const,
                label: `Governance & 13 Artefacts (${readiness.artefacts_ready_count}/${artefacts.length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-white text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: 6-Question CCO Readiness Overview */}
          {activeTab === "READINESS_OVERVIEW" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">
                      Chief Compliance Officer Six-Question Go-Live Verification
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      If these 6 questions cannot be answered with documented evidence, the cross-border expansion is not compliance-ready.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("STAGE_6_VALIDATION_GATE")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span>Open Stage 6 Go-Live Gate</span>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {readiness.questions.map((q) => (
                    <div
                      key={q.key}
                      className={`rounded-xl border p-4 ${
                        q.status === "PASS"
                          ? "border-emerald-200 bg-emerald-50/40"
                          : q.status === "WARNING"
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-red-200 bg-red-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {q.status === "PASS" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : q.status === "WARNING" ? (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                          )}
                          <span className="text-xs font-semibold text-zinc-900">
                            Q{q.number}. {q.question}
                          </span>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            q.status === "PASS"
                              ? "bg-emerald-100 text-emerald-800"
                              : q.status === "WARNING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-700">{q.summary}</p>
                      {q.blockers.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-red-700">
                          {q.blockers.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Appetite & Prohibited Activities Box */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Country Risk Appetite Statement ({program.target_country_name})
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                    {program.risk_appetite_statement ||
                      "No country risk appetite statement documented yet."}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Prohibited Activities & Hard Perimeter Locks
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-zinc-700">
                    {(program.prohibited_activities || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Stages 1 & 2 — Regulatory Obligations & Licensing Register */}
          {activeTab === "STAGE_1_2_OBLIGATIONS" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Stage 1 & 2: Regulatory Obligations & Licensing Authorisation Register
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Track statutory requirements, licensing approvals, capital/escrow rules, fit-and-proper clearances, and gap status. Submitting a licence application does not authorise live operations until status is APPROVED.
                </p>

                <div className="mt-4 space-y-3">
                  {obligations.map((obl) => (
                    <div
                      key={obl.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800">
                              {obl.stage_category}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900">
                              {obl.regulator}
                            </span>
                            <span className="text-xs text-zinc-500">· {obl.statute_reference}</span>
                            {obl.source_url && (
                              <a
                                href={obl.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:underline"
                              >
                                <span>Primary Source</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-900">
                            {obl.obligation_title}
                          </h3>
                          <p className="text-xs text-zinc-600">{obl.obligation_summary}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-zinc-500">
                              Gap Status
                            </label>
                            <select
                              value={obl.gap_status}
                              disabled={busyKey === `obl_gap_${obl.id}`}
                              onChange={(e) =>
                                void mutateApi(
                                  `obl_gap_${obl.id}`,
                                  `/api/marketing-shield/v1/expansions/${program.id}/obligations`,
                                  "PATCH",
                                  {
                                    obligation_id: obl.id,
                                    gap_status: e.target.value as ObligationGapStatus,
                                  },
                                )
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                            >
                              {OBLIGATION_GAP_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-zinc-500">
                              Licensing / Approval Status
                            </label>
                            <select
                              value={obl.licensing_status}
                              disabled={busyKey === `obl_lic_${obl.id}`}
                              onChange={(e) =>
                                void mutateApi(
                                  `obl_lic_${obl.id}`,
                                  `/api/marketing-shield/v1/expansions/${program.id}/obligations`,
                                  "PATCH",
                                  {
                                    obligation_id: obl.id,
                                    licensing_status: e.target.value as LicensingStatus,
                                  },
                                )
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                            >
                              {LICENSING_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Obligation Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!oblTitle.trim() || !oblRegulator.trim()) return;
                    const ok = await mutateApi(
                      "add_obl",
                      `/api/marketing-shield/v1/expansions/${program.id}/obligations`,
                      "POST",
                      {
                        stage_category: oblCategory,
                        regulator: oblRegulator.trim(),
                        statute_reference: oblStatute.trim() || "Statutory Provision",
                        obligation_title: oblTitle.trim(),
                        obligation_summary: oblSummary.trim() || oblTitle.trim(),
                        gap_status: "PARTIAL_GAP",
                        licensing_status:
                          oblCategory === "LICENSING" ? "IN_PREPARATION" : "NOT_REQUIRED",
                      },
                    );
                    if (ok) {
                      setOblTitle("");
                      setOblSummary("");
                    }
                  }}
                  className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="text-xs font-semibold text-zinc-800">
                    Add Custom Regulatory or Licensing Obligation
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                    <select
                      value={oblCategory}
                      onChange={(e) =>
                        setOblCategory(e.target.value as ObligationStageCategory)
                      }
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {OBLIGATION_STAGE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={oblRegulator}
                      onChange={(e) => setOblRegulator(e.target.value)}
                      placeholder="Regulator (e.g., Bank of Ghana)"
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={oblStatute}
                      onChange={(e) => setOblStatute(e.target.value)}
                      placeholder="Statute / Circular Ref (e.g., Act 987 § 12)"
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={oblTitle}
                      onChange={(e) => setOblTitle(e.target.value)}
                      placeholder="Obligation Title"
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={oblSummary}
                      onChange={(e) => setOblSummary(e.target.value)}
                      placeholder="Detailed statutory obligation & completion requirement..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={busyKey === "add_obl"}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Obligation</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: Stage 3 — Group → Local Policy Framework Localisation */}
          {activeTab === "STAGE_3_LOCALISATION" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">
                      Stage 3: Group → Local Policy Framework Localisation Matrix
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      A fintech cannot copy its {program.home_jurisdiction} policies unchanged into {program.target_country_name}. Spawn country-localised policies directly into Cogent’s Policy Workflow OS.
                    </p>
                  </div>
                  <Link
                    href="/policies"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>Open Policy Workflow OS</span>
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {policy_localisations.map((loc) => (
                    <div
                      key={loc.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                              {loc.compliance_area}
                            </span>
                            <h3 className="text-sm font-semibold text-zinc-900">
                              {loc.area_title}
                            </h3>
                          </div>
                          <p className="text-xs text-zinc-700">
                            <strong>Local {program.target_country_name} Standard:</strong>{" "}
                            {loc.local_requirements_summary}
                          </p>
                          {loc.gap_summary && (
                            <p className="text-xs text-amber-800">
                              <strong>Group → Local Gap:</strong> {loc.gap_summary}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={loc.localisation_status}
                            disabled={busyKey === `loc_status_${loc.id}`}
                            onChange={(e) =>
                              void mutateApi(
                                `loc_status_${loc.id}`,
                                `/api/marketing-shield/v1/expansions/${program.id}/localisations`,
                                "POST",
                                {
                                  action: "UPDATE_LOCALISATION",
                                  localisation_id: loc.id,
                                  localisation_status: e.target.value as LocalisationStatus,
                                },
                              )
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800"
                          >
                            {LOCALISATION_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>

                          {loc.local_policy_id ? (
                            <Link
                              href={`/policies/${loc.local_policy_id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              <span>Open Local Policy in Policy OS</span>
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={busyKey === `spawn_pol_${loc.id}`}
                              onClick={() =>
                                void mutateApi(
                                  `spawn_pol_${loc.id}`,
                                  `/api/marketing-shield/v1/expansions/${program.id}/localisations`,
                                  "POST",
                                  {
                                    action: "SPAWN_LOCAL_POLICY",
                                    localisation_id: loc.id,
                                    approval_tier: "TIER_2_COMMITTEE",
                                  },
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                              {busyKey === `spawn_pol_${loc.id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                              <span>Spawn Local Policy in Policy OS</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Stage 4 — Country-Specific & Enterprise Risk Assessment */}
          {activeTab === "STAGE_4_RISKS" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Stage 4: Country AML/CFT & Market-Entry Risk Register
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Evaluate inherent vs. residual risk across ML/TF, sanctions, fraud, regulatory licensing, data transfer, third-party partners, and FX controls.
                </p>

                <div className="mt-4 space-y-3">
                  {risks.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800">
                              {r.risk_category}
                            </span>
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Inherent: {r.inherent_rating} ({r.inherent_likelihood}×
                              {r.inherent_impact})
                            </span>
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Residual: {r.residual_rating} ({r.residual_likelihood}×
                              {r.residual_impact})
                            </span>
                            <span className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                              Appetite: {r.appetite_decision}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-900">{r.risk_title}</h3>
                          <p className="text-xs text-zinc-600">{r.risk_description}</p>
                          <p className="text-xs text-zinc-800">
                            <strong>Mitigation Control Plan:</strong> {r.mitigation_plan}
                          </p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-zinc-500">
                            Risk Treatment Status
                          </label>
                          <select
                            value={r.status}
                            onChange={(e) =>
                              void mutateApi(
                                `risk_${r.id}`,
                                `/api/marketing-shield/v1/expansions/${program.id}/risks`,
                                "PATCH",
                                {
                                  risk_id: r.id,
                                  status: e.target.value as RiskStatus,
                                },
                              )
                            }
                            className="mt-0.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                          >
                            {RISK_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Country Risk Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!riskTitle.trim() || !riskMitigation.trim()) return;
                    const ok = await mutateApi(
                      "add_risk",
                      `/api/marketing-shield/v1/expansions/${program.id}/risks`,
                      "POST",
                      {
                        risk_category: riskCategory,
                        risk_title: riskTitle.trim(),
                        risk_description: riskDesc.trim() || riskTitle.trim(),
                        appetite_decision: riskAppetite,
                        mitigation_plan: riskMitigation.trim(),
                      },
                    );
                    if (ok) {
                      setRiskTitle("");
                      setRiskDesc("");
                      setRiskMitigation("");
                    }
                  }}
                  className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="text-xs font-semibold text-zinc-800">
                    Log Country-Specific Risk & Treatment Plan
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <select
                      value={riskCategory}
                      onChange={(e) =>
                        setRiskCategory(e.target.value as ExpansionRiskCategory)
                      }
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {EXPANSION_RISK_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      value={riskAppetite}
                      onChange={(e) =>
                        setRiskAppetite(e.target.value as RiskAppetiteDecision)
                      }
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {RISK_APPETITE_DECISIONS.map((d) => (
                        <option key={d} value={d}>
                          Appetite: {d}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={riskTitle}
                      onChange={(e) => setRiskTitle(e.target.value)}
                      placeholder="Risk Title"
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={riskDesc}
                      onChange={(e) => setRiskDesc(e.target.value)}
                      placeholder="Risk scenario description..."
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={riskMitigation}
                        onChange={(e) => setRiskMitigation(e.target.value)}
                        placeholder="Mandatory mitigation & control plan..."
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={busyKey === "add_risk"}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Risk</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: Stage 5 — Cross-Functional Operational Workstreams & Controls */}
          {activeTab === "STAGE_5_WORKSTREAMS" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Stage 5: Cross-Functional Operational Workstreams & Control Implementation
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Orchestrate workstreams across Regulatory Affairs, Legal, AML Compliance, Risk, Procurement, Engineering, HR, and Operations with verified completion evidence.
                </p>

                <div className="mt-4 space-y-3">
                  {workstreams.map((ws) => (
                    <div
                      key={ws.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                              {ws.workstream_code}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                ws.priority === "P0"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {ws.priority}
                            </span>
                            <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                              Team: {WORKSTREAM_TEAM_LABELS[ws.responsible_team]}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-900">{ws.title}</h3>
                          <p className="text-xs text-zinc-600">{ws.description}</p>
                          {ws.control_specification && (
                            <p className="text-xs text-zinc-800">
                              <strong>Control Specification:</strong> {ws.control_specification}
                            </p>
                          )}
                          <p className="text-[11px] text-zinc-500">
                            Expected Evidence: <strong>{ws.expected_evidence}</strong>
                            {ws.completion_evidence_ref && (
                              <span className="ml-2 text-emerald-700">
                                · Logged Evidence: {ws.completion_evidence_ref}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            defaultValue={ws.completion_evidence_ref || ""}
                            placeholder="Evidence link / ref..."
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (ws.completion_evidence_ref || "")) {
                                void mutateApi(
                                  `ws_ev_${ws.id}`,
                                  `/api/marketing-shield/v1/expansions/${program.id}/workstreams`,
                                  "PATCH",
                                  {
                                    workstream_id: ws.id,
                                    completion_evidence_ref: val || null,
                                  },
                                );
                              }
                            }}
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs"
                          />
                          <select
                            value={ws.status}
                            onChange={(e) =>
                              void mutateApi(
                                `ws_st_${ws.id}`,
                                `/api/marketing-shield/v1/expansions/${program.id}/workstreams`,
                                "PATCH",
                                {
                                  workstream_id: ws.id,
                                  status: e.target.value as WorkstreamStatus,
                                },
                              )
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                          >
                            {WORKSTREAM_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Workstream Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!wsTitle.trim() || !wsEvidence.trim()) return;
                    const ok = await mutateApi(
                      "add_ws",
                      `/api/marketing-shield/v1/expansions/${program.id}/workstreams`,
                      "POST",
                      {
                        title: wsTitle.trim(),
                        description: wsDesc.trim() || wsTitle.trim(),
                        responsible_team: wsTeam,
                        priority: wsPriority,
                        expected_evidence: wsEvidence.trim(),
                      },
                    );
                    if (ok) {
                      setWsTitle("");
                      setWsDesc("");
                      setWsEvidence("");
                    }
                  }}
                  className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="text-xs font-semibold text-zinc-800">
                    Assign New Cross-Functional Workstream
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                    <select
                      value={wsTeam}
                      onChange={(e) => setWsTeam(e.target.value as WorkstreamTeam)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {WORKSTREAM_TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {WORKSTREAM_TEAM_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={wsPriority}
                      onChange={(e) => setWsPriority(e.target.value as WorkstreamPriority)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {WORKSTREAM_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          Priority: {p}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={wsTitle}
                      onChange={(e) => setWsTitle(e.target.value)}
                      placeholder="Workstream Title"
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={wsEvidence}
                      onChange={(e) => setWsEvidence(e.target.value)}
                      placeholder="Expected Completion Evidence"
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                      placeholder="Workstream scope & control specification..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={busyKey === "add_ws"}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assign Workstream</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: Stage 6 — Pre-Launch Validation Tests & Formal CCO Go-Live Gate */}
          {activeTab === "STAGE_6_VALIDATION_GATE" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Stage 6: Pre-Launch Compliance Control Validation Matrix
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Verify that KYC identity rejection, synchronous sanctions blocking, transaction monitoring alerts, MLRO escalation, FIU reporting, data transfer, and fail-closed resilience actually work before serving customers.
                </p>

                <div className="mt-4 space-y-3">
                  {validation_tests.map((test) => (
                    <div
                      key={test.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800">
                              {test.test_category}
                            </span>
                            {test.is_critical_gate && (
                              <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                Critical Go-Live Gate
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-900">{test.test_name}</h3>
                          <p className="text-xs text-zinc-600">{test.test_objective}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            defaultValue={test.evidence_ref || ""}
                            placeholder="Test evidence / UAT log ID..."
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (test.evidence_ref || "")) {
                                void mutateApi(
                                  `test_ev_${test.id}`,
                                  `/api/marketing-shield/v1/expansions/${program.id}/validation`,
                                  "PATCH",
                                  {
                                    test_id: test.id,
                                    status: test.status,
                                    evidence_ref: val || null,
                                  },
                                );
                              }
                            }}
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs"
                          />
                          <select
                            value={test.status}
                            onChange={(e) =>
                              void mutateApi(
                                `test_st_${test.id}`,
                                `/api/marketing-shield/v1/expansions/${program.id}/validation`,
                                "PATCH",
                                {
                                  test_id: test.id,
                                  status: e.target.value as ValidationTestStatus,
                                  verify: e.target.value === "PASSED",
                                },
                              )
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                          >
                            {VALIDATION_TEST_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formal CCO / Board Go-Live Readiness Gate Sign-Off */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-zinc-900" />
                      <h2 className="text-base font-semibold text-zinc-900">
                        Formal CCO / Board Go-Live Readiness Gate Sign-Off
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Enforces Three Lines of Defense independence (Internal Audit cannot approve) and seals the 6-question readiness snapshot with a cryptographic SHA-256 hash.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busyKey === "gen_dossier"}
                    onClick={() =>
                      void mutateApi(
                        "gen_dossier",
                        `/api/marketing-shield/v1/expansions/${program.id}/go-live`,
                        "POST",
                        { action: "GENERATE_DOSSIER" },
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Compile Board Readiness Dossier</span>
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutateApi(
                      "submit_gate",
                      `/api/marketing-shield/v1/expansions/${program.id}/go-live`,
                      "POST",
                      {
                        action: "SUBMIT_DECISION",
                        decision: gateDecision,
                        conditions_or_notes: gateNotes.trim() || null,
                      },
                    );
                  }}
                  className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">
                      Formal Gate Decision
                    </label>
                    <select
                      value={gateDecision}
                      onChange={(e) => setGateDecision(e.target.value as GoLiveDecision)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium"
                    >
                      <option value="APPROVED_FOR_LAUNCH">
                        APPROVED_FOR_LAUNCH (Requires 0 Hard Blockers)
                      </option>
                      <option value="CONDITIONAL_LAUNCH">
                        CONDITIONAL_LAUNCH (Launch with Documented Conditions)
                      </option>
                      <option value="BLOCKED_REMEDIATION_REQUIRED">
                        BLOCKED_REMEDIATION_REQUIRED (Hold Market Launch)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700">
                      Approval Conditions / Supervisory Notes
                    </label>
                    <input
                      type="text"
                      value={gateNotes}
                      onChange={(e) => setGateNotes(e.target.value)}
                      placeholder="Conditions, transaction caps, or remediation notes..."
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={busyKey === "submit_gate"}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {busyKey === "submit_gate" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      <span>Execute Cryptographic Go-Live Decision</span>
                    </button>
                  </div>
                </form>

                {/* Gate History */}
                {go_live_gates.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-zinc-700">
                      Immutable Go-Live Gate Ledger
                    </div>
                    {go_live_gates.map((g) => (
                      <div
                        key={g.id}
                        className="flex flex-col justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-xs sm:flex-row sm:items-center"
                      >
                        <div>
                          <span className="font-semibold text-zinc-900">{g.decision}</span> · Role:{" "}
                          <span className="font-medium text-zinc-700">{g.approver_role}</span> ·
                          Readiness: <strong>{g.readiness_score}/100</strong>
                          {g.conditions_or_notes && (
                            <p className="mt-0.5 text-zinc-600">Notes: {g.conditions_or_notes}</p>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500">
                          SHA-256: {g.approval_hash_sha256.slice(0, 16)}...
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {dossierMarkdown && (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-900 p-4 text-xs text-zinc-100">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-emerald-400">
                        Compiled Cross-Border Compliance Readiness Dossier
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(dossierMarkdown);
                        }}
                        className="rounded bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                      >
                        Copy Markdown
                      </button>
                    </div>
                    <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                      {dossierMarkdown}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: Stages 7 & 8 — Live Reporting Calendar, Incidents & Regulatory Change Log */}
          {activeTab === "STAGE_7_8_LIVE_OPS" && (
            <div className="space-y-6">
              {/* Stage 7: Regulatory Reporting Calendar */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Stage 7: {program.target_country_name} Regulatory Reporting Calendar
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Track statutory returns, FIU goAML reporting obligations, frequencies, submission channels, and filing receipts.
                </p>

                <div className="mt-4 space-y-2.5">
                  {reporting_calendar.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                            {item.frequency}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900">
                            {item.report_name}
                          </span>
                          <span className="text-xs text-zinc-500">({item.regulator})</span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          Channel: {item.submission_channel} · Ref:{" "}
                          {item.statutory_reference || "Statutory Return"} · Next Due:{" "}
                          <strong>{item.next_due_date || "As required"}</strong>
                        </p>
                      </div>

                      <select
                        value={item.status}
                        onChange={(e) =>
                          void mutateApi(
                            `rep_${item.id}`,
                            `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                            "PATCH",
                            {
                              entity: "REPORTING_ITEM",
                              mode: "UPDATE",
                              item_id: item.id,
                              status: e.target.value as ReportingStatus,
                            },
                          )
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                      >
                        {REPORTING_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 8: Multi-Country Regulatory Change Log */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Stage 8: Ongoing Multi-Country Regulatory Change Log
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Continuously track new {program.target_country_name} circulars, assess impact across KYC/AML/Reporting, assign owners, and retain implementation evidence.
                </p>

                <div className="mt-4 space-y-2.5">
                  {regulatory_changes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
                      No post-launch regulatory changes logged for {program.target_country_name} yet.
                    </div>
                  ) : (
                    regulatory_changes.map((chg) => (
                      <div
                        key={chg.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                              {chg.detected_source}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900">
                              {chg.regulator}: {chg.circular_title}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600">{chg.impact_summary}</p>
                        </div>

                        <select
                          value={chg.status}
                          onChange={(e) =>
                            void mutateApi(
                              `chg_${chg.id}`,
                              `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                              "PATCH",
                              {
                                entity: "REGULATORY_CHANGE",
                                mode: "UPDATE",
                                change_id: chg.id,
                                status: e.target.value as RegChangeStatus,
                              },
                            )
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                        >
                          {REG_CHANGE_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!chgRegulator.trim() || !chgTitle.trim() || !chgSummary.trim()) return;
                    const ok = await mutateApi(
                      "add_chg",
                      `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                      "PATCH",
                      {
                        entity: "REGULATORY_CHANGE",
                        mode: "CREATE",
                        regulator: chgRegulator.trim(),
                        circular_title: chgTitle.trim(),
                        impact_summary: chgSummary.trim(),
                        impact_severity: "HIGH",
                      },
                    );
                    if (ok) {
                      setChgRegulator("");
                      setChgTitle("");
                      setChgSummary("");
                    }
                  }}
                  className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 sm:grid-cols-4"
                >
                  <input
                    type="text"
                    value={chgRegulator}
                    onChange={(e) => setChgRegulator(e.target.value)}
                    placeholder="Regulator (e.g., Bank of Ghana)"
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={chgTitle}
                    onChange={(e) => setChgTitle(e.target.value)}
                    placeholder="New Circular / Directive Title"
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={chgSummary}
                    onChange={(e) => setChgSummary(e.target.value)}
                    placeholder="Operational impact assessment..."
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Log Reg Change</span>
                  </button>
                </form>
              </div>

              {/* Stage 7: Compliance Incident & Breach Register */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">
                  Compliance Incident & Breach Register
                </h2>
                <div className="mt-3 space-y-2">
                  {incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="flex flex-col justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs sm:flex-row sm:items-center"
                    >
                      <div>
                        <span className="font-mono font-semibold text-zinc-900">
                          {inc.incident_ref_no}
                        </span>{" "}
                        · <strong>{inc.title}</strong> ({inc.category})
                        <p className="text-zinc-600">{inc.description}</p>
                      </div>
                      <select
                        value={inc.status}
                        onChange={(e) =>
                          void mutateApi(
                            `inc_${inc.id}`,
                            `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                            "PATCH",
                            {
                              entity: "INCIDENT",
                              mode: "UPDATE",
                              incident_id: inc.id,
                              status: e.target.value as IncidentStatus,
                            },
                          )
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium"
                      >
                        {INCIDENT_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!incTitle.trim() || !incDesc.trim()) return;
                    const ok = await mutateApi(
                      "add_inc",
                      `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                      "PATCH",
                      {
                        entity: "INCIDENT",
                        mode: "CREATE",
                        title: incTitle.trim(),
                        category: incCategory,
                        description: incDesc.trim(),
                        severity: "HIGH",
                      },
                    );
                    if (ok) {
                      setIncTitle("");
                      setIncDesc("");
                    }
                  }}
                  className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 sm:grid-cols-4"
                >
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value as IncidentCategory)}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  >
                    {INCIDENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={incTitle}
                    onChange={(e) => setIncTitle(e.target.value)}
                    placeholder="Incident Title"
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={incDesc}
                    onChange={(e) => setIncDesc(e.target.value)}
                    placeholder="Incident details & remediation..."
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Record Incident</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: Country Governance Structure & Core 13 Compliance Artefacts */}
          {activeTab === "GOVERNANCE_ARTEFACTS" && (
            <div className="space-y-6">
              {/* Country Governance Roles */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-800" />
                  <h2 className="text-base font-semibold text-zinc-900">
                    Cross-Border Governance Structure & Country Officer Appointments
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Appoint the Country Compliance Officer, Country MLRO, Regulatory Affairs Lead, and Local Partner Liaison. Note: appointing a Country Compliance Officer or MLRO is required to pass CCO Readiness Question 4.
                </p>

                <div className="mt-4 space-y-2.5">
                  {country_roles.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs sm:flex-row sm:items-center"
                    >
                      <div>
                        <span className="font-semibold text-zinc-900">
                          {COUNTRY_GOVERNANCE_ROLE_LABELS[r.governance_role]}
                        </span>{" "}
                        — <strong>{r.assignee_name}</strong>{" "}
                        {r.entity_or_partner && (
                          <span className="text-zinc-500">({r.entity_or_partner})</span>
                        )}
                      </div>
                      <select
                        value={r.fit_and_proper_status}
                        onChange={(e) =>
                          void mutateApi(
                            `role_${r.id}`,
                            `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                            "PATCH",
                            {
                              entity: "COUNTRY_ROLE",
                              mode: "UPDATE",
                              role_id: r.id,
                              fit_and_proper_status: e.target.value as FitProperStatus,
                            },
                          )
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium"
                      >
                        {FIT_PROPER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            Fit & Proper: {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!roleAssignee.trim()) return;
                    const ok = await mutateApi(
                      "add_role",
                      `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                      "PATCH",
                      {
                        entity: "COUNTRY_ROLE",
                        mode: "CREATE",
                        governance_role: roleType,
                        assignee_name: roleAssignee.trim(),
                        entity_or_partner: roleEntity.trim() || null,
                        fit_and_proper_status: "APPROVED",
                      },
                    );
                    if (ok) {
                      setRoleAssignee("");
                      setRoleEntity("");
                    }
                  }}
                  className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 sm:grid-cols-4"
                >
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value as CountryGovernanceRole)}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  >
                    {COUNTRY_GOVERNANCE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {COUNTRY_GOVERNANCE_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={roleAssignee}
                    onChange={(e) => setRoleAssignee(e.target.value)}
                    placeholder="Officer Full Name"
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={roleEntity}
                    onChange={(e) => setRoleEntity(e.target.value)}
                    placeholder="Local Subsidiary / Partner Bank"
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Appoint Officer</span>
                  </button>
                </form>
              </div>

              {/* Core 13 Compliance Artefacts Register */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-800" />
                  <h2 className="text-base font-semibold text-zinc-900">
                    The 13 Core Institutional Compliance Artefacts ({program.target_country_name})
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Documented registers, gap assessments, policies, calendars, and testing reports demonstrating regulatory control.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {artefacts.map((art) => (
                    <div
                      key={art.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-zinc-900">{art.title}</div>
                        <div className="text-[11px] text-zinc-500">{art.purpose}</div>
                      </div>
                      <select
                        value={art.status}
                        onChange={(e) =>
                          void mutateApi(
                            `art_${art.id}`,
                            `/api/marketing-shield/v1/expansions/${program.id}/operations`,
                            "PATCH",
                            {
                              entity: "ARTEFACT",
                              mode: "UPDATE",
                              artefact_id: art.id,
                              status: e.target.value as ArtefactStatus,
                            },
                          )
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                      >
                        {ARTEFACT_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
