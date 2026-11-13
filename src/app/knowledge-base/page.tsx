"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Percent,
  BookOpen,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ProductRateEditor } from "@/components/knowledge-base/ProductRateEditor";
import { PlaybookUploader } from "@/components/knowledge-base/PlaybookUploader";
import { RuleActivationTable } from "@/components/knowledge-base/RuleActivationTable";

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<"products" | "playbooks" | "rules">("products");

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col text-zinc-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors p-1 rounded-md hover:bg-zinc-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Copilot</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-200" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-zinc-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Cogent Marketing Shield
              </h1>
              <p className="text-[10px] text-zinc-500">Institutional Knowledge Base &amp; Product Truth</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            TENANT VAULT
          </span>
          <UserButton />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-zinc-200 gap-1">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "products"
                ? "border-zinc-900 text-zinc-900 bg-white"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Product Truth Schedule (Lock 2)</span>
          </button>

          <button
            onClick={() => setActiveTab("playbooks")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "playbooks"
                ? "border-zinc-900 text-zinc-900 bg-white"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Playbooks &amp; Policy Manuals</span>
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "rules"
                ? "border-zinc-900 text-zinc-900 bg-white"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Internal Rules Engine</span>
          </button>
        </div>

        {/* Tab Content Canvas */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
          {activeTab === "products" && <ProductRateEditor />}
          {activeTab === "playbooks" && <PlaybookUploader />}
          {activeTab === "rules" && <RuleActivationTable />}
        </div>
      </main>
    </div>
  );
}
