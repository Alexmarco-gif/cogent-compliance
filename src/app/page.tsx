import React from "react";
import { ShieldCheck, BookOpen, Globe2, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-surface p-8 shadow-sm">
        {/* Header Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-white">
              <ShieldCheck className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-brand-navy">
                Cogent Marketing Shield
              </h1>
              <p className="text-xs text-slate-500">
                Enterprise Regulatory & Marketing Compliance Operating System
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Phase 1 Baseline Verified
          </span>
        </div>

        {/* Hero Section */}
        <div className="my-8 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">
            Automated Nigerian Financial Regulatory Defense
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Engineered for Chief Compliance Officers, General Counsel, and Fintech Product Teams.
            Real-time compliance validation powered by the Pre-Verified Statutory Vault (CBN, FCCPC,
            ARCON, NDPC, SEC), tenant-isolated institutional knowledge, and 7-layer deterministic guardrails.
          </p>
        </div>

        {/* Three Intelligence Sources Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center space-x-2 text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Statutory Vault</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Class A Golden 50 Nigerian regulatory instruments with verbatim clause hashes and zero hallucinated citations.
            </p>
            <span className="mt-3 inline-block rounded border border-blue-300 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
              [Verified Statutory Vault]
            </span>
          </div>

          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
            <div className="flex items-center space-x-2 text-purple-700">
              <BookOpen className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Playbook Engine</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Class C Tenant-isolated marketing policies, brand rules, and approved product rate/fee cards.
            </p>
            <span className="mt-3 inline-block rounded border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
              [Internal Playbook Rule]
            </span>
          </div>

          <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-4">
            <div className="flex items-center space-x-2 text-cyan-700">
              <Globe2 className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Live Web Intel</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Class D Two-Step Live Web Search routing across official regulator portals (.gov.ng) with SSRF safety.
            </p>
            <span className="mt-3 inline-block rounded border border-cyan-300 bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
              [Live Web Intelligence]
            </span>
          </div>
        </div>

        {/* System Health / API Status */}
        <div className="mt-8 flex flex-col items-center justify-between rounded-lg bg-slate-50 p-4 text-xs text-slate-600 sm:flex-row">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>API Gateway Baseline Active: <code>/api/marketing-shield/v1/health</code></span>
          </div>
          <a
            href="/api/marketing-shield/v1/health"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center font-medium text-brand-primary hover:underline sm:mt-0"
          >
            Inspect Health Ping <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </main>
  );
}
