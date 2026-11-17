"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle2,
  AlertTriangle,
  Filter,
  Check,
} from "lucide-react";
import { extractApiError, unwrapApiList } from "@/lib/api-client";
import type {
  MarketingKnowledgeRule,
  KnowledgeRuleType,
} from "@/contracts/knowledge-product.contracts";

export function RuleActivationTable() {
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const [rules, setRules] = useState<MarketingKnowledgeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [rbacNotice, setRbacNotice] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("rule_type", typeFilter);

      const res = await fetch(`/api/marketing-shield/v1/knowledge-base/rules?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Unable to load compliance rules");
        setErrorStatus(parsed.status);
        throw new Error(parsed.message);
      }
      setRules(unwrapApiList<MarketingKnowledgeRule>(json));
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, orgId, statusFilter, typeFilter]);

  useEffect(() => {
    if (!clerkLoaded) return;
    fetchRules();
  }, [clerkLoaded, isSignedIn, orgId, fetchRules]);

  const handleActivate = async (ruleId: string) => {
    setActivatingId(ruleId);
    setRbacNotice(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/knowledge-base/rules/${ruleId}/activate`, {
        method: "POST",
      });

      if (res.status === 403) {
        setRbacNotice(
          "Only Legal Counsel, Chief Compliance Officer, or Workspace Admin can activate rules for live campaign reviews."
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
        return "bg-zinc-100 text-zinc-800 border-zinc-200";
      case "APPROVED_LANGUAGE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-800 border border-rose-200";
      case "HIGH":
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case "MEDIUM":
        return "bg-zinc-100 text-zinc-800 border border-zinc-200";
      default:
        return "bg-zinc-50 text-zinc-600 border border-zinc-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">
            Internal Compliance Rules
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Rules extracted from uploaded playbooks. Active rules are checked across campaign reviews.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Filter:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 bg-white border border-zinc-300 rounded outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2 py-1 bg-white border border-zinc-300 rounded outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
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
            <span className="font-semibold">Permission required: </span>
            {rbacNotice}
          </div>
        </div>
      )}

      {clerkLoaded && !isSignedIn ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg space-y-2.5">
          <CheckCircle2 className="w-7 h-7 mx-auto text-zinc-400" />
          <p className="text-xs font-medium text-zinc-900">Sign in to review compliance rules</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Extracted policy rules are scoped to your organization workspace.
          </p>
          <div className="pt-1">
            <Link
              href="/sign-in"
              className="inline-flex items-center px-3.5 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : clerkLoaded && isSignedIn && !orgId ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg space-y-2">
          <CheckCircle2 className="w-7 h-7 mx-auto text-zinc-400" />
          <p className="text-xs font-medium text-zinc-900">Select an organization workspace</p>
          <p className="text-xs text-zinc-500">
            Choose or create an organization in the sidebar to view and activate rules.
          </p>
        </div>
      ) : error ? (
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-md flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          {errorStatus === 401 ? (
            <Link
              href="/sign-in"
              className="px-2.5 py-1 rounded bg-zinc-900 text-white font-medium hover:bg-zinc-800 shrink-0"
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={fetchRules}
              className="px-2.5 py-1 rounded border border-rose-200 bg-white text-rose-800 font-medium hover:bg-rose-50 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-xs text-zinc-500">Loading compliance rules...</div>
      ) : rules.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg">
          <CheckCircle2 className="w-7 h-7 mx-auto text-zinc-400 mb-2" />
          <p className="text-xs font-medium text-zinc-800">No matching internal rules found.</p>
          <p className="text-xs text-zinc-500 mt-1">
            Upload playbooks in the &quot;Playbooks &amp; Policies&quot; tab to extract draft rules.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
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
                    {rule.document_title || "Policy Playbook"}
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {activatingId === rule.id ? "Activating..." : "Activate Rule"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Active</span>
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
