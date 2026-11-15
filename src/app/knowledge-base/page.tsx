"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Percent, BookOpen, CheckSquare } from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { ProductRateEditor } from "@/components/knowledge-base/ProductRateEditor";
import { PlaybookUploader } from "@/components/knowledge-base/PlaybookUploader";
import { RuleActivationTable } from "@/components/knowledge-base/RuleActivationTable";

type KnowledgeTab = "products" | "playbooks" | "rules";

function KnowledgeBaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: KnowledgeTab =
    tabParam === "playbooks" || tabParam === "rules" || tabParam === "products"
      ? tabParam
      : "products";

  const [activeTab, setActiveTab] = useState<KnowledgeTab>(initialTab);

  useEffect(() => {
    if (tabParam === "playbooks" || tabParam === "rules" || tabParam === "products") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSelectTab = (tab: KnowledgeTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/knowledge-base?${params.toString()}`);
  };

  return (
    <WorkspaceShell section="Governance" title="Knowledge Base">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Knowledge Base
          </h1>
          <p className="text-sm text-zinc-500">
            Manage approved product schedules, internal marketing playbooks, and active compliance rules.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-zinc-200 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSelectTab("products")}
            className={`flex items-center gap-2 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "products"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Products &amp; Rates</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("playbooks")}
            className={`flex items-center gap-2 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "playbooks"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Playbooks &amp; Policies</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("rules")}
            className={`flex items-center gap-2 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "rules"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Compliance Rules</span>
          </button>
        </div>

        {/* Tab Content Canvas */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          {activeTab === "products" && <ProductRateEditor />}
          {activeTab === "playbooks" && <PlaybookUploader />}
          {activeTab === "rules" && <RuleActivationTable />}
        </div>
      </div>
    </WorkspaceShell>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <KnowledgeBaseContent />
    </Suspense>
  );
}
