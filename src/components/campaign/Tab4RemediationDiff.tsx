/**
 * Cogent Marketing Shield - Tab 4: Remediation, Layer 6 Validation & Revision Diff
 * Document Reference: Document 04 (Section 5.1–5.3), Document 05 (Section 7.1), Document 06, Document 08 (Phase 8)
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Finding } from "./FindingCard";
import {
  REWRITE_TONES,
  RewriteTone,
  RewriteSuggestion,
  CompareRevisionsResponse,
} from "@/contracts/remediation.contracts";
import {
  Wand2,
  GitCompare,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Sparkles,
} from "lucide-react";

export interface CampaignRevisionItem {
  id: string;
  revision_number: number;
  content_text: string;
  change_summary?: string;
  revision_source?: string;
  created_at: string;
}

interface Tab4Props {
  campaignId: string;
  currentRevisionId?: string;
  findings: Finding[];
  selectedFinding?: Finding | null;
  onRevisionCreated?: () => void;
}

export const Tab4RemediationDiff: React.FC<Tab4Props> = ({
  campaignId,
  findings,
  selectedFinding,
  onRevisionCreated,
}) => {
  // Revisions & Diff State
  const [revisions, setRevisions] = useState<CampaignRevisionItem[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [fromRevId, setFromRevId] = useState<string>("");
  const [toRevId, setToRevId] = useState<string>("");
  const [diffData, setDiffData] = useState<CompareRevisionsResponse | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  // Remediation / AI Rewrite State
  const [activeFinding, setActiveFinding] = useState<Finding | null>(selectedFinding || null);
  const [tone, setTone] = useState<RewriteTone>("PROFESSIONAL");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatingRewrite, setGeneratingRewrite] = useState(false);
  const [suggestion, setSuggestion] = useState<RewriteSuggestion | null>(null);
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [manualText, setManualText] = useState("");
  const [savingRevision, setSavingRevision] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch all revisions for this campaign
  const fetchRevisions = useCallback(async () => {
    if (!campaignId) return;
    setLoadingRevisions(true);
    try {
      const res = await fetch(`/api/marketing-shield/v1/campaigns/${campaignId}/revisions`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRevisions(json.data);
        if (json.data.length >= 2) {
          setFromRevId(json.data[json.data.length - 2].id);
          setToRevId(json.data[json.data.length - 1].id);
        } else if (json.data.length === 1) {
          setFromRevId(json.data[0].id);
          setToRevId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load revisions", err);
    } finally {
      setLoadingRevisions(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  // Sync selectedFinding prop
  useEffect(() => {
    if (selectedFinding) {
      setActiveFinding(selectedFinding);
    } else if (findings.length > 0 && !activeFinding) {
      setActiveFinding(findings[0] ?? null);
    }
  }, [selectedFinding, findings, activeFinding]);

  // 2. Fetch revision diff when fromRevId & toRevId change
  const fetchDiff = useCallback(async () => {
    if (!campaignId || !fromRevId || !toRevId || fromRevId === toRevId) {
      setDiffData(null);
      return;
    }
    setLoadingDiff(true);
    try {
      const res = await fetch(
        `/api/marketing-shield/v1/campaigns/${campaignId}/revisions/compare?from_revision_id=${fromRevId}&to_revision_id=${toRevId}`,
      );
      const json = await res.json();
      if (json.success) {
        setDiffData(json.data);
      }
    } catch (err) {
      console.error("Failed to compare revisions", err);
    } finally {
      setLoadingDiff(false);
    }
  }, [campaignId, fromRevId, toRevId]);

  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  // 3. Trigger AI Rewrite Generation & Layer 6 Validation
  const handleGenerateRewrite = async () => {
    if (!activeFinding) return;
    setGeneratingRewrite(true);
    setErrorMessage(null);
    setSuggestion(null);

    try {
      const res = await fetch(
        `/api/marketing-shield/v1/findings/${activeFinding.id}/rewrite-suggestions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tone,
            custom_instructions: customInstructions || undefined,
          }),
        },
      );
      const json = await res.json();
      if (json.success) {
        setSuggestion(json.data);
        setManualText(json.data.proposed_text);
      } else {
        setErrorMessage(json.error?.message || "Failed to generate rewrite suggestion.");
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setGeneratingRewrite(false);
    }
  };

  // 4. Accept Rewrite and Create New Immutable Revision
  const handleAcceptAndSaveRevision = async () => {
    if (!suggestion && !isEditingManually) return;
    const currentRev = revisions[revisions.length - 1];
    if (!currentRev) return;

    const finalText = isEditingManually ? manualText : suggestion?.proposed_text || manualText;
    if (!finalText.trim()) return;

    setSavingRevision(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/marketing-shield/v1/campaigns/${campaignId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_revision_id: currentRev.id,
          content_text: finalText,
          revision_source: isEditingManually ? "USER_EDIT" : "AI_REWRITE_ACCEPTED",
          change_summary: `Remediated finding "${activeFinding?.title || "compliance violation"}" with Layer 6 validation.`,
          auto_reassess: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(
          `Revision #${json.data.revision.revision_number} successfully created! Autonomous reassessment initiated.`,
        );
        setSuggestion(null);
        setIsEditingManually(false);
        await fetchRevisions();
        if (onRevisionCreated) {
          onRevisionCreated();
        }
      } else {
        setErrorMessage(json.error?.message || "Failed to save campaign revision.");
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setSavingRevision(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">
            Layer 6 Rewrite Safety
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Immutable Versioning
          </span>
        </div>
        <h3 className="text-[16px] font-semibold text-zinc-900 mt-1">
          Remediation & Revision Diff
        </h3>
        <p className="text-[13px] text-zinc-600 mt-0.5">
          Propose compliant copy alternatives verified against product truth, and review side-by-side revision diffs.
        </p>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-[13px] text-red-800 flex items-start gap-2">
          <AlertOctagon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[13px] text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {/* SECTION A: Controlled Remediation Engine */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-blue-600" />
            <h4 className="text-[14px] font-semibold text-zinc-900">
              Propose Compliant Rewrite
            </h4>
          </div>
          {activeFinding && (
            <span className="font-mono text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
              {activeFinding.finding_code}
            </span>
          )}
        </div>

        {/* Finding Selector */}
        {findings.length > 0 ? (
          <div>
            <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
              Select Finding to Remediate:
            </label>
            <select
              value={activeFinding?.id || ""}
              onChange={(e) => {
                const found = findings.find((f) => f.id === e.target.value);
                setActiveFinding(found || null);
                setSuggestion(null);
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:border-blue-500 focus:outline-hidden"
            >
              {findings.map((f) => (
                <option key={f.id} value={f.id}>
                  [{f.severity}] {f.title} ({f.finding_code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-lg bg-zinc-50 p-4 text-center text-[13px] text-zinc-500 border border-zinc-200">
            No active compliance findings detected on this campaign.
          </div>
        )}

        {/* Tone Selector & Custom Instructions */}
        {activeFinding && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                Target Rewrite Tone:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REWRITE_TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border text-center transition-colors ${
                      tone === t
                        ? "bg-blue-600 text-white border-blue-600 font-semibold"
                        : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {t.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                Custom Instructions (Optional):
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Keep under 160 characters for SMS broadcast with CBN license"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleGenerateRewrite}
              disabled={generatingRewrite}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {generatingRewrite ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating & Running Layer 6 Validation...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Generate Compliant Rewrite
                </>
              )}
            </button>
          </div>
        )}

        {/* SECTION B: Layer 6 Validation & Suggestion Outcome */}
        {suggestion && (
          <div className="mt-4 pt-4 border-t border-zinc-200 space-y-4 animate-in fade-in duration-200">
            {/* Layer 6 Validation Banner */}
            <div
              className={`rounded-lg border p-4 text-[13px] ${
                suggestion.layer_6_validation.validation_status === "PASSED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {suggestion.layer_6_validation.validation_status === "PASSED" ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Layer 6 Rewrite Safety: PASSED
                  </>
                ) : (
                  <>
                    <AlertOctagon className="h-4 w-4 text-red-600" />
                    Layer 6 Rewrite Safety: REJECTED (Unsafe Suggestion)
                  </>
                )}
              </div>

              {suggestion.layer_6_validation.validation_status === "PASSED" ? (
                <p className="mt-1 text-[12.5px] text-emerald-700 leading-snug">
                  Original breach resolved. No prohibited lexicon introduced. Advertised rates and fees match approved product truth. Mandatory statutory disclosures preserved.
                </p>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-[12px] font-medium text-red-800">
                    The proposed rewrite failed deterministic mechanical locks:
                  </p>
                  <ul className="list-disc list-inside text-[12px] text-red-700 space-y-0.5">
                    {suggestion.layer_6_validation.failure_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Side-by-Side Comparison Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg bg-red-50/50 border border-red-100 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
                  Original Non-Compliant Claim:
                </span>
                <p className="mt-1.5 text-[13px] font-mono text-red-900 leading-relaxed">
                  {suggestion.original_text}
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Proposed Compliant Copy:
                  </span>
                  <button
                    onClick={() => setIsEditingManually(!isEditingManually)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    {isEditingManually ? "Done Editing" : "Edit Copy"}
                  </button>
                </div>

                {isEditingManually ? (
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    rows={4}
                    className="mt-1.5 w-full rounded border border-emerald-300 bg-white p-2 text-[13px] font-mono text-zinc-900 focus:outline-hidden"
                  />
                ) : (
                  <p className="mt-1.5 text-[13px] font-mono text-emerald-950 leading-relaxed">
                    {manualText || suggestion.proposed_text}
                  </p>
                )}
              </div>
            </div>

            {/* Explanation Note */}
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-[12.5px] text-zinc-700">
              <span className="font-semibold text-zinc-900">Remediation Rationale: </span>
              {suggestion.explanation}
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleAcceptAndSaveRevision}
                disabled={
                  savingRevision ||
                  (suggestion.layer_6_validation.validation_status === "FAILED" && !isEditingManually)
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingRevision ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating Revision...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept & Save as Revision #{revisions.length + 1}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION C: Revision Diff & Progression Viewer */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-zinc-700" />
            <h4 className="text-[14px] font-semibold text-zinc-900">
              Revision Comparison & Resolution Ledger
            </h4>
          </div>
          {revisions.length > 0 && (
            <span className="text-[11.5px] font-mono text-zinc-500">
              {revisions.length} Total {revisions.length === 1 ? "Revision" : "Revisions"}
            </span>
          )}
        </div>

        {/* Revision Selectors */}
        {loadingRevisions ? (
          <div className="flex items-center justify-center p-4 text-zinc-500 text-[13px]">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading revisions...
          </div>
        ) : revisions.length >= 2 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Base Revision (From):
              </label>
              <select
                value={fromRevId}
                onChange={(e) => setFromRevId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[12.5px] font-medium text-zinc-800"
              >
                {revisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Revision #{r.revision_number} ({new Date(r.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Target Revision (To):
              </label>
              <select
                value={toRevId}
                onChange={(e) => setToRevId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[12.5px] font-medium text-zinc-800"
              >
                {revisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Revision #{r.revision_number} ({new Date(r.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-zinc-50 p-4 text-center text-[13px] text-zinc-500 border border-zinc-200">
            {revisions.length === 1
              ? "Campaign is currently at Revision #1. Accept an AI rewrite above to produce Revision #2 and unlock side-by-side comparison."
              : "No revisions recorded for this campaign."}
          </div>
        )}

        {/* Diff & Resolution Badges */}
        {loadingDiff && (
          <div className="flex items-center justify-center p-6 text-zinc-500 text-[13px]">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Computing word diff and finding resolutions...
          </div>
        )}

        {diffData && (
          <div className="space-y-4 pt-2">
            {/* Resolution Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
                  Resolved Violations
                </span>
                <div className="text-[18px] font-bold text-emerald-900 mt-0.5">
                  ✓ {diffData.resolved_findings_count}
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-center">
                <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
                  Remaining Open
                </span>
                <div className="text-[18px] font-bold text-zinc-900 mt-0.5">
                  {diffData.remaining_findings_count}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
                  Lock Breach Delta
                </span>
                <div className="text-[18px] font-bold text-blue-900 mt-0.5">
                  {diffData.locks_comparison.breaches_delta <= 0
                    ? `${diffData.locks_comparison.breaches_delta}`
                    : `+${diffData.locks_comparison.breaches_delta}`}
                </div>
              </div>
            </div>

            {/* Word-Level Diff Box */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Visual Word Diff (Red: Removed, Green: Added)
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-zinc-200/80 font-mono text-[13px] leading-relaxed text-zinc-800 break-words whitespace-pre-wrap">
                {diffData.text_diff.map((seg, idx) => {
                  if (seg.type === "removed") {
                    return (
                      <span
                        key={idx}
                        className="bg-red-100/90 text-red-900 line-through decoration-red-600 font-semibold px-1 rounded mr-0.5"
                      >
                        {seg.value}
                      </span>
                    );
                  }
                  if (seg.type === "added") {
                    return (
                      <span
                        key={idx}
                        className="bg-emerald-100/90 text-emerald-950 font-semibold px-1 rounded mr-0.5"
                      >
                        {seg.value}
                      </span>
                    );
                  }
                  return <span key={idx}>{seg.value}</span>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
