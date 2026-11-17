"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export function FaqExplorer({ items }: { items: FaqItem[] }) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((item) => item.category)))],
    [items]
  );

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number>(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const catMatch =
        selectedCategory === "All" || item.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, selectedCategory, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setOpenIndex(0);
                }}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenIndex(0);
            }}
            placeholder="Search compliance questions..."
            aria-label="Search compliance FAQ"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-[13.5px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-[14.5px] font-medium text-zinc-950">
              No questions matched your filter.
            </p>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.question}
                className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                >
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#2A4BFF]">
                      {item.category}
                    </span>
                    <h2 className="mt-1 text-[16px] font-semibold text-zinc-950">
                      {item.question}
                    </h2>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${
                      isOpen ? "rotate-180 text-zinc-950" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-100 px-6 py-4 bg-zinc-50/60">
                    <p className="text-[14px] leading-relaxed text-zinc-700">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
