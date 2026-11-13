"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { DriftMonitorCard } from "@/components/drift-monitor/DriftMonitorCard";
import { DriftDiffViewer } from "@/components/drift-monitor/DriftDiffViewer";
import { CreateMonitorModal } from "@/components/drift-monitor/CreateMonitorModal";
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
  const [monitors, setMonitors] = useState<CampaignDriftMonitor[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriftMonitorStatus | "ALL">("ALL");

  const [activeDiffMonitor, setActiveDiffMonitor] = useState<CampaignDriftMonitor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkingMonitorId, setCheckingMonitorId] = useState<string | null>(null);

  // Fetch monitors
  const loadMonitors = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/marketing-shield/v1/drift-monitors");
      if (res.ok) {
        const json = await res.json();
        setMonitors(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch campaigns for monitor creation
  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing-shield/v1/campaigns");
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    loadCampaigns();
  }, [loadMonitors, loadCampaigns]);

  // Handle immediate check
  const handleCheckNow = async (monitorId: string) => {
    try {
      setCheckingMonitorId(monitorId);
      const res = await fetch(`/api/marketing-shield/v1/drift-monitors/${monitorId}/check`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setMonitors((prev) =>
          prev.map((m) => (m.id === monitorId ? json.data.monitor || m : m))
        );
        if (activeDiffMonitor?.id === monitorId) {
          setActiveDiffMonitor(json.data.monitor || activeDiffMonitor);
        }
      }
    } catch {
      // ignore
    } finally {
      setCheckingMonitorId(null);
    }
  };

  // Handle create monitor
  const handleCreateMonitor = async (input: CreateDriftMonitorInput) => {
    const res = await fetch(
      `/api/marketing-shield/v1/campaigns/${input.campaign_id}/drift-monitors`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Failed to create drift monitor");
    }

    const json = await res.json();
    setMonitors((prev) => [json.data, ...prev]);
  };

  // Handle delete
  const handleDeleteMonitor = async (monitorId: string) => {
    if (!confirm("Are you sure you want to stop monitoring this published URL?")) return;
    try {
      const res = await fetch(`/api/marketing-shield/v1/drift-monitors/${monitorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMonitors((prev) => prev.filter((m) => m.id !== monitorId));
        if (activeDiffMonitor?.id === monitorId) {
          setActiveDiffMonitor(null);
        }
      }
    } catch {
      // ignore
    }
  };

  // Filter monitors
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900">
              Post-Publication Drift Monitors
            </h1>
            <p className="text-[11px] text-zinc-500">
              Continuous live promotional URL snapshotting &amp; CCO alert dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/chat"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Return to Copilot</span>
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Link Published URL</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Monitored URLs</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{monitors.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Drift Detected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{driftCount}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Verified Compliant</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{compliantCount}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Controls: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "ALL"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              All ({monitors.length})
            </button>
            <button
              onClick={() => setStatusFilter("DRIFT_DETECTED")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "DRIFT_DETECTED"
                  ? "bg-white text-red-700 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Drift Detected ({driftCount})
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-700 shadow-2xs"
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
                className="pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
              />
            </div>
            <button
              onClick={loadMonitors}
              className="p-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors"
              title="Refresh Monitors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Monitors Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-500 bg-white rounded-xl border border-zinc-200">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
            <span>Loading post-publication drift monitors...</span>
          </div>
        ) : filteredMonitors.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white rounded-xl border border-zinc-200 space-y-3">
            <ShieldAlert className="h-8 w-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-semibold text-zinc-800">No Post-Publication Monitors Found</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Link an active promotional landing page to an approved campaign revision to start continuous compliance drift inspection.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
            >
              Link First Promotional URL
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
      </main>

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
    </div>
  );
}
