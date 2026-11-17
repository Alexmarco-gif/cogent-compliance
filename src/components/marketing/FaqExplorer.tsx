"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight, BookOpen, FileSpreadsheet, ShieldCheck } from "lucide-react";
import type { ComplianceFaqItem } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

const CATEGORIES: Array<"All" | ComplianceFaqItem["category"]> = [
  "All",
  "Workflows",
  "Research",
  "Drafting",
  "Security",
];

const TRUST_PILLARS = [
  {
    icon: BookOpen,
    title: "Cataloguing 141+ Codified Instruments",
    description:
      "Maintain a centralized statutory library across CBN, NDPC, FCCPC, SEC, and NFIU with clear legal owners and direct clause citations.",
  },
  {
    icon: FileSpreadsheet,
    title: "Convert Regulations into Obligations",
    description:
      "Automatically map statutory updates into internal AML manuals, product rate schedules, and sponsor-bank audit response templates.",
  },
  {
    icon: ShieldCheck,
    title: "Review, Approve, and Monitor",
    description:
      "Enforce maker-checker separation between Product and Legal, export-ready audit dossiers, and live campaign URL drift watchers.",
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
  const [openId, setOpenId] = useState<string>(items[0]?.id ?? "");
  const [category, setCategory] = useState<"All" | ComplianceFaqItem["category"]>("All");

  const visible =
    category === "All" ? items : items.filter((item) => item.category === category);

  const half = Math.ceil(visible.length / 2);
  const leftColumn = visible.slice(0, half);
  const rightColumn = visible.slice(half);

  const renderCard = (item: ComplianceFaqItem) => {
    const isOpen = openId === item.id;
    return (
      <div
        key={item.id}
        className={`rounded-lg border bg-white transition-all shadow-2xs ${
          isOpen
            ? "border-[#1D4ED8]/60 shadow-sm"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenId(isOpen ? "" : item.id)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
        >
          <div className="space-y-1">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
              {item.category}
            </span>
            <span className="block text-[14.5px] font-semibold text-[#0B1220] leading-snug">
              {item.question}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-[#1D4ED8]" : "text-slate-400"
            }`}
          />
        </button>

        {isOpen && (
          <div className="border-t border-slate-100 px-5 pb-4 pt-3 text-[13.5px] leading-relaxed text-slate-600 bg-slate-50/50">
            {item.answer}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {showHeader && (
        <RevealOnScroll>
          <SectionHeader
            eyebrow="COMMON QUESTIONS"
            titleLeading="Straight answers on"
            titleAccent="scope, research, and security."
            description="What General Counsel, Chief Compliance Officers, and Product leaders confirm before bringing Cogent into daily workflows."
          />
        </RevealOnScroll>
      )}

      {showFilter && (
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
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

      {/* Rich FAQ Card Grid with Soft Tint Container */}
      <div className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-5 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">{leftColumn.map(renderCard)}</div>
          <div className="space-y-4">{rightColumn.map(renderCard)}</div>
        </div>

        {/* 3 Executive Trust Pillars Under Subtle Divider */}
        <div className="mt-10 border-t border-slate-200/80 pt-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="rounded-lg border border-slate-200/70 bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-[#0B1220]">
                    <Icon className="h-4 w-4 text-[#1D4ED8]" strokeWidth={1.8} />
                    <h4 className="text-[13.5px] font-semibold text-[#0B1220]">
                      {pillar.title}
                    </h4>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between pt-2">
            <span className="text-[12.5px] text-slate-500">
              Need specific answers about your institution&apos;s license or data perimeter?
            </span>
            <Link
              href="/resources/faq"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D4ED8] hover:underline"
            >
              <span>View full FAQ archive</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
