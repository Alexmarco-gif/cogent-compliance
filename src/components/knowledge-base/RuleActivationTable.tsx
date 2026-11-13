"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Filter,
  Check,
} from "lucide-react";
import type {
  MarketingKnowledgeRule,
  KnowledgeRuleType,
} from "@/contracts/knowledge-product.contracts";

export function RuleActivationTable() {
  const [rules, setRules] = useState<MarketingKnowledgeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [rbacNotice, setRbacNotice] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("rule_type", typeFilter);

      const res = await fetch(`/api/marketing-shield/v1/knowledge-base/rules?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load knowledge rules");
      const data = await res.json();
      setRules(data || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleActivate = async (ruleId: string) => {
    setActivatingId(ruleId);
    setRbacNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/knowledge-base/rules/${ruleId}/activate`, {
        method: "POST",
      });

      if (res.status === 403) {
        setRbacNotice(
          "RBAC Enforcement: Only Legal Counsel, Chief Compliance Officer, or Workspace Admin can activate rules for live campaign assessment (knowledge.publish)."
        );
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to activate rule");
      }

      await fetchRules();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActivatingId(null);
    }
  };

  const getTypeBadge = (type: KnowledgeRuleType) => {
    switch (type) {
      case "PROHIBITED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "RATE_FEE_LIMIT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REQUIRED_DISCLOSURE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "APPROVED_LANGUAGE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
            Internal Marketing Compliance Rules
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Rules extracted from internal playbooks. Activating a rule enforces it across campaign reviews and AI copilot reasoning.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 bg-white border border-zinc-300 rounded focus:outline-hidden focus:border-zinc-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft (Candidate)</option>
            <option value="ACTIVE">Active (Enforced)</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2 py-1 bg-white border border-zinc-300 rounded focus:outline-hidden focus:border-zinc-900"
          >
            <option value="ALL">All Rule Types</option>
            <option value="PROHIBITED">Prohibited Term</option>
            <option value="REQUIRED_DISCLOSURE">Required Disclosure</option>
            <option value="RATE_FEE_LIMIT">Rate/Fee Limit</option>
            <option value="APPROVED_LANGUAGE">Approved Language</option>
            <option value="SOP_RULE">Marketing SOP</option>
          </select>
        </div>
      </div>

      {rbacNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <span className="font-semibold">Separation of Duties Notice: </span>
            {rbacNotice}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500">Loading compliance rules...</div>
      ) : rules.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg">
          <CheckCircle2 className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
          <p className="text-xs font-medium text-zinc-700">No matching internal rules found.</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Upload internal playbooks in the &quot;Playbooks &amp; Policies&quot; tab to extract candidate rules.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                <th className="py-2.5 px-3">Rule Title &amp; Clause</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Source Document</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="py-3 px-3 max-w-sm">
                    <div className="font-semibold text-zinc-900">{rule.rule_title}</div>
                    <div className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">{rule.rule_text}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTypeBadge(
                        rule.rule_type
                      )}`}
                    >
                      {rule.rule_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSeverityBadge(
                        rule.severity
                      )}`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-zinc-600">
                    {rule.document_title || "Institutional Playbook"}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        rule.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200"
                      }`}
                    >
                      {rule.status === "ACTIVE" && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                      {rule.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-right">
                    {rule.status === "DRAFT" ? (
                      <button
                        onClick={() => handleActivate(rule.id)}
                        disabled={activatingId === rule.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {activatingId === rule.id ? "Activating..." : "Activate Rule"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic">Enforced Live</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
