"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Lock,
  Check,
} from "lucide-react";
import { DossierMetadata } from "@/contracts/approval-dossier.contracts";
import { useEntitlement } from "@/hooks/useEntitlement";

export interface ApprovalRecord {
  id: string;
  revision_id: string;
  approved_by: string;
  decision: "APPROVED" | "REJECTED";
  decision_reason: string;
  conditions: Record<string, unknown>;
  decided_at: string;
}

export interface ReviewRecord {
  id: string;
  revision_id: string;
  reviewer_id: string;
  review_status: string;
  review_comments?: string;
  started_at: string;
}

interface Tab5Props {
  campaign: {
    id: string;
    campaign_name: string;
    status: string;
    current_revision_id?: string;
    approved_revision_id?: string | null;
  };
  currentRevisionNumber?: number;
  onStatusUpdated?: () => void;
}

export const Tab5SignOffDossier: React.FC<Tab5Props> = ({
  campaign,
  currentRevisionNumber = 1,
  onStatusUpdated,
}) => {
  const [submitComment, setSubmitComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [decisionReason, setDecisionReason] = useState("");
  const [conditionArcon, setConditionArcon] = useState(true);
  const [conditionAprVisibility, setConditionAprVisibility] = useState(true);
  const [recordingDecision, setRecordingDecision] = useState(false);

  const [generatingDossier, setGeneratingDossier] = useState(false);
  const [dossierData, setDossierData] = useState<DossierMetadata | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentRoleLabel, setCurrentRoleLabel] = useState<string | null>(null);
  const [canApproveCampaign, setCanApproveCampaign] = useState<boolean>(true);
  const [canSubmitReview, setCanSubmitReview] = useState<boolean>(true);

  const unwatermarkedExport = useEntitlement("export_unwatermarked");
  const isEvaluationWatermark = !unwatermarkedExport.isLoading && !unwatermarkedExport.allowed;

  useEffect(() => {
    let active = true;
    fetch("/api/marketing-shield/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json?.success || !json.data) return;
        const perms: string[] = Array.isArray(json.data.permissions) ? json.data.permissions : [];
        setCurrentRoleLabel(json.data.roleMetadata?.label || json.data.role || null);
        setCanApproveCampaign(perms.includes("approval.decide"));
        setCanSubmitReview(perms.includes("campaign.submit_review"));
      })
      .catch(() => {
        // Non-blocking fallback
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchApprovals = useCallback(async () => {
    if (!campaign.id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/marketing-shield/v1/campaigns/${campaign.id}/approvals`);
      const json = await res.json();
      if (json.success && json.data) {
        setApprovals(json.data.approvals || []);
        setReviews(json.data.reviews || []);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setHistoryLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleSubmitReview = async () => {
    if (!campaign.current_revision_id) {
      setErrorMessage("No active revision found for this campaign.");
      return;
    }

    setSubmittingReview(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/marketing-shield/v1/campaigns/${campaign.id}/submit-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision_id: campaign.current_revision_id,
            comment: submitComment || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit campaign for review.");
      }

      setSuccessMessage("Campaign submitted for formal compliance sign-off.");
      setSubmitComment("");
      onStatusUpdated?.();
      fetchApprovals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRecordDecision = async () => {
    if (!campaign.current_revision_id) {
      setErrorMessage("No active revision found for this campaign.");
      return;
    }

    if (!decisionReason || decisionReason.trim().length < 5) {
      setErrorMessage("Please provide a decision rationale (at least 5 characters).");
      return;
    }

    setRecordingDecision(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/marketing-shield/v1/campaigns/${campaign.id}/approvals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision_id: campaign.current_revision_id,
            decision,
            decision_reason: decisionReason,
            conditions: {
              must_obtain_arcon_asp_certificate_before_print: conditionArcon,
              ensure_apr_prominently_visible: conditionAprVisibility,
            },
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to record approval decision.");
      }

      setSuccessMessage(`Decision (${decision}) recorded and added to the audit log.`);
      setDecisionReason("");
      onStatusUpdated?.();
      fetchApprovals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setRecordingDecision(false);
    }
  };

  const handleGenerateDossier = async () => {
    const targetRevId = campaign.approved_revision_id || campaign.current_revision_id;
    if (!targetRevId) {
      setErrorMessage("No revision found to compile dossier.");
      return;
    }

    setGeneratingDossier(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/marketing-shield/v1/campaigns/${campaign.id}/dossiers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision_id: targetRevId,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to generate compliance dossier.");
      }

      setDossierData(json.data);
      setSuccessMessage("Compliance PDF dossier ready for download.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setGeneratingDossier(false);
    }
  };

  const isApproved = campaign.status === "APPROVED";
  const latestApproval = approvals[0];

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner: Status Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Governance &amp; Sign-Off
            </span>
            <h3 className="text-[16px] font-semibold text-zinc-950 mt-0.5">
              Sign-Off &amp; Regulatory Dossier
            </h3>
          </div>

          <span
            className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-md border shrink-0 ${
              campaign.status === "APPROVED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : campaign.status === "UNDER_REVIEW"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : campaign.status === "REJECTED"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-zinc-100 text-zinc-700 border-zinc-200"
            }`}
          >
            {campaign.status.replace(/_/g, " ")}
          </span>
        </div>

        <p className="mt-2 text-[13px] text-zinc-600 leading-relaxed">
          Separation of duties requires sign-off from Legal Counsel or the Chief Compliance Officer, bound to a specific campaign revision.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[13px] text-rose-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[13px] text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* SECTION 1: Formal Approval Certificate (When Approved) */}
      {isApproved && latestApproval && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <h4 className="text-[14px] font-semibold text-emerald-950">
              Approval Certificate
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] pt-1">
            <div>
              <span className="text-zinc-500 font-medium">Approved By</span>
              <p className="font-mono text-zinc-900 mt-0.5">{latestApproval.approved_by}</p>
            </div>
            <div>
              <span className="text-zinc-500 font-medium">Decision Time</span>
              <p className="text-zinc-900 mt-0.5">
                {new Date(latestApproval.decided_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-[12.5px] border-t border-emerald-200/70 pt-2">
            <span className="text-zinc-500 font-medium">Rationale</span>
            <p className="text-zinc-800 mt-0.5">{latestApproval.decision_reason}</p>
          </div>

          <div className="text-[11px] font-mono text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded">
            Approval ID: {latestApproval.id} • Revision #{currentRevisionNumber}
          </div>
        </div>
      )}

      {/* SECTION 2: Submit for Review Action */}
      {campaign.status !== "UNDER_REVIEW" && !isApproved && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Send className="h-4 w-4 text-zinc-700" />
            <h4 className="text-[14px] font-semibold text-zinc-950">
              Submit for Legal / CCO Sign-Off
            </h4>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
              Submission Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
              placeholder="e.g. All high-severity findings addressed in Revision #2. Ready for review."
              className="w-full rounded-md border border-zinc-300 p-2.5 text-[13px] text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={submittingReview || !canSubmitReview}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submittingReview ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Revision #{currentRevisionNumber} for Review
              </>
            )}
          </button>
          {!canSubmitReview && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Your current role ({currentRoleLabel || "Current Role"}) cannot submit campaigns for review. Assign Product &amp; Marketing Manager, Compliance Analyst, Legal Counsel, or CCO in{" "}
              <Link href="/settings?tab=team" className="font-semibold underline">
                Settings → Team &amp; Roles
              </Link>.
            </p>
          )}
        </div>
      )}

      {/* Review In-Progress Notice */}
      {campaign.status === "UNDER_REVIEW" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[13px] text-amber-950">
            <p className="font-semibold">Awaiting Compliance Decision</p>
            <p className="mt-0.5 text-amber-800 text-[12.5px]">
              Legal Counsel and the Chief Compliance Officer have been notified.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: Formal Approval / Rejection Box (CCO / Legal Role) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-700" />
            <h4 className="text-[14px] font-semibold text-zinc-950">
              Record Sign-Off Decision
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
            Legal / CCO Only
          </span>
        </div>

        {!canApproveCampaign && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 space-y-1">
            <div className="font-semibold">
              Approval Authority Required (Current role: {currentRoleLabel || "Restricted"})
            </div>
            <p className="text-amber-800 leading-relaxed">
              Only <strong>Legal Counsel</strong> and the <strong>Chief Compliance Officer</strong> can approve or reject campaigns. You can update workspace member roles in{" "}
              <Link href="/settings?tab=team" className="font-semibold underline">
                Settings → Team &amp; Roles
              </Link>.
            </p>
          </div>
        )}

        {/* Decision Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!canApproveCampaign}
            onClick={() => setDecision("APPROVED")}
            className={`flex items-center justify-center gap-2 rounded-md border py-2 text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              decision === "APPROVED"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Approve
          </button>

          <button
            type="button"
            disabled={!canApproveCampaign}
            onClick={() => setDecision("REJECTED")}
            className={`flex items-center justify-center gap-2 rounded-md border py-2 text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              decision === "REJECTED"
                ? "border-rose-600 bg-rose-50 text-rose-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <XCircle className="h-4 w-4 text-rose-600" />
            Reject
          </button>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
            Decision Rationale
          </label>
          <textarea
            rows={2}
            disabled={!canApproveCampaign}
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            placeholder="e.g. Verified against FCCPC Sales Promotion rules and approved rate schedule."
            className="w-full rounded-md border border-zinc-300 p-2.5 text-[13px] text-zinc-900 focus:border-zinc-900 focus:outline-none disabled:bg-zinc-50"
          />
        </div>

        {/* Conditions */}
        {decision === "APPROVED" && (
          <div className="space-y-2 rounded-lg bg-zinc-50 p-3 text-[12px] text-zinc-700 border border-zinc-200">
            <span className="font-semibold text-zinc-900 block mb-1">
              Pre-Publication Conditions
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canApproveCampaign}
                checked={conditionArcon}
                onChange={(e) => setConditionArcon(e.target.checked)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
              />
              <span>Obtain ARCON ASP pre-vetting certificate before public release</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canApproveCampaign}
                checked={conditionAprVisibility}
                onChange={(e) => setConditionAprVisibility(e.target.checked)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
              />
              <span>Ensure APR and license disclosure remain legible on mobile</span>
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={handleRecordDecision}
          disabled={recordingDecision || !canApproveCampaign}
          className={`w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-medium text-white transition-colors cursor-pointer ${
            decision === "APPROVED"
              ? "bg-emerald-700 hover:bg-emerald-800"
              : "bg-rose-700 hover:bg-rose-800"
          } disabled:opacity-50`}
        >
          {recordingDecision ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Recording Decision...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Confirm {decision} for Revision #{currentRevisionNumber}
            </>
          )}
        </button>

        <p className="text-[11px] text-zinc-500 text-center">
          Requires Legal Counsel or Chief Compliance Officer permissions.
        </p>
      </div>

      {/* SECTION 4: FCCPC Reg 32 & ARCON Regulatory PDF Dossier */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-700" />
            <h4 className="text-[14px] font-semibold text-zinc-950">
              Compliance Dossier (PDF)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
            FCCPC Reg. 32 / ARCON ASP
          </span>
        </div>

        {/* Elevated Document Sheet Preview (with Evaluation Watermark Gate) */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-xs">
          {isEvaluationWatermark && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-10 overflow-hidden"
            >
              <div className="-rotate-30 text-center font-mono text-[13px] font-semibold tracking-[0.2em] uppercase text-zinc-900/10 whitespace-nowrap">
                <div>EVALUATION PREVIEW • UPGRADE FOR FILING</div>
                <div className="mt-8">EVALUATION PREVIEW • UPGRADE FOR FILING</div>
              </div>
            </div>
          )}

          <div className="relative z-0 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px]">
                Regulatory Audit Package
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                Rev #{currentRevisionNumber}
              </span>
            </div>
            <p className="text-[12.5px] text-zinc-600 leading-relaxed">
              Includes the promotional copy, asset SHA-256 fingerprints, check results, statutory citations, and sign-off record.
            </p>
            {isEvaluationWatermark && (
              <div className="pt-1 flex items-center justify-between text-[11.5px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
                <span>Evaluation workspace exports carry a preview watermark.</span>
                <Link
                  href="/pricing"
                  className="font-medium text-zinc-950 underline underline-offset-2 shrink-0 ml-2"
                >
                  Upgrade plan →
                </Link>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateDossier}
          disabled={generatingDossier}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {generatingDossier ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Compiling PDF Dossier...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generate PDF Dossier
            </>
          )}
        </button>

        {dossierData && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Dossier Ready
                </span>
                <span className="text-[13px] font-semibold text-zinc-950 block truncate">
                  dossier_{dossierData.dossier_id.slice(0, 8)}.pdf (
                  {(dossierData.file_size_bytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              <a
                href={dossierData.download_url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-800 transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </a>
            </div>

            <div className="font-mono text-[10.5px] text-zinc-500 truncate">
              SHA-256: {dossierData.file_sha256}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: Historical Reviews & Approvals Trail */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h4 className="text-[13px] font-semibold text-zinc-950">
            Audit Trail ({approvals.length + reviews.length})
          </h4>
          {historyLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
        </div>

        {approvals.length === 0 && reviews.length === 0 ? (
          <p className="text-[12px] text-zinc-500 py-2">
            No formal review or sign-off events recorded yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {approvals.map((app) => (
              <div
                key={app.id}
                className="text-[12px] p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-start justify-between"
              >
                <div>
                  <span
                    className={`font-semibold uppercase text-[10.5px] px-1.5 py-0.5 rounded border ${
                      app.decision === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {app.decision}
                  </span>
                  <p className="text-zinc-800 mt-1">{app.decision_reason}</p>
                  <span className="text-[10.5px] text-zinc-400 block mt-0.5">
                    By {app.approved_by} • {new Date(app.decided_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="text-[12px] p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-start justify-between"
              >
                <div>
                  <span className="font-semibold uppercase text-[10.5px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                    REVIEW SUBMITTED
                  </span>
                  {rev.review_comments && (
                    <p className="text-zinc-700 mt-1 italic">&ldquo;{rev.review_comments}&rdquo;</p>
                  )}
                  <span className="text-[10.5px] text-zinc-400 block mt-0.5">
                    By {rev.reviewer_id} • {new Date(rev.started_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
