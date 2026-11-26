"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GitBranch,
  History,
  Layers,
  Loader2,
  Lock,
  Paperclip,
  Radio,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { CanonicalRole } from "@/modules/auth-tenancy/types";
import type { FeatureDossier } from "@/modules/feature-governance/feature-governance.service";
import type {
  ControlVerificationStatus,
  FeatureLifecycleStage,
  PostLaunchReviewType,
} from "@/contracts/feature-governance.contracts";
import { extractApiError } from "@/lib/api-client";
import { LinkedWorkProductCard } from "@/components/work-products/LinkedWorkProductCard";

interface FeatureDetailWorkspaceProps {
  dossier: FeatureDossier;
  onBack: () => void;
  onDossierUpdated: (next: FeatureDossier) => void;
}

type DetailTab = "proposal_ria" | "controls_build" | "launch_gate" | "pir_change" | "ripple";

const STAGE_ORDER: Array<{ key: FeatureLifecycleStage; short: string }> = [
  { key: "PROPOSAL", short: "1. Proposal" },
  { key: "REGULATORY_SCREENING", short: "2. RIA Screening" },
  { key: "RISK_AND_CONTROL_DESIGN", short: "3. Risk & Controls" },
  { key: "PRODUCT_OPS_DESIGN", short: "4. Build Specs" },
  { key: "IMPLEMENTATION", short: "5. Implementation" },
  { key: "VALIDATION_TESTING", short: "6. Validation" },
  { key: "LAUNCH_GATE", short: "7. Launch Gate" },
  { key: "POST_LAUNCH_MONITORING", short: "8. Post-Launch" },
  { key: "MODIFICATION_OR_RETIREMENT", short: "9. Change / Retire" },
];

const CONTROL_STATUS_BADGE: Record<ControlVerificationStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-700 border-zinc-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  EVIDENCE_SUBMITTED: "bg-amber-50 text-amber-800 border-amber-200",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  WAIVED_WITH_CONDITION: "bg-indigo-50 text-indigo-700 border-indigo-200",
  REASSESSMENT_REQUIRED: "bg-rose-100 text-rose-800 border-rose-300",
};

