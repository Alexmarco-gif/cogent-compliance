"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  Layers,
  FileText,
  GitCompare,
  FileCheck2,
  X,
  RefreshCw,
  Check,
} from "lucide-react";
import { Tab1LocksOverview, type LockResult } from "./Tab1LocksOverview";
import { Tab2AssetBoundingBoxes, type ExtractionData } from "./Tab2AssetBoundingBoxes";
import { Tab3FindingsList } from "./Tab3FindingsList";
import { Tab4RemediationDiff } from "./Tab4RemediationDiff";
import { Tab5SignOffDossier } from "./Tab5SignOffDossier";
import { Finding } from "./FindingCard";

interface InspectorProps {
  campaign: {
    id: string;
    campaign_name: string;
    channel: string;
    status: string;
    risk_level: string;
    current_revision_id?: string;
    approved_revision_id?: string | null;
  } | null;
  assessment: {
    id: string;
    overall_risk_level: string;
    summary?: string;
    lockResults?: LockResult;
    created_at?: string;
  } | null;
  findings: Finding[];
  asset?: {
    id: string;
    original_filename: string;
    mime_type: string;
    storage_key?: string;
  } | null;
  extraction?: ExtractionData | null;
  isOpen: boolean;
  onClose: () => void;
  onEvidenceClick: (clauseId: string) => void;
  onRefresh?: () => void;
}

export const ContextualCampaignInspector: React.FC<InspectorProps> = ({
  campaign,
  assessment,
  findings,
  asset,
  extraction,
  isOpen,
  onClose,
  onEvidenceClick,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    "locks" | "assets" | "findings" | "remediation" | "signoff"
  >("locks");
  const [selectedFindingForRemediation, setSelectedFindingForRemediation] =
    useState<Finding | null>(null);

  if (!isOpen || !campaign) return null;

  return (
    <aside className="fixed inset-0 lg:static w-full lg:w-[46%] xl:w-[48%] max-w-[700px] shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col h-full z-30 lg:z-20 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3.5 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
              {campaign.channel}
            </span>
            <span
              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded border ${
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
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <Check className="w-3 h-3" />
              Saved
            </span>
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-950 truncate max-w-[440px]">
            {campaign.campaign_name}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Refresh review"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-zinc-200 bg-white px-6 gap-5 overflow-x-auto shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("locks")}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "locks"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Checks &amp; Risk
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "assets"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Flyer &amp; OCR
          {asset && <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("findings")}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "findings"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Findings
          {findings.length > 0 && (
            <span className="ml-0.5 rounded-full bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 text-[10.5px] font-semibold text-zinc-700">
              {findings.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("remediation")}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "remediation"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <GitCompare className="h-3.5 w-3.5" />
          Rewrites &amp; Diff
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("signoff")}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "signoff"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <FileCheck2 className="h-3.5 w-3.5" />
          Sign-Off &amp; Dossier
          {campaign.status === "APPROVED" && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Active Tab Panel */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "locks" && (
          <Tab1LocksOverview
            campaign={campaign}
            assessment={assessment}
            onSwitchTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "assets" && (
          <Tab2AssetBoundingBoxes
            asset={asset || null}
            extraction={extraction || null}
            onSegmentUpdated={onRefresh}
          />
        )}

        {activeTab === "findings" && (
          <Tab3FindingsList
            findings={findings}
            onEvidenceClick={onEvidenceClick}
            onRemediateClick={(finding) => {
              setSelectedFindingForRemediation(finding);
              setActiveTab("remediation");
            }}
          />
        )}

        {activeTab === "remediation" && (
          <Tab4RemediationDiff
            campaignId={campaign.id}
            findings={findings}
            selectedFinding={selectedFindingForRemediation}
            onRevisionCreated={onRefresh}
          />
        )}

        {activeTab === "signoff" && (
          <Tab5SignOffDossier
            campaign={campaign}
            onStatusUpdated={onRefresh}
          />
        )}
      </div>
    </aside>
  );
};
