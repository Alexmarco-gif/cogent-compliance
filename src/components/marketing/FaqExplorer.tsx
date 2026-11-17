"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
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
        className={`rounded-lg border bg-white transition-colors ${
          isOpen
            ? "border-[#1D4ED8]/40"
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
            <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {item.category}
            </span>
            <span className="block text-[14.5px] font-semibold text-[#0B1220] leading-snug">
              {item.question}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-[#1D4ED8]" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="border-t border-slate-100 px-5 pb-4 pt-3 text-[13.5px] leading-relaxed text-slate-600">
            {item.answer}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
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

      <div className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3.5">{leftColumn.map(renderCard)}</div>
          <div className="space-y-3.5">{rightColumn.map(renderCard)}</div>
        </div>
      </div>
    </div>
  );
}