const GATE_STATUS_BADGE: Record<string, string> = {
  NOT_READY: "bg-zinc-100 text-zinc-700 border-zinc-200",
  PENDING_GATE: "bg-amber-50 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CONDITIONALLY_APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

export function FeatureDetailWorkspace({
  dossier,
  onBack,
  onDossierUpdated,
}: FeatureDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("controls_build");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Evidence attachment inline state
  const [evidenceControlId, setEvidenceControlId] = useState<string | null>(null);
  const [evTitle, setEvTitle] = useState("");
  const [evType, setEvType] = useState<
    | "TEST_LOG"
    | "AUTHORIZATION_AUDIT"
    | "LIMIT_CONFIG"
    | "SOP_DOCUMENT"
    | "DISCLOSURE_SCREENSHOT"
    | "SECURITY_PENTEST"
    | "SANCTIONS_SCREENING_LOG"
    | "REGULATORY_FILING"
    | "OTHER"
  >("TEST_LOG");
  const [evRef, setEvRef] = useState("");
  const [evNotes, setEvNotes] = useState("");

  // 2nd-Line Control Verification inline state
  const [verifyControlId, setVerifyControlId] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"VERIFIED" | "FAILED" | "REASSESSMENT_REQUIRED">("VERIFIED");
  const [verifyNotes, setVerifyNotes] = useState("");

  // Launch Gate Decision state
  const [gateDecision, setGateDecision] = useState<"APPROVED" | "CONDITIONALLY_APPROVED" | "REJECTED">("APPROVED");
  const [gateRationale, setGateRationale] = useState("");
  const [conditionDesc, setConditionDesc] = useState("");
  const [conditionOwner, setConditionOwner] = useState<CanonicalRole>("ENGINEERING_LEAD");
  const [conditionDue, setConditionDue] = useState("2026-12-31");

  // PIR / Material Change / 3rd-Line Audit Review state
  const [reviewType, setReviewType] = useState<PostLaunchReviewType>("POST_IMPLEMENTATION_REVIEW");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewTrigger, setReviewTrigger] = useState("");
  const [reviewConclusion, setReviewConclusion] = useState("");
  const [requiresReapproval, setRequiresReapproval] = useState(false);
  const [suspendFeature, setSuspendFeature] = useState(false);
  const [txAlerts, setTxAlerts] = useState("0");
  const [fraudAttempts, setFraudAttempts] = useState("0");
  const [disputesCount, setDisputesCount] = useState("0");
  const [duplicateTx, setDuplicateTx] = useState("0");

  // Regulatory Ripple Scan state (pre-filled with March 10, 2026 CBN Automated AML Baseline Standards)
  const [rippleRegulator, setRippleRegulator] = useState<"CBN" | "NFIU" | "NDPC" | "FCCPC" | "SEC" | "ARCON">("CBN");
  const [rippleTitle, setRippleTitle] = useState(
    "CBN Baseline Standards for Automated AML/CFT/CPF Solutions (March 10, 2026)"
  );
  const [rippleSummary, setRippleSummary] = useState(
    "Mandates automated suspicious transaction detection, real-time sanctions/PEP screening, governance oversight, and 24-hour NFIU goAML STR reporting across deposit money banks (18-month rollout) and OFIs/fintechs (24-month rollout)."
  );

  // Add custom control form state
  const [showAddControl, setShowAddControl] = useState(false);
  const [newCtrlCode, setNewCtrlCode] = useState("CTRL-CUST-10");
  const [newCtrlDomain, setNewCtrlDomain] = useState<
    | "KYC_CDD"
    | "AML_CFT_CPF"
    | "TRANSACTION_MONITORING"
    | "SANCTIONS"
    | "CONSUMER_PROTECTION"
    | "DATA_PROTECTION"
    | "RECORD_KEEPING"
    | "DISPUTES_COMPLAINTS"
    | "FRAUD_PREVENTION"
    | "LICENSING_PERIMETER"
    | "INFOSEC"
  >("AML_CFT_CPF");
  const [newCtrlType, setNewCtrlType] = useState<"PREVENTIVE" | "DETECTIVE" | "CORRECTIVE">("PREVENTIVE");
  const [newCtrlRisk, setNewCtrlRisk] = useState("");
  const [newCtrlObj, setNewCtrlObj] = useState("");
  const [newCtrlCitation, setNewCtrlCitation] = useState("CBN AML/CFT/CPF Regulations 2022");
  const [newCtrlPrd, setNewCtrlPrd] = useState("");
  const [newCtrlEng, setNewCtrlEng] = useState("");
  const [newCtrlSop, setNewCtrlSop] = useState("");
  const [newCtrlQa, setNewCtrlQa] = useState("");
  const [newCtrlOwner, setNewCtrlOwner] = useState<CanonicalRole>("ENGINEERING_LEAD");

  const { feature, controls, gates, reviews, ripple_alerts: rippleAlerts, readiness } = dossier;

  const reloadDossier = async () => {
    const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && json.data?.feature) {
      onDossierUpdated(json.data as FeatureDossier);
    }
  };

  const handleStageTransition = async (nextStage: FeatureLifecycleStage) => {
    if (nextStage === feature.lifecycle_stage || busyAction) return;
    setBusyAction(`stage_${nextStage}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle_stage: nextStage }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Unable to transition lifecycle stage.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      onDossierUpdated(json.data as FeatureDossier);
      setNotice({
        type: "success",
        text: `Feature transitioned to stage ${nextStage.replace(/_/g, " ")}.`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddCustomControl = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("add_control");
    setNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}/controls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_code: newCtrlCode.trim(),
          compliance_domain: newCtrlDomain,
          regulator: "CBN",
          statutory_citation: newCtrlCitation.trim(),
          risk_statement: newCtrlRisk.trim(),
          risk_severity: "HIGH",
          control_type: newCtrlType,
          control_objective: newCtrlObj.trim(),
          product_requirement: newCtrlPrd.trim(),
          engineering_spec: newCtrlEng.trim(),
          operational_sop_trigger: newCtrlSop.trim(),
          qa_test_case: newCtrlQa.trim(),
          owner_line:
            newCtrlOwner === "RISK_OFFICER" ||
            newCtrlOwner === "AML_FRAUD_OFFICER" ||
            newCtrlOwner === "INFOSEC_OFFICER" ||
            newCtrlOwner === "LEGAL_COUNSEL" ||
            newCtrlOwner === "CHIEF_COMPLIANCE_OFFICER" ||
            newCtrlOwner === "COMPLIANCE_ANALYST"
              ? "SECOND_LINE"
              : "FIRST_LINE",
          owner_role: newCtrlOwner,
          required_evidence_description: "Staging validation log & 2nd-line review sign-off",
          is_mandatory_launch_blocker: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Failed to add feature control.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      setShowAddControl(false);
      setNewCtrlRisk("");
      setNewCtrlObj("");
      setNewCtrlPrd("");
      setNewCtrlEng("");
      setNewCtrlSop("");
      setNewCtrlQa("");
      await reloadDossier();
      setNotice({ type: "success", text: `Control ${newCtrlCode.trim()} added to Risk & Control Matrix.` });
    } finally {
      setBusyAction(null);
    }
  };

  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceControlId) return;
    setBusyAction(`ev_${evidenceControlId}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}/controls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ATTACH_EVIDENCE",
          control_id: evidenceControlId,
          title: evTitle.trim(),
          evidence_type: evType,
          reference_url_or_key: evRef.trim(),
          notes: evNotes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Failed to attach evidence.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      setEvidenceControlId(null);
      setEvTitle("");
      setEvRef("");
      setEvNotes("");
      await reloadDossier();
      setNotice({ type: "success", text: "SHA-256 hashed control test evidence attached." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyControlId) return;
    setBusyAction(`ver_${verifyControlId}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}/controls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_CONTROL",
          control_id: verifyControlId,
          verification_status: verifyStatus,
          verification_notes: verifyNotes.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Failed to verify control.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      setVerifyControlId(null);
      setVerifyNotes("");
      await reloadDossier();
      setNotice({ type: "success", text: `Control marked as ${verifyStatus} by 2nd Line.` });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitForGate = async () => {
    setBusyAction("submit_gate");
    setNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_FOR_GATE" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Unable to submit for Launch Gate.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      onDossierUpdated(json.data as FeatureDossier);
      setNotice({ type: "success", text: "Feature submitted to 2nd Line for Launch Readiness Gate review." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRecordGateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("decide_gate");
    setNotice(null);
    try {
      const conditions =
        gateDecision === "CONDITIONALLY_APPROVED" && conditionDesc.trim().length >= 5
          ? [{ description: conditionDesc.trim(), owner_role: conditionOwner, due_date: conditionDue }]
          : [];

      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DECISION",
          decision: gateDecision,
          decision_rationale: gateRationale.trim(),
          conditions,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Launch Gate decision rejected.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      onDossierUpdated(json.data as FeatureDossier);
      setGateRationale("");
      setConditionDesc("");
      setNotice({
        type: "success",
        text: `Launch Gate decision (${gateDecision}) sealed in immutable hash-chained ledger.`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("create_review");
    setNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${feature.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: reviewType,
          title: reviewTitle.trim(),
          trigger_summary: reviewTrigger.trim(),
          monitoring_metrics: {
            transaction_monitoring_alerts: Number(txAlerts) || 0,
            unauthorized_or_fraud_attempts: Number(fraudAttempts) || 0,
            customer_complaints_and_disputes: Number(disputesCount) || 0,
            failed_or_duplicate_transactions: Number(duplicateTx) || 0,
          },
          requires_reapproval: requiresReapproval,
          suspend_feature_immediately: suspendFeature,
          conclusion_notes: reviewConclusion.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Failed to record review.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      if (json.data?.dossier) {
        onDossierUpdated(json.data.dossier as FeatureDossier);
      } else {
        await reloadDossier();
      }
      setReviewTitle("");
      setReviewTrigger("");
      setReviewConclusion("");
      setRequiresReapproval(false);
      setSuspendFeature(false);
      setNotice({ type: "success", text: `${reviewType.replace(/_/g, " ")} recorded.` });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunRippleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("ripple_scan");
    setNotice(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/ripple-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regulator: rippleRegulator,
          title: rippleTitle.trim(),
          summary_text: rippleSummary.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Failed to execute Regulatory Ripple Scan.");
        setNotice({ type: "error", text: parsed.message });
        return;
      }
      await reloadDossier();
      setNotice({
        type: "success",
        text: `Regulatory Ripple Scan complete: ${json.data?.created_count ?? 0} impact alert(s) mapped across features, controls & owners.`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Feature Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Governed Features</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#0B1220] text-white">
                {feature.feature_code}
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
                {feature.feature_name}
              </h1>
              <span
                className={`font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                  GATE_STATUS_BADGE[feature.gate_status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                GATE: {feature.gate_status.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700">
                {feature.materiality_tier} MATERIALITY
              </span>
            </div>
            <p className="text-xs text-zinc-600 max-w-3xl leading-relaxed">{feature.summary}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Readiness Tracker
              </div>
              <div className="text-lg font-bold font-mono text-zinc-950">
                {readiness.numerator}/{readiness.denominator}
              </div>
            </div>
            {feature.conversation_id && (
              <Link
                href={`/chat?conversationId=${feature.conversation_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-[#1D4ED8]" />
                <span>Structuring Pack</span>
              </Link>
            )}
          </div>
        </div>

        {/* Interactive 9-Stage Governance Lifecycle Stepper (PATCH /api/marketing-shield/v1/features/[id]) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-zinc-100">
          {STAGE_ORDER.map((stage) => {
            const active = feature.lifecycle_stage === stage.key;
            return (
              <button
                key={stage.key}
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleStageTransition(stage.key)}
                title={`Transition feature to ${stage.short}`}
                className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer disabled:opacity-60 ${
                  active
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
                }`}
              >
                {stage.short}
              </button>
            );
          })}
          {(feature.lifecycle_stage === "SUSPENDED" || feature.lifecycle_stage === "RETIRED") && (
            <div className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-600 text-white">
              {feature.lifecycle_stage}
            </div>
          )}
        </div>
      </div>

      <LinkedWorkProductCard
        workProductId={feature.work_product_id || null}
        conversationId={feature.conversation_id || null}
        fallbackTitle={feature.feature_name}
        registerLabel="Feature Governance"
      />

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between ${
            notice.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[11px] underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5-Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-2">
        {(
          [
            { id: "proposal_ria", label: "Proposal & Multi-Domain RIA", icon: Layers },
            {
              id: "controls_build",
              label: `Risk, Controls & Build Specs (${controls.length})`,
              icon: ClipboardCheck,
            },
            {
              id: "launch_gate",
              label: `Launch Readiness Gate (${readiness.numerator}/${readiness.denominator})`,
              icon: Lock,
            },
            {
              id: "pir_change",
              label: `Post-Launch PIR & Material Change (${reviews.length})`,
              icon: History,
            },
            {
              id: "ripple",
              label: `Regulatory Ripple Impacts (${rippleAlerts.length})`,
              icon: Radio,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Proposal & Multi-Domain RIA */}
      {activeTab === "proposal_ria" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-[10.5px] font-mono uppercase text-zinc-400">Change Type</div>
              <div className="text-sm font-semibold text-zinc-900 mt-1">
                {feature.change_classification.replace(/_/g, " ")}
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-[10.5px] font-mono uppercase text-zinc-400">Financial Activity</div>
              <div className="text-sm font-semibold text-zinc-900 mt-1">
                {feature.financial_activity_type.replace(/_/g, " ")}
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-[10.5px] font-mono uppercase text-zinc-400">Target Market</div>
              <div className="text-sm font-semibold text-zinc-900 mt-1">
                {feature.target_market.replace(/_/g, " ")}
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-[10.5px] font-mono uppercase text-zinc-400">Regulators in Scope</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {feature.applicable_regulators.map((reg) => (
                  <span
                    key={reg}
                    className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 text-white"
                  >
                    {reg}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-950">
              Multi-Domain Regulatory Impact Assessment (RIA)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-mono uppercase text-zinc-500">
                    <th className="py-2 pr-3">Domain</th>
                    <th className="py-2 pr-3">Regulator &amp; Statutory Basis</th>
                    <th className="py-2 pr-3">Assessment Question</th>
                    <th className="py-2 pr-3">Pre-Launch Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(feature.ria_matrix || []).map((row, idx) => (
                    <tr key={`${row.domain}-${idx}`} className="align-top">
                      <td className="py-3 pr-3 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {row.domain.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">
                        <div className="font-semibold text-zinc-900">{row.regulator}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{row.statutory_basis}</div>
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">{row.assessment_question}</td>
                      <td className="py-3 text-zinc-700">{row.pre_launch_condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Risk & Control Matrix + Compliance-to-Build Translation */}
      {activeTab === "controls_build" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Every material risk maps end-to-end: Statutory Obligation → Control → Product Req → Engineering Spec → SOP → QA Test Evidence.
            </p>
            <button
              type="button"
              onClick={() => setShowAddControl((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 cursor-pointer"
            >
              <span>{showAddControl ? "Close Form" : "+ Add Control"}</span>
            </button>
          </div>

          {showAddControl && (
            <form
              onSubmit={handleAddCustomControl}
              className="bg-white border border-zinc-300 rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-zinc-950">
                Add Custom Risk &amp; Control + Compliance-to-Build Row
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newCtrlCode}
                  onChange={(e) => setNewCtrlCode(e.target.value)}
                  placeholder="Control Code (e.g. CTRL-AML-10)"
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
                <select
                  value={newCtrlDomain}
                  onChange={(e) => setNewCtrlDomain(e.target.value as typeof newCtrlDomain)}
                  className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                >
                  <option value="AML_CFT_CPF">AML / CFT / CPF</option>
                  <option value="KYC_CDD">KYC / CDD</option>
                  <option value="TRANSACTION_MONITORING">Transaction Monitoring</option>
                  <option value="SANCTIONS">Sanctions</option>
                  <option value="CONSUMER_PROTECTION">Consumer Protection</option>
                  <option value="DATA_PROTECTION">Data Protection</option>
                  <option value="RECORD_KEEPING">Record Keeping</option>
                  <option value="DISPUTES_COMPLAINTS">Disputes / Complaints</option>
                  <option value="FRAUD_PREVENTION">Fraud Prevention</option>
                  <option value="LICENSING_PERIMETER">Licensing Perimeter</option>
                  <option value="INFOSEC">InfoSec</option>
                </select>
                <select
                  value={newCtrlType}
                  onChange={(e) => setNewCtrlType(e.target.value as typeof newCtrlType)}
                  className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                >
                  <option value="PREVENTIVE">PREVENTIVE</option>
                  <option value="DETECTIVE">DETECTIVE</option>
                  <option value="CORRECTIVE">CORRECTIVE</option>
                </select>
                <select
                  value={newCtrlOwner}
                  onChange={(e) => setNewCtrlOwner(e.target.value as CanonicalRole)}
                  className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                >
                  <option value="ENGINEERING_LEAD">Engineering Lead (1LoD)</option>
                  <option value="PRODUCT_MANAGER">Product Manager (1LoD)</option>
                  <option value="OPERATIONS_LEAD">Operations Lead (1LoD)</option>
                  <option value="AML_FRAUD_OFFICER">AML / Fraud Officer (2LoD)</option>
                  <option value="RISK_OFFICER">Risk Officer (2LoD)</option>
                  <option value="INFOSEC_OFFICER">InfoSec Officer (2LoD)</option>
                  <option value="LEGAL_COUNSEL">Legal Counsel (2LoD)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newCtrlCitation}
                  onChange={(e) => setNewCtrlCitation(e.target.value)}
                  placeholder="Statutory citation..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newCtrlRisk}
                  onChange={(e) => setNewCtrlRisk(e.target.value)}
                  placeholder="Identified risk statement..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newCtrlObj}
                  onChange={(e) => setNewCtrlObj(e.target.value)}
                  placeholder="Required control objective..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newCtrlPrd}
                  onChange={(e) => setNewCtrlPrd(e.target.value)}
                  placeholder="Product requirement..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newCtrlEng}
                  onChange={(e) => setNewCtrlEng(e.target.value)}
                  placeholder="Engineering spec..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newCtrlSop}
                  onChange={(e) => setNewCtrlSop(e.target.value)}
                  placeholder="Operational SOP trigger..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newCtrlQa}
                  onChange={(e) => setNewCtrlQa(e.target.value)}
                  placeholder="QA / compliance test case..."
                  className="h-8 px-2.5 rounded-md border border-zinc-300 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busyAction === "add_control"}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium cursor-pointer"
                >
                  {busyAction === "add_control" && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Save Custom Control</span>
                </button>
              </div>
            </form>
          )}

          {controls.map((ctrl) => (
            <div
              key={ctrl.id}
              className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white">
                      {ctrl.control_code}
                    </span>
                    <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {ctrl.control_type}
                    </span>
                    <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      {ctrl.compliance_domain.replace(/_/g, " ")} · {ctrl.regulator}
                    </span>
                    <span
                      className={`font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                        CONTROL_STATUS_BADGE[ctrl.verification_status]
                      }`}
                    >
                      {ctrl.verification_status.replace(/_/g, " ")}
                    </span>
                    {ctrl.is_mandatory_launch_blocker && (
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        MANDATORY BLOCKER
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-zinc-900">{ctrl.risk_statement}</p>
                  <p className="text-[11.5px] text-zinc-500">
                    Statutory Basis: {ctrl.statutory_citation} · Owner:{" "}
                    <span className="font-mono font-medium text-zinc-800">
                      {ctrl.owner_role} ({ctrl.owner_line})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEvidenceControlId(evidenceControlId === ctrl.id ? null : ctrl.id)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Attach Evidence ({ctrl.evidence_attachments?.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVerifyControlId(verifyControlId === ctrl.id ? null : ctrl.id)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0B1220] hover:bg-zinc-800 text-white text-[11.5px] font-medium cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>2nd-Line Verify</span>
                  </button>
                </div>
              </div>

              {/* Compliance-to-Build Chain */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11.5px]">
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5">
                  <div className="font-mono text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                    Product Requirement
                  </div>
                  <p className="text-zinc-800 leading-relaxed">{ctrl.product_requirement}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5">
                  <div className="font-mono text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                    Engineering Spec
                  </div>
                  <p className="text-zinc-800 leading-relaxed">{ctrl.engineering_spec}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5">
                  <div className="font-mono text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                    Operational SOP Trigger
                  </div>
                  <p className="text-zinc-800 leading-relaxed">{ctrl.operational_sop_trigger}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5">
                  <div className="font-mono text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                    QA / Compliance Test Case
                  </div>
                  <p className="text-zinc-800 leading-relaxed">{ctrl.qa_test_case}</p>
                </div>
              </div>

              {/* Attached Evidence List */}
              {ctrl.evidence_attachments && ctrl.evidence_attachments.length > 0 && (
                <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-2.5 space-y-1.5">
                  <div className="text-[10.5px] font-mono font-semibold uppercase text-emerald-800">
                    Attached Validation Evidence (SHA-256 Tamper-Evident)
                  </div>
                  {ctrl.evidence_attachments.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-emerald-950 bg-white/80 rounded px-2.5 py-1.5 border border-emerald-100"
                    >
                      <div>
                        <span className="font-semibold">{ev.title}</span>{" "}
                        <span className="font-mono text-[10.5px] text-emerald-700">
                          [{ev.evidence_type}]
                        </span>{" "}
                        — <span className="text-zinc-600">{ev.reference_url_or_key}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">
                        SHA-256: {ev.sha256_hash.slice(0, 12)}… · {ev.submitted_role}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Attach Evidence Form */}
              {evidenceControlId === ctrl.id && (
                <form
                  onSubmit={handleAttachEvidence}
                  className="rounded-xl bg-zinc-50 border border-zinc-300 p-3.5 space-y-2.5"
                >
                  <div className="text-xs font-semibold text-zinc-900">
                    Attach Test / Validation Evidence for {ctrl.control_code}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={evTitle}
                      onChange={(e) => setEvTitle(e.target.value)}
                      placeholder="Evidence title (e.g., Staging MFA Test Log)"
                      className="h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-xs"
                      required
                    />
                    <select
                      value={evType}
                      onChange={(e) => setEvType(e.target.value as typeof evType)}
                      className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                    >
                      <option value="TEST_LOG">QA / Control Test Log</option>
                      <option value="AUTHORIZATION_AUDIT">Authorization Log</option>
                      <option value="LIMIT_CONFIG">Limit Configuration</option>
                      <option value="SOP_DOCUMENT">Operational SOP</option>
                      <option value="DISCLOSURE_SCREENSHOT">Disclosure Screenshot</option>
                      <option value="SECURITY_PENTEST">Security / Pentest Report</option>
                      <option value="SANCTIONS_SCREENING_LOG">Sanctions Screening Log</option>
                      <option value="REGULATORY_FILING">Regulatory Filing</option>
                    </select>
                    <input
                      type="text"
                      value={evRef}
                      onChange={(e) => setEvRef(e.target.value)}
                      placeholder="Artifact URL, Jira ticket, or R2 key"
                      className="h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-xs"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={evNotes}
                      onChange={(e) => setEvNotes(e.target.value)}
                      placeholder="Optional test execution notes..."
                      className="flex-1 h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-xs"
                    />
                    <button
                      type="submit"
                      disabled={busyAction === `ev_${ctrl.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium cursor-pointer"
                    >
                      {busyAction === `ev_${ctrl.id}` && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span>Save Evidence</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Inline 2nd-Line Verification Form */}
              {verifyControlId === ctrl.id && (
                <form
                  onSubmit={handleVerifyControl}
                  className="rounded-xl bg-blue-50/50 border border-blue-200 p-3.5 space-y-2.5"
                >
                  <div className="text-xs font-semibold text-zinc-900">
                    2nd-Line Control Verification ({ctrl.control_code})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={verifyStatus}
                      onChange={(e) => setVerifyStatus(e.target.value as typeof verifyStatus)}
                      className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                    >
                      <option value="VERIFIED">VERIFIED (Control Effective)</option>
                      <option value="FAILED">FAILED (Blocks Launch Gate)</option>
                      <option value="REASSESSMENT_REQUIRED">REASSESSMENT REQUIRED</option>
                    </select>
                    <input
                      type="text"
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="2nd-line reviewer verification notes (min 3 chars)..."
                      className="sm:col-span-2 h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-xs"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busyAction === `ver_${ctrl.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
                    >
                      {busyAction === `ver_${ctrl.id}` && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span>Record 2nd-Line Verification</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Interactive 10-Point Launch Readiness Gate */}
      {activeTab === "launch_gate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: 10-Point Readiness Checklist */}
          <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  10-Point Non-Overridable Launch Readiness Tracker
                </h2>
                <p className="text-xs text-zinc-500">
                  Product teams cannot override mandatory compliance blockers due to launch deadlines.
                </p>
              </div>
              <span className="font-mono text-base font-bold px-3 py-1 rounded-lg bg-zinc-900 text-white">
                {readiness.numerator}/{readiness.denominator}
              </span>
            </div>

            <div className="space-y-2">
              {readiness.checklist.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                    item.satisfied
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  {item.satisfied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-medium text-zinc-900">{item.label}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{item.owner_label}</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 2nd-Line Launch Gate Decision Console & Immutable Ledger */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-950">
                  Formal Launch Authorization Gate
                </h3>
                {feature.gate_status === "NOT_READY" && (
                  <button
                    type="button"
                    onClick={handleSubmitForGate}
                    disabled={busyAction === "submit_gate"}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium cursor-pointer"
                  >
                    {busyAction === "submit_gate" && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>Submit for Gate</span>
                  </button>
                )}
              </div>

              {readiness.mandatory_blockers.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      {readiness.mandatory_blockers.length} Mandatory Blocker(s) Active
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Unconditional Approval is server-blocked until all mandatory controls have attached evidence and 2nd-Line verification.
                  </p>
                </div>
              )}

              <form onSubmit={handleRecordGateDecision} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-800">
                    2nd-Line Binding Decision (CCO / Legal / Risk / AML / InfoSec)
                  </label>
                  <select
                    value={gateDecision}
                    onChange={(e) => setGateDecision(e.target.value as typeof gateDecision)}
                    className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 bg-white text-xs"
                  >
                    <option value="APPROVED">APPROVED (All Conditions Satisfied)</option>
                    <option value="CONDITIONALLY_APPROVED">
                      CONDITIONALLY APPROVED (Tracked Conditions Required)
                    </option>
                    <option value="REJECTED">REJECTED / DEFERRED</option>
                  </select>
                </div>

                {gateDecision === "CONDITIONALLY_APPROVED" && (
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                    <div className="text-[11px] font-semibold text-zinc-800">
                      Mandatory Launch Condition
                    </div>
                    <input
                      type="text"
                      value={conditionDesc}
                      onChange={(e) => setConditionDesc(e.target.value)}
                      placeholder="Specify condition required prior to/post launch..."
                      className="w-full h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-xs"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={conditionOwner}
                        onChange={(e) => setConditionOwner(e.target.value as CanonicalRole)}
                        className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                      >
                        <option value="ENGINEERING_LEAD">Engineering Lead (1LoD)</option>
                        <option value="PRODUCT_MANAGER">Product Manager (1LoD)</option>
                        <option value="OPERATIONS_LEAD">Operations Lead (1LoD)</option>
                        <option value="AML_FRAUD_OFFICER">AML / Fraud Officer (2LoD)</option>
                        <option value="INFOSEC_OFFICER">InfoSec Officer (2LoD)</option>
                      </select>
                      <input
                        type="date"
                        value={conditionDue}
                        onChange={(e) => setConditionDue(e.target.value)}
                        className="h-8 px-2 rounded-md border border-zinc-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-800">Decision Rationale *</label>
                  <textarea
                    rows={3}
                    value={gateRationale}
                    onChange={(e) => setGateRationale(e.target.value)}
                    placeholder="Document regulatory basis, control validation review, or deferral grounds (min 10 chars)..."
                    className="w-full p-2.5 rounded-lg border border-zinc-300 text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={busyAction === "decide_gate"}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#0B1220] hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {busyAction === "decide_gate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Seal Launch Gate Decision (SHA-256)</span>
                </button>
              </form>
            </div>

            {/* Immutable Gate History */}
            {gates.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-zinc-900">
                  Immutable Gate Decision Ledger ({gates.length})
                </h4>
                {gates.map((g) => (
                  <div key={g.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-zinc-900">
                        Gate #{g.gate_number} · {g.decision}
                      </span>
                      <span className="font-mono text-[10.5px] text-zinc-500">
                        {g.readiness_score_numerator}/{g.readiness_score_denominator}
                      </span>
                    </div>
                    <p className="text-zinc-700">{g.decision_rationale}</p>
                    <div className="font-mono text-[10px] text-zinc-500">
                      Signed by {g.decided_role} · Hash: {g.snapshot_hash_sha256.slice(0, 16)}…
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Post-Launch Monitoring, PIR & Material Change Reassessment */}
      {activeTab === "pir_change" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleCreateReview}
            className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-5 space-y-3"
          >
            <h2 className="text-sm font-semibold text-zinc-950">
              Record PIR, Material Change or 3rd-Line Audit Review
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Governance Review Type</label>
              <select
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value as PostLaunchReviewType)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 bg-white text-xs"
              >
                <option value="POST_IMPLEMENTATION_REVIEW">Post-Implementation Review (PIR)</option>
                <option value="MATERIAL_CHANGE_REASSESSMENT">Material Change Reassessment</option>
                <option value="INCIDENT_ESCALATION">Post-Launch Incident Escalation (e.g. Duplicate Debits)</option>
                <option value="SUSPENSION_REVIEW">Feature Suspension Review</option>
                <option value="RETIREMENT_REVIEW">Feature Retirement Review</option>
                <option value="INTERNAL_AUDIT_ASSURANCE">3rd-Line Internal Audit Assurance Note</option>
              </select>
            </div>

            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Review title (e.g., 90-Day Post-Implementation Review)"
              className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs"
              required
            />

            <textarea
              rows={2}
              value={reviewTrigger}
              onChange={(e) => setReviewTrigger(e.target.value)}
              placeholder="Trigger summary (e.g., Limit increase, duplicate debit spike, scheduled 90-day PIR)..."
              className="w-full p-2.5 rounded-lg border border-zinc-300 text-xs"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-zinc-600">
                AML / Tx Monitoring Alerts
                <input
                  type="number"
                  min={0}
                  value={txAlerts}
                  onChange={(e) => setTxAlerts(e.target.value)}
                  className="mt-1 w-full h-8 px-2 rounded-md border border-zinc-300 text-xs text-zinc-900"
                />
              </label>
              <label className="text-[11px] text-zinc-600">
                Fraud / Unauthorized Attempts
                <input
                  type="number"
                  min={0}
                  value={fraudAttempts}
                  onChange={(e) => setFraudAttempts(e.target.value)}
                  className="mt-1 w-full h-8 px-2 rounded-md border border-zinc-300 text-xs text-zinc-900"
                />
              </label>
              <label className="text-[11px] text-zinc-600">
                Customer Disputes / Complaints
                <input
                  type="number"
                  min={0}
                  value={disputesCount}
                  onChange={(e) => setDisputesCount(e.target.value)}
                  className="mt-1 w-full h-8 px-2 rounded-md border border-zinc-300 text-xs text-zinc-900"
                />
              </label>
              <label className="text-[11px] text-zinc-600">
                Failed / Duplicate Debits
                <input
                  type="number"
                  min={0}
                  value={duplicateTx}
                  onChange={(e) => setDuplicateTx(e.target.value)}
                  className="mt-1 w-full h-8 px-2 rounded-md border border-zinc-300 text-xs text-zinc-900"
                />
              </label>
            </div>

            {reviewType !== "INTERNAL_AUDIT_ASSURANCE" && (
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresReapproval}
                    onChange={(e) => setRequiresReapproval(e.target.checked)}
                  />
                  <span>Material change requires re-opening Launch Gate</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-rose-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suspendFeature}
                    onChange={(e) => setSuspendFeature(e.target.checked)}
                  />
                  <span>Suspend feature immediately due to operational/regulatory incident</span>
                </label>
              </div>
            )}

            <textarea
              rows={2}
              value={reviewConclusion}
              onChange={(e) => setReviewConclusion(e.target.value)}
              placeholder="Conclusions, audit observations, or remediation instructions..."
              className="w-full p-2.5 rounded-lg border border-zinc-300 text-xs"
            />

            <button
              type="submit"
              disabled={busyAction === "create_review"}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer"
            >
              {busyAction === "create_review" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Governance Review</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center text-xs text-zinc-500">
                No Post-Implementation Reviews, Material Change Reassessments, or Internal Audit observations logged yet.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white">
                        {rev.review_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-semibold text-zinc-950">{rev.title}</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-zinc-500">
                      {rev.conducted_role} · {rev.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700">{rev.trigger_summary}</p>
                  {rev.monitoring_metrics && Object.keys(rev.monitoring_metrics).length > 0 && (
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono text-zinc-600">
                      <span>AML Alerts: {rev.monitoring_metrics.transaction_monitoring_alerts ?? 0}</span>
                      <span>· Fraud: {rev.monitoring_metrics.unauthorized_or_fraud_attempts ?? 0}</span>
                      <span>· Disputes: {rev.monitoring_metrics.customer_complaints_and_disputes ?? 0}</span>
                      <span>· Duplicate/Failed Tx: {rev.monitoring_metrics.failed_or_duplicate_transactions ?? 0}</span>
                    </div>
                  )}
                  {rev.conclusion_notes && (
                    <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                      {rev.conclusion_notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Regulatory Ripple Impacts */}
      {activeTab === "ripple" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleRunRippleScan}
            className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[#1D4ED8]" />
              <h2 className="text-sm font-semibold text-zinc-950">
                Run Regulatory Ripple Impact Scan
              </h2>
            </div>
            <p className="text-xs text-zinc-500">
              Automatically maps any new CBN, NFIU, NDPC, FCCPC, or SEC circular to impacted live features, controls, and 3LoD owners.
            </p>
            <select
              value={rippleRegulator}
              onChange={(e) => setRippleRegulator(e.target.value as typeof rippleRegulator)}
              className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 bg-white text-xs"
            >
              <option value="CBN">Central Bank of Nigeria (CBN)</option>
              <option value="NFIU">Nigeria Financial Intelligence Unit (NFIU)</option>
              <option value="NDPC">Nigeria Data Protection Commission (NDPC)</option>
              <option value="FCCPC">FCCPC</option>
              <option value="SEC">SEC Nigeria</option>
              <option value="ARCON">ARCON</option>
            </select>
            <input
              type="text"
              value={rippleTitle}
              onChange={(e) => setRippleTitle(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs"
              required
            />
            <textarea
              rows={3}
              value={rippleSummary}
              onChange={(e) => setRippleSummary(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-zinc-300 text-xs"
              required
            />
            <button
              type="submit"
              disabled={busyAction === "ripple_scan"}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              {busyAction === "ripple_scan" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Map Circular Impact Across Live Features</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {rippleAlerts.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center text-xs text-zinc-500">
                No regulatory circular ripple alerts mapped to this feature yet. Run a scan on the left to test live CBN/NFIU/NDPC circular mapping.
              </div>
            ) : (
              rippleAlerts.map((alert) => {
                const controlCodes = Array.isArray(alert.impacted_control_codes)
                  ? (alert.impacted_control_codes as string[])
                  : [];
                const ownerRoles = Array.isArray(alert.impacted_owner_roles)
                  ? (alert.impacted_owner_roles as string[])
                  : [];
                return (
                  <div
                    key={String(alert.id)}
                    className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white">
                          {String(alert.regulator || "CBN")}
                        </span>
                        <span className="text-xs font-semibold text-zinc-950">
                          {String(alert.circular_title || "")}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {String(alert.severity || "HIGH")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700">{String(alert.blind_spot_summary || "")}</p>
                    {controlCodes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-medium text-zinc-500">Impacted Controls:</span>
                        {controlCodes.map((code) => (
                          <span
                            key={code}
                            className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                    {ownerRoles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-medium text-zinc-500">Accountable Owners:</span>
                        {ownerRoles.map((role) => (
                          <span
                            key={role}
                            className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
