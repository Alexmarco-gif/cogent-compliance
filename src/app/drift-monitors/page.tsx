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
import { DriftMonitorsSkeleton } from "@/components/shell/WorkspaceSkeletons";
import { DriftMonitorCard } from "@/components/drift-monitor/DriftMonitorCard";
import { DriftDiffViewer } from "@/components/drift-monitor/DriftDiffViewer";
import {
  CreateMonitorModal,
  CreateMonitorSubmission,
  ProductOption,
} from "@/components/drift-monitor/CreateMonitorModal";
import { extractApiError, unwrapApiList } from "@/lib/api-client";
import {
  CampaignDriftMonitor,
  DriftMonitorStatus,
} from "@/contracts/drift.contracts";

interface CampaignItem {
  id: string;
  title: string;
  status: string;
  approved_revision_id?: string | null;
}

interface RippleAlertItem {
  id: string;
  regulator: string;
  circular_title: string;
  impacted_product_name?: string | null;
  impacted_campaign_name?: string | null;
  incident_conversation_id?: string | null;
  blind_spot_summary: string;
  consequence_summary: string;
  recommended_fix: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  created_at: string;
}

export default function DriftMonitorsPage() {
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const [monitors, setMonitors] = useState<CampaignDriftMonitor[]>([]);
  const [rippleAlerts, setRippleAlerts] = useState<RippleAlertItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
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
      const res = await fetch("/api/marketing-shield/v1/campaigns?limit=50");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Unable to load campaigns list");
        setLoadError((prev) => prev || parsed.message);
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
      setLoadError((prev) => prev || "Unable to reach campaigns endpoint.");
    }
  }, [isSignedIn, orgId]);

  const loadProducts = useCallback(async () => {
    if (!isSignedIn || !orgId) return;
    try {
      const res = await fetch("/api/marketing-shield/v1/products?status=ACTIVE");
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        const list = unwrapApiList<Record<string, unknown>>(json);
        setProducts(
          list.map((p) => ({
            id: String(p.id),
            product_name: String(p.product_name || "Product"),
            product_type: String(p.product_type || "PRODUCT"),
          }))
        );
      }
    } catch {
      // Non-blocking
    }
  }, [isSignedIn, orgId]);

  const loadRippleAlerts = useCallback(async () => {
    if (!isSignedIn || !orgId) return;
    try {
      const res = await fetch("/api/marketing-shield/v1/ripple-alerts");
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data?.alerts)) {
        setRippleAlerts(json.data.alerts);
      }
    } catch {
      // Non-blocking
    }
  }, [isSignedIn, orgId]);

  useEffect(() => {
    if (!clerkLoaded) return;
    loadMonitors();
    loadCampaigns();
    loadProducts();
    loadRippleAlerts();
  }, [clerkLoaded, isSignedIn, orgId, loadMonitors, loadCampaigns, loadProducts, loadRippleAlerts]);

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
      setLoadError(null);
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

  const handleCreateMonitor = async (submission: CreateMonitorSubmission) => {
    let targetCampaignId = submission.mode === "existing" ? submission.campaign_id : "";

    if (submission.mode === "new") {
      const campRes = await fetch("/api/marketing-shield/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: submission.campaign_name,
          channel: "WEB_LANDING",
          campaign_type: "PROMOTIONAL",
          ...(submission.product_id ? { product_id: submission.product_id } : {}),
          ...(submission.baseline_copy ? { initial_content_text: submission.baseline_copy } : {}),
        }),
      });
      const campJson = await campRes.json().catch(() => ({}));
      if (!campRes.ok || campJson.success === false || !campJson.data?.id) {
        const parsed = extractApiError(
          campRes.status,
          campJson,
          "Failed to create URL baseline campaign"
        );
        throw new Error(parsed.message);
      }
      targetCampaignId = String(campJson.data.id);
      void loadCampaigns();
    }

    const res = await fetch(
      `/api/marketing-shield/v1/campaigns/${targetCampaignId}/drift-monitors`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          published_url: submission.published_url,
        }),
      }
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const parsed = extractApiError(res.status, json, "Failed to create drift monitor");
      throw new Error(parsed.message);
    }

    const createdMonitor = json.data as CampaignDriftMonitor;
    setMonitors((prev) => [createdMonitor, ...prev]);

    // Trigger immediate initial inspection so the user sees live scan results right away
    try {
      setCheckingMonitorId(createdMonitor.id);
      const checkRes = await fetch(
        `/api/marketing-shield/v1/drift-monitors/${createdMonitor.id}/check`,
        { method: "POST" }
      );
      const checkJson = await checkRes.json().catch(() => ({}));
      if (checkRes.ok && checkJson.success && checkJson.data?.monitor) {
        setLoadError(null);
        setMonitors((prev) =>
          prev.map((m) => (m.id === createdMonitor.id ? checkJson.data.monitor : m))
        );
      } else {
        const parsed = extractApiError(
          checkRes.status,
          checkJson,
          "Monitor created, but initial live URL check could not complete"
        );
        setLoadError(parsed.message);
      }
    } catch {
      setLoadError("Monitor created, but initial live URL check timed out or failed.");
    } finally {
      setCheckingMonitorId(null);
    }
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
                    className="pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-md text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
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
              <DriftMonitorsSkeleton />
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

            {/* Zero-Prompt Regulatory Ripple Alerts */}
            {rippleAlerts.length > 0 && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950">
                      Zero-Prompt Regulatory Ripple Alerts ({rippleAlerts.length})
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Automatic cross-checks of new CBN, FCCPC, ARCON, NDPC & SEC circulars against your Product Rate Cards.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {rippleAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white">
                            {alert.regulator}
                          </span>
                          <span className="text-xs font-semibold text-zinc-950">
                            {alert.circular_title}
                          </span>
                          {alert.impacted_product_name && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Impacts: {alert.impacted_product_name}
                            </span>
                          )}
                        </div>
                        {alert.incident_conversation_id && (
                          <Link
                            href={`/chat?conversationId=${alert.incident_conversation_id}`}
                            className="text-xs font-medium text-zinc-900 hover:underline shrink-0"
                          >
                            Open Incident Audit →
                          </Link>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5">
                          <p className="font-semibold text-zinc-900 mb-0.5">
                            1. What You Missed (Blind Spot)
                          </p>
                          <p className="text-zinc-600 leading-relaxed">
                            {alert.blind_spot_summary}
                          </p>
                        </div>
                        <div className="rounded-lg bg-rose-50/60 border border-rose-200 p-2.5">
                          <p className="font-semibold text-rose-900 mb-0.5">
                            2. What It Costs You (Consequence)
                          </p>
                          <p className="text-rose-800 leading-relaxed">
                            {alert.consequence_summary}
                          </p>
                        </div>
                        <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-2.5">
                          <p className="font-semibold text-emerald-900 mb-0.5">
                            3. One-Click Resolution (Fix)
                          </p>
                          <p className="text-emerald-800 leading-relaxed">
                            {alert.recommended_fix}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
          products={products}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateMonitor}
        />
      )}
    </WorkspaceShell>
  );
}
