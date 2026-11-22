import React from "react";
import Link from "next/link";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_META,
  type ResourceCategory,
} from "@/contracts/resources.contracts";

export function ResourceCategoryHero({
  activeCategory,
  eyebrow,
  titleLeading,
  titleAccent,
  description,
}: {
  activeCategory: ResourceCategory | "all";
  eyebrow: string;
  titleLeading: string;
  titleAccent: string;
  description: string;
}) {
  return (
    <section className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
            {eyebrow}
          </p>
          <h1 className="mt-3.5 text-[34px] sm:text-[48px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0B1220]">
            {titleLeading} <span className="text-[#1D4ED8]">{titleAccent}</span>
          </h1>
          <p className="mt-4 text-[16px] leading-[1.6] text-slate-600">{description}</p>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link
            href="/resources"
            className={`rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-[#0B1220] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All Resources
          </Link>
          {RESOURCE_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/resources/${cat}`}
              className={`rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#0B1220] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {RESOURCE_CATEGORY_META[cat].label}
            </Link>
          ))}
          <Link
            href="/resources/faq"
            className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
