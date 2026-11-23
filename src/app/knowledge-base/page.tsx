"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Percent, BookOpen, CheckSquare, FolderLock, BookMarked } from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { ChatWorkspaceSkeleton } from "@/components/shell/WorkspaceSkeletons";
import { ProductRateEditor } from "@/components/knowledge-base/ProductRateEditor";
import { PlaybookUploader } from "@/components/knowledge-base/PlaybookUploader";
import { RuleActivationTable } from "@/components/knowledge-base/RuleActivationTable";
import { EvidenceVaultManager } from "@/components/knowledge-base/EvidenceVaultManager";
import { QaLibraryManager } from "@/components/knowledge-base/QaLibraryManager";

type KnowledgeTab = "evidence" | "qa-library" | "products" | "playbooks" | "rules";

function isValidTab(val: string | null): val is KnowledgeTab {
  return (
    val === "evidence" ||
    val === "qa-library" ||
    val === "playbooks" ||
    val === "rules" ||
    val === "products"
  );
}

function KnowledgeBaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: KnowledgeTab = isValidTab(tabParam) ? tabParam : "evidence";

  const [activeTab, setActiveTab] = useState<KnowledgeTab>(initialTab);

  useEffect(() => {
    if (isValidTab(tabParam)) {
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
    <WorkspaceShell section="Governance" title="Evidence & Knowledge Vault">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Evidence &amp; Knowledge Vault
          </h1>
          <p className="text-sm text-zinc-500">
            Manage versioned compliance evidence, CCO-approved DDQ answers, product rate cards, internal playbooks, and active rules.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-zinc-200 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSelectTab("evidence")}
            className={`flex items-center gap-2 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "evidence"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Evidence Vault</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("qa-library")}
            className={`flex items-center gap-2 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "qa-library"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Approved Q&amp;A Library</span>
          </button>

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
          {activeTab === "evidence" && <EvidenceVaultManager />}
          {activeTab === "qa-library" && <QaLibraryManager />}
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
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <KnowledgeBaseContent />
    </Suspense>
  );
}
