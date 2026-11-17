"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ComplianceFaqItem } from "@/data/marketing-scenarios";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

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
  const [category, setCategory] = useState<string>("All");

  const categories = ["All", "Workflow", "Accuracy", "Security", "Billing"];
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
        className={`rounded-2xl border bg-white transition-all duration-200 ${
          isOpen
            ? "border-blue-200 shadow-md shadow-blue-600/5"
            : "border-slate-200/85 hover:border-slate-300"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenId(isOpen ? "" : item.id)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
        >
          <span className="text-[14.5px] font-semibold text-slate-950 leading-snug">
            {item.question}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#1D63ED]" : ""
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
            badge="COMMON QUESTIONS"
            titleLeading="Have questions?"
            titleAccent="Straight answers here"
            description="Everything marketing, legal, and compliance leaders ask before running their first campaign check."
          />
        </RevealOnScroll>
      )}

      {showFilter && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                category === cat
                  ? "bg-[#1D63ED] text-white shadow-sm shadow-blue-600/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 2-Column Frosted Tray Accordion matching Reference 79ff85 Panel 05 */}
      <div className="rounded-[26px] cogent-glass-tray p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3.5">{leftColumn.map(renderCard)}</div>
          <div className="space-y-3.5">{rightColumn.map(renderCard)}</div>
        </div>
      </div>
    </div>
  );
}
