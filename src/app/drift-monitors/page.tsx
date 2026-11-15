"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Plus,
  RefreshCw,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DriftMonitorCard } from "@/components/drift-monitor/DriftMonitorCard";
import { DriftDiffViewer } from "@/components/drift-monitor/DriftDiffViewer";
import { CreateMonitorModal } from "@/components/drift-monitor/CreateMonitorModal";
import { extractApiError, unwrapApiList } from "@/lib/api-client";
import {
  CampaignDriftMonitor,
  CreateDriftMonitorInput,
  DriftMonitorStatus,
} from "@/contracts/drift.contracts";

interface CampaignItem {
  id: string;
  title: string;
  status: string;
  approved_revision_id?: string | null;
}

export default function DriftMonitorsPage() {
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const [monitors, setMonitors] = useState<CampaignDriftMonitor[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriftMonitorStatus | "ALL">("ALL");

  const [activeDiffMonitor, setActiveDiffMonitor] = useState<CampaignDriftMonitor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkingMonitorId, setCheckingMonitorId] = useState<string | null>(null);

  const loadMonitors = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setIsLoading(false);
      setLoadError(null);
      setErrorStatus(null);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch("/api/marketing-shield/v1/drift-monitors");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Unable to load drift monitors");
        setErrorStatus(parsed.status);
        setLoadError(parsed.message);
        return;
      }
      setMonitors(unwrapApiList<CampaignDriftMonitor>(json));
      setLoadError(null);
      setErrorStatus(null);
    } catch {
      setLoadError("Unable to reach drift monitor endpoint.");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, orgId]);

  const loadCampaigns = useCallback(async () => {
    if (!isSignedIn || !orgId) return;
    try {
      const res = await fetch("/api/marketing-shield/v1/campaigns");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        return;
      }
      const rawCampaigns = unwrapApiList<Record<string, unknown>>(json, "campaigns");
      setCampaigns(
        rawCampaigns.map((c) => ({
          id: String(c.id),
          title: String(c.campaign_name || c.title || "Untitled Campaign"),
          status: String(c.status || "DRAFT"),
          approved_revision_id: (c.approved_revision_id as string | null) ?? null,
        }))
      );
    } catch {
      // Secondary dropdown list failure handled cleanly in modal
    }
  }, [isSignedIn, orgId]);

  useEffect(() => {
    if (!clerkLoaded) return;
    loadMonitors();
    loadCampaigns();
  }, [clerkLoaded, isSignedIn, orgId, loadMonitors, loadCampaigns]);

  const handleCheckNow = async (monitorId: string) => {
    try {
      setCheckingMonitorId(monitorId);
      const res = await fetch(`/api/marketing-shield/v1/drift-monitors/${monitorId}/check`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Failed to check drift monitor");
        setLoadError(parsed.message);
        return;
      }
      setMonitors((prev) =>
        prev.map((m) => (m.id === monitorId ? json.data?.monitor || m : m))
      );
      if (activeDiffMonitor?.id === monitorId) {
        setActiveDiffMonitor(json.data?.monitor || activeDiffMonitor);
      }
    } catch {
      setLoadError("Network error while checking drift monitor.");
    } finally {
      setCheckingMonitorId(null);
    }
  };

  const handleCreateMonitor = async (input: CreateDriftMonitorInput) => {
    const res = await fetch(
      `/api/marketing-shield/v1/campaigns/${input.campaign_id}/drift-monitors`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const parsed = extractApiError(res.status, json, "Failed to create drift monitor");
      throw new Error(parsed.message);
    }

    setMonitors((prev) => [json.data, ...prev]);
  };

  const handleDeleteMonitor = async (monitorId: string) => {
    if (!confirm("Stop monitoring this published URL?")) return;
    try {
      const res = await fetch(`/api/marketing-shield/v1/drift-monitors/${monitorId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Failed to delete drift monitor");
        setLoadError(parsed.message);
        return;
      }
      setMonitors((prev) => prev.filter((m) => m.id !== monitorId));
      if (activeDiffMonitor?.id === monitorId) {
        setActiveDiffMonitor(null);
      }
    } catch {
      setLoadError("Network error while deleting drift monitor.");
    }
  };

  const filteredMonitors = monitors.filter((m) => {
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      m.published_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.campaign_title && m.campaign_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const driftCount = monitors.filter((m) => m.status === "DRIFT_DETECTED").length;
  const compliantCount = monitors.filter((m) => m.status === "ACTIVE").length;

  const rightActions =
    isSignedIn && orgId ? (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Link URL</span>
      </button>
    ) : null;

  return (
    <WorkspaceShell section="Governance" title="Drift Monitors" rightActions={rightActions}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Drift Monitors
          </h1>
          <p className="text-sm text-zinc-500">
            Track live landing pages against approved campaign revisions.
          </p>
        </div>

        {clerkLoaded && !isSignedIn ? (
          <div className="p-10 text-center bg-white border border-dashed border-zinc-200 rounded-xl space-y-2.5">
            <Globe className="h-7 w-7 mx-auto text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900">Sign in to manage drift monitors</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Monitor live campaign pages for unauthorized edits after approval.
            </p>
            <div className="pt-1">
              <Link
                href="/sign-in"
                className="inline-flex items-center px-4 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : clerkLoaded && isSignedIn && !orgId ? (
          <div className="p-10 text-center bg-white border border-dashed border-zinc-200 rounded-xl space-y-2">
            <Globe className="h-7 w-7 mx-auto text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900">Select an organization workspace</p>
            <p className="text-xs text-zinc-500">
              Choose or create an organization in the sidebar to manage drift monitors.
            </p>
          </div>
        ) : (
          <>
            {loadError && (
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{loadError}</span>
                </div>
                {errorStatus === 401 ? (
                  <Link
                    href="/sign-in"
                    className="px-3 py-1 rounded-md bg-zinc-900 text-white font-medium hover:bg-zinc-800 shrink-0"
                  >
                    Sign in
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={loadMonitors}
                    className="px-3 py-1 rounded-md border border-rose-200 bg-white text-rose-800 font-medium hover:bg-rose-50 shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Monitored URLs</p>
                  <p className="text-2xl font-semibold text-zinc-950 mt-1 tabular-nums">
                    {monitors.length}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600">
                  <Activity className="h-4 w-4" />
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Drift Detected</p>
                  <p className="text-2xl font-semibold text-rose-700 mt-1 tabular-nums">
                    {driftCount}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Verified Compliant</p>
                  <p className="text-2xl font-semibold text-emerald-700 mt-1 tabular-nums">
                    {compliantCount}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Controls: Search & Status Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200 text-xs w-fit">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-white text-zinc-950 border border-zinc-200/80"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  All ({monitors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("DRIFT_DETECTED")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === "DRIFT_DETECTED"
                      ? "bg-white text-rose-700 border border-zinc-200/80"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Drift ({driftCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === "ACTIVE"
                      ? "bg-white text-emerald-700 border border-zinc-200/80"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Compliant ({compliantCount})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search URL or campaign..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadMonitors}
                  className="p-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors cursor-pointer"
                  title="Refresh Monitors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Monitors Grid */}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-zinc-500 bg-white rounded-xl border border-zinc-200">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-zinc-400" />
                <span>Loading drift monitors...</span>
              </div>
            ) : filteredMonitors.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 bg-white rounded-xl border border-zinc-200 space-y-3">
                <Globe className="h-7 w-7 text-zinc-300 mx-auto" />
                <p className="text-sm font-semibold text-zinc-900">No monitors configured</p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Link a published campaign URL to monitor it against its approved revision.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Link Published URL
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMonitors.map((m) => (
                  <DriftMonitorCard
                    key={m.id}
                    monitor={m}
                    onInspect={(mon) => setActiveDiffMonitor(mon)}
                    onCheck={handleCheckNow}
                    onDelete={handleDeleteMonitor}
                    isChecking={checkingMonitorId === m.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Side-by-Side Diff Viewer Modal */}
      {activeDiffMonitor && (
        <DriftDiffViewer
          monitor={activeDiffMonitor}
          onClose={() => setActiveDiffMonitor(null)}
          onRecheck={() => handleCheckNow(activeDiffMonitor.id)}
          isChecking={checkingMonitorId === activeDiffMonitor.id}
        />
      )}

      {/* Link Published URL Modal */}
      {isModalOpen && (
        <CreateMonitorModal
          campaigns={campaigns}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateMonitor}
        />
      )}
    </WorkspaceShell>
  );
}
