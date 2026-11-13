/**
 * Cogent Marketing Shield - Tab 5: Institutional Sign-Off & Statutory PDF Dossier
 * Document Reference: Document 04 (Sections 5.4, 5.5), Document 07 (Section 5.2), Document 08 (Phase 9)
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Send,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Lock,
} from "lucide-react";
import { DossierMetadata } from "@/contracts/approval-dossier.contracts";

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
  // Submission for review state
  const [submitComment, setSubmitComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Approval decision state
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [decisionReason, setDecisionReason] = useState("");
  const [conditionArcon, setConditionArcon] = useState(true);
  const [conditionAprVisibility, setConditionAprVisibility] = useState(true);
  const [recordingDecision, setRecordingDecision] = useState(false);

  // Dossier state
  const [generatingDossier, setGeneratingDossier] = useState(false);
  const [dossierData, setDossierData] = useState<DossierMetadata | null>(null);

  // Historical records
  const [historyLoading, setHistoryLoading] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  // Notifications / Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch approvals and reviews
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

  // 1. Submit for review handler
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
        },
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit campaign for review.");
      }

      setSuccessMessage(
        "Campaign successfully submitted for formal review. Legal Counsel & CCO notified.",
      );
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

  // 2. Record approval decision handler
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
        },
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to record approval decision.");
      }

      setSuccessMessage(
        `Decision ${decision} recorded. Campaign status updated and audit log appended.`,
      );
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

  // 3. Generate Statutory Dossier handler
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
        },
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to generate statutory dossier.");
      }

      setDossierData(json.data);
      setSuccessMessage("Statutory compliance PDF dossier compiled and uploaded to R2.");
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
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Institutional Governance & Sign-Off
            </span>
            <h3 className="text-[16px] font-semibold text-zinc-900 mt-0.5">
              Campaign Lifecycle & Regulatory Dossier
            </h3>
          </div>

          <span
            className={`text-[12px] font-semibold uppercase px-3 py-1 rounded-full ${
              campaign.status === "APPROVED"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : campaign.status === "UNDER_REVIEW"
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : campaign.status === "REJECTED"
                ? "bg-rose-100 text-rose-800 border border-rose-300"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {campaign.status.replace(/_/g, " ")}
          </span>
        </div>

        <p className="mt-2 text-[13px] text-zinc-600 leading-relaxed">
          Enforces the Nigerian financial compliance separation-of-duties mandate (CBN CPF §4.2, FCCPA §115, and ARCON ASP).
          Formal approvals bind strictly to an immutable revision.
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

      {/* SECTION 1: Formal Human Approval Certificate (When Approved) */}
      {isApproved && latestApproval && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h4 className="text-[14px] font-semibold text-emerald-900">
              Institutional Approval Certificate
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] pt-1">
            <div>
              <span className="text-zinc-500 font-medium">Deciding Officer:</span>
              <p className="font-mono text-zinc-800 mt-0.5">{latestApproval.approved_by}</p>
            </div>
            <div>
              <span className="text-zinc-500 font-medium">Approval Timestamp:</span>
              <p className="text-zinc-800 mt-0.5">
                {new Date(latestApproval.decided_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-[12.5px] border-t border-emerald-200/60 pt-2">
            <span className="text-zinc-500 font-medium">Sign-Off Justification:</span>
            <p className="text-zinc-800 mt-0.5 italic">{latestApproval.decision_reason}</p>
          </div>

          <div className="text-[11px] font-mono text-emerald-800 bg-white/80 border border-emerald-200 px-3 py-1.5 rounded">
            Approval ID: {latestApproval.id} • Bound to Revision #{currentRevisionNumber}
          </div>
        </div>
      )}

      {/* SECTION 2: Submit for Review Action (Marketing Role) */}
      {campaign.status !== "UNDER_REVIEW" && !isApproved && (
        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Send className="h-4 w-4 text-blue-600" />
            <h4 className="text-[14px] font-semibold text-zinc-900">
              Submit Campaign for Legal / CCO Sign-Off
            </h4>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
              Review Notes or Submission Justification (Optional):
            </label>
            <textarea
              rows={2}
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
              placeholder="e.g. All high-risk findings addressed in Revision #2. Ready for final pre-vetting."
              className="w-full rounded-lg border border-zinc-300 p-2.5 text-[13px] text-zinc-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmitReview}
            disabled={submittingReview}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submittingReview ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Submitting for Review...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Revision #{currentRevisionNumber} for CCO Review
              </>
            )}
          </button>
        </div>
      )}

      {/* Review In-Progress Notice */}
      {campaign.status === "UNDER_REVIEW" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[13px] text-amber-900">
            <p className="font-semibold">Campaign is currently Under Formal Compliance Review</p>
            <p className="mt-0.5 text-amber-800 text-[12px]">
              Notification dispatched to Legal Counsel and Chief Compliance Officer. Awaiting authorized decision.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: Formal Approval / Rejection Box (CCO / Legal Role) */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-700" />
            <h4 className="text-[14px] font-semibold text-zinc-900">
              Institutional Sign-Off Decision
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
            Restricted to Legal / CCO
          </span>
        </div>

        {/* Decision Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDecision("APPROVED")}
            className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[13px] font-medium transition-colors ${
              decision === "APPROVED"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Approve Campaign
          </button>

          <button
            type="button"
            onClick={() => setDecision("REJECTED")}
            className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[13px] font-medium transition-colors ${
              decision === "REJECTED"
                ? "border-rose-600 bg-rose-50 text-rose-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <XCircle className="h-4 w-4 text-rose-600" />
            Reject Campaign
          </button>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
            Legal Sign-Off Reason & Compliance Evidence Justification:
          </label>
          <textarea
            rows={2}
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            placeholder="e.g. Verified against FCCPC 2026 Sales Promotion Regulations and QuickCredit rate card truth."
            className="w-full rounded-lg border border-zinc-300 p-2.5 text-[13px] text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>

        {/* Conditions */}
        {decision === "APPROVED" && (
          <div className="space-y-2 rounded-lg bg-zinc-50 p-3 text-[12px] text-zinc-700 border border-zinc-200">
            <span className="font-semibold text-zinc-800 block mb-1">
              Statutory Pre-Publication Conditions:
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={conditionArcon}
                onChange={(e) => setConditionArcon(e.target.checked)}
                className="rounded border-zinc-300 text-blue-600 focus:ring-0"
              />
              <span>Must obtain ARCON ASP pre-vetting certificate prior to public broadcast</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={conditionAprVisibility}
                onChange={(e) => setConditionAprVisibility(e.target.checked)}
                className="rounded border-zinc-300 text-blue-600 focus:ring-0"
              />
              <span>Ensure APR and license disclosure are prominently legible on mobile viewports</span>
            </label>
          </div>
        )}

        <button
          onClick={handleRecordDecision}
          disabled={recordingDecision}
          className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white transition-colors cursor-pointer ${
            decision === "APPROVED"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-rose-600 hover:bg-rose-700"
          } disabled:opacity-50`}
        >
          {recordingDecision ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Recording Decision...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Confirm {decision} Decision for Revision #{currentRevisionNumber}
            </>
          )}
        </button>

        <p className="text-[11px] text-zinc-500 text-center">
          Note: If caller lacks the <code className="font-mono">approval.decide</code> permission, the server strictly returns 403.
        </p>
      </div>

      {/* SECTION 4: FCCPC Reg 32 & ARCON Statutory PDF Dossier */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h4 className="text-[14px] font-semibold text-zinc-900">
              Statutory Compliance Dossier (PDF)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
            FCCPC Reg. 32 / ARCON ASP
          </span>
        </div>

        <p className="text-[12.5px] text-zinc-600 leading-relaxed">
          Compiles an immutable regulatory audit package containing the full promotional copy, asset SHA-256 fingerprints,
          mechanical lock results, verbatim statutory provisions, and cryptographic approval seal into a 2-year auditable PDF.
        </p>

        <button
          onClick={handleGenerateDossier}
          disabled={generatingDossier}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
        >
          {generatingDossier ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Compiling Statutory PDF Dossier...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 text-zinc-600" />
              Generate Regulatory PDF Dossier
            </>
          )}
        </button>

        {dossierData && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-blue-700 uppercase tracking-wider block">
                  Compiled & Stored on Cloudflare R2
                </span>
                <span className="text-[13px] font-semibold text-zinc-900">
                  dossier_{dossierData.dossier_id.slice(0, 8)}.pdf ({(dossierData.file_size_bytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              <a
                href={dossierData.download_url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
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
      <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h4 className="text-[13px] font-semibold text-zinc-900">
            Audit Trail: Historical Reviews & Decisions ({approvals.length + reviews.length})
          </h4>
          {historyLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
        </div>

        {approvals.length === 0 && reviews.length === 0 ? (
          <p className="text-[12px] text-zinc-500 italic py-2">
            No formal review or sign-off events recorded yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {approvals.map((app) => (
              <div
                key={app.id}
                className="text-[12px] p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start justify-between"
              >
                <div>
                  <span
                    className={`font-semibold uppercase text-[11px] px-1.5 py-0.5 rounded ${
                      app.decision === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {app.decision}
                  </span>
                  <p className="text-zinc-700 mt-1">{app.decision_reason}</p>
                  <span className="text-[10.5px] text-zinc-400 block mt-0.5">
                    Decided by {app.approved_by} • {new Date(app.decided_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="text-[12px] p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start justify-between"
              >
                <div>
                  <span className="font-semibold uppercase text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    REVIEW SUBMITTED
                  </span>
                  {rev.review_comments && (
                    <p className="text-zinc-700 mt-1 italic">&ldquo;{rev.review_comments}&rdquo;</p>
                  )}
                  <span className="text-[10.5px] text-zinc-400 block mt-0.5">
                    Submitted by {rev.reviewer_id} • {new Date(rev.started_at).toLocaleString()}
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
