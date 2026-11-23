"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowRight,
  Layers,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import {
  NewFeatureModal,
  type CreateFeatureFormPayload,
} from "@/components/feature-governance/NewFeatureModal";
import { FeatureDetailWorkspace } from "@/components/feature-governance/FeatureDetailWorkspace";
import type { ProductFeatureRecord } from "@/contracts/feature-governance.contracts";
import type { FeatureDossier } from "@/modules/feature-governance/feature-governance.service";
import { extractApiError } from "@/lib/api-client";

function FeatureGovernanceContent() {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const searchParams = useSearchParams();
  const initialFeatureId = searchParams.get("featureId");

  const [features, setFeatures] = useState<ProductFeatureRecord[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<FeatureDossier | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadFeatures = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    try {
      const res = await fetch("/api/marketing-shield/v1/features", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const parsed = extractApiError(res.status, json, "Failed to load governed product features.");
        setError(parsed.message);
        return;
      }
      setFeatures((json.data?.features || []) as ProductFeatureRecord[]);
      setError(null);
    } catch {
      setError("Unable to reach Feature Governance API.");
    } finally {
      setLoadingList(false);
    }
  }, [isSignedIn, orgId]);

  const openFeature = useCallback(async (featureId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/features/${featureId}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.feature) {
        const parsed = extractApiError(res.status, json, "Failed to load feature dossier.");
        setError(parsed.message);
        return;
      }
      setSelectedDossier(json.data as FeatureDossier);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    void loadFeatures();
  }, [isLoaded, loadFeatures]);

  useEffect(() => {
    if (initialFeatureId && isSignedIn && orgId) {
      void openFeature(initialFeatureId);
    }
  }, [initialFeatureId, isSignedIn, orgId, openFeature]);

  const handleCreateFeature = async (payload: CreateFeatureFormPayload) => {
    const res = await fetch("/api/marketing-shield/v1/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success || !json.data?.feature) {
      const parsed = extractApiError(res.status, json, "Failed to create feature proposal.");
      throw new Error(parsed.message);
    }
    const dossier = json.data as FeatureDossier;
    setFeatures((prev) => [dossier.feature, ...prev]);
    setSelectedDossier(dossier);
  };

  const approvedCount = features.filter(
    (f) => f.gate_status === "APPROVED" || f.gate_status === "CONDITIONALLY_APPROVED"
  ).length;
  const pendingGateCount = features.filter((f) => f.gate_status === "PENDING_GATE").length;
  const criticalCount = features.filter((f) => f.materiality_tier === "CRITICAL").length;

  const rightActions =
    isSignedIn && orgId ? (
      <div className="flex items-center gap-2">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-medium"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8]" />
          <span>AI Structuring Pack</span>
        </Link>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B1220] hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Feature Proposal</span>
        </button>
      </div>
    ) : null;

  return (
    <WorkspaceShell section="Governance" title="Feature Governance" rightActions={rightActions}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {loadingDetail ? (
          <div className="flex items-center justify-center py-20 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Loading feature governance dossier...</span>
          </div>
        ) : selectedDossier ? (
          <FeatureDetailWorkspace
            dossier={selectedDossier}
            onBack={() => {
              setSelectedDossier(null);
              void loadFeatures();
            }}
            onDossierUpdated={(next) => {
              setSelectedDossier(next);
              setFeatures((prev) =>
                prev.map((item) => (item.id === next.feature.id ? next.feature : item))
              );
            }}
          />
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#1D4ED8] border border-blue-200">
                  Three Lines of Defence · 9-Stage NPA Lifecycle
                </span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                Product Feature Governance &amp; Launch Readiness
              </h1>
              <p className="text-sm text-zinc-500 max-w-3xl">
                Structure fintech features end-to-end: Materiality Classification, Multi-Domain RIA (CBN/NFIU/NDPC/FCCPC), Risk &amp; Control Matrix, Compliance-to-Build specs, Non-Overridable Launch Gates, Post-Implementation Reviews, and Regulatory Ripple Impact Mapping.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Governed Features</div>
                <div className="text-2xl font-semibold text-zinc-950 mt-1">{features.length}</div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Pending Launch Gate</div>
                <div className="text-2xl font-semibold text-amber-700 mt-1">{pendingGateCount}</div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Approved / Live</div>
                <div className="text-2xl font-semibold text-emerald-700 mt-1">{approvedCount}</div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase text-zinc-400">Critical Materiality</div>
                <div className="text-2xl font-semibold text-rose-700 mt-1">{criticalCount}</div>
              </div>
            </div>

            {/* Feature Registry List */}
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading feature governance registry...</span>
              </div>
            ) : features.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-10 text-center space-y-3">
                <Layers className="h-8 w-8 mx-auto text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900">
                  No product features in governance yet
                </h2>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Start with a Stage 1 Feature Proposal (or promote a generated Full Feature Structuring Pack from the Chat Studio) to auto-generate your Multi-Domain RIA, Risk &amp; Control Matrix, Compliance-to-Build specs, and 10-Point Launch Gate.
                </p>
                <div className="pt-1 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1220] hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Feature Proposal</span>
                  </button>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-[#1D4ED8]" />
                    <span>Draft Pack in Copilot</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {features.map((feat) => (
                  <div
                    key={feat.id}
                    onClick={() => void openFeature(feat.id)}
                    className="bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl p-4 sm:p-5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white">
                          {feat.feature_code}
                        </span>
                        <span className="text-sm font-semibold text-zinc-950 truncate">
                          {feat.feature_name}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                          {feat.change_classification.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          {feat.materiality_tier}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">{feat.summary}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-500">
                        <span>Stage: {feat.lifecycle_stage.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>Regulators: {(feat.applicable_regulators || []).join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-zinc-950">
                          <Lock className="h-3.5 w-3.5 text-zinc-500" />
                          <span>
                            {feat.readiness_score_numerator}/{feat.readiness_score_denominator}
                          </span>
                        </div>
                        <div className="text-[10.5px] font-mono text-zinc-500">
                          {feat.gate_status.replace(/_/g, " ")}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <NewFeatureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateFeature}
      />
    </WorkspaceShell>
  );
}

export default function FeatureGovernancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-zinc-500">
          Loading Feature Governance...
        </div>
      }
    >
      <FeatureGovernanceContent />
    </Suspense>
  );
}
