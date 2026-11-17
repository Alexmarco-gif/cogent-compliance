"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Globe,
  FileText,
  Search,
  Lock,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import type { ComplianceFaqItem } from "@/data/marketing-scenarios";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

const FAQ_ICONS = [BookOpen, Globe, FileText, Search, Lock, ShieldCheck];

const TRUST_PILLARS = [
  {
    icon: BookOpen,
    title: "Cataloguing 141+ codified instruments",
    description:
      "Maintain a centralized statutory library across CBN, NDPC, FCCPC, SEC, and NFIU with clear legal owners and clause citations.",
  },
  {
    icon: FileSpreadsheet,
    title: "Convert regulations into obligations",
    description:
      "Automatically map statutory updates into internal AML manuals, product rate schedules, and sponsor-bank audit templates.",
  },
  {
    icon: ShieldCheck,
    title: "Review, approve, and monitor",
    description:
      "Enforce maker-checker separation between Product and Legal, sign-off audit dossiers, and live campaign URL drift watchers.",
  },
];

export function FaqExplorer({
  items,
  showHeader = false,
  showFilter = true,
}: {
  items: ComplianceFaqItem[];
  showHeader?: boolean;
  showFilter?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex] ?? items[0]!;
  const ActiveIcon = FAQ_ICONS[activeIndex] ?? BookOpen;

  // Filter state for /resources/faq dedicated subpage
  const [category, setCategory] = useState<"All" | ComplianceFaqItem["category"]>("All");
  const filteredItems =
    category === "All" ? items : items.filter((item) => item.category === category);

  // When rendered on main landing page with showHeader=true, use the gfo.JPG / kgh.JPG architectural split style
  if (showHeader) {
    return (
      <div className="space-y-12">
        <RevealOnScroll>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-[10.5px] font-semibold text-[#1D4ED8]">
              <span>+ REGULATORY INTELLIGENCE</span>
            </div>
            <h2 className="mt-4 text-[32px] sm:text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0B1220]">
              Straight answers on <span className="text-[#1D4ED8]">scope, research, and security.</span>
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] leading-[1.6] text-slate-600">
              What General Counsel, Chief Compliance Officers, and Product leaders confirm before bringing Cogent into daily operations.
            </p>
          </div>
        </RevealOnScroll>

        {/* 2-Column Split Stage matching gfo.JPG & kgh.JPG */}
        <RevealOnScroll delayMs={80}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Interactive Dotted List (gfo.JPG / kgh.JPG) */}
            <div className="lg:col-span-5 space-y-1">
              <div className="divide-y divide-dotted divide-slate-300">
                {items.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const Icon = FAQ_ICONS[idx] ?? BookOpen;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`group flex w-full items-center justify-between py-4 text-left transition-colors cursor-pointer ${
                        isActive
                          ? "text-[#1D4ED8]"
                          : "text-slate-700 hover:text-[#0B1220]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 pr-2">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-[#1D4ED8]" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span
                          className={`text-[14px] leading-snug ${
                            isActive ? "font-semibold text-[#0B1220]" : "font-normal"
                          }`}
                        >
                          {item.question}
                        </span>
                      </div>

                      <ArrowRight
                        className={`h-4 w-4 shrink-0 transition-all ${
                          isActive
                            ? "opacity-100 translate-x-0 text-[#1D4ED8]"
                            : "opacity-0 -translate-x-1 group-hover:opacity-60"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="pt-6">
                <Link
                  href="/resources/faq"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>Explore all FAQs</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Column: Architectural Visual Canvas matching gfo.JPG & kgh.JPG */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#FAFBFD] p-6 sm:p-8 shadow-xs">
                {/* Subtle architectural hairline texture */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-40 cogent-hairline-grid"
                />

                <div key={activeItem.id} className="relative z-10 animate-cogent-enter space-y-6">
                  {/* Category Ribbon */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                      CATEGORY · {activeItem.category}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified Answer
                    </span>
                  </div>

                  {/* Question & Answer Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#1D4ED8]">
                        <ActiveIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-[17px] font-semibold leading-snug text-[#0B1220]">
                          {activeItem.question}
                        </h3>
                        <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                          {activeItem.answer}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Floating Circular Tags Grid matching kgh.JPG */}
                  <div className="space-y-2">
                    <p className="font-mono text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
                      Connected Regulatory Authority &amp; System Controls
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-[12px] shadow-2xs">
                        <span className="font-mono text-[10px] text-slate-400 block">Statutory Source</span>
                        <span className="font-semibold text-slate-800">CBN, NDPC &amp; FCCPC Codes</span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-[12px] shadow-2xs">
                        <span className="font-mono text-[10px] text-slate-400 block">Deliverable Format</span>
                        <span className="font-semibold text-slate-800">50/50 Split Document Studio</span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-[12px] shadow-2xs">
                        <span className="font-mono text-[10px] text-slate-400 block">Role Enforcement</span>
                        <span className="font-semibold text-slate-800">Legal Counsel &amp; CCO Lock</span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-[12px] shadow-2xs">
                        <span className="font-mono text-[10px] text-slate-400 block">Data Isolation</span>
                        <span className="font-semibold text-slate-800">Zero Shared Training Vault</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Bottom 3-Column Trust Strip (under dotted line, matching gfo.JPG / kgh.JPG) */}
        <RevealOnScroll delayMs={120}>
          <div className="border-t border-dotted border-slate-300 pt-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {TRUST_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="space-y-2.5">
                    <div className="flex items-center gap-2.5 text-[#0B1220]">
                      <Icon className="h-4 w-4 text-slate-700" strokeWidth={1.8} />
                      <h4 className="text-[14.5px] font-semibold text-[#0B1220]">
                        {pillar.title}
                      </h4>
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-600">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    );
  }

  // Fallback / Subpage filter mode for /resources/faq page
  return (
    <div className="space-y-8">
      {showFilter && (
        <div className="flex flex-wrap gap-2">
          {(["All", "Workflows", "Research", "Drafting", "Security"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-md px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer border ${
                category === cat
                  ? "border-[#0B1220] bg-[#0B1220] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#0B1220]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-6 sm:p-8">
        <div className="divide-y divide-dotted divide-slate-300">
          {filteredItems.map((item) => (
            <div key={item.id} className="py-5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                {item.category}
              </span>
              <h3 className="mt-1 text-[16px] font-semibold text-[#0B1220]">
                {item.question}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
