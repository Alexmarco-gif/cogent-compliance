"use client";

import React, { useState } from "react";
import {
  Shield,
  Layers,
  FileCheck2,
  Wand2,
  ShieldCheck,
  X,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<"locks" | "assets" | "findings" | "remediation" | "signoff">("locks");
  const [selectedFindingForRemediation, setSelectedFindingForRemediation] = useState<Finding | null>(null);

  if (!isOpen || !campaign) return null;

  return (
    <aside className="w-full lg:w-[560px] xl:w-[640px] shrink-0 border-l border-zinc-200 bg-zinc-50/60 flex flex-col h-full z-20 overflow-hidden shadow-lg animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
              {campaign.channel}
            </span>
            <span
              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                campaign.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : campaign.status === "FINDINGS_AVAILABLE"
                  ? "bg-blue-100 text-blue-800"
                  : campaign.status === "UNDER_REVIEW"
                  ? "bg-amber-100 text-amber-800"
                  : campaign.status === "REJECTED"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {campaign.status.replace(/_/g, " ")}
            </span>
          </div>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-900 truncate max-w-[420px]">
            {campaign.campaign_name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Refresh Assessment"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-zinc-200 bg-white px-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("locks")}
          className={`flex items-center gap-2 border-b-2 py-3 px-2 text-[13.5px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "locks"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Shield className="h-4 w-4" />
          Locks & Risk
        </button>

        <button
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-[13.5px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "assets"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Flyer & OCR
          {asset && (
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("findings")}
          className={`flex items-center gap-2 border-b-2 py-3 px-2 text-[13.5px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "findings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Findings
          {findings.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.2 text-[11px] font-semibold text-zinc-700">
              {findings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("remediation")}
          className={`flex items-center gap-2 border-b-2 py-3 px-2 text-[13.5px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "remediation"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Wand2 className="h-4 w-4" />
          Remediation & Diff
        </button>

        <button
          onClick={() => setActiveTab("signoff")}
          className={`flex items-center gap-2 border-b-2 py-3 px-2 text-[13.5px] font-medium transition-colors shrink-0 cursor-pointer ${
            activeTab === "signoff"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Sign-Off & Dossier
          {campaign.status === "APPROVED" && (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
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
