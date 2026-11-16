"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Save, Bell, Activity } from "lucide-react";
import { DRIFT_FREQUENCIES } from "@/contracts/settings.contracts";
import type { WorkspaceSettingsData } from "./types";

interface CompliancePolicyTabProps {
  workspace: WorkspaceSettingsData | null;
  onUpdated: (updated: WorkspaceSettingsData) => void;
}

export function CompliancePolicyTab({ workspace, onUpdated }: CompliancePolicyTabProps) {
  const [enforceDualControl, setEnforceDualControl] = useState(true);
  const [ccoAlertEmail, setCcoAlertEmail] = useState("");
  const [defaultFrequency, setDefaultFrequency] =
    useState<(typeof DRIFT_FREQUENCIES)[number]>("DAILY");
  const [autoIncidentThread, setAutoIncidentThread] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!workspace) return;
    setEnforceDualControl(workspace.compliancePolicy.enforce_dual_control_approval);
    setCcoAlertEmail(workspace.compliancePolicy.cco_alert_email || "");
    setDefaultFrequency(workspace.compliancePolicy.default_drift_frequency || "DAILY");
    setAutoIncidentThread(workspace.compliancePolicy.auto_create_drift_incident_thread);
  }, [workspace]);

  const canManage = workspace?.canManageWorkspace ?? false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compliance_policy: {
            enforce_dual_control_approval: enforceDualControl,
            cco_alert_email: ccoAlertEmail.trim(),
            default_drift_frequency: defaultFrequency,
            auto_create_drift_incident_thread: autoIncidentThread,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to save compliance policy.",
        });
        return;
      }
      onUpdated(json.data);
      setFeedback({
        type: "success",
        text: "Compliance governance & alert settings updated.",
      });
    } catch {
      setFeedback({ type: "error", text: "Network error updating compliance policy." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {!canManage && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Only a <strong>Chief Compliance Officer</strong> or <strong>Workspace Admin</strong> can modify institutional compliance policies.
          </span>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Governance & Sign-off Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Approval Separation &amp; Dual Control
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enforced server-side during campaign Sign-Off &amp; Dossier finalization.
          </p>
        </div>

        <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-zinc-200 bg-zinc-50/50 cursor-pointer">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-zinc-950">
              Enforce Dual-Control Anti-Self-Approval
            </div>
            <p className="text-[11.5px] text-zinc-600 leading-relaxed">
              Prohibits the author of a campaign revision from issuing the final approval on their own revision. Disable only for solo evaluator testing.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enforceDualControl}
            disabled={!canManage}
            onChange={(e) => setEnforceDualControl(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0"
          />
        </label>
      </div>

      {/* Alert Routing & Drift Defaults */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zinc-700" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Compliance Alerts &amp; Drift Defaults
            </h3>
            <p className="text-xs text-zinc-500">
              Configure where review escalation notices and URL drift breach alerts are sent.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              CCO / Legal Escalation Email
            </label>
            <input
              type="email"
              value={ccoAlertEmail}
              disabled={!canManage}
              onChange={(e) => setCcoAlertEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
              placeholder="compliance@yourbank.com"
            />
            <p className="text-[11px] text-zinc-500">
              Receives review submissions and live URL drift breach notifications.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Default URL Drift Inspection Cadence
            </label>
            <div className="relative">
              <Activity className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={defaultFrequency}
                disabled={!canManage}
                onChange={(e) =>
                  setDefaultFrequency(e.target.value as (typeof DRIFT_FREQUENCIES)[number])
                }
                className="w-full pl-9 pr-3 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
              >
                <option value="HOURLY">Hourly (High-Risk Promos)</option>
                <option value="DAILY">Daily (Standard)</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MANUAL">Manual Checks Only</option>
              </select>
            </div>
          </div>
        </div>

        <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-zinc-200 bg-zinc-50/50 cursor-pointer">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-zinc-950">
              Auto-Open Incident Conversation on Drift Breach
            </div>
            <p className="text-[11.5px] text-zinc-600">
              Automatically creates an incident remediation thread in the Copilot workspace whenever a monitored landing page drifts.
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoIncidentThread}
            disabled={!canManage}
            onChange={(e) => setAutoIncidentThread(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0"
          />
        </label>

        {canManage && (
          <div className="pt-2 flex justify-end border-t border-zinc-100">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving..." : "Save Compliance Policy"}</span>
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
